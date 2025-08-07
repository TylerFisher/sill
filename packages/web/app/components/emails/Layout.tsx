import {
	Body,
	Container,
	Head,
	Html,
	Img,
	Preview,
} from "@react-email/components";
import type { PropsWithChildren } from "react";

interface EmailLayoutProps extends PropsWithChildren {
	preview: string;
}

const EmailLayout = ({ children, preview }: EmailLayoutProps) => {
	return (
		<Html lang="en" dir="ltr">
			<Head />
			<Preview>{preview}</Preview>
			<Body style={bodyStyles}>
				<Container style={containerStyles}>
					<Img
						src="https://sill.social/email-banner.png"
						alt="Sill logo"
						style={imgStyles}
					/>
					{children}
				</Container>
			</Body>
		</Html>
	);
};

const bodyStyles = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	fontFamily:
		"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};

const containerStyles = {
	margin: "0 auto",
	padding: "0px 20px",
	maxWidth: "500px",
};

const imgStyles = { width: "100%", height: "auto" };

export default EmailLayout;
