import { Box, Heading, Link, Text } from "@radix-ui/themes";
import SillPlus from "./SillPlus";

export default function SubscriptionHeader() {
  return (
    <Box mb="6">
      <Heading
        as="h2"
        size={{
          initial: "6",
          md: "7",
        }}
        color="yellow"
      >
        Become a <SillPlus /> supporter.
      </Heading>
      <Text as="p" size="3" mt="3" color="gray">
        The{" "}
        <Link
          href="https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary"
          target="_blank"
        >
          Reuters Digital News Report
        </Link>{" "}
        found that social media is the "single most widely used way of accessing
        online news." But our social media tools aren't designed for news
        consumption. We need better tools that respect our time and help us
        process a complicated world.
      </Text>

      <Text as="p" size="3" mt="3" color="gray">
        I'm{" "}
        <Link href="https://tylerjfisher.com/about/" target="_blank">
          Tyler
        </Link>
        , and I build Sill on my own. This isn't a VC-driven startup chasing
        growth at all costs. Instead, I'm on a mission to make better
        information tools on the open social web. By supporting Sill with a
        subscription, you help me achieve that mission.
      </Text>
    </Box>
  );
}
