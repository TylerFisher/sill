import { Box, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";

interface NotificationCategory {
	id: string;
	name: string;
	type: string;
}

const notificationCategories = [
	{
		id: "domain",
		name: "Link domain",
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
		id: "text",
		name: "Post text",
		type: "string",
	},
	{
		id: "repost",
		name: "Repost author",
		type: "string",
	},
];

const NotificationQueryItem = ({ index }: { index: number }) => {
	const [category, setCategory] = useState<NotificationCategory | undefined>(
		undefined,
	);

	return (
		<Flex
			direction="row"
			gap="2"
			mt={index > 0 ? "4" : "0"}
			wrap="wrap"
			align="center"
		>
			<Box>
				<Select.Root
					value={category?.id}
					onValueChange={(value) =>
						setCategory(notificationCategories.find((c) => c.id === value))
					}
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
				<Select.Root size="3">
					<Select.Trigger placeholder="Operator" id="operator" />
					<Select.Content>
						{category?.type === "number" ? (
							<>
								<Select.Item value="equals">Equals</Select.Item>
								<Select.Item value="greaterThanEqual">
									Greater than or equal to
								</Select.Item>
								<Select.Item value="greaterThan">Greater than</Select.Item>
							</>
						) : (
							<>
								<Select.Item value="contains">Contains</Select.Item>
								<Select.Item value="equals">Equals</Select.Item>
								<Select.Item value="notEquals">Does not equal</Select.Item>
							</>
						)}
					</Select.Content>
				</Select.Root>
			</Box>
			<Box width="100%">
				<TextField.Root
					placeholder="Value"
					id="value"
					type={category?.type === "number" ? "number" : "text"}
					size="3"
				>
					<TextField.Slot />
				</TextField.Root>
			</Box>
		</Flex>
	);
};

export default NotificationQueryItem;
