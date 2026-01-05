let state = {
    rpcEnabled: true,
    popupsEnabled: true,
    expandedSection: 'youtube',
    editingBrowsingActivity: null, // Track which browsing activity is being edited
    configs: {
        youtube: {
            title: 'YouTube',
            icon: 'youtube-svg',
            editingMode: 'running', 
            enabled: true,
            showPausedRpc: true,
            type: 'Watching',
            activityName: { enabled: false, name: 'YouTube' }, 
            details: { 
                text: '%title%', 
                url: '%url%', 
                urlEnabled: false
            },
            state: { 
                text: 'by %author%', 
                url: '%author_url%', 
                urlEnabled: false
            },
            showCurrentTime: true,
            showLength: true,
            largeImage: { enabled: true, text: '%title%', key: '%thumbnail%', url: '%url%', urlEnabled: true },
            smallImage: { enabled: true, text: '%author%', key: '%author_avatar%', url: '%author_url%', urlEnabled: true },
            button1: { enabled: true, text: 'Watch Video', url: '%url%' },
            button2: { enabled: true, text: 'View Channel', url: '%author_url%' },
            browsingActivities: {
                enabled: false,
                expanded: false,
                activities: {
                    homepage: { enabled: true, text: 'Browsing YouTube' },
                    channel: { enabled: true, text: 'Viewing %channel%\'s Channel' },
                    shorts: { enabled: true, text: 'Watching Shorts' },
                    search: { enabled: true, text: 'Searching for: %query%' },
                    subscriptions: { enabled: true, text: 'Checking Subscriptions' },
                    library: { enabled: true, text: 'Browsing Library' },
                    history: { enabled: true, text: 'Viewing Watch History' },
                    watchLater: { enabled: true, text: 'Browsing Watch Later' },
                    likedVideos: { enabled: true, text: 'Viewing Liked Videos' },
                    playlist: { enabled: true, text: 'Browsing Playlist: %playlist%' },
                    studio: { enabled: true, text: 'Managing Channel' }
                }
            }
        },
        youtubeMusic: {
            title: 'YouTube Music',
            icon: 'music-svg',
            editingMode: 'running',
            enabled: true,
            showPausedRpc: true,
            type: 'Listening',
            activityName: { enabled: false, name: 'YouTube Music' },
            details: { text: '%title%', url: '%url%', urlEnabled: true },
            state: { text: '%author%', url: '%author_url%', urlEnabled: true },
            showCurrentTime: true,
            showLength: true,
            largeImage: { enabled: true, text: '%title%', key: '%thumbnail%', url: '%url%', urlEnabled: true },
            smallImage: { enabled: true, text: '%author%', key: 'youtubemusic', url: '', urlEnabled: false },
            button1: { enabled: true, text: 'Listen Now', url: '%url%' },
            button2: { enabled: false, text: 'View Artist', url: '' },
            browsingActivities: {
                enabled: false,
                expanded: false,
                activities: {
                    homepage: { enabled: true, text: 'Browsing YouTube Music' },
                    explore: { enabled: true, text: 'Exploring Music' },
                    library: { enabled: true, text: 'Browsing Library' },
                    search: { enabled: true, text: 'Searching for: %query%' },
                    playlist: { enabled: true, text: 'Browsing Playlist: %playlist%' },
                    album: { enabled: true, text: 'Browsing Album: %playlist%' },
                    artist: { enabled: true, text: 'Viewing %channel%' },
                    channel: { enabled: true, text: 'Viewing %channel%' }
                }
            }
        },
        custom: {
            title: 'Custom Activity',
            icon: 'cpu',
            enabled: true,
            type: 'Playing',
            activityName: { enabled: false, name: 'CustomRPC' },
            details: { text: 'Custom Activity', url: '', urlEnabled: false },
            state: { text: 'Idle', url: '', urlEnabled: false },
            showCurrentTime: false,
            showLength: false,
            startTimestamp: Math.floor(Date.now() / 1000),
            endTimestamp: Math.floor(Date.now() / 1000) + 3600,
            largeImage: { enabled: true, text: 'App', key: 'large_key', url: '', urlEnabled: false },
            smallImage: { enabled: false, text: '', key: '', url: '', urlEnabled: false },
            button1: { enabled: false, text: '', url: '' },
            button2: { enabled: false, text: '', url: '' }
        }
    }
};

let internalWarningInterval = null;
let internalWarningHardTimeout = null;

const SVGS = {
    'youtube-svg': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" fill="#FF0000"/><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#fff"/></svg>`,
    'music-svg': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104z" fill="#FF0000"/><path d="M12 6.336c-3.132 0-5.664 2.532-5.664 5.664S8.868 17.664 12 17.664s5.664-2.532 5.664-5.664S15.132 6.336 12 6.336zm0 9.24c-1.968 0-3.576-1.608-3.576-3.576S10.032 8.424 12 8.424s3.576 1.608 3.576 3.576S13.968 15.576 12 15.576zm-1.44-5.28l4.08 1.704-4.08 1.704V10.296z" fill="#fff"/></svg>`,
    'cpu': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>`,
    'chevron-down': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    'image': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`,
    'mouse-pointer-2': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"></path><path d="M13 13l6 6"></path></svg>`,
    'link': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
    'type': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>`,
    'key': `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3y-3.5"></path></svg>`,
    'check': `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12" /></svg>`
};

function getByteLength(str) {
    return new Blob([str]).size;
}

function isValidUrl(str) {
    if (!str || str.trim() === '') return true; // Empty is valid (optional fields)
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

async function isImageUrl(url) {
    if (!url || url.trim() === '') return true;
    if (!isValidUrl(url)) return false;
    
    // Check common image extensions
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const urlLower = url.toLowerCase();
    if (imageExtensions.some(ext => urlLower.includes(ext))) return true;
    
    // For dynamic URLs (like YouTube thumbnails), try to fetch headers
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return contentType && contentType.startsWith('image/');
    } catch {
        return false; // Can't verify, assume invalid
    }
}

function validateField(value, minBytes, maxBytes, required = false) {
    if (!value || value.trim() === '') {
        return required ? { valid: false, error: `Required (${minBytes}-${maxBytes} bytes)` } : { valid: true };
    }
    const bytes = getByteLength(value);
    if (bytes < minBytes || bytes > maxBytes) {
        return { valid: false, error: `${bytes}/${maxBytes} bytes` };
    }
    return { valid: true };
}

function applyValidationStyle(input, validation) {
    if (!validation.valid) {
        input.style.borderColor = '#ef4444';
        input.style.boxShadow = '0 0 0 1px #ef4444';
        input.setAttribute('title', validation.error);
    } else {
        input.style.borderColor = '';
        input.style.boxShadow = '';
        input.removeAttribute('title');
    }
}

