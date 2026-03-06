const overlayContainer = document.getElementById('overlay-container');
const overlayDragHandle = document.getElementById('overlay-drag-handle');
const overlayDragShield = document.getElementById('overlay-drag-shield');
const popupFrame = document.getElementById('popup-frame');

const debugPanel = document.getElementById('debug-panel');
const debugHeader = document.getElementById('debug-header');
const debugContent = document.getElementById('debug-content');
const copyDebugButton = document.getElementById('copy-debug');
const includeSettingsToggle = document.getElementById('copy-include-settings');

const bugsPanel = document.getElementById('bugs-panel');
const bugsHeader = document.getElementById('bugs-header');
const bugsContent = document.getElementById('bugs-content');

const KNOWN_BUGS_RAW_URL = 'https://raw.githubusercontent.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/main/Extension/src/knownbugs.json';

const infoDescriptions = {
    'toggle-status': '<b>RPC Switch</b><b>Enable</b> or <b>Disable</b> Rich Presence. When off, <b>no data</b> leaves the browser. <br><small>(same as the power button)</small>',
    'master-power': '<b>RPC Switch</b><b>Enable</b> or <b>Disable</b> Rich Presence. When off, <b>no data</b> leaves the browser. <br><small>(same as the power button)</small>',
    'toggle-popups': '<b>Interface Popups</b>Toggle <b>Broadcasting</b> Toasts.<br>If <b>enabled</b>, you\'ll see <b>floating notifications</b> in the top center everytime a new presence is detected and sent to Discord.',
    'btn-toast-trigger': '<b>Focus Tab</b>If pressed, the extension will <b>select</b> and send your presence of <b>the current tab</b> to Discord.',
    'btn-reload-presence': '<b>Reoload RPC</b>A <b>manual reset</b> for the Discord connection / RPC Stream. Use this if you face any <b>issues</b> with Discord not getting data or not getting the correct data.'
};

const connectorLayout = {
    'toggle-status': { xOff: -260, yOff: -230, side: 'left' },
    'master-power': { xOff: 260, yOff: -370, side: 'right' },
    'toggle-popups': { xOff: 260, yOff: -200, side: 'right' },
    'btn-toast-trigger': { xOff: 260, yOff: 220, side: 'right' },
    'btn-reload-presence': { xOff: -100, yOff: 410, side: 'left' }
};

const trackedElementIds = Object.keys(infoDescriptions);

let overlayDragging = false;
let overlayDragStartX = 0;
let overlayDragStartY = 0;
let overlayStartLeft = 0;
let overlayStartTop = 0;

let debugSnapshot = null;
let debugRefreshInFlight = false;
let pendingDebugRefreshTimer = null;

let debugPanelDragging = false;
let debugPanelWasMovedByUser = false;
let debugPanelDragStartX = 0;
let debugPanelDragStartY = 0;
let debugPanelStartLeft = 0;
let debugPanelStartTop = 0;

let bugsPanelDragging = false;
let bugsPanelDragStartX = 0;
let bugsPanelDragStartY = 0;
let bugsPanelStartLeft = 0;
let bugsPanelStartTop = 0;

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeVersion(value) {
    const normalized = value == null ? '' : String(value).trim();
    return normalized || 'Unavailable';
}

function normalizeTabTitle(url, title) {
    const rawTitle = String(title || '(No title)');

    return rawTitle;
}

