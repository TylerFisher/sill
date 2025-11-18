import { Heading, Link, Text } from "@radix-ui/themes";

interface LinkTitleProps {
	title: string;
	href: string;
	layout: "default" | "dense";
	host: string;
	siteName: string | null;
}

const LinkTitle = ({
	title,
	href,
	layout = "default",
	host,
	siteName,
}: LinkTitleProps) => {
	const displayHost = siteName || host;
	const nb = displayHost.replaceAll(" ", "\u00A0");

	return (
		<Heading
			as="h3"
			size={{
				initial: layout === "dense" ? "2" : "3",
				sm: layout === "dense" ? "2" : "4",
			}}
			style={{
				textWrap: "pretty",
			}}
		>
			<Link target="_blank" rel="noreferrer" href={href} weight="bold">
				{title}
			</Link>
		</Heading>
	);
};

export default LinkTitle;
