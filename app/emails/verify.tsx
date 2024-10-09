import { Container, Link, Heading, Html, Text } from "@react-email/components";

interface VerifyProps {
	link: string;
	otp: string;
}

const Verify = ({ link, otp }: VerifyProps) => (
	<Html>
		<Container>
			<Heading as="h1">Verify your email</Heading>
			<p>
				<Text>
					You signed up for Sill with this email. Here's your verification code:{" "}
					{otp}
				</Text>
			</p>
			<p>
				<Text>Or click the link to get started:</Text>
				<Link href={link}>{link}</Link>
			</p>
		</Container>
	</Html>
);

export default Verify;
