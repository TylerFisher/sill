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
}, "/">;
export default auth;
