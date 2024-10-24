import { Text } from "@react-email/components";
import type { PropsWithChildren } from "react";

const Lede = ({ children }: PropsWithChildren) => {
	return <Text style={ledeStyles}>{children}</Text>;
};

const ledeStyles = {
	fontSize: "16px",
	lineHeight: "24px",
	marginBottom: "24px",
};

export default Lede;
