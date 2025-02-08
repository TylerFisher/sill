import { Link, Section, Text } from "@react-email/components";
import { daysRemaining } from "~/utils/misc";

const PlusTrial = ({ type, endDate }: { type: string; endDate: Date }) => {
	const remaining = daysRemaining(endDate);
	const days = remaining === 1 ? "day" : "days";
	return (
		<Section style={section}>
			<Text>
				You have {remaining} {days} remaining in your Sill+ free trial.{" "}
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/settings/subscription`}
					style={link}
				>
					Subscribe today
				</Link>{" "}
				to maintain access to your {type}.
			</Text>
		</Section>
	);
};

const section = {
	padding: "16px",
	backgroundColor: "#FEFCE9",
	margin: "16px 0",
};

const link = {
	color: "#9E6C00",
};

export default PlusTrial;
