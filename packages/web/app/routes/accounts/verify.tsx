import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Flex, Heading, Text } from "@radix-ui/themes";
import { Form, useSearchParams, data, redirect } from "react-router";
import { HoneypotInputs } from "remix-utils/honeypot/react";
import { z } from "zod";
import { OTPField } from "~/components/forms/OTPField";
import SubmitButton from "~/components/forms/SubmitButton";
import Layout from "~/components/nav/Layout";
import { apiVerify } from "~/utils/api.server";
import { checkHoneypot } from "~/utils/honeypot.server";
import { verifySessionStorage } from "~/utils/verification.server";
import { onboardingEmailSessionKey } from "./onboarding";
import type { Route } from "./+types/verify";

export const codeQueryParam = "code";
export const targetQueryParam = "target";
export const typeQueryParam = "type";
export const redirectToQueryParam = "redirectTo";
const types = ["onboarding", "reset-password", "change-email", "2fa"] as const;
const VerificationTypeSchema = z.enum(types);
export type VerificationTypes = z.infer<typeof VerificationTypeSchema>;

export const meta: Route.MetaFunction = () => [
	{ title: "Sill | Verify your email" },
];

export const VerifySchema = z.object({
	[codeQueryParam]: z.string().min(6).max(6),
	[typeQueryParam]: VerificationTypeSchema,
	[targetQueryParam]: z.string(),
	[redirectToQueryParam]: z.string().optional(),
});

export const action = async ({ request }: Route.ActionArgs) => {
	const formData = await request.formData();
	checkHoneypot(formData);
	
	const submission = await parseWithZod(formData, {
		schema: VerifySchema.transform(async (data, ctx) => {
			try {
				const apiResponse = await apiVerify(request, data);
				return { ...data, apiResponse };
			} catch (error) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: error instanceof Error ? error.message : "Verification failed",
					path: error instanceof Error && error.message.includes('code') ? ['code'] : [],
				});
				return z.NEVER;
			}
		}),
		async: true,
	});

	if (submission.status !== "success" || !submission.value.apiResponse) {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	const { apiResponse, type, target } = submission.value;
	const { redirectTo } = apiResponse;

	// For onboarding verification, set the email in verification session
	if (type === 'onboarding') {
		const verifySession = await verifySessionStorage.getSession(
			request.headers.get("cookie")
		);
		verifySession.set(onboardingEmailSessionKey, target);
		
		const headers = new Headers();
		headers.append(
			"set-cookie",
			await verifySessionStorage.commitSession(verifySession)
		);
		
		return redirect(redirectTo, { headers });
	}

	return redirect(redirectTo);
};

const Verify = ({ actionData }: Route.ComponentProps) => {
	const [searchParams] = useSearchParams();
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
