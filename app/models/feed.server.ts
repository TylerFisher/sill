import { uuidv7 } from "uuidv7-js";
import { prisma } from "../db.server";
import { parseFeed } from "@mikaelporttila/rss";

export const createFeed = async (url: string, userId: string) => {
  const response = await fetch(url);
  const xml = await response.text();
  const rss = await parseFeed(xml);
  const feed = await prisma.feed.upsert({
    where: {
      url: rss.links[0],
    },
    create: {
      id: uuidv7(),
      title: rss.title.value || rss.links[0],
      description: rss.description || "",
      url: rss.links[0],
      lastFetched: new Date(),
    },
    update: {
      title: rss.title.value || rss.links[0],
      description: rss.description || "",
      lastFetched: new Date(),
    },
  });

  const subscription = await prisma.subscription.upsert({
    where: {
      userId_feedId: {
        userId: userId,
        feedId: feed.id,
      },
    },
    create: {
      id: uuidv7(),
      feedId: feed.id,
      userId: userId,
    },
    update: {},
  });

  const items = await Promise.all(
    rss.entries.map(async (entry) => {
      let publishedAt = null;
      if (entry.published) {
        publishedAt = new Date(entry.published);
      }
      return await prisma.item.upsert({
        where: {
          url_feedId: {
            url: entry.links[0].href || "No Title Found",
            feedId: feed.id,
          },
        },
        create: {
          id: uuidv7(),
          title: entry.title?.value || "No Title Found",
          description: entry.description?.value || null,
          content: entry.content?.value || null,
          url: entry.links[0].href || feed.url,
          publishedAt: publishedAt || new Date(),
          feedId: feed.id,
        },
        update: {
          title: entry.title?.value || "No Title Found",
          description: entry.description?.value || null,
          content: entry.content?.value || null,
          publishedAt: publishedAt || new Date(),
        },
      });
    })
  );

  const statuses = items.map(async (item) => {
    prisma.itemStatus.upsert({
      where: {
        userId_itemId: {
          userId,
          itemId: item.id,
        },
      },
      create: {
        id: uuidv7(),
        itemId: item.id,
        userId,
      },
      update: {},
    });
  });

  return {
    feed,
    subscription,
    items,
    statuses,
  };
};

export const getSubscriptionsForUser = async (userId: string) => {
  return await prisma.subscription.findMany({
    where: {
      userId,
    },
    include: {
      feed: {
        include: {
          items: {
            orderBy: {
              publishedAt: "desc",
            },
            include: {
              statuses: {
                where: {
                  userId,
                },
              },
            },
          },
        },
      },
    },
  });
};
