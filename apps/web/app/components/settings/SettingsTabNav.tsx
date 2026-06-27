import { Box, Select, TabNav } from "@radix-ui/themes";
import { Link, useLocation, useNavigate } from "react-router";

const tabs = [
	{ to: "/settings/account", label: "Account" },
	{ to: "/settings/connections", label: "Connections" },
	{ to: "/settings/moderation", label: "Moderation" },
	{ to: "/settings/subscription", label: "Subscription" },
];

export default function SettingsTabNav() {
	const location = useLocation();
	const navigate = useNavigate();
	const current =
		tabs.find((tab) => tab.to === location.pathname)?.to ?? tabs[0].to;

	return (
		<>
			{/* Mobile: a full-width dropdown — four full-word tabs overflow a phone's
			    width, and Radix's scrolling tab bar hides the cut-off tabs. */}
			<Box display={{ initial: "block", sm: "none" }} mb="4">
				<Select.Root value={current} onValueChange={(value) => navigate(value)}>
					<Select.Trigger style={{ width: "100%" }} />
					<Select.Content>
						{tabs.map((tab) => (
							<Select.Item key={tab.to} value={tab.to}>
								{tab.label}
							</Select.Item>
						))}
					</Select.Content>
				</Select.Root>
			</Box>

			{/* Desktop: the tab bar. */}
			<Box display={{ initial: "none", sm: "block" }}>
				<TabNav.Root mb="4">
					{tabs.map((tab) => (
						<TabNav.Link
							key={tab.to}
							asChild
							active={location.pathname === tab.to}
						>
							<Link to={tab.to}>{tab.label}</Link>
						</TabNav.Link>
					))}
				</TabNav.Root>
			</Box>
		</>
	);
}
