import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Separator,
  Text,
} from "@radix-ui/themes";
import { X } from "lucide-react";
import { useFetcher } from "react-router";
import SillPlus from "./SillPlus";

const PlusPromoCard = ({ layout }: { layout: "default" | "dense" }) => {
  const dismissFetcher = useFetcher();
  const supportFetcher = useFetcher();
  if (dismissFetcher.state !== "idle") return null;

  const dense = layout === "dense";

  return (
    <>
      <Card
        size={dense ? "2" : "3"}
        style={{
          backgroundColor: "var(--yellow-a2)",
          boxShadow: "inset 0 0 0 1px var(--yellow-8)",
        }}
      >
        <Flex justify="between" align="start" gap="3" mb={dense ? "1" : "2"}>
          <Heading
            as="h3"
            color="yellow"
            size={{
              initial: dense ? "2" : "3",
              sm: dense ? "2" : "4",
            }}
          >
            Become a <SillPlus /> supporter
          </Heading>
          <dismissFetcher.Form action="/api/dismiss-plus-promo" method="post">
            <IconButton
              type="submit"
              variant="ghost"
              color="gray"
              size={dense ? "1" : "2"}
              aria-label="Dismiss"
            >
              <X size={dense ? 14 : 16} />
            </IconButton>
          </dismissFetcher.Form>
        </Flex>
        <Text as="p" size="2" color="gray" mb={dense ? "3" : "4"}>
          Sill is a solo developer effort. Supporters keep it running and get
          early access to the iOS app. Pay what you want.
        </Text>
        <supportFetcher.Form action="/api/dismiss-plus-promo" method="post">
          <input
            type="hidden"
            name="redirectTo"
            value="/settings/subscription"
          />
          <Button type="submit" size={dense ? "1" : "2"}>
            Support Sill
          </Button>
        </supportFetcher.Form>
      </Card>
      {dense ? (
        <Box my="5" />
      ) : (
        <Separator my="7" size="4" orientation="horizontal" />
      )}
    </>
  );
};

export default PlusPromoCard;
