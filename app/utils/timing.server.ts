export type Timings = Record<
	string,
	Array<
		{ desc?: string } & (
			| { time: number; start?: never }
			| { time?: never; start: number }
		)
	>
>;

export function makeTimings(type: string, desc?: string) {
	const timings: Timings = {
		[type]: [{ desc, start: performance.now() }],
	};
	Object.defineProperty(timings, "toString", {
		value: () => {
			return getServerTimeHeader(timings);
		},
		enumerable: false,
	});
	return timings;
}

function createTimer(type: string, desc?: string) {
	const start = performance.now();
	return {
		end(timings: Timings) {
			let timingType = timings[type];

			if (!timingType) {
				timingType = timings[type] = [];
			}
			timingType.push({ desc, time: performance.now() - start });
		},
	};
}

export async function time<ReturnType>(
	fn: Promise<ReturnType> | (() => ReturnType | Promise<ReturnType>),
	{
		type,
		desc,
		timings,
	}: {
		type: string;
		desc?: string;
		timings?: Timings;
	},
): Promise<ReturnType> {
	const timer = createTimer(type, desc);
	const promise = typeof fn === "function" ? fn() : fn;
	if (!timings) return promise;

	const result = await promise;

	timer.end(timings);
	return result;
}

export function getServerTimeHeader(timings?: Timings) {
	if (!timings) return "";
	return Object.entries(timings)
		.map(([key, timingInfos]) => {
			const dur = timingInfos
				.reduce((acc, timingInfo) => {
					const time = timingInfo.time ?? performance.now() - timingInfo.start;
					return acc + time;
				}, 0)
				.toFixed(1);
			const desc = timingInfos
				.map((t) => t.desc)
				.filter(Boolean)
				.join(" & ");
			return [
				key.replaceAll(/(:| |@|=|;|,|\/|\\)/g, "_"),
				desc ? `desc=${JSON.stringify(desc)}` : null,
				`dur=${dur}`,
			]
				.filter(Boolean)
				.join(";");
		})
		.join(",");
}
