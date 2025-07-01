import { desc, eq, getTableColumns, gte, sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	json,
	pgEnum,
	pgMaterializedView,
	pgTable,
	text,
	time,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";
import type { SuccessResult } from "open-graph-scraper-lite";
import type { NotificationQuery } from "~/components/forms/NotificationQueryItem";
import type { MostRecentLinkPosts } from "~/utils/links.server";

export const postType = pgEnum("post_type", ["bluesky", "mastodon"]);

export const digestType = pgEnum("digest_type", ["email", "rss"]);
export const digestLayout = pgEnum("digest_layout", ["default", "dense"]);

export const verification = pgTable(
	"verification",
	{
		id: uuid().primaryKey().notNull(),
		createdAt: timestamp({ precision: 3, mode: "date" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		type: text().notNull(),
		target: text().notNull(),
		secret: text().notNull(),
		algorithm: text().notNull(),
		digits: integer().notNull(),
		period: integer().notNull(),
		charSet: text().notNull(),
		expiresAt: timestamp({ precision: 3, mode: "date" }),
	},
	(table) => {
		return {
			targetTypeUnique: unique().on(table.target, table.type),
			targetTypeKey: uniqueIndex("verification_target_type_key").using(
				"btree",
				table.target.asc().nullsLast(),
				table.type.asc().nullsLast(),
			),
		};
	},
);

export const password = pgTable("password", {
	hash: text().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.unique(),
});

export const session = pgTable(
	"session",
	{
		id: uuid().primaryKey().notNull(),
		expirationDate: timestamp({ precision: 3, mode: "date" }).notNull(),
		createdAt: timestamp({ precision: 3, mode: "date" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			userIdIdx: index("session_user_id_idx").using(
				"btree",
				table.userId.asc().nullsLast(),
			),
		};
	},
);

export const digestSettings = pgTable("digest_settings", {
	id: uuid().primaryKey().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.unique(),
	scheduledTime: time().notNull(),
	topAmount: integer().notNull().default(10),
	splitServices: boolean().notNull().default(false),
	hideReposts: boolean().notNull().default(false),
	layout: digestLayout().notNull().default("default"),
	digestType: digestType().notNull().default("email"),
});

export const digestRssFeed = pgTable("digest_rss_feed", {
	id: uuid().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	feedUrl: text().notNull(),
	digestSettings: uuid()
		.notNull()
		.unique()
		.references(() => digestSettings.id, { onDelete: "cascade" }),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const digestItem = pgTable("digest_item", {
	id: uuid().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	html: text(),
	json: json().$type<MostRecentLinkPosts[]>(),
	pubDate: timestamp({ precision: 3, mode: "date" }).notNull(),
	feedId: uuid().references(() => digestRssFeed.id, { onDelete: "cascade" }),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const notificationGroup = pgTable("notification_group", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	query: json().$type<NotificationQuery[]>().notNull(),
	notificationType: digestType().notNull().default("email"),
	feedUrl: text(),
	seenLinks: json().$type<string[]>().notNull().default([]),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp({ precision: 3, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const notificationItem = pgTable("notification_item", {
	id: uuid().primaryKey().notNull(),
	notificationGroupId: uuid()
		.notNull()
		.references(() => notificationGroup.id, { onDelete: "cascade" }),
	itemData: json().$type<MostRecentLinkPosts>().notNull(),
	itemHtml: text(),
	createdAt: timestamp({ precision: 3, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const mastodonInstance = pgTable("mastodon_instance", {
	id: uuid().primaryKey().notNull(),
	instance: text().notNull().unique(),
	clientId: text().notNull(),
	clientSecret: text().notNull(),
	createdAt: timestamp({ precision: 3, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const mastodonAccount = pgTable("mastodon_account", {
	id: uuid().primaryKey().notNull(),
	instanceId: uuid()
		.notNull()
		.references(() => mastodonInstance.id),
	accessToken: text().notNull(),
	tokenType: text().notNull(),
	expiresIn: integer(),
	refreshToken: text(),
	createdAt: timestamp({ precision: 3, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
	mostRecentPostId: text(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
});

export const blueskyAccount = pgTable(
	"bluesky_account",
	{
		id: uuid().primaryKey().notNull(),
		service: text().notNull(),
		handle: text().notNull().unique(),
		did: text().notNull().unique(),
		mostRecentPostDate: timestamp({ precision: 3, mode: "date" }),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			didKey: uniqueIndex("bluesky_account_did_key").using(
				"btree",
				table.did.asc().nullsLast(),
			),
			handleKey: uniqueIndex("bluesky_account_handle_key").using(
				"btree",
				table.handle.asc().nullsLast(),
			),
		};
	},
);

export const list = pgTable("list", {
	id: uuid().primaryKey().notNull(),
	name: text().notNull(),
	uri: text().notNull(),
	mostRecentPostDate: timestamp({ precision: 3, mode: "date" }),
	mostRecentPostId: text(),
	blueskyAccountId: uuid().references(() => blueskyAccount.id, {
		onDelete: "cascade",
	}),
	mastodonAccountId: uuid().references(() => mastodonAccount.id, {
		onDelete: "cascade",
	}),
});

export const link = pgTable(
	"link",
	{
		id: uuid().primaryKey().notNull(),
		url: text().notNull().unique(),
		title: text().notNull(),
		description: text(),
		imageUrl: text(),
		giftUrl: text(),
		metadata: json().$type<SuccessResult["result"]>(),
		scraped: boolean().default(false),
	},
	(table) => {
		return {
			searchIndex: index("link_search_index").using(
				"gin",
				sql`(
          setweight(to_tsvector('english', ${table.title}), 'A') ||
          setweight(to_tsvector('english', ${table.description}), 'B')
        )`,
			),
			linkUrlUnique: uniqueIndex().using("btree", table.url),
		};
	},
);

export const emailToken = pgTable(
	"email_token",
	{
		token: text().notNull(),
		createdAt: timestamp({ precision: 3, mode: "date" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		userId: uuid()
			.notNull()
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			userIdKey: uniqueIndex("email_token_user_id_key").using(
				"btree",
				table.userId.asc().nullsLast(),
			),
		};
	},
);

export const user = pgTable(
	"user",
	{
		id: uuid().primaryKey().notNull(),
		email: text().notNull().unique(),
		name: text(),
		customerId: text().unique(),
		freeTrialEnd: timestamp({ precision: 3, mode: "date" }),
		createdAt: timestamp({ precision: 3, mode: "date" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		emailConfirmed: boolean("email_confirmed").default(false).notNull(),
	},
	(table) => {
		return {
			emailKey: uniqueIndex("user_email_key").using(
				"btree",
				table.email.asc().nullsLast(),
			),
		};
	},
);

export const atprotoAuthSession = pgTable("atproto_auth_session", {
	key: text().primaryKey().notNull(),
	session: text().notNull(),
});

export const atprotoAuthState = pgTable("atproto_auth_state", {
	key: text().primaryKey().notNull(),
	state: text().notNull(),
});

export const mutePhrase = pgTable(
	"mute_phrase",
	{
		id: uuid().primaryKey().notNull(),
		phrase: text().notNull(),
		active: boolean().default(true).notNull(),
		createdAt: timestamp({ precision: 3, mode: "date" })
			.default(sql`CURRENT_TIMESTAMP`)
			.notNull(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			unq: unique().on(table.phrase, table.userId),
			userIdPhraseKey: uniqueIndex("mute_phrase_user_id_phrase_key").using(
				"btree",
				table.userId.asc().nullsLast(),
				table.phrase.asc().nullsLast(),
			),
		};
	},
);

export const linkPostDenormalized = pgTable(
	"link_post_denormalized",
	{
		id: uuid().primaryKey().notNull(),
		linkUrl: text()
			.notNull()
			.references(() => link.url),
		postUrl: text().notNull(),
		postText: text().notNull(),
		postDate: timestamp({ precision: 3, mode: "date" }).notNull(),
		postType: postType().notNull(),
		postImages: json().$type<{ url: string; alt: string }[]>(),
		actorUrl: text().notNull(),
		actorHandle: text().notNull(),
		actorName: text(),
		actorAvatarUrl: text(),
		quotedActorUrl: text(),
		quotedActorHandle: text(),
		quotedActorName: text(),
		quotedActorAvatarUrl: text(),
		quotedPostUrl: text(),
		quotedPostText: text(),
		quotedPostDate: timestamp({ precision: 3, mode: "date" }),
		quotedPostType: postType(),
		quotedPostImages: json().$type<{ url: string; alt: string }[]>(),
		repostActorUrl: text(),
		repostActorHandle: text(),
		repostActorName: text(),
		repostActorAvatarUrl: text(),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		listId: uuid().references(() => list.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			userIdIdx: index("link_post_denormalized_userId_idx").using(
				"btree",
				table.userId.asc().nullsLast(),
			),
			linkUrlIdx: index("link_post_denormalized_linkUrl_idx").using(
				"btree",
				table.linkUrl.asc().nullsLast(),
			),
			listIdIdx: index("link_post_denormalized_listId_idx").using(
				"btree",
				table.listId.asc().nullsLast(),
			),
			postDateIdx: index("link_post_denormalized_postDate_idx").using(
				"btree",
				table.postDate.asc().nullsLast(),
			),
		};
	},
);

export const accountUpdateQueue = pgTable("account_update_queue", {
	id: uuid().primaryKey().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	status: text().notNull().default("pending"),
	createdAt: timestamp().defaultNow(),
	processedAt: timestamp(),
	error: text(),
	retries: integer().default(0),
});

export const accountUpdateRelations = relations(
	accountUpdateQueue,
	({ one }) => ({
		user: one(user, {
			fields: [accountUpdateQueue.userId],
			references: [user.id],
		}),
	}),
);

export const polarProduct = pgTable("polar_product", {
	id: uuid().primaryKey().notNull(),
	polarId: text().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	amount: integer().notNull(),
	currency: text().notNull(),
	interval: text().notNull(),
	checkoutLinkUrl: text().notNull(),
});

export const subscription = pgTable("subscription", {
	id: uuid().primaryKey().notNull(),
	polarId: text().unique().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	polarProductId: uuid()
		.notNull()
		.references(() => polarProduct.id),
	status: text().notNull(),
	createdAt: timestamp().defaultNow(),
	periodStart: timestamp(),
	periodEnd: timestamp(),
	cancelAtPeriodEnd: boolean().notNull().default(false),
});

export const termsUpdate = pgTable("terms_update", {
	id: uuid().primaryKey().notNull(),
	termsDate: timestamp().notNull(),
});

export const termsAgreement = pgTable("terms_agreement", {
	id: uuid().primaryKey().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	createdAt: timestamp().defaultNow(),
	termsUpdateId: uuid()
		.notNull()
		.references(() => termsUpdate.id, { onDelete: "cascade" }),
});

export const bookmark = pgTable("bookmark", {
	id: uuid().primaryKey().notNull(),
	posts: json().$type<MostRecentLinkPosts>().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	linkUrl: text()
		.notNull()
		.references(() => link.url),
	createdAt: timestamp({ precision: 3, mode: "date" })
		.default(sql`CURRENT_TIMESTAMP`)
		.notNull(),
});

export const linkPostDenormalizedRelations = relations(
	linkPostDenormalized,
	({ one }) => ({
		user: one(user, {
			fields: [linkPostDenormalized.userId],
			references: [user.id],
		}),
		list: one(list, {
			fields: [linkPostDenormalized.listId],
			references: [list.id],
		}),
		link: one(link, {
			fields: [linkPostDenormalized.linkUrl],
			references: [link.url],
		}),
	}),
);

export const userRelations = relations(user, ({ one, many }) => ({
	password: one(password),
	sessions: many(session),
	mastodonAccounts: many(mastodonAccount),
	blueskyAccounts: many(blueskyAccount),
	emailTokens: many(emailToken),
	mutePhrases: many(mutePhrase),
	digestSettings: one(digestSettings),
	digestItems: many(digestItem),
	notificationGroups: many(notificationGroup),
	subscriptions: many(subscription),
	bookmarks: many(bookmark),
}));

export const passwordRelations = relations(password, ({ one }) => ({
	user: one(user, {
		fields: [password.userId],
		references: [user.id],
	}),
}));

export const sessionRelations = relations(session, ({ one }) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id],
	}),
}));

export const mastodonInstanceRelations = relations(
	mastodonInstance,
	({ many }) => ({
		mastodonAccounts: many(mastodonAccount),
	}),
);

export const mastodonAccountRelations = relations(
	mastodonAccount,
	({ one, many }) => ({
		user: one(user, {
			fields: [mastodonAccount.userId],
			references: [user.id],
		}),
		mastodonInstance: one(mastodonInstance, {
			fields: [mastodonAccount.instanceId],
			references: [mastodonInstance.id],
		}),
		lists: many(list),
	}),
);

export const blueskyAccountRelations = relations(
	blueskyAccount,
	({ one, many }) => ({
		user: one(user, {
			fields: [blueskyAccount.userId],
			references: [user.id],
		}),
		lists: many(list),
	}),
);

export const listRelations = relations(list, ({ one }) => ({
	blueskyAccount: one(blueskyAccount, {
		fields: [list.blueskyAccountId],
		references: [blueskyAccount.id],
	}),
	mastodonAccount: one(mastodonAccount, {
		fields: [list.mastodonAccountId],
		references: [mastodonAccount.id],
	}),
}));

export const emailTokenRelations = relations(emailToken, ({ one }) => ({
	user: one(user, {
		fields: [emailToken.userId],
		references: [user.id],
	}),
}));

export const mutePhraseRelations = relations(mutePhrase, ({ one }) => ({
	user: one(user, {
		fields: [mutePhrase.userId],
		references: [user.id],
	}),
}));

export const digestSettingsRelations = relations(digestSettings, ({ one }) => ({
	user: one(user, {
		fields: [digestSettings.userId],
		references: [user.id],
	}),
}));

export const digestRssFeedRelations = relations(
	digestRssFeed,
	({ one, many }) => ({
		digestSettings: one(digestSettings, {
			fields: [digestRssFeed.digestSettings],
			references: [digestSettings.id],
		}),
		user: one(user, {
			fields: [digestRssFeed.userId],
			references: [user.id],
		}),
		items: many(digestItem),
	}),
);

export const digestItemRelations = relations(digestItem, ({ one }) => ({
	feed: one(digestRssFeed, {
		fields: [digestItem.feedId],
		references: [digestRssFeed.id],
	}),
	user: one(user, {
		fields: [digestItem.userId],
		references: [user.id],
	}),
}));

export const notificationGroupRelations = relations(
	notificationGroup,
	({ one, many }) => ({
		user: one(user, {
			fields: [notificationGroup.userId],
			references: [user.id],
		}),
		items: many(notificationItem),
	}),
);

export const notificationItemRelations = relations(
	notificationItem,
	({ one }) => ({
		group: one(notificationGroup, {
			fields: [notificationItem.notificationGroupId],
			references: [notificationGroup.id],
		}),
	}),
);

export const polarProductRelations = relations(polarProduct, ({ many }) => ({
	subscriptions: many(subscription),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
	user: one(user, {
		fields: [subscription.userId],
		references: [user.id],
	}),
	polarProduct: one(polarProduct, {
		fields: [subscription.polarProductId],
		references: [polarProduct.id],
	}),
}));

export const termsUpdateRelations = relations(termsUpdate, ({ many }) => ({
	agreements: many(termsAgreement),
}));

export const termsAgreementRelations = relations(termsAgreement, ({ one }) => ({
	user: one(user, {
		fields: [termsAgreement.userId],
		references: [user.id],
	}),
	termsUpdate: one(termsUpdate, {
		fields: [termsAgreement.termsUpdateId],
		references: [termsUpdate.id],
	}),
}));

export const bookmarkRelations = relations(bookmark, ({ one }) => ({
	user: one(user, {
		fields: [bookmark.userId],
		references: [user.id],
	}),
	link: one(link, {
		fields: [bookmark.linkUrl],
		references: [link.url],
	}),
}));

export const getUniqueActorsCountSql = (
	postMuteCondition: unknown,
) => sql<number>`
  CAST(LEAST(
    -- Count by normalized names
    COUNT(DISTINCT 
      CASE WHEN ${postMuteCondition} IS NOT NULL THEN
        LOWER(REGEXP_REPLACE(
          COALESCE(
            ${linkPostDenormalized.repostActorName},
            ${linkPostDenormalized.actorName}
          ), '\\s*\\(.*?\\)\\s*', '', 'g'))
      END
    ),
    -- Count by normalized handles
    COUNT(DISTINCT 
      CASE WHEN ${postMuteCondition} IS NOT NULL THEN
        CASE 
          WHEN ${linkPostDenormalized.postType} = 'mastodon' THEN
            LOWER(substring(
              COALESCE(
                ${linkPostDenormalized.repostActorHandle},
                ${linkPostDenormalized.actorHandle}
              ) from '^@?([^@]+)(@|$)'))
          ELSE
            LOWER(replace(replace(
              COALESCE(
                ${linkPostDenormalized.repostActorHandle},
                ${linkPostDenormalized.actorHandle}
              ), '.bsky.social', ''), '@', ''))
        END
      END
    )
  ) as INTEGER)`;

export const networkTopTenView = pgMaterializedView("network_top_ten").as(
	(qb) =>
		qb
			.select({
				link: {
					...getTableColumns(link),
				},
				mostRecentPostDate: sql<Date>`max(${linkPostDenormalized.postDate})`.as(
					"mostRecentPostDate",
				),
				uniqueActorsCount:
					getUniqueActorsCountSql(sql`1`).as("uniqueActorsCount"),
			})
			.from(linkPostDenormalized)
			.innerJoin(link, eq(linkPostDenormalized.linkUrl, link.url))
			.where(
				gte(
					linkPostDenormalized.postDate,
					sql<Date>`now() - interval '3 hours'`,
				),
			)
			.groupBy(linkPostDenormalized.linkUrl, link.id)
			.having(sql`count(*) > 0`)
			.orderBy(desc(sql`"uniqueActorsCount"`), desc(sql`"mostRecentPostDate"`))
			.limit(10),
);
