# Enhanced Discord Rich Presence - Native App (Bridge)

**Developer Guide for the Python Native Messaging Host**

This document explains the native app's architecture, the Discord IPC bridge, and how to build or modify it. If you're looking for user-facing documentation, see the [main README](../README.md).

---

## 📁 Project Structure

```
App/
├── bridge.py              # Core native messaging & Discord RPC logic
├── bridge.spec            # PyInstaller build spec (production)
├── app_manifest.json      # Firefox native host manifest
├── version.txt            # Current version (read at startup)
├── dist/                  # Output directory for built executable
│   └── bridge.exe         # Production executable
├── requirements.txt       # Python dependencies
└── README.md              # This file
```

---

## 🎯 Architecture Overview

### High-Level Design

```
Firefox Extension (popup.js / Activities/*.js)
    ↓ (Native Messaging via stdin/stdout)
bridge.py (Python native host)
    ↓ (Windows Named Pipes)
Discord (listening on \\.\pipe\discord-ipc-{0-9})
```

### What the Bridge Does

1. **Receives messages from Firefox extension** via stdin (JSON)
2. **Manages Discord RPC connections** to multiple services (YouTube, YouTube Music, Custom)
3. **Interpolates placeholders** (%title%, %author%, etc.) with actual data
4. **Sends RPC updates** to Discord via Windows named pipes
5. **Tracks active tabs** and prevents conflicting updates
6. **Responds to extension** with status updates via stdout

---

## 🔧 Core Components

### 1. **MultiServiceBridge Class** — Main Bridge Logic

**Purpose**: Manages connections to Discord and handles all RPC operations.

```python
class MultiServiceBridge:
    CLIENT_IDS = {
        'Youtube': "1455508804174217287",
        'YoutubeMusic': "1455508987943452817",
        'Custom': "1456418631951974442"
    }
```

**Key Attributes**:

| Attribute | Purpose |
|-----------|---------|
| `self.pipes` | Dictionary of open Discord IPC pipes per service |
| `self.tab_to_service` | Maps `tabId` → `service` name |
| `self.last_payload_by_tab` | Stores last message per tab (for re-rendering) |
| `self.selected_tab` | Tracks which tab is **actively** showing RPC per service |

**Key Methods**:

#### `_get_pipe(service_type)`
Connects to Discord's IPC pipe for a specific service.

```python
def _get_pipe(self, service_type):
    # Tries pipes 0-9 until one connects
    # Opens: \\.\pipe\discord-ipc-{i}
    # Sends handshake: {"v": 1, "client_id": CLIENT_ID}
    # Caches pipe for reuse
```

**Why Multiple Pipes?**
- Discord allows one RPC activity per client ID
- Each service (YouTube, Music, Custom) needs its own client ID
- Each client ID needs its own pipe connection
- Pipes are reused for performance

#### `_send_frame(pipe, op, payload)`
Low-level pipe communication (opcode 0 = handshake, opcode 1 = command).

```python
def _send_frame(self, pipe, op, payload):
    # Frames: [opcode (4 bytes)] [length (4 bytes)] [JSON data]
    data = json.dumps(payload).encode("utf-8")
    header = struct.pack("<II", op, len(data))
    win32file.WriteFile(pipe, header + data)
```

#### `_interpolate_placeholders(text, payload)`
Replaces placeholder strings with actual values.

```python
# Input:  "Watching %title% by %author%"
# Payload: {"title": "Alan Walker - Alone", "author": "Alan Walker"}
# Output: "Watching Alan Walker - Alone by Alan Walker"
```

**Supported Placeholders**:
- `%title%` — Video/track title
- `%thumbnail%` — Video thumbnail URL
- `%url%` — Current page URL
- `%author%` — Creator/artist name
- `%author_avatar%` — Avatar image URL
- `%author_url%` — Author profile URL
- `%channel%` — Channel name (browsing)
- `%query%` — Search query
- `%playlist%` — Playlist name

#### `update(message)`
Routes incoming messages to appropriate handler.

