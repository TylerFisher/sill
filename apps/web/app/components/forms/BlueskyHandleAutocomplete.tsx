import { TextField, Theme } from "@radix-ui/themes";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { debounce } from "ts-debounce";
import { useTheme } from "~/routes/resources/theme-switch";
import styles from "./BlueskyHandleAutocomplete.module.css";

interface BlueskyActor {
	did: string;
	handle: string;
	displayName?: string;
	avatar?: string;
}

interface BlueskyHandleAutocompleteProps {
	name: string;
	placeholder?: string;
	required?: boolean;
	style?: React.CSSProperties;
}

const BlueskyHandleAutocomplete = ({
	name,
	placeholder = "username.bsky.social",
	required = false,
	style,
}: BlueskyHandleAutocompleteProps) => {
	const theme = useTheme();
	const [inputValue, setInputValue] = useState("");
	const [suggestions, setSuggestions] = useState<BlueskyActor[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedIndex, setSelectedIndex] = useState(-1);
	const [dropdownPosition, setDropdownPosition] = useState<{
		top: number;
		left: number;
		width: number;
	} | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);

	const updateDropdownPosition = useCallback(() => {
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			setDropdownPosition({
				top: rect.bottom + window.scrollY + 4,
				left: rect.left + window.scrollX,
				width: rect.width,
			});
		}
	}, []);

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

	useEffect(() => {
		if (showSuggestions) {
			updateDropdownPosition();
			window.addEventListener("scroll", updateDropdownPosition, true);
			window.addEventListener("resize", updateDropdownPosition);
			return () => {
				window.removeEventListener("scroll", updateDropdownPosition, true);
				window.removeEventListener("resize", updateDropdownPosition);
			};
		}
	}, [showSuggestions, updateDropdownPosition]);

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
		setTimeout(() => {
			if (!suggestionsRef.current?.contains(document.activeElement)) {
				setShowSuggestions(false);
				setSelectedIndex(-1);
			}
		}, 150);
	};

	return (
		<div ref={containerRef} className={styles.container}>
			<TextField.Root
				ref={inputRef}
				name={name}
				placeholder={placeholder}
				required={required}
				size="3"
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				onFocus={() => {
					if (inputValue.length >= 2) {
						updateDropdownPosition();
						setShowSuggestions(true);
					}
				}}
				autoComplete="off"
				style={style}
			>
				<TextField.Slot />
			</TextField.Root>
			{showSuggestions &&
				suggestions.length > 0 &&
				dropdownPosition &&
				createPortal(
					<Theme appearance={theme}>
						<div
							ref={suggestionsRef}
							className={styles.dropdown}
							style={{
								position: "absolute",
								top: dropdownPosition.top,
								left: dropdownPosition.left,
								width: dropdownPosition.width,
							}}
						>
							{suggestions.map((actor, index) => (
								<button
									type="button"
									key={actor.did}
									className={`${styles.item} ${index === selectedIndex ? styles.selected : ""}`}
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
					</Theme>,
					document.body,
				)}
		</div>
	);
};

export default BlueskyHandleAutocomplete;
