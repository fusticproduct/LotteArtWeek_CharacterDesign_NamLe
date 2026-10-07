# Geofolk — Character Studio (bản 2D)

> Tài liệu này dành cho người mới nhận dự án, hoặc để đưa vào một trợ lý AI (ChatGPT, Claude…) làm ngữ cảnh.
> Nó mô tả đúng trạng thái mã nguồn ngày 07/10/2026. Đọc hết một lượt là đủ để chạy app, hiểu cấu trúc và sửa tiếp.

## 1. App này là gì

Geofolk là một web app tạo **nhân vật hình học** ngẫu nhiên: người ghép từ các khối đơn giản (cầu, nón, bát, đĩa, chuỗi hạt…), màu rực, trông như đồ chơi cắt giấy. App làm cho dự án Lotte Art Week.

Người dùng có thể:

- bấm **Generate** để tạo nhân vật mới; **khóa** bộ phận mình thích và **random lại** phần còn lại;
- **kéo thả thứ tự lớp** (bộ phận nào vẽ đè lên bộ phận nào);
- chọn **pattern đan (basket weave)** cho thân và hông, chỉnh độ to nhỏ của ô và bảng màu;
- cho nhân vật **bắt chước chuyển động cơ thể** của người thật qua camera (MediaPipe Pose);
- lưu/khôi phục nhân vật bằng một chuỗi **seed**; xuất FBX, OBJ, Rig JSON, PNG.

Mọi thứ chạy trong trình duyệt. Chỉ riêng tính năng bắt chuyển động cần thêm một server Python nhỏ chạy trên cùng máy.

### Lưu ý quan trọng về "2D"

Nhân vật **trông** 2D nhưng bên dưới vẫn là các khối 3D và một bộ xương thật. Hình 2D có được nhờ ba thứ:

1. camera trực giao nhìn thẳng từ phía trước, không xoay được;
2. vật liệu màu phẳng, không ánh sáng, không bóng đổ;
3. các bộ phận vẽ theo **thứ tự lớp cố định** (không dùng độ sâu), như xếp giấy.

Vì vậy mọi khớp chỉ xoay quanh trục Z (trong mặt phẳng hình). Bản 3D có ánh sáng trước đây được lưu riêng ở thư mục `geofolk_3D_v1_20261006` (không nằm trong gói này).

## 2. Chạy app

Cần **Node.js 20.19+ hoặc 22.12+**.

```sh
npm ci          # cài thư viện (lần đầu)
npm run dev     # chạy app, mở địa chỉ "Local:" mà terminal in ra
```

Lệnh khác:

```sh
npm test        # 19 test tự động
npm run build   # bản production trong dist/ (phải phục vụ qua HTTP, không mở file trực tiếp)
npm run preview # xem thử bản build
```

### Bật bắt chuyển động (không bắt buộc)

