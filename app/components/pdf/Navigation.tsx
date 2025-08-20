import { usePdf, usePdfJump } from "@anaralabs/lector";
import { useEffect, useState } from "react";
import { Flex, IconButton, Text, TextField } from "@radix-ui/themes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Navigation.module.css";

const PageNavigationButtons = () => {
	const pages = usePdf((state) => state.pdfDocumentProxy?.numPages);
	const currentPage = usePdf((state) => state.currentPage);
	const [pageNumber, setPageNumber] = useState<string | number>(currentPage);
	const { jumpToPage } = usePdfJump();

	const handlePreviousPage = () => {
		if (currentPage > 1) {
			jumpToPage(currentPage - 1, { behavior: "auto" });
		}
	};

	const handleNextPage = () => {
		if (currentPage < pages) {
			jumpToPage(currentPage + 1, { behavior: "auto" });
		}
	};

	useEffect(() => {
		setPageNumber(currentPage);
	}, [currentPage]);

	return (
		<Flex
			position="absolute"
			bottom="1rem"
			left="50%"
			align="center"
			gap="3"
			px="4"
			py="3"
			className={styles.navigationContainer}
		>
			<IconButton
				onClick={handlePreviousPage}
				disabled={currentPage <= 1}
				variant="ghost"
				aria-label="Previous page"
			>
				<ChevronLeft />
			</IconButton>

			<Flex gap="2" align="center">
				<TextField.Root
					type="number"
					value={pageNumber}
					onChange={(e) => setPageNumber(e.target.value)}
					onBlur={(e) => {
						const value = Number(e.target.value);
						if (value >= 1 && value <= pages && currentPage !== value) {
							jumpToPage(value, { behavior: "auto" });
						} else {
							setPageNumber(currentPage);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.currentTarget.blur();
						}
					}}
					size="1"
					style={{
						width: "40px",
						textAlign: "center",
					}}
				>
					<TextField.Slot />
				</TextField.Root>
				<Text size="2" color="gray">
					/ {pages || 1}
				</Text>
			</Flex>

			<IconButton
				onClick={handleNextPage}
				disabled={currentPage >= pages}
				variant="ghost"
				aria-label="Next page"
			>
				<ChevronRight />
			</IconButton>
		</Flex>
	);
};

export default PageNavigationButtons;
