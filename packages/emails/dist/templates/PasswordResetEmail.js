import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import EmailHeading from "../components/Heading";
import EmailLayout from "../components/Layout";
import Lede from "../components/Lede";
import OTPBlock from "../components/OTPBlock";
const PasswordResetEmail = ({ otp }) => {
    return (_jsxs(EmailLayout, { preview: "Confirm your password reset request", children: [_jsx(EmailHeading, { children: "Password reset request" }), _jsx(Lede, { children: "Someone, hopefully you, requested a password reset. If this was you, use the verification code below to confirm your request:" }), _jsx(OTPBlock, { children: otp })] }));
};
export default PasswordResetEmail;
