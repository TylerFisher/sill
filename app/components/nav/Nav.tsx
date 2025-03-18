import { Button } from "@radix-ui/themes";
import { NavLink, useLocation, useRouteLoaderData } from "react-router";
import {
	Bell,
	Bookmark,
	CircleHelp,
	Link2,
	Mail,
	MessageSquareOff,
	TrendingUp,
	User,
	Zap,
} from "lucide-react";
import type { ReactElement } from "react";
import styles from "./Nav.module.css";
import Footer from "./Footer";
import type { loader } from "~/root";

const Nav = ({
	layoutFormId,
	themeFormId,
}: { layoutFormId: string; themeFormId: string }) => {
	const location = useLocation();
	let navLinks = [
		{
			to: "/links",
			label: "Links",
			icon: <Link2 className={styles["nav-list-item-icon"]} />,
			plus: false,
		},
		{
			to: "/links/trending",
			label: "Trending",
			icon: <TrendingUp className={styles["nav-list-item-icon"]} />,
			plus: false,
		},
		{
			to: "/bookmarks",
			label: "Bookmarks",
			icon: <Bookmark className={styles["nav-list-item-icon"]} />,
			plus: true,
		},
		{
			to: "/email",
			label: "Daily Digest",
			icon: <Mail className={styles["nav-list-item-icon"]} />,
			plus: true,
		},
		{
			to: "/notifications",
			label: "Notifications",
			icon: <Bell className={styles["nav-list-item-icon"]} />,
			plus: true,
		},
		{
			to: "/moderation",
			label: "Mute",
			icon: <MessageSquareOff className={styles["nav-list-item-icon"]} />,
			plus: false,
		},
		{
			to: "/connect",
			label: "Connect",
			icon: <Zap className={styles["nav-list-item-icon"]} />,
			plus: false,
		},
		{
			to: "/settings",
			label: "Account",
			icon: <User className={styles["nav-list-item-icon"]} />,
			plus: false,
		},
		{
			to: "https://docs.sill.social",
			label: "Help",
			icon: <CircleHelp className={styles["nav-list-item-icon"]} />,
		},
	];
	const data = useRouteLoaderData<typeof loader>("root");
	if (data?.subscribed === "free") {
		navLinks = navLinks.filter((link) => !link.plus);
	}

	return (
		<>
			<nav className={styles.nav}>
				<ul className={styles["nav-list"]}>
					{navLinks.map((link) => (
						<NavItem key={link.to} {...link} location={location.pathname} />
					))}
				</ul>
				{data?.subscribed === "free" && (
					<NavLink to="/settings/subscription">
						<Button variant="soft">Upgrade to Sill+</Button>
					</NavLink>
				)}
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
						color: location === to ? "var(--accent-11)" : "var(--gray-a11)",
						fontWeight: location === to ? "bold" : "normal",
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
