interface FilterArgs {
    userId: string;
    time?: number;
    hideReposts?: boolean;
    sort?: string;
    query?: string | undefined;
    service?: "mastodon" | "bluesky" | "all";
    page?: number;
    fetch?: boolean;
    selectedList?: string;
    limit?: number;
    url?: string;
    minShares?: number;
}
/**
 * Filter link occurrences for a user
 * TODO: Implement the full logic from the web package
 */
export declare const filterLinkOccurrences: ({ userId, time, hideReposts, sort, query, service, page, fetch, selectedList, limit, url, minShares, }: FilterArgs) => Promise<{
    links: never[];
    totalCount: number;
    page: number;
    hasMore: boolean;
}>;
export {};
