import { Box, Button, Callout, Text, TextField } from "@radix-ui/themes";
import { CircleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Form } from "react-router";
import { debounce } from "ts-debounce";
import styles from "./BlueskyAuthForm.module.css";

type AuthMode = "login" | "signup" | "connect";

interface BlueskyAuthFormProps {
	mode: AuthMode;
	searchParams: URLSearchParams;
}

interface BlueskyActor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}

const modeLabels: Record<AuthMode, { button: string }> = {
	login: {
		button: "Continue with Atmosphere",
	},
	signup: {
		button: "Continue with Atmosphere",
	},
	connect: {
		button: "Connect Atmosphere account",
	},
};

const BlueskyAuthForm = ({ mode, searchParams }: BlueskyAuthFormProps) => {
	const { button } = modeLabels[mode];
	const isConnect = mode === "connect";

	const [inputValue, setInputValue] = useState("");
	const [suggestions, setSuggestions] = useState<BlueskyActor[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	const searchActors = useCallback(async (query: string) => {
		if (!query || query.length < 2) {
			setSuggestions([]);
			return;
		}

		try {
			const response = await fetch(
				`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActorsTypeahead?q=${encodeURIComponent(query)}&limit=5`,
			);
			if (response.ok) {
				const data = await response.json();
				setSuggestions(data.actors || []);
			}
		} catch (error) {
			console.error("Failed to fetch suggestions:", error);
			setSuggestions([]);
		}
	}, []);

	const debouncedSearch = useCallback(
		debounce((query: string) => searchActors(query), 200),
		[],
	);

	useEffect(() => {
		debouncedSearch(inputValue);
	}, [inputValue, debouncedSearch]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);
		setShowSuggestions(true);
		setSelectedIndex(-1);
	};

	const handleSelectSuggestion = (actor: BlueskyActor) => {
		setInputValue(actor.handle);
		setSuggestions([]);
		setShowSuggestions(false);
		setSelectedIndex(-1);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!showSuggestions || suggestions.length === 0) return;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelectedIndex((prev) =>
					prev < suggestions.length - 1 ? prev + 1 : prev,
				);
				break;
			case "ArrowUp":
				e.preventDefault();
				setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
				break;
			case "Enter":
				if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
					e.preventDefault();
					handleSelectSuggestion(suggestions[selectedIndex]);
				}
				break;
			case "Escape":
				setShowSuggestions(false);
				setSelectedIndex(-1);
				break;
		}
	};

	const handleBlur = () => {
		// Delay hiding suggestions to allow click events to fire
		setTimeout(() => {
			if (!suggestionsRef.current?.contains(document.activeElement)) {
				setShowSuggestions(false);
				setSelectedIndex(-1);
			}
		}, 150);
	};

	return (
		<Form action="/bluesky/auth" method="GET">
			{mode !== "connect" && <input type="hidden" name="mode" value={mode} />}
			<Box mb={isConnect ? "0" : "4"}>
				<Text
					as="label"
					size="2"
					weight="medium"
					mb="1"
					style={{ display: "block" }}
				>
					Atmosphere handle
				</Text>
				<Text size="1" color="gray" mb="2" style={{ display: "block" }}>
					Your Bluesky, Blacksky, Northsky, or other compatible handle
				</Text>
				<Box className={styles.autocompleteContainer}>
					<TextField.Root
						ref={inputRef}
						name="handle"
						placeholder="username.bsky.social"
						required
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
						autoComplete="off"
						mb="3"
					>
						<TextField.Slot />
					</TextField.Root>
					{showSuggestions && suggestions.length > 0 && (
						<div ref={suggestionsRef} className={styles.suggestionsDropdown}>
							{suggestions.map((actor, index) => (
								<button
									type="button"
									key={actor.did}
									className={`${styles.suggestionItem} ${index === selectedIndex ? styles.selected : ""}`}
									onClick={() => handleSelectSuggestion(actor)}
									onMouseEnter={() => setSelectedIndex(index)}
								>
									{actor.avatar && (
										<img src={actor.avatar} alt="" className={styles.avatar} />
									)}
									<div className={styles.actorInfo}>
										{actor.displayName && (
											<span className={styles.displayName}>
												{actor.displayName}
											</span>
										)}
										<span className={styles.handle}>@{actor.handle}</span>
									</div>
								</button>
							))}
						</div>
					)}
				</Box>
				<Button
					type="submit"
					size="2"
					style={isConnect ? undefined : { width: "100%" }}
				>
					{button}
				</Button>
			</Box>

			{searchParams.get("error") === "oauth" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						We had trouble{" "}
						{mode === "login"
							? "logging you in"
							: mode === "signup"
								? "signing you up"
								: "connecting"}{" "}
						with Bluesky. Please try again.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "resolver" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						We couldn't find that Bluesky handle. Please check and try again.
						Make sure you use the full handle (e.g. myusername.bsky.social).
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "account_not_found" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						No account found with this Bluesky handle. Please sign up first.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "denied" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						You denied Sill access. If this was a mistake, please try again and
						make sure you click "Accept" on the final screen.
					</Callout.Text>
				</Callout.Root>
			)}
			{searchParams.get("error") === "handle_required" && (
				<Callout.Root mt="4" mb="4" color="red">
					<Callout.Icon>
						<CircleAlert width="18" height="18" />
					</Callout.Icon>
					<Callout.Text>
						Please enter your Bluesky handle to continue.
					</Callout.Text>
				</Callout.Root>
			)}
		</Form>
	);
};

export default BlueskyAuthForm;
