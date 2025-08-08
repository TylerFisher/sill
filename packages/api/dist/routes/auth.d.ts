declare const auth: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/login": {
        $post: {
            input: {
                json: {
                    email: string;
                    password: string;
                    remember?: boolean | undefined;
                    redirectTo?: string | undefined;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                json: {
                    email: string;
                    password: string;
                    remember?: boolean | undefined;
                    redirectTo?: string | undefined;
                };
            };
            output: {
                success: true;
                session: {
                    id: string;
                    userId: string;
                    expirationDate: string;
                };
                redirectTo: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    email: string;
                    password: string;
                    remember?: boolean | undefined;
                    redirectTo?: string | undefined;
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
    "/signup": {
        $post: {
            input: {
                json: {
                    name: string;
                    email: string;
                    password: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: {
                    name: string;
                    email: string;
                    password: string;
                };
            };
            output: {
                success: true;
                session: {
                    id: string;
                    userId: string;
                    expirationDate: string;
                };
                redirectTo: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    name: string;
                    email: string;
                    password: string;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 409;
        } | {
            input: {
                json: {
                    name: string;
                    email: string;
                    password: string;
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
    "/logout": {
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
                success: true;
                redirectTo: string;
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
    "/signup/initiate": {
        $post: {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 409;
        } | {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                success: true;
                otp: string;
                verifyUrl: string;
                message: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    email: string;
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
    "/verify": {
        $post: {
            input: {
                json: {
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
                    code: string;
                    redirectTo?: string | undefined;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 400;
        } | {
            input: {
                json: {
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
                    code: string;
                    redirectTo?: string | undefined;
                };
            };
            output: {
                success: true;
                type: "onboarding";
                target: string;
                redirectTo: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
                    code: string;
                    redirectTo?: string | undefined;
                };
            };
            output: {
                success: true;
                type: "reset-password" | "change-email" | "2fa";
                target: string;
                redirectTo: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
                    code: string;
                    redirectTo?: string | undefined;
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
    "/me": {
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
                userId: string;
                authenticated: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/profile": {
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
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {};
            output: {
                subscriptionStatus: import("../auth/auth.server.js").SubscriptionStatus;
                id: string;
                name: string | null;
                email: string;
                customerId: string | null;
                freeTrialEnd: string | null;
                createdAt: string;
                emailConfirmed: boolean;
                mastodonAccounts: {
                    id: string;
                    createdAt: string;
                    userId: string;
                    mostRecentPostId: string | null;
                    instanceId: string;
                    accessToken: string;
                    tokenType: string;
                    expiresIn: number | null;
                    refreshToken: string | null;
                    mastodonInstance: {
                        id: string;
                        createdAt: string;
                        instance: string;
                        clientId: string;
                        clientSecret: string;
                    };
                    lists: {
                        id: string;
                        name: string;
                        uri: string;
                        mostRecentPostDate: string | null;
                        mostRecentPostId: string | null;
                        blueskyAccountId: string | null;
                        mastodonAccountId: string | null;
                    }[];
                }[];
                blueskyAccounts: {
                    id: string;
                    userId: string;
                    mostRecentPostDate: string | null;
                    service: string;
                    handle: string;
                    did: string;
                    lists: {
                        id: string;
                        name: string;
                        uri: string;
                        mostRecentPostDate: string | null;
                        mostRecentPostId: string | null;
                        blueskyAccountId: string | null;
                        mastodonAccountId: string | null;
                    }[];
                }[];
                subscriptions: {
                    id: string;
                    createdAt: string | null;
                    userId: string;
                    status: string;
                    polarId: string;
                    polarProductId: string;
                    periodStart: string | null;
                    periodEnd: string | null;
                    cancelAtPeriodEnd: boolean;
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
}, "/">;
export default auth;
