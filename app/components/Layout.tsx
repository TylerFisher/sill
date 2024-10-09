import { Container, Heading } from "@radix-ui/themes";
import { Link } from "@remix-run/react";
import type { PropsWithChildren } from "react";

const Layout = ({ children }: PropsWithChildren) => (
	<Container size="2">
		<Heading
			size="9"
			style={{
				fontWeight: 900,
				fontStyle: "italic",
				textAlign: "center",
				color: "var(--accent-11)",
				textTransform: "lowercase",
			}}
			my="4"
		>
			<Link
				to="/"
				style={{
					color: "inherit",
					textDecoration: "none",
				}}
			>
				Sill
			</Link>
		</Heading>
		<div
			style={{
				backgroundColor: "var(--accent-1)",
				padding: "1em",
				boxShadow: "var(--base-card-surface-box-shadow)",
				borderRadius: "1em",
			}}
		>
			{children}
		</div>
	</Container>
);

export default Layout;
