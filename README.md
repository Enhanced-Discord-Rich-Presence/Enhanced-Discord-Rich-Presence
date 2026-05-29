[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/aqusorias)

<p align="center"><img src="Extension/src/icons/icon.png" width="128" alt="MAS Logo"></p>

<h1 align="center">Enhanced Discord Rich Presence</h1>

<p align="center">
  Display your YouTube & YouTube Music activity directly in Discord with rich, customizable presence information.
</p>

<hr>


<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/">
    <img src="https://img.shields.io/badge/Firefox_Add--on-FF7139?logo=firefox-browser&logoColor=white" alt="Firefox Add-on">
  </a>

  <a href="https://chromewebstore.google.com/detail/jnlnkdmjkphemglpbgamnobklkhjpkco">
    <img src="https://img.shields.io/badge/Chrome_Web_Store-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Web Store">
  </a>

  <!--<a href="https://addons.opera.com/">
    <img src="https://img.shields.io/badge/Opera_Add--ons-FF1B2D?logo=opera&logoColor=white" alt="Opera Add-ons">
  </a>

  <a href="https://microsoftedge.microsoft.com/addons">
    <img src="https://img.shields.io/badge/Edge_Add--ons-0078D7?logo=microsoftedge&logoColor=white" alt="Microsoft Edge Add-ons">
  </a>--> •

  <a href="https://chromewebstore.google.com/detail/jnlnkdmjkphemglpbgamnobklkhjpkco">
    <img src="https://img.shields.io/badge/Brave-FF4500?logo=brave&logoColor=white" alt="Brave">
  </a>

  <a href="https://chromewebstore.google.com/detail/jnlnkdmjkphemglpbgamnobklkhjpkco">
    <img src="https://img.shields.io/badge/Vivaldi-EF3939?logo=vivaldi&logoColor=white" alt="Vivaldi">
  </a>
</p>


<p align="center">
  <a href="https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/releases">
    <img src="https://img.shields.io/badge/Windows-0078D6?style=flat" alt="Windows">
  </a>

  <a href="https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/releases">
    <img src="https://img.shields.io/badge/Linux-333333?style=flat&logo=linux&logoColor=white" alt="Linux">
  </a>

  <a href="https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/releases">
    <img src="https://img.shields.io/github/downloads/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/total?style=flat-square&color=blue" alt="Total Downloads">
  </a>
</p>


<p align="center">
  <img src="https://img.shields.io/badge/Extension-v1.4.1-orange"/>
  <img src="https://img.shields.io/badge/Native-v1.4.0-orange"/>
</p>




<table>
  <tr>
    <td width="50%" align="center" valign="middle">
      <img src="./Extension/src/images/main_settings_minimal.png" width="80%" alt="Extension Popup">
    </td>
    <td width="50%" valign="top">

### Extension Popup

Compact version of the extension settings popup.  
Designed for quick access without descriptions.

- Fast configuration
- Lots of customizability
- Ideal for everyone

    </td>
  </tr>
</table>

<br>

<table align="center">
  <tr>
    <td align="center">
      <img src="./Extension/src/images/example_1.png" width="100%"><br>
      Detailed, visually appealing RPCs
    </td>
    <td align="center">
      <img src="./Extension/src/images/example_2.png" width="100%"><br>
      Share your activity beyond just watching
    </td>
    <td align="center">
      <img src="./Extension/src/images/example_3.png" width="100%"><br>
      <strong>YouTube</strong>, <strong>YouTube Music</strong> & <strong>Custom Activity</strong> support
    </td>
  </tr>
</table>

---

## 🛠️ System Requirements

- **Operating System:** Windows *10/11*, Linux *(Ubuntu, Debian, Arch, Fedora, etc.)*
<!--- **Browsers:** Firefox, Chrome, Brave, Vivaldi-->
- **Browsers:** Firefox, Chrome, Brave, Vivaldi
- **Discord:** Stable, Canary, or PTB

