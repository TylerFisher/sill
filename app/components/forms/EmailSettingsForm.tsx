import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	Text,
	Select,
	Box,
	Callout,
	Slider,
	Flex,
	RadioGroup,
	TextField,
	Badge,
	Button,
	Separator,
} from "@radix-ui/themes";
import { useFetcher, Form, Link } from "react-router";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import type { digestSettings } from "~/drizzle/schema.server";
import { type action, EmailSettingsSchema } from "~/routes/email/add";
import SubmitButton from "./SubmitButton";
import CheckboxField from "./CheckboxField";
import CopyLink from "../linkPosts/CopyLink";
import ErrorCallout from "./ErrorCallout";

interface EmailSettingsFormProps {
	currentSettings: typeof digestSettings.$inferSelect | undefined;
	email: string;
}

const EmailSettingForm = ({
	currentSettings,
	email,
}: EmailSettingsFormProps) => {
	const [selectedHour, setSelectedHour] = useState<string | undefined>(
		currentSettings?.scheduledTime.substring(0, 5),
	);
	const [topAmountValue, setTopAmountValue] = useState<number[]>([
		currentSettings?.topAmount || 10,
	]);

	const [format, setFormat] = useState<string | undefined>(
		currentSettings?.digestType || "email",
	);

	const fetcher = useFetcher<typeof action>();
	const [form, fields] = useForm({
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EmailSettingsSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onSubmit",
	});

	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		timeZoneName: "short",
	});

	const dateParts = dateFormatter.formatToParts(new Date());
	const timeZone = dateParts.find(
		(part) => part.type === "timeZoneName",
	)?.value;

	const hours = Array.from({ length: 24 }, (_, i) => {
		const hour = i % 12 || 12;
		const period = i < 12 ? "a.m." : "p.m.";
		return `${hour.toString().padStart(2, "0")}:00 ${period} ${timeZone}`;
	});

	return (
		<Box>
			<Callout.Root mb="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text size="2">
					Daily Digests are free during Sill's beta period. This will be part of
					Sill's paid plan in the future.
				</Callout.Text>
			</Callout.Root>
			{currentSettings?.digestType === "email" && (
				<Box mb="4">
					<Text as="p" size="3" mb="4">
						Your Daily Digest is currently set to be delivered at{" "}
						<Badge size="3">
							{selectedHour &&
								hours[
									new Date(
										`2000-01-01T${currentSettings.scheduledTime}Z`,
									).getHours()
								]}
						</Badge>
						, to <Badge size="3">{email}</Badge>.
					</Text>
					<Link to="/accounts/change-email">
						<Button size="3">Change your email</Button>
					</Link>
				</Box>
			)}
			{currentSettings?.digestType === "rss" && (
				<Box mb="6">
					<Text as="label" size="2" htmlFor="rssUrl" mr="2">
						RSS URL:
					</Text>
					<TextField.Root
						type="url"
						name="rssUrl"
						id="rssUrl"
						value={`https://sill.social/digest/${currentSettings?.userId}.rss`}
						readOnly
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
								url={`https://sill.social/digest/${currentSettings?.userId}.rss`}
								textPositioning={{
									position: "absolute",
									top: "-28px",
									left: "-.9em",
								}}
							/>
						</TextField.Slot>
					</TextField.Root>
				</Box>
			)}
			<Separator size="4" my="6" />
			<fetcher.Form method="POST" action="/email/add" {...getFormProps(form)}>
				<Box mb="3">
					<Text as="label" size="3" htmlFor="digestType">
						<strong>Daily Digest delivery format</strong>
					</Text>
					<RadioGroup.Root
						defaultValue={format}
						name="digestType"
						mb="6"
						onValueChange={(value) => setFormat(value)}
						size="3"
					>
						<RadioGroup.Item value="email">Email</RadioGroup.Item>
						<RadioGroup.Item value="rss">RSS</RadioGroup.Item>
					</RadioGroup.Root>
					{fields.digestType.errors && (
						<ErrorCallout error={fields.digestType.errors[0]} />
					)}
					<Box mb="6">
						<Text as="label" size="3" htmlFor="digestType">
							<strong>Layout</strong>
						</Text>
						<RadioGroup.Root
							defaultValue={currentSettings?.layout || "default"}
							name="layout"
							mb="6"
							disabled={format === "rss"}
							size="3"
						>
							<RadioGroup.Item value="default">
								Default (with images, comfortable spacing)
							</RadioGroup.Item>
							<RadioGroup.Item value="dense">
								Dense (no images, tighter spacing)
							</RadioGroup.Item>
						</RadioGroup.Root>
						{fields.layout.errors && (
							<ErrorCallout error={fields.layout.errors[0]} />
						)}
						{format === "rss" && (
							<Callout.Root mb="4">
								<Callout.Icon>
									<CircleAlert width="18" height="18" />
								</Callout.Icon>
								<Callout.Text size="2">
									Layout configuration is only available for email digests.
								</Callout.Text>
							</Callout.Root>
						)}
					</Box>

					<Box my="6">
						<Text as="label" size="3" htmlFor="time">
							<strong>Time to deliver Daily Digest</strong>
						</Text>
						<br />
						<Select.Root
							{...getInputProps(fields.time, { type: "time" })}
							value={selectedHour}
							onValueChange={(value) => setSelectedHour(value)}
							size="3"
						>
							<Select.Trigger placeholder="Select a time" />
							<Select.Content>
								{hours.map((hour, index) => {
									const localDate = new Date();
									localDate.setHours(index, 0, 0, 0);
									const utcHour = localDate.toISOString().substring(11, 16);
									return (
										<Select.Item key={hour} value={utcHour}>
											{hour}
										</Select.Item>
									);
								})}
							</Select.Content>
						</Select.Root>
						{fields.time.errors && (
							<ErrorCallout error={fields.time.errors[0]} />
						)}
					</Box>
					<Box my="6">
						<CheckboxField
							inputProps={{
								name: fields.hideReposts.name,
								id: fields.hideReposts.id,
								defaultChecked: currentSettings?.hideReposts,
								size: 3,
							}}
							labelProps={{
								children: "Exclude reposts from top links calculation",
								htmlFor: fields.hideReposts.id,
								size: "3",
							}}
							errors={fields.hideReposts.errors}
						/>
					</Box>
					<Box mt="6" mb="2">
						<Text as="label" size="3" htmlFor="topAmount">
							<strong>{topAmountValue}</strong> links per Daily Digest
						</Text>
						<Slider
							min={1}
							max={20}
							name="topAmount"
							value={topAmountValue}
							onValueChange={(value) => setTopAmountValue(value)}
							size="3"
						/>
					</Box>
					{fetcher.data?.result?.status === "success" && (
						<Box my="4">
							<Text as="p">
								<strong>Your Daily Digest settings have been saved.</strong>
							</Text>
						</Box>
					)}
					<Flex gap="2" mt="4">
						<SubmitButton label="Save" size="3" />
					</Flex>
				</Box>
			</fetcher.Form>
			{currentSettings && (
				<Box mt="2">
					<Form
						method="DELETE"
						action="/email/delete"
						onSubmit={() => setSelectedHour(undefined)}
					>
						<SubmitButton color="red" label="Turn off daily digest" size="3" />
					</Form>
				</Box>
			)}
		</Box>
	);
};

export default EmailSettingForm;
