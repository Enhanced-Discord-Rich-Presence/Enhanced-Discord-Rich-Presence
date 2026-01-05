let activeToast = null;
let toastTimer = null;
let activeBroadcast = null;
let broadcastTimer = null;
let oldData = null;
let activeUpdateModal = null;

browser.runtime.onMessage.addListener((request) => {
    if (request.action === "show_toast") {
        showToast(request.data);
    }
    if (request.action === "show_broadcast") {
        showBroadcast(request.data);
    }
    if (request.action === "show_update_modal") {
        showUpdateModal(request.data);
    }
});

function showUpdateModal(data) {
    if (activeUpdateModal && document.body.contains(activeUpdateModal)) {
        updateUpdateModal(activeUpdateModal, data);
        return;
    }
    createUpdateModal(data);
}

function updateUpdateModal(host, data) {
    try {
        host.dataset.kind = (data && data.kind) ? String(data.kind) : '';
    } catch { }

    const shadow = host.shadowRoot;
    if (!shadow) return;
    const titleEl = shadow.querySelector('.update-title');
    const appEl = shadow.querySelector('.update-app');
    const bodyEl = shadow.querySelector('.update-body');
    const installedEl = shadow.querySelector('.update-installed');
    const latestEl = shadow.querySelector('.update-latest');
    const versionsEl = shadow.querySelector('.versions');
    const primaryLink = shadow.querySelector('.update-primary');
    const secondaryLink = shadow.querySelector('.update-secondary');
    const warnEl = shadow.querySelector('.warn');

    const title = (data && data.title) ? data.title : 'Update Available';
    const text = (data && data.text) ? data.text : 'A newer version of the App is available.';
    const installed = (data && data.localVersion) ? String(data.localVersion) : '';
    const latest = (data && data.remoteVersion) ? String(data.remoteVersion) : '';
    const url = (data && data.url) ? String(data.url) : '';
    const downloadUrl = (data && data.downloadUrl) ? String(data.downloadUrl) : '';
    const primaryLabel = (data && data.primaryLabel) ? String(data.primaryLabel) : 'Download Latest';
    const secondaryLabel = (data && data.secondaryLabel) ? String(data.secondaryLabel) : 'Open GitHub';
    const warnText = (data && data.warnText) ? String(data.warnText) : 'You can download the latest version {here}. If you don’t update, some features may stop working — or it may not work at all.';
    const inlineLink = shadow.querySelector('.inline-link');

    if (titleEl) titleEl.textContent = (data && data.title) ? data.title : 'Update Available';
    if (appEl) appEl.textContent = 'EnhancedRPC';
    if (bodyEl) bodyEl.textContent = text;
    if (installedEl) installedEl.textContent = installed;
    if (latestEl) latestEl.textContent = latest;

    if (versionsEl) {
        versionsEl.style.display = (installed || latest) ? '' : 'none';
    }

    if (inlineLink) {
        const href = downloadUrl || url;
        if (href) {
            inlineLink.setAttribute('data-url', href);
            inlineLink.style.display = '';
        } else {
            inlineLink.style.display = 'none';
        }
    }

    if (warnEl) {
        const href = downloadUrl || url;
        const hereSpan = `<span class="inline-link" data-url="${href || ''}">here</span>`;
        warnEl.innerHTML = warnText.includes('{here}')
            ? warnText.replace('{here}', hereSpan)
            : warnText;

        const newInline = shadow.querySelector('.inline-link');
        if (newInline && href) {
            newInline.setAttribute('data-url', href);
        }
    }

    if (primaryLink) {
        const href = downloadUrl || url;
        if (href) {
            primaryLink.setAttribute('data-url', href);
            primaryLink.style.display = '';
            primaryLink.textContent = primaryLabel;
        } else {
            primaryLink.style.display = 'none';
        }
    }

    if (secondaryLink) {
        if (url) {
            secondaryLink.setAttribute('data-url', url);
            secondaryLink.style.display = '';
            secondaryLink.textContent = secondaryLabel;
        } else {
            secondaryLink.style.display = 'none';
        }
    }

}

