import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Body, Container, Head, Html, Img, Preview, } from "@react-email/components";
const EmailLayout = ({ children, preview }) => {
    return (_jsxs(Html, { lang: "en", dir: "ltr", children: [_jsx(Head, {}), _jsx(Preview, { children: preview }), _jsx(Body, { style: bodyStyles, children: _jsxs(Container, { style: containerStyles, children: [_jsx(Img, { src: "https://sill.social/email-banner.png", alt: "Sill logo", style: imgStyles }), children] }) })] }));
};
const bodyStyles = {
    backgroundColor: "#ffffff",
    margin: "0 auto",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
};
const containerStyles = {
    margin: "0 auto",
    padding: "0px 20px",
    maxWidth: "500px",
};
const imgStyles = { width: "100%", height: "auto" };
export default EmailLayout;
