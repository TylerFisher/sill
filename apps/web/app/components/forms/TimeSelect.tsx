import { Box, Select, Text } from "@radix-ui/themes";

interface TimeSelectProps {
	value: string | undefined;
	onChange: (value: string) => void;
	name?: string;
	label?: string;
	size?: "1" | "2" | "3";
}

function getTimeZone() {
	const dateFormatter = new Intl.DateTimeFormat("en-US", {
		timeZoneName: "short",
	});
	const dateParts = dateFormatter.formatToParts(new Date());
	return dateParts.find((part) => part.type === "timeZoneName")?.value;
}

function generateHours(timeZone: string | undefined) {
	return Array.from({ length: 24 }, (_, i) => {
		const hour = i % 12 || 12;
		const period = i < 12 ? "a.m." : "p.m.";
		return {
			label: `${hour.toString().padStart(2, "0")}:00 ${period} ${timeZone}`,
			localHour: i,
		};
	});
}

function localHourToUtc(localHour: number): string {
	const localDate = new Date();
	localDate.setHours(localHour, 0, 0, 0);
	return localDate.toISOString().substring(11, 16);
}

export function utcToLocalHour(utcTime: string): number {
	const utcDate = new Date(`2000-01-01T${utcTime}Z`);
	return utcDate.getHours();
}

export function formatUtcTimeAsLocal(utcTime: string): string {
	const timeZone = getTimeZone();
	const hours = generateHours(timeZone);
	const localHour = utcToLocalHour(utcTime);
	return hours[localHour]?.label ?? utcTime;
}

export default function TimeSelect({
	value,
	onChange,
	name = "time",
	label = "Delivery time",
	size = "3",
}: TimeSelectProps) {
	const timeZone = getTimeZone();
	const hours = generateHours(timeZone);

	return (
		<Box>
			{label && (
				<Text as="label" size={size} htmlFor={name} weight="medium">
					{label}
				</Text>
			)}
			<Select.Root
				name={name}
				value={value}
				onValueChange={onChange}
				size={size}
			>
				<Select.Trigger placeholder="Select a time" />
				<Select.Content position="popper">
					{hours.map(({ label, localHour }) => {
						const utcValue = localHourToUtc(localHour);
						return (
							<Select.Item key={localHour} value={utcValue}>
								{label}
							</Select.Item>
						);
					})}
				</Select.Content>
			</Select.Root>
		</Box>
	);
}
