import { Box, Callout, Button } from "@radix-ui/themes";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";
import NotificationGroup, {
	type NotificationGroupInit,
} from "./NotificationGroup";
import type { notificationGroup } from "~/drizzle/schema.server";

interface NotificationFormProps {
	notificationGroups: (typeof notificationGroup.$inferSelect)[];
}

const NotificationForm = ({ notificationGroups }: NotificationFormProps) => {
	const [groups, setGroups] = useState<NotificationGroupInit[]>(
		notificationGroups.length > 0 ? notificationGroups : [],
	);
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
				<NotificationGroup
					key={group.id || index}
					index={index}
					group={group}
				/>
			))}
			<Box mt="4">
				<Button
					variant="soft"
					type="button"
					onClick={() =>
						setGroups([
							...groups,
							{
								name: "",
								query: [],
								notificationType: "email",
							},
						])
					}
				>
					<Plus width="18" height="18" />
					Add notification
				</Button>
			</Box>
		</Box>
	);
};

export default NotificationForm;
