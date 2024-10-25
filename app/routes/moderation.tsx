import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "@vercel/remix";
import {
	Form,
	useActionData,
	useLoaderData,
	useFetcher,
} from "@remix-run/react";
import { z } from "zod";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import {
	Box,
	Button,
	Flex,
	Heading,
	IconButton,
	Separator,
	Callout,
} from "@radix-ui/themes";
import TextInput from "~/components/forms/TextInput";
import { uuidv7 } from "uuidv7-js";
import { Cross2Icon, InfoCircledIcon } from "@radix-ui/react-icons";
import ErrorList from "~/components/forms/ErrorList";
import { eq } from "drizzle-orm";
import { mutePhrase } from "~/drizzle/schema.server";
import Layout from "~/components/nav/Layout";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const phrases = await db.query.mutePhrase.findMany({
		where: eq(mutePhrase.userId, userId),
		columns: {
			phrase: true,
		},
	});

	return json({
		phrases,
		newPhrase: "",
	});
};

export const action = async ({ request }: ActionFunctionArgs) => {
	const userId = await requireUserId(request);
	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: MutePhraseSchema.superRefine(async (data, ctx) => {
			const existingPhrases = await db.query.mutePhrase.findMany({
				where: eq(mutePhrase.userId, userId),
				columns: {
					phrase: true,
				},
			});
			const phrases = existingPhrases.map((p) => p.phrase.toLowerCase());
			if (phrases.includes(data.newPhrase.toLowerCase())) {
				ctx.addIssue({
					path: ["newPhrase"],
					code: z.ZodIssueCode.custom,
					message: "You've already added this phrase to your mute list",
				});
			}
		}),
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

	await db.insert(mutePhrase).values({
		id: uuidv7(),
		phrase: submission.value.newPhrase,
		userId,
	});

	return json({
		result: submission.reply(),
	});
};

const MutePhraseSettings = () => {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const fetcher = useFetcher({ key: "delete-mute" });

	const [addForm, addFields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: MutePhraseSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
	});

	return (
		<Layout>
			<Box mb="6">
				<Heading as="h2" size="6" mb="4">
					Moderation
				</Heading>
				<Callout.Root size="3" variant="outline">
					<Callout.Icon>
						<InfoCircledIcon />
					</Callout.Icon>
					<Callout.Text>
						Mute phrases in order to keep any links, posts, or accounts with
						these phrases from appearing in your timeline.
					</Callout.Text>
				</Callout.Root>
			</Box>

			{data.phrases.length > 0 && (
				<Box mb="2">
					<Heading as="h3" size="4">
						Muted phrases
					</Heading>
				</Box>
			)}
			<ul
				style={{
					listStyle: "none",
					padding: 0,
				}}
			>
				{data.phrases.map((phrase) => (
					<li key={phrase.phrase}>
						<fetcher.Form method="DELETE" action="/moderation/mute/delete">
							<Flex my="4" align="center">
								<input
									name="phrase"
									readOnly={true}
									aria-readonly={true}
									value={phrase.phrase}
									style={{
										border: "none",
										padding: "0",
										background: "none",
										width: "100%",
									}}
								/>
								<IconButton size="1" variant="soft">
									<Cross2Icon />
								</IconButton>
							</Flex>
						</fetcher.Form>
					</li>
				))}
			</ul>
			<Separator size="4" my="6" />
			<Form method="POST" {...getFormProps(addForm)}>
				<ErrorList errors={addForm.errors} id={addForm.errorId} />
				<TextInput
					labelProps={{ children: "New mute phrase" }}
					inputProps={{
						...getInputProps(addFields.newPhrase, { type: "text" }),
					}}
					errors={addFields.newPhrase.errors}
				/>
				<Button type="submit">Submit</Button>
			</Form>
		</Layout>
	);
};

export default MutePhraseSettings;
