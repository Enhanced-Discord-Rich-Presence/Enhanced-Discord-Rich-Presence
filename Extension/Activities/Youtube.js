let videoElement = null;
let titleObserver = null;
let lastSentTitle = "";
let lastSentUrl = "";
let lastSentThumbnail = "";
let lastSentAuthorAvatar = "";
let lastBrowsingActivityKey = null;
let lastBrowsingActivityText = null;
let browsingActivityCheckInterval = null;

let cachedInformationPopups = null;
let cachedRpcYoutube = null;

async function refreshCachedSettings() {
    try {
        const { informationPopups, rpcYoutube } = await browser.storage.local.get(["informationPopups", "rpcYoutube"]);
        cachedInformationPopups = informationPopups;
        cachedRpcYoutube = rpcYoutube;
    } catch { }
}

// Keep caches fresh so browsing updates can be fast.
refreshCachedSettings();
browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.informationPopups) cachedInformationPopups = changes.informationPopups.newValue;
    if (changes.rpcYoutube) cachedRpcYoutube = changes.rpcYoutube.newValue;
});

const BROWSING_ACTIVITY_LABELS = {
    homepage: "Homepage",
    channel: "Channel Page",
    shorts: "Shorts",
    search: "Search",
    subscriptions: "Subscriptions",
    library: "Library",
    history: "History",
    watchLater: "Watch Later",
    likedVideos: "Liked Videos",
    playlist: "Playlist",
    studio: "Studio"
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

function isVideoPage() {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    if (pathname.startsWith("/shorts/")) return true;
    if (pathname === "/watch" && searchParams.has("v")) return true;
    return false;
}

// YouTube page type detection
function detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);

    // Homepage
    if (pathname === "/" || pathname === "/feed/" || (pathname === "/feed" && !searchParams.has("list"))) {
        return { type: "homepage", data: {} };
    }

    // Shorts
    if (pathname.startsWith("/shorts/")) {
        return { type: "shorts", data: {} };
    }

    // Search
    if (pathname === "/results" && searchParams.has("search_query")) {
        return { type: "search", data: { query: searchParams.get("search_query") } };
    }

    // Subscriptions
    if (pathname === "/feed/subscriptions") {
        return { type: "subscriptions", data: {} };
    }

    // Library
    if (pathname === "/feed/library") {
        return { type: "library", data: {} };
    }

    // History
    if (pathname === "/feed/history") {
        return { type: "history", data: {} };
    }

    // Watch Later (WL playlist)
    if (pathname === "/playlist" && searchParams.get("list") === "WL") {
        return { type: "watchLater", data: {} };
    }

    // Liked Videos (LL playlist)
    if (pathname === "/playlist" && searchParams.get("list") === "LL") {
        return { type: "likedVideos", data: {} };
    }

    // Any other playlist
    if (pathname === "/playlist" && searchParams.has("list")) {
        const playlistName = document.querySelector("h1.title yt-formatted-string")?.innerText || 
                            document.querySelector("h1 .yt-simple-endpoint")?.innerText || 
                            "Playlist";
        return { type: "playlist", data: { playlist: playlistName } };
    }

    // Studio (channel management)
    if (url.includes("studio.youtube.com")) {
        return { type: "studio", data: {} };
    }

    // Channel page
    // - /@handle
    // - /@handle/videos
    // - /c/name
    // - /c/name/videos
    // - /channel/UC...
    {
        const segments = pathname.split('/').filter(Boolean);

        if (segments[0] && segments[0].startsWith('@')) {
            const handle = segments[0].slice(1);
            return {
                type: "channel",
                data: {
                    channel: handle,
                    channel_url: `${window.location.origin}/${segments[0]}`
                }
            };
        }

        if (segments[0] === 'c' && segments[1]) {
            return {
                type: "channel",
                data: {
                    channel: segments[1],
                    channel_url: `${window.location.origin}/c/${segments[1]}`
                }
            };
        }

        if (segments[0] === 'channel' && segments[1]) {
            return {
                type: "channel",
                data: {
                    channel: segments[1],
                    channel_url: `${window.location.origin}/channel/${segments[1]}`
                }
            };
        }
    }

    return null;
}

