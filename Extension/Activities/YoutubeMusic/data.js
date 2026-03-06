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
	for (const [key, value] of Object.entries(map)) {
		out = out.split(key).join(value);
	}
	return out;
}

function getQueueItem() {
	return document.querySelector('ytmusic-player-queue-item[play-button-state="playing"]')
		|| document.querySelector('ytmusic-player-queue-item[play-button-state="paused"]')
		|| document.querySelector('ytmusic-player-queue-item[selected]')
		|| null;
}

function parseTimeString(timeString) {
	if (!timeString) return 0;
	const parts = timeString.trim().split(':').map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return parts[0] || 0;
}

function isMusicCurrentlyPlaying() {
	const queueItem = getQueueItem();
	if (queueItem) {
		const state = queueItem.getAttribute('play-button-state');
		if (state) return state.toLowerCase() !== 'paused';
	}

	// Fallback to player bar controls when queue state is missing.
	const playerBar = document.querySelector('ytmusic-player-bar');
	const playButton = playerBar?.querySelector('tp-yt-paper-icon-button.play-pause-button');
	const title = (playButton?.getAttribute('title') || '').toLowerCase();
	if (title.includes('pause')) return true;
	if (title.includes('play')) return false;

	const video = document.querySelector('video');
	if (video) return !video.paused;

	return false;
}

function getCleanTitle() {
	const queueItem = getQueueItem();
	if (queueItem) {
		const titleElement = queueItem.querySelector('.song-title');
		const title = titleElement?.textContent?.trim();
		if (title) return title;
	}

	const playerBarTitle = document.querySelector('ytmusic-player-bar .title, ytmusic-player-bar .content-info-wrapper .title')
		?.textContent?.trim();
	return playerBarTitle || null;
}

function getAuthorData() {
	const queueItem = getQueueItem();
	if (!queueItem) {
		const playerBar = document.querySelector('ytmusic-player-bar');
		const playerBylineLink = playerBar?.querySelector('.byline a, .content-info-wrapper .byline a');
		const playerBylineText = playerBylineLink?.textContent?.trim()
			|| playerBar?.querySelector('.byline, .content-info-wrapper .byline')?.textContent?.trim()
			|| "YouTube Music";

		const playerArtist = String(playerBylineText).split(/[•·]/)[0].trim() || "YouTube Music";
		return { name: playerArtist, url: playerBylineLink?.href || "", avatar: "" };
	}

	const bylineElement = queueItem.querySelector('.byline');
	const artistLink = bylineElement?.querySelector('a');

	const rawArtistName = artistLink?.textContent?.trim()
		|| bylineElement?.textContent?.trim()
		|| "YouTube Music";

	// Remove extra metadata like view/like counts (separated by these nice lookin bullets)
	const artistName = String(rawArtistName).split(/[•·]/)[0].trim() || "YouTube Music";

	const artistUrl = artistLink?.href || "";

	return { name: artistName, url: artistUrl, avatar: "" };
}

function getThumbnailUrl() {
	// Try the queue item thumbnail first
	const queueItem = getQueueItem();
	if (queueItem) {
		const queueImg = queueItem.querySelector('img#img');
		const queueSrc = queueImg?.src || queueImg?.getAttribute?.('src') || "";
		if (queueSrc && !queueSrc.includes('data:image')) return queueSrc;
	}

	// Fallback: player bar thumbnail (should always be loaded, even when browsing non-song pages)
	const playerBar = document.querySelector('ytmusic-player-bar');
	if (playerBar) {
		const playerImg = playerBar.querySelector('.middle-controls img, .thumbnail img, img.yt-img-shadow');
		const playerSrc = playerImg?.src || playerImg?.getAttribute?.('src') || "";
		if (playerSrc && !playerSrc.includes('data:image')) return playerSrc;
	}

	return "";
}

function getDuration() {
	const video = document.querySelector('video');
	if (video && video.readyState >= 1 && isFinite(video.duration)) return video.duration;

	// Fallback: parse from the queue item DOM
	const queueItem = getQueueItem();
	if (!queueItem) return 0;
	const durationElement = queueItem.querySelector('.duration');
	return parseTimeString(durationElement?.textContent);
}

function getCurrentTime() {
	const video = document.querySelector('video');
	if (video && video.readyState >= 1) return video.currentTime;

	// Fallback: parse the player-bar time text
	const timeInfo = document.querySelector('ytmusic-player-bar .time-info');
	if (!timeInfo) return 0;
	const text = timeInfo.textContent || "";
	const match = text.match(/^[\s]*([^\s/]+)/);
	return match ? parseTimeString(match[1]) : 0;
}

function detectPageType() {
	const pathname = window.location.pathname;
	const searchParams = new URLSearchParams(window.location.search);

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
	// Youtube Music uses /browse/<id> for album/artist pages
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
