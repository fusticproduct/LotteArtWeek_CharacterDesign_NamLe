# Geofolk — Character Studio (bản 2D)

> Tài liệu này dành cho người mới nhận dự án, hoặc để đưa vào một trợ lý AI (ChatGPT, Claude…) làm ngữ cảnh.
> Nó mô tả đúng trạng thái mã nguồn ngày 11/10/2026. Đọc hết một lượt là đủ để chạy app, hiểu cấu trúc và sửa tiếp.

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

Nhân vật **trông** 2D. **Đầu, thân và dấu mặt** là hình phẳng thật (như tấm bìa mỏng 3 cm, góc bo nhẹ). Các bộ phận còn lại vẫn là khối 3D. Tất cả gắn trên một bộ xương thật. Hình 2D có được nhờ ba thứ:

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
npm test        # 27 test tự động
npm run build   # bản production trong dist/ (phải phục vụ qua HTTP, không mở file trực tiếp)
npm run preview # xem thử bản build
```

### Bật bắt chuyển động (không bắt buộc)

Cần cài [`uv`](https://docs.astral.sh/uv/) (trình quản lý Python). Server cần Python 3.10 trở lên; `uv` tự tải Python 3.11 và các gói cần thiết ở lần chạy đầu, không đụng tới Python của máy.

Khi app chạy bằng `npm run dev` (hoặc `npm run preview`), **không cần gõ lệnh gì thêm**: trong tab **Live pose** bấm **Start live pose** (webcam) hoặc bấm thẳng **Demo video**, app tự bật server (`mediapipe/vite-plugin.js`). Lần đầu mất khoảng 10–60 giây, trạng thái hiện "Starting pose server…". Bấm **Stop live pose** thì server do app bật cũng tắt theo; tắt `npm run dev` cũng tắt luôn server.

Muốn tự chạy server (ví dụ khi mở bản build tĩnh):

```sh
npm run pose          # dùng webcam
npm run pose:video    # phát lặp mediapipe/test_video.mp4 (để thử khi không có camera)
```

Trên macOS, lần đầu dùng webcam phải cấp quyền Camera cho ứng dụng đang chạy terminal (System Settings → Privacy & Security → Camera).

## 3. Giao diện

| Khu vực | Chức năng |
|---|---|
| Thanh trên | Ô **Seed** (gõ rồi Enter để áp dụng, nút copy lấy seed đầy đủ), menu **Export**, nút **Colors** (bộ màu mới, giữ nguyên hình và tên; bộ phận đã khóa giữ màu), nút **×6** (Generate ra 6 nhân vật trên sân khấu để chọn một, vẫn giữ bộ phận đã khóa; Esc để đóng), nút **Generate** |
| Khung nhân vật (trái) | Kéo để di chuyển khung nhìn, cuộn để zoom. Bốn nút bên phải khung: fit về giữa, hiện bộ xương, mở tab Live pose, đổi nền đen/nền giấy (mặc định đen, giống video tham chiếu; PNG export lấy đúng nền đang chọn) |
| Thanh dưới khung | Bốn tư thế: At ease, Hands up, Step out (ba tư thế này "thở" nhẹ: thân, đầu, tay đung đưa chu kỳ 3.6 s; tắt khi hệ điều hành bật giảm chuyển động) và **Dance** (phát lặp 3 phút nhảy đã ghi từ video mẫu, không cần server hay camera) |
| Tab **Parts** (phải) | Bộ phận và lớp: danh sách 7 khối lớp (Arms, Head, Torso, Neck, Pelvis, Lower spine, Legs); **khối trên cùng được vẽ phía trước**. Kéo tay nắm ở đầu khối để đổi thứ tự (hoặc chọn tay nắm rồi bấm ↑/↓). Trong khối Arms/Legs, các bộ phận xếp theo thứ tự vẽ cố định (xem mục 7). Mỗi dòng có nút random (đổi **hình** của bộ phận, giữ màu; với dòng khớp thì đổi màu khớp) và nút khóa. "Reset order" trả về thứ tự mặc định |
| Dưới danh sách | Slider **Pattern scale** (số ô đan, mặc định 6), chọn **Palette** (HFCD / XMAS / TET: đổi màu cả nhân vật, pattern đan và nền đen của sân khấu), **Paper texture** On/Off (vân giấy và đậm nhạt nhẹ trên mọi bộ phận; lưu theo trình duyệt; không đi vào file FBX/OBJ), số bộ phận đang khóa |
| Tab **Proportions** | 9 slider 50–150% chỉnh cỡ bộ phận cho mọi nhân vật: Head, Torso width, Torso height, Pelvis, Arm thickness, Leg thickness, Hands, Feet, Joints. **Save as default** ghi giá trị hiện tại vào `src/proportions.json` (khi chạy `npm run dev`), thành mặc định chung của dự án cho mọi trình duyệt; bản build tĩnh thì chỉ lưu cho trình duyệt đó. **Reset** trả về mặc định đã lưu; "Set all sliders to 100%" trả về cỡ gốc. Giá trị đang chỉnh lưu theo trình duyệt, không nằm trong seed |
| Tab **Live pose** | Bật/tắt bắt chuyển động, trạng thái kết nối, chọn Webcam / Demo video (bấm khi đang tắt cũng bật luôn với nguồn đó), slider **Motion smoothing**, ô xem hình camera |

Các cặp trái/phải luôn đi chung (vai, khuỷu, bàn tay, gối, bàn chân, đùi, ống chân) hiện thành một dòng. Bắp tay và cẳng tay có dòng Left/Right riêng.

## 4. Các quy tắc thiết kế đã chốt

Đây là những quyết định có chủ đích. Đừng "sửa" chúng nếu không được yêu cầu.

- **Đối xứng:** bàn tay, bàn chân và mọi khớp (vai, khuỷu, hông, gối) luôn cùng hình và cùng màu hai bên. Đùi và ống chân cùng hình hai bên, màu tự do. Khóa hoặc random một bên là áp dụng cho cả cặp.
- **Khớp một màu:** mọi khớp của một nhân vật dùng chung một màu, khác màu mọi bộ phận kề nó; khóa hoặc random một dòng khớp là áp dụng cho tất cả khớp. Khớp nhỏ còn 85% cỡ bản 2D đầu tiên.
- **Màu:** chỉ dùng 18 màu trong `src/palette.json` (trích từ ảnh tham chiếu `public/reference.png`). Hai bộ phận nối liền nhau không trùng màu. Dấu trên mặt luôn màu tối.
- **Palette XMAS / TET đổi màu cả nhân vật:** HFCD dùng đúng màu trong seed. XMAS (nền xanh `#114DDC`, thân xanh lá, đỏ, trắng, xanh nhạt, vàng) và TET (nền đỏ `#C01E2E`, thân vàng, hồng, đỏ cam, cam, kem, ngọc, xanh lá) lấy mẫu từ ảnh poster của anh Nam. Khi vẽ, mỗi màu nhân vật đang dùng được đổi sang một màu riêng trong bộ, theo vai trò (thân A, cổ B, tay chân C, khớp J, đầu H) với cùng quy tắc phối màu, nên bộ phận kề nhau vẫn khác màu; dấu mặt dùng màu tối của bộ. Seed không đổi, cùng nhân vật luôn ra cùng màu. Nền giấy (sáng) giữ nguyên. Code: `src/themes.ts`.
- **Bộ màu riêng từng nhân vật:** mỗi nhân vật rút một bộ 5 màu từ 15 màu tươi: 2 màu thân (A, B), 1 màu nhấn (bàn tay, bàn chân, hông), 1 màu khớp, 1 màu đầu. B cùng tông khác độ sáng, đối nhau trên vòng màu, hoặc tương phản sáng tối với A; màu nhấn xa A và B trên vòng màu; màu khớp sáng hoặc tối hẳn hơn A, B. A và B rải lên tay chân theo 1 trong 4 kiểu (tay/chân, đoạn trên/dưới, xen kẽ, trái/phải). Có 55.536 bộ × 4 kiểu rải. Bộ màu không nằm trong seed (seed lưu màu từng bộ phận). Code: `drawScheme()`, `schemeColor()`, `paint()`, `recolor()` trong `model.ts`.
- **Pattern:** chỉ thân (torso) và hông (pelvis) có pattern đan. Tay và chân dạng khối liền có thể chia **hai lớp màu** (two-tone). Mọi bộ phận khác một màu.
- **Không lặp chuỗi hạt:** mỗi tay hoặc chân có tối đa một đoạn dạng hạt (Chain/Stack).
- **Hạt Chain luôn tròn đều:** mỗi hạt là hình cầu thật, không bị kéo dãn hay ép dẹt theo độ dài đoạn hoặc slider Proportions. Độ dài đoạn quyết định số hạt (các tâm cách nhau ~1.35 bán kính); hạt ở chân vẫn to dần xuống dưới. Code: `beads()` trong `rig.ts`.
- **Khớp là quả cầu riêng:** vai, khuỷu, gối là bộ phận riêng, chỉ có dạng cầu. Đoạn tay/chân được cắt ngắn đúng chỗ tựa lên mặt cầu, nên khớp luôn nhìn thấy khi gập.
- **Chân:** đùi mảnh như tay, càng xuống càng to, bàn chân loe.
- **Tỉ lệ:** ở mặc định (Proportions 100%) nhân vật đứng thẳng cao đúng 2.4 đơn vị; chiều dài xương không đổi theo hình dạng. Các kiểu thân có cùng tầm cỡ với thân Orb (rộng ~0.62), vì anh Nam chọn Orb là tỉ lệ đẹp.
- **Vai bám mép thân:** tâm quả cầu vai đặt cách mép thân 0.07 ở độ cao vai, nên vị trí vai (x) đổi theo kiểu thân và slider Torso width; tay luôn mọc từ thân.
- **Seed:** cùng seed phải ra cùng nhân vật (kể cả pattern đan).

