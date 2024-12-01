CREATE MATERIALIZED VIEW "public"."recent_link_posts" AS (select "id", "linkUrl", "postId", "date" from "link_post" where "link_post"."date" >= now() - interval '1 day');