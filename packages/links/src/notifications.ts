import { uuidv7 } from "uuidv7-js";
import { db, notificationGroup, notificationItem, user } from "@sill/schema";
import { eq } from "drizzle-orm";
import { isSubscribed } from "@sill/auth";
import { sendNotificationEmail, renderNotificationRSS } from "@sill/emails";
import { evaluateNotifications } from "./links.js";

/**
 * Processes notifications for a notification group.
 * Evaluates new items, sends emails or generates RSS items, and updates seen links.
 */
export async function processNotificationGroup(
  group: typeof notificationGroup.$inferSelect
): Promise<void> {
  const groupUser = await db.query.user.findFirst({
    where: eq(user.id, group.userId),
    with: { subscriptions: true },
  });

  if (!groupUser) {
    return;
  }

  const subscribed = await isSubscribed(groupUser.id);
  if (subscribed === "free") {
    return;
  }

  const newItems = await evaluateNotifications(
    group.userId,
    group.query,
    group.seenLinks,
    new Date(group.createdAt)
  );

  if (newItems.length > 0) {
    console.log(
      `sending notification for group ${group.name}, user ${groupUser.email}`
    );

    if (group.notificationType === "email") {
      // Skip email notification for users without email
      if (!groupUser.email) {
        console.log(
          `Skipping email notification for user ${groupUser.id} - no email address`
        );
        return;
      }

      await sendNotificationEmail({
        to: groupUser.email,
        subject:
          newItems[0].link?.title || `New Sill notification: ${group.name}`,
        links: newItems,
        groupName: group.name,
        subscribed,
        freeTrialEnd: groupUser.freeTrialEnd
          ? new Date(groupUser.freeTrialEnd)
          : null,
      });
    } else if (group.notificationType === "rss") {
      for (const item of newItems) {
        const html = await renderNotificationRSS({
          item,
          subscribed,
        });
        await db.insert(notificationItem).values({
          id: uuidv7(),
          notificationGroupId: group.id,
          itemHtml: html,
          itemData: item,
        });
      }
    }
  }

  await db
    .update(notificationGroup)
    .set({
      seenLinks: [
        ...group.seenLinks,
        ...newItems.map((n) => n.link?.url || ""),
      ].slice(-10000),
    })
    .where(eq(notificationGroup.id, group.id));
}