function shortenText(value, maxLength = 55) {
    const text = String(value == null ? '' : value).trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1)}…`;
}

function getMainUrlName(url) {
    try {
        const parsedUrl = new URL(String(url || ''));
        const host = parsedUrl.hostname.toLowerCase();

        if (host.includes('music.youtube.com')) return 'YouTube Music';
        if (host.includes('youtube.com')) return 'YouTube';

        const cleanedHost = host.replace(/^www\./, '');
        const hostRoot = cleanedHost.split('.')[0] || cleanedHost;
        return hostRoot ? `${hostRoot.charAt(0).toUpperCase()}${hostRoot.slice(1)}` : 'Unknown';
    } catch {
        return 'Unknown';
    }
}

function centerOverlayContainer() {
    const rightOffset = 60;
    overlayContainer.style.left = `${window.innerWidth / 2 - overlayContainer.offsetWidth / 2 + rightOffset}px`;
    overlayContainer.style.top = `${window.innerHeight / 2 - overlayContainer.offsetHeight / 2}px`;
}

function keepDebugPanelInViewport() {
    if (!debugPanel) return;

    const maxLeft = Math.max(12, window.innerWidth - debugPanel.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - debugPanel.offsetHeight - 12);

    const currentLeft = Number.parseFloat(debugPanel.style.left || '44');
    const currentTop = Number.parseFloat(debugPanel.style.top || '100');

    debugPanel.style.left = `${clamp(currentLeft, 12, maxLeft)}px`;
    debugPanel.style.top = `${clamp(currentTop, 12, maxTop)}px`;
}

function centerDebugPanelVertically() {
    if (!debugPanel) return;
    const centeredTop = Math.max(12, Math.round((window.innerHeight - debugPanel.offsetHeight) / 2));
    debugPanel.style.top = `${centeredTop}px`;
    debugPanel.style.left = '44px';
    keepDebugPanelInViewport();
}

function centerBugsPanelVertically() {
    if (!bugsPanel) return;
    const centeredTop = Math.max(12, Math.round((window.innerHeight - bugsPanel.offsetHeight) / 2));
    bugsPanel.style.top = `${centeredTop}px`;
}

function keepBugsPanelInViewport() {
    if (!bugsPanel) return;

    const maxLeft = Math.max(12, window.innerWidth - bugsPanel.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - bugsPanel.offsetHeight - 12);

    const currentRight = Number.parseFloat(bugsPanel.style.right || '44');
    const currentTop = Number.parseFloat(bugsPanel.style.top || '100');
    const inferredLeft = window.innerWidth - bugsPanel.offsetWidth - currentRight;

    const clampedLeft = clamp(inferredLeft, 12, maxLeft);
    const clampedTop = clamp(currentTop, 12, maxTop);

    bugsPanel.style.left = `${clampedLeft}px`;
    bugsPanel.style.right = 'auto';
    bugsPanel.style.top = `${clampedTop}px`;
}

function createLayer(type, id) {
    const layer = type === 'svg'
        ? document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        : document.createElement(type);

    layer.id = id;
    layer.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:10001;';
    document.body.appendChild(layer);
    return layer;
}

function updateConnectorLines() {
    if (!popupFrame.contentWindow) return;

    popupFrame.contentWindow.postMessage({
        type: 'GET_ALL_COORDS',
        ids: trackedElementIds
    }, '*');
}

function renderConnectorVisuals(points) {
    const frameRect = popupFrame.getBoundingClientRect();
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const svgLayer = document.getElementById('multi-line-svg') || createLayer('svg', 'multi-line-svg');
    const labelLayer = document.getElementById('label-layer') || createLayer('div', 'label-layer');

    svgLayer.innerHTML = '';
    labelLayer.innerHTML = '';

    points.forEach((point) => {
        const config = connectorLayout[point.id];
        if (!config) return;

        const lineStartX = frameRect.left + point.x;
        let lineStartY = frameRect.top + point.y;

        if (point.id === 'toggle-status' || point.id === 'toggle-popups') {
            lineStartY -= 20;
        }

        const labelAnchorX = centerX + config.xOff;
        const labelAnchorY = centerY + config.yOff;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', `M ${lineStartX} ${lineStartY} L ${labelAnchorX} ${labelAnchorY}`);
        line.setAttribute('stroke', 'rgba(88, 101, 242, 0.4)');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke-dasharray', '4,4');
        svgLayer.appendChild(line);

        const endpointDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        endpointDot.setAttribute('cx', lineStartX);
        endpointDot.setAttribute('cy', lineStartY);
        endpointDot.setAttribute('r', '3.5');
        endpointDot.setAttribute('fill', '#5865F2');
        svgLayer.appendChild(endpointDot);

        const label = document.createElement('div');
        label.className = 'info-label';
        label.innerHTML = infoDescriptions[point.id];
        label.style.top = `${labelAnchorY}px`;
        label.style.left = `${labelAnchorX}px`;

        if (config.side === 'left') {
            label.style.transform = 'translate(-108%, -50%)';
            label.style.textAlign = 'right';
        } else {
            label.style.transform = 'translate(8%, -50%)';
        }

        labelLayer.appendChild(label);
    });
}

function renderKnownBugs(data) {
    if (!bugsContent) return;

    const knownBugs = Array.isArray(data && data.bugs) ? data.bugs : [];
    if (knownBugs.length === 0) {
        bugsContent.innerHTML = '<div class="bug-empty">None</div>';
        return;
    }

    bugsContent.innerHTML = knownBugs.map((bug) => {
        const bugTitle = bug && bug.title ? String(bug.title) : 'Untitled';
        const bugDescription = bug && bug.description ? String(bug.description) : 'No description provided.';

        return `
            <div class="bug-item">
                <div class="bug-title">${escapeHtml(bugTitle)}</div>
                <div class="bug-desc">${escapeHtml(bugDescription)}</div>
            </div>
        `;
    }).join('');
}

async function fetchKnownBugs() {
    if (!bugsContent) return;

    try {
        const response = await fetch(`${KNOWN_BUGS_RAW_URL}?_=${Date.now()}`, {
            method: 'GET',
            cache: 'no-store'
        });

        if (!response.ok) {
            renderKnownBugs({ bugs: [] });
            return;
        }

        const payload = await response.json();
        renderKnownBugs(payload);
    } catch {
        renderKnownBugs({ bugs: [] });
    }

    centerBugsPanelVertically();
}

async function getDiagnosticsSnapshot() {
    let diagnostics = null;
    let versionInfo = null;
    try {
        diagnostics = await browser.runtime.sendMessage({ action: 'GET_RPC_DIAGNOSTICS' });
    } catch {
        diagnostics = null;
    }

    try {
        versionInfo = await browser.runtime.sendMessage({
            action: 'GET_VERSION_INFO',
            includeLatest: true
        });
    } catch {
        versionInfo = null;
    }

    let tabs = [];
    try {
        tabs = await browser.tabs.query({});
    } catch {
        tabs = [];
    }

    // Get browser and OS info
    let browserInfo = '';
    let osInfo = '';
    
    try {
        const browserData = await browser.runtime.getBrowserInfo();
        browserInfo = `${browserData.name} ${browserData.version}`;
    } catch {
        browserInfo = 'Unknown';
    }
    
    try {
        const platformData = await browser.runtime.getPlatformInfo();
        const osMap = {
            'win': 'Windows',
            'mac': 'macOS',
            'android': 'Android',
            'cros': 'Chrome OS',
            'linux': 'Linux',
            'openbsd': 'OpenBSD',
            'fuchsia': 'Fuchsia'
        };
        osInfo = osMap[platformData.os] || platformData.os;
        if (platformData.arch) {
            osInfo += ` (${platformData.arch})`;
        }
    } catch {
        osInfo = 'Unknown';
    }

    const selectedByService = (diagnostics && diagnostics.rpcState && diagnostics.rpcState.selectedTabs) || {};
    const selectedEntries = Object.entries(selectedByService)
        .map(([service, tabId]) => ({ service, tabId: Number(tabId) }))
        .filter((entry) => Number.isFinite(entry.tabId));

    const selectedTabIdSet = new Set(selectedEntries.map((entry) => entry.tabId));

    const diagnosticsInstalled = (diagnostics && diagnostics.installedVersions) || {};
    const diagnosticsLatest = (diagnostics && diagnostics.latestVersions) || {};
    const fallbackInstalled = (versionInfo && versionInfo.installed) || {};
    const fallbackLatest = (versionInfo && versionInfo.latest) || {};

    const installedVersions = {
        extensionVersion: diagnosticsInstalled.extensionVersion || fallbackInstalled.extensionVersion || '',
        nativeAppVersion: diagnosticsInstalled.nativeAppVersion || fallbackInstalled.nativeAppVersion || ''
    };

    const latestVersions = {
        extensionVersion: diagnosticsLatest.extensionVersion || fallbackLatest.extensionVersion || '',
        nativeAppVersion: diagnosticsLatest.nativeAppVersion || fallbackLatest.nativeAppVersion || ''
    };

    return {
        collectedAt: (diagnostics && diagnostics.collectedAt) || new Date().toISOString(),
        browserInfo,
        osInfo,
        installedVersions,
        latestVersions,
        selectedEntries,
        tabs: tabs.map((tab) => ({
            id: tab.id,
            title: normalizeTabTitle(tab.url, tab.title),
            url: tab.url || '(No URL)',
            active: !!tab.active,
            highlighted: !!tab.highlighted,
            selectedForRpc: selectedTabIdSet.has(tab.id)
        }))
    };
}

function renderDebugPanel(snapshot) {
    if (!debugContent) return;

    const selectedChips = snapshot.selectedEntries.length
        ? snapshot.selectedEntries.map((entry) => {
            const selectedTab = snapshot.tabs.find((tab) => tab.id === entry.tabId);
            const selectedLabel = selectedTab ? `${selectedTab.title} (#${entry.tabId})` : `Missing tab #${entry.tabId}`;
            return `<span class="selected-chip">${escapeHtml(entry.service)} → ${escapeHtml(selectedLabel)}</span>`;
        }).join('')
        : '<span class="debug-value">None</span>';

    const tabsListHtml = snapshot.tabs.length
        ? snapshot.tabs.map((tab) => {
            const tabFlags = [];
            if (tab.active) tabFlags.push('active');
            if (tab.highlighted) tabFlags.push('highlighted');
            if (tab.selectedForRpc) tabFlags.push('selected-rpc');

            const flagSuffix = tabFlags.length ? ` [${tabFlags.join(', ')}]` : '';
            const mainUrlName = getMainUrlName(tab.url);
            const shortTitle = shortenText(tab.title, 56);

            return `
                <li class="tab-item${tab.selectedForRpc ? ' is-selected' : ''}">
                    <div class="tab-title" title="${escapeHtml(tab.url)}">[#${escapeHtml(tab.id)}] - <span class="tab-main">${escapeHtml(mainUrlName)}</span> ${escapeHtml(shortTitle)}${escapeHtml(flagSuffix)}</div>
                    <a class="tab-url" href="${escapeHtml(tab.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(tab.url)}</a>
                </li>
            `;
        }).join('')
        : '<li class="tab-item"><div class="debug-value">No open tabs detected.</div></li>';

    debugContent.innerHTML = `
        <div class="debug-block">
            <div class="debug-label">Last Update</div>
            <div class="debug-value">${escapeHtml(snapshot.collectedAt)}</div>
        </div>

        <div class="debug-block">
            <div class="debug-label">Firefox</div>
            <div class="debug-value">${escapeHtml(snapshot.browserInfo || 'Unknown')}</div>
        </div>

        <div class="debug-block">
            <div class="debug-label">OS</div>
            <div class="debug-value">${escapeHtml(snapshot.osInfo || 'Unknown')}</div>
        </div>

        <div class="debug-block">
            <div class="debug-label">Versions</div>
            <div class="debug-value">Extension: ${escapeHtml(normalizeVersion(snapshot.installedVersions.extensionVersion))} | ${escapeHtml(normalizeVersion(snapshot.latestVersions.extensionVersion))}</div>
            <div class="debug-value">Native App: ${escapeHtml(normalizeVersion(snapshot.installedVersions.nativeAppVersion))} | ${escapeHtml(normalizeVersion(snapshot.latestVersions.nativeAppVersion))}</div>
        </div>

        <div class="debug-block">
            <div class="debug-label">Selected Tabs (RPC)</div>
            <div>${selectedChips}</div>
        </div>

        <div class="debug-block">
            <div class="debug-label">Open Tabs (${snapshot.tabs.length})</div>
            <ul class="tabs-list">${tabsListHtml}</ul>
        </div>
    `;
}

