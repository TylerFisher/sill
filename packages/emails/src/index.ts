export { sendEmail, renderReactEmail } from "./email-service";

export { default as VerifyEmail } from "./emails/VerifyEmail";
export { default as PasswordResetEmail } from "./emails/PasswordResetEmail";
export { default as WelcomeEmail } from "./emails/WelcomeEmail";
export { default as TopLinksEmail } from "./emails/TopLinksEmail";
export { default as EmailChangeEmail } from "./emails/EmailChangeEmail";
export { default as EmailChangeNoticeEmail } from "./emails/EmailChangeNoticeEmail";

import type { MostRecentLinkPosts } from "@sill/schema";

export { default as EmailLayout } from "./components/Layout";
export { default as EmailHeading } from "./components/Heading";
export { default as OTPBlock } from "./components/OTPBlock";
export { default as Lede } from "./components/Lede";
export { default as RSSLinks } from "./components/RSSLinks";

export async function sendVerificationEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}): Promise<void> {
  const { sendEmail } = await import("./email-service");
  const VerifyEmail = (await import("./emails/VerifyEmail")).default;

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
  const PasswordResetEmail = (await import("./emails/PasswordResetEmail"))
    .default;

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
  const WelcomeEmail = (await import("./emails/WelcomeEmail")).default;

  await sendEmail({
    to,
    subject: "Welcome to Sill!",
    react: WelcomeEmail({ name }),
    "o:tag": "welcome",
  });
}

export async function sendEmailChangeEmail({
  to,
  otp,
}: {
  to: string;
  otp: string;
}): Promise<void> {
  const { sendEmail } = await import("./email-service");
  const EmailChangeEmail = (await import("./emails/EmailChangeEmail")).default;

  await sendEmail({
    to,
    subject: "Sill Email Change Notification",
    react: EmailChangeEmail({ otp }),
    "o:tag": "change-email",
  });
}

export async function sendEmailChangeNoticeEmail({
  to,
  userId,
}: {
  to: string;
  userId: string;
}): Promise<void> {
  const { sendEmail } = await import("./email-service");
  const EmailChangeNoticeEmail = (
    await import("./emails/EmailChangeNoticeEmail")
  ).default;

  await sendEmail({
    to,
    subject: "Your Sill email has been changed",
    react: EmailChangeNoticeEmail({ userId }),
    "o:tag": "email-change-notice",
  });
}

export async function sendDigestEmail({
  to,
  subject,
  links,
  name,
  digestUrl,
  layout = "default",
  subscribed,
  freeTrialEnd,
}: {
  to: string;
  subject: string;
  links: MostRecentLinkPosts[];
  name: string | null;
  digestUrl: string;
  layout?: "default" | "dense";
  subscribed: string;
  freeTrialEnd: Date | null;
}): Promise<void> {
  const { sendEmail } = await import("./email-service");
  const TopLinksEmail = (await import("./emails/TopLinksEmail")).default;

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

export async function renderDigestRSS({
  links,
  name,
  digestUrl,
  subscribed,
}: {
  links: MostRecentLinkPosts[];
  name: string | null;
  digestUrl: string;
  subscribed: string;
}): Promise<string> {
  const RSSLinks = (await import("./components/RSSLinks")).default;

  return RSSLinks({
    links,
    name,
    digestUrl,
    subscribed,
  });
}
