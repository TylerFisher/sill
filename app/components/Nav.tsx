import { Link } from "@remix-run/react";
import styles from "./Nav.module.css";
import { Button } from "@radix-ui/themes";
import type { ReactElement } from "react";
import {
	EyeOpenIcon,
	HomeIcon,
	LightningBoltIcon,
	PersonIcon,
} from "@radix-ui/react-icons";

const navLinks = [
	{ to: "/links", label: "Home", icon: <HomeIcon /> },
	{
		to: "/connect",
		label: "Connect your socials",
		icon: <LightningBoltIcon />,
	},
	{ to: "/moderation", label: "Moderation settings", icon: <EyeOpenIcon /> },
	{ to: "/settings/", label: "Profile", icon: <PersonIcon /> },
];

const Nav = () => {
	return (
		<nav className={styles.nav}>
			<ul className={styles.ul}>
				{navLinks.map((link) => (
					<NavLink key={link.to} {...link} />
				))}
			</ul>
		</nav>
	);
};

const NavLink = ({
	to,
	label,
	icon,
}: { to: string; label: string; icon: ReactElement }) => {
	return (
		<li>
			<Link to={to}>
				<Button
					variant="ghost"
					size="4"
					style={{
						width: "100%",
						justifyContent: "flex-start",
					}}
				>
					{icon} {label}
				</Button>
			</Link>
		</li>
	);
};

export default Nav;
