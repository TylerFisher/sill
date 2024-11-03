import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import { invariantResponse } from "@epic-web/invariant";
import { IconButton } from "@radix-ui/themes";
import { type ActionFunctionArgs, data } from "@remix-run/node";
import { redirect, useFetcher, useFetchers } from "@remix-run/react";
import { Moon, Sun } from "lucide-react";
import { ServerOnly } from "remix-utils/server-only";
import { z } from "zod";
import { useHints } from "~/utils/client-hints";
import { useRequestInfo } from "~/utils/request-info";
import { type Theme, setTheme } from "~/utils/theme.server";

const ThemeFormSchema = z.object({
	theme: z.enum(["light", "dark"]),
	// this is useful for progressive enhancement
	redirectTo: z.string().optional(),
});

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: ThemeFormSchema,
	});

	invariantResponse(submission.status === "success", "Invalid theme received");

	const { theme, redirectTo } = submission.value;

	const responseInit = {
		headers: { "set-cookie": setTheme(theme) },
	};
	if (redirectTo) {
		return redirect(redirectTo, responseInit);
	}
	return data({ result: submission.reply() }, responseInit);
}

export function ThemeSwitch({
	userPreference,
}: {
	userPreference?: Theme | null;
}) {
	const fetcher = useFetcher<typeof action>();
	const requestInfo = useRequestInfo();

	const [form] = useForm({
		id: "theme-switch",
		lastResult: fetcher.data?.result,
	});

	const optimisticMode = useOptimisticThemeMode();
	const mode = optimisticMode ?? userPreference ?? "light";
	const nextMode = mode === "light" ? "dark" : "light";
	const modeLabel = {
		light: <Sun width="22" height="22" />,
		dark: <Moon width="22" height="22" />,
	};

	return (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action="/resources/theme-switch"
		>
			<ServerOnly>
				{() => (
					<input type="hidden" name="redirectTo" value={requestInfo.path} />
				)}
			</ServerOnly>
			<input type="hidden" name="theme" value={nextMode} />
			<IconButton
				type="submit"
				variant="ghost"
				size="3"
				aria-label="Theme switcher"
			>
				{modeLabel[mode]}
			</IconButton>
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
	const optimisticMode = useOptimisticThemeMode();
	return requestInfo.userPrefs.theme ?? hints.theme;
}