**Tab Selection Logic**:
```python
def update(self, message):
    service = message.get("currentSite")  # "Youtube", "YoutubeMusic", "Custom"
    tabId = message.get("tabId")
    isActiveTab = message.get("isActiveTab")  # From browser.tabs.query({active: true})
    
    # Save payload for potential re-render
    self.last_payload_by_tab[tabId] = message
    self.tab_to_service[tabId] = service
    
    # Select this tab if no tab is currently selected AND it's the active tab
    if self.selected_tab.get(service) is None and isActiveTab:
        self.selected_tab[service] = tabId
    
    # Only render if this tab is the selected one
    if self.selected_tab.get(service) == tabId:
        self._render_rpc(message)
```

**Why This Logic?**
- Prevents **multiple tabs** from fighting for RPC control
- Once a tab is selected, it stays selected until **closed**
- When selected tab closes, RPC is cleared (no fallback to other tabs)
- User must **manually click** on a YouTube tab to re-activate RPC

#### `_render_rpc(message)`
Constructs the Discord RPC payload and sends it via IPC.

**Input Message Structure**:
```python
{
    "action": "VIDEO_RESUMED",
    "currentSite": "Youtube",
    "tabId": 123,
    "payload": {
        "title": "Alan Walker - Alone",
        "author": "Alan Walker",
        "url": "https://www.youtube.com/watch?v=1-xGerv5FOk",
        "thumbnail": "https://img.youtube.com/vi/1-xGerv5FOk/maxresdefault.jpg",
        "time": 45.5,  # current position
        "duration": 213.0  # total duration
    },
    "settings": {
        "type": 3,  # 0=Playing, 2=Listening, 3=Watching, 5=Competing
        "details": "%title%",
        "state": "by %author%",
        "timestamps": {"start": true, "end": true},
        "assets": {
            "large": {
                "enabled": true,
                "large_image": "%thumbnail%",
                "large_text": "%title%"
            },
            "small": {
                "enabled": true,
                "small_image": "%author_avatar%",
                "small_text": "%author%"
            }
        },
        "buttons": {
            "1": {"enabled": true, "label": "Watch Video", "url": "%url%"},
            "2": {"enabled": false, "label": "", "url": ""}
        },
        "special": {
            "custom_name": false,
            "details_url": {"enabled": false, "url": ""},
            "state_url": {"enabled": false, "url": ""},
            "large_image_url": {"enabled": true, "url": "%url%"},
            "small_image_url": {"enabled": false, "url": ""}
        }
    }
}
```

**RPC Construction**:
1. **Interpolate all text fields** with placeholders
2. **Handle timestamps**:
   - If video data exists (duration > 0):
     - `start` = `now - currentTime` (shows elapsed)
     - `end` = `now + (duration - currentTime)` (shows when video ends)
   - If custom RPC (no video data):
     - Use provided timestamps or current time
3. **Add assets** (images with optional clickable URLs)
4. **Add buttons** (up to 2 clickable actions)
5. **Send via Discord IPC** with `SET_ACTIVITY` command

**Output to Discord**:
```python
self._send_frame(pipe, 1, {
    "cmd": "SET_ACTIVITY",
    "args": {
        "pid": os.getpid(),
        "activity": {
            "type": 3,
            "details": "Alan Walker - Alone",
            "state": "by Alan Walker",
            "timestamps": {"start": 1672531200, "end": 1672531413},
            "assets": {
                "large_image": "https://img.youtube.com/vi/...",
                "large_text": "Alan Walker - Alone",
                "small_image": "https://yt3.ggpht.com/...",
                "small_text": "Alan Walker"
            },
            "buttons": [
                {"label": "Watch Video", "url": "https://..."},
                {"label": "View Channel", "url": "https://..."}
            ]
        }
    },
    "nonce": "1672531345"
})
```

#### `handle_tab_close(tabId)`
Called when a tab closes; clears selection if it was the active tab.

```python
def handle_tab_close(self, tabId):
    service = self.tab_to_service.get(tabId)
    was_selected = (self.selected_tab.get(service) == tabId)
    
    # Clean up mappings
    del self.tab_to_service[tabId]
    del self.last_payload_by_tab[tabId]
    
    # If this was the selected tab, clear RPC
    if was_selected:
        del self.selected_tab[service]
        # Send SET_ACTIVITY with None to clear Discord presence
        self._send_frame(pipe, 1, {
            "cmd": "SET_ACTIVITY",
            "args": {"pid": os.getpid(), "activity": None}
        })
```

