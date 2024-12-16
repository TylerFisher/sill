import { Box, Button, Flex, Text } from "@radix-ui/themes";
import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	redirect,
} from "react-router";
import { Link, useFetcher, useLoaderData } from "react-router";
import { and, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7-js";
import { db } from "~/drizzle/db.server";
import { verification } from "~/drizzle/schema.server";
import type { VerificationTypes } from "~/routes/accounts/verify";
import { twoFAVerifyVerificationType } from "./two-factor.verify";
import { requireUserId } from "~/utils/auth.server";
import { generateTOTP } from "~/utils/totp.server";

export const twoFAVerificationType = "2fa" satisfies VerificationTypes;

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const existingVerification = await db.query.verification.findFirst({
		where: and(
			eq(verification.target, userId),
			eq(verification.type, twoFAVerificationType),
		),
		columns: { id: true },
	});
	return { is2FAEnabled: Boolean(existingVerification) };
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const { otp: _otp, ...config } = await generateTOTP();
	const verificationData = {
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	};
	await db
		.insert(verification)
		.values({
			id: uuidv7(),
			...verificationData,
		})
		.onConflictDoUpdate({
			target: [verification.target, verification.type],
			set: verificationData,
		});
	return redirect("/settings/two-factor/verify");
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>();
	const enable2FAFetcher = useFetcher<typeof action>();

	return (
		<Box>
			{data.is2FAEnabled ? (
				<Flex
					gap="2"
					style={{
						flexDirection: "column",
					}}
				>
					<Text as="p">You have enabled two-factor authentication.</Text>
					<Text as="p">
						<Link to="disable">Disable 2FA</Link>
					</Text>
				</Flex>
			) : (
				<Flex
					gap="2"
					style={{
						flexDirection: "column",
					}}
				>
					<Text as="p">
						You have not enabled two-factor authentication yet.
					</Text>
					<Text as="p" mb="2">
						Two factor authentication adds an extra layer of security to your
						account. You will need to enter a code from an authenticator app
						like{" "}
						<a className="underline" href="https://1password.com/">
							1Password
						</a>{" "}
						to log in.
					</Text>
					<enable2FAFetcher.Form method="POST">
						<Button type="submit" name="intent" value="enable">
							Enable 2FA
						</Button>
					</enable2FAFetcher.Form>
				</Flex>
			)}
		</Box>
	);
}
