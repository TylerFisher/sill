declare const bluesky: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/auth/authorize": {
        $get: {
            input: {
                query: {
                    handle?: string | undefined;
                };
            };
            output: {
                success: true;
                redirectUrl: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    handle?: string | undefined;
                };
            };
            output: {
                error: string;
                code: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                query: {
                    handle?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
} & {
    "/auth/callback": {
        $post: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {};
            output: {
                error: string;
                code: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {};
            output: {
                success: true;
                account: {
                    did: `did:${string}:${string}`;
                    handle: string;
                    service: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/">;
export default bluesky;
