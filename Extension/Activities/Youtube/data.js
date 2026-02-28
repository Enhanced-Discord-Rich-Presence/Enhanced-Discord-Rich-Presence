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
    for (const [key, value] of Object.entries(map)) {
        out = out.split(key).join(value);
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
        const playlistName = document.querySelector("h1.title yt-formatted-string")?.innerText || document.querySelector("h1 .yt-simple-endpoint")?.innerText || "Playlist";
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

function hasOwnerAndImageInDocument() {
    const imageElement = document.querySelector('#owner #avatar img');
    return !(imageElement && imageElement.src && !imageElement.src.includes('data:image'));
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
    } catch {
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
            } catch {
                continue;
            }
        }
        
        // Fallback to default if everything else fails
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    } catch {
        return "";
    }
}

function getAuthorData() {
    const internalData = getMetadataFromInternalData();
    const multiChannelVideo = hasOwnerAndImageInDocument();

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