function render() {
    const rpcDot = document.getElementById('rpc-status-dot');
    const masterPower = document.getElementById('master-power');
    const statusInd = document.getElementById('status-indicator');
    const statusTxt = document.getElementById('status-text');
    const popupsInd = document.getElementById('popups-indicator');
    const popupsTxt = document.getElementById('popups-text');
    const mainContent = document.getElementById('main-content');
    const footerActions = document.getElementById('footer-actions');

    // Global RPC Master State
    if (state.rpcEnabled) {
        rpcDot.className = "status-dot active";
        masterPower.className = "btn-power on";
        statusInd.style.background = "var(--green-500)";
        statusInd.style.boxShadow = "0 0 8px var(--green-500)";
        statusTxt.innerText = "Activated";
        statusTxt.style.color = "white";
        mainContent.classList.remove('faded');
        footerActions.classList.remove('faded');
    } else {
        rpcDot.className = "status-dot inactive";
        masterPower.className = "btn-power off";
        statusInd.style.background = "#374151";
        statusInd.style.boxShadow = "none";
        statusTxt.innerText = "Disabled";
        statusTxt.style.color = "#4b5563";
        mainContent.classList.add('faded');
        footerActions.classList.add('faded');
    }

    // Global Popups State
    if (state.popupsEnabled) {
        popupsInd.style.background = "var(--indigo-500)";
        popupsInd.style.boxShadow = "0 0 8px var(--indigo-500)";
        popupsTxt.innerText = "Enabled";
        popupsTxt.style.color = "white";
    } else {
        popupsInd.style.background = "#374151";
        popupsInd.style.boxShadow = "none";
        popupsTxt.innerText = "Muted";
        popupsTxt.style.color = "#4b5563";
    }

    // Platform Render
    const container = document.getElementById('platforms-container');
    container.innerHTML = '';

    Object.entries(state.configs).forEach(([id, cfg]) => {
        const isExpanded = state.expandedSection === id;
        const iconContent = SVGS[cfg.icon] || SVGS['cpu'];

        const section = document.createElement('div');
        const isPaused = cfg.editingMode === 'paused';
        section.className = 'section';

        let flipFlopButton = '';
        if (id === 'youtube' || id === 'youtubeMusic') {
            const buttonText = isPaused ? 'Paused' : 'Running';
            const buttonStyle = isPaused 
                ? 'border: 1px solid #4b5563; color: #9ca3af; background: rgba(255,255,255,0.05);' 
                : 'border: 1px solid var(--green-500); color: var(--green-400); background: rgba(16, 185, 129, 0.1);';

            flipFlopButton = `
                <button data-id="${id}" class="btn-sub-action play-pause-toggle" style="${buttonStyle}">
                    ${buttonText}
                </button>
            `;
        }

        section.innerHTML = `
            <button data-id="${id}" class="section-toggle ${isExpanded ? 'expanded' : ''}">
                <div class="section-title">
                    ${iconContent}
                    <span>${cfg.title}</span>
                </div>
                <div class="chevron ${isExpanded ? 'rotate-180' : ''}">${SVGS['chevron-down']}</div>
            </button>
            <div class="section-content ${isExpanded ? 'expanded' : ''}">
            <div class="form-group">
                <div class="flex-between">
                    <label class="label-small" style="${cfg.enabled ? 'color:white; text-shadow:0 0 10px rgba(255,255,255,0.4);' : ''}">
                        Enable Configuration
                    </label>
                    ${flipFlopButton}
                    <label class="checkbox-container">
                        <input type="checkbox" class="config-enabled-toggle" data-id="${id}" ${cfg.enabled ? 'checked' : ''}>
                        <div class="checkbox-custom">${SVGS['check']}</div>
                    </label>
                </div>
            </div>

            <div class="divider"></div>

                <div class="config-fields ${!cfg.enabled ? 'faded' : ''}">
                    <div class="form-group">
                        <label class="label-small" style="display: flex; align-items: center;">Activity Type
                            <div class="tooltip-container" style="transform: translateY(2px);">
                              <svg class="activity-icon" data-label="ActivityType" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                              </svg>
                            </div>
                        </label>
                        <select data-id="${id}" class="type-select">
                            <option ${cfg.type === 'Playing' ? 'selected' : ''}>Playing</option>
                            <option ${cfg.type === 'Listening' ? 'selected' : ''}>Listening</option>
                            <option ${cfg.type === 'Watching' ? 'selected' : ''}>Watching</option>
                            <option ${cfg.type === 'Competing' ? 'selected' : ''}>Competing</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="label-small">Custom Activity Name</label>
                        <div style="display:flex; align-items:center; gap:8px; padding-left:4px;">
                            <label class="checkbox-container" style="width:14px; height:14px;">
                                <input type="checkbox" class="activity-name-toggle" data-id="${id}" ${cfg.activityName && cfg.activityName.enabled ? 'checked' : ''}>
                                <div class="checkbox-custom" style="border-radius:3px">${SVGS['check']}</div>
                            </label>
                            <input type="text" value="${cfg.activityName ? cfg.activityName.name : (id === 'youtube' ? 'YouTube' : id === 'youtubeMusic' ? 'YouTube Music' : 'CustomRPC')}" 
                                   class="activity-name-input" data-id="${id}" 
                                   ${!(cfg.activityName && cfg.activityName.enabled) ? 'disabled' : ''}>
                        </div>
                    </div>

                    ${renderFieldWithUrl(id, 'details', 'Details', cfg.details)}
                    ${renderFieldWithUrl(id, 'state', 'State', cfg.state)}

                    <div class="divider"></div>

                    ${id === 'custom' ? renderCustomTimeInputs(cfg) : renderVideoTimeline(cfg)}

                    ${(id === 'youtube' || id === 'youtubeMusic') ? `
                        <div class="form-group" style="margin-bottom:12px;">
                            <span class="label-small">General Settings</span>
                            <div class="setting-option" title="When disabled, pausing clears presence instead of showing the paused configuration.">
                                <label class="checkbox-container">
                                    <input type="checkbox" class="show-paused-rpc-toggle" data-id="${id}" ${cfg.showPausedRpc ? 'checked' : ''}>
                                    <div class="checkbox-custom">${SVGS['check']}</div>
                                </label>
                                <span class="setting-option-text">Show RPC while paused</span>
                            </div>
                        </div>
                    ` : ''}

                    ${id === 'youtube' ? `${renderBrowsingActivities(cfg)}` : ''}

                    ${id === 'youtubeMusic' ? `${renderBrowsingActivities(cfg)}` : ''}

                    <div class="divider"></div>
                    <div class="form-group" style="text-align:center">
                        <div style="display:flex; align-items:center; justify-content:center; gap:4px; margin-bottom:12px;">
                            ${SVGS['image']}
                            <span class="label-small" style="margin:0">Image Fields</span>
                            <div class="tooltip-container">
                            <svg class="info-icon" data-label="ImageFieldsInfo" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            </div>
                        </div>
                        ${renderConfigRow(id, 'largeImage', 'BIG', cfg.largeImage, true)}
                        ${renderConfigRow(id, 'smallImage', 'SML', cfg.smallImage, true)}
                    </div>

                    <div class="divider"></div>
                    <div class="form-group" style="text-align:center">
                        <div style="display:flex; align-items:center; justify-content:center; gap:4px; margin-bottom:12px;">
                            ${SVGS['mouse-pointer-2']}
                            <span class="label-small" style="margin:0">Button Fields</span>
                            <div class="tooltip-container">
                            <svg class="info-icon" data-label="ButtonFieldsInfo" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            </div>
                        </div>
                        ${renderConfigRow(id, 'button1', 'B1', cfg.button1, false)}
                        ${renderConfigRow(id, 'button2', 'B2', cfg.button2, false)}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(section);
    });

    const alertPopup = `
        <div class="alert-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="alert-icon">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p class="alert-text">
                Remember you can't see Buttons from your own Account anymore.
            </p>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', alertPopup);

    if (state.editingBrowsingActivity) {
        const activeSection = state.expandedSection;
        const activeCfg = activeSection ? state.configs[activeSection] : null;
        if (!activeCfg || !activeCfg.browsingActivities) {
            state.editingBrowsingActivity = null;
            render();
            return;
        }

        const activityKey = state.editingBrowsingActivity;
        const activity = activeCfg.browsingActivities.activities[activityKey];

        const activityLabels = activeSection === 'youtubeMusic'
            ? {
                homepage: 'Homepage',
                explore: 'Explore',
                library: 'Library',
                search: 'Search',
                playlist: 'Playlist',
                album: 'Album',
                artist: 'Artist',
                channel: 'Channel'
            }
            : {
                homepage: 'Homepage',
                channel: 'Channel Page',
                shorts: 'Shorts',
                search: 'Search',
                subscriptions: 'Subscriptions',
                library: 'Library',
                history: 'History',
                watchLater: 'Watch Later',
                likedVideos: 'Liked Videos',
                playlist: 'Playlist',
                studio: 'Studio'
            };

        const modalHtml = `
            <div class="modal-overlay" id="browsing-edit-modal-overlay">
                <div class="modal-container">
                    <div class="modal-header">
                        <h3 class="modal-title">${activityLabels[activityKey]}</h3>
                        <button class="modal-close-btn" id="modal-close-btn" type="button" title="Close">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <label class="modal-label">Custom State</label>
                        <input type="text" id="browsing-modal-input" class="modal-input" value="${activity.text}" placeholder="Enter custom state for this activity...">
                        <p class="modal-helper-text">This text will appear as the State in Discord when browsing this page.</p>
                    </div>

                    <div class="modal-footer">
                        <button class="modal-btn-cancel" id="modal-cancel-btn" type="button">Cancel</button>
                        <button class="modal-btn-save" id="modal-save-btn" type="button">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        requestAnimationFrame(() => {
            const handleClose = () => {
                const modalOverlay = document.getElementById('browsing-edit-modal-overlay');
                if (modalOverlay) {
                    modalOverlay.remove();
                }
                state.editingBrowsingActivity = null;
                render();
            };

            const handleSave = () => {
                const input = document.getElementById('browsing-modal-input');
                const key = state.editingBrowsingActivity;
                
                if (input && input.value.trim() !== '') {
                    state.configs[activeSection].browsingActivities.activities[key].text = input.value.trim();
                    setStorageData(`browsingActivities.activities.${key}.text`, input.value.trim());
                }
                
                const modalOverlay = document.getElementById('browsing-edit-modal-overlay');
                if (modalOverlay) {
                    modalOverlay.remove();
                }
                state.editingBrowsingActivity = null;
                render();
            };

            const modalSaveBtn = document.getElementById('modal-save-btn');
            const modalCancelBtn = document.getElementById('modal-cancel-btn');
            const modalCloseBtn = document.getElementById('modal-close-btn');
            const modalOverlay = document.getElementById('browsing-edit-modal-overlay');
            const modalInput = document.getElementById('browsing-modal-input');

            if (modalSaveBtn) {
                modalSaveBtn.addEventListener('click', handleSave);
            }
            if (modalCancelBtn) {
                modalCancelBtn.addEventListener('click', handleClose);
            }
            if (modalCloseBtn) {
                modalCloseBtn.addEventListener('click', handleClose);
            }
            if (modalOverlay) {
                modalOverlay.addEventListener('click', (e) => {
                    if (e.target === modalOverlay) {
                        handleClose();
                    }
                });
            }
            if (modalInput) {
                modalInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') {
                        handleClose();
                    } else if (e.key === 'Enter') {
                        handleSave();
                    }
                });
                setTimeout(() => {
                    modalInput.focus();
                    modalInput.select();
                }, 50);
            }
        });
    }

    attachListeners();
}

function renderBrowsingActivities(cfg) {
    if (!cfg.browsingActivities) return '';
    
    const ba = cfg.browsingActivities;

    const isMusic = state.expandedSection === 'youtubeMusic';
    const activityLabels = isMusic
        ? {
            homepage: 'Homepage',
            explore: 'Explore',
            library: 'Library',
            search: 'Search',
            playlist: 'Playlist',
            album: 'Album',
            artist: 'Artist',
            channel: 'Channel'
        }
        : {
            homepage: 'Homepage',
            channel: 'Channel Page',
            shorts: 'Shorts',
            search: 'Search',
            subscriptions: 'Subscriptions',
            library: 'Library',
            history: 'History',
            watchLater: 'Watch Later',
            likedVideos: 'Liked Videos',
            playlist: 'Playlist',
            studio: 'Studio'
        };

    const labelForKey = (key) => {
        if (activityLabels[key]) return activityLabels[key];
        return String(key)
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]+/g, ' ')
            .replace(/^\w/, c => c.toUpperCase())
            .trim();
    };
    
    let activitiesHtml = '';
    if (ba.expanded) {
        activitiesHtml = `
            <div class="browsing-grid">
                ${Object.entries(ba.activities).map(([key, activity]) => `
                    <div class="browsing-item">
                        <label class="checkbox-container" style="width:12px; height:12px;">
                            <input type="checkbox" class="browsing-activity-toggle" data-key="${key}" ${activity.enabled ? 'checked' : ''}>
                            <div class="checkbox-custom" style="border-radius:2px">${SVGS['check']}</div>
                        </label>
                        <span class="browsing-label">${labelForKey(key)}</span>
                        <button class="browsing-edit-btn" data-key="${key}" title="Edit text">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    return `
        <div class="form-group browsing-section">
            <div class="flex-between" style="margin-bottom: ${ba.expanded ? '12px' : '0'};">
                <label class="label-small" style="${ba.enabled ? 'color:white; text-shadow:0 0 10px rgba(255,255,255,0.4);' : ''}">
                    Browsing Activities
                </label>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="browsing-expand-btn" title="${ba.expanded ? 'Collapse' : 'Expand'}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron ${ba.expanded ? 'rotate-180' : ''}">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <label class="checkbox-container" style="width:14px; height:14px;">
                        <input type="checkbox" class="browsing-enabled-toggle" ${ba.enabled ? 'checked' : ''}>
                        <div class="checkbox-custom" style="border-radius:3px">${SVGS['check']}</div>
                    </label>
                </div>
            </div>
            ${activitiesHtml}
        </div>
    `;
}

function renderFieldWithUrl(platformId, fieldKey, label, fieldCfg) {
    const isUrlDisabled = !fieldCfg.urlEnabled;
    const warningSvg = `<svg class="warning-icon" data-label="AuthorURLWarning" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    
    let textWarningIcon = '';
    if (platformId === 'youtube' && fieldCfg.text.includes('%author_url%')) {
        textWarningIcon = `<div class="tooltip-container">${warningSvg}</div>`;
    }

    let urlWarningIcon = '';
    if (platformId === 'youtube' && fieldCfg.url.includes('%author_url%')) {
        urlWarningIcon = `<div class="tooltip-container">${warningSvg}</div>`;
    }

    const infoIcon = `
        <div class="tooltip-container">
          <svg class="info-icon" data-label="${label}" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
    `;

    return `
        <div class="form-group">
            <label class="label-small">${label} ${infoIcon}</label>
            <div class="input-field-wrapper" style="margin-bottom:8px;">
                <input type="text" value="${fieldCfg.text}" data-id="${platformId}" data-parent="${fieldKey}" data-child="text" id="${platformId}-${fieldKey}-text" class="nested-input" style="padding-right: ${textWarningIcon ? '28px' : '8px'};">
                ${textWarningIcon}
            </div>
            <div style="display:flex; align-items:center; gap:8px; padding-left:4px;">
                <label class="checkbox-container" style="width:14px; height:14px;">
                    <input type="checkbox" class="nested-checkbox" data-id="${platformId}" data-parent="${fieldKey}" data-child="urlEnabled" id="${platformId}-${fieldKey}-urlEnabled" ${fieldCfg.urlEnabled ? 'checked' : ''}>
                    <div class="checkbox-custom" style="border-radius:3px">${SVGS['check']}</div>
                </label>
                <div class="input-with-icon ${isUrlDisabled ? 'faded' : ''}" style="flex:1; padding:2px 6px; background:rgba(0,0,0,0.2)">
                    ${SVGS['link']}
                    <div class="input-field-wrapper">
                        <input type="text" value="${fieldCfg.url}" data-id="${platformId}" data-parent="${fieldKey}" data-child="url" id="${platformId}-${fieldKey}-url" class="nested-input" style="color:rgba(165,180,252,0.8); font-size:9px; padding-right: ${urlWarningIcon ? '20px' : '0'};" ${isUrlDisabled ? 'disabled' : ''}>
                        ${urlWarningIcon}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderVideoTimeline(cfg) {
    return `
        <div class="form-group">
            <span class="label-small">Video Timeline</span>

            <div class="timeline-option">
                <label class="checkbox-container">
                    <input type="checkbox" class="timeline-checkbox start" ${cfg.showCurrentTime ? 'checked' : ''}>
                    <div class="checkbox-custom">${SVGS['check']}</div>
                </label>
                <span class="timeline-text">
                    Show current time of the video
                </span>
            </div>

            <div class="timeline-option">
                <label class="checkbox-container">
                    <input type="checkbox" class="timeline-checkbox end" ${cfg.showLength ? 'checked' : ''}>
                    <div class="checkbox-custom">${SVGS['check']}</div>
                </label>
                <span class="timeline-text">
                    Show length of the video
                </span>
            </div>
        </div>
    `;
}

function renderCustomTimeInputs(cfg) {
    const now = Math.floor(Date.now() / 1000);
    const endTime = cfg.endTimestamp || (now + 3600); // Default 1 hour from now
    
    return `
        <div class="form-group">
            <span class="label-small">End Time (Unix Epoch)</span>
            
            <div style="margin-top:8px;">
                <label class="checkbox-container" style="width:14px; height:14px; display:inline-block; vertical-align:middle;">
                    <input type="checkbox" class="custom-timestamp-toggle" data-type="end" ${cfg.showLength ? 'checked' : ''}>
                    <div class="checkbox-custom" style="border-radius:3px">${SVGS['check']}</div>
                </label>
                <span style="font-size:10px; color:#9ca3af; margin-left:8px; margin-right:8px;">Show Duration</span>
                <input type="number" class="custom-timestamp-input" data-type="end" value="${endTime}" 
                       style="width:140px; padding:4px 8px; font-size:10px; background:rgba(255,255,255,0.05); border:1px solid #374151; border-radius:4px; color:white; ${!cfg.showLength ? 'opacity:0.5; cursor:not-allowed;' : ''}" 
                       ${!cfg.showLength ? 'disabled' : ''}>
            </div>
            
            <div style="font-size:9px; color:#6b7280; margin-top:6px; padding-left:22px;">
                Tip: Use <a href="https://www.unixtimestamp.com/" target="_blank" style="color:#818cf8;">unixtimestamp.com</a> to convert dates
            </div>
        </div>
    `;
}

function renderConfigRow(platformId, fieldKey, label, fieldCfg, isAsset) {
    const isFaded = !fieldCfg.enabled;
    const secondInputKey = isAsset ? 'key' : 'url';
    const secondIcon = isAsset ? SVGS['key'] : SVGS['link'];
    const warningSvg = `<svg class="warning-icon" data-label="AuthorURLWarning" xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    
    let textWarningIcon = '';
    if (platformId === 'youtube' && fieldCfg.text.includes('%author_url%')) {
        textWarningIcon = `<div class="tooltip-container">${warningSvg}</div>`;
    }

    let secondInputWarningIcon = '';
    if (platformId === 'youtube' && (isAsset ? fieldCfg.key : fieldCfg.url).includes('%author_url%')) {
        secondInputWarningIcon = `<div class="tooltip-container">${warningSvg}</div>`;
    }

    let urlWarningIcon = '';
    if (platformId === 'youtube' && fieldCfg.url && fieldCfg.url.includes('%author_url%')) {
        urlWarningIcon = `<div class="tooltip-container">${warningSvg}</div>`;
    }

    return `
        <div class="nested-row">
            <div class="nested-label-col">
                <span class="nested-label-text">${label}</span>
                <label class="checkbox-container" style="width:14px; height:14px;">
                    <input type="checkbox" class="nested-checkbox" data-id="${platformId}" data-parent="${fieldKey}" data-child="enabled" ${fieldCfg.enabled ? 'checked' : ''}>
                    <div class="checkbox-custom" style="border-radius:3px">${SVGS['check']}</div>
                </label>
            </div>
            <div class="nested-inputs-col ${isFaded ? 'faded' : ''}">
                <div class="input-with-icon">
                    ${SVGS['type']}
                    <div class="input-field-wrapper">
                        <input type="text" value="${fieldCfg.text}" data-id="${platformId}" data-parent="${fieldKey}" data-child="text" id="${platformId}-${fieldKey}-text" class="nested-input" ${isFaded ? 'disabled' : ''} style="padding-right: ${textWarningIcon ? '20px' : '0'};">
                        ${textWarningIcon}
                    </div>
                </div>
                <div class="input-with-icon">
                    ${secondIcon}
                    <div class="input-field-wrapper">
                        <input type="text" value="${isAsset ? fieldCfg.key : fieldCfg.url}" data-id="${platformId}" data-parent="${fieldKey}" data-child="${secondInputKey}" id="${platformId}-${fieldKey}-${secondInputKey}" class="nested-input" style="color:rgba(165,180,252,0.8); padding-right: ${secondInputWarningIcon ? '20px' : '0'};" ${isFaded ? 'disabled' : ''}>
                        ${secondInputWarningIcon}
                    </div>
                </div>
                ${isAsset ? `
                    <div style="display:flex; align-items:center; gap:8px; padding-left:4px; margin-top:2px;">
                        <label class="checkbox-container" style="width:12px; height:12px;">
                            <input type="checkbox" class="nested-checkbox" data-id="${platformId}" data-parent="${fieldKey}" data-child="urlEnabled" id="${platformId}-${fieldKey}-urlEnabled" ${fieldCfg.urlEnabled ? 'checked' : ''}>
                            <div class="checkbox-custom" style="border-radius:2px">${SVGS['check']}</div>
                        </label>
                        <div class="input-with-icon ${!fieldCfg.urlEnabled ? 'faded' : ''}" style="flex:1; padding:0 6px; background:rgba(0,0,0,0.2)">
                            ${SVGS['link']}
                            <div class="input-field-wrapper">
                                <input type="text" value="${fieldCfg.url}" data-id="${platformId}" data-parent="${fieldKey}" data-child="url" id="${platformId}-${fieldKey}-url" class="nested-input" style="font-size:8px; padding-right: ${urlWarningIcon ? '20px' : '0'};" ${!fieldCfg.urlEnabled ? 'disabled' : ''}>
                                ${urlWarningIcon}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}


function hideTooltip() {
    const existingTooltip = document.querySelector('.tooltip-box');
    if (existingTooltip) {
        existingTooltip.remove();
    }
}

function showTooltip(icon) {
    hideTooltip();

    const label = icon.getAttribute('data-label');
    if (!label) return;

    const isCustomRPC = state.expandedSection === 'custom';
    const isYoutubeMusic = state.expandedSection === 'youtubeMusic';

    let tooltipContentHtml = '';
    if (label === 'Details') {
        tooltipContentHtml += `
            <div class="tooltip-header">Details</div>
            <p class="tooltip-text">This is the title that is shown. If you use Listening or Competing, it will show it also in little less fat text below the state.<br><br>The url below is the link you will head to when you press on the details on the RPC in Discord.</p>
            <div class="tooltip-divider"></div>
        `;
    } else if (label === 'State') {
        tooltipContentHtml += `
            <div class="tooltip-header">State</div>
            <p class="tooltip-text">This is the description that is shown. It is the smaller text below the title.<br><br>The url below is the link you will head to when you press on the state on the RPC in Discord.</p>
            <div class="tooltip-divider"></div>
        `;
    } else if (label === 'ActivityType') {
        tooltipContentHtml += `
            <div class="tooltip-header">Activity Type</div>
            <p class="tooltip-text">If you select Playing, it will be hidden if another application with a "Playing" status is also running.<br><br>The others will always show.</p>
            <div class="tooltip-divider"></div>
        `;
    } else if (label === 'AuthorURLWarning') {
        tooltipContentHtml += `
            <div class="tooltip-header">Potential Issue</div>
            <p class="tooltip-text">'%author_url%' will be empty if the Video has multiple Channels.. There's no way to get around this currently.<br><br>If this happens, it will just leave it blank.</p>
            <div class="tooltip-divider"></div>
        `;
    } else if (label === 'ImageFieldsInfo') {
    tooltipContentHtml += `
        <div class="tooltip-header">Image Fields</div>
        <p class="tooltip-text">These are the images that are shown. The text is the text that will appear when you hover over it.<br><br>The url below is the link you will head to when you press on the respective image on the RPC in Discord.<br><br>BIG = large image, SML = small image.</p>
        <div class="tooltip-divider"></div>
    `;
    }
    else if (label === 'ButtonFieldsInfo') {
        tooltipContentHtml += `
            <div class="tooltip-header">Button Fields</div>
            <p class="tooltip-text">These are the buttons that redirect you to the url you specify. The text is the text that will be shown on the Buttons.<br><br>The url below is the link you will head to when you press on the respective button on the RPC in Discord.</p>
            <div class="tooltip-divider"></div>
        `;
    }

    if (!isCustomRPC) {
        tooltipContentHtml += `
            <div class="tooltip-header">Dynamic Tags</div>
            <div class="tags-container">
              <span class="tag-pill">%title%</span>
              <span class="tag-pill">%thumbnail%</span>
              <span class="tag-pill">%url%</span>
              <span class="tag-pill">%author%</span>
              ${isYoutubeMusic ? '' : '<span class="tag-pill">%author_avatar%</span>'}
              ${isYoutubeMusic ? '' : '<span class="tag-pill">%author_url%</span>'}
            </div>
        `;
    }

    // Okay. I know this looks a bit janky, but let me explain:
    // Hidden tooltips can't be measured, so we had to make them visible off-screen,
    // and once they were in the DOM we could make the measurements and calculations.
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-box';
    tooltip.innerHTML = tooltipContentHtml;
    document.body.appendChild(tooltip);

    tooltip.style.position = 'absolute';
    tooltip.style.left = '-9999px';
    tooltip.style.top = '-9999px';
    tooltip.style.display = 'block';

    const iconRect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const padding = 10;
    const popupWidth = document.body.clientWidth; // 360px

    let top = iconRect.top + (iconRect.height / 2) - (tooltipRect.height / 2);
    let left = iconRect.right + padding; // default right

    // Flip to left if overflowing popup
    if (left + tooltipRect.width > popupWidth) {
        left = iconRect.left - tooltipRect.width - padding;
    }

    // Vertical clamping
    if (top < padding) top = padding;
    if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
    }

    // Left clamp
    if (left < padding) left = padding;

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = '';
    
    setTimeout(() => {
        tooltip.classList.add('visible');
    }, 10);
}

function attachListeners() {
    // Section toggles
    document.querySelectorAll('.section-toggle').forEach(btn => {
        btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const section = btn.parentElement;
            const scrollContainer = document.querySelector('.custom-scrollbar');
            
            if (state.expandedSection === id) {
                // Closing current section
                section.classList.add('collapsing');
                section.classList.remove('expanding');
                setTimeout(() => {
                    state.expandedSection = null;
                    render();
                    // Scroll to the header area of the section that was closed
                    setTimeout(() => {
                        const closedSection = document.querySelector(`[data-id="${id}"]`);
                        if (closedSection) {
                            closedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 50);
                }, 250);
            } else {
                // Opening a new section (close old one first if exists)
                if (state.expandedSection) {
                    const oldSection = document.querySelector(`[data-id="${state.expandedSection}"]`);
                    if (oldSection) {
                        const oldParent = oldSection.parentElement;
                        oldParent.classList.add('collapsing');
                        oldParent.classList.remove('expanding');
                    }
                }
                
                state.expandedSection = id;
                render();
                
                // Trigger animation and scroll after DOM is updated
                requestAnimationFrame(() => {
                    const newSection = document.querySelector(`[data-id="${id}"]`).parentElement;
                    newSection.classList.add('expanding');
                    newSection.classList.remove('collapsing');
                    
                    // Smooth scroll to the newly opened section
                    setTimeout(() => {
                        newSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                });
            }
        };
    });

    document.querySelectorAll('.config-enabled-toggle').forEach(input => {
        input.onchange = async (e) => {
            const id = input.getAttribute('data-id');
            const checked = e.target.checked;

            state.configs[id].enabled = checked;
            
            // For YouTube and YouTube Music, sync enabled state with both running and paused modes
            if (id === 'youtube' || id === 'youtubeMusic') {
                const storageKey = id === 'youtube' ? 'rpcYoutube' : 'rpcYoutubeMusic';
                const stored = await browser.storage.local.get(storageKey);
                const root = stored[storageKey];
                if (root) {
                    if (!root.running) root.running = {};
                    if (!root.paused) root.paused = {};
                    root.running.enabled = checked;
                    root.paused.enabled = checked;
                    await browser.storage.local.set({ [storageKey]: root });
                }
            } else {
                setStorageData("enabled", checked);
            }

            if (state.rpcEnabled) {
                if (id === 'custom') {
                    // Custom RPC: broadcast immediately with current settings
                    browser.runtime.sendMessage({ 
                        action: "TRIGGER_CUSTOM_RPC",
                        enabled: checked
                    });
                } else {
                    // YouTube/Music: sync with active tabs
                    browser.runtime.sendMessage({ 
                        action: "TRIGGER_SYNC", 
                        enabled: checked,
                        platform: id
                    });
                }
            }

            render();
        };
    });

    document.querySelectorAll('.type-select').forEach(select => {
        select.onchange = (e) => {
            const typeMap = { 'Playing': 0, 'Listening': 2, 'Watching': 3, 'Competing': 5 };
            const id = e.target.getAttribute('data-id');
            state.configs[id].type = e.target.value;
            
            setStorageData("type", typeMap[state.configs[id].type]);
            render();
        };
    });

    document.querySelectorAll('.activity-name-toggle').forEach(checkbox => {
        checkbox.onchange = (e) => {
            const id = e.target.getAttribute('data-id');
            state.configs[id].activityName.enabled = e.target.checked;
            
            setStorageData("special.custom_name", e.target.checked);
            render();
        };
    });

    document.querySelectorAll('.activity-name-input').forEach(input => {
        let activityNameTimer;
        input.oninput = (e) => {
            const id = e.target.getAttribute('data-id');
            const value = e.target.value;
            state.configs[id].activityName.name = value;
            
            clearTimeout(activityNameTimer);
            activityNameTimer = setTimeout(() => {
                const validation = validateField(value, 2, 128, state.configs[id].activityName.enabled);
                applyValidationStyle(e.target, validation);
                
                if (validation.valid) {
                    setStorageData("name", value);
                }
            }, 500);
        };
    });

    // Previously, I was using one global timer. But then if you changed another textbox it
    // just didn't get through because of clearTimeout.
    let typingTimers = {};
    const typingDelay = 500;
    document.querySelectorAll('.nested-input').forEach(input => {
        input.oninput = (e) => {
            const id = e.target.getAttribute('data-id');
            const parent = e.target.getAttribute('data-parent');
            const child = e.target.getAttribute('data-child');
            const currentVal = e.target.value;
            const timerKey = `${id}-${parent}-${child}`;

            state.configs[id][parent][child] = currentVal;
            
            clearTimeout(typingTimers[timerKey]);

            typingTimers[timerKey] = setTimeout(async () => {
                let validation = { valid: true };
                const config = state.configs[id][parent];
                const isEnabled = config.enabled !== undefined ? config.enabled : true;
                
                if (child === "text") {
                    // Details and State are always required (2-128 bytes)
                    if (parent === "details" || parent === "state") {
                        validation = validateField(currentVal, 2, 128, true);
                    }
                    // Image/Button labels required only if enabled (2-128 bytes)
                    else if (parent === "largeImage" || parent === "smallImage" || parent === "button1" || parent === "button2") {
                        validation = validateField(currentVal, 2, 128, isEnabled);
                    }
                }
                else if (child === "key") {
                    // Image keys (URLs to images) - validate as image URL (up to 512 bytes)
                    if (currentVal && currentVal.trim() !== '') {
                        validation = validateField(currentVal, 0, 512, false);
                        if (validation.valid && !isValidUrl(currentVal)) {
                            validation = { valid: false, error: 'Invalid URL format' };
                        }
                        if (validation.valid) {
                            const isImage = await isImageUrl(currentVal);
                            if (!isImage) {
                                validation = { valid: false, error: 'URL must point to an image' };
                            }
                        }
                    }
                }
                else if (child === "url") {
                    // URL validation
                    if (currentVal && currentVal.trim() !== '') {
                        let maxBytes = 512; // Default for button/image URLs
                        if (parent === "details" || parent === "state") {
                            maxBytes = 256; // Details/State URLs limited to 256
                        }
                        validation = validateField(currentVal, 0, maxBytes, false);
                        if (validation.valid && !isValidUrl(currentVal)) {
                            validation = { valid: false, error: 'Invalid URL format' };
                        }
                    }
                }
            
                applyValidationStyle(e.target, validation);
                
                if (!validation.valid) {
                    delete typingTimers[timerKey];
                    return;
                }
                
                const activeEl = document.activeElement;
                const selectionStart = activeEl ? activeEl.selectionStart : null;
                const selectionEnd = activeEl ? activeEl.selectionEnd : null;

                if (child === "text") {
                    if (parent === "largeImage") {
                        setStorageData("assets.large.large_text", currentVal);
                    } else if (parent === "smallImage") {
                        setStorageData("assets.small.small_text", currentVal);
                    } else if (parent === "button1") {
                        setStorageData("buttons.1.label", currentVal);
                    } else if (parent === "button2") {
                        setStorageData("buttons.2.label", currentVal);
                    } else {
                        setStorageData(parent, currentVal);
                    }
                } 
                else if (child === "key") {
                    if (parent === "largeImage") setStorageData("assets.large.large_image", currentVal);
                    else if (parent === "smallImage") setStorageData("assets.small.small_image", currentVal);
                }
                else if (child === "url") {
                    if (parent === "state") setStorageData("special.state_url.url", currentVal);
                    else if (parent === "details") setStorageData("special.details_url.url", currentVal);
                    else if (parent === "largeImage") setStorageData("special.large_image_url.url", currentVal);
                    else if (parent === "smallImage") setStorageData("special.small_image_url.url", currentVal);
                    else if (parent === "button1") setStorageData("buttons.1.url", currentVal);
                    else if (parent === "button2") setStorageData("buttons.2.url", currentVal);
                }
                
                render();

                const selector = `.nested-input[data-id="${id}"][data-parent="${parent}"][data-child="${child}"]`;
                const inputToFocus = document.querySelector(selector);
                
                if (inputToFocus) {
                    inputToFocus.focus();
                    if (selectionStart !== null) {
                        inputToFocus.setSelectionRange(selectionStart, selectionEnd);
                    }
                }

                delete typingTimers[timerKey];
            }, typingDelay);
        };
    });

    // Checkmark btns for: urldetails, urlstate, big/sml img, 1/2 btn
    document.querySelectorAll('.nested-checkbox').forEach(input => {
        input.onchange = (e) => {
            const id = input.getAttribute('data-id');
            const parent = input.getAttribute('data-parent');
            const child = input.getAttribute('data-child');
            let path;
            state.configs[id][parent][child] = e.target.checked; 

            if (child === "urlEnabled") {
                if (parent === "state") {
                    path = `special.state_url.enabled`;
                } else if (parent === "details") {
                    path = `special.details_url.enabled`;
                } else if (parent === "largeImage") {
                    path = `special.large_image_url.enabled`;
                } else if (parent === "smallImage") {
                    path = `special.small_image_url.enabled`;
                }
            } else {
                if (parent === "largeImage") {
                    path = `assets.large.enabled`;
                } else if (parent === "smallImage") {
                    path = `assets.small.enabled`;
                
                } else if (parent === "button1") {
                    path = `buttons.1.enabled`;
                } else if (parent === "button2") {
                    path = `buttons.2.enabled`;
                }
            }

            setStorageData(path, e.target.checked);
            render();
        };
    });

    document.querySelectorAll('.info-icon, .activity-icon, .warning-icon').forEach(icon => {
        icon.addEventListener('mouseenter', (e) => showTooltip(e.target));
        icon.addEventListener('mouseleave', hideTooltip);
    });

    document.querySelectorAll('.play-pause-toggle').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation(); 
            const id = btn.getAttribute('data-id');

            if (id !== 'youtube' && id !== 'youtubeMusic') return;

            const sectionKey = id;
            const storageKey = id === 'youtube' ? 'rpcYoutube' : 'rpcYoutubeMusic';

            const currentMode = state.configs[sectionKey].editingMode;
            const newMode = (currentMode === 'paused') ? 'running' : 'paused';

            state.configs[sectionKey].editingMode = newMode;

            const stored = await browser.storage.local.get(storageKey);
            const storedCfg = stored[storageKey];

            if (storedCfg && storedCfg[newMode]) {
                mapStorageToState(storedCfg[newMode], state.configs[sectionKey]);

                const browsingCfg = storedCfg.browsingActivities
                    || storedCfg.paused?.browsingActivities
                    || storedCfg.running?.browsingActivities;
                if (browsingCfg) {
                    mapStorageToState({ browsingActivities: browsingCfg }, state.configs[sectionKey]);
                }

                if (storedCfg.showPausedRpc !== undefined) {
                    state.configs[sectionKey].showPausedRpc = storedCfg.showPausedRpc;
                }
            } else {
                console.warn(`No data found in storage for ${id} ${newMode} mode.`);
            }

            render();
        };
    });

    // Browsing Activities Toggle
    document.querySelectorAll('.browsing-enabled-toggle').forEach(checkbox => {
        checkbox.onchange = (e) => {
            const id = state.expandedSection;
            if (!id) return;
            state.configs[id].browsingActivities.enabled = e.target.checked;
            setStorageData("browsingActivities.enabled", e.target.checked);
            render();
        };
    });

    // Browsing Activities Expand Button
    document.querySelectorAll('.browsing-expand-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const id = state.expandedSection;
            if (!id) return;
            state.configs[id].browsingActivities.expanded = !state.configs[id].browsingActivities.expanded;
            render();
        };
    });

    // Individual Browsing Activity Toggles
    document.querySelectorAll('.browsing-activity-toggle').forEach(checkbox => {
        checkbox.onchange = (e) => {
            const key = e.target.getAttribute('data-key');
            const checked = e.target.checked;
            const id = state.expandedSection;
            if (!id) return;

            if (!checked) {
                const enabledCount = Object.values(state.configs[id].browsingActivities.activities)
                    .filter(a => a && a.enabled).length;
                if (enabledCount <= 1) {
                    e.target.checked = true;
                    return;
                }
            }

            state.configs[id].browsingActivities.activities[key].enabled = checked;
            setStorageData(`browsingActivities.activities.${key}.enabled`, checked);
            render();
        };
    });

    // Browsing Activity Edit Buttons
    document.querySelectorAll('.browsing-edit-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const key = btn.getAttribute('data-key');
            state.editingBrowsingActivity = key;
            const id = state.expandedSection;
            if (!id) return;
            
            state.configs[id].browsingActivities.enabled = true;
            setStorageData("browsingActivities.enabled", true);
            
            render();
        };
    });

    // Show Paused RPC toggle (YouTube + YouTube Music)
    document.querySelectorAll('.show-paused-rpc-toggle').forEach(checkbox => {
        checkbox.onchange = (e) => {
            const id = checkbox.getAttribute('data-id') || state.expandedSection;
            if (!id) return;
            state.configs[id].showPausedRpc = e.target.checked;
            setStorageData('showPausedRpc', e.target.checked);

            if (state.rpcEnabled && state.configs[id].enabled) {
                browser.runtime.sendMessage({
                    action: "TRIGGER_SYNC",
                    enabled: true,
                    platform: id
                });
            }

            render();
        };
    });

    // Video Timeline
    document.querySelectorAll('.timeline-option input').forEach(checkbox => {
    checkbox.onchange = (e) => {
        const id = state.expandedSection;
        const isCurrentTime = e.target.parentElement.nextElementSibling.innerText.includes('current time');
        
        if (isCurrentTime) {
            state.configs[id].showCurrentTime = e.target.checked;
            setStorageData("timestamps.start", e.target.checked);
        } else {
            state.configs[id].showLength = e.target.checked;
            setStorageData("timestamps.end", e.target.checked);
        }
        render();
    };
});

    // Custom RPC timestamp toggles
    document.querySelectorAll('.custom-timestamp-toggle').forEach(checkbox => {
        checkbox.onchange = (e) => {
            const type = e.target.getAttribute('data-type');
            const id = state.expandedSection;
            
            if (type === 'end') {
                state.configs[id].showLength = e.target.checked;
                const input = document.querySelector('.custom-timestamp-input[data-type="end"]');
                if (input) {
                    const timestamp = parseInt(input.value) || Math.floor(Date.now() / 1000) + 3600;
                    // Always set start to current time
                    setStorageData("timestamps.start", Math.floor(Date.now() / 1000));
                    setStorageData("timestamps.end", e.target.checked ? timestamp : false);
                }
            }
            
            render();
        };
    });

    // Custom RPC timestamp inputs
    document.querySelectorAll('.custom-timestamp-input').forEach(input => {
        input.oninput = (e) => {
            const type = e.target.getAttribute('data-type');
            const timestamp = parseInt(e.target.value) || Math.floor(Date.now() / 1000);
            const id = state.expandedSection;
            
            if (type === 'end') {
                state.configs[id].endTimestamp = timestamp;
                if (state.configs[id].showLength) {
                    setStorageData("timestamps.end", timestamp);
                }
            }
        };
    });
}

