import { Html, Container, Text, Link } from "@react-email/components";

const EmailChangeEmail = ({
	verifyUrl,
	otp,
}: {
	verifyUrl: string;
	otp: string;
}) => {
	return (
		<Html lang="en" dir="ltr">
			<Container>
				<h1>
					<Text>Sill Email Change</Text>
				</h1>
				<p>
					<Text>
						Here's your verification code: <strong>{otp}</strong>
					</Text>
				</p>
				<p>
					<Text>Or click the link:</Text>
				</p>
				<Link href={verifyUrl}>{verifyUrl}</Link>
			</Container>
		</Html>
	);
};

export default EmailChangeEmail;
