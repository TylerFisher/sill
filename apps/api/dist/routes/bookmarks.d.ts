declare const bookmarks: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default bookmarks;
