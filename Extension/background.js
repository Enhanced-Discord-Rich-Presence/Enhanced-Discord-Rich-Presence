const NATIVE_HOST = "com.enhanced.rpc.bridge";
let nativePort = null;
let defaultSettings = null;

const UPDATE_VERSION_URL = "https://raw.githubusercontent.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/main/App/version.txt";
const EXTENSION_VERSION_URL = "https://raw.githubusercontent.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/main/Extension/manifest.json";
const AMO_EXTENSION_PAGE_URL = "https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/";
const UPDATE_GITHUB_URL = "https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence";
const UPDATE_DOWNLOAD_URL = "https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/releases/latest";

let nativeRequestCounter = 0;
const pendingNativeRequests = new Map();

let nativeHostReachable = null; // null=unknown, true=reachable, false=missing/unreachable

let lastNativeProbeAt = 0;
let lastNativeProbeStatus = null; // null | 'ok' | 'missing' | 'invalid'
let nativeProbeInFlight = null;

let pendingUpdateModal = null;
let updateModalTargetTabId = null;

let updateAvailableStatus = null; // { kind, localVersion, remoteVersion, url, downloadUrl }
let dismissedUpdateKey = null; // `${localVersion}|${remoteVersion}`

const updateModalRetryByTab = new Map(); // tabId -> { attempts, url, timer }

let nativeRecoveryTimer = null;
let nativeRecoveryAttempts = 0;

let pendingNativeStatusRequests = []; // { resolve, reject, timer }

let rpcResetInFlight = null;
let suppressMissingModalUntil = 0;

const VERSION_CACHE_TTL_MS = 60 * 1000;
let latestVersionCache = {
    fetchedAt: 0,
    data: null
};

function shouldSuppressMissingModal() {
    return Date.now() < suppressMissingModalUntil;
}

function suppressMissingModalFor(ms) {
    suppressMissingModalUntil = Date.now() + Math.max(0, Number(ms) || 0);
}

function rejectAndClearPendingNative(reasonMessage) {
    const reason = new Error(reasonMessage || 'Native reset in progress');

    try {
        pendingNativeStatusRequests.forEach((pending) => {
            if (pending && pending.timer) clearTimeout(pending.timer);
            if (pending && pending.reject) pending.reject(reason);
        });
    } catch { }
    pendingNativeStatusRequests = [];

    try {
        pendingNativeRequests.forEach((pending) => {
            if (pending && pending.timer) clearTimeout(pending.timer);
            if (pending && pending.reject) pending.reject(reason);
        });
    } catch { }
    pendingNativeRequests.clear();
}

function requestNativeStatus(timeoutMs = 900) {
    return new Promise((resolve, reject) => {
        const port = getNativePort();
        if (!port) {
            reject(new Error('Native host missing'));
            return;
        }

        const timer = setTimeout(() => {
            // Remove the pending request (if still present) and reject
            const idx = pendingNativeStatusRequests.findIndex((p) => p && p.resolve === resolve);
            if (idx >= 0) pendingNativeStatusRequests.splice(idx, 1);
            reject(new Error('Native status request timed out'));
        }, timeoutMs);

        pendingNativeStatusRequests.push({ resolve, reject, timer });
        try {
            port.postMessage({ action: 'GET_STATUS' });
        } catch (e) {
            clearTimeout(timer);
            pendingNativeStatusRequests = pendingNativeStatusRequests.filter((p) => p && p.resolve !== resolve);
            reject(e);
        }
    });
}

function normalizeSelectedTabId(selectedTabs, wantedService) {
    if (!selectedTabs || !wantedService) return null;
    const entries = Object.entries(selectedTabs);
    const match = entries.find(([k]) => String(k).toLowerCase() === String(wantedService).toLowerCase());
    if (!match) return null;
    const id = match[1];
    return (typeof id === 'number' || typeof id === 'string') ? id : null;
}

function getServiceFromUrl(url) {
    if (!url) return null;
    const u = String(url);
    if (u.includes('music.youtube.com')) return 'YoutubeMusic';
    if (u.includes('youtube.com')) return 'Youtube';
    return null;
}

function clearNativeRecoveryTimer() {
    if (nativeRecoveryTimer) {
        clearTimeout(nativeRecoveryTimer);
        nativeRecoveryTimer = null;
    }
    nativeRecoveryAttempts = 0;
}

function scheduleNativeRecoveryCheck() {
    const kind = pendingUpdateModal && pendingUpdateModal.kind;
    const isNativeBlocking = kind === 'native_missing' || kind === 'native_invalid';
    if (!isNativeBlocking) {
        clearNativeRecoveryTimer();
        return;
    }

    clearNativeRecoveryTimer();

    const attempt = async () => {
        const liveKind = pendingUpdateModal && pendingUpdateModal.kind;
        const stillBlocking = liveKind === 'native_missing' || liveKind === 'native_invalid';
        if (!stillBlocking) {
            clearNativeRecoveryTimer();
            return;
        }

        nativeRecoveryAttempts += 1;

        const status = await probeNativeHost();
        if (status === 'ok') {
            // Native host is now reachable; run the full update check to decide
            // whether to show an update modal or clear everything
            clearPendingUpdateModal();
            await checkForNativeAppUpdate();
            clearNativeRecoveryTimer();
            return;
        }

        if (status === 'invalid') {
            await ensureNativeInvalidModal();
            // keep checking in case user reinstalls correctly
        } else {
            await ensureNativeMissingModal();
        }

        if (nativeRecoveryAttempts >= 20) {
            clearNativeRecoveryTimer();
            return;
        }

        const delay = nativeRecoveryAttempts < 4 ? 800 : nativeRecoveryAttempts < 10 ? 1500 : 3000;
        nativeRecoveryTimer = setTimeout(attempt, delay);
    };

    nativeRecoveryTimer = setTimeout(attempt, 900);
}