document.getElementById('master-power').onclick = async () => {
    state.rpcEnabled = !state.rpcEnabled;
    await browser.storage.local.set({ rpcEnabled: state.rpcEnabled });
    
    browser.runtime.sendMessage({ 
        action: "TRIGGER_SYNC", 
        enabled: state.rpcEnabled 
    });
    
    render();
};

document.getElementById('toggle-status').onclick = async () => {
    state.rpcEnabled = !state.rpcEnabled;
    await browser.storage.local.set({ rpcEnabled: state.rpcEnabled }); 
    
    browser.runtime.sendMessage({ 
        action: "TRIGGER_SYNC", 
        enabled: state.rpcEnabled 
    });
    
    render();
};

document.getElementById('toggle-popups').onclick = async () => {
    state.popupsEnabled = !state.popupsEnabled;
    await browser.storage.local.set({ informationPopups: state.popupsEnabled });
    render();
};

function getPythonStatus() {
    return new Promise((resolve) => {
        const listener = (msg) => {
            if (msg.action === "PYTHON_RESPONSE") {
                browser.runtime.onMessage.removeListener(listener);
                resolve(msg.payload);
            }
        };
        browser.runtime.onMessage.addListener(listener);

        browser.runtime.sendMessage({ action: "REQUEST_DATA" });
    });
}

