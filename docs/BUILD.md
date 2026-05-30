## Building & Testing

Before opening a Pull Request, please test your changes locally.

---

### Testing the Extension

If you already have the released version of Enhanced Discord Rich Presence installed, temporarily disable it to avoid conflicts with your development version.

##### Steps before starting

1. Duplicate either `manifest.chrome.json` or `manifest.firefox.json` (depending on your target browser).
2. Rename the duplicated file to `manifest.json`.

Once completed, proceed with the steps below.

#### Firefox

1. Open Firefox.
2. Navigate to `about:debugging#/runtime/this-firefox`.
3. Under **Temporary Extensions**, click **Load Temporary Add-on...**
4. Open the `Extension/` folder and select `manifest.json`.

The extension will now be loaded using your local files.

> [!NOTE]
> Temporary extensions are removed automatically when Firefox is closed. If you modify `manifest.json`, background scripts, or content scripts, you will need to click **Reload** on the extension entry in `about:debugging`.

#### Chrome

1. Open Chrome.
2. Navigate to `chrome://extensions/`.
3. In the top-right corner, toggle the **Developer mode** switch to **On**.
4. In the top-left corner, click **Load unpacked**.
5. Select the `Extension/` folder (the directory containing your `manifest.json` file).

The extension will now be loaded using your local files.

#### Applying Changes

Most UI-related changes (HTML, CSS, popup pages, etc.) can be tested by refreshing the affected page or reopening the extension popup. 

> [!IMPORTANT]
> If you make changes to your local `manifest.json`, ensure you port those updates back into both `manifest.chrome.json` and `manifest.firefox.json` before committing!

---

### Build and Download the Installer

Instead of building the installers locally, you can generate them automatically using GitHub Actions. This will create ready-to-use packages for both Windows and Linux.

#### Step 1: Run the Build Workflow

1. Navigate to your repository on GitHub and click the **Actions** tab.
2. In the left sidebar, select the **Dev Build** workflow.
3. Click the **Run workflow** dropdown on the right.
4. Select the branch containing your changes.
5. In the **version** field, enter your desired version. 
   > [!NOTE]
   > This should follow the standard versioning format: `v{major}.{minor}.{patch}` (e.g., `v1.0.0` or `v1.0.0_dev`).
6. Click the green **Run workflow** button.

#### Step 2: Download the Artifacts

1. Wait roughly 2 minutes for the workflow jobs (`prepare`, `windows`, and `linux`) to complete successfully.
2. Click on the completed workflow run from the list.
3. Scroll down to the **Artifacts** section at the bottom of the page.
4. Download the generated `.zip` file for your operating system (Windows or Linux).

After downloading, extract the archive and install it normally as described in the [README](../README.md#-installation).

---

#### Before submitting a Pull Request

Make sure:

- [ ] The GitHub Actions build workflow passes without errors.
- [ ] The generated installer from the GitHub artifact installs and runs correctly.
- [ ] Your extension changes behave as expected in the browser.
- [ ] Manifest changes are synced back to `manifest.chrome.json` and `manifest.firefox.json`.