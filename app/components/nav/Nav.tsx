import { Link, useLocation } from "@remix-run/react";
import styles from "./Nav.module.css";
import { Button } from "@radix-ui/themes";
import type { ReactElement } from "react";
import {
	EnvelopeClosedIcon,
	EyeOpenIcon,
	HomeIcon,
	LightningBoltIcon,
	PersonIcon,
} from "@radix-ui/react-icons";

const navLinks = [
	{
		to: "/links",
		label: "Home",
		icon: <HomeIcon className={styles["nav-list-item-icon"]} />,
	},
	{
		to: "/connect",
		label: "Connect",
		icon: <LightningBoltIcon className={styles["nav-list-item-icon"]} />,
	},
	{
		to: "/email",
		label: "Daily Email",
		icon: <EnvelopeClosedIcon className={styles["nav-list-item-icon"]} />,
	},
	{
		to: "/moderation",
		label: "Moderation",
		icon: <EyeOpenIcon className={styles["nav-list-item-icon"]} />,
	},
	{
		to: "/settings/",
		label: "Profile",
		icon: <PersonIcon className={styles["nav-list-item-icon"]} />,
	},
];

const Nav = () => {
	return (
		<nav className={styles.nav}>
			<ul className={styles["nav-list"]}>
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
	const location = useLocation();
	return (
		<li className={styles["nav-list-item"]}>
			<Link to={to}>
				<Button
					variant="ghost"
					size="4"
					className={styles["nav-list-item-btn"]}
					style={{
						fontWeight: location.pathname === to ? "bold" : "normal",
					}}
				>
					{icon} <span className={styles["nav-list-item-label"]}>{label}</span>
				</Button>
			</Link>
		</li>
	);
};

export default Nav;
