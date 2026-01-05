let videoElement = null;
let titleObserver = null;

let lastSentTitle = "";
let lastSentUrl = "";
let lastSentThumbnail = "";
let lastSentAuthor = "";
let lastSentAuthorUrl = "";
let lastSentAuthorAvatar = "";

let lastBrowsingActivityKey = null;
let lastBrowsingActivityText = null;
let browsingActivityCheckInterval = null;

let cachedInformationPopups = null;
let cachedRpcYoutubeMusic = null;

async function refreshCachedSettings() {
	try {
		const { informationPopups, rpcYoutubeMusic } = await browser.storage.local.get(["informationPopups", "rpcYoutubeMusic"]);
		cachedInformationPopups = informationPopups;
		cachedRpcYoutubeMusic = rpcYoutubeMusic;
	} catch { }
}

refreshCachedSettings();
browser.storage.onChanged.addListener((changes, area) => {
	if (area !== 'local') return;
	if (changes.informationPopups) cachedInformationPopups = changes.informationPopups.newValue;
	if (changes.rpcYoutubeMusic) cachedRpcYoutubeMusic = changes.rpcYoutubeMusic.newValue;
});

const BROWSING_ACTIVITY_LABELS = {
	homepage: "Homepage",
	explore: "Explore",
	library: "Library",
	search: "Search",
	playlist: "Playlist",
	album: "Album",
	artist: "Artist",
	channel: "Channel",
};

function interpolateBrowsingPlaceholders(text, data) {
	if (!text) return "";
	const map = {
		"%channel%": (data && data.channel) ? String(data.channel) : "",
		"%query%": (data && data.query) ? String(data.query) : "",
		"%playlist%": (data && data.playlist) ? String(data.playlist) : "",
	};

	let out = String(text);
	for (const [k, v] of Object.entries(map)) {
		out = out.split(k).join(v);
	}
	return out;
}

const authorAvatarCache = new Map();