function getCleanTitle() {
  const raw = document.title || "";
  const cleaned = raw
    .replace(/^\(\d+\)\s/, "")
    .replace(/\s-\sYouTube$/i, "")
    .trim();

  if (!cleaned || cleaned.toLowerCase() === "youtube") {
    return null;
  }

  return cleaned;
}

function cleanAuthorName(name) {
    if (!name) return "Unknown Author";
    let cleaned = name.split(/[•·]/)[0];
    cleaned = cleaned.replace(/\s*-\s*Topic$/, ""); // Specifically handles Topic channels
    cleaned = cleaned.split(/\s+\d+([.,]\d+)?(K|M|B| mil| mln)?\s+/i)[0];
    return cleaned.trim();
}

function hasOwnerAndImgInDocument() {
    const img = document.querySelector('#owner #avatar img');
    return !(img && img.src && !img.src.includes('data:image'));
}

function getMetadataFromInternalData() {
    try {
        const playerResponse = window.ytInitialPlayerResponse;
        const initialData = window.ytInitialData;
        
        let name = playerResponse?.videoDetails?.author;
        let avatar = null;

        if (initialData?.contents) {
            const results = initialData.contents.twoColumnWatchNextResults?.results?.results?.contents;
            const secondaryInfo = results?.find(c => c.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
            
            avatar = secondaryInfo?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails?.slice(-1)[0]?.url;
            
            if (!avatar) {
                avatar = secondaryInfo?.owner?.videoOwnerRenderer?.avatar?.thumbnails?.slice(-1)[0]?.url;
            }
        }

        return { name, avatar };
    } catch (e) {
        return { name: null, avatar: "youtube" };
    }
}

async function getVideoThumbnail(url) {
    try {
        const videoId = new URL(url).searchParams.get('v');
        if (!videoId) return "";
        
        // Try different thumbnail qualities in order of preference (because sometimes they don't exist)
        const qualities = [
            'maxresdefault',  // 1920x1080
            'sddefault',      // 640x480
            'hqdefault'       // 480x360
        ];
        
        for (const quality of qualities) {
            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
            try {
                // Quick check if image exists and is valid
                const response = await fetch(thumbnailUrl, { method: 'HEAD' });
                if (response.ok) {
                    return thumbnailUrl;
                }
            } catch (e) {
                continue;
            }
        }
        
        // Fallback to default if everything else fails
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } catch (e) {
        return "";
    }
}

function getAuthorData() {
    const internalData = getMetadataFromInternalData();
    const multiChannelVideo = hasOwnerAndImgInDocument();

    let finalName = "Unknown Author";
    let finalAvatar = "";
    let finalUrl = "";

    const owner = document.querySelector('#owner');

    if (!multiChannelVideo && owner) {
        const authorLink = owner.querySelector('#channel-name a');
        const domAvatar = owner.querySelector('#avatar img')?.src;
        
        finalName = authorLink ? authorLink.innerText : (internalData?.name || "");
        finalUrl = authorLink ? authorLink.href : "";
        
        finalAvatar = (domAvatar && !domAvatar.includes('data:image')) ? domAvatar : (internalData?.avatar || "");
    } else if (owner) {
        const avatarElements = owner.querySelectorAll('#avatar-stack img, #avatar img');
        const allAvatars = Array.from(avatarElements).map(img => img.src).filter(src => src && !src.includes('data:image'));
        
        const nameElement = owner.querySelector('#upload-info #channel-name a') || 
                            owner.querySelector('#channel-name a') || 
                            owner.querySelector('#upload-info yt-formatted-string');
        
        finalName = nameElement ? (nameElement.innerText || nameElement.textContent) : (internalData?.name || "");
        
        const avatarLink = owner.querySelector('a.ytd-video-owner-renderer') || owner.querySelector('#channel-name a');
        finalUrl = (avatarLink && avatarLink.href && !avatarLink.href.includes('javascript')) ? avatarLink.href : "";
        
        finalAvatar = (allAvatars.length > 0) ? allAvatars[allAvatars.length - 1] : (internalData?.avatar || "");
    }

    return { 
        name: cleanAuthorName(finalName), 
        url: finalUrl, 
        avatar: finalAvatar 
    };
}

async function checkBrowsingActivity() {
    const pageInfo = detectPageType();
    if (!pageInfo) return; // Not a browsing activity page

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
        lastBrowsingActivityKey = activityKey;
        lastBrowsingActivityText = activityData.text;

        const baseCfg = rpcYoutube.paused || rpcYoutube.running || {};
        const settings = {
            ...baseCfg,
            details: BROWSING_ACTIVITY_LABELS[activityKey] || "Browsing YouTube",
            state: activityData.text
        };

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
            settings.timestamps = { ...settings.timestamps, start: false, end: false };
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

        // Browsing activities should never show a small images
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
            currentSite: "Youtube",
            settings: settings
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

async function sendToBackground(action, data = {}) {
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
    title: title,
    author: authorData.name || "YouTube Artist",
    author_url: authorData.url,
    author_avatar: authorData.avatar,
    thumbnail: thumbnail,
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

  browser.runtime.sendMessage({
    action: action,
    payload: payload
  });
}

function observeOwnerChanges() {
    const owner = document.querySelector('#owner');
    if (!owner) return;

    const observer = new MutationObserver(() => {
        const author = getAuthorData();
        // If the avatar finally populates or changes, sync metadata
        if (author.avatar && author.avatar !== lastSentAuthorAvatar) {
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

    const currentCleanTitle = getCleanTitle();
    const currentUrl = window.location.href;
    const author = getAuthorData();

    const titleChanged = currentCleanTitle !== lastSentTitle;
    const urlChanged = currentUrl !== lastSentUrl;
    const authorAvatarChanged = (author.avatar || "") !== (lastSentAuthorAvatar || "");

    const hasChanged = titleChanged || urlChanged || authorAvatarChanged;

    const isDataValid = currentCleanTitle && (author.name || author.avatar);

    if (hasChanged && isDataValid) {
        sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
        
        // Only show the popup when this looks like a new video (title/url change),
        // not when background metadata (like avatar) updates
        if (informationPopups && (titleChanged || urlChanged)) {
            browser.runtime.sendMessage({
                action: "show_broadcast_global",
                data: { 
                    title: "Broadcasting Video to RPC", 
                    text: currentCleanTitle 
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
    lastSentAuthorAvatar = "";
    lastBrowsingActivityKey = null;
    lastBrowsingActivityText = null;

    setupTitleObserver();
    observeOwnerChanges();
    checkBrowsingActivity();

    let attempts = 0;
    const checkMetadata = setInterval(async () => {
        if (!isVideoPage()) {
            clearInterval(checkMetadata);
            return;
        }

        const title = getCleanTitle();
        const video = document.querySelector('video');

        // Send data as soon as we have title and video is ready
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

browser.runtime.onMessage.addListener(async (msg) => {
    if (msg.action === "REQUEST_SYNC") {
        // Ensure we have the latest settings before we decide what to send
        await refreshCachedSettings();

        const video = document.querySelector('video');
        if (isVideoPage() && video) {
            sendToBackground(video.paused ? "VIDEO_PAUSED" : "VIDEO_RESUMED");
        } else {
            // Force a re-send even if it's the same browsing activity as last time.
            // This is important when a tab becomes selected/active again
            lastBrowsingActivityKey = null;
            lastBrowsingActivityText = null;
            await checkBrowsingActivity();
        }
    }
});