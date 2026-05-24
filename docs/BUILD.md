## Building & Testing

Before opening a Pull Request, please test your changes locally.

---

### Testing the Extension

If you already have the released version of Enhanced Discord Rich Presence installed, temporarily disable it to avoid conflicts with your development version.

#### Firefox

1. Open Firefox.
2. Navigate to:

   ```
   about:debugging#/runtime/this-firefox
   ```

3. Under **Temporary Extensions**, click **Load Temporary Add-on...**
4. Open the `Extension/` folder and select `manifest.json`.

The extension will now be loaded using your local files.

#### Applying Changes

Most UI-related changes (HTML, CSS, popup pages, etc.) can be tested by refreshing the affected page or reopening the extension popup.

If you modify:

- `manifest.json`
- Background scripts
- Content scripts

click **Reload** on the extension entry in `about:debugging`.

> Temporary extensions are removed automatically when Firefox is closed.

---

### Building the Native App

If you modified anything inside `App/`, please rebuild the application and test it before opening a Pull Request.

---

1. Open a terminal in the `App/` directory:

   ```bash
   cd App
   ```

2. Install the project dependencies:

   ```bash
   pip install -r ../requirements.txt
   ```

3. Build the application:

   ```bash
   pyinstaller --clean bridge.spec
   ```

After this step, confirm:

- `App/dist/EnhancedRPC.exe` exists
- The build completed without errors

---

#### 2. Build the Installer (Windows Setup)

After the app is successfully built, generate the Windows installer using the Inno Setup script.

> This step is required because the installer packages the application into a single, installable `.exe` file. It also sets up important system integration (such as file placement and browser native messaging registration), which cannot be done by simply running the built executable.

This will package the application into a distributable `.exe` installer.

##### Requirements

- The built executable must exist:
  ```
  App/dist/EnhancedRPC.exe
  ```
- Inno Setup must be installed:
  https://jrsoftware.org/isinfo.php

---

##### Build Steps

1. Go back to the project root:

   ```bash
   cd ..
   ```

2. Open the installer script:

   ```
   installer.iss
   ```

3. Compile it using one of the following methods:

   **Option A — Inno Setup GUI (recommended)**  
   - Open Inno Setup Compiler  
   - Click File → Open  
   - Select `installer.iss`  
   - Click Compile  

   **Option B — Command line**

   ```bash
   iscc installer.iss
   ```

---

#### Output

After successful compilation, the installer will be created in:

```
Releases/
```

Example filename:

```
EnhancedRPC-<version>-windows-setup.exe
```

---

#### Before submitting a Pull Request

Make sure:

- [ ] `App/dist/EnhancedRPC.exe` exists
- [ ] The application builds without errors
- [ ] The installer compiles successfully
- [ ] The generated installer runs correctly
- [ ] Your changes behave as expected