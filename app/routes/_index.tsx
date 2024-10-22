import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
	redirect,
} from "@remix-run/node";
import {
	Box,
	Button,
	Card,
	Container,
	Flex,
	Heading,
	Text,
} from "@radix-ui/themes";
import Header from "~/components/Header";
import { Form } from "@remix-run/react";
import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import ErrorList from "~/components/ErrorList";
import TextInput from "~/components/TextInput";
import { parseWithZod } from "@conform-to/zod";
import { SignupSchema } from "./accounts.signup";
import { requireAnonymous } from "~/utils/auth.server";

export const meta: MetaFunction = () => [{ title: "Sill" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	await requireAnonymous(request);
	return json({});
};

const Index = () => {
	const [form, fields] = useForm({
		// Reuse the validation logic on the client
		onValidate({ formData }) {
			const result = parseWithZod(formData, { schema: SignupSchema });
			return result;
		},
		// Validate the form on blur event triggered
		shouldValidate: "onBlur",
		shouldRevalidate: "onInput",
	});
	return (
		<Container size="3">
			<Box mb="8">
				<Header headerClass="marketing-logo" />
				<Text
					as="p"
					size="8"
					align="center"
					style={{
						color: "var(--accent-11)",
					}}
				>
					Get news from the <strong>people you trust</strong>.
				</Text>
			</Box>

			<Flex gap="4" mb="8">
				<Box
					width={{
						initial: "100%",
						md: "66.6%",
					}}
				>
					<Heading
						as="h2"
						size="6"
						style={{
							fontStyle: "italic",
						}}
					>
						How Sill works
					</Heading>
					<Text as="p" size="5">
						Sill connects to your Bluesky and Mastodon accounts and collects the
						links shared by the people you follow. You can then filter out the
						noise and focus on the content that matters to you.
					</Text>
				</Box>
				<Box
					width={{
						initial: "100%",
						md: "33.3%",
					}}
				>
					<Text>Image here</Text>
				</Box>
			</Flex>

			<Flex gap="4" mb="8">
				<Box
					width={{
						initial: "100%",
						md: "33.3%",
					}}
				>
					<Text>Image here</Text>
				</Box>
				<Box
					width={{
						initial: "100%",
						md: "66.6%",
					}}
				>
					<Heading
						as="h2"
						size="6"
						style={{
							fontStyle: "italic",
						}}
					>
						Your news, your way
					</Heading>
					<Text as="p" size="5">
						Sill can send you a daily email with the most popular links shared
						by the people you follow. You can also use our powerful moderation
						features to filter out the content you don't want to see. Mute
						phrases, users, websites, and more.
					</Text>
				</Box>
			</Flex>

			<Card size="3">
				<Box
					style={{
						maxWidth: "688px",
						margin: "0 auto",
					}}
				>
					<Heading as="h2" mb="4">
						Get started
					</Heading>
					<Form method="post" {...getFormProps(form)} action="/accounts/signup">
						<HoneypotInputs />
						<ErrorList errors={form.errors} id={form.errorId} />
						<TextInput
							labelProps={{
								htmlFor: fields.email.name,
								children: "Email address",
							}}
							inputProps={{
								...getInputProps(fields.email, { type: "email" }),
								placeholder: "your@email.com",
							}}
							errors={fields.email.errors}
						/>
						<Button type="submit" size="3">
							Sign up
						</Button>
					</Form>
				</Box>
			</Card>
		</Container>
	);
};

export default Index;
