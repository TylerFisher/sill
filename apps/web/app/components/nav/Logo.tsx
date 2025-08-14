import { Heading } from "@radix-ui/themes";
import { Link } from "react-router";
import type { SubscriptionStatus } from "@sill/schema";
import styles from "./logo.module.css";

const Logo = ({
	extraBig,
	subscribed,
}: { extraBig?: boolean; subscribed?: SubscriptionStatus | null }) => {
	return (
		<Heading
			size={{
				initial: extraBig ? "9" : "8",
				md: "9",
			}}
			className={extraBig ? styles["big-logo-heading"] : styles["logo-heading"]}
			mb="2"
		>
			<Link to="/" className={styles["logo-link"]}>
				Sill{subscribed === "plus" && "+"}
			</Link>
		</Heading>
	);
};

export default Logo;
