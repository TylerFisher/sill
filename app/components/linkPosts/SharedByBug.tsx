import { CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { Avatar, Button } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import styles from "./SharedByBug.module.css";
import { useRef } from "react";

const SharedByBug = ({
	uniqueActors,
	uniqueActorsCount,
	open,
}: {
	uniqueActors: (string | null)[];
	uniqueActorsCount: number;
	open: boolean;
}) => {
	const ref = useRef<HTMLButtonElement>(null);

	const executeScroll = () =>
		setTimeout(() => {
			ref.current?.scrollIntoView();
		}, 0);
	return (
		<CollapsibleTrigger asChild>
			<Button
				variant="soft"
				size="2"
				className={styles.bug}
				ref={ref}
				onClick={() => {
					if (open) {
						executeScroll();
					}
				}}
				style={{
					position: open ? "sticky" : "static",
					zIndex: open ? 5 : 0,
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
							marginLeft: i > 0 ? "-12px" : "0",
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