function createUpdateModal(data) {
    const host = document.createElement('div');
    host.id = 'enhanced-rpc-update-modal-host';
    activeUpdateModal = host;

    try {
        host.dataset.kind = (data && data.kind) ? String(data.kind) : '';
    } catch { }

    Object.assign(host.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647'
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.68); display: flex; align-items: center; justify-content: center; }
        .modal { width: 420px; max-width: calc(100vw - 24px); background: linear-gradient(180deg, rgba(30,31,34,0.98), rgba(20,21,23,0.98)); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,0.7); font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #dbdee1; position: relative; overflow: hidden;}
        .top-accent { height: 3px; background: linear-gradient(90deg, rgba(99,102,241,0.0), rgba(99,102,241,0.9), rgba(99,102,241,0.0)); }
        .header { padding: 14px 14px 10px 14px; display: flex; align-items: center; justify-content: space-between; }
        .title-row { display: flex; align-items: center; gap: 10px; }
        .title-col { display: flex; flex-direction: column; gap: 2px; }
        .badge { width: 28px; height: 28px; border-radius: 9px; background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.35); display: flex; align-items: center; justify-content: center; }
        .update-app { font-size: 13px; font-weight: 900; margin: 0; color: #ffffff; letter-spacing: 0.01em; }
        .update-title { font-size: 11px; font-weight: 900; margin: 0; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.55); }
        .close { border: none; background: transparent; color: rgba(255,255,255,0.6); cursor: pointer; padding: 6px; line-height: 0; border-radius: 8px; }
        .close:hover { color: #ffffff; background: rgba(255,255,255,0.06); }
        .content { padding: 0 14px 14px 14px; }
        .update-body { font-size: 12px; line-height: 1.45; margin: 0; color: rgba(219,222,225,0.92); }
        .versions { margin-top: 12px; padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .v-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 900; color: rgba(255,255,255,0.55); margin: 0 0 4px 0; }
        .v-value { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; color: #ffffff; margin: 0; }
        .warn { margin-top: 12px; padding: 10px 10px; border-radius: 12px; border: 1px solid rgba(249,115,22,0.28); background: rgba(249,115,22,0.06); color: rgba(254,215,170,0.9); font-size: 11px; line-height: 1.4; }
        .inline-link { color: rgba(165,180,252,0.95); text-decoration: underline; text-decoration-thickness: 1px; cursor: pointer; font-weight: 700; }
        .inline-link:hover { color: rgba(199,210,254,1); }
        .actions { margin-top: 12px; display: flex; gap: 10px; }
        .btn { user-select: none; cursor: pointer; border-radius: 12px; padding: 10px 12px; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(255,255,255,0.12); }
        .btn.primary { flex: 1; background: rgba(99,102,241,0.92); border-color: rgba(99,102,241,0.75); color: #ffffff; }
        .btn.primary:hover { background: rgba(99,102,241,1); }
        .btn.secondary { background: rgba(255,255,255,0.04); color: rgba(219,222,225,0.9); }
        .btn.secondary:hover { background: rgba(255,255,255,0.07); }
    `;

    const title = (data && data.title) ? data.title : 'Update Available';
    const text = (data && data.text) ? data.text : 'A newer version of the App is available.';
    const installed = (data && data.localVersion) ? String(data.localVersion) : '';
    const latest = (data && data.remoteVersion) ? String(data.remoteVersion) : '';
    const url = (data && data.url) ? String(data.url) : '';
    const downloadUrl = (data && data.downloadUrl) ? String(data.downloadUrl) : '';
    const primaryHref = downloadUrl || url;
    const primaryLabel = (data && data.primaryLabel) ? String(data.primaryLabel) : 'Download Latest';
    const secondaryLabel = (data && data.secondaryLabel) ? String(data.secondaryLabel) : 'Open GitHub';
    const warnText = (data && data.warnText) ? String(data.warnText) : 'You can download the latest version {here}. If you don’t update, some features may stop working — or it may not work at all.';

    const hereSpan = `<span class="inline-link" data-url="${primaryHref}">here</span>`;
    const warnHtml = warnText.includes('{here}') ? warnText.replace('{here}', hereSpan) : warnText;
    const versionsHtml = (installed || latest) ? `
                <div class="versions">
                    <div>
                        <p class="v-label">Installed</p>
                        <p class="v-value update-installed">${installed}</p>
                    </div>
                    <div>
                        <p class="v-label">Latest</p>
                        <p class="v-value update-latest">${latest}</p>
                    </div>
                </div>
    ` : '';

    const modal = document.createElement('div');
    modal.className = 'overlay';
    modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
            <div class="top-accent"></div>
            <div class="header">
                <div class="title-row">
                    <div class="badge" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(165,180,252,0.95)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v8"></path>
                            <path d="M12 18v4"></path>
                            <path d="M4.93 4.93l5.66 5.66"></path>
                            <path d="M13.41 13.41l5.66 5.66"></path>
                            <path d="M2 12h8"></path>
                            <path d="M14 12h8"></path>
                            <path d="M4.93 19.07l5.66-5.66"></path>
                            <path d="M13.41 10.59l5.66-5.66"></path>
                        </svg>
                    </div>
                    <div class="title-col">
                        <div class="update-app">EnhancedRPC</div>
                        <div class="update-title">${title}</div>
                    </div>
                </div>
                <button class="close" type="button" aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <div class="content">
                <p class="update-body">${text}</p>
                ${versionsHtml}
                <div class="warn">${warnHtml}</div>
                <div class="actions">
                    ${primaryHref ? `<button class="btn primary update-primary" type="button" data-url="${primaryHref}">${primaryLabel}</button>` : ''}
                    ${url ? `<button class="btn secondary update-secondary" type="button" data-url="${url}">${secondaryLabel}</button>` : ''}
                </div>
            </div>
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(modal);
    document.body.appendChild(host);

    const closeBtn = shadow.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (host.parentNode) host.remove();
            if (activeUpdateModal === host) activeUpdateModal = null;
            try {
                browser.runtime.sendMessage({ action: 'UPDATE_MODAL_DISMISSED', kind: host.dataset.kind || '' });
            } catch { }
        });
    }

    const openUrl = (el) => {
        const u = el && el.getAttribute && el.getAttribute('data-url');
        if (u) window.open(u, '_blank');
    };

    const inlineLink = shadow.querySelector('.inline-link');
    if (inlineLink) inlineLink.addEventListener('click', () => openUrl(inlineLink));

    const primaryBtn = shadow.querySelector('.update-primary');
    if (primaryBtn) primaryBtn.addEventListener('click', () => openUrl(primaryBtn));

    const secondaryBtn = shadow.querySelector('.update-secondary');
    if (secondaryBtn) secondaryBtn.addEventListener('click', () => openUrl(secondaryBtn));
}

function interpolate(text, payload) {
    if (!text) return "";
    const getThumb = (url) => {
        if (!url) return "";
        try {
            const v = new URL(url).searchParams.get("v");
            return v ? `https://img.youtube.com/vi/${v}/maxresdefault.jpg` : "";
        } catch(e) { return ""; }
    };

    const map = {
        "%title%": payload.title || "Unknown Title",
        "%thumbnail%": getThumb(payload.url) || "https://img.youtube.com/vi/zLsIe5fSJLg/maxresdefault.jpg",
        "%url%": payload.url || "https://www.youtube.com",
        "%author%": payload.author_name || "YouTube",
        "%author_avatar%": payload.author_avatar || "https://www.youtube.com/favicon.ico",
    };

    let res = String(text);
    for (const [k, v] of Object.entries(map)) {
        res = res.split(k).join(v);
    }
    return res;
}

