import { Box, Callout, Button } from "@radix-ui/themes";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";
import NotificationGroup, {
	type NotificationGroupInit,
} from "./NotificationGroup";
import type { notificationGroup } from "~/drizzle/schema.server";
import type { SubmissionResult } from "@conform-to/react";

interface NotificationFormProps {
	notificationGroups: (typeof notificationGroup.$inferSelect)[];
	lastResult?: SubmissionResult<string[]>;
}
const defaultCategory = {
	id: "url",
	name: "Link URL",
	type: "string",
};

const defaultGroup: NotificationGroupInit = {
	name: "",
	query: [
		{
			category: defaultCategory,
			operator: "contains",
			value: "",
		},
	],
	notificationType: "email",
};

const NotificationForm = ({
	notificationGroups,
	lastResult,
}: NotificationFormProps) => {
	const [groups, setGroups] = useState<NotificationGroupInit[]>(
		notificationGroups.length > 0 ? notificationGroups : [defaultGroup],
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
					lastResult={lastResult}
				/>
			))}
			<Box mt="4">
				<Button
					variant="soft"
					type="button"
					onClick={() => setGroups([...groups, defaultGroup])}
				>
					<Plus width="18" height="18" />
					Add notification
				</Button>
			</Box>
		</Box>
	);
};

export default NotificationForm;
