"""
server.py
Real-time skeleton tracking backend.

Pipeline:
  video/camera frame -> MediaPipe Pose -> 33 landmarks (x, y, z, visibility)
  -> JSON (landmarks + the same frame, JPEG-encoded) -> broadcast to all
  connected WebSocket clients. Sending the exact frame alongside its
  landmarks (rather than having the frontend play the source video back on
  its own) keeps the video preview and the skeleton perfectly in sync.

DESIGN NOTE (for future ZED 2i swap):
  All frame acquisition is isolated behind the FrameSource abstract class.
  VideoFileSource (current, using cv2.VideoCapture on test_video.mp4) can be
  swapped for a ZedCameraSource later without touching the pose-extraction,
  JSON-encoding, or WebSocket-broadcasting logic at all. Just implement
  FrameSource.read_frame() for the ZED SDK and change one line in main().
"""

import argparse
import asyncio
import base64
import json
import os
import time
from abc import ABC, abstractmethod

import cv2
import mediapipe as mp
import websockets
from websockets.server import WebSocketServerProtocol

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
WS_HOST = "0.0.0.0"
WS_PORT = 8080
VIDEO_PATH = "test_video.mp4"
USE_WEBCAM = True  # True = live camera (WEBCAM_INDEX); False = loop VIDEO_PATH
WEBCAM_INDEX = 0    # 0 = this Mac's default camera (FaceTime HD Camera)
TARGET_FPS = 30
FRAME_INTERVAL = 1.0 / TARGET_FPS  # seconds per frame, used to throttle the loop
FRAME_JPEG_QUALITY = 70  # JPEG quality for the frame streamed alongside landmarks

# Saved default settings live in a file next to this script, NOT in browser
# localStorage — that way "Save as Default" is the same regardless of which
# browser/machine opens the page, and survives clearing browser data.
SETTINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_settings.json")

# Set of currently connected clients. We broadcast every frame's pose data
# to all of them.
CONNECTED_CLIENTS: set[WebSocketServerProtocol] = set()

# Mutable holder for the currently active frame source, so a connected
# client can request a live switch (webcam <-> demo video) without
# restarting the process. video_processing_loop reads CURRENT_SOURCE["source"]
# fresh every iteration instead of closing over a fixed FrameSource.
CURRENT_SOURCE: dict = {"source": None, "kind": None}  # kind: "webcam" | "video"


# ----------------------------------------------------------------------------
# Frame source abstraction
# ----------------------------------------------------------------------------
class FrameSource(ABC):
    """
    Abstract input source. Anything that can hand back BGR frames
    (numpy arrays, same format cv2.VideoCapture.read() returns) can be
    plugged in here. This is the seam where the ZED 2i integration will go.
    """

    @abstractmethod
    def read_frame(self):
        """Return a single BGR frame as a numpy array (H, W, 3)."""
        raise NotImplementedError

    def release(self):
        """Optional cleanup hook, overridden by sources holding a device handle."""
        pass


class VideoFileSource(FrameSource):
    """
    Reads frames from a local video file on loop.
    When the video reaches its end, it seeks back to frame 0 instead of
    stopping, so the stream is effectively infinite (mirrors a live camera).
    """

    def __init__(self, path: str):
        self.capture = cv2.VideoCapture(path)
        if not self.capture.isOpened():
            raise IOError(f"Could not open video file: {path}")

    def read_frame(self):
        success, frame = self.capture.read()
        if not success:
            # End of file reached -> rewind to the first frame and retry once.
            self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            success, frame = self.capture.read()
            if not success:
                # Video file is empty/corrupt; nothing sane to do.
                raise IOError("Failed to read a frame even after rewinding.")
        return frame

    def release(self):
        self.capture.release()


