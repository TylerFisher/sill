import { Box, Button, Dialog, IconButton } from "@radix-ui/themes";
import { NavLink, useLocation } from "@remix-run/react";
import { Link2, Mail, Menu, MessageSquareOff, User, Zap } from "lucide-react";
import type { ReactElement } from "react";
import styles from "./Nav.module.css";
import Footer from "./Footer";

const Nav = ({
	layoutFormId,
	themeFormId,
}: { layoutFormId: string; themeFormId: string }) => {
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
		<>
			<nav className={styles.nav}>
				<ul className={styles["nav-list"]}>
					{navLinks.map((link) => (
						<NavItem key={link.to} {...link} location={location.pathname} />
					))}
				</ul>
			</nav>
			<Footer layoutFormId={layoutFormId} themeFormId={themeFormId} />
		</>
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
