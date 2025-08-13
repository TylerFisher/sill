export { sendEmail, renderReactEmail } from "./email-service";
export { default as VerifyEmail } from "./emails/VerifyEmail";
export { default as PasswordResetEmail } from "./emails/PasswordResetEmail";
export { default as WelcomeEmail } from "./emails/WelcomeEmail";
export { default as TopLinksEmail } from "./emails/TopLinksEmail";
export { default as EmailChangeEmail } from "./emails/EmailChangeEmail";
export { default as EmailChangeNoticeEmail } from "./emails/EmailChangeNoticeEmail";
import type { MostRecentLinkPosts, SubscriptionStatus } from "@sill/schema";
export { default as EmailLayout } from "./components/Layout";
export { default as EmailHeading } from "./components/Heading";
export { default as OTPBlock } from "./components/OTPBlock";
export { default as Lede } from "./components/Lede";
export { default as RSSLinks } from "./components/RSSLinks";
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
export declare function sendEmailChangeEmail({ to, otp, }: {
    to: string;
    otp: string;
}): Promise<void>;
export declare function sendEmailChangeNoticeEmail({ to, userId, }: {
    to: string;
    userId: string;
}): Promise<void>;
export declare function sendDigestEmail({ to, subject, links, name, digestUrl, layout, subscribed, freeTrialEnd, }: {
    to: string;
    subject: string;
    links: MostRecentLinkPosts[];
    name: string | null;
    digestUrl: string;
    layout?: "default" | "dense";
    subscribed: SubscriptionStatus;
    freeTrialEnd: Date | null;
}): Promise<void>;
export declare function renderDigestRSS({ links, name, digestUrl, subscribed, }: {
    links: MostRecentLinkPosts[];
    name: string | null;
    digestUrl: string;
    subscribed: string;
}): Promise<string>;
export declare function sendNotificationEmail({ to, subject, links, groupName, subscribed, freeTrialEnd, }: {
    to: string;
    subject: string;
    links: MostRecentLinkPosts[];
    groupName: string;
    subscribed: SubscriptionStatus;
    freeTrialEnd: Date | null;
}): Promise<void>;
export declare function renderNotificationRSS({ item, subscribed, }: {
    item: MostRecentLinkPosts;
    subscribed: SubscriptionStatus;
}): Promise<string>;
