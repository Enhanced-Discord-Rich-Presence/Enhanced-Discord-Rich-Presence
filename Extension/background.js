const NATIVE_HOST = "com.enhanced.rpc.bridge";
let nativePort = null;

function getNativePort() {
    if (!nativePort) {
        nativePort = browser.runtime.connectNative(NATIVE_HOST);
        nativePort.onDisconnect.addListener(() => { nativePort = null; });
    }
    return nativePort;
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    const settings = await browser.storage.local.get({
        rpcEnabled: true,
        informationPopups: true,

        rpcYoutube: {
            enabled: true,
            type: 3,  // 3: Watching, 2: Listening, 0: Playing
            details: "%title%",
            state: "By %author%",
            timestamps: {
                start: true,
                end: true
            },
            assets: {
                large: {
                    enabled: true,
                    large_image: "%thumbnail%",
                    large_text: "%title%",
                },
                small: {
                    enabled: true,
                    small_image: "%author_avatar%",
                    small_text: "%author%"
                }
            },
            buttons: {
                1: {
                    enabled: true,
                    label: "Watch on YouTube",
                    url: "%url%"
                },
                2: {
                    enabled: false,
                    label: "Channel Page",
                    url: "%author_url%"
                }
            }
        },

        rpcYoutubeMusic: {
            enabled: true,
            type: 2,  // 3: Watching, 2: Listening, 1: Playing
            details: "%title%",
            state: "By %author%",
            timestamps: {
                start: true,
                end: true
            },
            assets: {
                large: {
                    enabled: true,
                    large_image: "%thumbnail%",
                    large_text: "%title%",
                },
                small: {
                    enabled: true,
                    small_image: "%author_avatar%",
                    small_text: "%author%"
                }
            },
            buttons: {
                1: {
                    enabled: true,
                    label: "Listen on YouTube Music",
                    url: "%url%"
                },
                2: {
                    enabled: false,
                    label: "Channel Page",
                    url: "%author_url%"
                }
            }
        }
    });

    if (!settings.rpcEnabled) return;
    const currentUrl = sender.tab ? sender.tab.url : "";
    if (currentUrl.includes("music.youtube.com") && !settings.rpcYoutubeMusic.enabled) return;
    if (currentUrl.includes("www.youtube.com") && !settings.rpcYoutube.enabled) return;
    const currentSite = currentUrl.includes("music.youtube.com") ? "YoutubeMusic" : "Youtube";

    const data = {
        ...msg,
        currentSite: currentSite,
        tabId: sender.tab ? sender.tab.id : null,
        settings: currentSite === "Youtube" ? settings.rpcYoutube : settings.rpcYoutubeMusic,
    };
    const port = getNativePort();
    port.postMessage(data);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        const url = changeInfo.url;
        const isVideo = url.includes("watch?v=") || url.includes("music.youtube.com/watch");
        const isYouTube = url.includes("youtube.com") || url.includes("music.youtube.com");

        if (!isYouTube || (isYouTube && !isVideo)) {
            const port = getNativePort();
            port.postMessage({ 
                action: "TAB_CLOSED", 
                tabId: tabId 
            });
        }
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    const port = getNativePort();
    port.postMessage({ action: "TAB_CLOSED", tabId: tabId });
});