---

### 2. **Message Handlers** — Action Processing

#### `VIDEO_RESUMED` / `VIDEO_PAUSED` / `VIDEO_SKIPPED`
- Updates RPC when user plays, pauses, or seeks in video
- Routes to `_render_rpc()`

#### `BROWSING_ACTIVITY`
- Shows RPC for non-video YouTube pages (homepage, channel, search)
- Similar rendering as video activity but with simplified RPC (no buttons/timestamps)

#### `UPDATE_CUSTOM`
- Handles Custom RPC mode (independent of YouTube)
- No tab tracking (Custom broadcasts globally)

#### `TAB_CLOSED`
- Calls `handle_tab_close(tabId)` to clean up

#### `REFRESH`
- Reloads all settings from extension and re-renders active RPC
- Used when user modifies settings in popup

#### `CLEAR_RPC`
- Clears presence on all services

#### `CLEAR_SERVICE`
- Clears presence for specific service only

#### `SELECT_TAB`
- Force-selects a tab for a service (used by popup "Select Active Tab" button)
- Bypasses normal selection logic

#### `GET_STATUS`
- Returns current bridge state (selected tabs, RPC data)

#### `GET_VERSION`
- Returns version from `version.txt`

---

### 3. **Version Management**

```python
def get_app_version() -> str:
    """Read version from version.txt"""
    candidates = [
        os.path.join(sys._MEIPASS, 'version.txt'),  # PyInstaller bundle
        os.path.join(os.path.dirname(sys.executable), 'version.txt'),
        os.path.join(os.path.dirname(__file__), 'version.txt')
    ]
    # Try each path until one succeeds
```

**Why Multiple Paths?**
- When running as `.exe` (PyInstaller), version is in bundle
- When running as script, version is in same directory
- Fallback logic ensures robustness

---

### 4. **Main Loop**

```python
def main():
    bridge = MultiServiceBridge()
    
    while True:
        # Read message length (4 bytes, little-endian)
        raw_length = sys.stdin.buffer.read(4)
        if not raw_length: break
        
        # Read message JSON
        msg_length = struct.unpack('@I', raw_length)[0]
        message = json.loads(sys.stdin.buffer.read(msg_length).decode('utf-8'))
        
        # Route by action
        action = message.get("action")
        if action in ["VIDEO_RESUMED", "VIDEO_PAUSED", ...]:
            bridge.update(message)
        elif action == "TAB_CLOSED":
            bridge.handle_tab_close(...)
        # ... etc
```

---

## 🛠️ Building the App

### Prerequisites
- Python 3.8+
- PyInstaller
- pywin32

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Install PyInstaller (for building the exe. Alternatively you can make it a batch file instead of an exe)
pip install PyInstaller
```

### Build Process

```bash
cd App
python -m PyInstaller bridge.spec
```

**Output**: `dist/bridge.exe`

### Build Configuration (bridge.spec)

```python
a = Analysis(
    ['bridge.py'],
    datas=[('version.txt', '.')],  # Include version.txt in bundle
    # ...
)

exe = EXE(
    # ...
    console=False,  # No console window (production)
    # ...
)
```

---

## 📊 Data Flow Example

### Scenario: User plays a YouTube video

```
1. Extension detects play event
   → Youtube.js sends {"action": "VIDEO_RESUMED", "payload": {...}, "settings": {...}}

2. background.js routes to native app
   → Sends via browser.runtime.connectNative() (stdin)

3. bridge.py receives on stdin
   → Parses JSON, calls bridge.update(message)

4. bridge.update() executes
   → Calls self._render_rpc(message)

5. _render_rpc() constructs Discord payload
   → Interpolates placeholders
   → Checks timestamps
   → Builds activity object

6. _send_frame() sends to Discord
   → Connects to \\.\pipe\discord-ipc-0 (if not cached)
   → Sends SET_ACTIVITY command
   → Discord updates user's profile

