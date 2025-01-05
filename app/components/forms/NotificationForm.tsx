import { Box, Callout, Button } from "@radix-ui/themes";
import { CircleAlert, Plus } from "lucide-react";
import NotificationGroup, {
	type NotificationGroupInit,
} from "./NotificationGroup";
import type { SubmissionResult } from "@conform-to/react";
import {
	useNotifications,
	useNotificationsDispatch,
} from "../contexts/NotificationsContext";
import { uuidv7 } from "uuidv7-js";

interface NotificationFormProps {
	lastResult?: SubmissionResult<string[]> | undefined;
}
const defaultCategory = {
	id: "url",
	name: "Link URL",
	type: "string",
};

export const defaultGroup = (id?: string): NotificationGroupInit => ({
	id,
	name: "",
	query: [
		{
			category: defaultCategory,
			operator: "contains",
			value: "",
		},
	],
	notificationType: "email",
	saved: false,
});

const NotificationForm = ({ lastResult }: NotificationFormProps) => {
	const groups = useNotifications();
	const { dispatch } = useNotificationsDispatch();

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
			{groups.notifications.map((group, index) => (
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
					onClick={() =>
						dispatch({
							type: "added",
							notification: defaultGroup(uuidv7()),
						})
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