async function buildDebugClipboardText(snapshot) {
    const lines = [];

    // Get browser and OS info
    let browserInfo = '';
    let osInfo = '';
    
    try {
        const browserData = await browser.runtime.getBrowserInfo();
        browserInfo = `${browserData.name} ${browserData.version}`;
    } catch {
        browserInfo = 'Unknown';
    }
    
    try {
        const platformData = await browser.runtime.getPlatformInfo();
        const osMap = {
            'win': 'Windows',
            'mac': 'macOS',
            'android': 'Android',
            'cros': 'Chrome OS',
            'linux': 'Linux',
            'openbsd': 'OpenBSD',
            'fuchsia': 'Fuchsia'
        };
        osInfo = osMap[platformData.os] || platformData.os;
        if (platformData.arch) {
            osInfo += ` (${platformData.arch})`;
        }
    } catch {
        osInfo = 'Unknown';
    }

    lines.push(`Last Update: ${snapshot.collectedAt}`);
    lines.push(`Firefox: ${browserInfo}`);
    lines.push(`OS: ${osInfo}`);
    lines.push('Versions:');
    lines.push(`Extension: ${normalizeVersion(snapshot.installedVersions.extensionVersion)} | ${normalizeVersion(snapshot.latestVersions.extensionVersion)}`);
    lines.push(`Native App: ${normalizeVersion(snapshot.installedVersions.nativeAppVersion)} | ${normalizeVersion(snapshot.latestVersions.nativeAppVersion)}`);
    lines.push('');
    lines.push('Selected RPC Tabs:');

    if (snapshot.selectedEntries.length === 0) {
        lines.push('- None');
    } else {
        snapshot.selectedEntries.forEach((entry) => {
            const selectedTab = snapshot.tabs.find((tab) => tab.id === entry.tabId);
            lines.push(`- ${entry.service}: #${entry.tabId} ${selectedTab ? `(${selectedTab.title})` : '(tab missing)'}`);
        });
    }

    lines.push('');
    lines.push(`Open Tabs (${snapshot.tabs.length}):`);

    snapshot.tabs.forEach((tab) => {
        const tabFlags = [];
        if (tab.active) tabFlags.push('active');
        if (tab.highlighted) tabFlags.push('highlighted');
        if (tab.selectedForRpc) tabFlags.push('selected-rpc');

        const flagSuffix = tabFlags.length ? ` [${tabFlags.join(', ')}]` : '';
        const mainUrlName = getMainUrlName(tab.url);
        const shortTitle = shortenText(tab.title, 56);

        lines.push(`- [#${tab.id}] - ${mainUrlName} ${shortTitle}${flagSuffix}`);
        lines.push(`  URL: ${tab.url}`);
    });

    return lines.join('\n');
}

