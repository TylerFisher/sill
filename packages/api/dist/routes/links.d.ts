declare const links: import("hono/hono-base").HonoBase<import("hono/types").BlankEnv, {
    "/filter": {
        $get: {
            input: {
                query: {
                    url?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    page?: string | string[] | undefined;
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
                    url?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    page?: string | string[] | undefined;
                    selectedList?: string | string[] | undefined;
                    minShares?: string | string[] | undefined;
                };
            };
            output: {
                links: never[];
                totalCount: number;
                page: number;
                hasMore: boolean;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
        } | {
            input: {
                query: {
                    url?: string | string[] | undefined;
                    service?: string | string[] | undefined;
                    hideReposts?: string | string[] | undefined;
                    query?: string | string[] | undefined;
                    sort?: string | string[] | undefined;
                    limit?: string | string[] | undefined;
                    fetch?: string | string[] | undefined;
                    time?: string | string[] | undefined;
                    page?: string | string[] | undefined;
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
                message: string;
                data: never[];
                count: number;
            };
            outputFormat: "json";
            status: import("hono/utils/http-status").ContentfulStatusCode;
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
