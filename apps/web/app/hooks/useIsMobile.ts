import { useEffect, useState } from "react";

/**
 * True when the viewport is at or below the mobile breakpoint. SSR-safe: starts
 * false (desktop) and settles after mount. Used to switch a control between a
 * desktop popover and a full-screen mobile panel.
 */
export const useIsMobile = (query = "(max-width: 767px)"): boolean => {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia(query);
		const update = () => setMatches(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, [query]);

	return matches;
};
