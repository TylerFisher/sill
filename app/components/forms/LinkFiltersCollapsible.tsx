import * as Collapsible from "@radix-ui/react-collapsible";
import { Box, Button, Text } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState, type PropsWithChildren } from "react";
import styles from "./LinkFilters.module.css";

const LinkFiltersCollapsible = ({ children }: PropsWithChildren) => {
	const [open, setOpen] = useState(false);

	return (
		<Box
			px="4"
			pt="2"
			pb={open ? "5" : "2"}
			mb={{
				initial: "0",
				md: "2",
			}}
			mx="-4"
			className={styles["filter-wrapper"]}
		>
			<Collapsible.Root
				className="CollapsibleRoot"
				open={open}
				onOpenChange={setOpen}
			>
				<Collapsible.Trigger asChild>
					<Text align="center" as="p" mt="1">
						<Button variant="ghost" size="2">
							Filters
							{open ? (
								<ChevronDown width="18" height="18" />
							) : (
								<ChevronUp width="18" height="18" />
							)}
						</Button>
					</Text>
				</Collapsible.Trigger>
				<Collapsible.Content className={styles.collapsible}>
					{children}
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	);
};

export default LinkFiltersCollapsible;
