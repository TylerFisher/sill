import { Heading, Text } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import styles from "./logo.module.css";

const Logo = ({ extraBig }: { extraBig?: boolean }) => {
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
				Sill
				<Text
					size={{
						initial: "1",
						md: "3",
					}}
					weight="regular"
					style={{
						fontStyle: "normal",
					}}
				>
					(beta)
				</Text>
			</Link>
		</Heading>
	);
};

export default Logo;
