import { gte, sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	index,
	integer,
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

export const postType = pgEnum("post_type", ["bluesky", "mastodon"]);

export const linkPostToUser = pgTable(
	"link_post_to_user",
	{
		linkPostId: uuid()
			.notNull()
			.references(() => linkPost.id),
		userId: uuid()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(table) => {
		return {
			abUnique: uniqueIndex("link_post_to_user_unique").using(
				"btree",
				table.linkPostId.asc().nullsLast(),
				table.userId.asc().nullsLast(),
			),
			userIdx: index().using("btree", table.userId.asc().nullsLast()),
		};
	},
);

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

export const linkPost = pgTable(
	"link_post",
	{
		id: uuid().primaryKey().notNull(),
		linkUrl: text()
			.notNull()
			.references(() => link.url),
		postId: uuid()
			.notNull()
			.references(() => post.id),
		date: timestamp({ precision: 3, mode: "date" }).notNull(),
	},
	(table) => {
		return {
			linkUrlPostIdUnique: unique().on(table.linkUrl, table.postId),
			linkUrlPostIdKey: uniqueIndex("link_post_link_url_post_id_key").using(
				"btree",
				table.linkUrl.asc().nullsLast(),
				table.postId.asc().nullsLast(),
			),
		};
	},
);
export const recentLinkPosts = pgMaterializedView("recent_link_posts").as(
	(qb) =>
		qb
			.select()
			.from(linkPost)
			.where(gte(linkPost.date, sql`now() - interval '1 day'`)),
);

export const post = pgTable(
	"post",
	{
		id: uuid().primaryKey().notNull(),
		url: text().notNull(),
		text: text().notNull(),
		postDate: timestamp({ precision: 3, mode: "date" }).notNull(),
		postType: postType().notNull(),
		actorHandle: text()
			.notNull()
			.references(() => actor.handle),
		quotingId: uuid(),
		repostHandle: text().references(() => actor.handle),
	},
	(table) => {
		return {
			postQuotingIdFkey: foreignKey({
				columns: [table.quotingId],
				foreignColumns: [table.id],
				name: "post_quoting_id_fkey",
			})
				.onUpdate("cascade")
				.onDelete("set null"),
			textSearchIndex: index("text_search_index").using(
				"gin",
				sql`to_tsvector('english', ${table.text})`,
			),
		};
	},
);

export const postListSubscription = pgTable("post_list_subscription", {
	id: uuid().primaryKey().notNull(),
	postId: uuid()
		.notNull()
		.references(() => post.id, { onDelete: "cascade" }),
	listId: uuid()
		.notNull()
		.references(() => list.id, { onDelete: "cascade" }),
});

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

export const emailSettings = pgTable("email_settings", {
	id: uuid().primaryKey().notNull(),
	userId: uuid()
		.notNull()
		.references(() => user.id, { onDelete: "cascade" })
		.unique(),
	scheduledTime: time().notNull(),
	topAmount: integer().notNull().default(10),
	splitServices: boolean().notNull().default(false),
	hideReposts: boolean().notNull().default(false),
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
	uri: text().notNull().unique(),
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
		};
	},
);

export const actor = pgTable(
	"actor",
	{
		id: uuid().primaryKey().notNull(),
		url: text().notNull(),
		name: text(),
		handle: text().notNull().unique(),
		avatarUrl: text(),
	},
	(table) => {
		return {
			searchIndex: index("actor_search_index").using(
				"gin",
				sql`(
          setweight(to_tsvector('english', ${table.name}), 'A') ||
          setweight(to_tsvector('english', ${table.handle}), 'B')
        )`,
			),
		};
	},
);

export const postImage = pgTable("post_image", {
	id: uuid().primaryKey().notNull(),
	alt: text().notNull(),
	url: text().notNull(),
	postId: uuid()
		.notNull()
		.references(() => post.id),
});

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

export const linkPostToUserRelations = relations(linkPostToUser, ({ one }) => ({
	linkPost: one(linkPost, {
		fields: [linkPostToUser.linkPostId],
		references: [linkPost.id],
	}),
	user: one(user, {
		fields: [linkPostToUser.userId],
		references: [user.id],
	}),
}));

export const linkPostRelations = relations(linkPost, ({ one, many }) => ({
	linkPostToUsers: many(linkPostToUser),
	link: one(link, {
		fields: [linkPost.linkUrl],
		references: [link.url],
	}),
	post: one(post, {
		fields: [linkPost.postId],
		references: [post.id],
	}),
}));

export const userRelations = relations(user, ({ one, many }) => ({
	linkPostToUsers: many(linkPostToUser),
	password: one(password),
	sessions: many(session),
	mastodonAccounts: many(mastodonAccount),
	blueskyAccounts: many(blueskyAccount),
	emailTokens: many(emailToken),
	mutePhrases: many(mutePhrase),
	emailSettings: one(emailSettings),
}));

export const linkRelations = relations(link, ({ many }) => ({
	linkPosts: many(linkPost),
}));

export const postRelations = relations(post, ({ one, many }) => ({
	linkPosts: many(linkPost),
	actor: one(actor, {
		fields: [post.actorHandle],
		references: [actor.handle],
		relationName: "post_actor",
	}),
	quoting: one(post, {
		fields: [post.quotingId],
		references: [post.id],
		relationName: "post_quoting",
	}),
	quoted: many(post, {
		relationName: "post_quoting",
	}),
	reposter: one(actor, {
		fields: [post.repostHandle],
		references: [actor.handle],
		relationName: "post_reposter",
	}),
	postImages: many(postImage),
}));

export const actorRelations = relations(actor, ({ many }) => ({
	posts: many(post, {
		relationName: "post_actor",
	}),
	reposts: many(post, {
		relationName: "post_reposter",
	}),
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

export const postListSubscriptionRelations = relations(
	postListSubscription,
	({ one }) => ({
		post: one(post, {
			fields: [postListSubscription.postId],
			references: [post.id],
		}),
		list: one(list, {
			fields: [postListSubscription.listId],
			references: [list.id],
		}),
	}),
);

export const postImageRelations = relations(postImage, ({ one }) => ({
	post: one(post, {
		fields: [postImage.postId],
		references: [post.id],
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

export const emailSettingsRelations = relations(emailSettings, ({ one }) => ({
	user: one(user, {
		fields: [emailSettings.userId],
		references: [user.id],
	}),
}));
