import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";

interface Product {
	id: string;
	checkoutLinkUrl: string;
	amount: number;
	interval: string;
}

interface SubscriptionPricingCardProps {
	products: Product[];
	email?: string | null;
	name?: string | null;
	theme: string;
}

export default function SubscriptionPricingCard({
	products,
	email,
	name,
	theme,
}: SubscriptionPricingCardProps) {
	return (
		<Card
			style={{
				background: "var(--accent-3)",
				border: "2px solid var(--accent-7)",
			}}
		>
			<Box p="6">
				<Heading as="h3" size="6" mb="2" align="center" color="yellow">
					🎯 Subscribe today
				</Heading>
				<Text as="p" size="4" align="center" mb="4" weight="medium">
					Join hundreds of users who've transformed their social media
					workflow
				</Text>
				<Flex direction="column" gap="4" align="center">
					<Flex gap="3" align="center" justify="center" wrap="wrap">
						{products.map((product) => (
							<a
								data-polar-checkout
								data-polar-checkout-theme={theme}
								href={`${product.checkoutLinkUrl}?customer_email=${email}&customer_name=${name}`}
								key={product.id}
							>
								<Button
									size="4"
									style={{
										fontSize: "16px",
										fontWeight: "bold",
										padding: "12px 24px",
										border: "none",
									}}
								>
									Start for ${product.amount / 100}/{product.interval} →
								</Button>
							</a>
						))}
					</Flex>
					<Text as="p" size="3" color="gray" align="center">
						✅ Cancel anytime • ✅ Instant access
					</Text>
				</Flex>
			</Box>
		</Card>
	);
}