import { Flex } from "@radix-ui/themes";
import { Star, StarHalf } from "lucide-react";

/**
 * Render a Popfeed 0–10 review score as five stars (rating / 2, rounded to the
 * nearest half): filled stars for the score, a half star for the .5, outline
 * stars for the remainder. Web-feed only — other surfaces (email, RSS) show the
 * unicode stars baked into the post body.
 */
const RatingStars = ({
	rating,
	inline = false,
}: {
	rating: number;
	inline?: boolean;
}) => {
	const half = Math.round(Math.max(0, Math.min(10, rating))) / 2;
	const full = Math.floor(half);
	const hasHalf = half - full === 0.5;
	const empty = 5 - full - (hasHalf ? 1 : 0);
	const size = 16;

	return (
		<Flex
			align="center"
			gap="1"
			display={inline ? "inline-flex" : "flex"}
			mb={inline ? "0" : "1"}
			aria-label={`Rated ${rating} out of 10`}
			style={{ color: "var(--accent-11)", verticalAlign: "-3px" }}
		>
			{Array.from({ length: full }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length, never reordered
				<Star key={`f${i}`} size={size} fill="currentColor" strokeWidth={0} />
			))}
			{hasHalf && <StarHalf size={size} fill="currentColor" strokeWidth={0} />}
			{Array.from({ length: empty }, (_, i) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length, never reordered
				<Star key={`e${i}`} size={size} stroke="var(--gray-7)" />
			))}
		</Flex>
	);
};

export default RatingStars;
