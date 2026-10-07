# Pose server (MediaPipe)

Copied unchanged from `lotte-visual-haidoan-main/server.py`. It reads the webcam (or loops
`test_video.mp4`), runs MediaPipe Pose and broadcasts 33 landmarks + the JPEG frame over
`ws://localhost:8080`. Geofolk's "Live pose" tab connects to it (`src/pose.ts`).

Needs Python 3.10+ (the system Python 3.9 is too old), so it is started through `uv`:

    npm run pose          # webcam
    npm run pose:video    # loop test_video.mp4

The first run downloads Python 3.11 and the packages in `requirements.txt`.
On macOS the terminal app must be allowed to use the camera (System Settings > Privacy & Security > Camera).
