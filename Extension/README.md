# Enhanced Discord Rich Presence - Extension

**Developer Guide for the Firefox Extension (Manifest V3)**

This document explains the extension's architecture, how metadata is detected, and how to modify or extend it. If you're looking for user-facing documentation, see the [main README](../README.md). For the Python bridge, see [App/README.md](../App/README.md).

---

## 📁 Project Structure

```
Extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js          # Service worker (messaging hub, tab selection)
├── popup.js               # Settings UI logic & state management
├── popup.html             # Settings UI markup
├── popup.css              # Settings UI styling
├── content.js             # Visual notifications (Shadow DOM toasts)
├── default_settings.json  # Settings schema & defaults
├── README.md              # This file
└── Activities/
    ├── Youtube.js         # Video detection & metadata extraction
    └── YoutubeMusic.js    # Track detection & metadata extraction
```

---

## 🎯 Architecture Overview

### High-Level Design

```
YouTube / YouTube Music Page
    ↓ (Activities/*.js detect & extract metadata)
content.js (show toast notification)
    ↓ (browser.runtime.sendMessage)
background.js (route to native bridge)
    ↓ (nativePort.postMessage)
App/bridge.py (Discord RPC management)
    ↓ (Windows named pipes)
Discord (Rich Presence update)
```

### Data Flow: User Plays a Video

```
1. User plays video on YouTube.com
2. Youtube.js detects <video> element (play event)
3. Extracts metadata: title, author, URL, thumbnail
4. Calls sendToBackground() with action "VIDEO_RESUMED"
5. background.js receives message via onMessage listener
6. Checks if user is active tab (via browser.tabs.query)
7. Routes message to native port (bridge.py)
8. content.js shows toast notification "Broadcasting Video to RPC"
9. bridge.py receives message, selects tab if first active
10. Interpolates placeholders (%title%, %author%, etc.)
11. Constructs Discord RPC payload with timestamps
12. Sends to Discord via Windows named pipes
13. Discord updates user's Rich Presence
```

---

## 🔧 Core Components

### 1. **manifest.json** — Extension Configuration

```json
{
  "manifest_version": 3,
  "name": "Enhanced Discord Rich Presence",
  "version": "1.0.0",
  "permissions": ["tabs", "storage", "nativeMessaging"],
  "host_permissions": [
    "*://*.youtube.com/*",
    "*://music.youtube.com/*"
  ],
  "background": {
    "scripts": ["background.js"]
  },
  "content_scripts": [
    {
      "matches": ["*://music.youtube.com/*"],
      "js": ["Activities/YoutubeMusic.js"]
    },
    {
      "matches": ["*://*.youtube.com/*"],
      "js": ["Activities/Youtube.js"]
    }
  ]
}
```

**Key Permissions**:
- `tabs` — Check which tab is active
- `storage` — Persist user settings
- `nativeMessaging` — Communicate with bridge.py

---

### 2. **Activities/Youtube.js** — Video Detection & Metadata

**Purpose**: Detect when user watches YouTube videos, extract metadata, monitor playback.

#### Key Functions

| Function | Purpose | Input | Output |
|----------|---------|-------|--------|
| `isVideoPage()` | Check if on `/watch?v=...` or `/shorts/...` | (none) | boolean |
| `detectPageType()` | Identify browsing activity type (homepage, search, etc.) | (none) | object `{type, data}` |
| `getCleanTitle()` | Extract video title from page | (none) | string |
| `getAuthorData()` | Extract author name, URL, avatar | (none) | object `{name, url, avatar}` |
| `getVideoThumbnail(url)` | Fetch best thumbnail for video | url: string | string (URL) |
| `sendToBackground(action, data)` | Send metadata to background worker | action, data | (none) |
| `attachListeners()` | Attach play/pause listeners to `<video>` | (none) | (none) |
| `checkMetadataConsistency()` | Detect title/URL/author changes, re-send RPC | (none) | (none) |
| `checkBrowsingActivity()` | Detect non-video pages (homepage, channel, etc.) | (none) | (none) |
| `handleNavigation()` | Run on page navigation via `yt-navigate-finish` | (none) | (none) |

#### How Video Detection Works

