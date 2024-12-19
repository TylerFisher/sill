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
		route("list/subscribe", "routes/api/list.subscribe.ts"),
		route("migrate-data", "routes/api/migrate-data.ts"),
		route("send-newsletter", "routes/api/send-newsletter.tsx"),
		route("update-accounts", "routes/api/update-accounts.tsx"),
	]),
	...prefix("bluesky", [
		route("auth", "routes/bluesky/auth.ts"),
		route("auth/callback", "routes/bluesky/auth.callback.ts"),
		route("auth/revoke", "routes/bluesky/auth.revoke.ts"),
		route("auth/restore", "routes/bluesky/auth.restore.ts"),
	]),
	route("client-metadata.json", "routes/client-metadata.ts"),
	route("connect", "routes/connect.tsx"),
	...prefix("digest", [
		route(":userId/:feedItemId", "routes/digest/feedItem.tsx"),
		route(":userId.rss", "routes/digest/feed.tsx"),
	]),
	route("download", "routes/download.tsx"),
	...prefix("email", [
		index("routes/email/index.tsx"),
		route("add", "routes/email/add.tsx"),
		route("delete", "routes/email/delete.tsx"),
	]),
	route("jwks.json", "routes/jwks.ts"),
	...prefix("links", [
		index("routes/links/index.tsx"),
		route(":linkId", "routes/links/item.tsx"),
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
		route("add", "routes/notifications/add.tsx"),
		route(":notificationGroupId.rss", "routes/notifications/feed.ts"),
		route("test", "routes/notifications/test.tsx"),
	]),
	...prefix("resources", [
		route("layout-switch", "routes/resources/layout-switch.tsx"),
		route("theme-switch", "routes/resources/theme-switch.tsx"),
	]),
	route("settings", "routes/settings/index.tsx"),
] satisfies RouteConfig;
