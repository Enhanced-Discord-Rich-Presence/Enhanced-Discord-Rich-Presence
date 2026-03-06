let titleObserver = null;

const ENABLE_PLAYING_TAB_HEALTH_CHECK = true;
const PLAYING_TAB_HEALTH_CHECK_INTERVAL_MS = 5000;

let lastSentTitle = "";
let lastSentUrl = "";
let lastSentThumbnail = "";
let lastSentAuthor = "";
let lastSentAuthorUrl = "";
let lastSentPlaying = null;
let lastSentTrackKey = "";
let lastSentTime = 0;

let lastBrowsingActivityKey = null;
let lastBrowsingActivityText = null;
let browsingActivityStartTime = null;
let browsingActivityCheckInterval = null;

let cachedInformationPopups = null;
let cachedRpcYoutubeMusic = null;
let playingTabHealthCheckInFlight = false;

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

function getStableTrackKey() {
	const queueItem = getQueueItem();
	const fromQueue = queueItem?.getAttribute?.('video-id') || queueItem?.dataset?.videoId || '';
	const fromUrl = new URLSearchParams(window.location.search).get('v') || '';
	const videoId = fromQueue || fromUrl;
	if (videoId) return `vid:${videoId}`;

	const title = (getCleanTitle() || '').trim().toLowerCase();
	const author = (getAuthorData().name || '').trim().toLowerCase();
	return `${title}::${author}`;
}