```javascript
function isVideoPage() {
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  
  // Check for watch page or shorts
  if (pathname.startsWith("/shorts/")) return true;
  if (pathname === "/watch" && searchParams.has("v")) return true;
  return false;
}
```

#### How Metadata is Extracted

```javascript
function getAuthorData() {
  // 1. Try DOM scraping from #owner section
  const owner = document.querySelector('#owner');
  const authorLink = owner?.querySelector('#channel-name a');
  const authorName = authorLink?.innerText;
  const authorUrl = authorLink?.href;
  const authorAvatar = owner?.querySelector('#avatar img')?.src;
  
  // 2. Fallback to ytInitialPlayerResponse if DOM not ready
  const playerResponse = window.ytInitialPlayerResponse;
  const fallbackName = playerResponse?.videoDetails?.author;
  
  return { name, url, avatar };
}
```

**Metadata Extraction Order**:
1. **Title** — from DOM `.title` element
2. **Author** — from `#owner #channel-name a` link (with fallback to `ytInitialPlayerResponse`)
3. **Thumbnail** — tries maxresdefault → sddefault → hqdefault
4. **Avatar** — from `#owner #avatar img` (with fallback to `ytInitialPlayerResponse`)

#### How Events Are Monitored

```javascript
function attachListeners() {
  const video = document.querySelector('video');
  
  // Send RPC when video starts playing
  video.addEventListener('play', () => {
    sendToBackground('VIDEO_RESUMED', payload);
  });
  
  // Send RPC when video is paused
  video.addEventListener('pause', () => {
    if (!video.seeking) sendToBackground('VIDEO_PAUSED', payload);
  });
  
  // Re-check metadata every 2 seconds
  setInterval(() => {
    checkMetadataConsistency();
  }, 2000);
}
```

#### Browsing Activities (Non-Video Pages)

When user is **not** watching a video, `detectPageType()` identifies the page:

```javascript
function detectPageType() {
  const url = window.location.href;
  
  if (url.includes("/feed/") || url === "/") 
    return { type: "homepage", data: {} };
  
  if (url.includes("/results?search_query=")) 
    return { type: "search", data: { query: searchParams.get("search_query") } };
  
  if (url.includes("/channel/") || url.includes("/@"))
    return { type: "channel", data: { channel: channelName, channel_url: url } };
  
  // ... more patterns
}
```

**Supported Browsing Activities**:
- `homepage` — YouTube homepage/feed
- `channel` — Channel page (/@handle, /c/name, /channel/ID)
- `shorts` — Shorts feed
- `search` — Search results
- `subscriptions`, `library`, `history`, `watchLater`, `likedVideos`, `playlist`, `studio`

**Special Behavior**:
- Browsing RPC **has no timestamps** (no progress bar)
- Browsing RPC **has no video buttons** (channel button only)
- Large image **forced to "youtube"** asset key
- Small image **disabled**

---

### 3. **Activities/YoutubeMusic.js** — Track Detection & Metadata

**Purpose**: Same as Youtube.js, but for YouTube Music tracks.

#### Key Differences from Youtube.js

| Aspect | Youtube.js | YoutubeMusic.js |
|--------|-----------|-----------------|
| Page detection | `/watch?v=...` or `/shorts/...` | `/watch?v=...` only |
| Metadata source | DOM `#owner` section | `ytmusic-player-bar` elements |
| Browsing activities | 11 types | 8 types |
| Avatar fetching | DOM or ytInitialPlayerResponse | Fetches channel page HTML for og:image |
| Default small image | `%author_avatar%` | `"youtubemusic"` (asset key) |

#### Key Functions

| Function | Purpose |
|----------|---------|
| `isSongPage()` | Check if on `/watch?v=...` |
| `getCleanTitle()` | Extract from `ytmusic-player-bar` |
| `getAuthorData()` | Extract from `.subtitle` link |
| `getThumbnailUrl()` | Get from player thumbnail |
| `getAuthorAvatar(url)` | **Fetch from author's HTML** (uses caching) |
| `detectPageType()` | Identify browsing page (explore, album, artist, etc.) |

#### Avatar Fetching (Unique to Music)