## 5. Cấu trúc mã nguồn

```text
src/
  main.tsx         điểm vào React
  App.tsx          trạng thái chính (nhân vật, khóa, seed, thứ tự lớp, bảng màu weave), thanh công cụ, export
  PartsPanel.tsx   tab Parts & layers: danh sách lớp kéo thả + random/khóa từng bộ phận
  ProportionsPanel.tsx tab Proportions (slider cỡ bộ phận, Save as default)
  proportions.json mặc định của Proportions, do nút Save as default ghi
  PosePanel.tsx    tab Live pose
  Scene.tsx        canvas: camera trực giao, pan/zoom, vòng lặp áp tư thế lên bộ xương
  model.ts         DỮ LIỆU: 26 bone, danh mục hình, luật random, seed, tư thế có sẵn
  rig.ts           DỰNG HÌNH: hình học từng bộ phận, vật liệu phẳng, thứ tự lớp, áp tư thế, chạm đất
  geometry.ts      khối tiện (lathe) có bo mép thật: bowl, dome, frustum, puck, flare, bicone…
  weave.ts         bộ sinh pattern đan (port từ "Dynamic Basket Weave Generator v5")
  pose.ts          client WebSocket + đổi 33 landmark MediaPipe thành góc từng khớp
  motion.ts        thở nhẹ cho tư thế có sẵn, phát tư thế Dance
  dance.ts / dance.json  dữ liệu Dance đã nén (15 khung/giây, góc từng xương + thứ tự lớp)
  themes.ts        palette HFCD / XMAS / TET: màu bộ phận và màu nền theo palette
  thumbnails.ts    vẽ nhân vật ra ảnh (dùng cho lưới ×6)
  ExploreGrid.tsx  lưới ×6 trên sân khấu
  exports.ts       OBJ (zip), Rig JSON, tải file
  fbx.ts           bộ ghi FBX nhị phân viết riêng cho rig này
  controls.ts      gán nút chuột
  palette.json     18 màu
  webmcp.ts        tích hợp công cụ trình duyệt, không bắt buộc
  styles.css       toàn bộ CSS
mediapipe/
  server.py        server bắt tư thế (MediaPipe Pose → WebSocket), chép nguyên từ dự án lotte-visual-haidoan
  requirements.txt mediapipe 0.10.14, opencv, websockets, numpy<2
  vite-plugin.js   cho app tự bật/tắt server.py khi chạy npm run dev (route /__pose/start|stop|status)
  test_video.mp4   video mẫu
tests/             27 test (Vitest)
scripts/           extract_palette.py (trích màu), validate_blender.py (kiểm tra file export trong Blender),
                   extract_landmarks.py + bake-dance.ts (làm dữ liệu Dance),
                   vite-defaults.js (route dev /__defaults/proportions cho nút Save as default)
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
- `density`: 2–12, là slider Pattern scale (số ô đan hiển thị = `density × 2`). Nhân vật mới mặc định 3 (6 ô).

`normalizeSpec()` trong `model.ts` áp mọi quy tắc ở mục 4 lên bất kỳ spec nào, kể cả seed cũ.

**Không nằm trong seed** (lưu theo trình duyệt bằng `localStorage`): thứ tự lớp, bảng màu weave, tỉ lệ bộ phận đang chỉnh (Proportions), nền đen/giấy. Mặc định của Proportions nằm trong `src/proportions.json`.

### Seed

Dạng `label~2DPPPP…`: sau dấu `~` là số phiên bản (`2` = danh mục có đầu, thân, dấu mặt phẳng; `1` = danh mục 3D cũ), một ký tự `density`, rồi 4 ký tự cho mỗi bone (variant, color, accent, pattern), tất cả ở hệ cơ số 36, theo đúng thứ tự mảng `bones`. Seed cũ 22 hoặc 24 bone vẫn đọc được; khớp còn thiếu được suy ra từ `label`. Gõ một chuỗi không có `~` thì app coi đó là `label` và sinh nhân vật từ nó.

Seed phiên bản `1` vẫn mở được. Thân cũ (11 kiểu) được quy đổi sang thân phẳng gần nhất theo bảng `legacyTorso` trong `model.ts`: Bowl→Bowl, Goblet/Martini/Cup/Vase→Funnel, Mushroom→Fan, Hourglass/Stack→Column, Diamond/Orb→Orb, Donut→Donut. Đầu và dấu mặt giữ nguyên số thứ tự (Sphere→Circle, Cone→Triangle, Octagon→Hexagon, Capsule→Down triangle, Cube→Square, Hemisphere→Dome; Cross→Bar).

### Danh mục hình

| Loại | Hình |
|---|---|
| Head (phẳng) | Circle, Triangle, Hexagon, Down triangle, Square, Dome |
| Torso (phẳng) | Column, Funnel, A-line, Bowl, Fan, Orb, Donut |
| Pelvis | Orb, Tire, Bowl, Dome, Puck, Diamond |
| Neck / Lower spine / Hip | Sphere, Bead, Cylinder, Capsule |
| Shoulder / Elbow / Knee | chỉ Sphere |
| Upper arm / Forearm | Cylinder, Cone, Capsule, Box, Chain, Octagon |
| Thigh / Shin | Taper, Bell, Stack, Chain, Octagon, Pill |
| Hand | Sphere, Cube, Ring, Cone, Octagon, Capsule |
| Foot | Flare, Dome, Wedge, Puck, Bell, Octagon |
| Face mark (phẳng) | Dot, Dash, Triangle, Twin dots, Ring, Bar |

## 7. Bộ xương (26 bone)

Trục Y hướng lên, nhân vật quay mặt về +Z, bên trái của nhân vật là +X. Đơn vị là mét. Vị trí dưới đây tính theo bone cha; `±` là + cho bên L, − cho bên R.

```text
root (pelvis)                 (0, 1.39, 0)
├─ spine_lower                (0, 0.07, 0)      dài 0.14
│  └─ spine_upper (torso)     (0, 0.14, 0)      dài 0.42
│     ├─ neck                 (0, 0.42, 0)      dài 0.07
│     │  └─ head              (0, 0.07, 0)      dài 0.31
│     │     └─ face_mark      (0, 0.145, 0.163)
│     └─ shoulder_L/R         (±x, 0.325, 0)   x = mép thân + 0.07 (≈0.27–0.38)
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

