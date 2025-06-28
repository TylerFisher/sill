import { Container } from "@radix-ui/themes";
import type { PropsWithChildren } from "react";
import Header from "./Header";
import styles from "./Layout.module.css";
import Nav from "./Nav";
import { useRouteLoaderData } from "react-router";
import type { loader } from "~/root";
import TrialBanner from "./TrialBanner";
import AgreeToTerms from "./AgreeToTerms";

interface LayoutProps extends PropsWithChildren {
	hideNav?: boolean;
	sidebar?: React.ReactNode;
}

const Layout = ({ children, hideNav, sidebar }: LayoutProps) => {
	const data = useRouteLoaderData<typeof loader>("root");
	return (
		<>
			{data?.subscribed === "trial" && data.dbUser?.freeTrialEnd && (
				<TrialBanner endDate={data.dbUser?.freeTrialEnd} />
			)}
			<Container
				size="4"
				px={{
					initial: "0",
					sm: "5",
				}}
				style={{
					backgroundColor: "var(--gray-2)",
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
			{data && !data.agreed && <AgreeToTerms />}
		</>
	);
};

export default Layout;
