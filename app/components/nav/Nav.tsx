import { Link, useLocation } from "@remix-run/react";
import styles from "./Nav.module.css";
import { Button } from "@radix-ui/themes";
import type { ReactElement } from "react";
import { Home, Mail, MessageSquareOff, User, Zap } from "lucide-react";

const Nav = () => {
	const location = useLocation();
	const navLinks = [
		{
			to: "/links",
			label: "Home",
			icon: <Home className={styles["nav-list-item-icon"]} />,
		},
		{
			to: "/connect",
			label: "Connect",
			icon: <Zap className={styles["nav-list-item-icon"]} />,
		},
		{
			to: "/email",
			label: "Daily Email",
			icon: <Mail className={styles["nav-list-item-icon"]} />,
		},
		{
			to: "/moderation",
			label: "Mute",
			icon: <MessageSquareOff className={styles["nav-list-item-icon"]} />,
		},
		{
			to: "/settings",
			label: "Profile",
			icon: <User className={styles["nav-list-item-icon"]} />,
		},
	];
	return (
		<nav className={styles.nav}>
			<ul className={styles["nav-list"]}>
				{navLinks.map((link) => (
					<NavLink key={link.to} {...link} location={location.pathname} />
				))}
			</ul>
		</nav>
	);
};

const NavLink = ({
	to,
	label,
	icon,
	location,
}: { to: string; label: string; icon: ReactElement; location: string }) => {
	return (
		<li className={styles["nav-list-item"]}>
			<Link to={to} aria-label={label}>
				<Button
					variant="ghost"
					size="4"
					className={styles["nav-list-item-btn"]}
					style={{
						color: location === to ? "var(--accent-11)" : "var(--gray-a11)",
						fontWeight: location === to ? "bold" : "normal",
					}}
					aria-label={label}
				>
					{icon} <span className={styles["nav-list-item-label"]}>{label}</span>
				</Button>
			</Link>
		</li>
	);
};

export default Nav;
