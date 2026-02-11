export const truncateDescription = (text: string, maxLength = 300): string => {
	if (text.length <= maxLength) return text;
	const sentenceEnd = text.slice(maxLength).search(/[.!?]/);
	if (sentenceEnd !== -1) {
		return text.slice(0, maxLength + sentenceEnd + 1);
	}
	return text;
};
