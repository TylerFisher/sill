import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from "@remix-run/node";
import {
	Form,
	useActionData,
	useLoaderData,
	useFetcher,
} from "@remix-run/react";
import { z } from "zod";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { Box, Button, Flex, IconButton, Text } from "@radix-ui/themes";
import TextInput from "~/components/TextInput";
import { uuidv7 } from "uuidv7-js";
import { Cross2Icon } from "@radix-ui/react-icons";
import ErrorList from "~/components/ErrorList";

const MutePhraseSchema = z.object({
	newPhrase: z.string().trim(),
});

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const phrases = await prisma.mutePhrase.findMany({
		where: {
			userId,
		},
		select: {
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
			const existingPhrases = await prisma.mutePhrase.findMany({
				where: {
					userId,
				},
				select: {
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

	await prisma.mutePhrase.create({
		data: {
			id: uuidv7(),
			phrase: submission.value.newPhrase,
			userId,
		},
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
		<Box>
			<ul
				style={{
					listStyle: "none",
					padding: 0,
				}}
			>
				{data.phrases.map((phrase) => (
					<li key={phrase.phrase}>
						<fetcher.Form method="DELETE" action="/settings/mute/delete">
							<Flex my="4" align="center">
								<input
									name="phrase"
									readOnly={true}
									aria-readonly={true}
									value={phrase.phrase}
								/>
								<IconButton size="1" variant="soft">
									<Cross2Icon />
								</IconButton>
							</Flex>
						</fetcher.Form>
					</li>
				))}
			</ul>
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
		</Box>
	);
};

export default MutePhraseSettings;
