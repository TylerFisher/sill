import { Heading } from "@react-email/components";
import type { PropsWithChildren } from "react";

const EmailHeading = ({ children }: PropsWithChildren) => {
	return <Heading style={headingStyles}>{children}</Heading>;
};

const headingStyles = {
	color: "#1d1c1d",
	fontSize: "30px",
	fontWeight: "700",
	margin: "30px 0",
	padding: "0",
	lineHeight: "36px",
};

export default EmailHeading;
