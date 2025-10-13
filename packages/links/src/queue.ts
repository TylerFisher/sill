import { and, eq, inArray, sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db, accountUpdateQueue } from "@sill/schema";

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
