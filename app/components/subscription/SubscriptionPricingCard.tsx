import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { Sparkles } from "lucide-react";
import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { useEffect } from "react";

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
	useEffect(() => {
		PolarEmbedCheckout.init();
	}, []);
	return (
		<Card>
			<Box p="6">
				<Heading as="h3" size="6" mb="4" align="center" color="yellow">
					<Sparkles
						style={{ display: "inline", verticalAlign: "middle" }}
						size="20"
					/>{" "}
					Subscribe today
				</Heading>
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
									size="3"
									style={{
										fontWeight: "bold",
									}}
								>
									${product.amount / 100}/{product.interval} →
								</Button>
							</a>
						))}
					</Flex>
					<Text as="p" size="3" color="gray" align="center">
						Instant access, cancel any time
					</Text>
				</Flex>
			</Box>
		</Card>
	);
}
