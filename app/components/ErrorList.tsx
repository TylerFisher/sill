import { Text } from "@radix-ui/themes";
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
		<ul
			id={id}
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "0.25rem",
			}}
		>
			{errorsToRender.map((e) => (
				<li key={e}>
					<Text size="1">{e}</Text>
				</li>
			))}
		</ul>
	);
};

export default ErrorList;