async function getPopupSettingsForCopy() {
    try {
        const storage = await browser.storage.local.get(null);
        return storage || {};
    } catch {
        return {};
    }
}

async function copyDebugSnapshot() {
    if (!debugSnapshot) return;

    let text = await buildDebugClipboardText(debugSnapshot);

    if (includeSettingsToggle && includeSettingsToggle.checked) {
        const popupSettings = await getPopupSettingsForCopy();
        text += '\n\n--- Popup Settings ---\n';
        text += JSON.stringify(popupSettings, null, 2);
    }

    let copied = false;

    try {
        await navigator.clipboard.writeText(text);
        copied = true;
    } catch {
        copied = false;
    }

    if (!copied) {
        const fallbackTextarea = document.createElement('textarea');
        fallbackTextarea.value = text;
        fallbackTextarea.style.position = 'fixed';
        fallbackTextarea.style.opacity = '0';
        document.body.appendChild(fallbackTextarea);
        fallbackTextarea.focus();
        fallbackTextarea.select();

        try {
            copied = document.execCommand('copy');
        } catch {
            copied = false;
        }

        document.body.removeChild(fallbackTextarea);
    }

    if (copyDebugButton) {
        const originalLabel = copyDebugButton.textContent;
        copyDebugButton.textContent = copied ? 'Copied' : 'Copy Failed';
        setTimeout(() => {
            copyDebugButton.textContent = originalLabel;
        }, 1300);
    }
}

