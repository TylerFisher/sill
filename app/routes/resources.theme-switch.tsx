import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import { Button, Flex, IconButton, Spinner, Text } from "@radix-ui/themes";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { useFetcher, useFetchers } from "@remix-run/react";
import { Moon, Sun } from "lucide-react";
import { z } from "zod";
import { useHints } from "~/utils/client-hints";
import { useRequestInfo } from "~/utils/request-info";
import { type Theme, setTheme } from "~/utils/theme.server";

const ThemeFormSchema = z.object({
	theme: z.enum(["light", "dark"]),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	});

	invariantResponse(submission.status === "success", "Invalid theme received");

	const { theme } = submission.value;

	const responseInit = {
		headers: { "set-cookie": setTheme(theme) },
	};
	return data({ result: submission.reply() }, responseInit);
}

export function ThemeSwitch({
	userPreference,
	id,
}: {
	userPreference?: Theme | null;
	id: string;
}) {
	const fetcher = useFetcher<typeof action>();
	const isSubmitting =
		fetcher.state === "submitting" || fetcher.state === "loading";

	const [form] = useForm({
		id: id,
		lastResult: fetcher.data?.result,
	});

	const optimisticMode = useOptimisticThemeMode();
	const mode = optimisticMode ?? userPreference ?? "light";
	const nextMode = mode === "light" ? "dark" : "light";
	const modeLabel = {
		light: (
			<>
				<Sun width="14" height="14" />
				<Text size="1">Light</Text>
			</>
		),
		dark: (
			<>
				<Moon width="14" height="14" />
				<Text size="1">Dark</Text>
			</>
		),
	};

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/theme-switch"
		>
			<input type="hidden" name="theme" value={nextMode} />
			<Flex gap="1">
				<Button
					type="submit"
					variant="ghost"
					size="1"
					aria-label="Switch theme"
					title="Switch theme"
				>
					{isSubmitting ? <Spinner /> : modeLabel[mode]}
				</Button>
			</Flex>
		</fetcher.Form>
	);
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers();
	const themeFetcher = fetchers.find(
		(f) => f.formAction === "/resources/theme-switch",
	);

	if (themeFetcher?.formData) {
		const submission = parseWithZod(themeFetcher.formData, {
			schema: ThemeFormSchema,
		});

		if (submission.status === "success") {
			return submission.value.theme;
		}
	}
}

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints();
	const requestInfo = useRequestInfo();
	return requestInfo.userPrefs.theme ?? hints.theme;
}
