import { Box, Flex, Select, Slider, Spinner, Text } from "@radix-ui/themes";
import { useState } from "react";
import { TIME_OPTIONS } from "~/utils/timeRange";

const repostOptions = [
	{ value: "", label: "With reposts" },
	{ value: "exclude", label: "No reposts" },
	{ value: "only", label: "Reposts only" },
];

const FREE_TIME = TIME_OPTIONS.filter((o) => !o.plus);

const timeShort = (label: string) =>
	label.replace(" hours", "h").replace(" days", "d");

interface FilterPanelProps {
	time: string;
	minShares: string;
	reposts: string;
	fromValue: string;
	isPlus: boolean;
	showService: boolean;
	lists: { id: string; name: string }[];
	setParam: (key: "time" | "minShares" | "reposts", value: string) => void;
	selectFrom: (value: string) => void;
	// Which group ("time" | "shares" | "reposts" | "from") is currently loading.
	pendingGroup: string | null;
}

/**
 * The feed filter controls: Time and Minimum shares as sliders, Reposts and
 * From as selects. One UI shared by the desktop sidebar and the mobile Filters
 * dialog.
 */
const FilterPanel = ({
	time,
	minShares,
	reposts,
	fromValue,
	isPlus,
	showService,
	lists,
	setParam,
	selectFrom,
	pendingGroup,
}: FilterPanelProps) => {
	// Slider thumb positions while dragging, so the label tracks the thumb live
	// but the filter (and its reload) only commits on release.
	const [timeDrag, setTimeDrag] = useState<number | null>(null);
	const [sharesDrag, setSharesDrag] = useState<number | null>(null);

	const fromOptions = [
		{ value: "all", label: "Everywhere" },
		...(showService
			? [
					{ value: "service:bluesky", label: "Bluesky" },
					{ value: "service:mastodon", label: "Mastodon" },
				]
			: []),
		...lists.map((l) => ({ value: `list:${l.id}`, label: l.name })),
	];
	const showFrom = fromOptions.length > 1;

	// Time and minimum shares are ordered scales, so a slider reads more
	// naturally than a row of chips. Steps map to the preset options; free users
	// only get the windows up to 24h.
	const timeSteps = isPlus ? TIME_OPTIONS : FREE_TIME;
	const foundTime = timeSteps.findIndex((o) => o.value === time);
	const timeIdx =
		foundTime >= 0
			? foundTime
			: Math.max(
					0,
					timeSteps.findIndex((o) => o.value === ""),
				);
	const displayTimeIdx = timeDrag ?? timeIdx;
	// Shares is a plain 1–10 continuum (1 = no filter), not the preset steps.
	const parsedShares = Number.parseInt(minShares, 10);
	const sharesValue = Number.isFinite(parsedShares)
		? Math.min(10, Math.max(1, parsedShares))
		: 1;
	const displayShares = sharesDrag ?? sharesValue;

	const sliderHeader = (label: string, value: string, pending: boolean) => (
		<Flex justify="between" align="center" mb="2">
			<Text
				as="span"
				size="1"
				color="gray"
				style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
			>
				{label}
			</Text>
			<Flex align="center" gap="1">
				<Text size="2" weight="medium">
					{value}
				</Text>
				{pending && <Spinner size="1" />}
			</Flex>
		</Flex>
	);

	const sliderTicks = (left: string, right: string) => (
		<Flex justify="between" mt="1">
			<Text size="1" color="gray">
				{left}
			</Text>
			<Text size="1" color="gray">
				{right}
			</Text>
		</Flex>
	);

	return (
		<>
			<Box mb="4">
				{sliderHeader(
					"Time",
					timeSteps[displayTimeIdx].label,
					pendingGroup === "time",
				)}
				<Slider
					value={[displayTimeIdx]}
					min={0}
					max={timeSteps.length - 1}
					step={1}
					size="2"
					aria-label="Time window"
					onValueChange={([v]) => setTimeDrag(v)}
					onValueCommit={([v]) => {
						setTimeDrag(null);
						setParam("time", timeSteps[v].value);
					}}
				/>
				{sliderTicks(
					timeShort(timeSteps[0].label),
					timeShort(timeSteps[timeSteps.length - 1].label),
				)}
			</Box>

			<Box mb="4">
				{sliderHeader(
					"Minimum shares",
					`${displayShares}+ shares`,
					pendingGroup === "shares",
				)}
				<Slider
					value={[displayShares]}
					min={1}
					max={10}
					step={1}
					size="2"
					aria-label="Minimum shares"
					onValueChange={([v]) => setSharesDrag(v)}
					onValueCommit={([v]) => {
						setSharesDrag(null);
						setParam("minShares", v <= 1 ? "" : String(v));
					}}
				/>
				{sliderTicks("1+", "10+")}
			</Box>

			<Box mb="4">
				<Flex justify="between" align="center" mb="2">
					<Text
						as="span"
						size="1"
						color="gray"
						style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
					>
						Reposts
					</Text>
					{pendingGroup === "reposts" && <Spinner size="1" />}
				</Flex>
				{/* The default ("with reposts") is an empty param, but Radix Select
				    forbids empty item values, so it rides under "include" here. */}
				<Select.Root
					value={reposts || "include"}
					onValueChange={(v) => setParam("reposts", v === "include" ? "" : v)}
					size="2"
				>
					<Select.Trigger
						variant="soft"
						color="gray"
						aria-label="Reposts"
						style={{ width: "100%", color: "var(--gray-12)" }}
					/>
					<Select.Content>
						{repostOptions.map((o) => (
							<Select.Item key={o.value || "include"} value={o.value || "include"}>
								{o.label}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Box>

			{showFrom && (
				<Box mb="4">
					<Flex justify="between" align="center" mb="2">
						<Text
							as="span"
							size="1"
							color="gray"
							style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
						>
							From
						</Text>
						{pendingGroup === "from" && <Spinner size="1" />}
					</Flex>
					<Select.Root value={fromValue} onValueChange={selectFrom} size="2">
						<Select.Trigger
							variant="soft"
							color="gray"
							aria-label="From"
							style={{ width: "100%", color: "var(--gray-12)" }}
						/>
						<Select.Content>
							{fromOptions.map((o) => (
								<Select.Item key={o.value} value={o.value}>
									{o.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select.Root>
				</Box>
			)}
		</>
	);
};

export default FilterPanel;
