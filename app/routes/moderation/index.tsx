import type { Route } from "./+types/index";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, IconButton, Link, Separator, Text } from "@radix-ui/themes";
import { data, Form, useFetcher } from "react-router";
import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import { uuidv7 } from "uuidv7-js";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import { db } from "~/drizzle/db.server";
import { mutePhrase, user } from "~/drizzle/schema.server";
import { requireUserId } from "~/utils/auth.server";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Moderate Your Links" },
];

export const loader = async ({ request }: Route.LoaderArgs) => {
	const userId = await requireUserId(request);
	const dbUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			blueskyAccounts: {
				columns: {
					mutes: true,
				},
			},
			mastodonAccounts: {
				columns: {
					mutes: true,
				},
				with: {
					mastodonInstance: true,
				},
			},
		}
	});

	const phrases = await db.query.mutePhrase.findMany({
		where: eq(mutePhrase.userId, userId),
		columns: {
			phrase: true,
		},
	});

	return {
		phrases,
		blueskyMutes: dbUser?.blueskyAccounts[0]?.mutes,
		mastodonMutes: dbUser?.mastodonAccounts[0]?.mutes,
		instance: dbUser?.mastodonAccounts[0]?.mastodonInstance.instance,
		newPhrase: "",
	};
};

export const action = async ({ request }: Route.ActionArgs) => {
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
		return data(
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

	return data({
		result: submission.reply(),
	});
};

const MutePhraseSettings = ({
	loaderData,
	actionData,
}: Route.ComponentProps) => {
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
			<PageHeading
				title="Mute settings"
				dek="Mute phrases in order to keep any links, posts, or accounts with
						these phrases from appearing in your timeline. You can also mute domains or account handles."
			/>
			{loaderData.phrases.length > 0 && (
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
				{loaderData.phrases.map((phrase) => (
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
								<IconButton size="1" variant="soft" aria-label="Delete phrase">
									<X width="12" height="12" />
								</IconButton>
							</Flex>
						</fetcher.Form>
					</li>
				))}
			</ul>
			{loaderData.phrases.length > 0 && <Separator size="4" my="6" />}
			{loaderData.blueskyMutes && loaderData.blueskyMutes.words.length > 0 && (
				<Box>
					<Heading as="h3" size="4">Muted phrases from Bluesky</Heading>
					<Text as="p" size="2" color="gray" mb="2">Manage your Bluesky mute phrases <Link href={`https://bsky.app/moderation`}>here</Link>.</Text>

					<ul
						style={{
							listStyle: "none",
							padding: 0,
						}}
					>
						{loaderData.blueskyMutes?.words.map((word) => (
							<li key={word}>{word}</li>
						))}
					</ul>
					<Separator size="4" my="6" />
				</Box>
			)}

			{loaderData.mastodonMutes && loaderData.mastodonMutes.words.length > 0 && (
				<Box>
					<Heading as="h3" size="4">Muted phrases from Mastodon</Heading>
					<Text as="p" size="2" color="gray" mb="2">Manage your Mastodon mute phrases <Link href={`https://${loaderData.instance}/filters`}>here</Link>.</Text>
					<ul
						style={{
							listStyle: "none",
							padding: 0,
						}}
					>
						{loaderData.mastodonMutes?.words.map((word) => (
							<li key={word}>{word}</li>
						))}
					</ul>
					<Separator size="4" my="6" />
				</Box>
			)}
			<Form method="POST" {...getFormProps(addForm)}>
				<ErrorList errors={addForm.errors} id={addForm.errorId} />
				<TextInput
					labelProps={{ children: "New mute phrase" }}
					inputProps={{
						...getInputProps(addFields.newPhrase, { type: "text" }),
					}}
					errors={addFields.newPhrase.errors}
				/>
				<SubmitButton label="Submit" size="2" />
			</Form>
		</Layout>
	);
};

export default MutePhraseSettings;
