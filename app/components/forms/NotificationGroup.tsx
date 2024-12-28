import {
	Box,
	Button,
	Card,
	Flex,
	RadioGroup,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import TextInput from "./TextInput";
import { useEffect, useState } from "react";
import { Form, useFetcher } from "react-router";
import type { SubmissionResult } from "@conform-to/react";
import NotificationQueryItem, {
	type NotificationQuery,
} from "./NotificationQueryItem";
import { Plus } from "lucide-react";
import CopyLink from "../linkPosts/CopyLink";
import { useNotificationsDispatch } from "../contexts/NotificationsContext";

export interface NotificationGroupInit {
	id?: string;
	name: string;
	query: NotificationQuery[];
	notificationType: "email" | "rss";
}
const defaultCategory = {
	id: "url",
	name: "Link URL",
	type: "string",
};

const NotificationGroup = ({
	index,
	group,
	lastResult,
}: {
	index: number;
	group: NotificationGroupInit;
	lastResult?: { id: string }[] | SubmissionResult<string[]>;
}) => {
	const [format, setFormat] = useState<string | undefined>(
		group.notificationType || "email",
	);
	const [queryItems, setQueryItems] = useState<NotificationQuery[]>(
		group.query
			? group.query
			: [
					{
						category: defaultCategory,
						operator: "",
						value: "",
					},
				],
	);
	const testFetcher = useFetcher();
	const deleteFetcher = useFetcher();
	const { dispatch } = useNotificationsDispatch();

	useEffect(() => {
		if (lastResult && Array.isArray(lastResult)) {
			dispatch({
				type: "submitted",
				notification: group,
				newId: lastResult[0].id,
			});
		}
	}, [lastResult, dispatch, group]);

	const onQueryItemChange = (item: NotificationQuery, index: number) => {
		if (!item.category || !item.operator || !item.value) {
			return;
		}
		const validItems = queryItems.filter(
			(item) => item.category && item.operator && item.value,
		);
		const newQueryItems = [...validItems];
		newQueryItems[index] = item;
		setQueryItems(newQueryItems);

		dispatch({
			type: "changed",
			notification: {
				...group,
				query: newQueryItems,
			},
		});

		const formData = new FormData();
		formData.append("queries", JSON.stringify(newQueryItems));
		testFetcher.submit(formData, {
			method: "POST",
			action: "/notifications/test",
		});
	};

	const onQueryItemRemove = (index: number) => {
		const newQueryItems = [...queryItems];
		newQueryItems.splice(index, 1);
		setQueryItems(newQueryItems);
	};
	return (
		<Form method="POST" action="/notifications">
			<input type="hidden" name="id" value={group.id} />
			<Card mt={index > 0 ? "4" : "0"}>
				{Array.isArray(lastResult) && lastResult[0].id && (
					<Box mb="4">
						<Text as="p">
							<strong>Your notification settings have been saved.</strong>
						</Text>
					</Box>
				)}
				{group.notificationType === "rss" && group.id && (
					<Box mb="4">
						<Text as="label" htmlFor="feedUrl" size="3">
							<strong>RSS URL</strong>
						</Text>
						<TextField.Root
							readOnly
							value={`https://sill.social/notifications/${group.id}.rss`}
							name="feedUrl"
							id="feedUrl"
							size="3"
						>
							<TextField.Slot />
							<TextField.Slot
								style={{
									position: "relative",
									top: "1px",
									marginRight: "8px",
								}}
							>
								<CopyLink
									url={`https://sill.social/notifications/${group.id}.rss`}
									textPositioning={{
										position: "absolute",
										top: "-34px",
										left: "-1em",
									}}
								/>
							</TextField.Slot>
						</TextField.Root>
					</Box>
				)}
				<TextInput
					labelProps={{ children: "Name" }}
					inputProps={{
						type: "text",
						name: `name`,
						id: `name`,
						defaultValue: group.name,
						onChange: (e) => {
							dispatch({
								type: "changed",
								notification: {
									...group,
									name: e.target.value,
								},
							});
						},
					}}
				/>
				<Text as="label" size="3" htmlFor="format">
					<strong>Delivery format</strong>
				</Text>
				<RadioGroup.Root
					defaultValue={format}
					name="format"
					mb="4"
					onValueChange={(value) => {
						setFormat(value);
						dispatch({
							type: "changed",
							notification: {
								...group,
								notificationType: value === "rss" ? "rss" : "email",
							},
						});
					}}
					size="3"
				>
					<RadioGroup.Item value="email">Email</RadioGroup.Item>
					<RadioGroup.Item value="rss">RSS</RadioGroup.Item>
				</RadioGroup.Root>
				<Box my="4">
					<Text as="label" size="3">
						<strong>Filters</strong>
					</Text>
					<Card>
						<input
							type="hidden"
							name="queries"
							value={JSON.stringify(queryItems)}
						/>
						{queryItems.map((item, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Nothing else to use
							<Box key={index}>
								<NotificationQueryItem
									index={index}
									item={item}
									setter={onQueryItemChange}
									remover={onQueryItemRemove}
								/>
								<Separator size="4" my="4" />
							</Box>
						))}
						<Box mt="4">
							<Button
								type="button"
								onClick={() =>
									setQueryItems([
										...queryItems,
										{
											category: defaultCategory,
											operator: "",
											value: "",
										},
									])
								}
								variant="soft"
							>
								<Plus width="18" height="18" />
								Add filter
							</Button>
						</Box>
					</Card>
				</Box>
				{testFetcher.data && (
					<Box width="100%" my="4">
						<strong>{testFetcher.data} results</strong> found from the last 24
						hours.
					</Box>
				)}
				<Flex direction="row" gap="2">
					<Button type="submit">Save notification</Button>
					{group.id && (
						<Button
							type="button"
							color="red"
							onClick={() => {
								const formData = new FormData();
								formData.set("groupId", group.id as string);
								deleteFetcher
									.submit(formData, {
										method: "DELETE",
										action: "/notifications/delete",
									})
									.then(() => {
										dispatch({
											type: "deleted",
											notification: group,
										});
									});
							}}
						>
							Delete notification
						</Button>
					)}
				</Flex>
			</Card>
		</Form>
	);
};

export default NotificationGroup;
