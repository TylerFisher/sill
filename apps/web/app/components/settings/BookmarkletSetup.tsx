import { Box, Button, Flex, Link, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";

function getBookmarkletCode(origin: string) {
  return `javascript:(function(){var w=500,h=420,left=(screen.width-w)/2,top=(screen.height-h)/2;window.open('${origin}/bookmarks/popup?url='+encodeURIComponent(location.href),'sill_bookmark','width='+w+',height='+h+',left='+left+',top='+top+',scrollbars=yes,resizable=yes');})();`;
}

const IOS_SHORTCUT_URL =
  "https://www.icloud.com/shortcuts/fd3767fca4af467ba8c76379599162ad";

export default function BookmarkletSetup() {
  const [bookmarkletCode, setBookmarkletCode] = useState("");

  useEffect(() => {
    setBookmarkletCode(getBookmarkletCode(window.location.origin));
  }, []);

  if (!bookmarkletCode) {
    return null;
  }

  return (
    <Flex direction="column" gap="3">
      <Text as="p" size="2">
        On desktop, drag the{" "}
        <Text weight="bold" style={{ whiteSpace: "nowrap" }}>
          Save to Sill
        </Text>{" "}
        button to your bookmarks bar:
      </Text>

      <Box>
        <a
          href={bookmarkletCode}
          draggable="true"
          onClick={(e) => e.preventDefault()}
        >
          <Button
            draggable="true"
            style={{
              cursor: "grab",
            }}
          >
            Save to Sill
          </Button>
        </a>
      </Box>

      <Text as="p" size="2">
        On iOS, install the{" "}
        <Link href={IOS_SHORTCUT_URL} target="_blank" rel="noopener noreferrer">
          Save to Sill shortcut
        </Link>{" "}
        to save links from the share sheet.
      </Text>

      <Text as="p" size="2">
        On Android, install Sill as an app (tap the browser menu and select "Add
        to Home Screen" or "Install"), then Sill will appear in your share
        sheet.
      </Text>
    </Flex>
  );
}
