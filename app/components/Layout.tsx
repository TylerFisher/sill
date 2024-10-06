import { Container, Heading } from "@radix-ui/themes";
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
			}}
			my="4"
		>
			sill
		</Heading>
		<div
			style={{
				backgroundColor: "var(--accent-1)",
				padding: "1em",
				border: "1px solid var(--gray-a4)",
				borderRadius: "1em",
			}}
		>
			{children}
		</div>
	</Container>
);

export default Layout;
