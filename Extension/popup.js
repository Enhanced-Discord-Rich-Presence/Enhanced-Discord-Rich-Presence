const defaultSettings = {
    rpcEnabled: true,
    informationPopups: true,
    rpcYoutube: {
        enabled: true, type: 3, details: "%title%", state: "By %author%",
        timestamps: { start: true, end: true },
        assets: {
            large: { enabled: true, large_image: "%thumbnail%", large_text: "%title%" },
            small: { enabled: true, small_image: "%author_avatar%", small_text: "%author%" }
        },
        buttons: {
            1: { enabled: true, label: "Watch on YouTube", url: "%url%" },
            2: { enabled: false, label: "Channel Page", url: "%author_url%" }
        }
    },
    rpcYoutubeMusic: {
        enabled: true, type: 2, details: "%title%", state: "By %author%",
        timestamps: { start: true, end: true },
        assets: {
            large: { enabled: true, large_image: "%thumbnail%", large_text: "%title%" },
            small: { enabled: true, small_image: "%author_avatar%", small_text: "%author%" }
        },
        buttons: {
            1: { enabled: true, label: "Listen on YouTube Music", url: "%url%" },
            2: { enabled: false, label: "Channel Page", url: "%author_url%" }
        }
    }
};

// Validates URL by attempting a fetch (CORS permitting) or basic syntax check
async function validateImageUrl(urlInput) {
    const url = urlInput.value;
    if (url.startsWith('%')) { // Allow variables
        urlInput.classList.remove('url-invalid', 'url-valid');
        return;
    }
    try {
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
            urlInput.classList.add('url-valid');
            urlInput.classList.remove('url-invalid');
        } else {
            urlInput.classList.add('url-invalid');
        }
    } catch (e) {
        urlInput.classList.add('url-invalid');
    }
}

async function loadSettings() {
    const s = await browser.storage.local.get(defaultSettings);

    document.getElementById('rpcEnabled').checked = s.rpcEnabled;
    document.getElementById('informationPopups').checked = s.informationPopups;

    const mapFields = (prefix, data) => {
        document.getElementById(`${prefix}_enabled`).checked = data.enabled;
        document.getElementById(`${prefix}_type`).value = data.type;
        document.getElementById(`${prefix}_details`).value = data.details;
        document.getElementById(`${prefix}_state`).value = data.state;
        
        // Assets
        document.getElementById(`${prefix}_l_en`).checked = data.assets.large.enabled;
        document.getElementById(`${prefix}_l_img`).value = data.assets.large.large_image;
        document.getElementById(`${prefix}_l_txt`).value = data.assets.large.large_text;
        
        document.getElementById(`${prefix}_s_en`).checked = data.assets.small.enabled;
        document.getElementById(`${prefix}_s_img`).value = data.assets.small.small_image;
        document.getElementById(`${prefix}_s_txt`).value = data.assets.small.small_text;
        
        // Buttons
        document.getElementById(`${prefix}_b1_en`).checked = data.buttons[1].enabled;
        document.getElementById(`${prefix}_b1_lab`).value = data.buttons[1].label;
        document.getElementById(`${prefix}_b1_url`).value = data.buttons[1].url;
        
        document.getElementById(`${prefix}_b2_en`).checked = data.buttons[2].enabled;
        document.getElementById(`${prefix}_b2_lab`).value = data.buttons[2].label;
        document.getElementById(`${prefix}_b2_url`).value = data.buttons[2].url;
    };

    mapFields('yt', s.rpcYoutube);
    mapFields('ytm', s.rpcYoutubeMusic);

    // Add listeners for image validation
    ['yt_l_img', 'yt_s_img', 'ytm_l_img', 'ytm_s_img'].forEach(id => {
        document.getElementById(id).addEventListener('change', (e) => validateImageUrl(e.target));
    });
}

async function saveSettings() {
    const current = await browser.storage.local.get(defaultSettings);

    const getFields = (prefix, original) => {
        let typeVal = parseInt(document.getElementById(`${prefix}_type`).value);
        // Force type to 0, 2, or 3. Default to 3 if invalid.
        if (![0, 2, 3].includes(typeVal)) typeVal = 3;

        return {
            ...original,
            enabled: document.getElementById(`${prefix}_enabled`).checked,
            type: typeVal,
            details: document.getElementById(`${prefix}_details`).value,
            state: document.getElementById(`${prefix}_state`).value,
            assets: {
                large: { 
                    enabled: document.getElementById(`${prefix}_l_en`).checked, 
                    large_image: document.getElementById(`${prefix}_l_img`).value,
                    large_text: document.getElementById(`${prefix}_l_txt`).value 
                },
                small: { 
                    enabled: document.getElementById(`${prefix}_s_en`).checked, 
                    small_image: document.getElementById(`${prefix}_s_img`).value,
                    small_text: document.getElementById(`${prefix}_s_txt`).value 
                }
            },
            buttons: {
                1: { 
                    enabled: document.getElementById(`${prefix}_b1_en`).checked, 
                    label: document.getElementById(`${prefix}_b1_lab`).value,
                    url: document.getElementById(`${prefix}_b1_url`).value
                },
                2: { 
                    enabled: document.getElementById(`${prefix}_b2_en`).checked, 
                    label: document.getElementById(`${prefix}_b2_lab`).value,
                    url: document.getElementById(`${prefix}_b2_url`).value
                }
            }
        };
    };

    const newSettings = {
        rpcEnabled: document.getElementById('rpcEnabled').checked,
        informationPopups: document.getElementById('informationPopups').checked,
        rpcYoutube: getFields('yt', current.rpcYoutube),
        rpcYoutubeMusic: getFields('ytm', current.rpcYoutubeMusic)
    };

    /* TODO: Implement kill logic:
       If newSettings.rpcEnabled is false OR specific rpc service enabled is false 
       while currently running, send a message to background.js to terminate the RPC connection.
    */

    await browser.storage.local.set(newSettings);
    
    const btn = document.getElementById('saveBtn');
    btn.textContent = "SUCCESSFULLY SAVED";
    setTimeout(() => { btn.textContent = "Apply All Changes"; }, 2000);
}

document.addEventListener('DOMContentLoaded', loadSettings);
document.getElementById('saveBtn').addEventListener('click', saveSettings);