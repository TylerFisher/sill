import { CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { Avatar, Button } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useRef } from "react";
import { useTheme } from "~/routes/resources/theme-switch";
import styles from "./SharedByBug.module.css";

const SharedByBug = ({
	uniqueActors,
	uniqueActorsCount,
	open,
	layout,
}: {
	uniqueActors: (string | null)[];
	uniqueActorsCount: number;
	open: boolean;
	layout: "default" | "dense";
}) => {
	const ref = useRef<HTMLButtonElement>(null);
	const theme = useTheme();

	// The pill's own background. Reused as the avatar ring color below, so the
	// faces read as a row of distinct people rather than one merged blob — the
	// human center of the card, given a little positive space between heads.
	const pillBackground =
		layout === "dense" && !open
			? "inherit"
			: theme === "dark"
				? "var(--gray-3)"
				: "var(--accent-3)";
	// When the pill inherits (dense, closed), fall back to the card panel so the
	// ring still separates the faces from each other.
	const ringColor =
		pillBackground === "inherit" ? "var(--color-panel-solid)" : pillBackground;

	const executeScroll = () =>
		setTimeout(() => {
			if (ref.current && ref.current.getBoundingClientRect().top < 0) {
				ref.current.scrollIntoView();
			}
		}, 0);

	return (
		<CollapsibleTrigger asChild>
			<Button
				variant="soft"
				size={layout === "dense" ? "1" : "2"}
				className={styles.bug}
				ref={ref}
				onClick={() => {
					executeScroll();
				}}
				style={{
					position: open ? "sticky" : "static",
					zIndex: open ? 5 : 0,
					backgroundColor: pillBackground,
					width: open ? "100%" : layout === "dense" ? "inherit" : "270px",
					borderRadius: open ? "0" : "1rem",
					transition: "all 0.3s",
					padding: 0,
				}}
			>
				{uniqueActors.slice(0, 3).map((actor, i) => (
					<Avatar
						src={actor || undefined}
						alt=""
						loading="lazy"
						decoding="async"
						fallback="T"
						key={actor}
						radius="full"
						size="1"
						style={{
							marginLeft: i > 0 ? "-10px" : "0",
							boxShadow: `0 0 0 2px ${ringColor}`,
						}}
					/>
				))}
				Shared by {uniqueActorsCount}{" "}
				{uniqueActorsCount === 1 ? "account" : "accounts"}
				{open ? (
					<ChevronUp width="14" height="14" />
				) : (
					<ChevronDown width="14" height="14" />
				)}
			</Button>
		</CollapsibleTrigger>
	);
};

export default SharedByBug;