7 khối lớp, người dùng kéo để đổi. Mặc định từ trên (trước) xuống dưới (sau):

`Arms › Head › Torso › Neck › Pelvis › Lower spine › Legs`

Quy tắc bên trong (không kéo được, để tay chân không bao giờ trông như bị gãy):

- **Mỗi tay/chân là một khối liền**, không xen kẽ với tay/chân bên kia. Thứ tự từ sau ra trước: bắp tay › vai › cẳng tay › khuỷu › bàn tay; đùi › ống chân › gối › bàn chân. Nhờ vậy quả cầu khớp luôn che hai đầu đoạn nó nối, và bàn tay gập lên vai vẫn nằm trước vai.
- **Tay/chân nào ở trước:** mặc định là bên trái nhân vật. Khi Live pose, app dùng độ sâu `z` của MediaPipe: tay (khuỷu + cổ tay) hoặc chân (gối + cổ chân) gần camera hơn thì vẽ trước. Có vùng chết (0.12 cho tay, 0.1 cho chân) và chỉ đổi khi tín hiệu giữ đủ 5 khung hình, nên không nhấp nháy.
- **Tay ra sau lưng** (cổ tay xa camera hơn vai quá 0.2; trở lại khi dưới 0.05) thì được vẽ ngay dưới thân. Chỉ áp dụng khi khối Arms đang nằm trên Torso.
- Dấu trên mặt luôn nằm ngay trên đầu; khớp hông luôn nằm ngay dưới hông.

