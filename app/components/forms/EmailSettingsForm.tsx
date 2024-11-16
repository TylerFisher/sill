import { useForm, getFormProps, getInputProps } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	Card,
	Heading,
	Text,
	Button,
	Select,
	Box,
	Callout,
} from "@radix-ui/themes";
import { useFetcher, Form } from "@remix-run/react";
import { CircleAlert } from "lucide-react";
import { useState } from "react";
import type { emailSettings } from "~/drizzle/schema.server";
import { type action, EmailSettingsSchema } from "~/routes/email.add";

interface EmailSettingsFormProps {
	currentSettings: typeof emailSettings.$inferSelect | undefined;
}

const EmailSettingForm = ({ currentSettings }: EmailSettingsFormProps) => {
	const [selectedHour, setSelectedHour] = useState<string | undefined>(
		currentSettings?.scheduledTime.substring(0, 5),
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
		<Card mb="6">
			<Heading as="h3" size="5" mb="1">
				Email
			</Heading>
			<Text size="2" as="p" mb="3">
				Sill can send you a daily email with the top links from the past 24
				hours. Here, you can schedule the hour you'd like to receive the email
				each day.
			</Text>
			<fetcher.Form method="POST" action="/email/add" {...getFormProps(form)}>
				{fetcher.data?.result?.status === "success" && (
					<Box mb="4">
						<Text as="p">Your email settings have been saved.</Text>
					</Box>
				)}
				<Box>
					<label htmlFor="time">Time</label>
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
					<Button type="submit" ml="4">
						Save
					</Button>
				</Box>
			</fetcher.Form>
			{selectedHour && (
				<Box mt="4">
					<Form
						method="DELETE"
						action="/email/delete"
						onSubmit={() => setSelectedHour(undefined)}
					>
						<Button type="submit" color="red">
							Turn off daily email
						</Button>
					</Form>
				</Box>
			)}
			<Callout.Root mt="4">
				<Callout.Icon>
					<CircleAlert width="18" height="18" />
				</Callout.Icon>
				<Callout.Text>
					<Text size="2" as="p">
						<strong>Note:</strong> During the Sill beta, emails are free. In the
						future, we may charge for this feature.
					</Text>
				</Callout.Text>
			</Callout.Root>
		</Card>
	);
};

export default EmailSettingForm;