function clearPendingUpdateModal() {
    pendingUpdateModal = null;
    updateModalTargetTabId = null;
    updateModalRetryByTab.forEach(st => { if (st && st.timer) clearTimeout(st.timer); });
    updateModalRetryByTab.clear();
    clearNativeRecoveryTimer();
}

async function ensureNativeMissingModal() {
    if (pendingUpdateModal && pendingUpdateModal.kind === 'native_missing') return;

    nativeHostReachable = false;

    pendingUpdateModal = {
        kind: 'native_missing',
        title: 'Native App Not Installed',
        text: 'EnhancedRPC requires the native App to communicate with Discord Rich Presence.',
        url: UPDATE_GITHUB_URL,
        downloadUrl: UPDATE_DOWNLOAD_URL,
        primaryLabel: 'Download App',
        secondaryLabel: 'Open GitHub',
        warnText: 'Download the native App {here}. Without it, EnhancedRPC will not work at all.'
    };

    updateModalTargetTabId = null;
    updateModalRetryByTab.forEach(st => { if (st && st.timer) clearTimeout(st.timer); });
    updateModalRetryByTab.clear();

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        scheduleTryShowUpdateModal(tab.id, tab.url);
    }

    scheduleNativeRecoveryCheck();
}

async function ensureNativeInvalidModal() {
    if (pendingUpdateModal && pendingUpdateModal.kind === 'native_invalid') return;

    // Host responded, but we couldn't read a valid version from it
    // Treat as an incompatible/broken install
    nativeHostReachable = true;

    pendingUpdateModal = {
        kind: 'native_invalid',
        title: 'Native App Incompatible',
        text: 'EnhancedRPC detected a native App installation, but it did not report a valid version. This usually means you installed an incompatible/old build.',
        url: UPDATE_GITHUB_URL,
        downloadUrl: UPDATE_DOWNLOAD_URL,
        primaryLabel: 'Download Latest App',
        secondaryLabel: 'Open GitHub',
        warnText: 'Please reinstall the latest native App from {here}. Until then, EnhancedRPC may not work correctly.'
    };

    updateModalTargetTabId = null;
    updateModalRetryByTab.forEach(st => { if (st && st.timer) clearTimeout(st.timer); });
    updateModalRetryByTab.clear();

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        scheduleTryShowUpdateModal(tab.id, tab.url);
    }

    scheduleNativeRecoveryCheck();
}

