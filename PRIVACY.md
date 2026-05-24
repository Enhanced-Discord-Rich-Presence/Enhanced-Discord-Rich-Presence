# Privacy Policy for Enhanced Discord Rich Presence

Your privacy is extremely important. This Privacy Policy explains how the **Enhanced Discord Rich Presence** browser extension and its desktop companion application handle data. 

The short version: **We do not collect, store, track, or transmit any of your personal data or browsing history.**

---

## 1. No Data Collection or Storage
* **Zero Remote Logging:** We do not own, operate, or maintain any external web servers or databases. 
* **No Persistent Local Storage:** Your browsing history, visited URLs, and media activities are never logged or stored permanently on your hard drive by this extension. 
* **No Tracking or Analytics:** The extension does not contain any telemetry, tracking pixels, or third-party analytics frameworks (like Google Analytics).

## 2. Local-Only Data Processing
To provide the core function of displaying your current media activity on Discord, the extension processes data strictly in real-time, completely inside your local environment:
* **Web Scrape:** Content scripts read active media details (such as song titles, video artists, playback states, and timestamps) exclusively from user-authorized domains (YouTube, YouTube Music, and GitHub).
* **Native Messaging:** The extension passes this data via the browser's native messaging API directly to the companion desktop application (`EnhancedRPC.exe`) installed on your computer.
* **Discord Integration:** The desktop application communicates directly with your locally running Discord client via a local Inter-Process Communication (IPC) socket to update your profile status.

At no point does any of this information leave your local machine or pass through an internet connection to us or any third party.

## 3. Third-Party Websites
This extension interacts with third-party platforms (YouTube and GitHub) to detect your activity. This privacy policy does not cover how those external platforms handle your data. Please refer to the respective privacy policies of Google/YouTube and GitHub for information on their data collection practices.

## 4. Open Source Transparency
As an open-source project, our implementation is fully transparent. You are welcome to review, inspect, or audit the complete source code at any time to verify our data handling practices by visiting our official repository.

## 5. Changes to This Policy
We may update this Privacy Policy from time to time to reflect changes in browser requirements or extension functionality. Any updates will be pushed directly to our repository, and the revision date below will be updated.

---
*Last updated: May 2026*