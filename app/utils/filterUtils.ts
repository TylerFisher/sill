export const getCustomizedFilters = (searchParams: URLSearchParams) => {
	const customized: string[] = [];
	const defaults = {
		sort: "popularity",
		time: "24h",
		reposts: "false",
		service: "all",
		list: "all",
	};

	// Check URL params against defaults
	for (const [key, defaultValue] of Object.entries(defaults)) {
		const currentValue = searchParams.get(key);
		if (currentValue && currentValue !== defaultValue) {
			customized.push(key);
		}
	}

	// Check minShares (default is empty/undefined)
	if (searchParams.get("minShares")) {
		customized.push("minShares");
	}

	// Check search query
	if (searchParams.get("q")) {
		customized.push("search");
	}

	return customized;
};
