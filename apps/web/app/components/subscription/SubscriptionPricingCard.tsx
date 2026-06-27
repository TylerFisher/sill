import { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import type { Checkout } from "@polar-sh/sdk/models/components/checkout.js";
import { Box, Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useEffect } from "react";

interface SubscriptionPricingCardProps {
  checkoutLinks: Checkout[];
  email?: string | null;
  name?: string | null;
  theme: string;
}

export default function SubscriptionPricingCard({
  checkoutLinks,
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
        <Heading as="h3" size="6" mb="4" color="yellow">
          Name your price
        </Heading>
        <Flex direction="column" gap="4" align="start">
          <Flex gap="3" align="center" justify="start" wrap="wrap">
            {checkoutLinks.map((checkout) => (
              <a
                data-polar-checkout
                data-polar-checkout-theme={theme}
                href={checkout.url}
                key={checkout.id}
              >
                <Button
                  size="3"
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  From ${checkout.amount / 100}/
                  {checkout.products[0].recurringInterval} →
                </Button>
              </a>
            ))}
          </Flex>
          <Text as="p" size="3" color="gray">
            Those are the minimums. Pay more if Sill is worth it to you, and
            cancel any time.
          </Text>
        </Flex>
      </Box>
    </Card>
  );
}
