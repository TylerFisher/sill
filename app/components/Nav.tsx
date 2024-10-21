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
	{ to: "/links", label: "Home", icon: <HomeIcon /> },
	{
		to: "/connect",
		label: "Connect",
		icon: <LightningBoltIcon />,
	},
	{ to: "/email", label: "Daily Email", icon: <EnvelopeClosedIcon /> },
	{ to: "/moderation", label: "Moderation", icon: <EyeOpenIcon /> },
	{ to: "/settings/", label: "Profile", icon: <PersonIcon /> },
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
					{icon} {label}
				</Button>
			</Link>
		</li>
	);
};

export default Nav;
