import { Container, Flex } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";
import Header from "./Header";
import Nav from "./Nav";
import Footer from "./Footer";
import styles from "./Layout.module.css";

interface LayoutProps extends PropsWithChildren {
	hideNav?: boolean;
}

const Layout = ({ children, hideNav }: LayoutProps) => {
	return (
		<Container
			size="4"
			px={{
				initial: "0",
				sm: "5",
			}}
		>
			<div className={styles.wrapper}>
				<Header headerClass={hideNav ? "onboarding-logo" : "mobile-logo"} />
				{!hideNav && (
					<aside className={styles.side}>
						<Header headerClass="desktop-logo" />
						<Nav />
					</aside>
				)}
				<main
					className={styles.content}
					style={{
						marginTop: hideNav ? "0" : "2rem",
					}}
				>
					{children}
				</main>
				<Flex direction="column" justify="end" className={styles.right}>
					<Footer align="end" />
				</Flex>
			</div>
		</Container>
	);
};

export default Layout;
