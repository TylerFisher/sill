import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import { Box, Button, Callout, Flex, Spinner, Text } from "@radix-ui/themes";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { type FetcherWithComponents, useFetcher } from "react-router";
import { z } from "zod";
import { OTPField } from "~/components/forms/OTPField";
import SubmitButton from "~/components/forms/SubmitButton";
import TextInput from "~/components/forms/TextInput";
import TimeSelect, {
	formatUtcTimeAsLocal,
} from "~/components/forms/TimeSelect";
import { EmailSchema } from "~/utils/userValidation";
import type { DigestSettings } from "./types";

const AddEmailSchema = z.object({ email: EmailSchema });
const VerifyCodeSchema = z.object({ code: z.string().min(6).max(6) });

function DigestToggle({
	currentSettings,
}: { currentSettings?: DigestSettings }) {
	const fetcher = useFetcher();
	const [enabled, setEnabled] = useState(!!currentSettings);
	const [time, setTime] = useState<string | undefined>(
		currentSettings?.scheduledTime?.substring(0, 5) ?? "14:00",
	);
	const isSubmitting = fetcher.state === "submitting";

	const handleSubmit = () => {
		if (!time) return;
		fetcher.submit(
			{
				time,
				topAmount: "10",
				digestType: "email",
				layout: "default",
				hideReposts: "include",
			},
			{ method: "POST", action: "/email/add" },
		);
		setEnabled(true);
	};

	const handleDisable = () => {
		fetcher.submit(null, { method: "DELETE", action: "/email/delete" });
		setEnabled(false);
	};

	if (enabled && time) {
		return (
			<Box mt="5" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
				<Callout.Root>
					<Callout.Icon>
						<CheckCircle size={16} />
					</Callout.Icon>
					<Callout.Text>
						Daily digest enabled for{" "}
						<strong>{formatUtcTimeAsLocal(time)}</strong>
					</Callout.Text>
				</Callout.Root>
				<Box mt="3">
					<Button
						variant="ghost"
						size="2"
						onClick={handleDisable}
						disabled={isSubmitting}
					>
						{isSubmitting ? "Disabling..." : "Disable digest"}
					</Button>
				</Box>
			</Box>
		);
	}

	return (
		<Box mt="5" pt="4" style={{ borderTop: "1px solid var(--gray-6)" }}>
			<Text as="p" size="2" weight="medium" mb="2">
				Daily Digest
			</Text>
			<Text as="p" size="2" color="gray" mb="3">
				Get a daily email with the top 10 links from your network.
			</Text>
			<Flex align="end" gap="3">
				<TimeSelect
					value={time}
					onChange={setTime}
					label="Delivery time"
					size="2"
				/>
				<Button onClick={handleSubmit} disabled={isSubmitting || !time}>
					{isSubmitting ? (
						<Flex align="center" gap="2">
							<Spinner size="1" />
							Enabling...
						</Flex>
					) : (
						"Enable digest"
					)}
				</Button>
			</Flex>
		</Box>
	);
}

function VerifiedEmailCallout({
	email,
	currentSettings,
}: {
	email: string;
	currentSettings?: DigestSettings;
}) {
	return (
		<>
			<Callout.Root>
				<Callout.Icon>
					<CheckCircle size={16} />
				</Callout.Icon>
				<Callout.Text>
					Email verified: <strong>{email}</strong>
				</Callout.Text>
			</Callout.Root>
			<DigestToggle currentSettings={currentSettings} />
		</>
	);
}

function VerificationForm({
	target,
	onCancel,
	onSuccess,
}: {
	target: string;
	onCancel: () => void;
	onSuccess: (email: string) => void;
}) {
	const fetcher = useFetcher();
	const [form, fields] = useForm({
		id: "verify-email-form",
		constraint: getZodConstraint(VerifyCodeSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: VerifyCodeSchema });
		},
	});

	const verifyData = fetcher.data as
		| { success?: boolean; email?: string }
		| undefined;

	useEffect(() => {
		if (verifyData?.success && verifyData.email) {
			onSuccess(verifyData.email);
		}
	}, [verifyData?.success, verifyData?.email, onSuccess]);

	return (
		<Box>
			<Text as="p" mb="4">
				We sent a verification code to <strong>{target}</strong>. Enter it below
				to confirm your email.
			</Text>
			<fetcher.Form
				method="POST"
				action="/api/email/verify"
				{...getFormProps(form)}
			>
				<input type="hidden" name="target" value={target} />
				<Box mb="4">
					<OTPField
						labelProps={{
							htmlFor: fields.code.id,
							children: "Verification code",
						}}
						inputProps={getInputProps(fields.code, { type: "text" })}
						errors={fields.code.errors}
					/>
				</Box>
				<Flex gap="2" align="center">
					<SubmitButton
						label={fetcher.state === "submitting" ? "Verifying..." : "Verify"}
					/>
					<Button type="button" variant="ghost" onClick={onCancel}>
						Use different email
					</Button>
				</Flex>
			</fetcher.Form>
		</Box>
	);
}

function AddEmailForm({
	fetcher,
}: {
	fetcher: FetcherWithComponents<{ redirectTo?: string; result?: unknown }>;
}) {
	const [form, fields] = useForm({
		id: "add-email-form",
		constraint: getZodConstraint(AddEmailSchema),
		lastResult: fetcher.data?.result || undefined,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: AddEmailSchema });
		},
	});

	return (
		<Box>
			<Text as="p" mb="4">
				Add your email to receive daily digests and notifications about popular
				links.
			</Text>
			<fetcher.Form
				method="POST"
				action="/api/email/send-verification"
				{...getFormProps(form)}
			>
				<TextInput
					labelProps={{ children: "Email address" }}
					inputProps={{
						...getInputProps(fields.email, { type: "email" }),
						autoComplete: "email",
						placeholder: "you@example.com",
					}}
					errors={fields.email.errors}
				/>
				<SubmitButton
					label={
						fetcher.state === "submitting"
							? "Sending..."
							: "Send verification code"
					}
				/>
			</fetcher.Form>
		</Box>
	);
}

interface EmailStepProps {
	email: string | null;
	currentSettings?: DigestSettings;
}

export default function EmailStep({ email, currentSettings }: EmailStepProps) {
	const [verifiedEmail, setVerifiedEmail] = useState<string | null>(email);
	const [verificationTarget, setVerificationTarget] = useState<string | null>(
		null,
	);
	const addEmailFetcher = useFetcher<{
		redirectTo?: string;
		result?: unknown;
	}>();

	useEffect(() => {
		if (addEmailFetcher.data?.redirectTo && !verificationTarget) {
			const url = new URL(addEmailFetcher.data.redirectTo, "http://localhost");
			const target = url.searchParams.get("target");
			if (target) {
				setVerificationTarget(target);
			}
		}
	}, [addEmailFetcher.data?.redirectTo, verificationTarget]);

	if (verifiedEmail) {
		return (
			<VerifiedEmailCallout
				email={verifiedEmail}
				currentSettings={currentSettings}
			/>
		);
	}

	if (verificationTarget) {
		return (
			<VerificationForm
				target={verificationTarget}
				onCancel={() => setVerificationTarget(null)}
				onSuccess={setVerifiedEmail}
			/>
		);
	}

	return <AddEmailForm fetcher={addEmailFetcher} />;
}