async function loadDefaults(forceReload = false) {
    if (!defaultSettings || forceReload) {
        const baseUrl = browser.runtime.getURL('default_settings.json');
        const response = await fetch(`${baseUrl}?_=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store'
        });
        defaultSettings = await response.json();
    }
    return defaultSettings;
}

function getNativePort() {
    if (!nativePort) {
        try {
            nativePort = browser.runtime.connectNative(NATIVE_HOST);
        } catch {
            nativePort = null;
            nativeHostReachable = false;
            if (!shouldSuppressMissingModal()) {
                ensureNativeMissingModal();
            }
            return null;
        }

        nativePort.onMessage.addListener((response) => {
            nativeHostReachable = true;

            try {
                if (response && response.action === 'STATUS_RESPONSE' && pendingNativeStatusRequests.length > 0) {
                    const pending = pendingNativeStatusRequests.shift();
                    if (pending && pending.timer) clearTimeout(pending.timer);
                    if (pending && pending.resolve) pending.resolve(response);
                }
            } catch { }

            try {
                const reqId = response && response.requestId;
                if (reqId && pendingNativeRequests.has(reqId)) {
                    const pending = pendingNativeRequests.get(reqId);
                    pendingNativeRequests.delete(reqId);
                    if (pending && pending.timer) clearTimeout(pending.timer);
                    if (pending && pending.resolve) pending.resolve(response);
                }
            } catch { }

            browser.runtime.sendMessage({
                action: "PYTHON_RESPONSE",
                payload: response
            }).catch(() => {});
        });

        nativePort.onDisconnect.addListener(() => { 
            // console.log("Native port disconnected");
            nativePort = null;
            nativeHostReachable = false;

            try {
                pendingNativeStatusRequests.forEach((pending) => {
                    if (pending && pending.timer) clearTimeout(pending.timer);
                    if (pending && pending.reject) pending.reject(new Error('Native port disconnected'));
                });
                pendingNativeStatusRequests = [];
            } catch { }

            try {
                pendingNativeRequests.forEach((pending) => {
                    if (pending && pending.timer) clearTimeout(pending.timer);
                    if (pending && pending.reject) pending.reject(new Error("Native port disconnected"));
                });
                pendingNativeRequests.clear();
            } catch { }

            if (!shouldSuppressMissingModal()) {
                ensureNativeMissingModal();
            }
        });
    }
    return nativePort;
}

async function getInstalledVersionsSnapshot() {
    const extensionVersion = browser.runtime.getManifest().version || '';
    let nativeAppVersion = '';

    try {
        const nativeResp = await requestNative('GET_VERSION', {}, 1200);
        console.log('[Version Debug] Native response:', nativeResp);
        nativeAppVersion = extractVersion(nativeResp && nativeResp.version ? nativeResp.version : '');
        console.log('[Version Debug] Extracted native version:', nativeAppVersion);
    } catch (err) {
        console.log('[Version Debug] Failed to get native version:', err);
        nativeAppVersion = '';
    }

    return {
        extensionVersion,
        nativeAppVersion
    };
}

async function fetchLatestVersions(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && latestVersionCache.data && (now - latestVersionCache.fetchedAt) < VERSION_CACHE_TTL_MS) {
        return latestVersionCache.data;
    }

    const [nativeRemote, extensionRemoteGithub] = await Promise.all([
        (async () => {
            try {
                const response = await fetch(`${UPDATE_VERSION_URL}?_=${Date.now()}`, { method: 'GET', cache: 'no-store' });
                if (!response.ok) return '';
                const txt = await response.text();
                return extractVersion(txt);
            } catch {
                return '';
            }
        })(),
        (async () => {
            try {
                const response = await fetch(`${EXTENSION_VERSION_URL}?_=${Date.now()}`, { method: 'GET', cache: 'no-store' });
                if (!response.ok) return '';
                const manifest = await response.json();
                return manifest && manifest.version ? String(manifest.version).trim() : '';
            } catch {
                return '';
            }
        })()
    ]);

    let extensionRemote = extensionRemoteGithub || '';

    if (!extensionRemote) {
        try {
            const response = await fetch(`${AMO_EXTENSION_PAGE_URL}?_=${Date.now()}`, { method: 'GET', cache: 'no-store' });
            if (response.ok) {
                const html = await response.text();
                const versionMatch = html.match(/<dt[^>]*class=["'][^"']*Definition-dt[^"']*["'][^>]*>\s*Version\s*<\/dt>\s*<dd[^>]*class=["'][^"']*AddonMoreInfo-version[^"']*["'][^>]*>\s*([^<\s]+)\s*<\/dd>/i);
                if (versionMatch && versionMatch[1]) {
                    extensionRemote = String(versionMatch[1]).trim();
                }
            }
        } catch {
            extensionRemote = '';
        }
    }

    const payload = {
        extensionVersion: extensionRemote || '',
        nativeAppVersion: nativeRemote || ''
    };

    latestVersionCache = {
        fetchedAt: now,
        data: payload
    };

    return payload;
}

async function getVersionInfo({ includeLatest = true, forceLatestRefresh = false } = {}) {
    const installed = await getInstalledVersionsSnapshot();
    let latest = {
        extensionVersion: '',
        nativeAppVersion: ''
    };

    if (includeLatest) {
        latest = await fetchLatestVersions(forceLatestRefresh);
    }

    return {
        installed,
        latest,
        updateStatus: updateAvailableStatus
    };
}

async function restoreSelectedTabsAfterReset(selectedTabs) {
    if (!selectedTabs || typeof selectedTabs !== 'object') return;

    for (const [service, tabId] of Object.entries(selectedTabs)) {
        if (service === 'Custom') continue;
        if (tabId == null) continue;

        let tab;
        try {
            tab = await browser.tabs.get(Number(tabId));
        } catch {
            continue;
        }

        const expectedService = getServiceFromUrl(tab && tab.url);
        if (!expectedService || String(expectedService).toLowerCase() !== String(service).toLowerCase()) {
            continue;
        }

        try {
            await requestNative('SELECT_TAB', { service, tabId: Number(tabId) }, 900);
        } catch { }

        await sendRequestSyncWithRetries(Number(tabId), tab.url, 18, { showPopup: false });
    }
}

async function performFullRpcReset() {
    if (rpcResetInFlight) {
        return rpcResetInFlight;
    }

    rpcResetInFlight = (async () => {
        const defaults = await loadDefaults(true);
        const settings = await browser.storage.local.get(defaults);

        let selectedBeforeReset = {};
        try {
            const status = await requestNativeStatus(900);
            selectedBeforeReset = (status && status.selected_tabs) ? status.selected_tabs : {};
        } catch {
            selectedBeforeReset = {};
        }

        const existingPort = nativePort;
        if (existingPort) {
            try {
                existingPort.postMessage({ action: 'CLEAR_RPC' });
            } catch { }
        }

        rejectAndClearPendingNative('Native reset in progress');

        suppressMissingModalFor(3000);

        if (existingPort) {
            try {
                existingPort.disconnect();
            } catch { }
        }

        nativePort = null;
        nativeHostReachable = null;
        lastNativeProbeAt = 0;
        lastNativeProbeStatus = null;
        nativeProbeInFlight = null;

        const freshPort = getNativePort();
        if (!freshPort) {
            throw new Error('Native host missing');
        }

        try {
            await requestNative('GET_VERSION', {}, 1500);
        } catch { }

        freshPort.postMessage({
            action: 'REFRESH',
            settings
        });

        if (settings.rpcEnabled) {
            await syncActiveTabs();
            await restoreSelectedTabsAfterReset(selectedBeforeReset);

            if (settings.rpcCustom && settings.rpcCustom.enabled) {
                freshPort.postMessage({
                    action: 'UPDATE_CUSTOM',
                    currentSite: 'Custom',
                    payload: {},
                    settings: settings.rpcCustom
                });
            }
        } else {
            try {
                freshPort.postMessage({ action: 'CLEAR_RPC' });
            } catch { }
        }

        return { ok: true };
    })().catch((error) => {
        return {
            ok: false,
            error: (error && error.message) ? error.message : 'Unknown reset error'
        };
    }).finally(() => {
        rpcResetInFlight = null;
    });

    return rpcResetInFlight;
}

async function getRpcDiagnostics() {
    const versionInfo = await getVersionInfo({ includeLatest: true });

    let nativeStatus = null;
    try {
        nativeStatus = await requestNativeStatus(1200);
    } catch {
        nativeStatus = null;
    }

    return {
        collectedAt: new Date().toISOString(),
        installedVersions: versionInfo.installed,
        latestVersions: versionInfo.latest,
        selectedStreams: (nativeStatus && nativeStatus.selected_tabs) || {},
        rpcState: {
            activeServices: (nativeStatus && nativeStatus.active_services) || [],
            selectedTabs: (nativeStatus && nativeStatus.selected_tabs) || {},
            rpcDataByTab: (nativeStatus && nativeStatus.rpc_data) || {},
            nativeReachable: nativeHostReachable,
            resetInProgress: !!rpcResetInFlight
        }
    };
}

function requestNative(action, extra = {}, timeoutMs = 2000) {
    console.log("Requesting native action:", { action, extra });
    return new Promise((resolve, reject) => {
        try {
            const port = getNativePort();
            if (!port) {
                reject(new Error("Native host missing"));
                return;
            }
            const requestId = `req_${Date.now()}_${++nativeRequestCounter}`;
            const timer = setTimeout(() => {
                if (pendingNativeRequests.has(requestId)) {
                    pendingNativeRequests.delete(requestId);
                    reject(new Error("Native request timed out"));
                }
            }, timeoutMs);

            pendingNativeRequests.set(requestId, { resolve, reject, timer });
            port.postMessage({ action, requestId, ...extra });
        } catch (e) {
            reject(e);
        }
    });
}

async function probeNativeHost() {
    const now = Date.now();
    if (lastNativeProbeStatus !== null && (now - lastNativeProbeAt) < 800) {
        return lastNativeProbeStatus;
    }
    if (nativeProbeInFlight) {
        try {
            return await nativeProbeInFlight;
        } catch {
            return 'missing';
        }
    }

    nativeProbeInFlight = (async () => {
        lastNativeProbeAt = Date.now();

        if (nativePort && nativeHostReachable === true) {
            lastNativeProbeStatus = 'ok';
            return 'ok';
        }

        try {
            const resp = await requestNative("GET_VERSION", {}, 700);
            const ver = (resp && resp.version) ? String(resp.version).trim() : "";
            nativeHostReachable = true;
            if (ver) {
                lastNativeProbeStatus = 'ok';
                return 'ok';
            }
            lastNativeProbeStatus = 'invalid';
            return 'invalid';
        } catch {
            nativeHostReachable = false;
            lastNativeProbeStatus = 'missing';
            return 'missing';
        }
    })();

    try {
        return await nativeProbeInFlight;
    } finally {
        nativeProbeInFlight = null;
    }
}

function extractVersion(text) {
    if (!text) return "";
    const str = String(text);

    const firstNonEmptyLine = str
        .split(/\r?\n/)
        .map(l => l.trim())
        .find(l => l.length > 0);

    if (firstNonEmptyLine) {
        const exact = firstNonEmptyLine.match(/^(pre-\d+\.\d+\.\d+|\d+\.\d+\.\d+)$/i);
        if (exact) return exact[1].trim();
    }

    const m = str.match(/(pre-\d+\.\d+\.\d+|\d+\.\d+\.\d+)/i);
    return m ? m[1].trim() : "";
}

function parseVersion(version) {
    if (!version) return null;
    const str = String(version).trim().toLowerCase();
    const m = str.match(/^(pre-)?(\d+)\.(\d+)\.(\d+)$/);
    if (!m) return null;

    return {
        isPre: !!m[1],
        major: Number(m[2]),
        minor: Number(m[3]),
        patch: Number(m[4])
    };
}

function compareVersions(a, b) {
    const va = parseVersion(a);
    const vb = parseVersion(b);

    if (!va || !vb) {
        return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
    }

    if (va.major !== vb.major) return va.major - vb.major;
    if (va.minor !== vb.minor) return va.minor - vb.minor;
    if (va.patch !== vb.patch) return va.patch - vb.patch;

    if (va.isPre !== vb.isPre) {
        return va.isPre ? -1 : 1;
    }

    return 0;
}

function isDisplayableUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function isProjectGitHubPage(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.hostname === 'github.com' &&
            u.pathname.toLowerCase().startsWith('/enhanced-discord-rich-presence/');
    } catch {
        return false;
    }
}

async function sendRequestSyncWithRetries(tabId, expectedUrl, maxAttempts = 18, extraFields = {}) {
    if (!tabId) return false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        // Ensure the tab still exists and hasn't navigated away
        try {
            const tab = await browser.tabs.get(tabId);
            const liveUrl = tab && tab.url;
            if (!isDisplayableUrl(liveUrl)) return false;
            if (expectedUrl && liveUrl !== expectedUrl) return false;
        } catch {
            return false;
        }

        try {
            await browser.tabs.sendMessage(tabId, { action: 'REQUEST_SYNC', ...extraFields });
            return true;
        } catch { }

        const delay = attempt < 6 ? 80 : attempt < 12 ? 160 : 350;
        await new Promise(r => setTimeout(r, delay));
    }

    return false;
}

async function tryShowPendingUpdateModal(tabId, url) {
    if (!pendingUpdateModal) return;
    if (!tabId) return;
    const isNativeBlocking = pendingUpdateModal.kind === 'native_missing' || pendingUpdateModal.kind === 'native_invalid';
    if (!isNativeBlocking && updateModalTargetTabId && tabId !== updateModalTargetTabId) return;
    if (!isDisplayableUrl(url)) return;

    // Don't show "Native App Not Installed" on the project's GitHub page
    if (isNativeBlocking && isProjectGitHubPage(url)) return;

    if (isNativeBlocking) {
        const status = await probeNativeHost();
        if (status === 'ok') {
            clearPendingUpdateModal();
            await checkForNativeAppUpdate();
            return;
        }
        if (status === 'invalid' && pendingUpdateModal.kind !== 'native_invalid') {
            await ensureNativeInvalidModal();
        }
    }

    try {
        await browser.tabs.sendMessage(tabId, {
            action: "show_update_modal",
            data: pendingUpdateModal
        });
        if (!isNativeBlocking && !updateModalTargetTabId) updateModalTargetTabId = tabId;

        const st = updateModalRetryByTab.get(tabId);
        if (st && st.timer) clearTimeout(st.timer);
        updateModalRetryByTab.delete(tabId);
    } catch { }
}

function scheduleTryShowUpdateModal(tabId, url) {
    if (!pendingUpdateModal) return;
    if (!tabId) return;
    const isNativeBlocking = pendingUpdateModal.kind === 'native_missing' || pendingUpdateModal.kind === 'native_invalid';
    if (!isNativeBlocking && updateModalTargetTabId && tabId !== updateModalTargetTabId) return;
    if (!isDisplayableUrl(url)) return;

    const maxAttempts = 40;
    const current = updateModalRetryByTab.get(tabId);
    if (current && current.url !== url) {
        if (current.timer) clearTimeout(current.timer);
        updateModalRetryByTab.delete(tabId);
    }

    const state = updateModalRetryByTab.get(tabId) || { attempts: 0, url, timer: null };
    state.url = url;
    updateModalRetryByTab.set(tabId, state);

    const attempt = async () => {
        if (!pendingUpdateModal) return;
        if (updateModalTargetTabId && tabId !== updateModalTargetTabId) return;

        try {
            const tab = await browser.tabs.get(tabId);
            const liveUrl = tab && tab.url;
            if (!isDisplayableUrl(liveUrl) || liveUrl !== url) {
                updateModalRetryByTab.delete(tabId);
                return;
            }
        } catch {
            updateModalRetryByTab.delete(tabId);
            return;
        }

        await tryShowPendingUpdateModal(tabId, url);

        if (!isNativeBlocking && updateModalTargetTabId === tabId) {
            updateModalRetryByTab.delete(tabId);
            return;
        }

        state.attempts += 1;
        if (state.attempts >= maxAttempts) {
            updateModalRetryByTab.delete(tabId);
            return;
        }

        const delay = state.attempts < 8 ? 80 : state.attempts < 16 ? 200 : 500;
        state.timer = setTimeout(attempt, delay);
        updateModalRetryByTab.set(tabId, state);
    };

    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(attempt, 0);
    updateModalRetryByTab.set(tabId, state);
}

async function checkForNativeAppUpdate() {
    let localVersion = "";
    try {
        const resp = await requestNative("GET_VERSION");
        localVersion = (resp && resp.version) ? String(resp.version).trim() : "";
    } catch {
        await ensureNativeMissingModal();
        return; // native host missing/unreachable
    }
    if (!localVersion) {
        await ensureNativeInvalidModal();
        return;
    }

    nativeHostReachable = true;

    // If we previously showed a "native missing/invalid" modal but the host is now healthy, clear it
    if (pendingUpdateModal && (pendingUpdateModal.kind === 'native_missing' || pendingUpdateModal.kind === 'native_invalid')) {
        clearPendingUpdateModal();
    }

    let remoteText = "";
    try {
        // Avoid cached responses so extension reloads always re-check online version
        const cacheBustUrl = `${UPDATE_VERSION_URL}?_=${Date.now()}`;
        const r = await fetch(cacheBustUrl, { method: 'GET', cache: 'no-store' });
        if (!r.ok) return;
        remoteText = await r.text();
    } catch {
        return;
    }

    const remoteVersion = extractVersion(remoteText);
    if (!remoteVersion) return;
    if (compareVersions(remoteVersion, localVersion) <= 0) {
        updateAvailableStatus = null;
        dismissedUpdateKey = null;
        clearPendingUpdateModal();
        return;
    }

    const text = "The native App has an update. Download it on Github.";

    updateAvailableStatus = {
        kind: 'update_available',
        localVersion,
        remoteVersion,
        url: UPDATE_GITHUB_URL,
        downloadUrl: UPDATE_DOWNLOAD_URL
    };

    const updateKey = `${localVersion}|${remoteVersion}`;
    if (dismissedUpdateKey === updateKey) {
        clearPendingUpdateModal();
        return;
    }

    pendingUpdateModal = {
        kind: 'update_available',
        title: "App Update Available!",
        text,
        localVersion,
        remoteVersion,
        url: UPDATE_GITHUB_URL,
        downloadUrl: UPDATE_DOWNLOAD_URL
    };
    updateModalTargetTabId = null;
    updateModalRetryByTab.forEach(st => { if (st && st.timer) clearTimeout(st.timer); });
    updateModalRetryByTab.clear();

    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
        const tab = tabs[0];
        scheduleTryShowUpdateModal(tab.id, tab.url);
    }
}

async function syncActiveTabs() {
    const tabs = await browser.tabs.query({
        url: ["*://*.youtube.com/*", "*://*.music.youtube.com/*"]
    });

    if (tabs.length > 0) {
        for (const tab of tabs) {
            browser.tabs.sendMessage(tab.id, { action: "REQUEST_SYNC" }).catch(() => {
            });
        }
    }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
    if (msg.action === 'ENSURE_YTMUSIC_PLAYING_TAB_SELECTED') {
        const senderTab = sender && sender.tab;
        if (!senderTab || senderTab.id == null) return { ok: false, reason: 'no_sender_tab' };

        const tabUrl = String(senderTab.url || '');
        if (!tabUrl.includes('music.youtube.com')) return { ok: false, reason: 'not_music_tab' };
        if (msg.isPlaying !== true) return { ok: false, reason: 'not_playing' };

        const port = getNativePort();
        if (!port) return { ok: false, reason: 'native_missing' };

        const service = 'YoutubeMusic';
        let selectedNow = null;
        try {
            const status = await requestNativeStatus(850);
            selectedNow = normalizeSelectedTabId(status && status.selected_tabs, service);
        } catch {
            selectedNow = null;
        }

        if (selectedNow !== null && String(selectedNow) === String(senderTab.id)) {
            return { ok: true, alreadySelected: true };
        }

        try {
            await requestNative('SELECT_TAB', { service, tabId: senderTab.id }, 950);
        } catch {
            if (selectedNow !== null) {
                port.postMessage({ action: 'TAB_CLOSED', tabId: selectedNow });
            }
        }

        const delivered = await sendRequestSyncWithRetries(senderTab.id, senderTab.url, 12, { showPopup: false });
        return { ok: true, switched: true, delivered };
    }

    if (msg.action === 'SELECT_ACTIVE_TAB_FOR_RPC') {
        const port = getNativePort();
        if (!port) return { ok: false, reason: 'native_missing' };

        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return { ok: false, reason: 'no_active_tab' };

        const tab = tabs[0];
        const service = getServiceFromUrl(tab.url);
        if (!service) return { ok: false, reason: 'not_supported' };

        try {
            try {
                await requestNative('SELECT_TAB', { service, tabId: tab.id }, 900);
            } catch {
                try {
                    const status = await requestNativeStatus(900);
                    const oldSelected = normalizeSelectedTabId(status && status.selected_tabs, service);

                    if (oldSelected !== null && String(oldSelected) !== String(tab.id)) {
                        port.postMessage({ action: 'TAB_CLOSED', tabId: oldSelected });

                        const maxChecks = 6;
                        for (let i = 0; i < maxChecks; i += 1) {
                            await new Promise(r => setTimeout(r, i < 2 ? 90 : 140));
                            try {
                                const st2 = await requestNativeStatus(700);
                                const selectedNow = normalizeSelectedTabId(st2 && st2.selected_tabs, service);
                                if (selectedNow === null) break;
                            } catch { }
                        }
                    }
                } catch { }
            }

            const delivered = await sendRequestSyncWithRetries(tab.id, tab.url, 18, { showPopup: true });

            return { ok: true, service, tabId: tab.id, delivered };
        } catch {
            // Even if status fails, try to sync active tab
            const delivered = await sendRequestSyncWithRetries(tab.id, tab.url, 18, { showPopup: true });
            return { ok: false, reason: 'status_failed', service, tabId: tab.id, delivered };
        }
    }
    if (msg.action === "GET_UPDATE_STATUS") {
        return updateAvailableStatus;
    }
    if (msg.action === 'GET_VERSION_INFO') {
        const includeLatest = msg.includeLatest !== false;
        return await getVersionInfo({ includeLatest, forceLatestRefresh: !!msg.forceRefresh });
    }
    if (msg.action === 'GET_RPC_DIAGNOSTICS') {
        return await getRpcDiagnostics();
    }
    if (msg.action === "UPDATE_MODAL_DISMISSED") {
        if (msg.kind === 'native_missing' || msg.kind === 'native_invalid') {
            updateModalTargetTabId = null;
            updateModalRetryByTab.forEach(st => { if (st && st.timer) clearTimeout(st.timer); });
            updateModalRetryByTab.clear();
        } else {
            if (updateAvailableStatus && updateAvailableStatus.localVersion && updateAvailableStatus.remoteVersion) {
                dismissedUpdateKey = `${updateAvailableStatus.localVersion}|${updateAvailableStatus.remoteVersion}`;
            }
            clearPendingUpdateModal();
        }
        return;
    }
    if (msg.action === "REQUEST_DATA") {
        const port = getNativePort();
        if (!port) return;
        port.postMessage({ action: "GET_STATUS" }); 
        return;
    }
    if (msg.action === "TRIGGER_RELOAD") {
        return await performFullRpcReset();
    }
    if (msg.action === "TRIGGER_CUSTOM_RPC") {
        const defaults = await loadDefaults();
        const settings = await browser.storage.local.get(defaults);
        const port = getNativePort();
        if (!port) return;
        
        if (msg.enabled && settings.rpcCustom && settings.rpcCustom.enabled) {
            port.postMessage({
                action: "UPDATE_CUSTOM",
                currentSite: "Custom",
                payload: {},
                settings: settings.rpcCustom
            });
        } else {
            // Clear Custom RPC
            port.postMessage({ 
                action: "CLEAR_SERVICE", 
                service: "Custom"
            });
        }
        return;
    }
    if (msg.action === "TRIGGER_SYNC") {
        if (msg.enabled) {
            syncActiveTabs();
        } else {
            const port = getNativePort();
            if (!port) {
                syncActiveTabs();
                return;
            }
            
            if (msg.platform) {
                port.postMessage({ 
                    action: "CLEAR_SERVICE", 
                    service: msg.platform.includes("Music") ? "YoutubeMusic" : "Youtube" 
                });
            } else {
                port.postMessage({ action: "CLEAR_RPC" });
            }
            
            syncActiveTabs();
        }
        return;
    }
    if (msg.action === "TRIGGER_CLOSE") {
        const port = getNativePort();
        if (!port) return;
        port.postMessage({ action: "CLEAR_RPC" });
        return;
    }
    if (msg.action === "show_broadcast_global") {
        // Suppress info popups when the native app isn't installed/reachable
        if (nativeHostReachable === false) return;

        const defaults = await loadDefaults();
        const settings = await browser.storage.local.get(defaults);
        if (!settings.rpcEnabled) return;

        const senderTab = sender && sender.tab;
        if (!senderTab || senderTab.id == null) return;
        if (senderTab.active !== true) return;

        const senderUrl = senderTab.url || "";
        const service = getServiceFromUrl(senderUrl);
        if (!service) return;

        try {
            const status = await requestNativeStatus(650);
            const selectedNow = normalizeSelectedTabId(status && status.selected_tabs, service);

            if (selectedNow !== null && String(selectedNow) !== String(senderTab.id)) return;

            await browser.tabs.sendMessage(senderTab.id, {
                action: "show_broadcast",
                data: msg.data
            });
        } catch {
            return;
        }

        return;
    }

    const defaults = await loadDefaults();
    const settings = await browser.storage.local.get(defaults);

    if (!settings.rpcEnabled) return;

    // Check if this is the active tab
    let isActiveTab = false;
    if (sender.tab) {
        const activeTabs = await browser.tabs.query({ active: true, currentWindow: true });
        isActiveTab = activeTabs.length > 0 && activeTabs[0].id === sender.tab.id;
    }

    if (msg.action === "BROWSING_ACTIVITY") {
        const port = getNativePort();
        if (!port) return;

        const senderUrl = msg.payload?.url || (sender.tab ? sender.tab.url : "");
        const isMusic = senderUrl.includes("music.youtube.com");
        const site = msg.currentSite || (isMusic ? "YoutubeMusic" : "Youtube");

        const data = {
            ...msg,
            currentSite: site,
            tabId: sender.tab ? sender.tab.id : null,
            isActiveTab: isActiveTab,
            settings: msg.settings || {}
        };
        port.postMessage(data);
        return;
    }

    const port = getNativePort();
    if (!port) return;
    const currentUrl = msg.payload?.url || (sender.tab ? sender.tab.url : "");
    const isMusic = currentUrl.includes("music.youtube.com");
    const isMainYoutube = currentUrl.includes("www.youtube.com");

    const youtubeMusicEnabled = settings.rpcYoutubeMusic?.running?.enabled
        ?? settings.rpcYoutubeMusic?.paused?.enabled
        ?? settings.rpcYoutubeMusic?.enabled
        ?? true;

    if (isMusic && !youtubeMusicEnabled) return;
    if (isMainYoutube && !settings.rpcYoutube.running.enabled) return;

    const currentSite = isMusic ? "YoutubeMusic" : "Youtube";

    // Optional behavior: when a YouTube Music track is paused, either show the paused RPC
    // or clear the YouTube Music presence entirely (per-tab) depending on user setting
    if (
        currentSite === "YoutubeMusic" &&
        msg.action === "VIDEO_PAUSED" &&
        settings.rpcYoutubeMusic &&
        settings.rpcYoutubeMusic.showPausedRpc === false
    ) {
        port.postMessage({
            action: "TAB_CLOSED",
            tabId: sender.tab ? sender.tab.id : null
        });
        return;
    }

    // Optional behavior: when a YouTube video is paused, either show the paused RPC
    // or clear the YouTube presence entirely (per-tab) depending on user setting
    if (
        currentSite === "Youtube" &&
        msg.action === "VIDEO_PAUSED" &&
        settings.rpcYoutube &&
        settings.rpcYoutube.showPausedRpc === false
    ) {
        port.postMessage({
            action: "TAB_CLOSED",
            tabId: sender.tab ? sender.tab.id : null
        });
        return;
    }
    let activeSettings;

    if (currentSite === "Youtube") {
        activeSettings = msg.action === "VIDEO_PAUSED" ? settings.rpcYoutube.paused : settings.rpcYoutube.running;
    } else {
        activeSettings = msg.action === "VIDEO_PAUSED" ? settings.rpcYoutubeMusic.paused : settings.rpcYoutubeMusic.running;
    }

    const data = {
        ...msg,
        currentSite: currentSite,
        tabId: sender.tab ? sender.tab.id : null,
        isActiveTab: isActiveTab,
        settings: activeSettings,
    };
    
    port.postMessage(data);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        const url = changeInfo.url;
        const isYouTube = url.includes("youtube.com") || url.includes("music.youtube.com");

        if (!isYouTube) {
            (async () => {
                const port = getNativePort();
                if (!port) return;

                let selected = {};
                try {
                    const status = await requestNativeStatus(700);
                    selected = (status && status.selected_tabs) || {};
                } catch { }

                Object.entries(selected).forEach(([service, selectedTabId]) => {
                    if (String(selectedTabId) === String(tabId)) {
                        port.postMessage({ action: "CLEAR_SERVICE", service });
                    }
                });

                port.postMessage({
                    action: "TAB_CLOSED",
                    tabId: tabId
                });
            })();
        }
    }
});

browser.tabs.onRemoved.addListener((tabId) => {
    if (updateModalTargetTabId === tabId) {
        updateModalTargetTabId = null;
    }
    const st = updateModalRetryByTab.get(tabId);
    if (st && st.timer) clearTimeout(st.timer);
    updateModalRetryByTab.delete(tabId);

    (async () => {
        const port = getNativePort();
        if (!port) return;

        let selected = {};
        try {
            const status = await requestNativeStatus(700);
            selected = (status && status.selected_tabs) || {};
        } catch { }

        Object.entries(selected).forEach(([service, selectedTabId]) => {
            if (String(selectedTabId) === String(tabId)) {
                port.postMessage({ action: "CLEAR_SERVICE", service });
            }
        });

        port.postMessage({ action: "TAB_CLOSED", tabId: tabId });
    })();
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    const url = tab.url || "";
    const isYouTube = url.includes("youtube.com") || url.includes("music.youtube.com");
    
    if (isYouTube) {
        browser.tabs.sendMessage(activeInfo.tabId, { action: "REQUEST_SYNC" }).catch(() => { });
    }
});

const isObject = (item) => item && typeof item === 'object' && !Array.isArray(item);

function deepMerge(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

function normalizeRpcYoutubeMusicConfig(config, defaultsConfig = {}) {
    const fallbackRoot = isObject(defaultsConfig) ? defaultsConfig : {};
    const fallbackRunning = isObject(fallbackRoot.running) ? fallbackRoot.running : {};
    const fallbackPaused = isObject(fallbackRoot.paused) ? fallbackRoot.paused : {};

    const source = isObject(config) ? { ...config } : {};
    const hasRunning = isObject(source.running);
    const hasPaused = isObject(source.paused);
    const hasModes = hasRunning || hasPaused;

    const legacyEnabled = source.enabled;
    const fallbackEnabled = fallbackRunning.enabled ?? true;
    const resolvedEnabled = (legacyEnabled !== undefined) ? !!legacyEnabled : !!fallbackEnabled;

    let running;
    let paused;

    if (!hasModes) {
        running = deepMerge(fallbackRunning, source);
        paused = deepMerge(fallbackPaused, source);
        running.enabled = resolvedEnabled;
        paused.enabled = resolvedEnabled;

        const pausedDetails = String(paused.details || '').toUpperCase();
        if (!pausedDetails.includes('PAUSED:')) {
            paused.details = `PAUSED: ${running.details || '%title%'}`;
        }

        paused.timestamps = {
            ...(isObject(paused.timestamps) ? paused.timestamps : {}),
            start: false,
            end: false
        };
    } else {
        running = deepMerge(fallbackRunning, source.running || {});
        paused = deepMerge(fallbackPaused, source.paused || {});

        if (running.enabled === undefined) running.enabled = resolvedEnabled;
        if (paused.enabled === undefined) paused.enabled = resolvedEnabled;
    }

    const browsingActivities = source.browsingActivities
        || source.running?.browsingActivities
        || source.paused?.browsingActivities
        || fallbackRoot.browsingActivities;

    const normalized = {
        ...source,
        showPausedRpc: source.showPausedRpc !== undefined
            ? source.showPausedRpc
            : (fallbackRoot.showPausedRpc !== undefined ? fallbackRoot.showPausedRpc : true),
        showSongWhileBrowsing: source.showSongWhileBrowsing !== undefined
            ? source.showSongWhileBrowsing
            : (fallbackRoot.showSongWhileBrowsing !== undefined ? fallbackRoot.showSongWhileBrowsing : true),
        browsingActivities,
        running,
        paused
    };

    delete normalized.enabled;

    return normalized;
}

async function initializeStorage() {
    const response = await fetch(browser.runtime.getURL('default_settings.json'));
    const defaults = await response.json();
    const current = await browser.storage.local.get();

    const merged = deepMerge(defaults, current);

    if (merged.rpcYoutubeMusic) {
        merged.rpcYoutubeMusic = normalizeRpcYoutubeMusicConfig(merged.rpcYoutubeMusic, defaults.rpcYoutubeMusic || {});
    }
    
    if (current.rpcEnabled !== undefined) merged.rpcEnabled = current.rpcEnabled;
    if (current.informationPopups !== undefined) merged.informationPopups = current.informationPopups;

    await browser.storage.local.set(merged);

    if (merged.rpcEnabled) {
        syncActiveTabs();
        
        if (merged.rpcCustom && merged.rpcCustom.enabled) {
            const port = getNativePort();
            if (port) {
                port.postMessage({
                    action: "UPDATE_CUSTOM",
                    currentSite: "Custom",
                    payload: {},
                    settings: merged.rpcCustom
                });
            }
        }
    }
}

browser.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === "install") {
        // console.log("First time install: Setting defaults.");
        await initializeStorage();
        try {
            await browser.tabs.create({
                url: browser.runtime.getURL('pages/info.html'),
                active: true
            });
        } catch { }
    } else if (details.reason === "update") {
        // console.log("Extension updated: Checking for new setting keys.");
        await initializeStorage();
    }
});

browser.runtime.onStartup.addListener(() => {
    checkForNativeAppUpdate();
});

checkForNativeAppUpdate();

setTimeout(() => {
    checkForNativeAppUpdate();
}, 2000);

browser.runtime.onSuspend.addListener(() => {
    const port = getNativePort();
    if (port) port.postMessage({ action: "CLEAR_RPC" });
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
    if (!pendingUpdateModal) return;
    try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        scheduleTryShowUpdateModal(activeInfo.tabId, tab && tab.url);
    } catch { }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!pendingUpdateModal) return;
    if (changeInfo.url) {
        scheduleTryShowUpdateModal(tabId, changeInfo.url);
        return;
    }
    if (changeInfo.status === 'loading') {
        const url = ((tab && tab.url) || "");
        scheduleTryShowUpdateModal(tabId, url);
        return;
    }
    if (changeInfo.status === 'complete') {
        const url = ((tab && tab.url) || "");
        scheduleTryShowUpdateModal(tabId, url);
    }
});