function processData(rawData) {
    const mockPayload = {
        title: "Alan Walker - Alone",
        author_name: "Alan Walker",
        url: "https://www.youtube.com/watch?v=1-xGerv5FOk",
        author_avatar: "https://yt3.ggpht.com/SAs09KIPVunHrNem5Sapxpa5RMyeLr17zYqzTw7Ps1Daqa1fm_LuWcoFIHZVMAFCnb7JPgN7TJk=s88-c-k-c0x00ffffff-no-rj",
    };

    const payload = rawData.payload && Object.keys(rawData.payload).length > 0 ? rawData.payload : mockPayload;

    return {
        ...rawData,
        details: interpolate(rawData.details || "%title%", payload),
        state: interpolate(rawData.state || "by %author%", payload),
        large_image_url: interpolate(rawData.large_image_url || "%thumbnail%", payload),
        small_image_url: interpolate(rawData.small_image_url || "%author_avatar%", payload),
        button1_text: interpolate(rawData.button1_text || "", payload),
        button1_url: interpolate(rawData.button1_url || "", payload),
        button2_text: interpolate(rawData.button2_text || "", payload),
        button2_url: interpolate(rawData.button2_url || "", payload),
        type: rawData.type ?? 3 
    };
}

function showToast(rawData) {
    if (activeToast && document.body.contains(activeToast)) {
        updateExistingToast(activeToast, rawData);
        return;
    }
    createToast(rawData);
}
function showBroadcast(data) {
    const serialized = JSON.stringify(data);

    if (activeBroadcast && serialized === oldData) {
        return;
    }

    oldData = serialized;

    if (activeBroadcast) {
        if (broadcastTimer) clearInterval(broadcastTimer);
        if (activeBroadcast.parentNode) activeBroadcast.remove();
        activeBroadcast = null;
    }

    createBroadcast(data);
}


