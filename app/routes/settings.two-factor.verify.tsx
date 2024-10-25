import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@vercel/remix";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import * as QRCode from "qrcode";
import { z } from "zod";
import { isCodeValid } from "~/utils/verify.server";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/drizzle/db.server";
import { getDomainUrl, useIsPending } from "~/utils/misc";
import { getTOTPAuthUri } from "~/utils/totp.server";
import { twoFAVerificationType } from "./settings.two-factor._index";
import { Box, Button, Flex, Text } from "@radix-ui/themes";
import { OTPField } from "~/components/forms/OTPField";
import ErrorList from "~/components/forms/ErrorList";
import { and, eq } from "drizzle-orm";
import { user, verification } from "~/drizzle/schema.server";

const CancelSchema = z.object({ intent: z.literal("cancel") });
const VerifySchema = z.object({
	intent: z.literal("verify"),
	code: z.string().min(6).max(6),
});

const ActionSchema = z.discriminatedUnion("intent", [
	CancelSchema,
	VerifySchema,
]);

export const twoFAVerifyVerificationType = "2fa-verify";

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const existingVerification = await db.query.verification.findFirst({
		where: and(
			eq(verification.target, userId),
			eq(verification.type, twoFAVerificationType),
		),
		columns: {
			id: true,
			algorithm: true,
			secret: true,
			period: true,
			digits: true,
		},
	});
	if (!existingVerification) {
		return redirect("/settings/two-factor");
	}
	const existingUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		columns: { email: true },
	});

	if (!existingUser) {
		throw new Error("Something went wrong");
	}

	const issuer = new URL(getDomainUrl(request)).host;
	const otpUri = getTOTPAuthUri({
		...existingVerification,
		accountName: existingUser.email,
		issuer,
	});
	const qrCode = await QRCode.toDataURL(otpUri);
	return json({ otpUri, qrCode });
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const formData = await request.formData();

	const submission = await parseWithZod(formData, {
		schema: () =>
			ActionSchema.superRefine(async (data, ctx) => {
				if (data.intent === "cancel") return null;
				const codeIsValid = await isCodeValid({
					code: data.code,
					type: twoFAVerifyVerificationType,
					target: userId,
				});
				if (!codeIsValid) {
					ctx.addIssue({
						path: ["code"],
						code: z.ZodIssueCode.custom,
						message: "Invalid code",
					});
					return z.NEVER;
				}
			}),
		async: true,
	});

	if (submission.status !== "success") {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === "error" ? 400 : 200 },
		);
	}

	switch (submission.value.intent) {
		case "cancel": {
			await db
				.delete(verification)
				.where(
					and(
						eq(verification.target, userId),
						eq(verification.type, twoFAVerificationType),
					),
				);
			return redirect("/settings/two-factor");
		}
		case "verify": {
			await db
				.update(verification)
				.set({
					type: twoFAVerificationType,
				})
				.where(
					and(
						eq(verification.target, userId),
						eq(verification.type, twoFAVerificationType),
					),
				);
			return redirect("/settings/two-factor");
		}
	}
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	const isPending = useIsPending();

	const [form, fields] = useForm({
		id: "verify-form",
		constraint: getZodConstraint(ActionSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ActionSchema });
		},
	});

	return (
		<Box>
			<Flex
				gap="4"
				style={{
					flexDirection: "column",
				}}
			>
				<img
					alt="qr code"
					src={data.qrCode}
					style={{
						height: "14rem",
						width: "14rem",
					}}
				/>
				<Text as="p" weight="bold">
					Scan this QR code with your authenticator app.
				</Text>
				<Text as="p">
					If you cannot scan the QR code, you can manually add this account to
					your authenticator app using this code:
				</Text>
				<Box p="3">
					<pre
						aria-label="One-time Password URI"
						style={{
							whiteSpace: "pre-wrap",
							wordBreak: "break-all",
							fontSize: "var(--font-size-1)",
						}}
					>
						{data.otpUri}
					</pre>
				</Box>
				<Text as="p">
					Once you've added the account, enter the code from your authenticator
					app below. Once you enable 2FA, you will need to enter a code from
					your authenticator app every time you log in or perform important
					actions. Do not lose access to your authenticator app, or you will
					lose access to your account.
				</Text>

				<Form method="POST" {...getFormProps(form)}>
					<ErrorList errors={form.errors} id={form.errorId} />
					<Flex
						justify="center"
						gap="4"
						style={{
							flexDirection: "column",
						}}
					>
						<OTPField
							labelProps={{
								htmlFor: fields.code.id,
								children: "Code",
							}}
							inputProps={{
								...getInputProps(fields.code, { type: "text" }),
								autoFocus: true,
								autoComplete: "one-time-code",
							}}
							errors={fields.code.errors}
						/>

						<Flex justify="between" gap="4">
							<Button type="submit" name="intent" value="verify">
								Submit
							</Button>
							<Button
								type="submit"
								name="intent"
								value="cancel"
								disabled={isPending}
							>
								Cancel
							</Button>
						</Flex>
					</Flex>
				</Form>
			</Flex>
		</Box>
	);
}
