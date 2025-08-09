// Re-export the exact same email functions from the web package pattern
export { sendEmail, renderReactEmail } from "./email-service";

// Re-export templates 
export { default as VerifyEmail } from "./templates/VerifyEmail";
export { default as PasswordResetEmail } from "./templates/PasswordResetEmail";
export { default as WelcomeEmail } from "./templates/WelcomeEmail";

// Re-export components
export { default as EmailLayout } from "./components/Layout";
export { default as EmailHeading } from "./components/Heading";  
export { default as OTPBlock } from "./components/OTPBlock";
export { default as Lede } from "./components/Lede";

// Email sending functions - simple approach
export async function sendVerificationEmail({
	to,
	otp,
}: {
	to: string;
	otp: string;
}): Promise<void> {
	const { sendEmail } = await import("./email-service");
	const VerifyEmail = (await import("./templates/VerifyEmail")).default;
	
	await sendEmail({
		to,
		subject: "Verify your Sill account",
		react: VerifyEmail({ otp }),
		"o:tag": "verification",
	});
}

export async function sendPasswordResetEmail({
	to,
	otp,
}: {
	to: string;
	otp: string;
}): Promise<void> {
	const { sendEmail } = await import("./email-service");
	const PasswordResetEmail = (await import("./templates/PasswordResetEmail")).default;
	
	await sendEmail({
		to,
		subject: "Reset your Sill password",
		react: PasswordResetEmail({ otp }),
		"o:tag": "password-reset",
	});
}

export async function sendWelcomeEmail({
	to,
	name,
}: {
	to: string;
	name: string | null;
}): Promise<void> {
	const { sendEmail } = await import("./email-service");
	const WelcomeEmail = (await import("./templates/WelcomeEmail")).default;
	
	await sendEmail({
		to,
		subject: "Welcome to Sill!",
		react: WelcomeEmail({ name }),
		"o:tag": "welcome",
	});
}