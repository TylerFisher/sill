import { Button } from "@radix-ui/themes";
import { Link, NavLink, useLocation } from "@remix-run/react";
import { Home, Link2, Mail, MessageSquareOff, User, Zap } from "lucide-react";
import type { ReactElement } from "react";
import styles from "./Nav.module.css";

const Nav = () => {
	const location = useLocation();
	const navLinks = [
		{
			to: "/links",
			label: "Links",
			icon: <Link2 className={styles["nav-list-item-icon"]} />,
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
			label: "Account",
			icon: <User className={styles["nav-list-item-icon"]} />,
		},
	];
	return (
		<nav className={styles.nav}>
			<ul className={styles["nav-list"]}>
				{navLinks.map((link) => (
					<NavItem key={link.to} {...link} location={location.pathname} />
				))}
			</ul>
		</nav>
	);
};

const NavItem = ({
	to,
	label,
	icon,
	location,
}: { to: string; label: string; icon: ReactElement; location: string }) => {
	return (
		<li className={styles["nav-list-item"]}>
			<NavLink to={to} aria-label={label} viewTransition>
				<Button
					variant="ghost"
					size="4"
					className={styles["nav-list-item-btn"]}
					style={{
						color: location.includes(to)
							? "var(--accent-11)"
							: "var(--gray-a11)",
						fontWeight: location.includes(to) ? "bold" : "normal",
					}}
					aria-label={label}
				>
					{icon} <span className={styles["nav-list-item-label"]}>{label}</span>
				</Button>
			</NavLink>
		</li>
	);
};

export default Nav;