```javascript
async function getAuthorAvatar(authorUrl) {
  // 1. Try cache first
  if (authorAvatarCache.has(authorUrl)) 
    return authorAvatarCache.get(authorUrl);
  
  // 2. Try DOM scraping
  const domImg = document.querySelector(`a[href*="${path}"] img`)?.src;
  if (domImg && !domImg.includes('data:image')) {
    authorAvatarCache.set(authorUrl, domImg);
    return domImg;
  }
  
  // 3. Fetch channel page & extract og:image meta tag
  const resp = await fetch(authorUrl);
  const html = await resp.text();
  const match = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/);
  const avatarUrl = match ? match[1] : "";
  
  authorAvatarCache.set(authorUrl, avatarUrl);
  return avatarUrl;
}
```

---

### 4. **background.js** — Service Worker (Message Hub)

**Purpose**: Route messages between extension and native bridge, manage tab selection, check for updates.

#### Key Functions

| Function | Purpose |
|----------|---------|
| `getNativePort()` | Lazy-connect to bridge.py, cache pipe |
| `requestNative(action, data)` | Send message to bridge.py, wait for response |
| `probeNativeHost()` | Check if bridge.py is installed/reachable |
| `checkForNativeAppUpdate()` | Fetch latest version, show update modal if needed |
| `ensureNativeMissingModal()` | Show "App not installed" modal |
| `syncActiveTabs()` | Send REQUEST_SYNC to all YouTube tabs |
| `browser.runtime.onMessage` | Route messages from content scripts & popup |

#### Native Port Management

```javascript
function getNativePort() {
  if (!nativePort) {
    try {
      nativePort = browser.runtime.connectNative("com.enhanced.rpc.bridge");
      
      nativePort.onMessage.addListener((response) => {
        // Handle response from bridge.py
        nativeHostReachable = true;
        // ... route to waiting requests
      });
      
      nativePort.onDisconnect.addListener(() => {
        nativePort = null;
        nativeHostReachable = false;
        // Show "App disconnected" modal
      });
    } catch {
      nativePort = null;
      nativeHostReachable = false;
      return null;
    }
  }
  return nativePort;
}
```

**Why Lazy Connection?**
- Avoids error on startup if bridge.py not installed
- Reconnects automatically when bridge.py restarts
- Saves resources if extension disabled

#### Tab Selection & Message Routing

```javascript
// When extension receives VIDEO_RESUMED/VIDEO_PAUSED:
browser.runtime.onMessage.addListener(async (msg, sender) => {
  const tabId = sender.tab.id;
  const isActiveTab = (await browser.tabs.query({active: true}))[0].id === tabId;
  const service = msg.currentSite; // "Youtube" or "YoutubeMusic"
  
  // Route to bridge with isActiveTab flag
  const port = getNativePort();
  port.postMessage({
    ...msg,
    tabId,
    isActiveTab,  // Bridge uses this to decide if tab can be selected
  });
});
```

#### Message Types Handled

