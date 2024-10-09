import { Html, Container, Text, Link } from "@react-email/components";

const ForgotPasswordEmail = ({
	onboardingUrl,
	otp,
}: {
	onboardingUrl: string;
	otp: string;
}) => {
	return (
		<Html lang="en" dir="ltr">
			<Container>
				<h1>
					<Text>Sill Password Reset</Text>
				</h1>
				<p>
					<Text>
						Here's your verification code: <strong>{otp}</strong>
					</Text>
				</p>
				<p>
					<Text>Or click the link:</Text>
				</p>
				<Link href={onboardingUrl}>{onboardingUrl}</Link>
			</Container>
		</Html>
	);
};

export default ForgotPasswordEmail;
