import { Container, Grid } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";
import Header from "./Header";
import Nav from "./Nav";
import styles from "./Layout.module.css";

const Layout = ({ children }: PropsWithChildren) => (
	<Container size="4">
		<div className={styles.wrapper}>
			<Header />
			<aside className={styles.side}>
				<Nav />
			</aside>
			<main className={styles.content}>{children}</main>
		</div>
	</Container>
);

export default Layout;
