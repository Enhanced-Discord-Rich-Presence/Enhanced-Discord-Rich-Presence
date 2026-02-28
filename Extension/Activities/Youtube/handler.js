let videoElement = null;
let titleObserver = null;

let lastSentTitle = "";
let lastSentUrl = "";
let lastSentThumbnail = "";
let lastSentAuthorAvatar = "";

let lastBrowsingActivityKey = null;
let lastBrowsingActivityText = null;
let browsingActivityStartTime = null;
let browsingActivityCheckInterval = null;
let lastMonitoredUrl = window.location.href;

let cachedInformationPopups = null;
let cachedRpcYoutube = null;

async function refreshCachedSettings() {
    try {
        const { informationPopups, rpcYoutube } = await browser.storage.local.get(["informationPopups", "rpcYoutube"]);
        cachedInformationPopups = informationPopups;
        cachedRpcYoutube = rpcYoutube;
    } catch { }
}

refreshCachedSettings();
browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.informationPopups) cachedInformationPopups = changes.informationPopups.newValue;
    if (changes.rpcYoutube) cachedRpcYoutube = changes.rpcYoutube.newValue;
});

async function checkBrowsingActivity() {
    const pageInfo = detectPageType();
    if (!pageInfo) return;

    const informationPopups = cachedInformationPopups;
    const rpcYoutube = cachedRpcYoutube;
    if (!rpcYoutube) return;

    const browsingActivities = rpcYoutube.browsingActivities
        || rpcYoutube.paused?.browsingActivities
        || rpcYoutube.running?.browsingActivities;
    if (!browsingActivities || !browsingActivities.enabled) return;

    const youtubeEnabled = rpcYoutube.running?.enabled ?? rpcYoutube.paused?.enabled;
    if (youtubeEnabled === false) return;

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

        const pausedConfig = rpcYoutube.paused || {};
        const runningConfig = rpcYoutube.running || {};
        const baseConfig = rpcYoutube.paused || rpcYoutube.running || {};
        const settings = {
            ...baseConfig,
            details: BROWSING_ACTIVITY_LABELS[activityKey] || "Browsing YouTube",
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

        if (activityKey === 'channel') {
            const channelUrl = pageInfo.data.channel_url || window.location.href;
            if (!settings.buttons) settings.buttons = {};
            settings.buttons = {
                ...settings.buttons,
                "1": { enabled: true, label: "Channel", url: channelUrl },
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
                    large_image: "youtube"
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
            currentSite: "Youtube",
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
    if (!isVideoPage()) return;

    const title = getCleanTitle();
    if (!title) return;

    const authorData = getAuthorData();

    if (!authorData.name && authorData.avatar === "youtube") {
        return;
    }

    const video = document.querySelector('video');
    const currentUrl = window.location.href;
    const thumbnail = await getVideoThumbnail(currentUrl);

    const payload = {
        url: currentUrl,
        title,
        author: authorData.name || "YouTube Artist",
        author_url: authorData.url,
        author_avatar: authorData.avatar,
        thumbnail,
        time: video ? video.currentTime : 0,
        duration: video ? video.duration : 0,
        timestamp: new Date().toISOString()
    };

    lastSentTitle = title;
    lastSentUrl = currentUrl;
    lastSentThumbnail = thumbnail;
    lastSentAuthorAvatar = authorData.avatar || "";
    lastBrowsingActivityKey = null;
    lastBrowsingActivityText = null;
    browsingActivityStartTime = null;

    browser.runtime.sendMessage({
        action,
        payload
    });
}

function observeOwnerChanges() {
    const owner = document.querySelector('#owner');
    if (!owner) return;

    const observer = new MutationObserver(() => {
        const authorData = getAuthorData();
        // If the avatar finally populates or changes, sync metadata
        if (authorData.avatar && authorData.avatar !== lastSentAuthorAvatar) {
            const video = document.querySelector('video');
            sendToBackground(video && video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
        }
    });

    observer.observe(owner, { childList: true, subtree: true, attributes: true });
}

function attachListeners() {
    if (!isVideoPage()) return;
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
    if (!isVideoPage()) return;

    const informationPopups = cachedInformationPopups;
    const video = document.querySelector('video');
    if (!video) return;

    const currentTitle = getCleanTitle();
    const currentUrl = window.location.href;
    const authorData = getAuthorData();

    const titleChanged = currentTitle !== lastSentTitle;
    const urlChanged = currentUrl !== lastSentUrl;
    const authorAvatarChanged = (authorData.avatar || "") !== (lastSentAuthorAvatar || "");

    const hasChanged = titleChanged || urlChanged || authorAvatarChanged;
    const isDataValid = currentTitle && (authorData.name || authorData.avatar);

    if (hasChanged && isDataValid) {
        sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");

        // Only show the popup when this looks like a new video (title/url change),
        // not when background metadata (like avatar) updates
        if (informationPopups && (titleChanged || urlChanged)) {
            browser.runtime.sendMessage({
                action: "show_broadcast_global",
                data: {
                    title: "Broadcasting Video to RPC",
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

let navigationPollInterval = null;
async function handleNavigation() {
    lastSentTitle = "";
    lastSentUrl = "";
    lastSentThumbnail = "";
    lastSentAuthorAvatar = "";
    lastBrowsingActivityKey = null;
    lastBrowsingActivityText = null;
    browsingActivityStartTime = null;
    lastMonitoredUrl = window.location.href;

    setupTitleObserver();
    observeOwnerChanges();

    if (!isVideoPage()) {
        checkBrowsingActivity();
    }

    if (navigationPollInterval) clearInterval(navigationPollInterval);
    let attempts = 0;
    navigationPollInterval = setInterval(async () => {
        if (!isVideoPage()) {
            clearInterval(navigationPollInterval);
            navigationPollInterval = null;
            return;
        }

        const title = getCleanTitle();
        const video = document.querySelector('video');

        // Send data as soon as we have title and video is ready
        if ((title && video && video.readyState >= 1) || attempts > 25) {
            attachListeners();
            if (title) sendToBackground(video && video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
            clearInterval(navigationPollInterval);
            navigationPollInterval = null;
        }
        attempts++;
    }, 200);
}

document.addEventListener('yt-navigate-finish', handleNavigation);
if (document.readyState === 'complete') handleNavigation();
else window.addEventListener('load', handleNavigation);

setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastMonitoredUrl) {
        lastMonitoredUrl = currentUrl;
        handleNavigation();
    }
}, 500);

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        checkMetadataConsistency();
        setupTitleObserver();
        checkBrowsingActivity();
    }
});

// Check for video activity every 2 seconds
setInterval(() => {
    if (isVideoPage()) {
        attachListeners();
        checkMetadataConsistency();
    }
}, 2000);

// Check for browsing activity every 1 second
if (browsingActivityCheckInterval) clearInterval(browsingActivityCheckInterval);
browsingActivityCheckInterval = setInterval(() => {
    checkBrowsingActivity();
}, 1000);

browser.runtime.onMessage.addListener(async (message) => {
    if (message.action === "REQUEST_SYNC") {
        // Ensure we have the latest settings before we decide what to send
        await refreshCachedSettings();

        const video = document.querySelector('video');
        if (isVideoPage() && video) {
            const currentTitle = getCleanTitle();
            const currentUrl = window.location.href;
            const isSameVideo = currentTitle === lastSentTitle && currentUrl === lastSentUrl;

            // Always resend so the bridge can auto-select this tab if needed
            sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");

            // Only show the info popup for new videos or explicit select requests
            if (cachedInformationPopups && currentTitle && (!isSameVideo || message.showPopup)) {
                browser.runtime.sendMessage({
                    action: "show_broadcast_global",
                    data: {
                        title: "Broadcasting Video to RPC",
                        text: currentTitle
                    }
                });
            }
        } else {
            lastBrowsingActivityKey = null;
            lastBrowsingActivityText = null;
            await checkBrowsingActivity();
        }
    }
});
