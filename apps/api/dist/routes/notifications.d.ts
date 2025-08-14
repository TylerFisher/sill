declare const notifications: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
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
}, "/">;
export default notifications;
