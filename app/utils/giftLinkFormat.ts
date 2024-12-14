interface GiftLinkFormat {
	[key: string]: string[];
}

export const giftLinkFormats: GiftLinkFormat = {
	"bloomberg.com": ["accessToken"],
	"ft.com": ["accessToken"],
	"nytimes.com": ["unlocked_article_code"],
	"washingtonpost.com": ["pwapi_token"],
	"oregonlive.com": ["gift"],
	"wsj.com": ["st"],
	"puck.news": ["sharer", "token"],
	"theatlantic.com": ["gift"],
	"medium.com": ["sk"],
	"thetimes.com": ["shareToken"],
	"defector.com": ["giftLink"],
	"aftermath.site": ["giftLink"],
	"nj.com": ["gift"],
	"mercurynews.com": ["share"],
	"haaretz.com": ["gift"],
	"economist.com": ["giftId"],
	"chicagotribune.com": ["share"],
	"zeit.de": ["freebie"],
	"sueddeutsche.de": ["token"],
	"foreignpolicy.com": ["utm_content", "gifting_article"],
	"courant.com": ["share"],
	"racketmn.com": ["giftLink"],
};
