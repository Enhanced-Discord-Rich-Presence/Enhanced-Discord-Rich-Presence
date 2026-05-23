# Understanding and Interacting with Discord IPC (Inter-Process Communication)

This guide explains how to connect directly to Discord's IPC (using Python for understanding). This allows you to interact with Discord on a lower level than standard RPC wrappers, giving you full control over the connection, handshakes, and binary framing.

## Disclaimer

This is a guide I wrote myself. Most of this information was **not** documentated by Discord anywhere when I wrote it. Now I found out that Discord has some [docs](https://docs.discord.com/developers/topics/rpc) about it. It took me a lot of research to get a deep understanding about this. There may be errors or missing information, as I've just tried to write down whatever I found and tried to make it easy to understand. In here still is more hidden things that Discord does not document.

## What is IPC?

**IPC (Inter-Process Communication)** serves as the transport layer — the physical conduit between processes on your machine. 

While **RPC** (Remote Procedure Call) is a higher-level abstraction provided by Discord to make integrations easy, it uses IPC under the hood. Using IPC directly gives you more capabilities but requires you to manually handle the binary protocol, framing, handshakes, and heartbeats.

## Guide Overview

This documentation will first outline how to establish and communicate over a direct IPC connection. Following that, I will detail the `SET_ACTIVITY` command as a primary example. 

Discord’s IPC protocol supports numerous additional commands — such as `AUTHORIZE`, `AUTHENTICATE`, `GET_VOICE_SETTINGS`, `SET_VOICE_SETTINGS`, `GET_GUILD`, ... — which enable advanced functionality like modifying client settings and subscribing to real-time events. 

> [!NOTE]
> At the time of writing this, I have not used anything besides of `SET_ACTIVITY`, so I will only explain this one.

---

## 1. Connecting to the IPC Pipe

- On Windows, Discord utilizes Named Pipes via the `\\.\pipe\` filesystem. The pipe path follows the template `\\.\pipe\discord-ipc-{n}` where..
- On Linux and macOS, Discord exposes its IPC endpoint through a Unix Domain Socket (UDS). On Linux, Discord searches for and may create the socket in several standard runtime locations, with `$XDG_RUNTIME_DIR/discord-ipc-{n}` as the primary location when available, followed by other environment-based temporary directories (such as `$TMPDIR`, `$TMP`, and `$TEMP`), and finally falling back to `/tmp/discord-ipc-{n}` where..

.. `n` is typically 0-9.

If multiple Discord clients are running (for example, Canary and Stable), the first instance may claim `discord-ipc-0` while the next uses `discord-ipc-1`. To establish a connection, we iterate through the possible socket paths until we find one that is active.

> [!NOTE]
> At the time of writing this, I also have not used IPC Pipes on Linux nor macOS. I have not tried these out, so they may not be correct.

### Windows

```python
import pywintypes
import win32file

def get_pipe_handle():
    """
    Finds and connects to the Discord IPC Named Pipe on Windows.
    """
    PIPE_PATH_TEMPLATE = r"\\.\pipe\discord-ipc-{}"

    for i in range(10):
        pipe_path = PIPE_PATH_TEMPLATE.format(i)
        try:
            # CreateFile(ACCESS_MODE, SHARE_MODE, CREATION_DISPOSITION, FLAGS_AND_ATTRIBUTES)
            # access mode: GENERIC_READ | GENERIC_WRITE -> bidirectional communication
            # share mode: 0 -> prevents other processes from opening the pipe while active
            # creation disposition: OPEN_EXISTING -> open the server pipe created by Discord
            handle = win32file.CreateFile(
                pipe_path, 
                win32file.GENERIC_READ | win32file.GENERIC_WRITE, 
                0, 
                None, 
                win32file.OPEN_EXISTING, 
                0, 
                None
            )
            print(f"Connected to {pipe_path}")
            return handle
        except pywintypes.error:
            continue
            
    print("Discord not found. Ensure the desktop client is open.")
    return None
```

### Linux & macOS

```python
import os
import socket


def get_ipc_socket():
    """
    Connects to Discord IPC Unix Domain Socket (Linux + macOS).
    Tries all valid runtime directories + discord-ipc-{0-9}.
    """

    # Discord may place sockets in multiple runtime locations
    base_dirs = []

    # Linux / modern systems
    for env in ["XDG_RUNTIME_DIR", "TMPDIR", "TMP", "TEMP"]:
        if os.environ.get(env):
            base_dirs.append(os.environ[env])

    # Common fallback
    base_dirs.append("/tmp")

    # Try all possible IPC sockets
    for base in base_dirs:
        for i in range(10):
            path = os.path.join(base, f"discord-ipc-{i}")

            try:
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(path)
                print(f"Connected to {path}")
                return sock

            except OSError:
                try:
                    sock.close()
                except Exception:
                    pass

    print("Discord IPC not found.")
    return None
```

## 2. The Binary Protocol and Framing

Data sent between your client and Discord uses a custom binary framing protocol. Every packet consists of an 8-byte header followed by a JSON payload.

The 8-byte header consists of two 32-bit unsigned integers encoded in little-endian format (a standard choice for local communication on x86/ARM architectures):

| Offset | Field  | Description                                     |
|--------|--------|-------------------------------------------------|
| 0      | Opcode | Type of message (Handshake, Frame, Close, etc.) |
| 4      | Length | Size of the JSON payload in bytes               |

### Opcodes Reference

| Opcode | Name      | Direction        | Description                                      |
|--------|-----------|------------------|--------------------------------------------------|
| 0      | HANDSHAKE | Client -> Server | Establishes the initial connection               |
| 1      | FRAME     | Bidirectional    | Standard RPC commands and event data             |
| 2      | CLOSE     | Bidirectional    | Signals for graceful disconnection               |
| 3      | PING      | Client -> Server | Heartbeat check to ensure pipe is alive          |
| 4      | PONG      | Bidirectional    | Response to PING, confirming active connection   |

All Opcode 1 communications use JSON-formatted payloads structured as follows:

**Client Request**
- `cmd` – The command to execute
- `args` – Command-specific arguments or parameters
- `evt` – Target event (if applicable)
- `nonce` – Unique request identifier

**Discord Response**
- `cmd` – Echoed command name
- `data` – Response payload or event data
- `evt` – Associated event name
- `nonce` – Identical nonce string from the original request

#### Request-Response Correlation
The `nonce` field is a unique string generated by the client for each request. Discord mirrors this exact value in its response, enabling reliable asynchronous matching between requests and their corresponding replies.

## 3. Packet Handling

#### Windows

```python
def send_packet(handle, opcode, payload):
    """Packs and sends a binary packet: 8-byte header + JSON payload."""
    payload_json = json.dumps(payload).encode('utf-8')
    # Header: Opcode (4 bytes, Little Endian) + Length (4 bytes, Little Endian)
    header = struct.pack("<II", opcode, len(payload_json))
    win32file.WriteFile(handle, header + payload_json)
```

```python
def receive_packet(handle):
    # Read the 8-byte header
    _, header_data = win32file.ReadFile(handle, 8)
    opcode, length = struct.unpack("<II", header_data)
    # Read the JSON payload based on length in header
    _, payload_data = win32file.ReadFile(handle, length)
    return opcode, json.loads(payload_data.decode('utf-8'))
```

#### Linux/macOS

```python
def send_packet(sock, opcode, payload):
    payload_json = json.dumps(payload).encode("utf-8")

    header = struct.pack("<II", opcode, len(payload_json))
    sock.sendall(header + payload_json)
```

```python
def recv_exact(sock, length):
    data = b""
    while len(data) < length:
        chunk = sock.recv(length - len(data))
        if not chunk:
            raise ConnectionError("Socket closed")
        data += chunk
    return data

def receive_packet(sock):
    header = recv_exact(sock, 8)
    opcode, length = struct.unpack("<II", header)

    payload_data = recv_exact(sock, length)
    payload = json.loads(payload_data.decode("utf-8"))

    return opcode, payload
```

### IPC Connection Initialization

Establishing a successful connection to the Discord IPC requires a strict initialization sequence. Once the named pipe is successfully opened, the client must immediately send a **Handshake** packet (Opcode 0).

#### Handshake Payload
The handshake payload is a JSON object containing the protocol version and your application's credentials:

```json
{
  "v": 1,
  "client_id": "<YOUR_APPLICATION_ID>"
}
```

> **Note:** The `client_id` corresponds to the **Application ID** (Snowflake identifier) found in the Discord Developer Portal.

#### Server Response

Upon successful validation, Discord responds with a standard Opcode 1 frame where the `evt` field is set to `READY`. The `data` field contains metadata about the authenticated user, including but not limited to:

- username
- global_name
- avatar hash
- premium_type
- id (User ID)

This `READY` event confirms that the IPC connection is established and ready for further commands.

## 4. Handshake

#### Windows

```python
def handshake(handle, client_id):
    send_packet(handle, 0, {"v": 1, "client_id": client_id})
    opcode, ready_data = receive_packet(handle)
    if opcode != 1 or ready_data.get("evt") != "READY":
        raise Exception("Handshake failed. Invalid response from Discord.")
    return ready_data
```

```python
def connect_and_handshake(client_id):
    handle = get_pipe_handle()
    if not handle:
        raise Exception("Discord not found. Ensure the desktop client is open.")
    ready_data = handshake(handle, client_id)
    return handle
```

#### Linux/macOS

```python
def handshake(sock, client_id):
    send_packet(sock, 0, {"v": 1, "client_id": client_id})
    opcode, data = receive_packet(sock)
    if opcode != 1 or data.get("evt") != "READY":
        raise Exception("Handshake failed")
    return data
```

```python
def connect_and_handshake(client_id):
    sock = get_ipc_socket()
    if not sock:
        raise Exception("Discord not found")
    ready = handshake(sock, client_id)
    return sock, ready
```

## 5. Connection Check

This is how you can do a PingPong check. You could also just send an empty JSON payload with opcode 3 if you don't wanna use the nonce.

> **Note:** I've read that it's recommended to do a handshake every 30 seconds, but it's not **required**.

#### Windows

```python
def check_connection(handle):
    send_packet(handle, 3, {"nonce": str(uuid.uuid4())})
    # opcode is 4 and the response is just nonce and nothing else.
    opcode, response = receive_packet(handle)
    if opcode == 4:
        print("Connection is alive.")
    else:
        print("Connection is not alive.")
```

#### Linux/macOS

```python
def check_connection(sock):
    send_packet(sock, 3, {"nonce": str(uuid.uuid4())})
    opcode, data = receive_packet(sock)
    if opcode == 4:
        print("Connection is alive")
    else:
        print("Connection is not alive")
```

## 6. Graceful Shutdown

This is how you can gracefully close the connection. You send a Close packet (Opcode 2) with any JSON object, it literally just ignores whatever you send. Also the nonce.

#### Windows

```python
def close_connection(handle):
    send_packet(handle, 2, {"nonce": str(uuid.uuid4())})
    opcode, response = receive_packet(handle)
    if opcode == 2 and response.get("code") == 1000 and response.get("message") == "client disconnect":
        print("Closed the connection to Discord IPC.")
        win32file.CloseHandle(handle)
    else:
        print("something unexpected went wrong and it didn't close properly")
```

#### Linux/macOS

```python
def close_connection(sock):
    send_packet(sock, 2, {"nonce": str(uuid.uuid4())})
    opcode, response = receive_packet(sock)
    if opcode == 2 and response.get("code") == 1000 and response.get("message") == "client disconnect":
        print("Closed the connection to Discord IPC.")
        sock.close()
    else:
        print("something unexpected went wrong and it didn't close properly")
```

# Set Activity (Opcode 1, cmd: SET_ACTIVITY)

### JSON Payload (opcode 1):

```json
{
  "cmd": "SET_ACTIVITY",
  "args": {},
  "nonce": "unique_nonce_string"
}
```

> **NOTE:** Technically, you can send evt aswell, but I don't really know if it does anything?

### Argument Reference (`args` Object)

| Argument | Data Type | Description |
|---|---|---|
| pid | uint32_t | Process ID of the client application. Required for Discord to automatically clear the activity if the process terminates. |
| activity | object | Core activity definition containing display parameters (see sub-fields below). |

#### Activity Object Sub-Fields

| Field | Data Type | Description | Constraints |
|---|---|---|---|
| type | uint32_t | Activity type identifier | 0 = Playing, 1 = Streaming, 2 = Listening, 3 = Watching, 4 = Custom, 5 = Competing |
| state | string | Primary status text (displayed as top line) | Max 128 characters |
| details | string | Secondary detail text (displayed as bottom line) | Max 128 characters |
| timestamps | object | Time-based display configuration | — |
| └ start | uint64_t | Unix timestamp in milliseconds. Enables elapsed time timer when provided. | — |
| └ end | uint64_t | Unix timestamp in milliseconds. Enables countdown timer when provided. | — |
| assets | object | Visual asset configuration | — |
| └ large_image | string | Asset key for uploaded image or external URL | Max 256 characters |
| └ small_image | string | Asset key for uploaded image or external URL | Max 256 characters |
| └ large_text | string | Tooltip text for large image on hover | Max 128 characters |
| └ small_text | string | Tooltip text for small image on hover | Max 128 characters |
| buttons | array[object] | Interactive button definitions (max 2 buttons) | — |
| └ label | string | Display text for the button | Max 32 characters |
| └ url | string | Destination URL triggered on button click | Max 512 characters || Argument | Data Type | Description |

#### Other Fields

> **NOTE:** I either don't know what they do, or how to properly use them. So I can't give you here more information. Sorry. 

| Field | Data Type | Description | Constraints |
|---|---|---|---|
| party | object | Party/session metadata | — |
| └ id | string | Unique party identifier | Max 128 characters |
| └ size | array[uint32_t, uint32_t] | Party size as [current, max] | — |
| secrets | object | Matchmaking/session secrets | — |
| └ join | string | Secret hash for "Join" action | Max 128 characters |
| └ spectate | string | Secret hash for "Spectate" action | Max 128 characters |
| └ match | string | Shared secret for session correlation | — |
| instance | bool | Indicates if activity belongs to a specific game session | — |


### Example Configuration

```python
import time
import os
import uuid

test_config = {
    "state": "sum state :3",
    "details": "shawwww",
    "timestamps": {
        "start": int(time.time() * 1000),           # Current time in ms
        "end": int((time.time() + 3600) * 1000)      # Current time + 1 hour in ms
    },
    "assets": {
        "large_image": "https://img.youtube.com/vi/G4ozAHqlKgo/maxresdefault.jpg",
        "small_image": "https://img.youtube.com/vi/n-gYFcVx-8Y/maxresdefault.jpg",
        "large_text": "MOTORCYCLE GO VROOM VROOM",
        "small_text": "it's over. germany is dead."
    },
    "buttons": [
        {
            "label": "My gud github",
            "url": "https://github.com/Aqusorias"
        },
        {
            "label": "look! it's Lycoris Recoil!",
            "url": "https://www.instagram.com/p/DXitTlziKm-/?hl=en"
        }
    ]
}
```

#### Windows

```python
def set_activity(handle, activity_args):
    """
    Sends a SET_ACTIVITY command to Discord via IPC.
    
    Args:
        handle: IPC socket/connection handle
        activity_args: Dictionary containing activity configuration
    """
    activity_payload = {
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": os.getpid(),      # Automatically include current process ID
            "activity": activity_args
        },
        "nonce": str(uuid.uuid4())   # Unique request identifier
    }
    
    send_packet(handle, 1, activity_payload)
    print("Rich Presence set successfully.")
    
    # Keep process alive to maintain presence
    # Discord auto-clears activity when the registered PID terminates
    input("Press Enter to exit (required to keep PID active and preserve Rich Presence)")
```

#### Linux/macOS

```python
def set_activity(sock, activity_args):
    """
    Sends a SET_ACTIVITY command to Discord via IPC.
    
    Args:
        sock: Unix socket
        activity_args: Dictionary containing activity configuration
    """
    activity_payload = {
        "cmd": "SET_ACTIVITY",
        "args": {
            "pid": os.getpid(),      # Automatically include current process ID
            "activity": activity_args
        },
        "nonce": str(uuid.uuid4())   # Unique request identifier
    }
    
    send_packet(sock, 1, activity_payload)
    print("Rich Presence set successfully.")
    
    # Keep process alive to maintain presence
    # Discord auto-clears activity when the registered PID terminates
    input("Press Enter to exit (required to keep PID active and preserve Rich Presence)")
```