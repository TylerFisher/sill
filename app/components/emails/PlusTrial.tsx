import { Link, Section, Text } from "@react-email/components";

const PlusTrial = ({ type }: { type: string }) => {
	return (
		<Section style={section}>
			<Text>
				You are on a free trial of Sill+.{" "}
				<Link
					href={`${import.meta.env.VITE_PUBLIC_DOMAIN}/settings/subscription`}
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

export default PlusTrial;