// CURRENTLY UNUSED:
async function handleToastTrigger() {
    const messageContent = "Settings Updated!";
    const live_data = false;
    try {
        // This isn't finished with live data. For now only placeholder
        if (live_data) {
            const pythonData = await getPythonStatus();
            const target = state.expandedSection.toLowerCase();

            const selectedTabs = pythonData.selected_tabs;
            const matchingKey = Object.keys(selectedTabs).find(key => key.toLowerCase() === target);
            const tabId = selectedTabs[matchingKey];
            const rpc = pythonData.rpc_data[tabId];

            console.log("RPC Data:", rpc);
            const payload = rpc.payload;

            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

            await browser.tabs.sendMessage(tab.id, {
                action: "show_toast", 
                data: {
                    type: 3,
                    title: payload.title,
                    author: payload.author,
                    time: payload.time,
                    thumbnail: "https://img.youtube.com/vi/zLsIe5fSJLg/maxresdefault.jpg",
                    avatar: payload.author_url
                }
            });
        } else {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

            const config = state.configs[state.expandedSection];
            const reverseTypeMap = {'Playing': 0, 'Listening': 2, 'Watching': 3, 'Competing': 5};

            await browser.tabs.sendMessage(tab.id, {
                action: "show_toast", 
                data: {
                    type: reverseTypeMap[config.type] ?? 0,
                    details: config.details.text,
                    details_url: config.details.url,
                    state: config.state.text,
                    state_url: config.state.url,
                    large_image_text: config.largeImage.text,
                    large_image_url: config.largeImage.key, 
                    small_image_text: config.smallImage.text,
                    small_image_url: config.smallImage.key,
                    button1_text: config.button1.text,
                    button1_url: config.button1.url,
                    button2_text: config.button2.text,
                    button2_url: config.button2.url,
                    start_time: config.showCurrentTime,
                    end_time: config.showLength,
                }
            });
        }

    } catch (error) {
        // FALLBACK: If the above fails (restricted page), show warning popup
        showInternalWarning();
    }
}

