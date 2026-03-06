import sys
import json
import os
import struct
import time
import win32file
from urllib.parse import urlparse, parse_qs


BROWSING_ACTIVITY_LABELS = {
    "homepage": "Homepage",
    "channel": "Channel Page",
    "shorts": "Shorts",
    "search": "Search",
    "subscriptions": "Subscriptions",
    "library": "Library",
    "history": "History",
    "watchLater": "Watch Later",
    "likedVideos": "Liked Videos",
    "playlist": "Playlist",
    "studio": "Studio",
}


class MultiServiceBridge:
    CLIENT_IDS = {
        'Youtube': "1455508804174217287",
        'YoutubeMusic': "1455508987943452817",
        'Custom': "1456418631951974442"
    }

    def __init__(self):
        self.pipes = {}
        self.tab_to_service = {}       # tabId -> service
        self.last_payload_by_tab = {}  # tabId -> {message_data}
        self.selected_tab = {}         # service -> tabId

    def _invalidate_pipe(self, service_type):
        pipe = self.pipes.pop(service_type, None)
        if not pipe:
            return
        try:
            win32file.CloseHandle(pipe)
        except Exception:
            pass
    
    def _get_pipe(self, service_type):
        if service_type in self.pipes:
            return self.pipes[service_type]

        client_id = self.CLIENT_IDS.get(service_type)
        if not client_id: return None

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
                
                if not self._send_frame(pipe, 0, {"v": 1, "client_id": client_id}, service_type=service_type):
                    try:
                        win32file.CloseHandle(pipe)
                    except Exception:
                        pass
                    continue
                time.sleep(1)
                
                self.pipes[service_type] = pipe
                return pipe
            except Exception:
                continue
        return None
    
    def _send_frame(self, pipe, op, payload, service_type=None):
        if not pipe: return
        try:
            data = json.dumps(payload).encode("utf-8")
            header = struct.pack("<II", op, len(data))
            win32file.WriteFile(pipe, header + data)
            return True
        except Exception:
            if service_type:
                self._invalidate_pipe(service_type)
            return False
    
    def _interpolate_placeholders(self, text, payload):
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
            "%thumbnail%": payload.get("thumbnail", "") or _url_to_thumbnail(payload.get("url", "")),
            "%url%": payload.get("url", ""),
            "%author%": payload.get("author", "YouTube"),
            "%author_avatar%": payload.get("author_avatar", ""),
            "%author_url%": payload.get("author_url", ""),
            "%channel%": payload.get("channel", ""),
            "%query%": payload.get("query", ""),
            "%playlist%": payload.get("playlist", ""),
        }
        
        result = str(text)
        for placeholder, value in placeholders.items():
            result = result.replace(placeholder, str(value if value is not None else ""))
        return result

    def update(self, message):
        service = message.get("currentSite", "Youtube")
        tabId = message.get("tabId")
        action = message.get("action", "")
        is_active = message.get("isActiveTab", False)

        # Browsing activities
        if action == "BROWSING_ACTIVITY":
            if tabId is not None:
                self.tab_to_service[tabId] = service
                self.last_payload_by_tab[tabId] = message
                
                current_selected_id = self.selected_tab.get(service)
                
                # Strict locked selection: only select if NO tab selected AND this tab is active
                if current_selected_id is None and is_active:
                    self.selected_tab[service] = tabId
            
            # Only render if this browsing tab is the selected one
            if self.selected_tab.get(service) == tabId:
                self._render_rpc(message)
            return

        if service == "Custom":
            self._render_rpc(message)
            return

        if tabId is None: return

        self.tab_to_service[tabId] = service
        self.last_payload_by_tab[tabId] = message

        current_selected_id = self.selected_tab.get(service)
        
        if current_selected_id is None and is_active:
            self.selected_tab[service] = tabId
        
        if self.selected_tab.get(service) == tabId:
            self._render_rpc(message)
    
    def _render_rpc(self, message):
        payload = message.get("payload", {})
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
            special_cfg = settings.get("special", {})
            assets_cfg = settings.get("assets", {})
            large_cfg = assets_cfg.get("large", {})
            small_cfg = assets_cfg.get("small", {})

            assets = {}
            if large_cfg.get("enabled"):
                img = self._interpolate_placeholders(large_cfg.get("large_image"), payload)
                txt = self._interpolate_placeholders(large_cfg.get("large_text"), payload)
                if img: assets["large_image"] = img
                if txt: assets["large_text"] = txt
                
                if special_cfg.get("large_image_url", {}).get("enabled"):
                    large_url = self._interpolate_placeholders(special_cfg["large_image_url"].get("url"), payload)
                    if large_url: assets["large_url"] = large_url

            if small_cfg.get("enabled"):
                img = self._interpolate_placeholders(small_cfg.get("small_image"), payload)
                txt = self._interpolate_placeholders(small_cfg.get("small_text"), payload)
                if img: assets["small_image"] = img
                if txt: assets["small_text"] = txt
                
                if special_cfg.get("small_image_url", {}).get("enabled"):
                    small_url = self._interpolate_placeholders(special_cfg["small_image_url"].get("url"), payload)
                    if small_url: assets["small_url"] = small_url
            
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
            timestamp_cfg = settings.get("timestamps", {})
            
            start_val = timestamp_cfg.get("start")
            end_val = timestamp_cfg.get("end")
            
            # Check if we have valid video data (for YouTube/Music)
            has_video_data = total_duration > 0 or current_time > 0
            
            if has_video_data:
                if start_val:
                    if isinstance(start_val, bool):
                        timestamps["start"] = int(now - current_time)
                    elif isinstance(start_val, (int, float)):
                        timestamps["start"] = int(start_val)
                
                if end_val:
                    if isinstance(end_val, bool):
                        timestamps["end"] = int(now + (total_duration - current_time))
                    elif isinstance(end_val, (int, float)):
                        timestamps["end"] = int(end_val)
            else:
                timestamps["start"] = now
                
                if isinstance(end_val, (int, float)) and end_val > 0:
                    timestamps["end"] = int(end_val)
            
            activity = {}
            if special_cfg.get("custom_name") is True:
                activity["name"] = self._interpolate_placeholders(settings.get("name"), payload)
            
            activity["type"] = int(settings.get("type", 0))
            activity["details"] = self._interpolate_placeholders(settings.get("details"), payload)
            activity["state"] = self._interpolate_placeholders(settings.get("state"), payload)
            
            if special_cfg.get("details_url", {}).get("enabled"):
                details_url = self._interpolate_placeholders(special_cfg["details_url"].get("url"), payload)
                if details_url: activity["details_url"] = details_url
            
            if special_cfg.get("state_url", {}).get("enabled"):
                state_url = self._interpolate_placeholders(special_cfg["state_url"].get("url"), payload)
                if state_url: activity["state_url"] = state_url

            if assets: activity["assets"] = assets
            if timestamps: activity["timestamps"] = timestamps            
            if btns: activity["buttons"] = btns

            frame = {
                "cmd": "SET_ACTIVITY",
                "args": {"pid": os.getpid(), "activity": activity},
                "nonce": str(now)
            }

            if not self._send_frame(pipe, 1, frame, service_type=service):
                retry_pipe = self._get_pipe(service)
                if retry_pipe:
                    self._send_frame(retry_pipe, 1, frame, service_type=service)
        except Exception:
            pass

    def handle_tab_close(self, tabId):
        service = self.tab_to_service.get(tabId)
        if not service: return

        was_selected = self.selected_tab.get(service) == tabId
        self.tab_to_service.pop(tabId, None)
        self.last_payload_by_tab.pop(tabId, None)

        if was_selected:
            if service in self.selected_tab: 
                del self.selected_tab[service]
            
            pipe = self.pipes.get(service)
            if pipe:
                self._send_frame(pipe, 1, {
                    "cmd": "SET_ACTIVITY",
                    "args": {"pid": os.getpid(), "activity": None},
                    "nonce": str(int(time.time()))
                }, service_type=service)

    def send_to_extension(self, message):
        try:
            encoded_content = json.dumps(message).encode("utf-8")
            sys.stdout.buffer.write(struct.pack('@I', len(encoded_content)))
            sys.stdout.buffer.write(encoded_content)
            sys.stdout.buffer.flush()
        except Exception:
            pass


