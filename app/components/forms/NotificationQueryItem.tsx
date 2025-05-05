import { Box, Flex, IconButton, Select, TextField } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useState } from "react";
import type { list } from "~/drizzle/schema.server";

interface NotificationCategory {
	id: string;
	name: string;
	type: string;
	values?: {
		id: string;
		name: string;
	}[];
}
export interface NotificationQuery {
	category: NotificationCategory;
	operator: string;
	value: string | number;
}

interface NotificationQueryItemProps {
	index: number;
	item: NotificationQuery;
	setter: (item: NotificationQuery, index: number) => void;
	remover: (index: number) => void;
	allLists: (typeof list.$inferSelect)[];
}

const NotificationQueryItem = ({
	index,
	item,
	setter,
	remover,
	allLists,
}: NotificationQueryItemProps) => {
	const [category, setCategory] = useState<NotificationCategory>(item.category);
	const [operator, setOperator] = useState<string>(item.operator);
	const [value, setValue] = useState<string | number>(item.value);

	const notificationCategories: NotificationCategory[] = [
		{
			id: "url",
			name: "Link URL",
			type: "string",
		},
		{
			id: "link",
			name: "Link text",
			type: "string",
		},
		{
			id: "shares",
			name: "Number of shares",
			type: "number",
		},
		{
			id: "author",
			name: "Post author",
			type: "string",
		},
		{
			id: "post",
			name: "Post text",
			type: "string",
		},
		{
			id: "repost",
			name: "Repost author",
			type: "string",
		},
		{
			id: "service",
			name: "Service",
			type: "enum",
			values: [
				{
					id: "bluesky",
					name: "Bluesky",
				},
				{
					id: "mastodon",
					name: "Mastodon",
				},
			],
		},
	];

	if (allLists.length > 0) {
		notificationCategories.push({
			id: "list",
			name: "List name",
			type: "enum",
			values: allLists.map((list) => ({
				id: list.id,
				name: list.name,
			})),
		});
	}

	const onCategoryChange = (v: string) => {
		const category = notificationCategories.find((c) => c.id === v);
		if (!category) {
			return;
		}

		setCategory(category);
		setOperator("");
		setValue("");
		setter({ category, operator, value }, index);
	};

	const onOperatorChange = (o: string) => {
		setOperator(o);
		setter({ category, operator: o, value }, index);
	};

	const onValueChange = (v: string | number) => {
		setValue(v);
		setter({ category, operator, value: v }, index);
	};

	return (
		<Flex
			direction="row"
			gap="2"
			mt={index > 0 ? "4" : "0"}
			wrap="wrap"
			align="center"
			position="relative"
		>
			<Box>
				<Select.Root
					value={category.id}
					onValueChange={onCategoryChange}
					size="3"
				>
					<Select.Trigger placeholder="Category" id="category" />
					<Select.Content>
						{notificationCategories.map((category) => (
							<Select.Item key={category.id} value={category.id}>
								{category.name}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Box>
			<Box>
				<Select.Root size="3" value={operator} onValueChange={onOperatorChange}>
					<Select.Trigger placeholder="Operator" id="operator" />
					<Select.Content>
						{category?.type === "number" && (
							<>
								<Select.Item value="equals">Equals</Select.Item>
								<Select.Item value="greaterThanEqual">
									Greater than or equal to
								</Select.Item>
								<Select.Item value="greaterThan">Greater than</Select.Item>
							</>
						)}
						{category?.type === "string" && (
							<>
								<Select.Item value="contains">Contains</Select.Item>
								<Select.Item value="equals">Equals</Select.Item>
								<Select.Item value="excludes">Does not contain</Select.Item>
							</>
						)}
						{category?.type === "enum" && (
							<>
								<Select.Item value="equals">Equals</Select.Item>
								<Select.Item value="excludes">Does not equal</Select.Item>
							</>
						)}
					</Select.Content>
				</Select.Root>
			</Box>
			<Box width="100%">
				{category.type !== "enum" ? (
					<TextField.Root
						placeholder="Value"
						id="value"
						type={category.type === "number" ? "number" : "text"}
						size="3"
						onChange={(e) => {
							onValueChange(
								category.type === "number" && e.target.valueAsNumber > 0
									? e.target.valueAsNumber
									: e.target.value,
							);
						}}
						value={value}
					>
						<TextField.Slot />
					</TextField.Root>
				) : (
					<Select.Root
						size="3"
						value={value as string}
						onValueChange={(value) => onValueChange(value)}
					>
						<Select.Trigger placeholder="Value" id="value" />
						<Select.Content>
							{category.values?.map((value) => (
								<Select.Item key={value.id} value={value.id}>
									{value.name}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				)}
			</Box>
			{index > 0 && (
				<Box position="absolute" top="0" right="0">
					<IconButton
						size="1"
						type="button"
						variant="ghost"
						color="red"
						onClick={() => remover(index)}
					>
						<X width="14" height="14" />
					</IconButton>
				</Box>
			)}
		</Flex>
	);
};

export default NotificationQueryItem;