class WebcamSource(FrameSource):
    """
    Reads frames live from a local webcam (e.g. this Mac's built-in FaceTime
    HD Camera) via OpenCV's generic UVC capture backend. Unlike
    VideoFileSource there's no end-of-stream case to loop past — a live
    device just keeps producing frames.
    """

    def __init__(self, camera_index: int = 0):
        self.capture = cv2.VideoCapture(camera_index)
        if not self.capture.isOpened():
            raise IOError(
                f"Could not open camera index {camera_index}. On macOS this "
                "usually means Terminal/the Python process hasn't been "
                "granted Camera access yet — check System Settings > "
                "Privacy & Security > Camera."
            )

    def read_frame(self):
        success, frame = self.capture.read()
        if not success:
            raise IOError("Failed to read a frame from the webcam.")
        return frame

    def release(self):
        self.capture.release()


# ZED 2i integration note: Stereolabs' ZED SDK (required for its own Depth
# Sensing + Body Tracking modules) only ships for Windows and Linux
# (x86_64/Jetson) -- there is no macOS build, Apple Silicon included -- so
# it cannot run on this machine. Left here as the intended swap point for
# whenever this backend moves to a supported machine with the SDK installed
# and the ZED 2i connected to it.
#
# class ZedCameraSource(FrameSource):
#     def __init__(self):
#         import pyzed.sl as sl
#         self.zed = sl.Camera()
#         ... open camera, configure depth mode ...
#
#     def read_frame(self):
#         ... grab() + retrieve_image() -> return frame as numpy array ...


# ----------------------------------------------------------------------------
# Pose extraction
# ----------------------------------------------------------------------------
mp_pose = mp.solutions.pose


def extract_landmarks(pose_model, frame) -> list[dict] | None:
    """
    Runs MediaPipe Pose on a single BGR frame and returns a list of 33
    landmark dicts: {id, x, y, z, visibility}.

    MediaPipe expects RGB input, and its landmark coordinates are normalized:
      x, y in [0.0, 1.0] relative to image width/height
      z is roughly in the same scale as x, with the hip midpoint as origin
        (smaller z = closer to the camera). We pass z through as-is and let
        the frontend decide how to scale it into world space.
    Returns None if no pose was detected in the frame.
    """
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    # Marking the array as non-writeable is a MediaPipe-recommended perf
    # optimization: it skips an internal copy since we don't mutate rgb_frame.
    rgb_frame.flags.writeable = False
    results = pose_model.process(rgb_frame)

    if not results.pose_landmarks:
        return None

    landmarks = []
    for idx, lm in enumerate(results.pose_landmarks.landmark):
        landmarks.append({
            "id": idx,
            "x": lm.x,
            "y": lm.y,
            "z": lm.z,
            "visibility": lm.visibility,
        })
    return landmarks


def encode_frame_jpeg(frame) -> str:
    """
    Encodes a BGR frame as a base64 JPEG data URL string, for streaming the
    EXACT frame MediaPipe just processed back to clients. This is what lets
    the frontend show a video preview that is always in sync (same frame,
    same timing, same camera framing) with the skeleton it's driving —
    playing test_video.mp4 independently client-side would drift out of
    sync with the server's own decode/processing pace.
    """
    success, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), FRAME_JPEG_QUALITY])
    if not success:
        raise IOError("Failed to JPEG-encode frame")
    b64 = base64.b64encode(buf).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


# ----------------------------------------------------------------------------
# Saved settings (server-side, shared across every client)
# ----------------------------------------------------------------------------
def load_saved_settings() -> dict | None:
    if not os.path.exists(SETTINGS_FILE):
        return None
    try:
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    except (OSError, ValueError) as exc:
        print(f"[!] Failed to read {SETTINGS_FILE}: {exc}")
        return None


def save_settings_to_disk(settings: dict) -> None:
    tmp_path = SETTINGS_FILE + ".tmp"
    with open(tmp_path, "w") as f:
        json.dump(settings, f)
    os.replace(tmp_path, SETTINGS_FILE)  # atomic, avoids a half-written file on crash


SAVED_SETTINGS: dict | None = load_saved_settings()


