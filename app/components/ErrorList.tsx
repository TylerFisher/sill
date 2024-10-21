import { Flex, Text } from "@radix-ui/themes";
import type { ListOfErrors } from "./TextInput";
const ErrorList = ({
	id,
	errors,
}: {
	errors?: ListOfErrors;
	id?: string;
}) => {
	const errorsToRender = errors?.filter(Boolean);
	if (!errorsToRender?.length) return null;
	return (
		<ul id={id}>
			<Flex direction="column" gap="1">
				{errorsToRender.map((e) => (
					<li key={e}>
						<Text size="1">{e}</Text>
					</li>
				))}
			</Flex>
		</ul>
	);
};

export default ErrorList;
