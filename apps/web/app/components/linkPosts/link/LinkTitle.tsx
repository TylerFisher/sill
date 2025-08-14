import { Heading, Link, Text } from "@radix-ui/themes";

interface LinkTitleProps {
	title: string;
	href: string;
	layout: "default" | "dense";
	host: string;
}

const LinkTitle = ({
	title,
	href,
	layout = "default",
	host,
}: LinkTitleProps) => {
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
			{layout === "dense" && (
				<Text color="gray" weight="regular">
					{" · "}
					{host}
				</Text>
			)}
		</Heading>
	);
};

export default LinkTitle;
