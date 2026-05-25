# Changelog

### Added
- added **Linux** support.
- added Support for:
  - `Google Chrome`
  - `Microsoft Edge`
  - `Opera`
  - `Opera GX`
  - `Brave`
  - `Vivaldi`
  - `Chromium*`

>`*`Chromium is supported, but some Browsers may have different Registry locations which makes them not work. If your browser doesn't work, feel free to open an Issue and I'll check if I can add it!

### Changed
- changed it so you can now change (or remove) the third line in `Listening` and `Competing` state.

## Repository Changelog

### Added
- added a github workflow to build and publish new versions more easily.
- added `.github/FUNDING.yml` if you want to support this project <3
- created and added `install-template-linux.sh` in new `build/` folder.
- added `BUILD.md` in `docs/`.
- added `CONTRIBUTING.md`.

### Changed
- Releases are now done automatically via github workflow.
- Releases were made a bit more cleanly.
- swapped (previously hidden) `changelog.txt` into (public) `CHANGELOG.md`.
- moved `setup.iss` into `build/`.
- moved `Discord_IPC.md` to `docs/`.
- adjusted `.gitignore` to have some IDE things
- adjusted `Bug report` Issue template to contain information about Linux.


## Known Issues

- When the Extension is active across multiple browser windows simultaneously, executing the same Activity causes a race condition that leads to unpredictable behavior.