// CURRENTLY UNUSED:
function showInternalWarning() {
    if (internalWarningInterval) {
        clearInterval(internalWarningInterval);
        internalWarningInterval = null;
    }
    if (internalWarningHardTimeout) {
        clearTimeout(internalWarningHardTimeout);
        internalWarningHardTimeout = null;
    }

    const existingToast = document.getElementById('active-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'active-toast';
    let timeLeft = 3;

    toast.innerHTML = `
        <div id="toast-timer" style="position: absolute; top: 6px; right: 10px; font-size: 9px; color: #4b5563; font-weight: bold; font-family: monospace;">
            (${timeLeft})
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="background: rgba(251, 191, 36, 0.2); padding: 8px; border-radius: 50%; display: flex;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div style="display: flex; flex-direction: column;">
                <span style="font-weight: 700; font-size: 12px; color: #fbbf24; letter-spacing: 0.5px; margin-bottom: 2px;">ACTION BLOCKED</span>
                <span style="font-size: 11px; color: rgba(255,255,255,0.9); line-height: 1.3;">Navigate to a standard webpage<br/>to use this button.</span>
            </div>
        </div>
    `;

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '87px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '260px',
        backgroundColor: 'rgba(30, 30, 46, 0.95)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(251, 191, 36, 0.3)',
        padding: '12px 16px',
        borderRadius: '12px',
        zIndex: '10000',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
        fontFamily: 'Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        animation: 'toastIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        opacity: '1'
    });

    document.body.appendChild(toast);

    const cleanup = () => {
        if (internalWarningInterval) {
            clearInterval(internalWarningInterval);
            internalWarningInterval = null;
        }
        if (internalWarningHardTimeout) {
            clearTimeout(internalWarningHardTimeout);
            internalWarningHardTimeout = null;
        }
        if (toast && document.body.contains(toast)) {
            toast.remove();
        }
    };

    internalWarningHardTimeout = setTimeout(cleanup, 5000);

    internalWarningInterval = setInterval(() => {
        try {
            if (!toast || !document.body.contains(toast)) {
                cleanup();
                return;
            }

            const timerElement = toast.querySelector('#toast-timer');
            timeLeft -= 1;

            if (timeLeft > 0) {
                if (timerElement) timerElement.textContent = `(${timeLeft})`;
                return;
            }

            if (timerElement) timerElement.textContent = `(0)`;

            toast.style.animation = 'none';

            setTimeout(() => {
                try {
                    toast.style.transition = 'opacity 0.8s ease-in, transform 0.8s ease-in';
                    toast.style.opacity = '0';
                    toast.style.transform = 'translateX(-50%) translateY(25px)';
                } catch { }
            }, 10);

            setTimeout(cleanup, 900);
        } catch {
            cleanup();
        }
    }, 1000);
}

