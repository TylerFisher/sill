import {
	type SubmissionResult,
	getFormProps,
	getInputProps,
	useForm,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	Box,
	Button,
	Callout,
	Card,
	Flex,
	Link as RLink,
	RadioGroup,
	Separator,
	Text,
	TextField,
} from "@radix-ui/themes";
import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Form, Link, useFetcher } from "react-router";
import type { list } from "@sill/schema";
import { NotificationSchema } from "~/routes/notifications";
import { useNotificationsDispatch } from "../contexts/NotificationsContext";
import CopyLink from "../linkPosts/CopyLink";
import NotificationQueryItem, {
	type NotificationQuery,
} from "./NotificationQueryItem";
import TextInput from "./TextInput";

export interface NotificationGroupInit {
	id?: string;
	name: string;
	query: NotificationQuery[];
	notificationType: "email" | "rss";
	saved: boolean;
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
	allLists,
	email,
}: {
	index: number;
	group: NotificationGroupInit;
	lastResult?: SubmissionResult<string[]>;
	allLists: (typeof list.$inferSelect)[];
	email: string | null;
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

	const [form, fields] = useForm({
		lastResult: lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: NotificationSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onSubmit",
	});

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
		<Form method="POST" action="/notifications" {...getFormProps(form)}>
			<input type="hidden" name="id" value={group.id} />
			<Card mt={index > 0 ? "4" : "0"}>
				{group.notificationType === "rss" && group.saved && (
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
									layout="default" // not used on this page
								/>
							</TextField.Slot>
						</TextField.Root>
					</Box>
				)}
				<TextInput
					labelProps={{ children: "Name" }}
					inputProps={{
						...getInputProps(fields.name, {
							type: "text",
						}),
						defaultValue: group.name,
						autoComplete: "off",
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
				{format === "email" && !email && (
					<Callout.Root color="amber" mb="4">
						<Callout.Icon>
							<TriangleAlert size={16} />
						</Callout.Icon>
						<Callout.Text>
							You need to add an email address to receive email notifications.{" "}
							<RLink asChild>
								<Link to="/accounts/add-email?redirectTo=/notifications">Add your email address</Link>
							</RLink>
						</Callout.Text>
					</Callout.Root>
				)}
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
									allLists={allLists}
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
				{(testFetcher.data || testFetcher.data === 0) && (
					<Box width="100%" my="4">
						<strong>
							{testFetcher.data} result{testFetcher.data !== 1 && "s"}
						</strong>{" "}
						found from the last 24 hours.{" "}
						{testFetcher.data === 0 &&
							"Adjust your filters for better results."}
					</Box>
				)}
				<Flex direction="row" gap="2">
					<Button
						type="submit"
						disabled={format === "email" && !email}
						onClick={() => {
							dispatch({
								type: "submitted",
								notification: group,
							});
						}}
					>
						Save notification
					</Button>
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
				{lastResult?.initialValue &&
					group.id &&
					lastResult?.initialValue.id === group.id && (
						<Box mt="4">
							<Text as="p">
								{lastResult?.status === "success" ? (
									<strong>Your notification settings have been saved.</strong>
								) : (
									<Text>Error: this notification group already exists</Text>
								)}
							</Text>
						</Box>
					)}
			</Card>
		</Form>
	);
};

export default NotificationGroup;
