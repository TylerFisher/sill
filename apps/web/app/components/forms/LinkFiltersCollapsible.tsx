import { Box, Button, Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { type PropsWithChildren, useState } from "react";
import { useTheme } from "~/routes/resources/theme-switch";
import styles from "./LinkFilters.module.css";

interface LinkFiltersCollapsibleProps extends PropsWithChildren {
	customFilterCount?: number;
}

const LinkFiltersCollapsible = ({
	children,
	customFilterCount = 0,
}: LinkFiltersCollapsibleProps) => {
	const [open, setOpen] = useState(false);
	const theme = useTheme();

	return (
		<Box
			mb={{
				initial: "0",
				md: "2",
			}}
			mx="-4"
			style={{
				backgroundColor:
					customFilterCount > 0
						? "var(--yellow-9)"
						: theme === "dark"
							? "rgba(25,25,24,0.8)"
							: "rgba(249,249,248,0.8)",
				backdropFilter:
					customFilterCount > 0 ? "none" : "saturate(1.8) blur(20px)",
			}}
			className={styles["filter-wrapper"]}
		>
			<Dialog.Root open={open} onOpenChange={setOpen}>
				<Dialog.Trigger>
					<Text align="center" as="p" mt="1">
						<Button
							variant="ghost"
							size="2"
							style={{
								color: customFilterCount > 0 ? "black" : "var(--yellow-11)",
							}}
						>
							Filters{customFilterCount > 0 && ` (${customFilterCount})`}
							{open ? (
								<ChevronDown width="18" height="18" />
							) : (
								<ChevronUp width="18" height="18" />
							)}
						</Button>
					</Text>
				</Dialog.Trigger>
				<Dialog.Content
					className={styles["dialog-content"]}
					onOpenAutoFocus={(e) => e.preventDefault()}
				>
					<Flex justify="between" align="center" mb="3">
						<Text size="4" weight="medium">
							Filters
						</Text>
						<Dialog.Close>
							<IconButton variant="ghost" size="2">
								<X size={18} />
							</IconButton>
						</Dialog.Close>
					</Flex>
					{children}
				</Dialog.Content>
			</Dialog.Root>
		</Box>
	);
};

export default LinkFiltersCollapsible;
