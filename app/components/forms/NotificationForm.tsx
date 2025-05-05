import { Box, Button, Text, Flex } from "@radix-ui/themes";
import NotificationGroup, {
	type NotificationGroupInit,
} from "./NotificationGroup";
import type { SubmissionResult } from "@conform-to/react";
import {
	useNotifications,
	useNotificationsDispatch,
} from "../contexts/NotificationsContext";
import { uuidv7 } from "uuidv7-js";
import type { list } from "~/drizzle/schema.server";

interface NotificationFormProps {
	lastResult?: SubmissionResult<string[]> | undefined;
	allLists: (typeof list.$inferSelect)[];
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

const NotificationForm = ({ lastResult, allLists }: NotificationFormProps) => {
	const groups = useNotifications();
	const { dispatch } = useNotificationsDispatch();

	return (
		<Box>
			{groups.notifications.map((group, index) => (
				<NotificationGroup
					key={group.id || index}
					index={index}
					group={group}
					lastResult={lastResult}
					allLists={allLists}
				/>
			))}
			{groups.notifications.length === 0 ? (
				<Text as="p" mb="4">
					Don't know where to start? Use Sill's notification templates:
				</Text>
			) : (
				<Text as="p" my="4">
					Add another notification. Use Sill's notification templates:
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
				<Text as="p">Or start from scratch:</Text>
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
