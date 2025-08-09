export { sendEmail, renderReactEmail } from "./email-service";
export { default as VerifyEmail } from "./templates/VerifyEmail";
export { default as PasswordResetEmail } from "./templates/PasswordResetEmail";
export { default as WelcomeEmail } from "./templates/WelcomeEmail";
export { default as EmailLayout } from "./components/Layout";
export { default as EmailHeading } from "./components/Heading";
export { default as OTPBlock } from "./components/OTPBlock";
export { default as Lede } from "./components/Lede";
export declare function sendVerificationEmail({ to, otp, }: {
    to: string;
    otp: string;
}): Promise<void>;
export declare function sendPasswordResetEmail({ to, otp, }: {
    to: string;
    otp: string;
}): Promise<void>;
export declare function sendWelcomeEmail({ to, name, }: {
    to: string;
    name: string | null;
}): Promise<void>;
