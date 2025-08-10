import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, IconButton, Separator } from "@radix-ui/themes";
import { X } from "lucide-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import ErrorList from "~/components/forms/ErrorList";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import Layout from "~/components/nav/Layout";
import PageHeading from "~/components/nav/PageHeading";
import SettingsTabNav from "~/components/settings/SettingsTabNav";
import type { Route } from "./+types/moderation";
import { requireUserFromContext } from "~/utils/context.server";
import { apiGetMutePhrases } from "~/utils/api-client.server";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Moderation Settings" },
];

export async function loader({ context, request }: Route.LoaderArgs) {
	await requireUserFromContext(context);

	try {
		const { phrases } = await apiGetMutePhrases(request);
		return { phrases };
	} catch (error) {
		console.error("Failed to load mute phrases:", error);
		// Return empty array on error to maintain UI functionality
		return { phrases: [] };
	}
}

export default function ModerationSettings({
	loaderData,
}: Route.ComponentProps) {
	const { phrases } = loaderData;
	const deleteFetcher = useFetcher({ key: "delete-mute" });
	const addFetcher = useFetcher({ key: "add-mute" });

	const [addForm, addFields] = useForm({
		// @ts-ignore: This can only happen in the case of an error
		lastResult: addFetcher.data?.result,
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
						<deleteFetcher.Form method="DELETE" action="/api/mute/delete">
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
						</deleteFetcher.Form>
					</li>
				))}
			</ul>
			{phrases.length > 0 && <Separator size="4" my="6" />}
			<addFetcher.Form
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
			</addFetcher.Form>
		</Layout>
	);
}