> `Important Linux Note:` Discord cannot be installed via Snap, Flatpak, or any other system that installs Discord in a sandbox. You must use a native package manager, `.deb`, or `.tar.gz` installation.

## 🚀 Installation


### Step 1: Download the Native App

#### Windows

1. Go to the [Releases page](../../releases/latest)
2. Download `EnhancedRPC-[version]-windows-setup.exe `
3. Run the installer and follow the on-screen instructions
   - The installer will:
     - Extract the native app to your system
     - Register it with Firefox for native messaging

#### Linux

1. Go to the [Releases page](../../releases/latest)
2. Download `EnhancedRPC-[version]-linux_x86_64-setup.sh `
3. Open your terminal, navigate to the folder where you downloaded the file, and make it executable:
    ```bash
    chmod +x EnhancedRPC-[version]-linux_x86_64-setup.sh 
    ```
4. Run the installer script:
   ```bash
    ./EnhancedRPC-[version]-linux_x86_64-setup.sh
   ```

> [!NOTE]
> This project has currently been tested only on Windows and Ubuntu. Other Linux distributions should work, but compatibility has not been actually verified.
>
> If you encounter issues on a different distribution or environment, please report it by opening a new [issue](../../issues).

### Step 2: Install the Extension

| Browser | download Link |
| :--- | :--- |
| **Firefox** | [Firefox Add-ons Store](https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/) |
| **Chrome / Brave / Vivaldi** | [Chrome Web Store](https://chromewebstore.google.com/detail/jnlnkdmjkphemglpbgamnobklkhjpkco) |
<!-- | **Opera / Opera GX** | [Opera Add-ons Store](https://addons.opera.com/) | -->
<!-- | **Edge** | [Edge Add-ons Store](https://microsoftedge.microsoft.com/addons) | -->
   
### Step 3: Verify Installation

1. Open the extension popup from your browser toolbar
2. Confirm you can see the main sections: YouTube, YouTube Music, and Custom Activity
3. Play a YouTube video or YouTube Music track
   - Discord activity should appear near-instantly

### How to Uninstall

If you need to remove the native app and extension from your system, follow the steps for your operating system:

#### Windows
1. Open **Settings → Apps → Installed apps** (Windows 11) or **Control Panel → Programs → Programs and Features** (Windows 10).
2. Find **EnhancedRPC** in the list.
3. Select **Uninstall** and complete the removal process.
4. Open your browser and remove the extension from your extensions manager.

#### Linux
1. Open your terminal and navigate to the folder containing the installer script.
2. Run the script with the uninstall flag:
```bash
   ./EnhancedRPC-[version]-linux_x86_64-setup.sh uninstall
```
3. Open your browser and remove the extension from your extensions manager.

### Troubleshooting

| Issue | Solution |
|------|----------|
| "Native app not detected" | Re-run the installer from the Releases page or verify that the native executable is correctly installed |
| "Newer app version available" | A newer version is available on GitHub. You can ignore or mute the notification in the extension popup, but updating is recommended |
| Extension not loading | Update Firefox to the latest version and reinstall the extension |
| Discord presence not showing | Ensure Discord is running, restart it, and confirm that media is actively playing on YouTube or YouTube Music |


## 🔗 Links

- **GitHub Repository**: [Enhanced Discord Rich Presence](../../)
- **Issues & Bug Reports**: [GitHub Issues](../../issues)
- **Feature Requests**: [GitHub Discussions](../../discussions)
- **Firefox**: [Firefox Add-ons store](https://addons.mozilla.org/en-US/firefox/addon/enhanced-discord-rich-presence/)
- **Chrome / Brave / Vivaldi**: [Chrome Web Store](https://chromewebstore.google.com/detail/jnlnkdmjkphemglpbgamnobklkhjpkco)
<!-- - **Opera/GX**: [Opera Add-ons](https://addons.opera.com/)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons) -->