Thứ tự được tính trong `drawOrder()` (`rig.ts`) rồi đổi thành `renderOrder` của mesh; vật liệu tắt kiểm tra độ sâu nên thứ tự vẽ quyết định cái gì che cái gì. Thứ tự 14 nhóm cũ lưu trong trình duyệt được tự đổi sang 7 khối.

## 8. Pattern đan

`weave.ts` giữ nguyên thuật toán của file HTML gốc: chọn kiểu bố cục (balanced, vertical, horizontal, blocks, offset), số cột/hàng, bề rộng sợi, màu sợi, màu ô giao nhau, vài dải phủ mờ và lớp hạt. Khác biệt duy nhất: nguồn ngẫu nhiên được khởi tạo từ `label | bone | color | accent | pattern` của nhân vật, nên cùng seed luôn ra cùng tấm vải.

Tấm vải được vẽ ra canvas 1024×1024 rồi dùng làm texture lặp. Thân và hông dùng **UV chiếu phẳng theo mét** (`planarUV()` trong `rig.ts`) nên pattern không bị méo theo hình khối. Kích thước một tấm ngoài đời = `16 / (density × 2) × 0.64` mét.

## 9. Bắt chuyển động

```text
camera / video ──► server.py (MediaPipe Pose) ──WebSocket ws://localhost:8080──► pose.ts ──► rig.applyAngles()
```

