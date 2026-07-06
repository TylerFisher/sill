import { Box, Heading, Text } from "@radix-ui/themes";
import SillPlus from "./SillPlus";

interface SubscriptionThanksHeaderProps {
  iosNote?: string;
}

export default function SubscriptionThanksHeader({
  iosNote = "You can find your iOS beta invite in your order confirmation email.",
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
        Thanks for using <SillPlus />.
      </Heading>
      <Text as="p" size="3" color="gray">
        Your support keeps Sill improving. {iosNote}
      </Text>
    </Box>
  );
}
