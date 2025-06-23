import { Heading } from "@radix-ui/themes";
import { Link } from "react-router";
import styles from "./logo.module.css";
import type { SubscriptionStatus } from "~/utils/auth.server";

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
