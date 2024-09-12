import { uuidv7 } from "uuidv7-js";
import { prisma } from "../db.server";
import { FeedEntry, parseFeed } from "@mikaelporttila/rss";
import sharp from "sharp";
import { uploadThumbnail } from "~/media";
import { Media } from "@prisma/client";

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
      const image = await processItemImage(entry);
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
          media: {
            create: image,
          },
        },
        update: {
          title: entry.title?.value || "No Title Found",
          description: entry.description?.value || null,
          content: entry.content?.value || null,
          publishedAt: publishedAt || new Date(),
          media: {
            update: {
              where: {
                url: image?.url as string,
              },
              data: image as Media,
            },
          },
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

const processItemImage = async (entry: FeedEntry) => {
  const url = await getItemImageUrl(entry);
  if (!url) return undefined;
  const response = await fetch(url);
  const id = uuidv7();
  const type = response.headers.get("Content-Type");
  const image = sharp(await response.arrayBuffer());
  const metadata = await image.metadata();

  if (!type || !metadata.width || !metadata.height) return undefined;

  const uploaded = await uploadThumbnail(id, image);

  return {
    id: id,
    type: type,
    url: url,
    width: metadata.width,
    height: metadata.height,
    ...uploaded,
  };
};

const getItemImageUrl = async (
  entry: FeedEntry
): Promise<string | undefined> => {
  if (entry["media:content"] && entry["media:content"].length > 0) {
    const image = entry["media:content"].find((m) => m.medium === "image");
    if (image) {
      return image?.url;
    }
  }

  if (entry["media:thumbnails"]) {
    return entry["media:thumbnails"].url;
  }
  // RSS package doesn't type for this but some feeds have it
  // @ts-expect-error
  if (entry["media:thumbnail"]) {
    // @ts-expect-error
    return entry["media:thumbnail"].url;
  }

  if (entry.attachments && entry.attachments.length > 0) {
    return entry.attachments[0].url;
  }
};

export const getItemsForUser = async (userId: string) => {
  const subscriptionFeedIds = await prisma.subscription.findMany({
    where: {
      userId,
    },
    select: {
      feed: {
        select: {
          id: true,
        },
      },
    },
  });

  const feedIds = subscriptionFeedIds.map((s) => s.feed.id);

  return await prisma.item.findMany({
    where: {
      feedId: {
        in: feedIds,
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
    include: {
      feed: true,
      media: true,
    },
  });
};
