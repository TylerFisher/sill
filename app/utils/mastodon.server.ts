const CLIENT_ID = process.env.MASTODON_CLIENT_ID;
const CLIENT_SECRET = process.env.MASTODON_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI as string; // e.g., 'http://localhost:3000/auth

export const getAuthorizationUrl = (instance: string) => {
	return `${instance}/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&instance=${encodeURIComponent(instance)}`;
};

export const getAccessToken = async (instance: string, code: string) => {
	const response = await fetch(`${instance}/oauth/token`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_uri: REDIRECT_URI,
			code,
			grant_type: "authorization_code",
		}),
	});
	return response.json(); // This will include access_token, token_type, etc.
};
