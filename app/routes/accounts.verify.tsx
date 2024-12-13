import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import type { ActionFunctionArgs, MetaFunction } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import { OTPField } from "~/components/forms/OTPField";
import SubmitButton from "~/components/forms/SubmitButton";
import Layout from "~/components/nav/Layout";
import { checkHoneypot } from "~/utils/honeypot.server";
import { validateRequest } from "~/utils/verify.server";

export const codeQueryParam = "code";
export const targetQueryParam = "target";
export const typeQueryParam = "type";
export const redirectToQueryParam = "redirectTo";
const types = ["onboarding", "reset-password", "change-email", "2fa"] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export const meta: MetaFunction = () => [{ title: "Sill | Verify your email" }];

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
	const formData = await request.formData();
	checkHoneypot(formData);
	return validateRequest(request, formData);
};

const Verify = () => {
	const [searchParams] = useSearchParams();
	const actionData = useActionData<typeof action>();
	const parseWithZodType = VerificationTypeSchema.safeParse(
		searchParams.get(typeQueryParam),
	);
	const type = parseWithZodType.success ? parseWithZodType.data : null;
	const [form, fields] = useForm({
		id: "verify-form",
		constraint: getZodConstraint(VerifySchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifySchema });
		},
		defaultValue: {
			code: searchParams.get(codeQueryParam),
			type: type,
			target: searchParams.get(targetQueryParam),
			redirectTo: searchParams.get(redirectToQueryParam),
		},
	});

	const error = actionData?.result.error?.code;

	return (
		<Layout hideNav>
			<Box mb="5">
				<Heading size="8">Check your email</Heading>
				<Text as="p">
					We sent an email to {fields[targetQueryParam].value} to verify you own
					that email. Please enter the code below.
				</Text>
			</Box>

			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				{/* <ErrorList errors={error} id={form.errorId} /> */}
				<Box mb="5">
					<Flex mb="1">
						<OTPField
							labelProps={{
								htmlFor: fields[codeQueryParam].id,
								children: "Code",
							}}
							inputProps={{
								...getInputProps(fields[codeQueryParam], { type: "text" }),
							}}
							errors={fields[codeQueryParam].errors}
						/>
					</Flex>
				</Box>
				<input {...getInputProps(fields[typeQueryParam], { type: "hidden" })} />
				<input
					{...getInputProps(fields[targetQueryParam], { type: "hidden" })}
				/>
				<input
					{...getInputProps(fields[redirectToQueryParam], {
						type: "hidden",
					})}
				/>

				<SubmitButton label="Submit" />
			</Form>

			{error && (
				<>
					<Text size="3" style={{ color: "red" }} as="p">
						{error}
					</Text>
					<Form action="/accounts/signup" method="POST">
						<input
							type="hidden"
							name="email"
							value={fields[targetQueryParam].value}
						/>
						<SubmitButton variant="outline" label="Resend code" />
					</Form>
				</>
			)}
		</Layout>
	);
};

export default Verify;
