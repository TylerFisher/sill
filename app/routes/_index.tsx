import { type MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => [{ title: "Casement" }];

const Index = () => {
	return (
		<>
			<h1>Welcome!</h1>
			<ul>
				<li>
					<a href="/accounts/signup">Sign up</a>
				</li>
				<li>
					<a href="/accounts/login">Log in</a>
				</li>
				<li>
					<a href="/actors/setup">Actor setup</a>
				</li>
			</ul>
		</>
	);
};

export default Index;
