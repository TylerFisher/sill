import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import { Button, Flex, Spinner, Text } from "@radix-ui/themes";
import { Rows2, Rows4 } from "lucide-react";
import { data, useFetcher, useFetchers } from "react-router";
import { z } from "zod";
import { type Layout, setLayout } from "~/utils/layout.server";
import { useRequestInfo } from "~/utils/request-info";
import type { Route } from "./+types/layout-switch";

const LayoutFormSchema = z.object({
	layout: z.enum(["default", "dense"]),
});

export async function action({ request }: Route.ActionArgs) {
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
	id,
}: {
	userPreference?: Layout | null;
	id: string;
}) {
	const fetcher = useFetcher<typeof action>();
	const isSubmitting =
		fetcher.state === "submitting" || fetcher.state === "loading";

	const [form] = useForm({
		id: id,
		lastResult: fetcher.data?.result,
	});

	const optimisticMode = useOptimisticLayoutMode();
	const mode = optimisticMode ?? userPreference ?? "default";
	const nextMode = mode === "default" ? "dense" : "default";
	const modeLabel = {
		default: (
			<>
				<Rows2 width="14" height="14" /> <Text size="1">Default</Text>
			</>
		),
		dense: (
			<>
				<Rows4 width="14" height="14" /> <Text size="1">Dense</Text>
			</>
		),
	};

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/layout-switch"
		>
			<input type="hidden" name="layout" value={nextMode} />
			<Flex gap="1">
				<Button
					type="submit"
					variant="ghost"
					size="1"
					aria-label="Switch layout"
					title="Switch layout"
				>
					{isSubmitting ? <Spinner /> : modeLabel[mode]}
				</Button>
			</Flex>
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