**Ai bật server:** khi chạy `npm run dev`/`preview`, `vite-plugin.js` thêm route `/__pose/start|stop|status`. `pose.ts` kết nối thất bại lần đầu thì gọi `start` (một lần), sau đó thử kết nối lại mỗi 2 giây; nếu server chết (ví dụ không mở được camera) thì hiện dòng lỗi cuối của Python. Bản build tĩnh không có route này nên app chỉ nhắc lệnh `npm run pose` / `pose:video`. Server chỉ là một: app nối vào bất kỳ server nào đang nghe ở cổng 8080, kể cả server do dự án khác bật.

**Server gửi** mỗi khung hình: `{type:"pose", landmarks:[{id,x,y,z,visibility}×33], frame:"data:image/jpeg;base64,…"}`. `x, y` chuẩn hóa 0–1 theo khung hình, `y` hướng xuống. Hình webcam đã được lật gương. Ngoài ra có `{type:"source_status", source, error}`. **Client gửi** `{type:"switch_source", source:"webcam"|"video"}` để đổi nguồn.

**`solvePose()`** đổi landmark thành **hướng trên màn hình** của từng bone được đo, kèm độ tin cậy và tín hiệu độ sâu:

- hông (`root`): độ nghiêng của đường nối hai hông; thân (`spine_lower`): hướng từ giữa hông lên giữa vai;
- đầu: hướng từ giữa vai lên giữa hai tai (không dùng đường nối hai tai), giới hạn ±0.6 rad;
- tay: vai→khuỷu, khuỷu→cổ tay, cổ tay→ngón trỏ; chân: hông→gối, gối→cổ chân; bàn chân luôn giữ ngang;
- `toLocal()` đổi hướng trên màn hình thành góc cục bộ: góc của bone − góc của bone được đo gần nhất phía trên nó (khớp, cổ, thân trên không được đo, giữ góc 0).

