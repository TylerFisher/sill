declare const digest: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default digest;
