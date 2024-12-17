import {
	Box,
	Button,
	Card,
	Flex,
	RadioGroup,
	Separator,
	Text,
} from "@radix-ui/themes";
import TextInput from "./TextInput";
import ErrorCallout from "./ErrorCallout";
import { useState } from "react";
import { useFetcher } from "react-router";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { NotificationSchema } from "~/routes/notifications/add";
import NotificationQueryItem from "./NotificationQueryItem";
import { Plus } from "lucide-react";
import SubmitButton from "./SubmitButton";

const NotificationGroup = ({ index }: { index: number }) => {
	const [format, setFormat] = useState<string | undefined>("email");
	const [queryItems, setQueryItems] = useState([{}]);
	const fetcher = useFetcher();
	const [form, fields] = useForm({
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: NotificationSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onSubmit",
	});

	return (
		<fetcher.Form
			method="POST"
			preventScrollReset
			action="/notifications/add"
			{...getFormProps(form)}
		>
			<Card mt={index > 0 ? "4" : "0"}>
				{fetcher.data?.result?.status === "success" && (
					<Box mb="4">
						<Text as="p">
							<strong>Your notification settings have been saved.</strong>
						</Text>
					</Box>
				)}
				<TextInput
					labelProps={{ children: "Name" }}
					inputProps={{ ...getInputProps(fields.name, { type: "text" }) }}
					errors={fields.name.errors}
				/>
				<Text as="label" size="3" htmlFor="format">
					<strong>Delivery format</strong>
				</Text>
				<RadioGroup.Root
					defaultValue={format}
					name="format"
					mb="4"
					onValueChange={(value) => setFormat(value)}
					size="3"
				>
					<RadioGroup.Item value="email">Email</RadioGroup.Item>
					<RadioGroup.Item value="rss">RSS</RadioGroup.Item>
				</RadioGroup.Root>
				{fields.format.errors && (
					<ErrorCallout error={fields.format.errors[0]} />
				)}
				<Box my="4">
					<Text as="label" size="3">
						<strong>Filters</strong>
					</Text>
					<Card>
						{queryItems.map((_, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: Nothing else to use
							<Box key={index}>
								<NotificationQueryItem index={index} />
								<Separator size="4" my="4" />
							</Box>
						))}
						<Box mt="4">
							<Button
								type="button"
								onClick={() => setQueryItems([...queryItems, {}])}
								variant="soft"
							>
								<Plus width="18" height="18" />
								Add filter
							</Button>
						</Box>
					</Card>
				</Box>
				<Flex direction="row" gap="2">
					<SubmitButton label="Save notification" />
					<Button type="button" color="red">
						Delete notification
					</Button>
				</Flex>
			</Card>
		</fetcher.Form>
	);
};

export default NotificationGroup;
