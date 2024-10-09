import { Container, Heading } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import type { PropsWithChildren } from "react";

const Layout = ({ children }: PropsWithChildren) => (
	<Container size="2">
		<div
			style={{
				backgroundColor: "var(--accent-1)",
				padding: "1em",
				boxShadow: "var(--base-card-surface-box-shadow)",
				borderRadius: "1em",
				minHeight: "100vh",
			}}
		>
			{children}
		</div>
	</Container>
);

export default Layout;