async function refreshDebugPanel() {
    if (debugRefreshInFlight) return;
    debugRefreshInFlight = true;

    try {
        const snapshot = await getDiagnosticsSnapshot();
        debugSnapshot = snapshot;
        renderDebugPanel(snapshot);

        if (!debugPanelWasMovedByUser) {
            centerDebugPanelVertically();
        }
    } catch {
        if (debugContent) {
            debugContent.textContent = 'Unable to load diagnostics right now.';
        }
    } finally {
        debugRefreshInFlight = false;
    }
}

function scheduleDebugRefresh(delayMs = 150) {
    if (pendingDebugRefreshTimer) {
        clearTimeout(pendingDebugRefreshTimer);
    }

    pendingDebugRefreshTimer = setTimeout(() => {
        pendingDebugRefreshTimer = null;
        refreshDebugPanel();
    }, delayMs);
}

function registerDebugRefreshListeners() {
    if (browser && browser.tabs) {
        try {
            browser.tabs.onCreated.addListener(() => scheduleDebugRefresh(120));
            browser.tabs.onRemoved.addListener(() => scheduleDebugRefresh(120));
            browser.tabs.onActivated.addListener(() => scheduleDebugRefresh(120));
            browser.tabs.onHighlighted.addListener(() => scheduleDebugRefresh(120));
            browser.tabs.onUpdated.addListener((_tabId, changeInfo) => {
                if (changeInfo && (changeInfo.url || changeInfo.title || changeInfo.status === 'complete')) {
                    scheduleDebugRefresh(180);
                }
            });
        } catch { }
    }

    if (browser && browser.storage && browser.storage.onChanged) {
        try {
            browser.storage.onChanged.addListener(() => scheduleDebugRefresh(180));
        } catch { }
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            scheduleDebugRefresh(80);
        }
    });
}

