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
    <Card size="3">
      <Box p="2">
        <Heading as="h3" size="5" mb="1">
          Name your price
        </Heading>
        <Text as="p" size="2" color="gray" mb="4">
          Pay what works for you. Cancel any time.
        </Text>
        <Flex direction={{ initial: "column", sm: "row" }} gap="3" width="100%">
          {checkoutLinks.map((checkout) => {
            const interval = checkout.products[0].recurringInterval;
            const cadence = interval === "year" ? "annually" : "monthly";
            return (
              <Box key={checkout.id} style={{ flex: "1 1 0" }}>
                <a
                  data-polar-checkout
                  data-polar-checkout-theme={theme}
                  href={checkout.url}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <Button
                    size="3"
                    style={{ width: "100%", fontWeight: "bold" }}
                  >
                    Pay {cadence}
                  </Button>
                </a>
                <Text as="p" size="1" color="gray" align="center" mt="2">
                  from ${checkout.amount / 100}/{interval}
                </Text>
              </Box>
            );
          })}
        </Flex>
      </Box>
    </Card>
  );
}
