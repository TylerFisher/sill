import { jsx as _jsx } from "react/jsx-runtime";
import { Text } from "@react-email/components";
const Lede = ({ children }) => {
    return _jsx(Text, { style: ledeStyles, children: children });
};
const ledeStyles = {
    fontSize: "16px",
    lineHeight: "24px",
    marginBottom: "24px",
};
export default Lede;
