declare const app: import("hono/hono-base").HonoBase<{}, {
    "*": {};
}, "/">;
declare const routes: import("hono/hono-base").HonoBase<{}, {
    "*": {};
} | import("hono/types").MergeSchemaPath<{
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
                    email: string;
                    password: string;
                    name: string;
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
                    email: string;
                    password: string;
                    name: string;
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
                    name: string;
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
                    password: string;
                    name: string;
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
                    code: string;
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
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
                    code: string;
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
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
                    code: string;
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
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
                    code: string;
                    type: "onboarding" | "reset-password" | "change-email" | "2fa";
                    target: string;
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
                subscriptionStatus: import("node_modules/@sill/auth/dist/auth").SubscriptionStatus;
                email: string;
                id: string;
                createdAt: string;
                name: string | null;
                customerId: string | null;
                freeTrialEnd: string | null;
                emailConfirmed: boolean;
                mastodonAccounts: {
                    id: string;
                    createdAt: string;
                    userId: string;
                    instanceId: string;
                    accessToken: string;
                    tokenType: string;
                    expiresIn: number | null;
                    refreshToken: string | null;
                    mostRecentPostId: string | null;
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
                        mostRecentPostId: string | null;
                        mostRecentPostDate: string | null;
                        uri: string;
                        blueskyAccountId: string | null;
                        mastodonAccountId: string | null;
                    }[];
                }[];
                blueskyAccounts: {
                    id: string;
                    userId: string;
                    service: string;
                    handle: string;
                    did: string;
                    mostRecentPostDate: string | null;
                    lists: {
                        id: string;
                        name: string;
                        mostRecentPostId: string | null;
                        mostRecentPostDate: string | null;
                        uri: string;
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
                bookmarks: {
                    id: string;
                    createdAt: string;
                    userId: string;
                    linkUrl: string;
                    posts: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    };
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
    "/user": {
        $delete: {
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
    "/verify-password": {
        $post: {
            input: {
                json: {
                    password: string;
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
                    password: string;
                };
            };
            output: {
                valid: false;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    password: string;
                };
            };
            output: {
                valid: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
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
    "/password": {
        $put: {
            input: {
                json: {
                    newPassword: string;
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
                    newPassword: string;
                };
            };
            output: {
                success: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    newPassword: string;
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
    "/search-user": {
        $post: {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                user: {
                    id: string;
                    email: string;
                };
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
    "/reset-password": {
        $post: {
            input: {
                json: {
                    email: string;
                    newPassword: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    email: string;
                    newPassword: string;
                };
            };
            output: {
                success: true;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    email: string;
                    newPassword: string;
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
    "/change-email": {
        $post: {
            input: {
                json: {
                    email: string;
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
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                success: true;
                verifyUrl: string;
                newEmail: string;
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
    "/update-email": {
        $put: {
            input: {
                json: {
                    newEmail: string;
                    oldEmail: string;
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
                    newEmail: string;
                    oldEmail: string;
                };
            };
            output: {
                success: true;
                newEmail: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    newEmail: string;
                    oldEmail: string;
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
    "/forgot-password": {
        $post: {
            input: {
                json: {
                    email: string;
                };
            };
            output: {
                success: true;
                verifyUrl: string;
                email: string;
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
    "/client-metadata": {
        $get: {
            input: {};
            output: {
                client_id: "http://localhost" | `http://localhost?${string}` | `https://${string}/${string}` | "http://localhost/" | `http://localhost/?${string}`;
                redirect_uris: [`http://[::1]${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | `${string}.${string}:/${string}`, ...(`http://[::1]${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | `${string}.${string}:/${string}`)[]];
                response_types: ["code" | "id_token" | "token" | "none" | "code id_token token" | "code id_token" | "code token" | "id_token token", ...("code" | "id_token" | "token" | "none" | "code id_token token" | "code id_token" | "code token" | "id_token token")[]];
                grant_types: ["refresh_token" | "authorization_code" | "implicit" | "password" | "client_credentials" | "urn:ietf:params:oauth:grant-type:jwt-bearer" | "urn:ietf:params:oauth:grant-type:saml2-bearer", ...("refresh_token" | "authorization_code" | "implicit" | "password" | "client_credentials" | "urn:ietf:params:oauth:grant-type:jwt-bearer" | "urn:ietf:params:oauth:grant-type:saml2-bearer")[]];
                token_endpoint_auth_method: "none" | "client_secret_basic" | "client_secret_jwt" | "client_secret_post" | "private_key_jwt" | "self_signed_tls_client_auth" | "tls_client_auth";
                application_type: "web" | "native";
                subject_type: "public" | "pairwise";
                authorization_signed_response_alg: string;
                scope?: string | undefined | undefined;
                token_endpoint_auth_signing_alg?: string | undefined | undefined;
                userinfo_signed_response_alg?: string | undefined | undefined;
                userinfo_encrypted_response_alg?: string | undefined | undefined;
                jwks_uri?: `http://[::1]${string}` | "http://localhost" | `http://localhost#${string}` | `http://localhost?${string}` | `http://localhost/${string}` | `http://localhost:${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | undefined | undefined;
                jwks?: {
                    keys: ({
                        kty: "RSA";
                        n: string;
                        e: string;
                        alg?: "RS256" | "RS384" | "RS512" | "PS256" | "PS384" | "PS512" | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                        d?: string | undefined | undefined;
                        p?: string | undefined | undefined;
                        q?: string | undefined | undefined;
                        dp?: string | undefined | undefined;
                        dq?: string | undefined | undefined;
                        qi?: string | undefined | undefined;
                        oth?: [{
                            d?: string | undefined | undefined;
                            r?: string | undefined | undefined;
                            t?: string | undefined | undefined;
                        }, ...{
                            d?: string | undefined | undefined;
                            r?: string | undefined | undefined;
                            t?: string | undefined | undefined;
                        }[]] | undefined;
                    } | {
                        kty: "EC";
                        crv: "P-256" | "P-384" | "P-521";
                        x: string;
                        y: string;
                        alg?: "ES256" | "ES384" | "ES512" | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                        d?: string | undefined | undefined;
                    } | {
                        kty: "EC";
                        crv: "secp256k1";
                        x: string;
                        y: string;
                        alg?: "ES256K" | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                        d?: string | undefined | undefined;
                    } | {
                        kty: "OKP";
                        crv: "Ed25519" | "Ed448";
                        x: string;
                        alg?: "EdDSA" | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                        d?: string | undefined | undefined;
                    } | {
                        kty: "oct";
                        k: string;
                        alg?: "HS256" | "HS384" | "HS512" | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                    } | {
                        kty: string;
                        alg?: string | undefined | undefined;
                        kid?: string | undefined | undefined;
                        ext?: boolean | undefined | undefined;
                        use?: "sig" | "enc" | undefined | undefined;
                        key_ops?: ("sign" | "verify" | "encrypt" | "decrypt" | "wrapKey" | "unwrapKey" | "deriveKey" | "deriveBits")[] | undefined | undefined;
                        x5c?: string[] | undefined | undefined;
                        x5t?: string | undefined | undefined;
                        "x5t#S256"?: string | undefined | undefined;
                        x5u?: string | undefined | undefined;
                    })[];
                } | undefined;
                request_object_signing_alg?: string | undefined | undefined;
                id_token_signed_response_alg?: string | undefined | undefined;
                authorization_encrypted_response_enc?: "A128CBC-HS256" | undefined | undefined;
                authorization_encrypted_response_alg?: string | undefined | undefined;
                client_name?: string | undefined | undefined;
                client_uri?: `http://[::1]${string}` | "http://localhost" | `http://localhost#${string}` | `http://localhost?${string}` | `http://localhost/${string}` | `http://localhost:${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | undefined | undefined;
                policy_uri?: `http://[::1]${string}` | "http://localhost" | `http://localhost#${string}` | `http://localhost?${string}` | `http://localhost/${string}` | `http://localhost:${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | undefined | undefined;
                tos_uri?: `http://[::1]${string}` | "http://localhost" | `http://localhost#${string}` | `http://localhost?${string}` | `http://localhost/${string}` | `http://localhost:${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | undefined | undefined;
                logo_uri?: `http://[::1]${string}` | "http://localhost" | `http://localhost#${string}` | `http://localhost?${string}` | `http://localhost/${string}` | `http://localhost:${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | undefined | undefined;
                default_max_age?: number | undefined | undefined;
                require_auth_time?: boolean | undefined | undefined;
                contacts?: string[] | undefined | undefined;
                tls_client_certificate_bound_access_tokens?: boolean | undefined | undefined;
                dpop_bound_access_tokens?: boolean | undefined | undefined;
                authorization_details_types?: string[] | undefined | undefined;
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
}, "/api/auth"> | import("hono/types").MergeSchemaPath<{
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
                    did: `did:web:${string}` | `did:plc:${string}`;
                    handle: string;
                    service: "http://localhost" | `http://localhost?${string}` | `http://[::1]${string}` | "http://127.0.0.1" | `http://127.0.0.1#${string}` | `http://127.0.0.1?${string}` | `http://127.0.0.1/${string}` | `http://127.0.0.1:${string}` | `https://${string}` | `http://localhost#${string}` | `http://localhost/${string}` | `http://localhost:${string}`;
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
} & {
    "/auth/revoke": {
        $delete: {
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
    "/lists": {
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
                lists: {
                    name: string;
                    uri: string;
                    type: "bluesky" | "mastodon";
                    subscribed: boolean;
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
}, "/api/bluesky"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $get: {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                };
            };
            output: {
                bookmarks: {
                    id: string;
                    userId: string;
                    createdAt: string;
                    linkUrl: string;
                    posts: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    };
                    linkPosts?: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    } | undefined;
                }[];
                page: number;
                limit: number;
                hasMore: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
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
    "/": {
        $post: {
            input: {
                json: {
                    url: string;
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
                    url: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 409;
        } | {
            input: {
                json: {
                    url: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    url: string;
                };
            };
            output: {
                success: true;
                bookmark: {
                    id: string;
                    userId: string;
                    createdAt: string;
                    linkUrl: string;
                    posts: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    };
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    url: string;
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
    "/": {
        $delete: {
            input: {
                json: {
                    url: string;
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
                    url: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    url: string;
                };
            };
            output: {
                success: true;
                deletedBookmark: {
                    id: string;
                    userId: string;
                    createdAt: string;
                    linkUrl: string;
                    posts: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    };
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    url: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/bookmarks"> | import("hono/types").MergeSchemaPath<{
    "/by-month": {
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
                success: true;
                itemsByMonth: {
                    [x: string]: {
                        month: string;
                        year: number;
                        items: {
                            id: string;
                            pubDate: string;
                        }[];
                    };
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
} & {
    "/settings": {
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
                success: true;
                settings: {
                    id: string;
                    userId: string;
                    digestType: "email" | "rss";
                    scheduledTime: string;
                    topAmount: number;
                    splitServices: boolean;
                    hideReposts: boolean;
                    layout: "default" | "dense";
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
    "/settings": {
        $post: {
            input: {
                json: {
                    digestType: string;
                    time: string;
                    topAmount?: number | undefined;
                    splitServices?: boolean | undefined;
                    hideReposts?: boolean | undefined;
                    layout?: string | undefined;
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
                    digestType: string;
                    time: string;
                    topAmount?: number | undefined;
                    splitServices?: boolean | undefined;
                    hideReposts?: boolean | undefined;
                    layout?: string | undefined;
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
                    digestType: string;
                    time: string;
                    topAmount?: number | undefined;
                    splitServices?: boolean | undefined;
                    hideReposts?: boolean | undefined;
                    layout?: string | undefined;
                };
            };
            output: {
                success: true;
                settings: {
                    id: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    digestType: string;
                    time: string;
                    topAmount?: number | undefined;
                    splitServices?: boolean | undefined;
                    hideReposts?: boolean | undefined;
                    layout?: string | undefined;
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
    "/settings": {
        $delete: {
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
    "/feed/:userId": {
        $get: {
            input: {
                param: {
                    userId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                param: {
                    userId: string;
                };
            };
            output: {
                success: true;
                user: {
                    id: string;
                    name: string | null;
                };
                feed: {
                    title: string;
                    description: string | null;
                    feedUrl: string;
                    items: {
                        id: string;
                        title: string;
                        description: string | null;
                        html: string | null;
                        pubDate: string;
                    }[];
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                param: {
                    userId: string;
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
    "/item/:itemId": {
        $get: {
            input: {
                param: {
                    itemId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                param: {
                    itemId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                param: {
                    itemId: string;
                };
            };
            output: {
                success: true;
                feedItem: {
                    id: string;
                    json: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    }[];
                    pubDate: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                param: {
                    itemId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/digest"> | import("hono/types").MergeSchemaPath<{
    "/filter": {
        $get: {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    url?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    selectedList?: string | string[] | undefined;
                    minShares?: string | string[] | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    url?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    selectedList?: string | string[] | undefined;
                    minShares?: string | string[] | undefined;
                };
            };
            output: {
                uniqueActorsCount: number;
                link: {
                    id: string;
                    url: string;
                    title: string;
                    description: string | null;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                };
                posts: {
                    id: string;
                    linkUrl: string;
                    postUrl: string;
                    postText: string;
                    postDate: string;
                    postType: "bluesky" | "mastodon";
                    postImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    actorUrl: string;
                    actorHandle: string;
                    actorName: string | null;
                    actorAvatarUrl: string | null;
                    quotedActorUrl: string | null;
                    quotedActorHandle: string | null;
                    quotedActorName: string | null;
                    quotedActorAvatarUrl: string | null;
                    quotedPostUrl: string | null;
                    quotedPostText: string | null;
                    quotedPostDate: string | null;
                    quotedPostType: "bluesky" | "mastodon" | null;
                    quotedPostImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    repostActorUrl: string | null;
                    repostActorHandle: string | null;
                    repostActorName: string | null;
                    repostActorAvatarUrl: string | null;
                    userId: string;
                    listId: string | null;
                }[];
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    url?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    selectedList?: string | string[] | undefined;
                    minShares?: string | string[] | undefined;
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
    "/metadata": {
        $post: {
            input: {
                json: {
                    url: string;
                    metadata: {
                        title?: string | null | undefined;
                        description?: string | null | undefined;
                        imageUrl?: string | null | undefined;
                        metadata?: Record<string, unknown> | null | undefined;
                        publishedDate?: string | null | undefined;
                        authors?: string[] | null | undefined;
                        siteName?: string | null | undefined;
                        topics?: string[] | null | undefined;
                    };
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
                    url: string;
                    metadata: {
                        title?: string | null | undefined;
                        description?: string | null | undefined;
                        imageUrl?: string | null | undefined;
                        metadata?: Record<string, unknown> | null | undefined;
                        publishedDate?: string | null | undefined;
                        authors?: string[] | null | undefined;
                        siteName?: string | null | undefined;
                        topics?: string[] | null | undefined;
                    };
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    url: string;
                    metadata: {
                        title?: string | null | undefined;
                        description?: string | null | undefined;
                        imageUrl?: string | null | undefined;
                        metadata?: Record<string, unknown> | null | undefined;
                        publishedDate?: string | null | undefined;
                        authors?: string[] | null | undefined;
                        siteName?: string | null | undefined;
                        topics?: string[] | null | undefined;
                    };
                };
            };
            output: {
                success: true;
                link: {
                    id: string;
                    url: string;
                    title: string;
                    description: string | null;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    url: string;
                    metadata: {
                        title?: string | null | undefined;
                        description?: string | null | undefined;
                        imageUrl?: string | null | undefined;
                        metadata?: Record<string, unknown> | null | undefined;
                        publishedDate?: string | null | undefined;
                        authors?: string[] | null | undefined;
                        siteName?: string | null | undefined;
                        topics?: string[] | null | undefined;
                    };
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
    "/author": {
        $get: {
            input: {
                query: {
                    author: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
                };
            };
            output: {
                posts: {
                    id: string;
                    linkUrl: string;
                    postUrl: string;
                    postText: string;
                    postDate: string;
                    postType: "bluesky" | "mastodon";
                    postImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    actorUrl: string;
                    actorHandle: string;
                    actorName: string | null;
                    actorAvatarUrl: string | null;
                    quotedActorUrl: string | null;
                    quotedActorHandle: string | null;
                    quotedActorName: string | null;
                    quotedActorAvatarUrl: string | null;
                    quotedPostUrl: string | null;
                    quotedPostText: string | null;
                    quotedPostDate: string | null;
                    quotedPostType: "bluesky" | "mastodon" | null;
                    quotedPostImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    repostActorUrl: string | null;
                    repostActorHandle: string | null;
                    repostActorName: string | null;
                    repostActorAvatarUrl: string | null;
                    userId: string;
                    listId: string | null;
                }[];
                link: {
                    id: string;
                    url: string;
                    title: string;
                    description: string | null;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                } | null;
                uniqueActorsCount: number;
                mostRecentPostDate: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    author: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
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
    "/domain": {
        $get: {
            input: {
                query: {
                    domain: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
                };
            };
            output: {
                posts: {
                    id: string;
                    linkUrl: string;
                    postUrl: string;
                    postText: string;
                    postDate: string;
                    postType: "bluesky" | "mastodon";
                    postImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    actorUrl: string;
                    actorHandle: string;
                    actorName: string | null;
                    actorAvatarUrl: string | null;
                    quotedActorUrl: string | null;
                    quotedActorHandle: string | null;
                    quotedActorName: string | null;
                    quotedActorAvatarUrl: string | null;
                    quotedPostUrl: string | null;
                    quotedPostText: string | null;
                    quotedPostDate: string | null;
                    quotedPostType: "bluesky" | "mastodon" | null;
                    quotedPostImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    repostActorUrl: string | null;
                    repostActorHandle: string | null;
                    repostActorName: string | null;
                    repostActorAvatarUrl: string | null;
                    userId: string;
                    listId: string | null;
                }[];
                link: {
                    id: string;
                    url: string;
                    title: string;
                    description: string | null;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                } | null;
                uniqueActorsCount: number;
                mostRecentPostDate: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    domain: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
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
    "/topic": {
        $get: {
            input: {
                query: {
                    topic: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
                };
            };
            output: {
                posts: {
                    id: string;
                    linkUrl: string;
                    postUrl: string;
                    postText: string;
                    postDate: string;
                    postType: "bluesky" | "mastodon";
                    postImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    actorUrl: string;
                    actorHandle: string;
                    actorName: string | null;
                    actorAvatarUrl: string | null;
                    quotedActorUrl: string | null;
                    quotedActorHandle: string | null;
                    quotedActorName: string | null;
                    quotedActorAvatarUrl: string | null;
                    quotedPostUrl: string | null;
                    quotedPostText: string | null;
                    quotedPostDate: string | null;
                    quotedPostType: "bluesky" | "mastodon" | null;
                    quotedPostImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    repostActorUrl: string | null;
                    repostActorHandle: string | null;
                    repostActorName: string | null;
                    repostActorAvatarUrl: string | null;
                    userId: string;
                    listId: string | null;
                }[];
                link: {
                    id: string;
                    url: string;
                    title: string;
                    description: string | null;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                } | null;
                uniqueActorsCount: number;
                mostRecentPostDate: string;
            }[];
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    topic: string | string[];
                    page?: string | string[] | undefined;
                    pageSize?: string | string[] | undefined;
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
    "/process": {
        $post: {
            input: {
                json: {
                    type?: "bluesky" | "mastodon" | undefined;
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
                    type?: "bluesky" | "mastodon" | undefined;
                };
            };
            output: {
                success: true;
                processed: number;
                type: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    type?: "bluesky" | "mastodon" | undefined;
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
    "/": {
        $get: {
            input: {};
            output: {
                message: string;
                data: never[];
                count: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
} & {
    "/trending": {
        $get: {
            input: {};
            output: {
                uniqueActorsCount: number;
                link: {
                    id: string;
                    title: string;
                    description: string | null;
                    url: string;
                    imageUrl: string | null;
                    giftUrl: string | null;
                    metadata: {
                        [x: string]: never;
                    } | null;
                    scraped: boolean | null;
                    publishedDate: string | null;
                    authors: string[] | null;
                    siteName: string | null;
                    topics: string[] | null;
                } | null;
                posts?: {
                    id: string;
                    userId: string;
                    postType: "bluesky" | "mastodon";
                    linkUrl: string;
                    postUrl: string;
                    postText: string;
                    postDate: string;
                    postImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    actorUrl: string;
                    actorHandle: string;
                    actorName: string | null;
                    actorAvatarUrl: string | null;
                    quotedActorUrl: string | null;
                    quotedActorHandle: string | null;
                    quotedActorName: string | null;
                    quotedActorAvatarUrl: string | null;
                    quotedPostUrl: string | null;
                    quotedPostText: string | null;
                    quotedPostDate: string | null;
                    quotedPostType: "bluesky" | "mastodon" | null;
                    quotedPostImages: {
                        url: string;
                        alt: string;
                    }[] | null;
                    repostActorUrl: string | null;
                    repostActorHandle: string | null;
                    repostActorName: string | null;
                    repostActorAvatarUrl: string | null;
                    listId: string | null;
                    count: number;
                }[] | undefined;
                mostRecentPostDate: string;
            }[];
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
    "/:id": {
        $get: {
            input: {
                param: {
                    id: string;
                };
            };
            output: {
                message: string;
                data: null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        };
    };
}, "/api/links"> | import("hono/types").MergeSchemaPath<{
    "/": {
        $post: {
            input: {
                json: {
                    type: "bluesky" | "mastodon";
                    name: string;
                    uri: string;
                    accountId: string;
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
                    type: "bluesky" | "mastodon";
                    name: string;
                    uri: string;
                    accountId: string;
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
                    type: "bluesky" | "mastodon";
                    name: string;
                    uri: string;
                    accountId: string;
                };
            };
            output: {
                success: true;
                list: {
                    id: string;
                    uri: string;
                    name: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    type: "bluesky" | "mastodon";
                    name: string;
                    uri: string;
                    accountId: string;
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
    "/": {
        $delete: {
            input: {
                json: {
                    uri: string;
                    accountId: string;
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
                    uri: string;
                    accountId: string;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    uri: string;
                    accountId: string;
                };
            };
            output: {
                success: true;
                deleted: {
                    id: string;
                    uri: string;
                    name: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    uri: string;
                    accountId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/lists"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema, "/api/maintain-partitions"> | import("hono/types").MergeSchemaPath<{
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
                    code: string;
                    instance: string;
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
                    code: string;
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
                json: {
                    code: string;
                    instance: string;
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
                    code: string;
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
} & {
    "/lists": {
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
                lists: {
                    name: string;
                    uri: string;
                    type: "bluesky" | "mastodon";
                    subscribed: boolean;
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
}, "/api/mastodon"> | import("hono/types").MergeSchemaPath<{
    "/phrases": {
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
                phrases: {
                    id: string;
                    createdAt: string;
                    phrase: string;
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
    "/phrases": {
        $post: {
            input: {
                json: {
                    phrase: string;
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
                    phrase: string;
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
                    phrase: string;
                };
            };
            output: {
                success: true;
                mutePhrase: {
                    id: string;
                    phrase: string;
                    createdAt: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    phrase: string;
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
    "/phrases": {
        $delete: {
            input: {
                json: {
                    phrase: string;
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
                    phrase: string;
                };
            };
            output: {
                error: string;
                field: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                json: {
                    phrase: string;
                };
            };
            output: {
                success: true;
                deleted: {
                    id: string;
                    phrase: string;
                };
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    phrase: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/mute"> | import("hono/types").MergeSchemaPath<{
    "/send": {
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
}, "/api/newsletter"> | import("hono/types").MergeSchemaPath<{
    "/groups/:groupId": {
        $delete: {
            input: {
                param: {
                    groupId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                param: {
                    groupId: string;
                };
            };
            output: {
                result: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                param: {
                    groupId: string;
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
    "/test": {
        $post: {
            input: {
                json: {
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                            values?: {
                                id: string;
                                name: string;
                            }[] | undefined;
                        };
                        operator: string;
                    }[];
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
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                            values?: {
                                id: string;
                                name: string;
                            }[] | undefined;
                        };
                        operator: string;
                    }[];
                };
            };
            output: {
                count: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                            values?: {
                                id: string;
                                name: string;
                            }[] | undefined;
                        };
                        operator: string;
                    }[];
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
    "/groups/:notificationGroupId/feed": {
        $get: {
            input: {
                param: {
                    notificationGroupId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {
                param: {
                    notificationGroupId: string;
                };
            };
            output: {
                query: {
                    category: {
                        id: string;
                        name: string;
                        type: string;
                        values?: {
                            id: string;
                            name: string;
                        }[] | undefined;
                    };
                    operator: string;
                    value: string | number;
                }[];
                id: string;
                userId: string;
                name: string;
                createdAt: string;
                feedUrl: string | null;
                notificationType: "email" | "rss";
                seenLinks: string[];
                items: {
                    id: string;
                    createdAt: string;
                    notificationGroupId: string;
                    itemData: {
                        uniqueActorsCount: number;
                        link: {
                            id: string;
                            title: string;
                            description: string | null;
                            url: string;
                            imageUrl: string | null;
                            giftUrl: string | null;
                            metadata: {
                                [x: string]: never;
                            } | null;
                            scraped: boolean | null;
                            publishedDate: string | null;
                            authors: string[] | null;
                            siteName: string | null;
                            topics: string[] | null;
                        } | null;
                        posts?: {
                            id: string;
                            userId: string;
                            postType: "bluesky" | "mastodon";
                            linkUrl: string;
                            postUrl: string;
                            postText: string;
                            postDate: string;
                            postImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            actorUrl: string;
                            actorHandle: string;
                            actorName: string | null;
                            actorAvatarUrl: string | null;
                            quotedActorUrl: string | null;
                            quotedActorHandle: string | null;
                            quotedActorName: string | null;
                            quotedActorAvatarUrl: string | null;
                            quotedPostUrl: string | null;
                            quotedPostText: string | null;
                            quotedPostDate: string | null;
                            quotedPostType: "bluesky" | "mastodon" | null;
                            quotedPostImages: {
                                url: string;
                                alt: string;
                            }[] | null;
                            repostActorUrl: string | null;
                            repostActorHandle: string | null;
                            repostActorName: string | null;
                            repostActorAvatarUrl: string | null;
                            listId: string | null;
                        }[] | undefined;
                    };
                    itemHtml: string | null;
                }[];
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                param: {
                    notificationGroupId: string;
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
    "/groups": {
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
                query: {
                    category: {
                        id: string;
                        name: string;
                        type: string;
                        values?: {
                            id: string;
                            name: string;
                        }[] | undefined;
                    };
                    operator: string;
                    value: string | number;
                }[];
                id: string;
                userId: string;
                name: string;
                createdAt: string;
                feedUrl: string | null;
                notificationType: "email" | "rss";
                seenLinks: string[];
            }[];
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
    "/groups": {
        $post: {
            input: {
                json: {
                    name: string;
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                        };
                        operator: string;
                    }[];
                    format: "email" | "rss";
                    id?: string | undefined;
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
                    name: string;
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                        };
                        operator: string;
                    }[];
                    format: "email" | "rss";
                    id?: string | undefined;
                };
            };
            output: {
                success: true;
                id: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    name: string;
                    queries: {
                        value: string | number;
                        category: {
                            type: string;
                            id: string;
                            name: string;
                        };
                        operator: string;
                    }[];
                    format: "email" | "rss";
                    id?: string | undefined;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/notifications"> | import("hono/types").MergeSchemaPath<{
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
}, "/api/subscription"> | import("hono/types").MergeSchemaPath<{
    "/latest": {
        $get: {
            input: {};
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 404;
        } | {
            input: {};
            output: {
                id: string;
                termsDate: string;
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
    "/agreement": {
        $get: {
            input: {
                query: {
                    termsUpdateId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 401;
        } | {
            input: {
                query: {
                    termsUpdateId: string;
                };
            };
            output: {
                agreement: {
                    id: string;
                    userId: string;
                    createdAt: string | null;
                    termsUpdateId: string;
                } | null;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    termsUpdateId: string;
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
    "/agreement": {
        $post: {
            input: {
                json: {
                    termsUpdateId: string;
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
                    termsUpdateId: string;
                };
            };
            output: {
                success: true;
                message: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    termsUpdateId: string;
                };
            };
            output: {
                success: true;
                id: string;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                json: {
                    termsUpdateId: string;
                };
            };
            output: {
                error: string;
            };
            outputFormat: "json";
            status: 500;
        };
    };
}, "/api/terms"> | import("hono/types").MergeSchemaPath<import("hono/types").BlankSchema, "/api/update-accounts">, "/">;
export default app;
export type AppType = typeof routes;
