declare const mastodon: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/auth/authorize": {
        $get: {
            input: {
                query: {
                    instance: string;
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
                    instance: string;
                };
            };
            output: {
                success: true;
                redirectUrl: string;
                instance: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    instance: string;
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
            input: {
                json: {
                    instance: string;
                    code: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                json: {
                    instance: string;
                    code: string;
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
                json: {
                    instance: string;
                    code: string;
                };
            };
            output: {
                success: true;
                account: {
                    instance: string;
                    tokenType: any;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    instance: string;
                    code: string;
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
    "/auth/revoke": {
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
            status: 404;
        } | {
            input: {};
            output: {
                success: true;
                message: string;
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
export default mastodon;