Ba điểm dễ sai, đã xử lý:

1. **Đường nối hai hông/hai vai được coi là đường không có hướng.** Khi người xoay ngang hoặc quay lưng, hai điểm đổi chỗ trái/phải trên hình; nếu đọc như một hướng thì cả người lật nửa vòng.
2. **Độ tin cậy theo chiều dài.** Tay chân chĩa về phía camera chiếu thành đoạn rất ngắn, hướng của nó gần như là nhiễu. Mỗi bone có độ tin cậy 0–1 theo chiều dài đoạn trên hình; đoạn càng ngắn, bone càng bám chậm. Đo trên video mẫu: khi cẳng tay dài hơn 35% thân trên hình, nhân vật lệch hướng thật trung bình ~1°. Lệch lớn chỉ xảy ra khi cẳng tay ngắn dưới 15% (chĩa thẳng vào camera); lúc đó nhân vật giữ hướng cũ là có chủ đích.
3. **Làm mượt theo hướng trên màn hình, không theo góc cục bộ** (`smoothPose()`). Trước đây làm mượt góc cục bộ, nên bắp tay bám chậm kéo lệch luôn cẳng tay, và bàn chân hơi nghiêng khi đang chuyển động. Giờ mỗi bone tự bám theo hướng của chính nó, rồi mới đổi sang góc cục bộ; bàn chân luôn nằm ngang đúng tuyệt đối.

Bone có landmark không nhìn thấy (`visibility < 0.5`) giữ góc cũ. Hệ số làm mượt lấy từ slider Motion smoothing. Thứ tự lớp theo độ sâu: xem mục 7 (`updateLayers()`).

**Kiểm tra motion bằng video mẫu:** chạy MediaPipe trên toàn bộ `test_video.mp4` (5523 khung), đưa tọa độ qua `solvePose` / `smoothPose` rồi đo độ lệch so với hướng thật và số lần giật. Cách làm này bắt được lỗi mà mắt khó thấy.

**Giới hạn hiện tại:** nhân vật đứng tại chỗ (không đi ngang, không nhảy theo người); chỉ theo một người; độ sâu chỉ dùng để xếp lớp, không làm ngắn tay chân. Khi người đứng nghiêng hẳn, MediaPipe có thể lẫn nhãn tay trái/phải (~2% khung trong video mẫu); vì hai tay khi đó cùng hướng nên ít thấy lỗi.

## 10. Export

Menu Export có bốn mục: **FBX** (có bộ xương, 26 bone, texture nhúng), **OBJ bundle** (zip gồm obj, mtl, texture, rig.json), **Rig JSON**, **PNG** (chụp đúng khung nhìn hiện tại).

Lưu ý: FBX và OBJ xuất **khối 3D** của nhân vật ở tư thế đang thấy, không phải hình phẳng. Các file export đã được kiểm tra bằng Blender ở bản 3D 22 bone; **chưa kiểm tra lại** sau khi lên 26 bone và chuyển sang vật liệu phẳng.

## 11. Test

`npm test` chạy 28 test: bộ màu riêng từng nhân vật, seed khứ hồi, seed cũ và seed phiên bản 1, màu kề nhau không trùng, đối xứng trái/phải qua random và khóa, pattern đúng chỗ, không lặp chuỗi hạt, bo mép trên và dưới, hông bao kín khớp hông, chiều cao 2.4, bộ xương và trọng số, giải góc từ landmark, làm mượt theo hướng màn hình, thứ tự lớp trong tay/chân và theo độ sâu, slider tỉ lệ và vai bám mép thân, tư thế chỉ xoay trong mặt phẳng, xuất FBX/OBJ, palette XMAS/TET đổi màu cả nhân vật mà bộ phận kề nhau vẫn khác màu.

