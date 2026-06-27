import { Box, Heading, Text } from "@radix-ui/themes";

interface SubscriptionThanksHeaderProps {
  /**
   * The closing line about the iOS beta. Differs by surface: right after
   * checkout the beta link is emailed, so that page points at the inbox;
   * elsewhere (the manage page) it's evergreen.
   */
  iosNote?: string;
}

/**
 * The post-subscribe thank-you header, shared by the checkout success page and
 * the manage-subscription page (active state), so the two surfaces stay in sync.
 */
export default function SubscriptionThanksHeader({
  iosNote = "The iOS beta is ready whenever you want it.",
}: SubscriptionThanksHeaderProps) {
  return (
    <Box mb="6">
      <Heading
        as="h2"
        size={{
          initial: "6",
          md: "7",
        }}
        weight="bold"
        color="yellow"
      >
        Thanks for supporting Sill.
      </Heading>
      <Text as="p" size="3" color="gray">
        Your support keeps Sill independent and improving. {iosNote}
      </Text>
    </Box>
  );
}
