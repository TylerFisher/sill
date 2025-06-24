import { TabNav } from "@radix-ui/themes";
import { Link, useLocation } from "react-router";

export default function SettingsTabNav() {
	const location = useLocation();

	return (
		<TabNav.Root mb="4">
			<TabNav.Link asChild active={location.pathname === "/settings/account"}>
				<Link to="/settings/account">Account</Link>
			</TabNav.Link>
			<TabNav.Link asChild active={location.pathname === "/settings/connections"}>
				<Link to="/settings/connections">Connections</Link>
			</TabNav.Link>
			<TabNav.Link asChild active={location.pathname === "/settings/moderation"}>
				<Link to="/settings/moderation">Moderation</Link>
			</TabNav.Link>
		</TabNav.Root>
	);
}