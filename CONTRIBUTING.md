# Contributing to Enhanced Discord Rich Presence

Thank you for considering contributing to Enhanced Discord Dich presence. We appreciate it a lot!

---

## Prerequisites

Before contributing, make sure you understand which part of the project you are working on.

### If you are working on `App/`
The Native App requires:

- Python 3.10+ installed
- `pip` (Python package manager)

You will also need to install dependencies:

```bash
pip install -r requirements.txt
```

You will also need **Inno Setup** to build the Windows installer.

- Inno Setup (used to package the application into a Windows `.exe` installer)  
  https://jrsoftware.org/isinfo.php

### If you are working on `Extension/`
The browser extension does **not require Python or any setup dependencies**


---

## Setup

### Fork and Clone the Repository

Before making any changes, you must fork and clone the full repository:
1. Fork the repository on Github: https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence
2. Clone your fork loccally:
    ```bash
    git clone https://github.com/YOUR_USERNAME/Enhanced-Discord-Rich-Presence.git
    cd Enhanced-Discord-Rich-Presence
    ```

---

### Now you're ready to code!

When you're finished with coding, see our [Building Documentation](./docs/BUILD.md) to build and try it.

---

## Pull Requests

Once you have finished your changes and tested them, follow these steps to submit them for review.

### 1. Create a new branch

Never work directly on `main`.

```bash
git checkout -b my-feature
```

Replace `my-feature` with a short description of your change, such as:

```bash
git checkout -b fix-youtube-detection
git checkout -b add-spotify-support
```

### 2. Commit your changes

Stage your changes:

```bash
git add .
```

Create a commit:

```bash
git commit -m "Fix YouTube detection on Shorts pages"
```

Try to keep commit messages short and descriptive.

### 3. Push your branch

Push your branch to your fork:

```bash
git push origin my-feature
```

### 4. Open a Pull Request

1. Visit your fork on GitHub.
2. Click **Compare & pull request**.
3. Open the Pull Request against the `main` branch of the original repository.
4. Clearly describe:
   - What was changed
   - Why the change was made
   - How it was tested

You can also open a Pull Request directly from:

https://github.com/Enhanced-Discord-Rich-Presence/Enhanced-Discord-Rich-Presence/pulls