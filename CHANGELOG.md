# Changelog

### Changed
- fixed an issue that if the video/song was only 1 character long, it woulds stop the RPC due to the title and state needing to be at least 2 characters long. Thanks to [ImHoppy](https://github.com/ImHoppy) for this PR!
- If users try to manually start the .exe, it will notify them that they don't have to.


## Repository Changelog

### Added
- Added a Dev Build workflow for easier testing of new versions.

### Changed
- Updated `docs/BUILD.md` to contain the new building information using the Dev Build workflow.

## Known Issues

- When the Extension is active across multiple browser windows simultaneously, executing the same Activity causes a race condition that leads to unpredictable behavior.