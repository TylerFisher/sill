import { Heading } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import styles from "./Header.module.css";

const Header = ({ headerClass }: { headerClass: string }) => {
	return (
		<header className={styles[headerClass]}>
			<Heading size="9" className={styles["logo-heading"]} mb="4">
				<Link to="/" className={styles["logo-link"]}>
					Sill
				</Link>
			</Heading>
		</header>
	);
};

export default Header;
