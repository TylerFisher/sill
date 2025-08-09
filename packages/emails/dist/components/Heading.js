import { jsx as _jsx } from "react/jsx-runtime";
import { Heading } from "@react-email/components";
const EmailHeading = ({ children }) => {
    return _jsx(Heading, { style: headingStyles, children: children });
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
