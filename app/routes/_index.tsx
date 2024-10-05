import type { MetaFunction } from "@remix-run/node";
import { Heading, Link } from "@radix-ui/themes";
import Layout from "~/components/Layout";

export const meta: MetaFunction = () => [{ title: "Casement" }];

const Index = () => {
	return (
		<Layout>
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
		</Layout>
	);
};

export default Index;
