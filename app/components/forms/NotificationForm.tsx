import { Box, Callout, Button, Text, Link, Flex } from "@radix-ui/themes";
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

export const keywordGroup = (id?: string): NotificationGroupInit => ({
	id,
	name: "Links matching a keyword",
	query: [
		{
			category: {
				id: "link",
				name: "Link text",
				type: "string",
			},
			operator: "contains",
			value: "Keyword",
		},
	],
	notificationType: "email",
	saved: false,
});

const popularLinksGroup = (id: string): NotificationGroupInit => ({
	id,
	name: "Popular links",
	query: [
		{
			category: {
				id: "shares",
				name: "Number of shares",
				type: "number",
			},
			operator: "greaterThanEqual",
			value: 5,
		},
	],
	notificationType: "email",
	saved: false,
});

const popularLinksFromDomainGroup = (id: string): NotificationGroupInit => ({
	id,
	name: "Popular links from a domain",
	query: [
		{
			category: defaultCategory,
			operator: "contains",
			value: "example.com",
		},
		{
			category: {
				id: "shares",
				name: "Number of shares",
				type: "number",
			},
			operator: "greaterThanEqual",
			value: 5,
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
			{groups.notifications.length === 0 && (
				<Text as="p" mb="4">
					Don't know where to start? Use Sill's notification templates:
				</Text>
			)}
			<Flex direction="column" gap="3" my="4">
				<Button
					type="button"
					onClick={() =>
						dispatch({
							type: "added",
							notification: popularLinksGroup(uuidv7()),
						})
					}
					variant="soft"
				>
					Popular links in your network
				</Button>
				<Button
					type="button"
					onClick={() =>
						dispatch({
							type: "added",
							notification: popularLinksFromDomainGroup(uuidv7()),
						})
					}
					variant="soft"
				>
					Popular links from a domain
				</Button>
				<Button
					type="button"
					onClick={() =>
						dispatch({
							type: "added",
							notification: keywordGroup(uuidv7()),
						})
					}
					variant="soft"
				>
					All links matching a keyword
				</Button>
				{groups.notifications.length === 0 && (
					<Text as="p">Or start from scratch:</Text>
				)}
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
					Add custom notification
				</Button>
			</Flex>
		</Box>
	);
};

export default NotificationForm;
