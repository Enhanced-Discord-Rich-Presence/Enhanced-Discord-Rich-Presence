import sys
import os


if sys.platform.startswith("win"):
    platform = "windows"
elif sys.platform.startswith("linux"):
    platform = "linux"
elif sys.platform.startswith("darwin"):
    platform = "macos"
else:
    platform = "unknown"

if platform == "windows":
    import win32file
    import threading
elif platform in {"linux", "macos"}:
    import socket


def main() -> None:
    pass


def _show_manual_launch_warning():
    title = "Enhanced Discord Rich Presence"
    message = (
        "This is a Native Messaging Host for the Enhanced Discord Rich Presence extension.\n\n"
        "It is meant to be launched automatically by the browser, not manually.\n"
        "You do not need to keep this open or run it yourself."
    )

    if platform == "windows":
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, message, title, 0x40 | 0x0)
        
    elif platform == "linux":
        import subprocess

        if os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"):
            for cmd in (
                ["notify-send", title, message],
                ["zenity", "--info", f"--title={title}", f"--text={message}"],
                ["kdialog", "--msgbox", message],
            ):
                try:
                    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    return
                except (FileNotFoundError, subprocess.CalledProcessError):
                    continue

        print(f"{title}\n{message}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_manual_launch_warning()
        sys.exit(0)
    main()