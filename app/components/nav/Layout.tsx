import { Container } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";
import Header from "./Header";
import styles from "./Layout.module.css";
import Nav from "./Nav";

interface LayoutProps extends PropsWithChildren {
	hideNav?: boolean;
	sidebar?: React.ReactNode;
}

const Layout = ({ children, hideNav, sidebar }: LayoutProps) => {
	return (
		<Container
			size="4"
			px={{
				initial: "0",
				sm: "5",
			}}
			style={{
				backgroundColor: "var(--accent-2)",
				minHeight: "100vh",
			}}
		>
			<div className={styles.wrapper}>
				<Header
					headerClass={hideNav ? "onboarding-logo" : "mobile-logo"}
					hideNav={hideNav || false}
				/>
				{!hideNav && (
					<aside className={styles.side}>
						<Header headerClass="desktop-logo" hideNav={false} />
						<Nav layoutFormId="desktop-layout" themeFormId="desktop-theme" />
					</aside>
				)}
				<main className={`${styles.content} ${sidebar && styles.grid}`}>
					{children}
				</main>
				{sidebar && <aside className={styles.right}>{sidebar}</aside>}
			</div>
		</Container>
	);
};

export default Layout;