document.getElementById('btn-toast-trigger').addEventListener('click', async () => {
    try {
        await browser.runtime.sendMessage({ action: 'SELECT_ACTIVE_TAB_FOR_RPC' });
    } catch { }
});



document.addEventListener('DOMContentLoaded', () => {
    const reloadBtn = document.getElementById('btn-reload-presence');

    reloadBtn.addEventListener('click', () => {
        browser.runtime.sendMessage({ action: "TRIGGER_RELOAD" }, (response) => {            
            reloadBtn.textContent = "Updating...";
            setTimeout(() => { reloadBtn.textContent = "Reload Presence"; }, 1000);
        });
        browser.runtime.sendMessage({ 
            action: "TRIGGER_SYNC", 
            enabled: state.rpcEnabled
        });
    });
    browser.runtime.sendMessage({ 
        action: "TRIGGER_SYNC", 
        enabled: state.rpcEnabled
    });
});

function mapStorageToState(storageConfig, uiConfig) {
    const typeMap = { 0: 'Playing', 2: 'Listening', 3: 'Watching', 5: 'Competing' };

    if (!storageConfig || !uiConfig) return;

    if (storageConfig.enabled !== undefined) uiConfig.enabled = storageConfig.enabled;

    if (storageConfig.type !== undefined) {
        uiConfig.type = typeMap[storageConfig.type];
    }
    if (storageConfig.details !== undefined) uiConfig.details.text = storageConfig.details;
    if (storageConfig.state !== undefined) uiConfig.state.text = storageConfig.state;

    if (storageConfig.special) {
        if (storageConfig.special.details_url) {
            uiConfig.details.url = storageConfig.special.details_url.url || '';
            uiConfig.details.urlEnabled = storageConfig.special.details_url.enabled;
        }
        if (storageConfig.special.state_url) {
            uiConfig.state.url = storageConfig.special.state_url.url || '';
            uiConfig.state.urlEnabled = storageConfig.special.state_url.enabled;
        }
        if (storageConfig.special.large_image_url) {
            uiConfig.largeImage.url = storageConfig.special.large_image_url.url || '';
            uiConfig.largeImage.urlEnabled = storageConfig.special.large_image_url.enabled;
        }
        if (storageConfig.special.small_image_url) {
            uiConfig.smallImage.url = storageConfig.special.small_image_url.url || '';
            uiConfig.smallImage.urlEnabled = storageConfig.special.small_image_url.enabled;
        }
        if (storageConfig.special.custom_name !== undefined) {
            if (!uiConfig.activityName) uiConfig.activityName = { enabled: false, name: '' };
            uiConfig.activityName.enabled = storageConfig.special.custom_name;
        }
    }
    
    if (storageConfig.name !== undefined) {
        if (!uiConfig.activityName) uiConfig.activityName = { enabled: false, name: '' };
        uiConfig.activityName.name = storageConfig.name;
    }

    if (storageConfig.assets) {
        if (storageConfig.assets.large) {
            uiConfig.largeImage.enabled = storageConfig.assets.large.enabled;
            uiConfig.largeImage.text = storageConfig.assets.large.large_text || '';
            uiConfig.largeImage.key = storageConfig.assets.large.large_image || '';
        }
        if (storageConfig.assets.small) {
            uiConfig.smallImage.enabled = storageConfig.assets.small.enabled;
            uiConfig.smallImage.text = storageConfig.assets.small.small_text || '';
            uiConfig.smallImage.key = storageConfig.assets.small.small_image || '';
        }
    }

    if (storageConfig.buttons) {
        if (storageConfig.buttons['1']) {
            uiConfig.button1.enabled = storageConfig.buttons['1'].enabled;
            uiConfig.button1.text = storageConfig.buttons['1'].label || '';
            uiConfig.button1.url = storageConfig.buttons['1'].url || '';
        }
        if (storageConfig.buttons['2']) {
            uiConfig.button2.enabled = storageConfig.buttons['2'].enabled;
            uiConfig.button2.text = storageConfig.buttons['2'].label || '';
            uiConfig.button2.url = storageConfig.buttons['2'].url || '';
        }
    }

    if (storageConfig.timestamps) {
        if (storageConfig.timestamps.start !== undefined) {
            const startVal = storageConfig.timestamps.start;
            if (typeof startVal === 'boolean') {
                uiConfig.showCurrentTime = startVal;
            } else if (typeof startVal === 'number') {
                uiConfig.showCurrentTime = true;
                uiConfig.startTimestamp = startVal;
            }
        }
        if (storageConfig.timestamps.end !== undefined) {
            const endVal = storageConfig.timestamps.end;
            if (typeof endVal === 'boolean') {
                uiConfig.showLength = endVal;
            } else if (typeof endVal === 'number') {
                uiConfig.showLength = true;
                uiConfig.endTimestamp = endVal;
            }
        }
    }

    if (storageConfig.browsingActivities && uiConfig.browsingActivities) {
        uiConfig.browsingActivities.enabled = storageConfig.browsingActivities.enabled;
        uiConfig.browsingActivities.expanded = storageConfig.browsingActivities.expanded;
        if (storageConfig.browsingActivities.activities) {
            Object.keys(storageConfig.browsingActivities.activities).forEach(key => {
                if (uiConfig.browsingActivities.activities[key]) {
                    uiConfig.browsingActivities.activities[key] = {
                        ...uiConfig.browsingActivities.activities[key],
                        ...storageConfig.browsingActivities.activities[key]
                    };
                }
            });
        }
    }
}

