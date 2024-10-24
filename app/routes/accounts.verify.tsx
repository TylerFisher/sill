import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { z } from "zod";
import type { ActionFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useSearchParams } from "@remix-run/react";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { checkHoneypot } from "~/utils/honeypot.server";
import { validateRequest } from "./accounts.verify.server";
import Layout from "~/components/nav/Layout";
import { Box, Button, Flex, Heading } from "@radix-ui/themes";
import { OTPField } from "~/components/forms/OTPField";
import ErrorList from "~/components/forms/ErrorList";

export const codeQueryParam = "code";
export const targetQueryParam = "target";
export const typeQueryParam = "type";
export const redirectToQueryParam = "redirectTo";
const types = ["onboarding", "reset-password", "change-email", "2fa"] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

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
	const checkEmail = (
		<>
			<h1 className="text-h1">Check your email</h1>
			<p className="mt-3 text-body-md text-muted-foreground">
				We've sent you a code to verify your email address.
			</p>
		</>
	);
	const headings: Record<VerificationTypes, React.ReactNode> = {
		onboarding: checkEmail,
		"reset-password": checkEmail,
		"change-email": checkEmail,
		"2fa": (
			<>
				<h1 className="text-h1">Check your 2FA app</h1>
				<p className="mt-3 text-body-md text-muted-foreground">
					Please enter your 2FA code to verify your identity.
				</p>
			</>
		),
	};
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

	return (
		<Layout>
			<Box mb="5">
				<Heading size="8">Sign up</Heading>
			</Box>

			<Form method="post" {...getFormProps(form)}>
				<HoneypotInputs />
				<ErrorList errors={form.errors} id={form.errorId} />
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

				<Button type="submit" size="3">
					Submit
				</Button>
			</Form>
		</Layout>
	);
};

export default Verify;
