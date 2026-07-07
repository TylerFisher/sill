import { Box, Button, Flex, Spinner, Text } from "@radix-ui/themes";
import { Check, ChevronDown, Lock } from "lucide-react";
import { type ReactNode, useState } from "react";
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
const PLUS_TIME = TIME_OPTIONS.filter((o) => o.plus);

const timeShort = (label: string) =>
	label.replace(" hours", "h").replace(" days", "d");

// Compact chip-group heading (module-level so it keeps a stable identity).
const Group = ({ label, children }: { label: string; children: ReactNode }) => (
	<Box mb="3">
		<Text
			as="p"
			size="1"
			color="gray"
			mb="2"
			style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
		>
			{label}
		</Text>
		<Flex wrap="wrap" gap="1">
			{children}
		</Flex>
	</Box>
);

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

	// ---- Compact chips (desktop) ----
	const chip = (active: boolean) =>
		`${styles.filterOption} ${active ? styles.active : ""}`;

	const chipContent = (text: string, pending: boolean) => (
		<Flex align="center" gap="1">
			<span>{text}</span>
			{pending && <Spinner size="1" />}
		</Flex>
	);

	const timeChip = (o: (typeof TIME_OPTIONS)[number]) => {
		const locked = !!o.plus && !isPlus;
		return (
			<button
				key={o.value}
				type="button"
				disabled={locked}
				className={chip(!locked && time === o.value)}
				style={locked ? { opacity: 0.55 } : undefined}
				onClick={locked ? undefined : () => setParam("time", o.value)}
			>
				<Flex align="center" gap="1">
					<span>{timeShort(o.label)}</span>
					{pendingGroup === "time" && time === o.value && <Spinner size="1" />}
					{locked && <Lock size={12} style={{ opacity: 0.5 }} />}
				</Flex>
			</button>
		);
	};

	return (
		<>
			<Group label="Time">
				<Flex wrap="wrap" gap="1" width="100%">
					{FREE_TIME.map(timeChip)}
				</Flex>
				<Flex wrap="wrap" gap="1" width="100%">
					{PLUS_TIME.map(timeChip)}
				</Flex>
			</Group>

			<Group label="Minimum shares">
				{sharesOptions.map((o) => (
					<button
						key={o.value}
						type="button"
						className={chip(minShares === o.value)}
						onClick={() => setParam("minShares", o.value)}
					>
						{chipContent(
							o.label,
							pendingGroup === "shares" && minShares === o.value,
						)}
					</button>
				))}
			</Group>

			<Group label="Reposts">
				{repostOptions.map((o) => (
					<button
						key={o.value}
						type="button"
						className={chip(reposts === o.value)}
						onClick={() => setParam("reposts", o.value)}
					>
						{chipContent(
							o.label,
							pendingGroup === "reposts" && reposts === o.value,
						)}
					</button>
				))}
			</Group>

			{showFrom && (
				<Group label="From">
					{fromOptions.map((o) => (
						<button
							key={o.value}
							type="button"
							className={chip(fromValue === o.value)}
							onClick={() => selectFrom(o.value)}
						>
							{chipContent(
								o.label,
								pendingGroup === "from" && fromValue === o.value,
							)}
						</button>
					))}
				</Group>
			)}
			{plusCallout}
		</>
	);
};

export default FilterPanel;
