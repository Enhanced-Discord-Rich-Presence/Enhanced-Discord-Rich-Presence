
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Version](https://img.shields.io/badge/version-1.2.0-orange.svg)](App/version.txt) [![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)](#) [![Firefox](https://img.shields.io/badge/Firefox-WebExtension-orange.svg)](#)

<table align="center">
  <tr>
    <td width="100" valign="middle">
      <img src="./Extension/src/images/main_settings.png" width="80" alt="Logo">
    </td>
    <td valign="middle">
      <h1 style="margin:0;">Enhanced Discord RPC</h1>
      <p style="margin:4px 0 0;">
        <i>Display your YouTube and YouTube Music activity directly in Discord with rich,
        customizable presence information.</i>
      </p>
    </td>
  </tr>
</table>


| Multi-Activity Support | Solo Viewing | Paused State Handling |
| :---: | :---: | :---: |
| <img src="./Extension/src/images/all_together.png" width="100%"> | <img src="./Extension/src/images/watching_youtube_solo.png" width="100%"> | <img src="./Extension/src/images/listening_ytmusic_paused_youtube.png" width="100%"> |

---

## 🎯 Overview

**Enhanced Discord Rich Presence** is a Firefox Extension that automatically detects when you're watching YouTube videos or listening to YouTube Music, and broadcasts this activity to Discord in real-time. Customize every detail of how your activity appears—from the title and state to buttons, images, and timestamps.

### What It Does

- ✅ **YouTube Integration**: Displays video title, author, thumbnail, and current playback time on Discord
- ✅ **YouTube Music Integration**: Shows track title, artist, and album art with playback progress
- ✅ **Browsing Activities**: Shows what page you're on (Homepage, Channel, Shorts, Search, Playlists, etc.)
- ✅ **Full Customization**: Control details, state, images, buttons, timestamps, and more via an intuitive popup UI
- ✅ **Custom RPC**: Create custom Discord activities independent of YouTube/Music

---

## 📋 Table of Contents

- [Installation](#installation)
- [Uninstallation](#uninstallation)
- [Usage](#usage)
  - [Basic Setup](#basic-setup)
  - [Customization](#customization)
- [Features Overview](#features-overview)
- [Known Issues](#known-issues)
- [Architecture](#architecture)

---

## 💾 Installation

### Prerequisites

- **Windows 10/11** (Windows only for now)
- **Firefox**
- **Discord**

### Step 1: Download the Native App

1. Go to the [Releases page](../../releases/latest)
2. Download `Enhanced_RPC_Installer_[version].exe`
3. Run the installer and follow the on-screen instructions
   - The installer will:
     - Extract the native app to your system
     - Register it with Firefox for native messaging

### Step 2: Install the Firefox Extension


1. **For Released Version:**
   - Install directly from the [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/)
2. **For Development:** ⬅️<u>❌ normal users skip this step!</u>
   - Open `about:debugging#/runtime/this-firefox` in Firefox
   - Click **Load Temporary Add-on**
   - Navigate to the `Extension/` folder in this repository
   - Select the `manifest.json` file

### Step 3: Verify Installation

1. Open the extension popup (click the icon in your toolbar)
2. You should see the main settings page with "YouTube," "YouTube Music," and "Custom Activity" sections
3. If you see error messages about the native app, ensure the installer ran successfully
4. Start playing a YouTube video or YouTube Music track—you should see activity on Discord within a few seconds

### Troubleshooting Installation

| Issue | Solution |
|-------|----------|
| "Native App Not Installed" | Re-run the installer from Releases or check that the native app executable exists in your system folder |
| Extension doesn't load | Ensure Firefox is updated to the latest version.|
| RPC doesn't appear on Discord | Ensure Discord is running; try closing and reopening Discord; check that the YouTube tab is active |

---

## 🗑️ Uninstallation

### Remove the Firefox Extension

1. Open Firefox
2. Go to **Settings → Add-ons → Extensions**
3. Find "Enhanced Discord Rich Presence"
4. Click the **Remove** button

### Remove the Native App

1. Open **Settings → Apps → Installed Apps** (Windows 11) or **Control Panel → Programs → Programs and Features** (Windows 10)
2. Find "Enhanced Discord RPC version x.y.z"
3. Click **Uninstall** and follow the prompts


---

## 🚀 Usage

### Basic Setup

Once installed, the extension is ready to use out of the box:

1. **Navigate to YouTube or YouTube Music**
2. **Play a video or track**
3. **Check Discord** — your activity should appear in your profile within seconds

The extension runs in the background and automatically detects when you're on YouTube or YouTube Music pages.

### Customization

Click the **Enhanced Discord Rich Presence icon** in your Firefox toolbar to open the settings popup:

#### Main Toggle
- **Power Button (top-right)**: Enable/disable all RPC activity
- **Status Indicator**: Shows whether RPC is activated or disabled

#### YouTube Section
Customize how your video activity appears:

- **Enable Configuration**: Turn YouTube RPC on/off
- **Activity Type**: Choose "Watching" (default) or other types
- **Custom Activity Name**: Override the activity name shown in Discord
- **Details & State**: Set the text shown in the RPC
  - Use placeholders like `%title%`, `%author%`, `%thumbnail%` for dynamic content
- **Image Fields**: Customize large and small images
  - Large image defaults to the video thumbnail
  - Small image defaults to the channel avatar
  - Each image can have clickable URLs
- **Button Fields**: Add up to 2 custom buttons (e.g., "Watch Video", "View Channel")
- **Timeline**: Toggle to show current time and video length
- **Browsing Activities**: Show what page you're on when not watching videos (Homepage, Channel, Shorts, etc.)

#### YouTube Music Section
Similar to YouTube but optimized for music:

- Defaults to "Listening" activity type
- Browsing activities for music discovery (Explore, Albums, Artists, etc.)

#### Custom Activity Section
Create a standalone Discord activity independent of YouTube:

- Fully customizable with no automatic detection
- Use for creative purposes outside of YouTube/Music
- Set your own timestamps and images

### Features Overview

**Dynamic Placeholders:**
- `%title%` - Video/track title
- `%author%` - Creator/artist name
- `%thumbnail%` - Video/album thumbnail
- `%url%` - Current page URL
- `%author_url%` - Author/artist profile URL
- `%channel%` - Channel name (browsing activities)
- `%query%` - Search query (if on search results)
- `%playlist%` - Playlist name

**Browsing Activities:**
When you navigate to non-video YouTube pages (homepage, channel, search, etc.), a custom "Browsing Activity" is shown instead. You can customize the text for each page type.

**Paused Behavior:**
Choose whether to show a custom "paused" RPC or clear the presence entirely when a video/track is paused.

---

## ⚠️ Known Issues

#### Multi-Channel Videos
When a YouTube video features multiple channels (collaborations), `%author_url%` will be empty since there's no single canonical author URL. The author name will still display correctly. It just won't show the button or leave out the url

---

## 🏗️ Architecture

### High-Level Flow

```
YouTube/YouTube Music Page
         ↓
   Activities JS (Content Script)
   - Detects video/track metadata
   - Monitors playback state
         ↓
   background.js (Service Worker)
   - Routes messages to native app
   - Manages tab selection & storage
   - Handles native app communication
         ↓
   bridge.py (Python Native Host)
   - Manages Discord IPC connections
   - Renders RPC with user settings
   - Interpolates placeholders
         ↓
   Discord
   - Displays activity in user profile
```

### Key Components

**Extension** (`Extension/`)
- `manifest.json` — Extension configuration
- `background.js` — Message routing and native communication
- `popup.js` — Settings UI and state management
- `content.js` — Visual notifications
- `Activities/Youtube.js` — YouTube metadata detection
- `Activities/YoutubeMusic.js` — YouTube Music metadata detection

**App** (`App/`)
- `bridge.py` — Core native messaging and Discord RPC logic
- `app_manifest.json` — Firefox native host registration

For detailed technical documentation, see [Extension/README.md](Extension/README.md) and [App/README.md](App/README.md).

---

## 🤝 Contributing

We welcome contributions!

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Enhanced-Discord-Rich-Presence/enhanced-discord-rich-presence
   cd Enhanced-Discord-Rich-Presence
   ```

2. **Install Python dependencies** (for the app)
   ```bash
   pip install -r requirements.txt
   ```

3. **Load the extension in Firefox** (development mode)
   - Open `about:debugging#/runtime/this-firefox`
   - Click **Load Temporary Add-on**
   - Select `Extension/manifest.json`

4. **Build the native app** (when making app changes)
   ```bash
   cd App
   python -m PyInstaller bridge.spec
   ```

### Testing

- Test on actual YouTube and YouTube Music pages
- Verify Discord RPC updates in real-time
- Check settings persistence across browser sessions
- Test all placeholder substitutions
- Verify button and image URLs are clickable

---

## 🔗 Links

- **GitHub Repository**: [Enhanced Discord Rich Presence](../../)
- **Issues & Bug Reports**: [GitHub Issues](../../issues)
- **Feature Requests**: [GitHub Discussions](../../discussions)
- **Firefox Add-ons**: [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/)

---

## 💬 Questions or Issues?

1. Check the [Known Issues](#known-issues) section
2. Open a [GitHub Issue](../../issues) with detailed information

---

**Made with ❤️ for Discord & YouTube lovers**