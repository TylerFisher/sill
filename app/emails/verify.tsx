import { Text } from "@react-email/components";
import EmailHeading from "~/components/emails/Heading";
import EmailLayout from "~/components/emails/Layout";
import Lede from "~/components/emails/Lede";
import OTPBlock from "~/components/emails/OTPBlock";

const VerifyEmail = ({
	otp,
}: {
	otp: string;
}) => {
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
