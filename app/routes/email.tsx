import { Box, Heading, Callout, Select, Button } from "@radix-ui/themes";
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@vercel/remix";
import { db } from "~/drizzle/db.server";
import Layout from "~/components/nav/Layout";
import { requireUserId } from "~/utils/auth.server";
import { eq } from "drizzle-orm";
import { emailSettings } from "~/drizzle/schema.server";
import { Form, useLoaderData, useActionData } from "@remix-run/react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { z } from "zod";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { uuidv7 } from "uuidv7-js";

const EmailSettingsSchema = z.object({
	time: z.string(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const currentSettings = await db.query.emailSettings.findFirst({
		where: eq(emailSettings?.userId, userId),
	});

	return json({ currentSettings });
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: EmailSettingsSchema,
		async: true,
	});

	if (submission.status !== "success") {
		return json(
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

	return json({
		result: submission.reply(),
	});
};

const EmailSettings = () => {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

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
		<Layout>
			<Box mb="6">
				<Heading as="h2" size="6" mb="4">
					Daily email settings
				</Heading>
				<Callout.Root size="3" variant="outline">
					<Callout.Icon>
						<InfoCircledIcon />
					</Callout.Icon>
					<Callout.Text>
						Sill can send you a daily email with the top links from the past 24
						hours. Here, you can schedule the hour you'd like to receive the
						email each day.
					</Callout.Text>
				</Callout.Root>
			</Box>
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
				</Box>
				<br />
				<Button type="submit">Save</Button>
			</Form>
		</Layout>
	);
};

export default EmailSettings;
