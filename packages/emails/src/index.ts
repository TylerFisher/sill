export { sendEmail, renderReactEmail } from "./email-service";

export { default as VerifyEmail } from "./templates/VerifyEmail";
export { default as PasswordResetEmail } from "./templates/PasswordResetEmail";
export { default as WelcomeEmail } from "./templates/WelcomeEmail";
export { default as TopLinksEmail } from "./templates/TopLinksEmail";

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
  const PasswordResetEmail = (await import("./templates/PasswordResetEmail"))
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
  const WelcomeEmail = (await import("./templates/WelcomeEmail")).default;

  await sendEmail({
    to,
    subject: "Welcome to Sill!",
    react: WelcomeEmail({ name }),
    "o:tag": "welcome",
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
  const TopLinksEmail = (await import("./templates/TopLinksEmail")).default;

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