function startOverlayDrag(event) {
    overlayDragging = true;
    overlayDragShield.style.display = 'block';

    overlayDragStartX = event.clientX;
    overlayDragStartY = event.clientY;
    overlayStartLeft = overlayContainer.offsetLeft;
    overlayStartTop = overlayContainer.offsetTop;

    document.addEventListener('mousemove', onOverlayDrag);
    document.addEventListener('mouseup', stopOverlayDrag);
}

function onOverlayDrag(event) {
    if (!overlayDragging) return;

    overlayContainer.style.left = `${overlayStartLeft + (event.clientX - overlayDragStartX)}px`;
    overlayContainer.style.top = `${overlayStartTop + (event.clientY - overlayDragStartY)}px`;
    updateConnectorLines();
}

function stopOverlayDrag() {
    overlayDragging = false;
    overlayDragShield.style.display = 'none';

    document.removeEventListener('mousemove', onOverlayDrag);
    document.removeEventListener('mouseup', stopOverlayDrag);
}

function startDebugPanelDrag(event) {
    if (!debugPanel) return;
    if (event.target && event.target.closest && event.target.closest('#copy-debug, #copy-include-settings, .copy-settings-wrap')) return;

    debugPanelDragging = true;
    debugPanelWasMovedByUser = true;

    debugPanelDragStartX = event.clientX;
    debugPanelDragStartY = event.clientY;
    debugPanelStartLeft = Number.parseFloat(debugPanel.style.left || '44');
    debugPanelStartTop = Number.parseFloat(debugPanel.style.top || '100');

    document.addEventListener('mousemove', onDebugPanelDrag);
    document.addEventListener('mouseup', stopDebugPanelDrag);
}

