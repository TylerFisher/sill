import { Html, Container, Text } from "@react-email/components";

const EmailChangeNoticeEmail = ({ userId }: { userId: string }) => {
	return (
		<Html lang="en" dir="ltr">
			<Container>
				<h1>
					<Text>Your Sill email has been changed</Text>
				</h1>
				<p>
					<Text>
						We're writing to let you know that your Sill email has been changed.
					</Text>
				</p>
				<p>
					<Text>
						If you changed your email address, then you can safely ignore this.
						But if you did not change your email address, then please contact
						support immediately.
					</Text>
				</p>
				<p>
					<Text>Your Account ID: {userId}</Text>
				</p>
			</Container>
		</Html>
	);
};

export default EmailChangeNoticeEmail;
