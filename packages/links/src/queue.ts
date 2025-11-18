import { and, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import {
  db,
  accountUpdateQueue,
  notificationGroup,
  bookmark,
} from "@sill/schema";
import { fetchLinks } from "./links.js";
import { addNewBookmarks } from "./bookmarks.js";

export async function enqueueJob(userId: string) {
  return await db
    .insert(accountUpdateQueue)
    .values({
      id: uuidv7(),
      userId,
    })
    .returning();
}

export async function dequeueJobs(batchSize: number) {
  return await db.transaction(async (tx) => {
    const jobs = await tx
      .select()
      .from(accountUpdateQueue)
      .where(
        and(
          eq(accountUpdateQueue.status, "pending"),
          sql`${accountUpdateQueue.retries} < 3`
        )
      )
      .limit(batchSize)
      .for("update", { skipLocked: true });

    if (jobs.length > 0) {
      await tx
        .update(accountUpdateQueue)
        .set({ status: "processing" })
        .where(
          inArray(
            accountUpdateQueue.id,
            jobs.map((j) => j.id)
          )
        );
    }

    return jobs;
  });
}

interface ProcessJobResult {
  links: Awaited<ReturnType<typeof import("./links.js").fetchLinks>>;
  notificationGroups: Awaited<
    ReturnType<typeof db.query.notificationGroup.findMany>
  >;
  bookmarks: Awaited<ReturnType<typeof db.query.bookmark.findMany>>;
}

/**
 * Processes a single job by fetching links, notification groups, and bookmarks for a user.
 * Marks the job as completed upon success.
 */
export async function processJob(
  job: typeof accountUpdateQueue.$inferSelect
): Promise<ProcessJobResult> {
  const links = await fetchLinks(job.userId);
  // get new bookmarks from ATProto repo
  await addNewBookmarks(job.userId);

  const groups = await db.query.notificationGroup.findMany({
    where: eq(notificationGroup.userId, job.userId),
  });

  const userBookmarks = await db.query.bookmark.findMany({
    where: eq(bookmark.userId, job.userId),
  });

  await db
    .update(accountUpdateQueue)
    .set({
      status: "completed",
      processedAt: new Date(),
    })
    .where(eq(accountUpdateQueue.id, job.id));

  return {
    links,
    notificationGroups: groups,
    bookmarks: userBookmarks,
  };
}
