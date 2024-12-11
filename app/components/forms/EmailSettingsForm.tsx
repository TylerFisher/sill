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
import { useFetcher, Form, Link } from "@remix-run/react";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import type { digestSettings } from "~/drizzle/schema.server";
import { type action, EmailSettingsSchema } from "~/routes/email.add";
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
			{fetcher.data?.result?.status === "success" && (
				<Box mb="4">
					<Text as="p">
						<strong>Your Daily Digest settings have been saved.</strong>
					</Text>
				</Box>
			)}
			{currentSettings?.digestType === "email" && (
				<Box mb="4">
					<Text as="p" size="2" mb="4">
						Your Daily Digest is currently set to be delivered at{" "}
						<Badge>
							{selectedHour &&
								hours[
									new Date(
										`2000-01-01T${currentSettings.scheduledTime}Z`,
									).getHours()
								]}
						</Badge>
						, to <Badge>{email}</Badge>.
					</Text>
					<Link to="/accounts/change-email">
						<Button size="1">Change your email</Button>
					</Link>
				</Box>
			)}
			{currentSettings?.digestType === "rss" && (
				<Box mb="4">
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
			<Separator size="4" my="4" />
			<fetcher.Form method="POST" action="/email/add" {...getFormProps(form)}>
				<Box>
					<Text as="label" size="2" htmlFor="digestType">
						<strong>Daily Digest delivery format</strong>
					</Text>
					<RadioGroup.Root
						defaultValue={format}
						name="digestType"
						mb="4"
						onValueChange={(value) => setFormat(value)}
					>
						<RadioGroup.Item value="email">Email</RadioGroup.Item>
						<RadioGroup.Item value="rss">RSS</RadioGroup.Item>
					</RadioGroup.Root>
					{fields.digestType.errors && (
						<ErrorCallout error={fields.digestType.errors[0]} />
					)}
					<Box mb="4">
						<Text as="label" size="2" htmlFor="digestType">
							<strong>Layout</strong>
						</Text>
						<RadioGroup.Root
							defaultValue={currentSettings?.layout || "default"}
							name="layout"
							mb="4"
							disabled={format === "rss"}
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

					<Box my="4">
						<Text as="label" size="2" htmlFor="time">
							<strong>Time to deliver Daily Digest</strong>
						</Text>
						<br />
						<Select.Root
							{...getInputProps(fields.time, { type: "time" })}
							value={selectedHour}
							onValueChange={(value) => setSelectedHour(value)}
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
					<Box my="4">
						<CheckboxField
							inputProps={{
								name: fields.hideReposts.name,
								id: fields.hideReposts.id,
								defaultChecked: currentSettings?.hideReposts,
							}}
							labelProps={{
								children: "Hide reposts from top links calculation",
								htmlFor: fields.hideReposts.id,
							}}
							errors={fields.hideReposts.errors}
						/>
					</Box>
					<Box my="4">
						<Text as="label" size="2" htmlFor="topAmount">
							<strong>{topAmountValue}</strong> links per Daily Digest
						</Text>
						<Slider
							min={1}
							max={20}
							name="topAmount"
							value={topAmountValue}
							onValueChange={(value) => setTopAmountValue(value)}
						/>
					</Box>

					<Flex gap="2" mt="4">
						<SubmitButton label="Save" size="2" />
					</Flex>
				</Box>
			</fetcher.Form>
			{currentSettings && (
				<Box mt="4">
					<Form
						method="DELETE"
						action="/email/delete"
						onSubmit={() => setSelectedHour(undefined)}
					>
						<SubmitButton color="red" label="Turn off daily digest" size="2" />
					</Form>
				</Box>
			)}
		</Box>
	);
};

export default EmailSettingForm;