| Action | Source | Destination | Purpose |
|--------|--------|-------------|---------|
| `VIDEO_RESUMED` | Activities/*.js | bridge.py | User playing video |
| `VIDEO_PAUSED` | Activities/*.js | bridge.py | User paused video |
| `VIDEO_SKIPPED` | Activities/*.js | bridge.py | User skipped track |
| `BROWSING_ACTIVITY` | Activities/*.js | bridge.py | User on non-video page |
| `TAB_CLOSED` | bridge.py | (internal) | Tab closed, clear RPC |
| `REQUEST_SYNC` | popup.js | Activities/*.js | Settings changed, re-send |
| `CLEAR_RPC` | popup.js | bridge.py | User disabled RPC |
| `UPDATE_CUSTOM` | popup.js | bridge.py | Custom RPC enabled |
| `GET_STATUS` | popup.js | bridge.py | Fetch current RPC state |

---

### 5. **popup.js** — Settings UI & State Management

**Purpose**: Manage settings UI, validate user input, persist to storage.

#### State Structure

```javascript
const state = {
  rpcEnabled: true,                    // Master toggle
  popupsEnabled: true,                 // Toast notifications
  expandedSection: 'youtube',          // Which config is open
  editingBrowsingActivity: null,       // Modal for editing page state
  configs: {
    youtube: {
      title: 'YouTube',
      editingMode: 'running',          // 'running' or 'paused'
      enabled: true,
      showPausedRpc: true,             // Show RPC when paused?
      type: 'Watching',                // Activity type
      details: { text: '%title%', url: '', urlEnabled: false },
      state: { text: 'by %author%', url: '', urlEnabled: false },
      showCurrentTime: true,           // Show video progress?
      showLength: true,                // Show video duration?
      largeImage: { enabled: true, ... },
      smallImage: { enabled: true, ... },
      button1: { enabled: true, ... },
      button2: { enabled: true, ... },
      browsingActivities: { enabled: true, ... }
    },
    youtubeMusic: { ... },  // Similar structure
    custom: { ... }         // Custom RPC (no dual modes)
  }
};
```

#### Key Functions

| Function | Purpose |
|----------|---------|
| `render()` | Rebuild entire UI from state object |
| `attachListeners()` | Bind event handlers to form elements |
| `setStorageData(path, value)` | Save to storage via dot-notation path |
| `mapStorageToState(storage, uiState)` | Load storage → state object |
| `validateField(value, min, max)` | Check byte length, URL format, etc. |
| `applyValidationStyle(input, validation)` | Show red border + error tooltip |

#### Form Validation (Real-Time, 500ms Debounce)

```javascript
document.querySelectorAll('.nested-input').forEach(input => {
  let timer;
  input.oninput = (e) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const value = e.target.value;
      const bytes = new Blob([value]).size;
      
      // Validate byte length (2-128 for details/state)
      if (bytes < 2 || bytes > 128) {
        applyValidationStyle(input, {
          valid: false,
          error: `${bytes}/128 bytes`
        });
        return;
      }
      
      // Validate URL format if URL field
      if (e.target.dataset.child === 'url' && value) {
        try {
          const url = new URL(value);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') throw;
        } catch {
          applyValidationStyle(input, {valid: false, error: 'Invalid URL'});
          return;
        }
      }
      
      // Save valid value
      applyValidationStyle(input, {valid: true});
      setStorageData(path, value);
    }, 500);  // Debounce
  };
});
```

#### Dual-Mode System (YouTube & YouTube Music)

```javascript
// User clicks "Running ↔ Paused" button
document.querySelector('.play-pause-toggle').onclick = async () => {
  const newMode = (currentMode === 'running') ? 'paused' : 'running';
  
  // Fetch settings from storage for new mode
  const stored = await browser.storage.local.get('rpcYoutube');
  const newSettings = stored.rpcYoutube[newMode];
  
  // Update UI state from storage
  mapStorageToState(newSettings, state.configs.youtube);
  
  // Re-render form
  render();
};
```

**Why Dual Modes?**
- User can customize RPC **while playing** vs **while paused**
- Example: "Playing: Alan Walker - Alone" vs "Paused: [video title]"
- Settings shared between modes (URLs, buttons, images)
- Only `details`, `state`, `timestamps` differ

#### Browsing Activities Editor

```javascript
// User clicks "Edit" button on homepage/channel/etc.
document.querySelector('.browsing-edit-btn').onclick = () => {
  state.editingBrowsingActivity = 'homepage';  // Which page?
  render();  // Shows modal
};

// Modal saves changes
const input = document.querySelector('.modal-input');
const newText = input.value;  // "Browsing YouTube"
setStorageData('browsingActivities.activities.homepage.text', newText);
```

---

### 6. **popup.html & popup.css** — UI Markup & Styling

**Purpose**: Settings interface with dark theme, animations, responsive design.

#### Layout Structure

```html
<body>
  <header>
    <div class="logo">🔴 Enhanced RPC</div>
    <button class="btn-power"></button>
  </header>
  
  <div class="quick-toggles">
    <div class="toggle-card">Status: Active/Disabled</div>
    <div class="toggle-card">Popups: Enabled/Muted</div>
  </div>
  
  <div class="custom-scrollbar">
    <!-- Sections auto-generated by popup.js -->
    <div class="section">
      <button class="section-toggle">YouTube</button>
      <div class="section-content"> ... form fields ... </div>
    </div>
    <!-- YoutubeMusic, Custom, Alert -->
  </div>
  
  <footer class="footer-actions">
    <button class="btn-primary">Reload Presence</button>
    <button class="btn-settings">⚙️</button>
  </footer>
</body>
```

#### Key CSS Classes

| Class | Purpose |
|-------|---------|
| `.section` | Collapsible config section |
| `.section-toggle` | Header to expand/collapse |
| `.section-content` | Form fields (hidden when collapsed) |
| `.form-group` | Single form field (label + input) |
| `.nested-row` | Complex field (image/button config) |
| `.checkbox-container` | Custom checkbox with animation |
| `.tooltip-container` | Hover info icon |
| `.modal-overlay` | Fullscreen modal background |
| `.modal-container` | Modal dialog box |

#### Animations

```css
.section-toggle:hover::before {
  animation: lightSweep 0.6s ease;  /* Shimmer effect */
}

