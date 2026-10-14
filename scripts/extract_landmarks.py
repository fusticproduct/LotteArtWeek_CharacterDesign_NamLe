"""Run MediaPipe Pose (same settings as mediapipe/server.py) over a video and write every frame's
33 landmarks as JSON: {"fps", "width", "height", "frames": [[[x, y, z, visibility] x 33] | null, ...]}.

    cd mediapipe && uv run --python 3.11 --with-requirements requirements.txt python ../scripts/extract_landmarks.py test_video.mp4 /tmp/landmarks.json
"""
import json, sys
import cv2, mediapipe as mp

video, out = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(video)
frames = []
with mp.solutions.pose.Pose(static_image_mode=False, model_complexity=1, smooth_landmarks=True,
                            min_detection_confidence=0.5, min_tracking_confidence=0.5) as pose:
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        result = pose.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        frames.append([[round(l.x, 4), round(l.y, 4), round(l.z, 4), round(l.visibility, 3)]
                       for l in result.pose_landmarks.landmark] if result.pose_landmarks else None)
json.dump({'fps': cap.get(cv2.CAP_PROP_FPS), 'width': cap.get(cv2.CAP_PROP_FRAME_WIDTH),
           'height': cap.get(cv2.CAP_PROP_FRAME_HEIGHT), 'frames': frames}, open(out, 'w'))
print(f'{len(frames)} frames -> {out}')
