import { Card, Inset, Text } from "@radix-ui/themes";
import styles from "./PostContent.module.css";
import RatingStars from "./RatingStars";
interface Post {
  postText: string;
  postType: "bluesky" | "mastodon" | "atbookmark";
  postImages:
    | {
        url: string;
        alt: string;
      }[]
    | null;
  rating?: number | null;
}
interface PostContentProps {
  post: Post;
  layout: "default" | "dense";
}

const PostContent = ({ post, layout }: PostContentProps) => {
  if (!post) return null;

  // Process post text to add target="_blank" and rel attributes to all links
  if (post.postText) {
    post.postText = post.postText.replace(
      /<a href/g,
      '<a target="_blank" rel="noopener noreferrer" href'
    );
    // Remove <p> tags with class quote-inline
    post.postText = post.postText.replace(
      /<p[^>]*class="quote-inline"[^>]*>.*?<\/p>/gi,
      ""
    );
  }

  const textSize = {
    initial: layout === "dense" ? ("1" as const) : ("2" as const),
    sm: layout === "dense" ? ("2" as const) : ("3" as const),
  };
  const textAs = post.postType === "bluesky" ? ("p" as const) : ("div" as const);

  // Popfeed posts mark the star rating with a `popfeed-rating` span (unicode
  // stars, for email/RSS). On the web feed we render lucide stars at that exact
  // spot instead — inline after "rated this {type}", or before the review text —
  // by splitting the body on the marker and dropping <RatingStars> between.
  const ratingMarker = /<span[^>]*class="popfeed-rating"[^>]*>.*?<\/span>/i;
  if (post.rating != null && ratingMarker.test(post.postText)) {
    const parts = post.postText.split(ratingMarker);
    const before = parts[0];
    const after = parts.slice(1).join("");
    return (
      <>
        <Text className={styles["post-content"]} size={textSize} as={textAs}>
          {before && <span dangerouslySetInnerHTML={{ __html: before }} />}
          <RatingStars rating={post.rating} inline />
          {after && <span dangerouslySetInnerHTML={{ __html: after }} />}
        </Text>
        {post.postImages?.map((image) => (
          <Card key={image.url} mt="2">
            <Inset>
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                width="100%"
              />
            </Inset>
          </Card>
        ))}
      </>
    );
  }

  return (
    <>
      <Text
        dangerouslySetInnerHTML={{
          __html: post.postText,
        }}
        className={styles["post-content"]}
        size={textSize}
        as={textAs}
      />
      {post.postImages &&
        post.postImages.length > 0 &&
        post.postImages.map((image) => (
          <Card key={image.url} mt="2">
            <Inset>
              <img
                src={image.url}
                alt={image.alt}
                loading="lazy"
                decoding="async"
                width="100%"
              />
            </Inset>
          </Card>
        ))}
    </>
  );
};

export default PostContent;
