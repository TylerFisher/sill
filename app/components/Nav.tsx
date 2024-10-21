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
	{ to: "/links", label: "Home", icon: <HomeIcon width="18" height="18" /> },
	{
		to: "/connect",
		label: "Connect",
		icon: <LightningBoltIcon width="18" height="18" />,
	},
	{
		to: "/email",
		label: "Daily Email",
		icon: <EnvelopeClosedIcon width="18" height="18" />,
	},
	{
		to: "/moderation",
		label: "Moderation",
		icon: <EyeOpenIcon width="18" height="18" />,
	},
	{
		to: "/settings/",
		label: "Profile",
		icon: <PersonIcon width="18" height="18" />,
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
					{icon} {label}
				</Button>
			</Link>
		</li>
	);
};

export default Nav;
