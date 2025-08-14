declare const links: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default links;
