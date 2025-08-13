import { renderToString } from "react-dom/server";
import { sendEmail } from "./email-service";
import VerifyEmail from "./emails/VerifyEmail";
import PasswordResetEmail from "./emails/PasswordResetEmail";
import WelcomeEmail from "./emails/WelcomeEmail";
import TopLinksEmail from "./emails/TopLinksEmail";
import EmailChangeEmail from "./emails/EmailChangeEmail";
import EmailChangeNoticeEmail from "./emails/EmailChangeNoticeEmail";
import Notification from "./emails/Notification";
import RSSLinks from "./components/RSSLinks";
export { sendEmail, renderReactEmail } from "./email-service";
export { default as VerifyEmail } from "./emails/VerifyEmail";
export { default as PasswordResetEmail } from "./emails/PasswordResetEmail";
export { default as WelcomeEmail } from "./emails/WelcomeEmail";
export { default as TopLinksEmail } from "./emails/TopLinksEmail";
export { default as EmailChangeEmail } from "./emails/EmailChangeEmail";
export { default as EmailChangeNoticeEmail } from "./emails/EmailChangeNoticeEmail";
import RSSNotificationItem from "./components/RSSNotificationItem";
export { default as EmailLayout } from "./components/Layout";
export { default as EmailHeading } from "./components/Heading";
export { default as OTPBlock } from "./components/OTPBlock";
export { default as Lede } from "./components/Lede";
export { default as RSSLinks } from "./components/RSSLinks";
export async function sendVerificationEmail({ to, otp, }) {
    await sendEmail({
        to,
        subject: "Verify your Sill account",
        react: VerifyEmail({ otp }),
        "o:tag": "verification",
    });
}
export async function sendPasswordResetEmail({ to, otp, }) {
    await sendEmail({
        to,
        subject: "Reset your Sill password",
        react: PasswordResetEmail({ otp }),
        "o:tag": "password-reset",
    });
}
export async function sendWelcomeEmail({ to, name, }) {
    await sendEmail({
        to,
        subject: "Welcome to Sill!",
        react: WelcomeEmail({ name }),
        "o:tag": "welcome",
    });
}
export async function sendEmailChangeEmail({ to, otp, }) {
    await sendEmail({
        to,
        subject: "Sill Email Change Notification",
        react: EmailChangeEmail({ otp }),
        "o:tag": "change-email",
    });
}
export async function sendEmailChangeNoticeEmail({ to, userId, }) {
    await sendEmail({
        to,
        subject: "Your Sill email has been changed",
        react: EmailChangeNoticeEmail({ userId }),
        "o:tag": "email-change-notice",
    });
}
export async function sendDigestEmail({ to, subject, links, name, digestUrl, layout = "default", subscribed, freeTrialEnd, }) {
    await sendEmail({
        to,
        subject,
        react: TopLinksEmail({
            links,
            name,
            digestUrl,
            layout,
            subscribed,
            freeTrialEnd,
        }),
        "o:tag": "digest",
    });
}
export async function renderDigestRSS({ links, name, digestUrl, subscribed, }) {
    return RSSLinks({
        links,
        name,
        digestUrl,
        subscribed,
    });
}
export async function sendNotificationEmail({ to, subject, links, groupName, subscribed, freeTrialEnd, }) {
    const notificationElement = Notification({
        links,
        groupName,
        subscribed,
        freeTrialEnd,
    });
    if (!notificationElement) {
        throw new Error("Failed to render notification email");
    }
    await sendEmail({
        to,
        subject,
        react: notificationElement,
        "o:tag": "notification",
    });
}
export async function renderNotificationRSS({ item, subscribed, }) {
    return renderToString(RSSNotificationItem({
        linkPost: item,
        subscribed,
    }));
}
