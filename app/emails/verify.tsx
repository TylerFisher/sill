import EmailLayout from "~/components/emails/Layout";
import EmailHeading from "~/components/emails/Heading";
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
		</EmailLayout>
	);
};

export default VerifyEmail;
