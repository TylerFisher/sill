CREATE MATERIALIZED VIEW "public"."network_top_ten" AS (select "link"."id", "link"."url", "link"."title", "link"."description", "link"."imageUrl", "link"."giftUrl", max("link_post_denormalized"."postDate") as "mostRecentPostDate", 
  CAST(LEAST(
    -- Count by normalized names
    COUNT(DISTINCT 
      CASE WHEN 1 IS NOT NULL THEN
        LOWER(REGEXP_REPLACE(
          COALESCE(
            "link_post_denormalized"."repostActorName",
            "link_post_denormalized"."actorName"
          ), '\s*\(.*?\)\s*', '', 'g'))
      END
    ),
    -- Count by normalized handles
    COUNT(DISTINCT 
      CASE WHEN 1 IS NOT NULL THEN
        CASE 
          WHEN "link_post_denormalized"."postType" = 'mastodon' THEN
            LOWER(substring(
              COALESCE(
                "link_post_denormalized"."repostActorHandle",
                "link_post_denormalized"."actorHandle"
              ) from '^@?([^@]+)(@|$)'))
          ELSE
            LOWER(replace(replace(
              COALESCE(
                "link_post_denormalized"."repostActorHandle",
                "link_post_denormalized"."actorHandle"
              ), '.bsky.social', ''), '@', ''))
        END
      END
    )
  ) as INTEGER) as "uniqueActorsCount" from "link_post_denormalized" inner join "link" on "link_post_denormalized"."linkUrl" = "link"."url" where "link_post_denormalized"."postDate" >= now() - interval '3 hours' group by "link_post_denormalized"."linkUrl", "link"."id" having count(*) > 0 order by "uniqueActorsCount" desc, "mostRecentPostDate" desc limit 10);