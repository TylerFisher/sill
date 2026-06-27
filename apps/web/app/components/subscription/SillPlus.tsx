import { Text } from "@radix-ui/themes";

/**
 * The "sill+" wordmark — bold italic in brand yellow. Renders inline (Radix
 * Text → span), so it sits inside a surrounding sentence. Keep all stylized
 * references to the tier going through this so they stay consistent.
 */
export default function SillPlus() {
  return (
    <Text
      color="yellow"
      style={{
        fontWeight: 900,
        fontStyle: "italic",
      }}
    >
      sill+
    </Text>
  );
}
