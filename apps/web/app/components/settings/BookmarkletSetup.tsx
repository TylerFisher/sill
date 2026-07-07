import { Box, Button, Flex, IconButton, Link, Text } from "@radix-ui/themes";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";

function getBookmarkletCode(origin: string) {
  return `javascript:(function(){var w=500,h=420,left=(screen.width-w)/2,top=(screen.height-h)/2;window.open('${origin}/bookmarks/popup?url='+encodeURIComponent(location.href),'sill_bookmark','width='+w+',height='+h+',left='+left+',top='+top+',scrollbars=yes,resizable=yes');})();`;
}

const IOS_SHORTCUT_URL =
  "https://www.icloud.com/shortcuts/fd3767fca4af467ba8c76379599162ad";

const PlatformLabel = ({ children }: { children: React.ReactNode }) => (
  <Text
    as="p"
    size="1"
    weight="bold"
    color="gray"
    mb="1"
    style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
  >
    {children}
  </Text>
);

export default function BookmarkletSetup() {
  const [bookmarkletCode, setBookmarkletCode] = useState("");

  useEffect(() => {
    setBookmarkletCode(getBookmarkletCode(window.location.origin));
  }, []);

  if (!bookmarkletCode) {
    return null;
  }

  return (
    <Flex direction="column" gap="4">
      <Box>
        <PlatformLabel>In Sill</PlatformLabel>
        <Text as="p" size="2" color="gray">
          Tap the bookmark icon{" "}
          <IconButton
            variant="ghost"
            size="1"
            aria-hidden
            style={{ verticalAlign: "middle" }}
          >
            <Bookmark size={16} />
          </IconButton>{" "}
          on any link in <Link href="/links">your feed</Link> to save it here.
        </Text>
      </Box>

      <Box>
        <PlatformLabel>Desktop</PlatformLabel>
        <Text as="p" size="2" color="gray" mb="3">
          Drag this button to your bookmarks bar, then click it on any page.
        </Text>
        <a
          href={bookmarkletCode}
          draggable="true"
          onClick={(e) => e.preventDefault()}
        >
          <Button draggable="true" style={{ cursor: "grab" }}>
            Save to Sill
          </Button>
        </a>
      </Box>

      <Box>
        <PlatformLabel>iOS</PlatformLabel>
        <Text as="p" size="2" color="gray">
          Install the{" "}
          <Link
            href={IOS_SHORTCUT_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Save to Sill shortcut
          </Link>{" "}
          to save links from the share sheet.
        </Text>
      </Box>

      <Box>
        <PlatformLabel>Android</PlatformLabel>
        <Text as="p" size="2" color="gray">
          Install Sill as an app (browser menu, then "Add to Home Screen"). It
          will then appear in your share sheet.
        </Text>
      </Box>
    </Flex>
  );
}
