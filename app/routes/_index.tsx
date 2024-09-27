import type { MetaFunction } from "@remix-run/node";
import { Container, Heading, Link } from "@radix-ui/themes";

export const meta: MetaFunction = () => [{ title: "Casement" }];

const Index = () => {
	return (
		<Container mt="9">
			<Heading as="h1" size="8">
				Welcome!
			</Heading>
			<ul>
				<li>
					<Link href="/accounts/signup">Sign up</Link>
				</li>
				<li>
					<Link href="/accounts/login">Log in</Link>
				</li>
				<li>
					<Link href="/links">Top Links</Link>
				</li>
			</ul>
		</Container>
	);
};

export default Index;
