import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { countLinkOccurrences } from "~/models/links.server";
import { requireUserId } from "~/session.server";
import {
	Container,
	Card,
	Text,
	Heading,
	Box,
	Flex,
	Avatar,
	Link,
	Em,
} from "@radix-ui/themes";

export const meta: MetaFunction = () => [{ title: "Links" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
	const userId = await requireUserId(request);
	const links = await countLinkOccurrences(userId);

	return json({ links });
};

const Links = () => {
	const data = useLoaderData<typeof loader>();

	return (
		<Container>
			{data.links.map((link) => (
				<Box key={link[0]} mb="5">
					<Heading size="4" mb="5">
						<Link
							target="_blank"
							rel="noreferrer"
							href={link[0]}
							size="6"
							weight="bold"
						>
							{link[1][0].link.title || link[0]}
						</Link>{" "}
						<Text weight="regular"> posted by {link[1].length} people</Text>
					</Heading>
					<Box maxWidth="640px">
						{link[1].map((linkPost) => (
							<Card key={linkPost.id} mb="5">
								<Flex gap="3" align="start">
									<Avatar
										size="3"
										src={linkPost.post.actor.avatarUrl}
										radius="full"
										fallback="T"
										mt={
											linkPost.actor.handle !== linkPost.post.actor.handle
												? "4"
												: "1"
										}
									/>
									<Box>
										{linkPost.actor.handle !== linkPost.post.actor.handle && (
											<Text size="1" as="p" color="gray">
												Reposted by{" "}
												<Link
													href={linkPost.actor.url}
													target="_blank"
													rel="noreferrer"
													underline="none"
													color="gray"
												>
													{linkPost.actor.name}
												</Link>
											</Text>
										)}
										<Text size="3" weight="bold" as="p">
											<Link
												href={linkPost.post.actor.url}
												target="_blank"
												rel="noreferrer"
											>
												{linkPost.post.actor.name}{" "}
												<Text color="gray" weight="regular">
													@{linkPost.post.actor.handle}
												</Text>
											</Link>
										</Text>
										<Text as="p">{linkPost.post.text}</Text>
										<Link
											href={linkPost.post.url}
											target="_blank"
											rel="noreferrer"
										>
											permalink
										</Link>
									</Box>
								</Flex>
								{linkPost.post.quoting && (
									<Card ml="8">
										<Flex gap="1" mb="1">
											<Avatar
												size="1"
												src={linkPost.post.quoting.actor.avatarUrl || undefined}
												radius="full"
												fallback="T"
											/>
											<Text size="3" weight="bold" as="p">
												<Link href={linkPost.post.quoting.actor.url}>
													{linkPost.post.quoting.actor.name} (
													{linkPost.post.quoting.actorHandle})
												</Link>
											</Text>
										</Flex>

										<Text as="p">{linkPost.post.quoting.text}</Text>
										<Link
											href={linkPost.post.quoting.url}
											target="_blank"
											rel="noreferrer"
										>
											permalink
										</Link>
									</Card>
								)}
							</Card>
						))}
					</Box>
				</Box>
			))}
		</Container>
	);
};

export default Links;