# ----------------------------------------------------------------------------
# WebSocket broadcasting
# ----------------------------------------------------------------------------
def switch_frame_source(kind: str) -> str | None:
    """
    Swaps CURRENT_SOURCE["source"] to the requested kind ("webcam" or
    "video"), releasing the previous source's device/file handle. Runs on
    the same single-threaded event loop as video_processing_loop, so there's
    no race between the loop reading CURRENT_SOURCE["source"] and this
    function reassigning it.

    Returns an error message string on failure (old source stays active),
    or None on success.
    """
    global USE_WEBCAM

    if kind == CURRENT_SOURCE["kind"]:
        return None  # already active, nothing to do

    try:
        new_source: FrameSource = (
            WebcamSource(WEBCAM_INDEX) if kind == "webcam" else VideoFileSource(VIDEO_PATH)
        )
    except IOError as exc:
        return str(exc)

    old_source = CURRENT_SOURCE["source"]
    CURRENT_SOURCE["source"] = new_source
    CURRENT_SOURCE["kind"] = kind
    USE_WEBCAM = kind == "webcam"
    if old_source is not None:
        old_source.release()
    print(f"[~] Switched frame source to: {kind}")
    return None


async def handle_client(websocket: WebSocketServerProtocol):
    """
    Registers a newly connected client and keeps the connection open until
    it disconnects. Incoming messages are treated as JSON commands -- the
    only one currently supported is {"type": "switch_source", "source":
    "webcam" | "video"}, used by the frontend's mode-switch button.
    """
    global SAVED_SETTINGS

    CONNECTED_CLIENTS.add(websocket)
    print(f"[+] Client connected ({len(CONNECTED_CLIENTS)} total)")
    await websocket.send(json.dumps({"type": "source_status", "source": CURRENT_SOURCE["kind"]}))
    await websocket.send(json.dumps({"type": "settings", "settings": SAVED_SETTINGS}))
    try:
        async for message in websocket:
            try:
                command = json.loads(message)
            except (TypeError, ValueError):
                continue

            if command.get("type") == "switch_source" and command.get("source") in ("webcam", "video"):
                error = switch_frame_source(command["source"])
                status_payload = json.dumps({
                    "type": "source_status",
                    "source": CURRENT_SOURCE["kind"],
                    "error": error,
                })
                await asyncio.gather(
                    *(client.send(status_payload) for client in list(CONNECTED_CLIENTS)),
                    return_exceptions=True,
                )
            elif command.get("type") == "save_settings" and isinstance(command.get("settings"), dict):
                SAVED_SETTINGS = command["settings"]
                save_settings_to_disk(SAVED_SETTINGS)
                # Push the new saved settings to every OTHER connected tab too,
                # so multiple open windows stay in sync with each other.
                settings_payload = json.dumps({"type": "settings", "settings": SAVED_SETTINGS})
                await asyncio.gather(
                    *(client.send(settings_payload) for client in list(CONNECTED_CLIENTS) if client is not websocket),
                    return_exceptions=True,
                )
    except websockets.ConnectionClosed:
        pass
    finally:
        CONNECTED_CLIENTS.discard(websocket)
        print(f"[-] Client disconnected ({len(CONNECTED_CLIENTS)} total)")


async def broadcast_frame(landmarks: list[dict] | None, frame_data_url: str | None):
    """
    Sends one combined payload — the landmarks AND the exact video frame
    they were detected from — to every connected client, so the frontend
    can render both in lockstep instead of playing the source video back
    independently (which would drift out of sync with the server's pace).
    """
    if not CONNECTED_CLIENTS:
        return

    payload = json.dumps({
        "type": "pose",
        "timestamp": time.time(),
        "landmarks": landmarks or [],
        "frame": frame_data_url,
    })

    # asyncio.gather with return_exceptions=True so one dropped client
    # (e.g. closed mid-send) doesn't kill the broadcast to the others.
    await asyncio.gather(
        *(client.send(payload) for client in list(CONNECTED_CLIENTS)),
        return_exceptions=True,
    )


