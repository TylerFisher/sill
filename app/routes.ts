import {
	type RouteConfig,
	index,
	prefix,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/_index.tsx"),
	...prefix("accounts", [
		route("change-email", "routes/accounts/change-email.tsx"),
		route("forgot-password", "routes/accounts/forgot-password.tsx"),
		route("login", "routes/accounts/login.tsx"),
		route("logout", "routes/accounts/logout.tsx"),
		route("onboarding", "routes/accounts/onboarding.tsx"),
		route("password", "routes/accounts/password.tsx"),
		route("reset-password", "routes/accounts/reset-password.tsx"),
		route("signup", "routes/accounts/signup.tsx"),
		route("user/delete", "routes/accounts/user.delete.tsx"),
		route("verify", "routes/accounts/verify.tsx"),
	]),
	...prefix("api", [
		route("agree-to-terms", "routes/api/agree-to-terms.ts"),
		route("list/subscribe", "routes/api/list.subscribe.ts"),
		route("maintain-partitions", "routes/api/maintain-partitions.ts"),
		route("migrate-data", "routes/api/migrate-data.ts"),
		route("polar/webhook", "routes/api/polar.webhook.ts"),
		route("polar/seed", "routes/api/polar.seed.ts"),
		route("send-newsletter", "routes/api/send-newsletter.tsx"),
		route("update-accounts", "routes/api/update-accounts.ts"),
	]),
	...prefix("bluesky", [
		route("auth", "routes/bluesky/auth.ts"),
		route("auth/callback", "routes/bluesky/auth.callback.ts"),
		route("auth/revoke", "routes/bluesky/auth.revoke.ts"),
		route("auth/restore", "routes/bluesky/auth.restore.ts"),
	]),
	...prefix("bookmarks", [
		route("add", "routes/bookmarks/add.ts"),
		route("delete", "routes/bookmarks/delete.ts"),
		index("routes/bookmarks/index.tsx"),
	]),
	route("client-metadata.json", "routes/client-metadata.ts"),
	route("connect", "routes/connect.tsx"),
	...prefix("digest", [
		route(":userId/:feedItemId", "routes/digest/feedItem.tsx"),
		route(":userId.rss", "routes/digest/feed.tsx"),
		route("archive", "routes/digest/archive.tsx"),
		route("settings", "routes/digest/settings.tsx"),
		index("routes/digest/index.tsx"),
	]),
	route("download", "routes/download.tsx"),
	...prefix("email", [
		route("add", "routes/email/add.tsx"),
		route("delete", "routes/email/delete.tsx"),
		index("routes/email/index.tsx"),
	]),
	route("jwks.json", "routes/jwks.ts"),
	...prefix("links", [
		index("routes/links/index.tsx"),
		route(":linkId", "routes/links/item.tsx"),
		route("trending", "routes/links/trending.tsx"),
	]),
	...prefix("mastodon", [
		route("auth", "routes/mastodon/auth.ts"),
		route("auth/callback", "routes/mastodon/auth.callback.ts"),
		route("auth/revoke", "routes/mastodon/auth.revoke.ts"),
	]),
	...prefix("moderation", [
		index("routes/moderation/index.tsx"),
		route("mute/delete", "routes/moderation/mute.delete.ts"),
	]),
	...prefix("notifications", [
		index("routes/notifications/index.tsx"),
		route("delete", "routes/notifications/delete.ts"),
		route(":notificationGroupId.rss", "routes/notifications/feed.ts"),
		route("test", "routes/notifications/test.tsx"),
	]),
	...prefix("resources", [
		route("layout-switch", "routes/resources/layout-switch.tsx"),
		route("theme-switch", "routes/resources/theme-switch.tsx"),
	]),
	...prefix("settings", [
		index("routes/settings/index.tsx"),
		route("checkout", "routes/settings/checkout.tsx"),
		route("subscription", "routes/settings/subscription.tsx"),
	]),
] satisfies RouteConfig;
