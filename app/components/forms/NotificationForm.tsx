import { Box, Callout, Button } from "@radix-ui/themes";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";
import NotificationGroup from "./NotificationGroup";

const NotificationForm = () => {
	const [groups, setGroups] = useState([{}]);
	return (
		<Box>
			<Callout.Root mb="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text size="2">
					Notifications are free during Sill's beta period. This will be part of
					Sill's paid plan in the future.
				</Callout.Text>
			</Callout.Root>
			{groups.map((group, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Nothing else to use
				<NotificationGroup key={index} index={index} />
			))}
			<Box mt="4">
				<Button
					variant="soft"
					type="button"
					onClick={() => setGroups([...groups, {}])}
				>
					<Plus width="18" height="18" />
					Add notification
				</Button>
			</Box>
		</Box>
	);
};

export default NotificationForm;
