import { renderToString } from "react-dom/server";
import { sendEmail } from "./email-service.js";
import VerifyEmail from "./emails/VerifyEmail.js";
import PasswordResetEmail from "./emails/PasswordResetEmail.js";
import WelcomeEmail from "./emails/WelcomeEmail.js";
import TopLinksEmail from "./emails/TopLinksEmail.js";
import EmailChangeEmail from "./emails/EmailChangeEmail.js";
import EmailChangeNoticeEmail from "./emails/EmailChangeNoticeEmail.js";
import Notification from "./emails/Notification.js";
import RSSLinks from "./components/RSSLinks.js";
export { sendEmail, renderReactEmail } from "./email-service.js";
export { default as VerifyEmail } from "./emails/VerifyEmail.js";
export { default as PasswordResetEmail } from "./emails/PasswordResetEmail.js";
export { default as WelcomeEmail } from "./emails/WelcomeEmail.js";
export { default as TopLinksEmail } from "./emails/TopLinksEmail.js";
export { default as EmailChangeEmail } from "./emails/EmailChangeEmail.js";
export { default as EmailChangeNoticeEmail } from "./emails/EmailChangeNoticeEmail.js";
import RSSNotificationItem from "./components/RSSNotificationItem.js";
export { default as EmailLayout } from "./components/Layout.js";
export { default as EmailHeading } from "./components/Heading.js";
export { default as OTPBlock } from "./components/OTPBlock.js";
export { default as Lede } from "./components/Lede.js";
export { default as RSSLinks } from "./components/RSSLinks.js";
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
