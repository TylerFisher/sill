import { jsx as _jsx } from "react/jsx-runtime";
import { Section, Text } from "@react-email/components";
const OTPBlock = ({ children }) => {
    return (_jsx(Section, { style: otpBlockStyles, children: _jsx(Text, { style: otpTextStyles, children: children }) }));
};
const otpBlockStyles = {
    background: "rgb(245, 244, 245)",
    borderRadius: "4px",
    marginBottom: "30px",
    padding: "40px 10px",
};
const otpTextStyles = {
    fontSize: "30px",
    textAlign: "center",
    verticalAlign: "middle",
};
export default OTPBlock;