async function refreshUpdateBanner() {
    const banner = document.getElementById('update-banner');
    const linkBtn = document.getElementById('update-banner-link');
    if (!banner || !linkBtn) return;

    try {
        const status = await browser.runtime.sendMessage({ action: 'GET_UPDATE_STATUS' });
        if (!status || status.kind !== 'update_available') {
            banner.style.display = 'none';
            return;
        }

        const url = status.downloadUrl || status.url;

        linkBtn.textContent = 'Download';

        linkBtn.onclick = () => {
            if (url) {
                try {
                    browser.tabs.create({ url });
                } catch { }
            }
        };

        banner.style.display = '';
    } catch {
        banner.style.display = 'none';
    }
}

function warmupUpdateBanner() {
    refreshUpdateBanner();
    setTimeout(() => refreshUpdateBanner(), 350);
    setTimeout(() => refreshUpdateBanner(), 1100);
    setTimeout(() => refreshUpdateBanner(), 2600);
}

function currentSectionMapping() {
    mapping = {
        youtube: "rpcYoutube",
        youtubeMusic: "rpcYoutubeMusic",
        custom: "rpcCustom"
    }
    return mapping[state.expandedSection] ?? state.expandedSection;
}

async function setStorageData(path, newVal) {
    let dataSection;
    try {
        dataSection = currentSectionMapping();
        const data = await browser.storage.local.get(dataSection);
        let rootObj = data[dataSection] || {};

        let target;
        if (dataSection === "rpcYoutube" || dataSection === "rpcYoutubeMusic") {
            if (path === 'showPausedRpc' || path.startsWith('browsingActivities.')) {
                target = rootObj;
            } else {
                const mode = state.configs[state.expandedSection]?.editingMode || 'running';
                if (!rootObj[mode]) rootObj[mode] = {};
                target = rootObj[mode];
            }
        } else {
            target = rootObj;
        }

        // --- Nested Path ---
        const keys = path.split('.');
        let current = target;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key]) current[key] = {};
            current = current[key];
        }
        current[keys[keys.length - 1]] = newVal;
        // --------------------

        await browser.storage.local.set({ [dataSection]: rootObj });
        
        // Auto-update RPC when settings change
        if (state.rpcEnabled) {
            if (state.expandedSection === 'custom' && state.configs.custom.enabled) {
                browser.runtime.sendMessage({ 
                    action: "TRIGGER_CUSTOM_RPC",
                    enabled: true
                });
            } else if ((state.expandedSection === 'youtube' || state.expandedSection === 'youtubeMusic') && state.configs[state.expandedSection].enabled) {
                // Trigger sync for YouTube/Music to re-broadcast with updated settings
                browser.runtime.sendMessage({ 
                    action: "TRIGGER_SYNC", 
                    enabled: true,
                    platform: state.expandedSection
                });
            }
        }
        
        // console.log(`Successfully set ${dataSection} -> ${path} to:`, newVal);
    } catch (error) {
        console.error(`Error setting storage data:`, error);
    }
}