async function checkBrowsingActivity() {
	const pageInfo = detectPageType();
	if (!pageInfo) return;

	const informationPopups = cachedInformationPopups;
	const rpcYoutubeMusic = cachedRpcYoutubeMusic;
	if (!rpcYoutubeMusic) return;

	
	const showSongWhileBrowsing = rpcYoutubeMusic.showSongWhileBrowsing !== false;
	if (showSongWhileBrowsing) {
		if (isMusicCurrentlyPlaying()) return;
		const showPausedRpc = rpcYoutubeMusic.showPausedRpc !== false;
		if (showPausedRpc && getQueueItem()) return;
	}

	const browsingActivities = rpcYoutubeMusic.browsingActivities
		|| rpcYoutubeMusic.paused?.browsingActivities
		|| rpcYoutubeMusic.running?.browsingActivities;
	if (!browsingActivities || !browsingActivities.enabled) return;

	const musicEnabled = rpcYoutubeMusic.running?.enabled
		?? rpcYoutubeMusic.paused?.enabled
		?? rpcYoutubeMusic.enabled
		?? true;
	if (musicEnabled === false) return;

	const activities = browsingActivities.activities || {};
	const activityKey = pageInfo.type;
	const activityData = activities[activityKey];
	if (!activityData || !activityData.enabled) return;

	if (activityKey !== lastBrowsingActivityKey || activityData.text !== lastBrowsingActivityText) {
		
		const isNewActivity = lastBrowsingActivityKey === null ? (browsingActivityStartTime === null) : true;
		lastBrowsingActivityKey = activityKey;
		lastBrowsingActivityText = activityData.text;
		if (isNewActivity) {
			browsingActivityStartTime = Math.floor(Date.now() / 1000);
		}

		
		const pausedConfig = rpcYoutubeMusic.paused || {};
		const runningConfig = rpcYoutubeMusic.running || {};
		const baseConfig = rpcYoutubeMusic.paused || rpcYoutubeMusic.running || rpcYoutubeMusic;
		const settings = {
			...baseConfig,
			details: BROWSING_ACTIVITY_LABELS[activityKey] || "Browsing YouTube Music",
			state: activityData.text
		};

		const pausedCustom = pausedConfig.special?.custom_name === true;
		const runningCustom = runningConfig.special?.custom_name === true;
		if (pausedCustom || runningCustom) {
			settings.special = {
				...(settings.special || {}),
				custom_name: true
			};
			settings.name = pausedCustom
				? pausedConfig.name
				: (runningConfig.name || settings.name);
		}

		
		if (settings.buttons) {
			settings.buttons = {
				...settings.buttons,
				"1": { ...(settings.buttons["1"] || {}), enabled: false },
				"2": { ...(settings.buttons["2"] || {}), enabled: false }
			};
		}

		if (activityKey === 'artist' || activityKey === 'channel') {
			const channelUrl = pageInfo.data.channel_url || window.location.href;
			if (!settings.buttons) settings.buttons = {};
			settings.buttons = {
				...settings.buttons,
				"1": { enabled: true, label: "Artist", url: channelUrl },
				"2": { ...(settings.buttons["2"] || {}), enabled: false }
			};
		}

		
		if (settings.timestamps) {
			settings.timestamps = { ...settings.timestamps, start: true, end: false };
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

		// Browsing activities should never show small images
		if (settings.assets && settings.assets.small) {
			settings.assets = {
				...settings.assets,
				small: {
					...settings.assets.small,
					enabled: false
				}
			};
		}

		
		const elapsed = browsingActivityStartTime
			? Math.floor(Date.now() / 1000) - browsingActivityStartTime
			: 0;

		await browser.runtime.sendMessage({
			action: "BROWSING_ACTIVITY",
			payload: { ...pageInfo.data, page_type: pageInfo.type, url: window.location.href, time: elapsed, browsingStartTime: browsingActivityStartTime },
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

async function sendToBackground(action, isNewTrack = false) {
	const queueItem = getQueueItem();
	if (!queueItem) return;

	const title = getCleanTitle();
	if (!title) return;

	const authorData = getAuthorData();
	const currentUrl = window.location.href;
	const thumbnail = getThumbnailUrl() || "youtubemusic";
	const currentTrackKey = getStableTrackKey();

	const payload = {
		url: currentUrl,
		title,
		author: authorData.name || "YouTube Music",
		author_url: authorData.url || "",
		author_avatar: "youtubemusic",
		thumbnail,
		time: isNewTrack ? 0 : getCurrentTime(),
		duration: isNewTrack ? getDuration() : getDuration(),
		timestamp: new Date().toISOString(),
	};

	lastSentTitle = title;
	lastSentUrl = currentUrl;
	lastSentThumbnail = thumbnail;
	lastSentAuthor = payload.author;
	lastSentAuthorUrl = payload.author_url;
	lastSentPlaying = (action === "VIDEO_RESUMED");
	lastSentTrackKey = currentTrackKey;
	lastSentTime = payload.time;
	lastBrowsingActivityKey = null;
	lastBrowsingActivityText = null;
	browsingActivityStartTime = null;

	browser.runtime.sendMessage({
		action,
		payload
	});
}

async function checkMetadataConsistency() {
	const queueItem = getQueueItem();
	if (!queueItem) return;

	const informationPopups = cachedInformationPopups;

	const currentTitle = getCleanTitle();
	const currentUrl = window.location.href;
	const currentThumbnail = getThumbnailUrl();
	const authorData = getAuthorData();
    const currentTrackKey = getStableTrackKey();
	const currentTime = getCurrentTime();

	const titleChanged = currentTitle !== lastSentTitle;
	const urlChanged = currentUrl !== lastSentUrl;
	const thumbnailChanged = (currentThumbnail || "") !== (lastSentThumbnail || "");
	const authorChanged = (authorData.name || "") !== (lastSentAuthor || "") || (authorData.url || "") !== (lastSentAuthorUrl || "");
	const timeChanged = Math.abs(currentTime - lastSentTime) > 3;

	
	const currentlyPlaying = isMusicCurrentlyPlaying();
	const playStateChanged = lastSentPlaying !== null && currentlyPlaying !== lastSentPlaying;

	
	const isNewTrack = currentTrackKey !== lastSentTrackKey;
	const hasSignificantChange = isNewTrack || playStateChanged || authorChanged || titleChanged || urlChanged || thumbnailChanged || (timeChanged && !isNewTrack);
	const isDataValid = !!currentTitle;

	if (hasSignificantChange && isDataValid) {
		sendToBackground(currentlyPlaying ? "VIDEO_RESUMED" : "VIDEO_PAUSED", isNewTrack);

		
		if (informationPopups && isNewTrack) {
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

async function ensurePlayingTabSelectedForRpc() {
	if (!ENABLE_PLAYING_TAB_HEALTH_CHECK) return;
	if (playingTabHealthCheckInFlight) return;

	const queueItem = getQueueItem();
	if (!queueItem) return;

	const title = getCleanTitle();
	if (!title) return;

	if (!isMusicCurrentlyPlaying()) return;

	playingTabHealthCheckInFlight = true;
	try {
		await browser.runtime.sendMessage({
			action: "ENSURE_YTMUSIC_PLAYING_TAB_SELECTED",
			isPlaying: true,
			title
		});
	} catch { }
	finally {
		playingTabHealthCheckInFlight = false;
	}
}

function setupTitleObserver() {
	if (titleObserver) titleObserver.disconnect();
	const container = document.querySelector('ytmusic-player-queue #contents')
		|| document.querySelector('ytmusic-player-queue');
	if (!container) return;
	titleObserver = new MutationObserver(() => checkMetadataConsistency());
	titleObserver.observe(container, { childList: true, subtree: true, attributes: true, characterData: true });
}

function setupVideoEventListeners() {
	const video = document.querySelector('video');
	if (!video) return;

	// Remove existing listeners if any to avoid duplicates
	if (video._ytmusicSeekHandler) {
		video.removeEventListener('seeked', video._ytmusicSeekHandler);
	}
	if (video._ytmusicTimeUpdateHandler) {
		video.removeEventListener('timeupdate', video._ytmusicTimeUpdateHandler);
	}

	// Handle seeking - immediately update time
	const seekHandler = () => {
		const queueItem = getQueueItem();
		if (queueItem && lastSentPlaying !== null) {
			checkMetadataConsistency();
		}
	};
	video._ytmusicSeekHandler = seekHandler;
	video.addEventListener('seeked', seekHandler);

	// Handle time updates - throttled to avoid excessive updates
	let lastTimeUpdate = 0;
	const timeUpdateHandler = () => {
		const now = Date.now();
		if (now - lastTimeUpdate > 5000) { // Only update every 5 seconds
			lastTimeUpdate = now;
			const queueItem = getQueueItem();
			if (queueItem && lastSentPlaying !== null) {
				checkMetadataConsistency();
			}
		}
	};
	video._ytmusicTimeUpdateHandler = timeUpdateHandler;
	video.addEventListener('timeupdate', timeUpdateHandler);
}

async function handleNavigation() {
	lastSentTitle = "";
	lastSentUrl = "";
	lastSentThumbnail = "";
	lastSentAuthor = "";
	lastSentAuthorUrl = "";
	lastSentPlaying = null;
	lastSentTrackKey = "";
	lastBrowsingActivityKey = null;
	lastBrowsingActivityText = null;
	browsingActivityStartTime = null;

	setupTitleObserver();
	setupVideoEventListeners();
	checkBrowsingActivity();

	
	let attempts = 0;
	const checkMetadata = setInterval(async () => {
		const queueItem = getQueueItem();
		const title = queueItem ? getCleanTitle() : null;

		if ((title && queueItem) || attempts > 10) {
			if (title) sendToBackground(isMusicCurrentlyPlaying() ? "VIDEO_RESUMED" : "VIDEO_PAUSED");
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
	// Always ensure video listeners are set up, even when hidden
	setupVideoEventListeners();
});

// Check for track activity every 2 seconds
setInterval(() => {
	if (getQueueItem()) {
		checkMetadataConsistency();
		// Periodically ensure video listeners are attached
		setupVideoEventListeners();
	}
}, 2000);

if (ENABLE_PLAYING_TAB_HEALTH_CHECK) {
	setInterval(() => {
		ensurePlayingTabSelectedForRpc();
	}, PLAYING_TAB_HEALTH_CHECK_INTERVAL_MS);
}

// Check for browsing activity every 1 second
if (browsingActivityCheckInterval) clearInterval(browsingActivityCheckInterval);
browsingActivityCheckInterval = setInterval(() => {
	checkBrowsingActivity();
}, 1000);

browser.runtime.onMessage.addListener(async (message) => {
	if (message.action === "REQUEST_SYNC") {
		// Ensure we have the latest settings before we decide what to send
		await refreshCachedSettings();

		const queueItem = getQueueItem();
		if (queueItem) {
			const currentTitle = getCleanTitle();
			const currentUrl = window.location.href;
			const currentTrackKey = getStableTrackKey();
			const currentlyPlaying = isMusicCurrentlyPlaying();
			const action = currentlyPlaying ? "VIDEO_RESUMED" : "VIDEO_PAUSED";
			const isSameSong = currentTrackKey && currentTrackKey === lastSentTrackKey;
			const isSamePlayState = lastSentPlaying !== null && currentlyPlaying === lastSentPlaying;

			// Always resend so the bridge can auto-select this tab if needed
			sendToBackground(action);

			// Only show the info popup for new tracks/state changes or explicit select requests
			if (cachedInformationPopups && currentTitle && (!(isSameSong && isSamePlayState) || message.showPopup)) {
				browser.runtime.sendMessage({
					action: "show_broadcast_global",
					data: {
						title: "Broadcasting Track to RPC",
						text: currentTitle
					}
				});
			}
		} else {
			await checkBrowsingActivity();
		}
	}
});