function onDebugPanelDrag(event) {
    if (!debugPanelDragging || !debugPanel) return;

    const nextLeft = debugPanelStartLeft + (event.clientX - debugPanelDragStartX);
    const nextTop = debugPanelStartTop + (event.clientY - debugPanelDragStartY);

    const maxLeft = Math.max(12, window.innerWidth - debugPanel.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - debugPanel.offsetHeight - 12);

    debugPanel.style.left = `${clamp(nextLeft, 12, maxLeft)}px`;
    debugPanel.style.top = `${clamp(nextTop, 12, maxTop)}px`;
}

function stopDebugPanelDrag() {
    debugPanelDragging = false;
    document.removeEventListener('mousemove', onDebugPanelDrag);
    document.removeEventListener('mouseup', stopDebugPanelDrag);
}

function startBugsPanelDrag(event) {
    if (!bugsPanel) return;

    const panelRect = bugsPanel.getBoundingClientRect();

    bugsPanelDragging = true;
    bugsPanelDragStartX = event.clientX;
    bugsPanelDragStartY = event.clientY;
    bugsPanelStartLeft = panelRect.left;
    bugsPanelStartTop = panelRect.top;

    bugsPanel.style.left = `${panelRect.left}px`;
    bugsPanel.style.right = 'auto';

    document.addEventListener('mousemove', onBugsPanelDrag);
    document.addEventListener('mouseup', stopBugsPanelDrag);
}

function onBugsPanelDrag(event) {
    if (!bugsPanelDragging || !bugsPanel) return;

    const nextLeft = bugsPanelStartLeft + (event.clientX - bugsPanelDragStartX);
    const nextTop = bugsPanelStartTop + (event.clientY - bugsPanelDragStartY);

    const maxLeft = Math.max(12, window.innerWidth - bugsPanel.offsetWidth - 12);
    const maxTop = Math.max(12, window.innerHeight - bugsPanel.offsetHeight - 12);

    bugsPanel.style.left = `${clamp(nextLeft, 12, maxLeft)}px`;
    bugsPanel.style.right = 'auto';
    bugsPanel.style.top = `${clamp(nextTop, 12, maxTop)}px`;
}

function stopBugsPanelDrag() {
    bugsPanelDragging = false;
    document.removeEventListener('mousemove', onBugsPanelDrag);
    document.removeEventListener('mouseup', stopBugsPanelDrag);
}

window.addEventListener('message', (event) => {
    if (event.data.type === 'RECEIVE_ALL_COORDS') {
        renderConnectorVisuals(event.data.data);
    }
});

window.onload = () => {
    centerOverlayContainer();
    centerDebugPanelVertically();
    centerBugsPanelVertically();

    if (includeSettingsToggle) {
        includeSettingsToggle.checked = false;
    }

    setTimeout(updateConnectorLines, 50);
    refreshDebugPanel();
    fetchKnownBugs();
    registerDebugRefreshListeners();
};

window.onresize = () => {
    centerOverlayContainer();
    updateConnectorLines();
    keepDebugPanelInViewport();
    keepBugsPanelInViewport();
};

popupFrame.onload = updateConnectorLines;

overlayDragHandle.addEventListener('mousedown', startOverlayDrag);

if (copyDebugButton) {
    copyDebugButton.addEventListener('click', copyDebugSnapshot);
}

if (debugHeader) {
    debugHeader.addEventListener('mousedown', startDebugPanelDrag);
}

if (bugsHeader) {
    bugsHeader.addEventListener('mousedown', startBugsPanelDrag);
}