window.onload = async () => {
    try {
        const stored = await browser.storage.local.get(null); 

        if (stored.rpcEnabled !== undefined) {state.rpcEnabled = stored.rpcEnabled; }
        if (stored.informationPopups !== undefined) {state.popupsEnabled = stored.informationPopups; }
        
        if (stored.rpcYoutube) {
            state.configs.youtube.showPausedRpc = stored.rpcYoutube.showPausedRpc !== undefined
                ? stored.rpcYoutube.showPausedRpc
                : true;

            const currentMode = state.configs.youtube.editingMode;
            const youtubeData = stored.rpcYoutube[currentMode];
            if (youtubeData) {
                mapStorageToState(youtubeData, state.configs.youtube);
            }

            const browsingCfg = stored.rpcYoutube.browsingActivities
                || stored.rpcYoutube.paused?.browsingActivities
                || stored.rpcYoutube.running?.browsingActivities;
            if (browsingCfg) {
                mapStorageToState({ browsingActivities: browsingCfg }, state.configs.youtube);

                if (!stored.rpcYoutube.browsingActivities) {
                    const rpcYoutube = { ...stored.rpcYoutube, browsingActivities: browsingCfg };
                    await browser.storage.local.set({ rpcYoutube });
                }
            }
        }

        if (stored.rpcYoutubeMusic) {
            if (!stored.rpcYoutubeMusic.running && !stored.rpcYoutubeMusic.paused) {
                const legacy = stored.rpcYoutubeMusic;
                const enabled = legacy.enabled !== undefined ? legacy.enabled : true;

                const running = { ...legacy, enabled };
                const paused = {
                    ...legacy,
                    enabled,
                    details: legacy.details && String(legacy.details).toUpperCase().includes('PAUSED:')
                        ? legacy.details
                        : `PAUSED: ${legacy.details || '%title%'}`,
                    timestamps: { start: false, end: false }
                };

                const rpcYoutubeMusic = {
                    showPausedRpc: legacy.showPausedRpc !== undefined ? legacy.showPausedRpc : true,
                    browsingActivities: legacy.browsingActivities,
                    running,
                    paused
                };

                await browser.storage.local.set({ rpcYoutubeMusic });
                stored.rpcYoutubeMusic = rpcYoutubeMusic;
            }

            state.configs.youtubeMusic.showPausedRpc = stored.rpcYoutubeMusic.showPausedRpc !== undefined
                ? stored.rpcYoutubeMusic.showPausedRpc
                : true;

            const currentMode = state.configs.youtubeMusic.editingMode;
            const musicData = stored.rpcYoutubeMusic[currentMode];
            if (musicData) {
                mapStorageToState(musicData, state.configs.youtubeMusic);
            }

            const browsingCfg = stored.rpcYoutubeMusic.browsingActivities
                || stored.rpcYoutubeMusic.paused?.browsingActivities
                || stored.rpcYoutubeMusic.running?.browsingActivities;
            if (browsingCfg) {
                mapStorageToState({ browsingActivities: browsingCfg }, state.configs.youtubeMusic);

                if (!stored.rpcYoutubeMusic.browsingActivities) {
                    const rpcYoutubeMusic = { ...stored.rpcYoutubeMusic, browsingActivities: browsingCfg };
                    await browser.storage.local.set({ rpcYoutubeMusic });
                }
            }
        }
        if (stored.rpcCustom) {
            const customData = stored.rpcCustom;
            if (customData) {
                mapStorageToState(customData, state.configs.custom);
            }
        }

        render();

        warmupUpdateBanner();

    } catch (e) {
        console.error("Initialization Failed:", e);
        render();

        warmupUpdateBanner();
    }
};