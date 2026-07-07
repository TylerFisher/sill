import {
	Box,
	Button,
	Flex,
	Select,
	Slider,
	Spinner,
	Text,
} from "@radix-ui/themes";
import { Check, ChevronDown, Lock } from "lucide-react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import SillPlus from "~/components/subscription/SillPlus";
import { TIME_OPTIONS } from "~/utils/timeRange";
import styles from "./PresetFilterItem.module.css";

const sharesOptions = [
	{ value: "", label: "1+" },
	{ value: "2", label: "2+" },
	{ value: "3", label: "3+" },
	{ value: "5", label: "5+" },
	{ value: "10", label: "10+" },
];

const repostOptions = [
	{ value: "", label: "With reposts" },
	{ value: "exclude", label: "No reposts" },
	{ value: "only", label: "Reposts only" },
];

const FREE_TIME = TIME_OPTIONS.filter((o) => !o.plus);

const timeShort = (label: string) =>
	label.replace(" hours", "h").replace(" days", "d");

interface FilterPanelProps {
	// "chips" = compact desktop popover; "rows" = big mobile full-screen rows.
	variant: "chips" | "rows";
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

const FilterPanel = ({
	variant,
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
	// Which mobile accordion group is expanded (one at a time).
	const [expanded, setExpanded] = useState<string | null>(null);
	// Desktop slider thumb positions while dragging, so the label tracks the
	// thumb live but the filter (and its reload) only commits on release.
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

	// A single, unobtrusive promotion of the panel's Sill+ capabilities, instead
	// of a "sill+" tag scattered on every locked row.
	const plusCallout = !isPlus ? (
		<Flex
			direction="column"
			gap="1"
			mt="4"
			p="3"
			style={{
				background: "var(--gray-a2)",
				borderRadius: "var(--radius-3)",
			}}
		>
			<Text as="p" size="2">
				Look back up to 30 days and save filters as views with <SillPlus />.
			</Text>
			<Button asChild size="1" variant="ghost" style={{ width: "fit-content" }}>
				<RouterLink to="/settings/subscription">Upgrade now</RouterLink>
			</Button>
		</Flex>
	) : null;

	// ---- Collapsible groups (mobile) ----
	if (variant === "rows") {
		const row = (
			key: string,
			label: string,
			selected: boolean,
			onClick: () => void,
			opts: { locked?: boolean; pending?: boolean } = {},
		) => {
			const { locked = false, pending = false } = opts;
			return (
				<button
					key={key}
					type="button"
					className={`${styles.filterRow} ${
						selected && !locked ? styles.active : ""
					}`}
					disabled={locked}
					onClick={locked ? undefined : onClick}
				>
					<span>{label}</span>
					<Flex align="center" gap="2" style={{ flexShrink: 0 }}>
						{locked && <Lock size={16} style={{ opacity: 0.5 }} />}
						{pending ? (
							<Spinner size="2" />
						) : (
							selected && !locked && <Check size={18} />
						)}
					</Flex>
				</button>
			);
		};

		const label = (
			options: { value: string; label: string }[],
			value: string,
		) => options.find((o) => o.value === value)?.label ?? options[0].label;

		const groups = [
			{
				key: "time",
				label: "Time",
				value: label(TIME_OPTIONS, time),
				render: () =>
					TIME_OPTIONS.map((o) =>
						row(
							o.value,
							o.label,
							time === o.value,
							() => setParam("time", o.value),
							{
								locked: !!o.plus && !isPlus,
								pending: pendingGroup === "time" && time === o.value,
							},
						),
					),
			},
			{
				key: "shares",
				label: "Minimum shares",
				value: `${label(sharesOptions, minShares)} shares`,
				render: () =>
					sharesOptions.map((o) =>
						row(
							o.value,
							`${o.label} shares`,
							minShares === o.value,
							() => setParam("minShares", o.value),
							{ pending: pendingGroup === "shares" && minShares === o.value },
						),
					),
			},
			{
				key: "reposts",
				label: "Reposts",
				value: label(repostOptions, reposts),
				render: () =>
					repostOptions.map((o) =>
						row(
							o.value,
							o.label,
							reposts === o.value,
							() => setParam("reposts", o.value),
							{ pending: pendingGroup === "reposts" && reposts === o.value },
						),
					),
			},
			...(showFrom
				? [
						{
							key: "from",
							label: "From",
							value: label(fromOptions, fromValue),
							render: () =>
								fromOptions.map((o) =>
									row(
										o.value,
										o.label,
										fromValue === o.value,
										() => selectFrom(o.value),
										{
											pending: pendingGroup === "from" && fromValue === o.value,
										},
									),
								),
						},
					]
				: []),
		];

		return (
			<Box>
				{groups.map((g) => {
					const open = expanded === g.key;
					return (
						<Box key={g.key}>
							<button
								type="button"
								className={styles.accordionHeader}
								onClick={() => setExpanded(open ? null : g.key)}
							>
								<span>{g.label}</span>
								<Flex
									align="center"
									gap="2"
									style={{ color: "var(--gray-10)", flexShrink: 0 }}
								>
									<span>{g.value}</span>
									<ChevronDown
										size={16}
										className={`${styles.accordionChevron} ${
											open ? styles.open : ""
										}`}
									/>
								</Flex>
							</button>
							{open && <Box pl="2">{g.render()}</Box>}
						</Box>
					);
				})}
				{plusCallout}
			</Box>
		);
	}

	// ---- Expanded controls (desktop sidebar) ----
	// Time and minimum shares are ordered scales, so a slider reads more
	// naturally here than a row of chips. Steps map to the preset options; free
	// users only get the windows up to 24h (the Sill+ callout covers the rest).
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
			{plusCallout}
		</>
	);
};

export default FilterPanel;