Cần cài [`uv`](https://docs.astral.sh/uv/) (trình quản lý Python). Server cần Python 3.10 trở lên; lệnh dưới tự tải Python 3.11 và các gói cần thiết ở lần chạy đầu, không đụng tới Python của máy.

```sh
npm run pose          # dùng webcam
npm run pose:video    # phát lặp mediapipe/test_video.mp4 (để thử khi không có camera)
```

Sau đó trong app: tab **Live pose** → **Start live pose**. Trên macOS, lần đầu dùng webcam phải cấp quyền Camera cho ứng dụng terminal (System Settings → Privacy & Security → Camera).

## 3. Giao diện

| Khu vực | Chức năng |
|---|---|
| Thanh trên | Ô **Seed** (gõ rồi Enter để áp dụng, nút copy lấy seed đầy đủ), menu **Export**, nút **Generate** |
| Khung nhân vật (trái) | Kéo để di chuyển khung nhìn, cuộn để zoom. Ba nút bên phải khung: fit về giữa, hiện bộ xương, mở tab Live pose |
| Thanh dưới khung | Ba tư thế có sẵn: At ease, Hands up, Step out |
| Tab **Parts & layers** (phải) | Danh sách các lớp. Mỗi khối là một lớp; **khối trên cùng được vẽ phía trước**. Kéo tay nắm ở đầu dòng để đổi thứ tự (hoặc chọn tay nắm rồi bấm ↑/↓). Mỗi dòng có nút random lại và nút khóa. "Reset order" trả về thứ tự mặc định |
| Dưới danh sách | Slider **Pattern scale** (số ô đan), chọn **Weave palette** (HFCD / XMAS / TET), số bộ phận đang khóa |
| Tab **Live pose** | Bật/tắt bắt chuyển động, trạng thái kết nối, chọn Webcam / Demo video, slider **Motion smoothing**, ô xem hình camera |

Các cặp trái/phải luôn đi chung (vai, khuỷu, bàn tay, gối, bàn chân, đùi, ống chân) hiện thành một dòng. Bắp tay và cẳng tay có dòng Left/Right riêng.

## 4. Các quy tắc thiết kế đã chốt

Đây là những quyết định có chủ đích. Đừng "sửa" chúng nếu không được yêu cầu.

- **Đối xứng:** bàn tay, bàn chân và mọi khớp (vai, khuỷu, hông, gối) luôn cùng hình và cùng màu hai bên. Đùi và ống chân cùng hình hai bên, màu tự do. Khóa hoặc random một bên là áp dụng cho cả cặp.
- **Màu:** chỉ dùng 18 màu trong `src/palette.json` (trích từ ảnh tham chiếu `public/reference.png`). Hai bộ phận nối liền nhau không trùng màu. Dấu trên mặt luôn màu tối.
- **Pattern:** chỉ thân (torso) và hông (pelvis) có pattern đan. Tay và chân dạng khối liền có thể chia **hai lớp màu** (two-tone). Mọi bộ phận khác một màu.
- **Không lặp chuỗi hạt:** mỗi tay hoặc chân có tối đa một đoạn dạng hạt (Chain/Stack).
- **Khớp là quả cầu riêng:** vai, khuỷu, gối là bộ phận riêng, chỉ có dạng cầu. Đoạn tay/chân được cắt ngắn đúng chỗ tựa lên mặt cầu, nên khớp luôn nhìn thấy khi gập.
- **Chân:** đùi mảnh như tay, càng xuống càng to, bàn chân loe.
- **Tỉ lệ:** nhân vật đứng thẳng cao đúng 2.4 đơn vị; chiều dài xương không đổi theo hình dạng.
- **Seed:** cùng seed phải ra cùng nhân vật (kể cả pattern đan).

## 5. Cấu trúc mã nguồn

```text
src/
  main.tsx         điểm vào React
  App.tsx          trạng thái chính (nhân vật, khóa, seed, thứ tự lớp, bảng màu weave), thanh công cụ, export
  PartsPanel.tsx   tab Parts & layers: danh sách lớp kéo thả + random/khóa từng bộ phận
  PosePanel.tsx    tab Live pose
  Scene.tsx        canvas: camera trực giao, pan/zoom, vòng lặp áp tư thế lên bộ xương
  model.ts         DỮ LIỆU: 26 bone, danh mục hình, luật random, seed, tư thế có sẵn
  rig.ts           DỰNG HÌNH: hình học từng bộ phận, vật liệu phẳng, thứ tự lớp, áp tư thế, chạm đất
  geometry.ts      khối tiện (lathe) có bo mép thật: bowl, dome, frustum, puck, flare, bicone…
  weave.ts         bộ sinh pattern đan (port từ "Dynamic Basket Weave Generator v5")
  pose.ts          client WebSocket + đổi 33 landmark MediaPipe thành góc từng khớp
  exports.ts       OBJ (zip), Rig JSON, tải file
  fbx.ts           bộ ghi FBX nhị phân viết riêng cho rig này
  controls.ts      gán nút chuột
  palette.json     18 màu
  webmcp.ts        tích hợp công cụ trình duyệt, không bắt buộc
  styles.css       toàn bộ CSS
mediapipe/
  server.py        server bắt tư thế (MediaPipe Pose → WebSocket), chép nguyên từ dự án lotte-visual-haidoan
  requirements.txt mediapipe 0.10.14, opencv, websockets, numpy<2
  test_video.mp4   video mẫu
tests/             19 test (Vitest)
scripts/           extract_palette.py (trích màu), validate_blender.py (kiểm tra file export trong Blender)
```

Mã viết kiểu rất nén (nhiều lệnh trên một dòng). Khi sửa, giữ đúng phong cách của file đang sửa.

### Luồng dữ liệu

```text
seed / Generate ──► CharacterSpec (model.ts) ──► createCharacter() (rig.ts) ──► nhóm mesh + bộ xương
                                                        ▲                              │
              thứ tự lớp, bảng màu weave ───────────────┘                              ▼
tư thế có sẵn ──► applyPose()   ─┐                                             Scene.tsx vẽ mỗi khung hình
camera ──► server.py ──► pose.ts ─┴► applyAngles()
```

## 6. Mô hình dữ liệu

```ts
type PartChoice = { variant: number; color: number; accent: number; pattern: number };
type CharacterSpec = { version: 1; label: string; parts: Record<boneId, PartChoice>; density: number };
```

- `variant`: chỉ số hình trong danh mục của loại bộ phận đó.
- `color`, `accent`: chỉ số trong `palette.json`.
- `pattern`: 0 = một màu; 1–4 = pattern đan (chỉ thân/hông); 5 = two-tone (chỉ tay/chân).
- `density`: 2–12, là slider Pattern scale (số ô đan hiển thị = `density × 2`).

`normalizeSpec()` trong `model.ts` áp mọi quy tắc ở mục 4 lên bất kỳ spec nào, kể cả seed cũ.

**Không nằm trong seed** (lưu theo trình duyệt bằng `localStorage`): thứ tự lớp, bảng màu weave.

### Seed

Dạng `label~1DPPPP…`: sau dấu `~` là số phiên bản `1`, một ký tự `density`, rồi 4 ký tự cho mỗi bone (variant, color, accent, pattern), tất cả ở hệ cơ số 36, theo đúng thứ tự mảng `bones`. Seed cũ 22 hoặc 24 bone vẫn đọc được; khớp còn thiếu được suy ra từ `label`. Gõ một chuỗi không có `~` thì app coi đó là `label` và sinh nhân vật từ nó.

### Danh mục hình

| Loại | Hình |
|---|---|
| Head | Sphere, Cone, Octagon, Capsule, Cube, Hemisphere |
| Torso | Bowl, Goblet, Mushroom, Hourglass, Martini, Cup, Diamond, Stack, Orb, Donut, Vase |
| Pelvis | Orb, Tire, Bowl, Dome, Puck, Diamond |
| Neck / Lower spine / Hip | Sphere, Bead, Cylinder, Capsule |
| Shoulder / Elbow / Knee | chỉ Sphere |
| Upper arm / Forearm | Cylinder, Cone, Capsule, Box, Chain, Octagon |
| Thigh / Shin | Taper, Bell, Stack, Chain, Octagon, Pill |
| Hand | Sphere, Cube, Ring, Cone, Octagon, Capsule |
| Foot | Flare, Dome, Wedge, Puck, Bell, Octagon |
| Face mark | Dot, Dash, Triangle, Twin dots, Ring, Cross |

## 7. Bộ xương (26 bone)

Trục Y hướng lên, nhân vật quay mặt về +Z, bên trái của nhân vật là +X. Đơn vị là mét. Vị trí dưới đây tính theo bone cha; `±` là + cho bên L, − cho bên R.

```text
root (pelvis)                 (0, 1.39, 0)
├─ spine_lower                (0, 0.07, 0)      dài 0.14
│  └─ spine_upper (torso)     (0, 0.14, 0)      dài 0.42
│     ├─ neck                 (0, 0.42, 0)      dài 0.07
│     │  └─ head              (0, 0.07, 0)      dài 0.31
│     │     └─ face_mark      (0, 0.145, 0.163)
│     └─ shoulder_L/R         (±0.33, 0.325, 0)
│        └─ upperarm_L/R      (±0.02, 0, 0)     dài 0.30
│           └─ elbow_L/R      (0, −0.30, 0)
│              └─ forearm_L/R (0, 0, 0)         dài 0.28
│                 └─ hand_L/R (0, −0.28, 0)
└─ hip_L/R                    (±0.105, −0.03, 0)
   └─ thigh_L/R               (0, 0, 0)         dài 0.60
      └─ knee_L/R             (0, −0.60, 0)
         └─ shin_L/R          (0, 0, 0)         dài 0.60
            └─ foot_L/R       (0, −0.60, 0)     cao 0.16
```

Mỗi bộ phận là một `THREE.SkinnedMesh` tên `<bone>_mesh`, gắn cứng vào đúng một bone (mọi đỉnh trọng số 1). Sau mỗi lần đổi tư thế, cả nhân vật được dịch theo Y để điểm thấp nhất chạm sàn (`ground()` trong `rig.ts`).

### Thứ tự lớp

14 nhóm lớp: Head, Neck, Torso, Lower spine, Pelvis, Shoulders, Upper arms, Elbows, Forearms, Hands, Thighs, Knees, Shins, Feet. Mặc định từ trên (trước) xuống dưới (sau):

`Shoulders › Elbows › Hands › Forearms › Upper arms › Head › Torso › Neck › Pelvis › Lower spine › Knees › Feet › Shins › Thighs`

Dấu trên mặt luôn nằm ngay trên đầu; khớp hông luôn nằm ngay dưới hông. Thứ tự được đổi thành `renderOrder` của mesh (`layerOf()` / `setLayerOrder()` trong `rig.ts`); vật liệu tắt kiểm tra độ sâu nên thứ tự vẽ quyết định cái gì che cái gì.

## 8. Pattern đan

`weave.ts` giữ nguyên thuật toán của file HTML gốc: chọn kiểu bố cục (balanced, vertical, horizontal, blocks, offset), số cột/hàng, bề rộng sợi, màu sợi, màu ô giao nhau, vài dải phủ mờ và lớp hạt. Khác biệt duy nhất: nguồn ngẫu nhiên được khởi tạo từ `label | bone | color | accent | pattern` của nhân vật, nên cùng seed luôn ra cùng tấm vải.

Tấm vải được vẽ ra canvas 1024×1024 rồi dùng làm texture lặp. Thân và hông dùng **UV chiếu phẳng theo mét** (`planarUV()` trong `rig.ts`) nên pattern không bị méo theo hình khối. Kích thước một tấm ngoài đời = `16 / (density × 2) × 0.64` mét.

## 9. Bắt chuyển động

```text
camera / video ──► server.py (MediaPipe Pose) ──WebSocket ws://localhost:8080──► pose.ts ──► rig.applyAngles()
```

**Server gửi** mỗi khung hình: `{type:"pose", landmarks:[{id,x,y,z,visibility}×33], frame:"data:image/jpeg;base64,…"}`. `x, y` chuẩn hóa 0–1 theo khung hình, `y` hướng xuống. Hình webcam đã được lật gương. Ngoài ra có `{type:"source_status", source, error}`. **Client gửi** `{type:"switch_source", source:"webcam"|"video"}` để đổi nguồn.

**`solvePose()`** đổi landmark thành góc xoay Z cục bộ cho từng bone:

- hông (`root`): độ nghiêng của đường nối hai hông; thân (`spine_lower`): hướng từ giữa hông lên giữa vai;
- đầu: hướng từ giữa vai lên giữa hai tai (không dùng đường nối hai tai), giới hạn ±0.6 rad;
- tay: vai→khuỷu, khuỷu→cổ tay, cổ tay→ngón trỏ; chân: hông→gối, gối→cổ chân; bàn chân luôn giữ ngang;
- góc cục bộ = góc tuyệt đối − góc của bone cha.

Hai điểm dễ sai, đã xử lý:

1. **Đường nối hai hông/hai vai được coi là đường không có hướng.** Khi người xoay ngang hoặc quay lưng, hai điểm đổi chỗ trái/phải trên hình; nếu đọc như một hướng thì cả người lật nửa vòng.
2. **Độ tin cậy theo chiều dài.** Tay chân chĩa về phía camera chiếu thành đoạn rất ngắn, hướng của nó gần như là nhiễu. Mỗi bone có độ tin cậy 0–1 theo chiều dài đoạn trên hình; đoạn càng ngắn, bone càng bám chậm.

Bone có landmark không nhìn thấy (`visibility < 0.5`) giữ góc cũ. Làm mượt là nội suy hàm mũ theo từng bone, hệ số từ slider Motion smoothing.

**Giới hạn hiện tại:** nhân vật đứng tại chỗ (không đi ngang, không nhảy theo người); chỉ theo một người; không có chiều sâu.

## 10. Export

Menu Export có bốn mục: **FBX** (có bộ xương, 26 bone, texture nhúng), **OBJ bundle** (zip gồm obj, mtl, texture, rig.json), **Rig JSON**, **PNG** (chụp đúng khung nhìn hiện tại).

Lưu ý: FBX và OBJ xuất **khối 3D** của nhân vật ở tư thế đang thấy, không phải hình phẳng. Các file export đã được kiểm tra bằng Blender ở bản 3D 22 bone; **chưa kiểm tra lại** sau khi lên 26 bone và chuyển sang vật liệu phẳng.

## 11. Test

`npm test` chạy 19 test: seed khứ hồi và seed cũ, màu kề nhau không trùng, đối xứng trái/phải qua random và khóa, pattern đúng chỗ, không lặp chuỗi hạt, bo mép trên và dưới, hông bao kín khớp hông, chiều cao 2.4, bộ xương và trọng số, giải góc từ landmark, tư thế chỉ xoay trong mặt phẳng, xuất FBX/OBJ.

Test chạy trong Node, không có canvas, nên không phủ phần vẽ texture và giao diện. Sau khi sửa hình hay giao diện, cần mở app xem bằng mắt.

## 12. Muốn sửa thì sửa ở đâu

| Việc | File |
|---|---|
| Thêm/sửa một hình | `geometry.ts` (khối cơ bản) và hàm tương ứng trong `rig.ts` (`torsoGeometry`, `pelvisGeometry`, `legGeometry`, `armGeometry`, `footGeometry`, `geometryFor`); thêm tên vào `variants` trong `model.ts` |
| Đổi luật random, đối xứng, pattern | `generate()` và `normalizeSpec()` trong `model.ts` |
| Đổi tỉ lệ cơ thể | mảng `bones` trong `model.ts` (đổi vị trí sẽ ảnh hưởng test chiều cao) |
| Đổi tư thế có sẵn | `poseRotation()` trong `model.ts` |
| Đổi cách bắt chuyển động | `solvePose()` trong `pose.ts` |
| Đổi màu / bảng màu weave | `palette.json`; `weavePalettes` trong `weave.ts` |
| Đổi thứ tự lớp mặc định | `defaultLayerOrder` trong `rig.ts` |
| Giao diện | `App.tsx`, `PartsPanel.tsx`, `PosePanel.tsx`, `styles.css` |

Thêm hình mới vào **cuối** danh sách `variants` để seed cũ không đổi nghĩa. Thêm bone mới sẽ đổi độ dài seed: phải thêm thứ tự cũ vào `legacyOrders` trong `model.ts`.

## 13. Lỗi hay gặp

- **Canvas trắng khi tab trình duyệt đang ẩn:** trình duyệt tạm dừng vẽ ở tab ẩn. Đưa tab lên trước là hiện.
- **Live pose báo "Not connected":** server chưa chạy. Chạy `npm run pose` hoặc `npm run pose:video` trong thư mục dự án.
- **Server báo không mở được camera:** chưa cấp quyền Camera cho terminal, hoặc camera đang bị app khác dùng.
- **`uv: command not found`:** chưa cài `uv`.
- **Mở `dist/index.html` trực tiếp thấy trắng:** bản build phải chạy qua HTTP (`npm run preview`).
