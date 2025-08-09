import type { ReactElement } from "react";
/**
 * Sends an email using the Mailgun API
 * @returns Mailgun API response
 */
export declare function sendEmail({ react, ...options }: {
    to: string;
    subject: string;
    "o:tag"?: string;
} & ({
    html: string;
    text: string;
    react?: never;
} | {
    react: ReactElement;
    html?: never;
    text?: never;
})): Promise<import("mailgun.js").MessagesSendResult | {
    readonly status: "200";
    readonly id: "mock";
    readonly message: {
        template: string;
        html: string;
        text: string;
        to: string;
        subject: string;
        "o:tag"?: string;
        from: string;
    } | {
        template: string;
        html?: string | undefined;
        text?: string | undefined;
        to: string;
        subject: string;
        "o:tag"?: string;
        from: string;
    };
}>;
/**
 * Renders a React element into HTML and plain text email content
 * @param react React element to render
 * @returns HTML and plain text email content
 */
export declare function renderReactEmail(react: ReactElement): Promise<{
    html: string;
    text: string;
}>;