def get_app_version() -> str:
    candidates = []
    try:
        candidates.append(os.path.join(os.path.dirname(sys.executable), 'version.txt'))
    except Exception:
        pass

    try:
        base_meipass = getattr(sys, '_MEIPASS', None)
        if base_meipass:
            candidates.append(os.path.join(base_meipass, 'version.txt'))
    except Exception:
        pass

    try:
        candidates.append(os.path.join(os.path.dirname(__file__), 'version.txt'))
    except Exception:
        pass

    for path in candidates:
        try:
            if path and os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return f.read().strip()
        except Exception:
            continue

    return ""


def main():
    bridge = MultiServiceBridge()
    while True:
        try:
            raw_length = sys.stdin.buffer.read(4)
            if not raw_length: break
            msg_length = struct.unpack('@I', raw_length)[0]
            message = json.loads(sys.stdin.buffer.read(msg_length).decode('utf-8'))
            
            action = message.get("action", "")
            
            # Handle standard updates, custom RPC, and browsing activities
            if action in ["VIDEO_RESUMED", "VIDEO_SKIPPED", "VIDEO_PAUSED", "UPDATE_CUSTOM", "BROWSING_ACTIVITY"]:
                bridge.update(message)
            
            elif action == "TAB_CLOSED":
                bridge.handle_tab_close(message.get("tabId"))

            elif action == "SELECT_TAB":
                # Force-select a tab for a given service without clearing.
                # Used by the extension popup to switch the locked selection directly.
                service = message.get("service") or message.get("currentSite")
                tab_id = message.get("tabId")

                ok = False
                try:
                    if service and tab_id is not None:
                        bridge.selected_tab[service] = tab_id
                        bridge.tab_to_service[tab_id] = service
                        ok = True

                        # If we already have payload for this tab, render immediately.
                        last_msg = bridge.last_payload_by_tab.get(tab_id)
                        if last_msg:
                            bridge._render_rpc(last_msg)
                except Exception:
                    ok = False

                if message.get("requestId"):
                    bridge.send_to_extension({
                        "action": "SELECT_TAB_RESPONSE",
                        "ok": ok,
                        "service": service,
                        "tabId": tab_id,
                        "selected_tabs": bridge.selected_tab,
                        "requestId": message.get("requestId"),
                    })
            
            elif action == "REFRESH":
                new_settings = message.get("settings", {})
                
                if new_settings.get("rpcCustom", {}).get("enabled"):
                    bridge.update({
                        "currentSite": "Custom",
                        "payload": {},
                        "settings": new_settings.get("rpcCustom")
                    })

                for service, tabId in bridge.selected_tab.items():
                    last_msg = bridge.last_payload_by_tab.get(tabId)
                    if last_msg:
                        is_music = "music.youtube.com" in last_msg.get("payload", {}).get("url", "")
                        if is_music:
                            music_settings = new_settings.get("rpcYoutubeMusic", {})
                            last_action = last_msg.get("action")
                            if last_action == "VIDEO_PAUSED":
                                active_cfg = music_settings.get("paused", {})
                            else:
                                active_cfg = music_settings.get("running", {})
                        else:
                            youtube_settings = new_settings.get("rpcYoutube", {})
                            browsing_cfg = youtube_settings.get("browsingActivities", {}) or youtube_settings.get("paused", {}).get("browsingActivities", {})
                            if browsing_cfg.get("enabled"):
                                activities = browsing_cfg.get("activities", {})
                                preferred_key = (last_msg.get("payload") or {}).get("page_type")

                                if preferred_key and isinstance(activities.get(preferred_key), dict) and activities[preferred_key].get("enabled"):
                                    chosen = (preferred_key, activities[preferred_key])
                                else:
                                    chosen = None
                                    for activity_key, activity_data in activities.items():
                                        if activity_data.get("enabled"):
                                            chosen = (activity_key, activity_data)
                                            break

                                if chosen:
                                    activity_key, activity_data = chosen

                                    paused_cfg = youtube_settings.get("paused", {})
                                    running_cfg = youtube_settings.get("running", {})
                                    base_config = paused_cfg.copy()
                                    base_config["details"] = BROWSING_ACTIVITY_LABELS.get(activity_key, "Browsing YouTube")
                                    base_config["state"] = activity_data.get("text", "")

                                    paused_custom = (paused_cfg.get("special") or {}).get("custom_name") is True
                                    running_custom = (running_cfg.get("special") or {}).get("custom_name") is True
                                    if paused_custom or running_custom:
                                        special = base_config.get("special") or {}
                                        special["custom_name"] = True
                                        base_config["special"] = special
                                        base_config["name"] = paused_cfg.get("name") if paused_custom else (running_cfg.get("name") or base_config.get("name"))

                                    btns = base_config.get("buttons") or {}
                                    for k in ("1", "2"):
                                        if isinstance(btns.get(k), dict):
                                            btns[k]["enabled"] = False
                                    base_config["buttons"] = btns

                                    if activity_key == "channel":
                                        payload = last_msg.get("payload") or {}
                                        channel_url = payload.get("channel_url") or payload.get("url")
                                        if channel_url:
                                            base_config["buttons"] = {
                                                "1": {"enabled": True, "label": "Channel", "url": channel_url},
                                                "2": {"enabled": False, "label": "", "url": ""},
                                            }

                                    assets = base_config.get("assets") or {}
                                    large = assets.get("large") or {}
                                    large["enabled"] = True
                                    large["large_image"] = "youtube"
                                    assets["large"] = large

                                    small = assets.get("small") or {}
                                    small["enabled"] = False
                                    assets["small"] = small

                                    base_config["assets"] = assets

                                    timestamps = base_config.get("timestamps") or {}
                                    timestamps["start"] = False
                                    timestamps["end"] = False
                                    base_config["timestamps"] = timestamps

                                    last_msg["action"] = "BROWSING_ACTIVITY"
                                    last_msg["settings"] = base_config
                                    last_msg["browsingActivityKey"] = activity_key
                                    bridge._render_rpc(last_msg)
                                    continue
                            
                            active_cfg = youtube_settings.get("running", {})
                        last_msg["settings"] = active_cfg
                        bridge._render_rpc(last_msg)

            elif action == "CLEAR_SERVICE":
                service_to_clear = message.get("service")
                pipe = bridge.pipes.get(service_to_clear)
                if pipe:
                    bridge._send_frame(pipe, 1, {
                        "cmd": "SET_ACTIVITY",
                        "args": {"pid": os.getpid(), "activity": None},
                        "nonce": str(int(time.time()))
                    }, service_type=service_to_clear)
            elif action == "CLEAR_RPC":
                for service, pipe in bridge.pipes.items():
                    bridge._send_frame(pipe, 1, {
                        "cmd": "SET_ACTIVITY",
                        "args": {"pid": os.getpid(), "activity": None},
                        "nonce": str(int(time.time()))
                    }, service_type=service)
                bridge.selected_tab.clear()
            elif action == "GET_STATUS":
                bridge.send_to_extension({
                    "action": "STATUS_RESPONSE",
                    "active_services": list(bridge.pipes.keys()),
                    "selected_tabs": bridge.selected_tab,
                    "rpc_data": bridge.last_payload_by_tab 
                })

            elif action == "GET_VERSION":
                bridge.send_to_extension({
                    "action": "VERSION_RESPONSE",
                    "version": get_app_version(),
                    "requestId": message.get("requestId"),
                })
        except Exception:
            pass


if __name__ == "__main__":
    main()