import { Text } from "@react-email/components";
import EmailHeading from "../components/Heading";
import EmailLayout from "../components/Layout";
import Lede from "../components/Lede";
import OTPBlock from "../components/OTPBlock";

interface VerifyEmailProps {
	otp: string;
}

const VerifyEmail = ({ otp }: VerifyEmailProps) => {
	return (
		<EmailLayout preview="Verify your email">
			<EmailHeading>Verify your email for your new Sill account</EmailHeading>
			<Lede>Here's your verification code:</Lede>
			<OTPBlock>{otp}</OTPBlock>
			<Text>
				This token will expire in five minutes. If you need a new token, fill
				out the form you used to generate this token again.
			</Text>
		</EmailLayout>
	);
};

export default VerifyEmail;