function createToast(rawData) {
    const data = processData(rawData);
    const host = document.createElement('div');
    host.id = 'enhanced-rpc-toast-host';
    activeToast = host;

    let timeLeft = 6;

    Object.assign(host.style, {
        position: 'fixed', top: '20px', left: '20px', zIndex: '2147483647',
        transition: 'opacity 0.8s ease, transform 0.8s ease', opacity: '0', transform: 'translateX(-20px)'
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    
    style.textContent = `
        .activity-card {background: oklab(0.298138 0.00108124 -0.00904021); color: #ffffff; width: 405.6px; min-height: 135.6px; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; position: relative; font-family: system-ui, -apple-system, sans-serif;}
        .toast-timer { position: absolute; top: 12px; right: 12px; font-size: 10px; font-family: monospace; opacity: 0.6; font-weight: bold;}
        .card-header {display: flex; height: 16px; align-items: center; margin-bottom: 4px;}
        .status-label {font-size: 11px; font-weight: 700; text-transform: uppercase; opacity: 0.8; letter-spacing: 0.05em;}
        .card-body {display: flex; flex-direction: row; gap: 14px;}
        .image-container {position: relative; width: 90px; height: 90px; flex-shrink: 0;}
        .main-thumbnail {width: 90px; height: 90px; object-fit: cover; border-radius: 8px;}
        .channel-ring {position: absolute; bottom: -5px; right: -5px; width: 32px; height: 32px; padding: 3px; background: oklab(0.298138 0.00108124 -0.00904021); border-radius: 50%; display: flex; align-items: center; justify-content: center;}
        .channel-avatar {width: 100%; height: 100%; border-radius: 50%; object-fit: cover;}
        .details-container {display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; justify-content: center;}
        .video-title {margin: 0; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}
        .author-name {font-size: 13px; color: #b5bac1; margin-bottom: 4px;}
        .actions-row { margin-top: 12px; display: flex; gap: 8px; }
        .action-button { flex: 1; height: 32px; background: #4e5058; color: #ffffff; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; }
    `;

    let activityExtraHtml = "";
    const typeStrings = { 0: 'Playing', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
    const activityName = typeStrings[data.type] || 'Activity';

    switch(data.type) {
        case 0:
            style.textContent += `
                .badges-container { display: flex; align-items: center; gap: 6px; margin-top: 4px; }
                .elapsed-text { font-family: monospace; font-size: 12px; color: #23a55a; font-weight: 600; }
            `;
            activityExtraHtml = `
                <div class="badges-container">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#23a55a"><path d="M20.97 4.06c0 .18.08.35.24.43.55.28.9.82 1.04 1.42.3 1.24.75 3.7.75 7.09v4.91a3.09 3.09 0 0 1-5.85 1.38l-1.76-3.51a1.09 1.09 0 0 0-1.23-.55c-.57.13-1.36.27-2.16.27s-1.6-.14-2.16-.27c-.49-.11-1 .1-1.23.55l-1.76 3.51A3.09 3.09 0 0 1 1 17.91V13c0-3.38.46-5.85.75-7.1.15-.6.49-1.13 1.04-1.4a.47.47 0 0 0 .24-.44c0-.7.48-1.32 1.2-1.47l2.93-.62c.5-.1 1 .06 1.36.4.35.34.78.71 1.28.68a42.4 42.4 0 0 1 4.4 0c.5.03.93-.34 1.28-.69.35-.33.86-.5 1.36-.39l2.94.62c.7.15 1.19.78 1.19 1.47ZM20 7.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM15.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM5 7a1 1 0 0 1 2 0v1h1a1 1 0 0 1 0 2H7v1a1 1 0 1 1-2 0v-1H4a1 1 0 1 1 0-2h1V7Z"/></svg>
                    <span class="elapsed-text">ELAPSED: 1:12</span>
                </div>`;
            break;
        case 2: case 3: case 5:
            style.textContent += `
                .progress-container { display: flex; align-items: center; gap: 8px; margin-top: 6px; width: 100%; }
                .time-text { font-family: monospace; font-size: 11px; color: #dbdee1; }
                .progress-bg { background: rgba(255,255,255,0.1); height: 4px; flex-grow: 1; border-radius: 2px; overflow: hidden; }
                .progress-fill { background: #ffffff; height: 100%; width: 44%; border-radius: 2px; }
            `;
            activityExtraHtml = `
                <div class="progress-container">
                    <span class="time-text">1:12</span>
                    <div class="progress-bg"><div class="progress-fill"></div></div>
                    <span class="time-text">2:43</span>
                </div>`;
            break;
    }

    let buttonsHtml = "";
    if (data.button1_text || data.button2_text) {
        buttonsHtml += `<div class="actions-row">`;
        if (data.button1_text) buttonsHtml += `<button class="action-button" data-url="${data.button1_url}">${data.button1_text}</button>`;
        if (data.button2_text) buttonsHtml += `<button class="action-button" data-url="${data.button2_url}">${data.button2_text}</button>`;
        buttonsHtml += `</div>`;
    }

    const card = document.createElement('article');
    card.className = 'activity-card';
    card.innerHTML = `
        <div class="toast-timer">(${timeLeft}s)</div>
        <header class="card-header">
            <span class="status-label">${activityName} YouTube</span>
        </header>
        <div class="card-body">
            <div class="image-container">
                <img src="${data.large_image_url}" class="main-thumbnail toast-large-img">
                <div class="channel-ring">
                    <img src="${data.small_image_url}" class="channel-avatar toast-small-img">
                </div>
            </div>
            <div class="details-container">
                <div class="video-title toast-details">${data.details}</div>
                <div class="author-name toast-state">${data.state}</div>
                ${activityExtraHtml}
            </div>
        </div>
        ${buttonsHtml}
    `;

    card.querySelectorAll('.action-button').forEach(btn => {
        btn.onclick = () => { if(btn.dataset.url) window.open(btn.dataset.url, '_blank'); };
    });

    shadow.appendChild(style);
    shadow.appendChild(card);
    document.body.appendChild(host);

    requestAnimationFrame(() => { 
        host.style.opacity = '1'; 
        host.style.transform = 'translateX(0)'; 
    });
    
    startCountdown(host, timeLeft);
}
function updateExistingToast(host, rawData) {
    const data = processData(rawData);
    const shadow = host.shadowRoot;
    if (!shadow) return;

    shadow.querySelector('.toast-details').textContent = data.details;
    shadow.querySelector('.toast-state').textContent = data.state;
    shadow.querySelector('.toast-large-img').src = data.large_image_url;
    shadow.querySelector('.toast-small-img').src = data.small_image_url;

    startCountdown(host, 6);
}


function createBroadcast(rawData) {
    const data = processData(rawData);
    const host = document.createElement('div');
    host.id = 'ridscor-broadcast-host';
    activeBroadcast = host; 

    let timeLeft = 6;

    Object.assign(host.style, {
        position: 'fixed', 
        top: '20px',
        left: '50%',
        zIndex: '2147483647',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        transition: 'opacity 0.5s ease, transform 0.5s ease', 
        opacity: '0', 
        transform: 'translateX(-50%)'
    });

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');

    style.textContent = `
        :host { --primary-pink: #eb459e; }
        @keyframes pulse-ring { 0% { transform: scale(.33); } 80%, 100% { opacity: 0; } }
        @keyframes scan { 0% { left: -100%; } 100% { left: 100%; } }
        .toast-container { position: relative; width: 350px; background: linear-gradient(135deg, #1e1f22 0%, #2b2d31 100%); color: #dbdee1; padding: 14px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.4); display: flex; align-items: center; gap: 14px; overflow: hidden; }
        .toast-timer { position: absolute; top: 8px; right: 12px; font-size: 9px; font-family: monospace; color: rgba(255, 255, 255, 0.3); font-weight: bold; }
        .scan-line { position: absolute; top: 0; width: 60%; height: 100%; background: linear-gradient(to right, transparent, rgba(255,255,255,0.04), transparent); transform: skewX(-25deg); animation: scan 4s infinite linear; }
        .icon-box { background: linear-gradient(135deg, #eb459e 0%, #c4327a 100%); padding: 10px; border-radius: 12px; display: flex; align-items: center; justify-content: center; z-index: 10; }
        .content-area { flex-grow: 1; min-width: 0; z-index: 10; }
        .toast-title { font-size: 14px; font-weight: 600; color: white; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .toast-subtitle { font-size: 11px; color: #9ca3af; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .status-area { display: flex; padding-left: 8px; z-index: 10; }
        .pulse-container { position: relative; width: 10px; height: 10px; }
        .pulse-dot { width: 100%; height: 100%; background-color: #eb459e; border-radius: 50%; box-shadow: 0 0 10px #eb459e; }
        .pulse-ring { position: absolute; left: -10px; top: -10px; width: 30px; height: 30px; background-color: #eb459e; border-radius: 50%; animation: pulse-ring 2s infinite; }
    `;

    const card = document.createElement('div');
    card.className = 'toast-container';
    card.innerHTML = `
        <div class="toast-timer">(${timeLeft})</div>
        <div class="scan-line"></div>
        <div class="icon-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>
        </div>
        <div class="content-area">
            <p class="toast-title">${data.title}</p>
            <p class="toast-subtitle">${data.text}</p>
        </div>
        <div class="status-area">
            <div class="pulse-container"><div class="pulse-ring"></div><div class="pulse-dot"></div></div>
        </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(card);
    document.body.appendChild(host);

    requestAnimationFrame(() => { 
        host.style.opacity = '1'; 
        host.style.transform = 'translateX(-50%)'; 
    });
    
    startCountdownBroad(host, timeLeft);
}

function startCountdownBroad(host, seconds) {
    // Clear any global timer to avoid overlaps
    if (broadcastTimer) clearInterval(broadcastTimer);

    let timeLeft = seconds;
    const shadow = host.shadowRoot;
    if (!shadow) return;
    const timerDisplay = shadow.querySelector('.toast-timer');
    
    broadcastTimer = setInterval(() => {
        timeLeft--;

        if (!host || !host.shadowRoot || !document.body.contains(host)) {
            clearInterval(broadcastTimer);
            broadcastTimer = null;
            return;
        }

        if (timerDisplay) {
            timerDisplay.textContent = `(${timeLeft})`;
        }

        if (timeLeft <= 0) {
            clearInterval(broadcastTimer);
            broadcastTimer = null;
            host.style.opacity = '0';
            host.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                if (host.parentNode) host.remove();
                if (activeBroadcast === host) activeBroadcast = null;
            }, 500);
        }
    }, 1000);
}

function updateExistingBroadcast(host, rawData) {
    const data = processData(rawData);
    const shadow = host.shadowRoot;
    if (!shadow) return;

    const title = shadow.querySelector('.toast-title');
    const subtitle = shadow.querySelector('.toast-subtitle');

    if (title) title.textContent = data.details || 'Broadcasting Activity';
    if (subtitle) subtitle.textContent = data.state || 'Synced with Discord';

    startCountdown(host, 6);
}


function startCountdown(host, seconds) {
    if (toastTimer) clearInterval(toastTimer);

    let timeLeft = seconds;
    const shadow = host.shadowRoot;
    if (!shadow) return;
    
    const timerDisplay = shadow.querySelector('.toast-timer');
    if (timerDisplay) timerDisplay.textContent = `(${timeLeft}s)`;
    
    toastTimer = setInterval(() => {
        timeLeft--;

        if (!host || !host.shadowRoot || !document.body.contains(host)) {
            clearInterval(toastTimer);
            toastTimer = null;
            return;
        }

        if (timerDisplay) timerDisplay.textContent = `(${timeLeft})`;

        if (timeLeft <= 0) {
            clearInterval(toastTimer);
            toastTimer = null;
            host.style.opacity = '0';
            host.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                if (host.parentNode) host.remove();
                if (activeToast === host) activeToast = null;
            }, 800);
        }
    }, 1000);
}
