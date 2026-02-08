import * as Collapsible from "@radix-ui/react-collapsible";
import { Box, Button, Text } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type PropsWithChildren, useState } from "react";
import styles from "./LinkFiltersCollapsible.module.css";

const LinkFiltersCollapsible = ({ children }: PropsWithChildren) => {
	const [open, setOpen] = useState(false);

	return (
		<Box className={styles.container}>
			<Collapsible.Root open={open} onOpenChange={setOpen}>
				<Collapsible.Trigger asChild>
					<Button variant="soft" color="gray" size="2" className={styles.trigger}>
						<Text>Filters</Text>
						{open ? (
							<ChevronUp width="18" height="18" />
						) : (
							<ChevronDown width="18" height="18" />
						)}
					</Button>
				</Collapsible.Trigger>
				<Collapsible.Content className={styles.content}>
					<Box pt="2">{children}</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	);
};

export default LinkFiltersCollapsible;