Test chạy trong Node, không có canvas, nên không phủ phần vẽ texture và giao diện. Sau khi sửa hình hay giao diện, cần mở app xem bằng mắt.

## 12. Muốn sửa thì sửa ở đâu

| Việc | File |
|---|---|
| Thêm/sửa một hình | Hình phẳng: thêm đường viền vào `headOutlines`, `torsoOutlines` hoặc `markOutlines` trong `rig.ts` (dựng bằng `paper()` trong `geometry.ts`, tự bo góc nhọn). Khối 3D: `geometry.ts` và hàm tương ứng trong `rig.ts` (`pelvisGeometry`, `legGeometry`, `armGeometry`, `footGeometry`, `geometryFor`). Thêm tên vào `variants` trong `model.ts` |
| Đổi luật random, đối xứng, pattern | `generate()` và `normalizeSpec()` trong `model.ts`; luật phối màu ở `drawScheme()` / `schemeColor()` |
| Đổi tỉ lệ cơ thể | mảng `bones` trong `model.ts` (đổi vị trí sẽ ảnh hưởng test chiều cao) |
| Đổi tư thế có sẵn | `poseRotation()` trong `model.ts`; nhịp thở trong `breathe()` (`motion.ts`) |
| Đổi điệu Dance | Trích landmark từ video bằng `scripts/extract_landmarks.py`, rồi `npx vite-node scripts/bake-dance.ts <landmarks.json>` ghi lại `src/dance.json` (đi qua đúng bộ giải, làm mượt và xếp lớp của Live pose; bước quay quá 0.9 rad/khung bị chặn vì là MediaPipe đọc nhầm) |
| Đổi chất giấy | `paperGrain()` và `addPaper()` trong `rig.ts` |
| Đổi cách bắt chuyển động | `solvePose()` trong `pose.ts` |
| Đổi màu / bảng màu weave | `palette.json`; `weavePalettes` trong `weave.ts`; màu thân và nền của XMAS/TET trong `paletteLooks` (`themes.ts`) |
| Đổi thứ tự lớp mặc định | `defaultLayerOrder` trong `rig.ts` |
| Giao diện | `App.tsx`, `PartsPanel.tsx`, `PosePanel.tsx`, `styles.css` |

Thêm hình mới vào **cuối** danh sách `variants` để seed cũ không đổi nghĩa. Thêm bone mới sẽ đổi độ dài seed: phải thêm thứ tự cũ vào `legacyOrders` trong `model.ts`. Bỏ hoặc thay cả danh mục của một bộ phận thì tăng số phiên bản seed và thêm bảng quy đổi (như `legacyTorso`).

Đỉnh đầu phải chạm đúng 2.4 (có test); hình đầu tự được nâng lên sau khi bo góc. Mỗi bộ phận phải nhỏ hơn 1 m (có test). Thân phải rộng ít nhất ±0.24 ở độ cao vai để quả cầu vai luôn chạm mép thân.

## 13. Lỗi hay gặp

- **Canvas trắng khi tab trình duyệt đang ẩn:** trình duyệt tạm dừng vẽ ở tab ẩn. Đưa tab lên trước là hiện.
- **Live pose báo "Not connected":** server không bật được. Đọc dòng lỗi dưới trạng thái (thường là thiếu `uv` hoặc chưa cấp quyền Camera). Nếu đang mở bản build tĩnh thì phải tự chạy `npm run pose` hoặc `npm run pose:video`.
- **Hình trong ô Camera không phải video của Geofolk:** một dự án khác (ví dụ `lotte-visual-haidoan`) đang chạy server riêng ở cùng cổng 8080. Tắt server đó đi.
- **Server báo không mở được camera:** chưa cấp quyền Camera cho terminal, hoặc camera đang bị app khác dùng.
- **`uv: command not found`:** chưa cài `uv`.
- **Mở `dist/index.html` trực tiếp thấy trắng:** bản build phải chạy qua HTTP (`npm run preview`).
