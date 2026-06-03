import * as ReactTweet from "react-tweet";
import { Component, type ReactNode } from "react";
import { ClientOnly } from "remix-utils/client-only";

const { Tweet } = ReactTweet;

/**
 * react-tweet can crash on a malformed syndication response (deleted /
 * protected / age-restricted tweets, etc.) — the failure happens inside its
 * `enrichTweet` useMemo with "entities is not iterable", which isn't an error
 * react-tweet handles internally. Containing it here keeps a single bad embed
 * from taking down the whole page; the embed just doesn't render.
 */
class TweetErrorBoundary extends Component<
	{ children: ReactNode; onError?: () => void },
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch() {
		this.props.onError?.();
	}
	render() {
		if (this.state.failed) return null;
		return this.props.children;
	}
}

interface XEmbedProps {
	url: URL;
	onError?: () => void;
}

const XEmbed = ({ url, onError }: XEmbedProps) => {
	// Only embed when the URL is a real status link with a numeric tweet id.
	// LinkRep gates this component by host alone, so without this check a bare
	// profile/list/search URL would pass a junk id (e.g. a username) to
	// react-tweet. Trailing `/photo/N` is tolerated.
	const match = url.pathname.match(/\/status\/(\d+)(?:[/?#]|$)/);
	if (!match) return null;
	const id = match[1];
	return (
		<ClientOnly>
			{() => (
				<TweetErrorBoundary onError={onError}>
					<Tweet id={id} />
				</TweetErrorBoundary>
			)}
		</ClientOnly>
	);
};

export default XEmbed;
