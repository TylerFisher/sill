import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import { IconButton } from "@radix-ui/themes";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { useFetcher, useFetchers } from "@remix-run/react";
import { Rows2, Rows4 } from "lucide-react";
import { z } from "zod";
import { type Layout, setLayout } from "~/utils/layout.server";
import { useRequestInfo } from "~/utils/request-info";

const LayoutFormSchema = z.object({
	layout: z.enum(["default", "dense"]),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: LayoutFormSchema,
	});

	invariantResponse(submission.status === "success", "Invalid layout received");

	const { layout } = submission.value;

	const responseInit = {
		headers: { "set-cookie": setLayout(layout) },
	};
	return data({ result: submission.reply() }, responseInit);
}

export function LayoutSwitch({
	userPreference,
}: {
	userPreference?: Layout | null;
}) {
	const fetcher = useFetcher<typeof action>();

	const [form] = useForm({
		id: "layout-switch",
		lastResult: fetcher.data?.result,
	});

	const optimisticMode = useOptimisticLayoutMode();
	const mode = optimisticMode ?? userPreference ?? "default";
	const nextMode = mode === "default" ? "dense" : "default";
	const modeLabel = {
		default: <Rows2 width="22" height="22" />,
		dense: <Rows4 width="22" height="22" />,
	};

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/layout-switch"
		>
			<input type="hidden" name="layout" value={nextMode} />
			<IconButton
				type="submit"
				variant="ghost"
				size="3"
				aria-label="Layout switcher"
			>
				{modeLabel[mode]}
			</IconButton>
		</fetcher.Form>
	);
}

/**
 * If the user's changing their layout mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticLayoutMode() {
	const fetchers = useFetchers();
	const layoutFetcher = fetchers.find(
		(f) => f.formAction === "/resources/layout-switch",
	);

	if (layoutFetcher?.formData) {
		const submission = parseWithZod(layoutFetcher.formData, {
			schema: LayoutFormSchema,
		});

		if (submission.status === "success") {
			return submission.value.layout;
		}
	}
}

/**
 * @returns the user's layout preference, or the client hint layout if the user
 * has not set a preference.
 */
export function useLayout() {
	const requestInfo = useRequestInfo();
	return requestInfo.userPrefs.layout ?? "default";
}