7. bridge.send_to_extension() sends response
   → Logs success or error via stdout
   → Extension popup updates (if user has settings open)
```

---

## 🔌 Windows Named Pipes Explanation

### What Are Named Pipes?

Named pipes are a Windows IPC (Inter-Process Communication) mechanism:
- **Local-only** (can't network over internet)
- **Duplex** (bidirectional communication)
- **Reliable** (guaranteed delivery)

Discord listens on: `\\.\pipe\discord-ipc-{n}` where `n` is 0–9

### How Bridge Connects

```python
pipe = win32file.CreateFile(
    rf"\\.\pipe\discord-ipc-{i}",
    win32file.GENERIC_READ | win32file.GENERIC_WRITE,
    0, None,
    win32file.OPEN_EXISTING,
    win32file.FILE_FLAG_OVERLAPPED,
    None
)
```


---

## 📝 Message Protocol

### Extension → Bridge (stdin)

**Format**: 4-byte length + JSON

```
┌─────────┬──────────┬─────────────┐
│ Length  │ Opcode?  │ JSON Data   │
│ 4 bytes │ (in JSON)│ (UTF-8)     │
└─────────┴──────────┴─────────────┘
```

**Example**:
```json
{
    "action": "VIDEO_RESUMED",
    "currentSite": "Youtube",
    "tabId": 123,
    "isActiveTab": true,
    "payload": { ... },
    "settings": { ... }
}
```

### Bridge → Extension (stdout)

**Format**: Same as above

**Example Responses**:
```json
{"action": "STATUS_RESPONSE", "selected_tabs": {"Youtube": 123, "YoutubeMusic": 456}}
{"action": "VERSION_RESPONSE", "version": "pre-0.7.5"}
```

---

## 🧠 Timestamp Handling (Important!)

Discord supports two timestamp modes:

### Video RPC (Elapsed Time)
When playing a video with known duration:
```python
now = int(time.time())
start = now - currentTime  # When video "started" (relative to current playback)
end = now + (duration - currentTime)  # When video will "end"
```

Discord shows: `1:23 / 3:45` (elapsed / total)

### Custom RPC (Absolute Time)
For activities without duration:
```python
start = provided_timestamp  # Absolute Unix time
# (optionally) end = provided_timestamp + duration
```

Discord shows: `Started 2 hours ago`

---

## 🧪 Testing the Bridge

### Manual Test (Python)

```bash
# Run bridge in foreground
python App/bridge.py

# In another terminal, send JSON test message
echo '{"action": "GET_VERSION"}' | your_json_encoder | bridge.py
```

### With Discord

```bash
# Start Discord
# Run bridge
# Open YouTube in Firefox
# Click play on any video
# Check Discord profile for activity
```

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "Pipe not found" | Discord not running | Start Discord first |
| RPC appears then disappears | Tab closed | Keep the YouTube tab open |
| Placeholder not replaced | Wrong placeholder name | Check supported placeholders list |
| Long string truncated | Exceeded byte limit | Discord enforces 128-byte limits |

---

## 🔄 Paused Behavior

When a video is paused, the extension sends `VIDEO_PAUSED`:

**If `rpcYoutube.showPausedRpc` = `true`**:
- Bridge renders the "paused" configuration (e.g., "PAUSED: %title%")

**If `rpcYoutube.showPausedRpc` = `false`**:
- Extension converts `VIDEO_PAUSED` into `TAB_CLOSED` before sending
- Bridge clears the RPC entirely

---

## 🚀 Performance Optimizations

- **Pipe Caching**: Once connected to Discord, pipe is reused (don't reconnect)
- **Payload Caching**: Last payload per tab is cached (for `REFRESH` action)
- **Lazy Connection**: Only connects to Discord when first RPC needed
- **No Polling**: Waits for messages from extension (event-driven)

---

## 📚 Additional Resources

- [Discord RPC Documentation](https://discord.com/developers/docs/rich-presence/how-to) (This doesn't have everything included i.e. details_url which is here used)
- [Windows Named Pipes](https://docs.microsoft.com/en-us/windows/win32/ipc/named-pipes)
- [PyInstaller Docs](https://pyinstaller.org/)