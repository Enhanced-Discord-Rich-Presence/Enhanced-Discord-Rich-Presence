import sys
import json
import os
import struct
import time
import win32file
from urllib.parse import urlparse, parse_qs


class MultiServiceBridge:
    CLIENT_IDS = {
        'Youtube': "1455508804174217287",
        'YoutubeMusic': "1455508987943452817"
    }

    def __init__(self):
        self.pipes = {}
        self.tab_to_service = {}       # tabId -> service
        self.last_payload_by_tab = {}  # tabId -> {message_data}
        self.selected_tab = {}         # service -> tabId
    
    def _get_pipe(self, service_type):
        if service_type in self.pipes:
            return self.pipes[service_type]

        client_id = self.CLIENT_IDS.get(service_type)

        for i in range(10):
            try:
                pipe_name = rf"\\.\pipe\discord-ipc-{i}"
                pipe = win32file.CreateFile(
                    pipe_name,
                    win32file.GENERIC_READ | win32file.GENERIC_WRITE,
                    0,
                    None,
                    win32file.OPEN_EXISTING,
                    win32file.FILE_FLAG_OVERLAPPED | win32file.FILE_ATTRIBUTE_NORMAL,
                    None
                )
                
                self._send_frame(pipe, 0, {"v": 1, "client_id": client_id})
                time.sleep(1)
                
                self.pipes[service_type] = pipe
                return pipe
            except Exception as e:
                continue
        return None
    
    def _send_frame(self, pipe, op, payload):
        if not pipe: return
        try:
            data = json.dumps(payload).encode("utf-8")
            header = struct.pack("<II", op, len(data))
            win32file.WriteFile(pipe, header + data)
        except Exception as e:
            pass
    
    def _interpolate_placeholders(self, text, payload):
        "TODO: Make that url of the video is to the video. Not the mix or so"
        if text is None: return ""
        
        def _url_to_thumbnail(url):
            if not url: return ""
            try:
                parsed = urlparse(url)
                video_id = parse_qs(parsed.query).get('v', [None])[0]
                return f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg" if video_id else ""
            except Exception:
                return ""

        placeholders = {
            "%title%": payload.get("title", ""),
            "%thumbnail%": _url_to_thumbnail(payload.get("url", "")),
            "%url%": payload.get("url", ""),
            "%author%": payload.get("author", "YouTube"),
            "%author_avatar%": payload.get("author_avatar", ""),
            "%author_url%": payload.get("author_url", ""),
        }
        
        result = str(text)
        for placeholder, value in placeholders.items():
            result = result.replace(placeholder, str(value if value is not None else ""))
        return result

    def update(self, message):
        action = message.get("action", "")
        service = message.get("currentSite", "Youtube")
        tabId = message.get("tabId")

        if tabId is None: return

        self.tab_to_service[tabId] = service
        self.last_payload_by_tab[tabId] = message

        if service not in self.selected_tab:
            self.selected_tab[service] = tabId
        
        if self.selected_tab.get(service) == tabId:
            self._render_rpc(message)
        else:
            pass
    
    def _render_rpc(self, message):
        payload = message.get("payload", {})
        action = message.get("action", "")
        service = message.get("currentSite", "Youtube")
        settings = message.get("settings", {})
    
        pipe = self._get_pipe(service)
        if not pipe: return

        now = int(time.time())
        
        try:
            raw_time = payload.get("time")
            current_time = float(raw_time) if raw_time is not None else 0.0
            raw_duration = payload.get("duration")
            total_duration = float(raw_duration) if raw_duration is not None else 0.0
        except (TypeError, ValueError):
            current_time = 0.0
            total_duration = 0.0

        try:
            assets_cfg = settings.get("assets", {})
            large_cfg = assets_cfg.get("large", {})
            small_cfg = assets_cfg.get("small", {})
            assets = {}
            if large_cfg.get("enabled"):
                img = self._interpolate_placeholders(large_cfg.get("large_image"), payload)
                txt = self._interpolate_placeholders(large_cfg.get("large_text"), payload)
                if img: assets["large_image"] = img
                if txt: assets["large_text"] = txt

            if small_cfg.get("enabled"):
                img = self._interpolate_placeholders(small_cfg.get("small_image"), payload)
                txt = self._interpolate_placeholders(small_cfg.get("small_text"), payload)
                if img: assets["small_image"] = img
                if txt: assets["small_text"] = txt
            
            btns = []
            btn_settings = settings.get("buttons", {})
            for key in ["1", "2"]:
                button = btn_settings.get(key)
                if button and button.get("enabled"):
                    label = self._interpolate_placeholders(button.get("label"), payload)
                    url = self._interpolate_placeholders(button.get("url"), payload)
                    if label and url:
                        btns.append({"label": label, "url": url})

            timestamps = {}
            if action != "VIDEO_PAUSED":
                if settings.get("timestamps", {}).get("start"):
                    timestamps["start"] = int(now - current_time)
                if settings.get("timestamps", {}).get("end"):
                    timestamps["end"] = int(now + (total_duration - current_time))
                else:
                    if settings.get("timestamps", {}).get("start"):
                        timestamps["start"] = 0

            activity = {
                "type": int(settings.get("type", 3)),
                "details": self._interpolate_placeholders(settings.get("details"), payload),
                "state": self._interpolate_placeholders(settings.get("state"), payload),
            }
            if assets: activity["assets"] = assets
            if timestamps: activity["timestamps"] = timestamps            
            if btns: activity["buttons"] = btns


            self._send_frame(pipe, 1, {
                "cmd": "SET_ACTIVITY",
                "args": {"pid": os.getpid(), "activity": activity},
                "nonce": str(now)
            })
        except Exception:
            pass

    def handle_tab_close(self, tabId):
        # TODO: When a second video is playing and not paused, it will use the starting time as the start time and not the current one. Somehow need to get it.
        service = self.tab_to_service.get(tabId)
        if not service:
            return

        was_selected = self.selected_tab.get(service) == tabId
        
        self.tab_to_service.pop(tabId, None)
        self.last_payload_by_tab.pop(tabId, None)

        if was_selected:
            remaining_tabs = [t for t, s in self.tab_to_service.items() if s == service]
            
            if remaining_tabs:
                new_tab_id = remaining_tabs[0]
                self.selected_tab[service] = new_tab_id
                
                fallback_msg = self.last_payload_by_tab.get(new_tab_id)
                if fallback_msg:
                    self._render_rpc(fallback_msg)
            else:
                if service in self.selected_tab:
                    del self.selected_tab[service]
                
                pipe = self.pipes.get(service)
                if pipe:
                    self._send_frame(pipe, 1, {
                        "cmd": "SET_ACTIVITY",
                        "args": {"pid": os.getpid(), "activity": None},
                        "nonce": str(int(time.time()))
                    })

    def force_select_tab(self, service, tabId):
        self.selected_tab[service] = tabId
        if tabId in self.last_payload_by_tab:
            self._render_rpc(self.last_payload_by_tab[tabId])


def main():
    bridge = MultiServiceBridge()
    while True:
        try:
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length: break
            msg_length = struct.unpack('@I', raw_length)[0]
            message = json.loads(sys.stdin.buffer.read(msg_length).decode('utf-8'))
            
            action = message.get("action", "")
            if action in ["VIDEO_RESUMED", "VIDEO_SKIPPED", "VIDEO_PAUSED"]:
                bridge.update(message)
            elif action == "TAB_CLOSED":
                bridge.handle_tab_close(message.get("tabId"))
        except Exception as e:
            pass


if __name__ == "__main__":
    main()