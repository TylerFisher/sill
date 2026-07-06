import { Box, Flex, Text } from "@radix-ui/themes";
import type { ReactElement } from "react";
import { Link } from "react-router";

interface FeatureRowProps {
  icon: ReactElement;
  title: string;
  description: string;
  to?: string;
}

export default function FeatureRow({
  icon,
  title,
  description,
  to,
}: FeatureRowProps) {
  const content = (
    <Flex gap="3" align="start">
      <Box mt="1" style={{ color: "var(--accent-11)", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Text as="p" size="3" weight="bold">
          {title}
        </Text>
        <Text as="p" size="3" color="gray">
          {description}
        </Text>
      </Box>
    </Flex>
  );

  if (to) {
    return (
      <Link
        to={to}
        style={{ display: "block", color: "inherit", textDecoration: "none" }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
