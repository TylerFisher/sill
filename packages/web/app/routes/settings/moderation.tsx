import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, IconButton, Separator } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { X } from "lucide-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import { db } from "~/drizzle/db.server";
import { mutePhrase } from "~/drizzle/schema.server";
import type { Route } from "./+types/moderation";
import { requireUserFromContext } from "~/utils/context.server";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Moderation Settings" },
];

export async function loader({ context }: Route.LoaderArgs) {
	const existingUser = await requireUserFromContext(context);
	const userId = existingUser.id;

	const phrases = await db.query.mutePhrase.findMany({
		where: eq(mutePhrase.userId, userId),
		columns: {
			phrase: true,
		},
	});

	return { phrases };
}

export default function ModerationSettings({
	loaderData,
}: Route.ComponentProps) {
	const { phrases } = loaderData;
	const fetcher = useFetcher({ key: "delete-mute" });

	const [addForm, addFields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: MutePhraseSchema });
		},
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
	});

	return (
		<Layout>
			<SettingsTabNav />
			<Box mb="6">
				<PageHeading
					title="Mute settings"
					dek="Mute phrases in order to keep any links, posts, or accounts with
							these phrases from appearing in your timeline. You can also mute domains or account handles."
				/>
			</Box>
			{phrases.length > 0 && (
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
				{phrases.map((phrase) => (
					<li key={phrase.phrase}>
						<fetcher.Form method="DELETE" action="/api/mute/delete">
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
			{phrases.length > 0 && <Separator size="4" my="6" />}
			<fetcher.Form
				method="POST"
				action="/api/mute/add"
				{...getFormProps(addForm)}
			>
				<ErrorList errors={addForm.errors} id={addForm.errorId} />
				<TextInput
					labelProps={{ children: "New mute phrase" }}
					inputProps={{
						...getInputProps(addFields.newPhrase, { type: "text" }),
					}}
					errors={addFields.newPhrase.errors}
				/>
				<SubmitButton label="Submit" size="2" />
			</fetcher.Form>
		</Layout>
	);
}