async function getAuthorAvatar(authorUrl) {
	if (!authorUrl) return "";
	if (authorAvatarCache.has(authorUrl)) return authorAvatarCache.get(authorUrl) || "";

	// Best-effort DOM scrape first
	try {
		const u = new URL(authorUrl);
		const path = u.pathname;
		const domImg = document.querySelector(`a[href^="${path}"] img, a[href*="${path}"] img`)?.src;
		if (domImg && !domImg.includes('data:image')) {
			authorAvatarCache.set(authorUrl, domImg);
			return domImg;
		}
	} catch { }

	// Fallback: fetch channel page HTML and grab og:image
	try {
		const resp = await fetch(authorUrl, { method: 'GET' });
		if (!resp.ok) {
			authorAvatarCache.set(authorUrl, "");
			return "";
		}
		const html = await resp.text();
		const og = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)
			|| html.match(/content=["']([^"']+)["']\s+property=["']og:image["']/i);
		const tw = html.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i)
			|| html.match(/content=["']([^"']+)["']\s+name=["']twitter:image["']/i);
		const avatarUrl = (og && og[1]) || (tw && tw[1]) || "";
		authorAvatarCache.set(authorUrl, avatarUrl);
		return avatarUrl;
	} catch {
		authorAvatarCache.set(authorUrl, "");
		return "";
	}
}

function isSongPage() {
	const pathname = window.location.pathname;
	const searchParams = new URLSearchParams(window.location.search);
	return pathname === "/watch" && searchParams.has("v");
}

function getCleanTitle() {
	const playerTitle = document.querySelector(
		'ytmusic-player-bar .title, ytmusic-player-bar .title.ytmusic-player-bar, ytmusic-player-bar [class*="title"]'
	)?.textContent?.trim();
	if (playerTitle) return playerTitle;

	const raw = document.title || "";
	const cleaned = raw
		.replace(/^\(\d+\)\s/, "")
		.replace(/\s-\sYouTube Music$/i, "")
		.trim();

	if (!cleaned || cleaned.toLowerCase() === "youtube music") return null;
	return cleaned;
}

function getAuthorData() {
	const subtitle = document.querySelector('ytmusic-player-bar .subtitle, ytmusic-player-bar .subtitle.ytmusic-player-bar');

	const artistLink = subtitle?.querySelector('a[href*="/channel"], a[href*="/@"], a[href*="/c/"]')
		|| document.querySelector('ytmusic-player-bar a[href*="/channel"], ytmusic-player-bar a[href^="/@"]');

	const rawArtistName = artistLink?.textContent?.trim()
		|| subtitle?.querySelector('yt-formatted-string')?.textContent?.trim()
		|| subtitle?.textContent?.trim()
		|| "YouTube Music";

	// Remove extra metadata like view/like counts (separated by these nice lookin bullets)
	const artistName = String(rawArtistName).split(/[•·]/)[0].trim() || "YouTube Music";

	const artistUrl = artistLink?.href || "";

	return { name: artistName, url: artistUrl, avatar: "" };
}

function getThumbnailUrl() {
	const img = document.querySelector('ytmusic-player-bar #thumbnail img, ytmusic-player-bar img#img, ytmusic-player-bar img');
	const src = img?.src || img?.getAttribute?.('src') || "";
	if (!src) return "";

	if (src.includes('data:image')) return "";
	return src;
}

function detectPageType() {
	const pathname = window.location.pathname;
	const searchParams = new URLSearchParams(window.location.search);

	if (isSongPage()) return null;

	if (pathname === "/" || pathname === "") {
		return { type: "homepage", data: {} };
	}
	if (pathname === "/explore") {
		return { type: "explore", data: {} };
	}
	if (pathname === "/library") {
		return { type: "library", data: {} };
	}
	if (pathname === "/search" && searchParams.has("q")) {
		return { type: "search", data: { query: searchParams.get("q") } };
	}
	if (pathname === "/playlist" && searchParams.has("list")) {
		const playlistName = document.querySelector('h1 yt-formatted-string, h1.title')?.textContent?.trim() || "Playlist";
		return { type: "playlist", data: { playlist: playlistName } };
	}
	// Music uses /browse/<id> for album/artist pages
	if (pathname.startsWith("/browse/")) {
		const pageTitle = document.querySelector('h1 yt-formatted-string, h1.title')?.textContent?.trim() || "Browsing";
		// If the page has a subscribe button or channel link, treat as artist
		const channelAnchor = document.querySelector('a[href*="/channel"], a[href^="/@"]');
		const hasChannelLink = !!channelAnchor;

		if (hasChannelLink) {
			return {
				type: "artist",
				data: {
					channel: pageTitle,
					channel_url: channelAnchor?.href || ""
				}
			};
		}

		return { type: "album", data: { playlist: pageTitle } };
	}
	if (pathname.startsWith("/@") || pathname.startsWith("/channel/") || pathname.startsWith("/c/")) {
		const segments = pathname.split('/').filter(Boolean);
		const channelUrl = `${window.location.origin}/${segments[0] ? segments[0].startsWith('@') ? segments[0] : `${segments[0]}/${segments[1] || ''}` : ''}`.replace(/\/$/, '');
		const channelName = document.querySelector('h1 yt-formatted-string, h1.title')?.textContent?.trim() || segments[0] || "Channel";
		return { type: "channel", data: { channel: channelName, channel_url: channelUrl } };
	}

	return null;
}

async function checkBrowsingActivity() {
	const pageInfo = detectPageType();
	if (!pageInfo) return;

	const informationPopups = cachedInformationPopups;
	const rpcYoutubeMusic = cachedRpcYoutubeMusic;
	if (!rpcYoutubeMusic) return;

	const browsingActivities = rpcYoutubeMusic.browsingActivities
		|| rpcYoutubeMusic.paused?.browsingActivities
		|| rpcYoutubeMusic.running?.browsingActivities;
	if (!browsingActivities || !browsingActivities.enabled) return;

	const musicEnabled = rpcYoutubeMusic.running?.enabled ?? rpcYoutubeMusic.enabled ?? true;
	if (musicEnabled === false) return;

	const activities = browsingActivities.activities || {};
	const activityKey = pageInfo.type;
	const activityData = activities[activityKey];
	if (!activityData || !activityData.enabled) return;

	if (activityKey !== lastBrowsingActivityKey || activityData.text !== lastBrowsingActivityText) {
		lastBrowsingActivityKey = activityKey;
		lastBrowsingActivityText = activityData.text;

		const baseCfg = rpcYoutubeMusic.paused || rpcYoutubeMusic.running || rpcYoutubeMusic;
		const settings = {
			...baseCfg,
			details: BROWSING_ACTIVITY_LABELS[activityKey] || "Browsing YouTube Music",
			state: activityData.text
		};

		if (settings.buttons) {
			settings.buttons = {
				...settings.buttons,
				"1": { ...(settings.buttons["1"] || {}), enabled: false },
				"2": { ...(settings.buttons["2"] || {}), enabled: false }
			};
		}

		if (activityKey === 'artist' || activityKey === 'channel') {
			const url = pageInfo.data.channel_url || window.location.href;
			if (!settings.buttons) settings.buttons = {};
			settings.buttons = {
				...settings.buttons,
				"1": { enabled: true, label: "Artist", url },
				"2": { ...(settings.buttons["2"] || {}), enabled: false }
			};
		}

		if (settings.timestamps) {
			settings.timestamps = { ...settings.timestamps, start: false, end: false };
		}

		if (settings.assets && settings.assets.large) {
			settings.assets = {
				...settings.assets,
				large: {
					...settings.assets.large,
					enabled: true,
					large_image: "youtubemusic"
				}
			};
		}

		if (settings.assets && settings.assets.small) {
			settings.assets = {
				...settings.assets,
				small: {
					...settings.assets.small,
					enabled: false
				}
			};
		}

		await browser.runtime.sendMessage({
			action: "BROWSING_ACTIVITY",
			payload: { ...pageInfo.data, page_type: pageInfo.type, url: window.location.href },
			currentSite: "YoutubeMusic",
			settings
		});

		if (informationPopups) {
			const resolvedState = interpolateBrowsingPlaceholders(settings.state, pageInfo.data);
			browser.runtime.sendMessage({
				action: "show_broadcast_global",
				data: {
					title: "Broadcasting to RPC",
					text: `${settings.details}: ${resolvedState}`
				}
			});
		}
	}
}

async function sendToBackground(action) {
	if (!isSongPage()) return;

	const title = getCleanTitle();
	if (!title) return;

	const authorData = getAuthorData();
	const authorAvatar = await getAuthorAvatar(authorData.url);
	const video = document.querySelector('video');
	const currentUrl = window.location.href;
	const thumbnail = getThumbnailUrl() || "youtubemusic";

	const payload = {
		url: currentUrl,
		title,
		author: authorData.name || "YouTube Music",
		author_url: authorData.url || "",
		author_avatar: authorAvatar || authorData.avatar || "youtubemusic",
		thumbnail,
		time: video ? video.currentTime : 0,
		duration: video ? video.duration : 0,
		timestamp: new Date().toISOString(),
	};

	lastSentTitle = title;
	lastSentUrl = currentUrl;
	lastSentThumbnail = thumbnail;
	lastSentAuthor = payload.author;
	lastSentAuthorUrl = payload.author_url;
	lastSentAuthorAvatar = payload.author_avatar;
	lastBrowsingActivityKey = null;
	lastBrowsingActivityText = null;

	browser.runtime.sendMessage({
		action,
		payload
	});
}

function attachListeners() {
	if (!isSongPage()) return;
	const video = document.querySelector('video');
	if (!video) return;

	if (video !== videoElement || video.dataset.lastSrc !== video.currentSrc) {
		videoElement = video;
		video.dataset.lastSrc = video.currentSrc;

		const triggerSync = () => sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");

		video.removeEventListener('play', triggerSync);
		video.removeEventListener('pause', triggerSync);
		video.addEventListener('play', triggerSync);
		video.addEventListener('pause', () => { if (!video.seeking) triggerSync(); });
		video.addEventListener('seeked', triggerSync);
		video.addEventListener('loadedmetadata', triggerSync);

		if (video.readyState >= 1) triggerSync();
	}
}

async function checkMetadataConsistency() {
	if (!isSongPage()) return;

	const informationPopups = cachedInformationPopups;
	const video = document.querySelector('video');
	if (!video) return;

	const currentTitle = getCleanTitle();
	const currentUrl = window.location.href;
	const currentThumb = getThumbnailUrl();
	const author = getAuthorData();
	const authorAvatar = await getAuthorAvatar(author.url);

	const titleChanged = currentTitle !== lastSentTitle;
	const urlChanged = currentUrl !== lastSentUrl;
	const thumbChanged = (currentThumb || "") !== (lastSentThumbnail || "");
	const authorChanged = (author.name || "") !== (lastSentAuthor || "") || (author.url || "") !== (lastSentAuthorUrl || "");
	const authorAvatarChanged = (authorAvatar || "") !== (lastSentAuthorAvatar || "");

	const hasChanged = titleChanged || urlChanged || thumbChanged || authorChanged || authorAvatarChanged;
	const isDataValid = !!currentTitle;

	if (hasChanged && isDataValid) {
		sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");

		if (informationPopups && (titleChanged || urlChanged)) {
			browser.runtime.sendMessage({
				action: "show_broadcast_global",
				data: {
					title: "Broadcasting Track to RPC",
					text: currentTitle
				}
			});
		}
	}
}

function setupTitleObserver() {
	if (titleObserver) titleObserver.disconnect();
	const titleElement = document.querySelector('title');
	if (!titleElement) return;
	titleObserver = new MutationObserver(() => checkMetadataConsistency());
	titleObserver.observe(titleElement, { childList: true, subtree: true, characterData: true });
}

async function handleNavigation() {
	lastSentTitle = "";
	lastSentUrl = "";
	lastSentThumbnail = "";
	lastSentAuthor = "";
	lastSentAuthorUrl = "";
	lastBrowsingActivityKey = null;
	lastBrowsingActivityText = null;

	setupTitleObserver();
	checkBrowsingActivity();

	let attempts = 0;
	const checkMetadata = setInterval(async () => {
		if (!isSongPage()) {
			clearInterval(checkMetadata);
			return;
		}

		const title = getCleanTitle();
		const video = document.querySelector('video');

		if ((title && video && video.readyState >= 1) || attempts > 10) {
			attachListeners();
			if (title) sendToBackground(video && video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
			clearInterval(checkMetadata);
		}
		attempts++;
	}, 200);
}

document.addEventListener('yt-navigate-finish', handleNavigation);
if (document.readyState === 'complete') handleNavigation();
else window.addEventListener('load', handleNavigation);

document.addEventListener("visibilitychange", () => {
	if (!document.hidden) {
		checkMetadataConsistency();
		setupTitleObserver();
		checkBrowsingActivity();
	}
});

// Track activity every 2 seconds
setInterval(() => {
	if (isSongPage()) {
		attachListeners();
		checkMetadataConsistency();
	}
}, 2000);

// Browsing activity check every 1 second
if (browsingActivityCheckInterval) clearInterval(browsingActivityCheckInterval);
browsingActivityCheckInterval = setInterval(() => {
	checkBrowsingActivity();
}, 1000);

browser.runtime.onMessage.addListener(async (msg) => {
	if (msg.action === "REQUEST_SYNC") {
		// Ensure we have the latest settings before we decide what to send
		await refreshCachedSettings();

		const video = document.querySelector('video');
		if (isSongPage() && video) {
			sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
		} else {
			// Force a re-send even if it's the same browsing activity as last time
			lastBrowsingActivityKey = null;
			lastBrowsingActivityText = null;
			await checkBrowsingActivity();
		}
	}
});
