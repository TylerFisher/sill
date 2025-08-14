declare const subscriptions: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/current": {
        $get: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {};
            output: {
                subscription: {
                    status: string;
                    id: string;
                    userId: string;
                    createdAt: string | null;
                    polarId: string;
                    polarProductId: string;
                    periodStart: string | null;
                    periodEnd: string | null;
                    cancelAtPeriodEnd: boolean;
                    polarProduct: {
                        id: string;
                        name: string;
                        description: string;
                        polarId: string;
                        amount: number;
                        currency: string;
                        interval: string;
                        checkoutLinkUrl: string;
                    };
                } | undefined;
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
} & {
    "/active": {
        $get: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {};
            output: {
                subscription: {
                    status: string;
                    id: string;
                    userId: string;
                    createdAt: string | null;
                    polarId: string;
                    polarProductId: string;
                    periodStart: string | null;
                    periodEnd: string | null;
                    cancelAtPeriodEnd: boolean;
                    polarProduct: {
                        id: string;
                        name: string;
                        description: string;
                        polarId: string;
                        amount: number;
                        currency: string;
                        interval: string;
                        checkoutLinkUrl: string;
                    };
                } | undefined;
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
} & {
    "/products": {
        $get: {
            input: {};
            output: {
                products: {
                    id: string;
                    name: string;
                    description: string;
                    polarId: string;
                    amount: number;
                    currency: string;
                    interval: string;
                    checkoutLinkUrl: string;
                }[];
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
} & {
    "/seed": {
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
            };
            outputFormat: "json";
            status: 403;
        } | {
            input: {};
            output: {
                success: true;
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
} & {
    "/webhook": {
        $post: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {};
            output: {
                success: true;
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
export default subscriptions;
