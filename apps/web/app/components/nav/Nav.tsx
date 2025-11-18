import { Button, Text } from "@radix-ui/themes";
import {
	Bell,
	Bookmark,
	CircleHelp,
	Link2,
	Mail,
	Settings,
	TrendingUp,
} from "lucide-react";
import type { ReactElement } from "react";
import { NavLink, useLocation, useRouteLoaderData } from "react-router";
import type { loader } from "~/root";
import { useTheme } from "~/routes/resources/theme-switch";
import Footer from "./Footer";
import styles from "./Nav.module.css";

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
			to: "/digest",
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
			to: "/settings",
			label: "Settings",
			icon: <Settings className={styles["nav-list-item-icon"]} />,
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
						<Button variant="soft">
							Upgrade to
							<Text
								style={{
									fontWeight: 900,
									fontStyle: "italic",
								}}
								ml="-1"
							>
								sill+
							</Text>
						</Button>
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
	const toEnding = to.split("/").pop() || "";
	const locationEnding = location.split("/").pop() || "";
	const theme = useTheme();

	return (
		<li className={styles["nav-list-item"]}>
			<NavLink to={to} aria-label={label} viewTransition>
				<Button
					variant="ghost"
					color={theme === "light" ? "yellow" : "gray"}
					size="4"
					className={styles["nav-list-item-btn"]}
					style={{
						color: locationEnding.includes(toEnding)
							? "var(--yellow-11)"
							: "var(--gray-a11)",
						fontWeight: locationEnding.includes(toEnding) ? "bold" : "normal",
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
