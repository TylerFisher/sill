import { Box, Select, Button } from "@radix-ui/themes";
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	data,
} from "@vercel/remix";
import { db } from "~/drizzle/db.server";
import Layout from "~/components/nav/Layout";
import { requireUserId } from "~/utils/auth.server";
import { eq } from "drizzle-orm";
import { emailSettings } from "~/drizzle/schema.server";
import { Form, useActionData, useSearchParams, Link } from "@remix-run/react";
import { z } from "zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { uuidv7 } from "uuidv7-js";
import PageHeading from "~/components/nav/PageHeading";

const EmailSettingsSchema = z.object({
	time: z.string(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const currentSettings = await db.query.emailSettings.findFirst({
		where: eq(emailSettings?.userId, userId),
	});

	return currentSettings || {};
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: EmailSettingsSchema,
		async: true,
	});

	if (submission.status !== "success") {
		return data(
			{
				result: submission.reply(),
			},
			{
				status: submission.status === "error" ? 400 : 200,
			},
		);
	}

	await db
		.insert(emailSettings)
		.values({
			id: uuidv7(),
			userId,
			scheduledTime: submission.value.time,
		})
		.onConflictDoUpdate({
			target: [emailSettings.userId],
			set: {
				scheduledTime: submission.value.time,
			},
		});

	return {
		result: submission.reply(),
	};
};

const EmailSettings = () => {
	const actionData = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const onboarding = searchParams.get("onboarding");

	const [form, fields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EmailSettingsSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onSubmit",
	});

	const hours = Array.from({ length: 24 }, (_, i) => {
		const hour = i % 12 || 12;
		const period = i < 12 ? "a.m." : "p.m.";
		return `${hour.toString().padStart(2, "0")}:00 ${period}`;
	});

	return (
		<Layout hideNav={!!onboarding}>
			<PageHeading
				title="Email Settings"
				dek="Sill can send you a daily email with the top links from the past 24
						hours. Here, you can schedule the hour you'd like to receive the
						email each day."
			/>
			<Form method="POST" {...getFormProps(form)}>
				<Box>
					<label htmlFor="time">Time</label>
					<br />
					<Select.Root {...getInputProps(fields.time, { type: "time" })}>
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
			</Form>
			{onboarding && (
				<Box mt="8">
					<Link to="/links">
						<Button>See your top links</Button>
					</Link>
				</Box>
			)}
		</Layout>
	);
};

export default EmailSettings;
