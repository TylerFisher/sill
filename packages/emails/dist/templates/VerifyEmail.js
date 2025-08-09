import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Text } from "@react-email/components";
import EmailHeading from "../components/Heading";
import EmailLayout from "../components/Layout";
import Lede from "../components/Lede";
import OTPBlock from "../components/OTPBlock";
const VerifyEmail = ({ otp }) => {
    return (_jsxs(EmailLayout, { preview: "Verify your email", children: [_jsx(EmailHeading, { children: "Verify your email for your new Sill account" }), _jsx(Lede, { children: "Here's your verification code:" }), _jsx(OTPBlock, { children: otp }), _jsx(Text, { children: "This token will expire in five minutes. If you need a new token, fill out the form you used to generate this token again." })] }));
};
export default VerifyEmail;