# ----------------------------------------------------------------------------
# Main capture/processing loop
# ----------------------------------------------------------------------------
async def video_processing_loop():
    """
    Continuously pulls frames from CURRENT_SOURCE["source"], runs pose
    estimation, and broadcasts results, throttled to TARGET_FPS. Reading the
    source fresh from CURRENT_SOURCE every iteration (rather than a fixed
    parameter) is what lets switch_frame_source() swap it live.
    """
    with mp_pose.Pose(
        static_image_mode=False,
        model_complexity=1,
        smooth_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ) as pose_model:
        while True:
            loop_start = time.time()

            frame = CURRENT_SOURCE["source"].read_frame()
            if USE_WEBCAM:
                # Mirror the live webcam feed horizontally so it behaves
                # like a mirror (moving your right hand moves the skeleton's
                # hand on the same visual side) -- flipping here, before
                # pose extraction, keeps the landmarks and the streamed
                # preview frame in sync automatically.
                frame = cv2.flip(frame, 1)
            landmarks = extract_landmarks(pose_model, frame)

            # Only pay the JPEG-encoding cost when someone's actually
            # listening. We broadcast every processed frame (not just ones
            # with a detected pose) so the video preview stays continuous
            # even during moments MediaPipe loses tracking.
            if CONNECTED_CLIENTS:
                frame_data_url = encode_frame_jpeg(frame)
                await broadcast_frame(landmarks, frame_data_url)

            # Rate-limit to TARGET_FPS. We measure how long processing this
            # frame actually took and only sleep the remainder, so the loop
            # doesn't drift below the target rate on slower hardware.
            elapsed = time.time() - loop_start
            remaining = FRAME_INTERVAL - elapsed
            if remaining > 0:
                # time.sleep() as required; we're in an async function but
                # this is a single-threaded processing loop by design, so a
                # blocking sleep here is fine (no other coroutine needs the
                # CPU while we're throttling frame rate).
                time.sleep(remaining)

            # Yield control back to the event loop so the WebSocket server
            # can process connects/disconnects between frames.
            await asyncio.sleep(0)


# ----------------------------------------------------------------------------
# Entry point
# ----------------------------------------------------------------------------
async def main():
    if USE_WEBCAM:
        CURRENT_SOURCE["source"] = WebcamSource(WEBCAM_INDEX)
        CURRENT_SOURCE["kind"] = "webcam"
    else:
        CURRENT_SOURCE["source"] = VideoFileSource(VIDEO_PATH)
        CURRENT_SOURCE["kind"] = "video"
    # Future (needs a Windows/Linux host with the ZED SDK -- see the
    # ZedCameraSource note above): frame_source = ZedCameraSource()

    server = await websockets.serve(handle_client, WS_HOST, WS_PORT)
    print(f"WebSocket server listening on ws://{WS_HOST}:{WS_PORT}")

    try:
        await video_processing_loop()
    finally:
        CURRENT_SOURCE["source"].release()
        server.close()
        await server.wait_closed()


def parse_args():
    parser = argparse.ArgumentParser(description="Real-time skeleton tracking backend.")
    parser.add_argument(
        "--source",
        choices=["webcam", "video"],
        default="webcam" if USE_WEBCAM else "video",
        help="Frame source: 'webcam' for the live camera, 'video' to loop the demo "
             "video file instead. Default: %(default)s.",
    )
    parser.add_argument(
        "--camera-index", type=int, default=WEBCAM_INDEX,
        help="Webcam device index, only used with --source webcam. Default: %(default)s.",
    )
    parser.add_argument(
        "--video-path", default=VIDEO_PATH,
        help="Path to the video file to loop, only used with --source video. Default: %(default)s.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    USE_WEBCAM = args.source == "webcam"
    WEBCAM_INDEX = args.camera_index
    VIDEO_PATH = args.video_path
    print(f"Frame source: {'webcam (index ' + str(WEBCAM_INDEX) + ')' if USE_WEBCAM else 'demo video (' + VIDEO_PATH + ')'}")
    asyncio.run(main())
