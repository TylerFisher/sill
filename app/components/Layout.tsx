import { Container } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";

const Layout = ({ children }: PropsWithChildren) => (
	<Container size="2">
		<div
			style={{
				backgroundColor: "var(--accent-1)",
				padding: "1em",
				borderLeft: "1px solid var(--accent-a6)",
				borderRight: "1px solid var(--accent-a6)",
				borderBottom: "1px solid var(--accent-a6)",
			}}
		>
			{children}
		</div>
	</Container>
);

export default Layout;
