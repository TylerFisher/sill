import { Container, Flex } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";
import Header from "./Header";
import Nav from "./Nav";
import Footer from "./Footer";
import styles from "./Layout.module.css";

const Layout = ({ children }: PropsWithChildren) => {
	return (
		<Container size="4" px="5">
			<div className={styles.wrapper}>
				<aside className={styles.side}>
					<Header />
					<Nav />
				</aside>
				<main className={styles.content}>{children}</main>
				<Flex direction="column" justify="end" className={styles.right}>
					<Footer />
				</Flex>
			</div>
		</Container>
	);
};

export default Layout;