.checkbox-container input:checked + .checkbox-custom {
  animation: checkboxPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.section-content.expanded {
  animation: contentSlideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

### 7. **content.js** — Visual Notifications (Shadow DOM)

**Purpose**: Show toast notifications and modals without CSS conflicts.

#### Toast Notification

```javascript
function createToast(data) {
  const host = document.createElement('div');
  const shadow = host.attachShadow({mode: 'open'});
  
  // Isolated styles prevent page CSS from interfering
  const style = document.createElement('style');
  style.textContent = `
    .activity-card {
      background: oklab(0.298 0.001 -0.009);
      padding: 12px;
      border-radius: 12px;
    }
    /* ... more styles ... */
  `;
  
  // Create card content
  const card = document.createElement('article');
  card.className = 'activity-card';
  card.innerHTML = `
    <header class="card-header">
      <span class="status-label">Watching YouTube</span>
    </header>
    <div class="card-body">
      <img src="${data.large_image_url}" class="main-thumbnail">
      <div class="details-container">
        <div class="video-title">${data.details}</div>
        <div class="author-name">${data.state}</div>
      </div>
    </div>
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(card);
  document.body.appendChild(host);
}
```

#### Update Modal

```javascript
function createUpdateModal(data) {
  const host = document.createElement('div');
  const shadow = host.attachShadow({mode: 'open'});
  
  // Modal with gradient background, version comparison
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-header">
      <div class="title-col">
        <div class="modal-app">EnhancedRPC</div>
        <div class="modal-title">${data.title}</div>
      </div>
    </div>
    <div class="modal-body">
      <p class="modal-text">${data.text}</p>
      <div class="versions">
        <div>
          <p class="v-label">Installed</p>
          <p class="v-value">${data.localVersion}</p>
        </div>
        <div>
          <p class="v-label">Latest</p>
          <p class="v-value">${data.remoteVersion}</p>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-primary">Download Latest</button>
    </div>
  `;
  
  shadow.appendChild(style);
  shadow.appendChild(modal);
  document.body.appendChild(host);
}
```

**Why Shadow DOM?**
- Isolates CSS: page styles don't affect toast
- Clean HTML: doesn't pollute page DOM
- Reusable: can safely show on any page

---

### 8. **default_settings.json** — Settings Schema

```json
{
  "rpcEnabled": true,
  "informationPopups": true,
  "rpcYoutube": {
    "showPausedRpc": true,
    "browsingActivities": {
      "enabled": true,
      "activities": {
        "homepage": { "enabled": true, "text": "Browsing YouTube" },
        "channel": { "enabled": true, "text": "Viewing %channel%'s Channel" },
        ...
      }
    },
    "running": {
      "enabled": true,
      "type": 3,  // 0=Playing, 2=Listening, 3=Watching, 5=Competing
      "details": "%title%",
      "state": "By %author%",
      "special": {
        "details_url": { "enabled": false, "url": "" },
        "state_url": { "enabled": false, "url": "" },
        "large_image_url": { "enabled": true, "url": "%url%" },
        "small_image_url": { "enabled": true, "url": "%author_url%" },
        "custom_name": false
      },
      "timestamps": { "start": true, "end": true },
      "assets": {
        "large": { "enabled": true, "large_image": "%thumbnail%", "large_text": "%title%" },
        "small": { "enabled": true, "small_image": "%author_avatar%", "small_text": "%author%" }
      },
      "buttons": {
        "1": { "enabled": true, "label": "Watch on YouTube", "url": "%url%" },
        "2": { "enabled": false, "label": "Channel Page", "url": "%author_url%" }
      }
    },
    "paused": {
      // Same structure, different values (e.g., details: "PAUSED: %title%")
    }
  },
  "rpcYoutubeMusic": { ... },
  "rpcCustom": { ... }
}
```

**Storage Layout**:
- `rpcEnabled` — Master switch
- `informationPopups` — Toast notifications
- `rpcYoutube` / `rpcYoutubeMusic` — Per-platform settings with running/paused modes
  - `browsingActivities` — Shared (not under running/paused)
- `rpcCustom` — Custom RPC (no dual modes)

---

## 📋 Message Flow Example

**Scenario**: User plays a video on YouTube.

```
1. Youtube.js: <video> play event fires
2. Youtube.js: Calls getAuthorData(), getVideoThumbnail()
3. Youtube.js: Calls sendToBackground('VIDEO_RESUMED', payload)
   Payload: {
     title: "Alan Walker - Alone",
     author: "Alan Walker",
     url: "https://youtube.com/watch?v=1-xGerv5FOk",
     author_url: "https://youtube.com/@AlanWalkerOfficial",
     author_avatar: "https://yt3.ggpht.com/.../88-c-k-c0x00ffffff-no-rj",
     thumbnail: "https://img.youtube.com/vi/1-xGerv5FOk/maxresdefault.jpg",
     time: 0,
     duration: 303
   }

4. background.js: onMessage listener receives message
5. background.js: Gets active tab via browser.tabs.query({active: true})
6. background.js: Attaches isActiveTab: true to message
7. background.js: Gets or creates native port (getNativePort)
8. background.js: Sends to bridge.py:
   {
     action: "VIDEO_RESUMED",
     payload: { ... },
     tabId: 42,
     isActiveTab: true,
     currentSite: "Youtube",
     settings: { ...rpcYoutube.running... }
   }

9. content.js: Shows toast: "Broadcasting Video to RPC"
   (Toast shows: "Watching Alan Walker - Alone by Alan Walker" with thumbnail)

10. bridge.py: Receives message via stdin
11. bridge.py: Checks if this is first active tab for Youtube service
12. bridge.py: If so, selects this tab: self.selected_tab["Youtube"] = 42
13. bridge.py: Interpolates placeholders in settings:
    - %title% → "Alan Walker - Alone"
    - %author% → "Alan Walker"
    - %thumbnail% → actual URL
14. bridge.py: Calculates timestamps:
    - start: now - current_time = now - 0
    - end: now + (duration - current_time) = now + 303
15. bridge.py: Constructs Discord RPC:
    {
      "cmd": "SET_ACTIVITY",
      "args": {
        "pid": 1234,
        "activity": {
          "type": 3,  // Watching
          "details": "Alan Walker - Alone",
          "state": "by Alan Walker",
          "timestamps": { "start": 1704456000, "end": 1704456303 },
          "assets": { "large_image": "https://...", ... },
          "buttons": [...]
        }
      }
    }

16. bridge.py: Opens Discord IPC pipe (\\.\pipe\discord-ipc-0)
17. bridge.py: Sends frame via Windows named pipe
18. Discord: Updates user's Rich Presence
19. User's Discord profile shows: "Watching Alan Walker - Alone" with progress bar
```

---

## 🛠️ Common Development Tasks

### Adding a New Setting

1. **Update default_settings.json**:
   ```json
   "rpcYoutube": {
     "running": {
       "newField": "default value"
     }
   }
   ```

2. **Update popup.js state**:
   ```javascript
   youtube: {
     newField: "default value"
   }
   ```

3. **Add form input in popup.js render()**:
   ```javascript
   renderFieldWithUrl('youtube', 'newField', 'Label', config.newField)
   ```

4. **Handle in attachListeners()**:
   ```javascript
   document.querySelector('.new-field-input').oninput = (e) => {
     setStorageData('newField', e.target.value);
   };
   ```

5. **Update bridge.py to use field**:
   - In `_render_rpc()`, use the setting when constructing RPC payload

### Adding Support for a New Website

1. **Create Activities/NewSite.js**:
   ```javascript
   function isNewSitePage() { /* detect page */ }
   function getMetadata() { /* extract data */ }
   function sendToBackground(action, data) { 
     browser.runtime.sendMessage({action, payload: data}); 
   }
   ```

2. **Register in manifest.json**:
   ```json
   "content_scripts": [
     {
       "matches": ["*://newsite.com/*"],
       "js": ["Activities/NewSite.js"]
     }
   ]
   ```

3. **Add settings in default_settings.json**:
   ```json
   "rpcNewSite": { ... }
   ```

4. **Handle in background.js onMessage**:
   ```javascript
   if (service === "NewSite") {
     activeSettings = settings.rpcNewSite[paused ? "paused" : "running"];
   }
   ```

5. **Add Discord app & client ID in bridge.py**:
   ```python
   CLIENT_IDS = {
     'NewSite': "YOUR_DISCORD_CLIENT_ID"
   }
   ```

### Debugging Metadata Extraction

```javascript
// In browser console on YouTube page:
console.log("Title:", getCleanTitle());
console.log("Author:", getAuthorData());
console.log("Thumbnail:", await getVideoThumbnail(window.location.href));

// Watch message passing:
browser.runtime.onMessage.addListener((msg) => {
  console.log("Message from background:", msg);
});
```

### Testing Message Flow

```javascript
// Simulate user playing video:
sendToBackground('VIDEO_RESUMED', {
  title: "Test Video",
  author: "Test Author",
  url: "https://youtube.com/watch?v=test",
  thumbnail: "https://img.youtube.com/vi/test/maxresdefault.jpg",
  time: 0,
  duration: 100
});

// Check background.js console:
// Should see message routed to native port
```

---

## 🧪 Testing Checklist

- [ ] **Video Detection**
  - [ ] Play a video on /watch?v=...
  - [ ] Metadata extracted correctly (title, author, thumbnail)
  - [ ] RPC sent to Discord within 1 second
  - [ ] Pause → RPC updates to paused state
  - [ ] Resume → RPC updates to playing state
  - [ ] Seek → Timestamps update correctly

- [ ] **Browsing Activities**
  - [ ] Homepage → shows "Browsing YouTube"
  - [ ] Search → shows "Searching for: [query]"
  - [ ] Channel page → shows "Viewing [channel]'s Channel" + button
  - [ ] Playlist → shows "Browsing Playlist: [name]"
  - [ ] Video RPC → doesn't flicker to paused when browsing

- [ ] **YouTube Music**
  - [ ] Track detection works (/watch?v=...)
  - [ ] Artist avatar fetches correctly
  - [ ] Searching shows "Searching for: [query]"
  - [ ] Artist page shows "Viewing [artist]"

- [ ] **Settings & Validation**
  - [ ] Changing running RPC → RPC updates live
  - [ ] Switching to paused mode → shows paused config
  - [ ] Invalid URL → red border, not saved
  - [ ] Byte limit exceeded → error shown
  - [ ] Save persists across browser restart

- [ ] **Tab Selection**
  - [ ] First active YouTube tab gets RPC
  - [ ] Opening 2nd tab → doesn't override RPC
  - [ ] Closing first tab → RPC cleared
  - [ ] Clicking 2nd tab → RPC updates to 2nd tab

- [ ] **Update Check**
  - [ ] Modal shows if new version available
  - [ ] Can download from modal
  - [ ] Dismissing → doesn't show again for this version
  - [ ] No modal if up-to-date

- [ ] **Error Handling**
  - [ ] Bridge disconnects → modal shows
  - [ ] Re-enabling bridge → reconnects
  - [ ] Restricted page (about:*, moz-extension:*) → toast disabled
  - [ ] Missing author (multi-channel video) → defaults to "YouTube Artist"

---

## 🔗 References

- [Firefox Manifest V3 Docs](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Browser Storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [YouTube Page Structure](https://youtube.com) — use DevTools to inspect DOM

