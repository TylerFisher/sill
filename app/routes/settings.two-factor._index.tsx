import type { VerificationTypes } from "~/routes/accounts.verify";
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { prisma } from "~/db.server";
import { generateTOTP } from "~/utils/totp.server";
import { twoFAVerifyVerificationType } from "~/routes/settings.two-factor.verify";
import { uuidv7 } from "uuidv7-js";
import Layout from "~/components/Layout";
import { Box, Button, Flex, Text } from "@radix-ui/themes";

export const twoFAVerificationType = "2fa" satisfies VerificationTypes;

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request);
	const verification = await prisma.verification.findUnique({
		where: { target_type: { type: twoFAVerificationType, target: userId } },
		select: { id: true },
	});
	return json({ is2FAEnabled: Boolean(verification) });
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request);
	const { otp: _otp, ...config } = await generateTOTP();
	const verificationData = {
		...config,
		type: twoFAVerifyVerificationType,
		target: userId,
	};
	await prisma.verification.upsert({
		where: {
			target_type: { target: userId, type: twoFAVerifyVerificationType },
		},
		create: {
			id: uuidv7(),
			...verificationData,
		},
		update: verificationData,
	});
	return redirect("/settings/two-factor/verify");
}

export default function TwoFactorRoute() {
	const data = useLoaderData<typeof loader>();
	const enable2FAFetcher = useFetcher<typeof action>();

	return (
		<Layout>
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
		</Layout>
	);
}
