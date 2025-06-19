import { CurrentZoom, ZoomIn, ZoomOut } from "@anaralabs/lector";
import { Flex, IconButton, Text } from "@radix-ui/themes";
import { Minus, Plus } from "lucide-react";
import styles from "./Zoom.module.css";

const ZoomControls = () => {
	return (
		<Flex
			align="center"
			justify="center"
			p="1"
			gap="2"
			className={styles.zoomContainer}
		>
			<ZoomOut className={styles.zoomOut}>
				<Minus />
			</ZoomOut>
			<CurrentZoom className={styles.currentZoom} />
			<Text color="gray">%</Text>
			<ZoomIn className={styles.zoomIn}>
				<Plus />
			</ZoomIn>
		</Flex>
	);
};

export default ZoomControls;
