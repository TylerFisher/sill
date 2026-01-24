import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	Box,
	Callout,
	Card,
	Flex,
	Link as RLink,
	RadioGroup,
	Select,
	Slider,
	Text,
	TextField,
} from "@radix-ui/themes";
import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Form, Link, useFetcher } from "react-router";
import type { digestSettings } from "@sill/schema";
import { EmailSettingsSchema, type action } from "~/routes/email/add";
import CopyLink from "../linkPosts/CopyLink";
import ErrorCallout from "./ErrorCallout";
import SubmitButton from "./SubmitButton";

interface EmailSettingsFormProps {
	currentSettings: typeof digestSettings.$inferSelect | undefined;
	email: string | null;
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
			{currentSettings?.digestType === "email" && (
				<Card mb="6">
					<Text as="p" size="3" mb="4">
						Your Daily Digest will be delivered at{" "}
						{selectedHour &&
							(() => {
								// Convert UTC time from DB to local time
								const utcTime = new Date(
									`2000-01-01T${currentSettings.scheduledTime}Z`,
								);
								const localHour = utcTime.getHours();
								return hours[localHour];
							})()}{" "}
						to {email || "your email address"}.
					</Text>
					<RLink asChild size="3">
						<Link
							to={
								email
									? "/accounts/change-email"
									: "/accounts/add-email?redirectTo=/digest"
							}
						>
							{email ? "Change email address" : "Add email address"} →
						</Link>
					</RLink>
				</Card>
			)}
			{currentSettings?.digestType === "rss" && (
				<Card mb="6">
					<Text as="label" size="3" htmlFor="rssUrl" mr="2">
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
								layout="default" // not used on this page
							/>
						</TextField.Slot>
					</TextField.Root>
				</Card>
			)}
			<fetcher.Form method="POST" action="/email/add" {...getFormProps(form)}>
				<Box my="5">
					<Text as="label" size="3" htmlFor="time">
						<strong>Delivery time</strong>
					</Text>
					<br />
					<Select.Root
						{...getInputProps(fields.time, { type: "time" })}
						value={selectedHour}
						onValueChange={(value) => setSelectedHour(value)}
						size="3"
					>
						<Select.Trigger placeholder="Select a time" />
						<Select.Content position="popper">
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
					{fields.time.errors && <ErrorCallout error={fields.time.errors[0]} />}
				</Box>
				<Box
					my="5"
					maxWidth={{
						initial: "100%",
						xs: "50%",
					}}
				>
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
						mt="2"
					/>
				</Box>
				<Box my="5">
					<Text as="label" size="3" htmlFor="digestType">
						<strong>Daily Digest delivery format</strong>
					</Text>
					<RadioGroup.Root
						defaultValue={format}
						name="digestType"
						onValueChange={(value) => setFormat(value)}
						size="3"
					>
						<RadioGroup.Item value="email">Email</RadioGroup.Item>
						<RadioGroup.Item value="rss">RSS</RadioGroup.Item>
					</RadioGroup.Root>
					{fields.digestType.errors && (
						<ErrorCallout error={fields.digestType.errors[0]} />
					)}
					{format === "email" && !email && (
						<Callout.Root color="amber" mt="3">
							<Callout.Icon>
								<TriangleAlert size={16} />
							</Callout.Icon>
							<Callout.Text>
								You need to add an email address to receive email digests.{" "}
								<RLink asChild>
									<Link to="/accounts/add-email?redirectTo=/digest">
										Add your email address
									</Link>
								</RLink>
							</Callout.Text>
						</Callout.Root>
					)}
					<Box my="5">
						<Text as="label" size="3" htmlFor="digestType">
							<strong>Layout (email only)</strong>
						</Text>
						<RadioGroup.Root
							defaultValue={currentSettings?.layout || "default"}
							name="layout"
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
					</Box>
					<Box my="5">
						<Text size="3" weight="bold" mb="2" as="div">
							Reposts
						</Text>
						<RadioGroup.Root
							defaultValue={currentSettings?.hideReposts || "include"}
							name={fields.hideReposts.name}
							size="3"
						>
							<RadioGroup.Item value="include">Include</RadioGroup.Item>
							<RadioGroup.Item value="exclude">Exclude</RadioGroup.Item>
							<RadioGroup.Item value="only">Only reposts</RadioGroup.Item>
						</RadioGroup.Root>
						{fields.hideReposts.errors && (
							<ErrorCallout error={fields.hideReposts.errors[0]} />
						)}
					</Box>
					{fetcher.data?.result?.status === "success" && (
						<Box my="5">
							<Text as="p">
								<strong>Your Daily Digest settings have been saved.</strong>
							</Text>
						</Box>
					)}
					<Flex gap="2" mt="4">
						<SubmitButton
							label="Save"
							size="3"
							disabled={format === "email" && !email}
						/>
					</Flex>
				</Box>
			</fetcher.Form>
			{currentSettings && (
				<Box>
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
