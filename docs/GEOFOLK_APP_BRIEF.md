# Geofolk — Đặc tả app tạo nhân vật hình học 3D

> Tài liệu bàn giao để đưa vào AI coding tool hoặc gửi cho lập trình viên khác. Nội dung phản ánh thiết kế đã chốt đến ngày 23/09/2026. Có thể dùng để xây lại app từ đầu hoặc tiếp tục phát triển source hiện có.

## 1. Yêu cầu thực hiện

Hãy xây dựng một web app tên **Geofolk — Character Studio**, cho phép tạo ngẫu nhiên nhân vật từ các khối hình học 3D có sẵn. App phải có scene 3D tương tác thật, rig xương thật, random theo seed, khóa/reroll từng bộ phận và export FBX/OBJ/JSON/PNG hoạt động thực tế.

Đọc toàn bộ tài liệu trước khi triển khai. Các quyết định tại mục 2 là thiết kế mới nhất và được ưu tiên nếu có mâu thuẫn với brief hoặc ảnh cũ. Code, tên biến, tên file và nhãn giao diện dùng tiếng Anh. Không thay canvas 3D bằng ảnh hoặc mockup tĩnh.

## 2. Những quyết định đã chốt — cần giữ nguyên

- Giao diện tối giản, canvas chiếm phần lớn màn hình; danh sách bên phải có hàng thấp, khoảng cách gọn.
- Không hiển thị dải palette ở màn hình chính. Không có icon trang trí hình khối ở đầu mỗi hàng part. Vẫn giữ nút thao tác reroll/lock.
- Kéo chuột trái để orbit. **Giữ chuột giữa và kéo để pan**, không dùng thao tác này để zoom. Chuột phải cũng pan; cuộn wheel để zoom.
- Hình nón và hình trụ tròn có nhiều subdivision và bevel nhẹ; bề mặt mịn, cạnh bắt sáng mềm.
- **Bỏ các chốt nối cơ khí, trục nối mảnh, socket vai và khoảng hở cố ý giữa các đoạn.** Tay/chân ghép trực tiếp như các khối đồ chơi. Có thể dùng phần bo/cầu nhỏ nằm tại đầu khối để giữ chỗ tiếp giáp khi xoay.
- Thigh và shin dài **0.60 unit mỗi đoạn**, bằng 1.5 lần chiều dài gốc 0.40. Không quay lại chân ngắn.
- Shoulder **chỉ dùng Sphere**, kể cả khi đọc seed cũ có chọn capsule/cylinder.
- Hông gọn: hai tâm Hip cách nhau **0.26 unit**. Pelvis đủ lớn để che kín mesh Hip ở mọi biến thể. Bone Hip vẫn tồn tại để animate.
- Export chính là **FBX và OBJ**, thay cho yêu cầu GLB ban đầu. Giữ Rig JSON và PNG.

## 3. Phong cách thị giác

Nhân vật gồm những khối sphere, cone, cylinder, capsule, box, octagon, hemisphere, torus/ring và chuỗi cầu ghép thành hình người. Tạo cảm giác đồ chơi điêu khắc vui nhộn, màu rực rỡ, tương phản cao, có thể bất đối xứng trái/phải.

Một số part phủ caro, dệt, sọc hoặc gradient hai màu. Vật liệu như nhựa/sơn mờ, không bóng kim loại. Dùng MeshStandardMaterial; hiện tại roughness 0.78, metalness 0.

Ảnh tham chiếu chỉ định hướng ngôn ngữ hình khối và nguồn palette, không yêu cầu dựng lại bố cục 2D. Nền trung tính sáng; ánh sáng cần đọc rõ thể tích khi xem từ nhiều góc.

## 4. Stack và phạm vi

- React + TypeScript + Vite.
- Three.js qua `@react-three/fiber` và `@react-three/drei`.
- Tailwind/CSS chỉ phụ trách giao diện.
- PRNG xác định theo seed; cùng seed và cùng phiên bản generator phải tạo cùng lựa chọn part/màu/pattern.
- CanvasTexture cho texture procedural; không cần dịch vụ tạo ảnh.
- Toàn bộ generate, render và export chạy trong trình duyệt. Không yêu cầu backend, tài khoản hoặc API key.
- Bản hiện có dùng React 19.1, Three.js 0.180, Fiber 9.3, Drei 10.7, Vite 7.1, TypeScript 5.8 và Vitest 3.2. Có thể giữ các bản này khi tiếp tục source hiện có.

## 5. Luồng sử dụng và UI

1. Mở app: thấy ngay một nhân vật hoàn chỉnh trong studio 3D.
2. Bấm **Generate** để random mọi part chưa khóa.
3. Bên phải, mỗi hàng gồm tên slot, tên biến thể, nút reroll và nút lock. Chia nhóm Body, Left arm, Right arm, Left leg, Right leg.
4. Reroll một hàng chỉ thay đổi part đó. Generate giữ nguyên lựa chọn shape/màu/pattern của các part khóa.
5. Ô Seed có nhập, Apply và Copy. Enter cũng áp dụng seed. Seed lỗi phải có thông báo, không làm app crash.
6. Copy phải lấy **seed đầy đủ chứa trạng thái lựa chọn**, kể cả sau lock/reroll, không chỉ lấy nhãn seed ban đầu. Apply seed xóa trạng thái khóa.
7. Các preset camera: Front, ¾ View, Side. Có Auto rotate chậm và Show skeleton.
8. Ba pose: At ease, Hands up, Step out. Pose thực hiện bằng rotation trên bone.
9. Pattern scale chỉnh mật độ pattern toàn cục, mặc định 6 × 6, khoảng 2–12. Đây là tùy chỉnh toàn cục nên ảnh hưởng cả part khóa.
10. Dropdown Export chứa FBX, OBJ bundle, Rig JSON và PNG.

Bố cục desktop: header gọn có logo/tên app; toolbar có seed, export, generate; viewport bên trái; panel cuộn bên phải; pose ở dưới viewport. Không đưa chi tiết triển khai kỹ thuật vào giao diện người dùng. Trên màn hình nhỏ, bố trí lại để canvas và thao tác chính vẫn dùng được.

## 6. Rig chuẩn

Dùng `THREE.Bone`, một `THREE.Skeleton` dùng chung và `THREE.SkinnedMesh`. Không thay hệ bone bằng các Group thông thường. Mỗi vertex có đúng một skin weight bằng 1, gắn vào bone của part tương ứng — rigid skinning.

Có **22 bone và 22 mesh part**, mesh có tên `<bone_id>_mesh`. Face mark là mesh riêng. Bone dùng tên dưới đây, hậu tố `_L` và `_R`:

```text
root (pelvis)
├── spine_lower
│   └── spine_upper (torso)
│       ├── neck
│       │   └── head
│       │       └── face_mark
│       ├── shoulder_L
│       │   └── upperarm_L
│       │       └── forearm_L
│       │           └── hand_L
│       └── shoulder_R
│           └── upperarm_R
│               └── forearm_R
│                   └── hand_R
├── hip_L
│   └── thigh_L
│       └── shin_L
│           └── foot_L
└── hip_R
    └── thigh_R
        └── shin_R
            └── foot_R
```

Mỗi bone có id, parent, headPosition local, length và rotation. Origin của geometry nằm tại khớp; bind matrices phải đúng để bone quay kéo theo mesh và toàn bộ chuỗi con. Không thay chiều dài/offset bone theo biến thể.

Quy ước Y-up, phía trước +Z, unit xuất file là meter. Rest height mục tiêu 2.4 unit; tổng chiều cao có thể đổi theo pose. Dịch toàn bộ rig theo Y để vertex thấp nhất chạm sàn sau khi đổi pose; lưu translation này khi export.

### Thông số rig hiện tại

`side = +1` với L và `-1` với R. Các vị trí dưới đây đều tương đối với parent, ngoại trừ root.

| Bone | Head position (x, y, z) | Length |
|---|---|---:|
| root | (0, 1.39, 0) | 0.07 |
| spine_lower | (0, 0.07, 0) | 0.14 |
| spine_upper | (0, 0.14, 0) | 0.42 |
| neck | (0, 0.42, 0) | 0.07 |
| head | (0, 0.07, 0) | 0.31 |
| face_mark | (0, 0.145, 0.163) | 0.07 |
| shoulder_L/R | (side × 0.255, 0.325, 0) | 0.055 |
| upperarm_L/R | (side × 0.035, 0, 0) | 0.30 |
| forearm_L/R | (0, −0.30, 0) | 0.28 |
| hand_L/R | (0, −0.28, 0) | 0.13 |
| hip_L/R | (side × 0.13, −0.03, 0) | 0.065 |
| thigh_L/R | (0, 0, 0) | 0.60 |
| shin_L/R | (0, −0.60, 0) | 0.60 |
| foot_L/R | (0, −0.60, 0) | 0.15 |

Length là metadata độ dài slot; hướng tail phụ thuộc loại part, không mặc định tất cả cùng hướng +Y.

## 7. Thư viện hình khối

| Nhóm part | Biến thể |
|---|---|
| Head | Sphere, Cone, Octagon, Capsule, Cube, Hemisphere |
| Torso | Cylinder, Orb, Octagon, Box, Ring, Half moon |
| Pelvis | Orb, Box, Octagon, Ring, Capsule, Half moon |
| Shoulder | Sphere duy nhất |
| Neck / Lower spine / Hip | Sphere, Octagon, Cylinder, Capsule |
| Upper arm / Forearm / Thigh / Shin | Cylinder, Cone, Capsule, Box, Chain, Octagon |
| Hand | Sphere, Cube, Ring, Cone, Octagon, Capsule |
| Foot | Wedge, Capsule, Box, Octagon, Sphere, Half moon |
| Face mark | Dot, Dash, Triangle, Twin dots, Ring, Cross |

Mỗi biến thể phải phù hợp kích thước slot. Chain là chuỗi cầu nối nhau, không thêm dây/chốt cơ khí lộ ra. Hemisphere có nắp đáy để không nhìn xuyên mặt cắt.

Cone/cylinder tròn dùng khoảng 64 radial segments và bevel hình học nhẹ, khoảng 6 bước cho phần bo. Không chỉ dùng smooth shading để giả bevel. Octagon và wedge giữ silhouette góc cạnh có chủ đích.

### Pelvis và Hip

Hip mesh nhỏ, bán kính tham chiếu 0.045; tâm nằm tại x = ±0.13, y = −0.03 tương đối pelvis. Pelvis bề rộng khoảng 0.46–0.52 tùy hình, bao toàn bộ Hip, kể cả khi nhìn bên hông hoặc từ sau. Với Ring phải kiểm tra thể tích thực, không chỉ bounding box, để Hip không lộ qua lỗ.

Thông số pelvis đang dùng:

- Orb: sphere scale (0.25, 0.15, 0.17).
- Box: (0.46, 0.26, 0.32).
- Octagon: bán kính trên/dưới 0.25/0.24, cao 0.26, scale Z = 0.8.
- Ring: torus radius 0.145, tube 0.105, scale (1, 0.85, 1.3).
- Capsule: radius 0.13, phần trụ dài 0.23, xoay ngang.
- Half moon: hemisphere radius 0.26, lật xuống, scale Z = 0.7, translate Y = 0.08.

Giữ nối trực tiếp giữa các primitive; chấp nhận phần giao nhỏ cần thiết để các khối liền nhau. Không tái tạo cơ cấu khớp cơ khí để xử lý overlap. Không tuyên bố có collision solver tổng quát cho mọi góc quay tùy ý.

## 8. Màu, pattern và seed

Chỉ dùng màu nền/material được trích xuất từ ảnh tham chiếu. Không tự đoán hex. Bản hiện tại có 18 màu, dùng quantization median-cut phân nhóm hue/saturation/value, script chạy xác định được. Các màu này được chép đầy đủ ở cuối tài liệu để app khác có thể dùng ngay.

- Hai part kề nhau trong cây bone tránh trùng màu nền khi generate/reroll.
- Accent khác màu nền của chính part đó.
- Face mark dùng màu tối để dễ đọc.
- Torso thường có pattern; các connector và hand ưu tiên solid.
- Pattern: Solid, Checker, Stripes, Gradient, Weave.
- CanvasTexture 256 × 256, color space sRGB, UV hợp lệ trên mesh.
- Màu trung gian do gradient/ánh sáng/shading là hợp lệ; yêu cầu palette áp dụng cho các màu đầu vào.

Data model tham chiếu:

```ts
type PartChoice = {
  variant: number;
  color: number;
  accent: number;
  pattern: number;
};

type CharacterSpec = {
  version: 1;
  label: string;
  parts: Record<string, PartChoice>;
  density: number;
};
```

Full seed phải chứa version, density và lựa chọn của cả 22 slot. Trong source hiện tại, seed có dạng `label~packedData`, mã hóa các chỉ số bằng base 36 theo thứ tự bone cố định. Nếu cần tương thích chính xác với seed đã có, giữ nguyên PRNG, thứ tự bone, catalog, codec và thứ tự palette trong `src/model.ts`/`src/palette.json`. Chỉ đọc mô tả rồi viết PRNG khác sẽ không tái tạo đúng seed cũ.

## 9. Scene và điều khiển

- PerspectiveCamera + OrbitControls.
- Studio lighting ba hướng: key directional có shadow, fill nhẹ, rim/back tách khối.
- Sàn nhận bóng thực để nhân vật có điểm tựa. Có thể thêm ContactShadows hoặc environment nhẹ nếu có ích.
- Nền neutral sáng từ palette, không tạo background quá nổi.
- Giới hạn góc dọc tránh lật camera qua sàn; vẫn orbit ngang 360°.
- Front / ¾ View / Side cần frame vừa toàn bộ nhân vật với chân dài mới.
- Các pose chỉnh rotation của bone, không di chuyển mesh thủ công để giả rig.
- Dispose geometry/material/texture/skeleton cũ khi tạo lại để tránh tăng bộ nhớ liên tục.

## 10. Export thực tế

### FBX — định dạng có rig

Xuất binary FBX 7.4 với một Armature, 22 bone đúng tên, 22 mesh, rigid skin clusters, UV, vật liệu và texture PNG nhúng. Giữ đơn vị meter, Y-up và transforms đúng.

Bản hiện tại có exporter riêng trong `src/fbx.ts`, phục vụ schema nhân vật này. Không giả định Three.js có sẵn FBXExporter tương đương GLTFExporter. Nếu xây lại từ đầu, cần thực hiện và kiểm chứng đường xuất FBX thực sự; không chỉ đổi đuôi GLB thành FBX.

Pose đang thấy trên màn hình trở thành bind pose của FBX. Chọn At ease trước khi export nếu muốn tư thế bắt đầu trung tính. Chưa export animation clip.

### OBJ bundle — mesh tĩnh

Xuất ZIP gồm:

```text
character.obj
character.mtl
textures/*.png
rig.json
instructions/readme
```

Bake mesh theo pose hiện tại; giữ tên part, normals, UV và vật liệu. **OBJ không chứa bone hoặc animation.** Rig JSON đi kèm phục vụ pipeline custom, không tự biến OBJ thành rigged model khi import.

### Rig JSON

Chứa seed đầy đủ, cây bone, local head/tail/length, rotations, scene translation, variant/màu/pattern của từng slot và thông tin palette. Có version để quản lý thay đổi schema.

### PNG

Chụp scene theo camera hiện tại, không kèm panel/toolbar của app.

### Phạm vi tương thích

Bản hiện tại đã kiểm chứng FBX/OBJ bằng Blender 5.1.1. Unity và After Effects chưa được kiểm chứng; AE cần workflow/plugin phù hợp. Spine là pipeline skeleton 2D, không trực tiếp đọc armature 3D này; muốn dùng cần bước chuyển đổi riêng. Không hứa import trực tiếp vào mọi phần mềm khi chưa test.

## 11. Cấu trúc source tham chiếu

```text
src/
  App.tsx          UI, seed, khóa/reroll và export actions
  styles.css       Layout và styles
  model.ts         Bone schema, catalogs, PRNG, seed codec, pose presets
  rig.ts           Geometry part, material, skinning, pose và grounding
  geometry.ts      Primitive bo cạnh
  controls.ts      Mapping nút chuột
  Scene.tsx        Scene, camera, lighting và controls
  fbx.ts           Binary FBX writer cho rig này
  exports.ts       FBX, OBJ bundle, Rig JSON, PNG
  palette.json     Palette đã trích xuất và metadata
  webmcp.ts        Tích hợp công cụ trình duyệt tùy chọn
public/
  reference.png    Ảnh tham chiếu gốc
scripts/
  extract_palette.py
  validate_blender.py
tests/
  rig.test.ts
  revision.test.ts
```

`webmcp.ts` là tích hợp tùy chọn, không phải điều kiện để app chạy. Không cần thêm login, database, thanh toán hoặc dịch vụ cloud vào phạm vi này.

## 12. Tiêu chí nghiệm thu

- App chạy thật, Generate tạo nhân vật hoàn chỉnh, không có lỗi runtime.
- Lock giữ nguyên part; reroll đơn lẻ không làm thay đổi part khác.
- Copy/apply full seed khôi phục chính xác lựa chọn sau lock/reroll.
- Shoulder luôn là Sphere, chân giữ chiều dài 0.60 + 0.60 mỗi bên.
- Hip được che bởi cả sáu kiểu Pelvis; không có chốt cơ khí lộ ra.
- Cone/cylinder tròn có silhouette mịn và bevel nhìn thấy dưới ánh sáng.
- Orbit 360°, middle-drag pan, wheel zoom, các preset camera và pose hoạt động.
- Xoay upperarm làm forearm/hand đi theo đúng pivot; skin weights đều bằng 1 cho một bone.
- Nhân vật đứng trên sàn sau đổi pose, không chìm hoặc lơ lửng.
- FBX import vào Blender có một Armature, 22 bone/mesh, texture, và animate được bằng bone.
- OBJ ZIP giải nén/import được, đúng pose, material và UV.
- PNG chứa canvas view hiện tại; Rig JSON đủ dữ liệu tái dựng.
- Production build thành công; kiểm tra giao diện desktop và mobile.

Bản hiện tại có 10 test tự động đã đạt và báo cáo import Blender trong `validation-report.json`. Khi thay đổi source, chạy lại các kiểm tra liên quan; kết quả này không thay thế kiểm thử bản triển khai mới.

## 13. Chạy project hiện có và bàn giao

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Static build nằm trong `dist/`, cần phục vụ qua HTTP. `localhost` chỉ là địa chỉ trên máy đang chạy app, không phải URL đã publish.

Khi đưa tài liệu sang công cụ khác:

- Nếu muốn tiếp tục chính xác app hiện tại: đính kèm tài liệu này và `geofolk-source.zip`.
- Nếu muốn xây lại: gửi tài liệu này cùng ảnh `public/reference.png`; palette ở dưới có thể dùng trực tiếp.
- Nếu dùng seed cũ hoặc muốn giữ export đã kiểm chứng: ưu tiên tiếp tục source thay vì viết lại codec/exporter.
- Bàn giao source, hướng dẫn chạy, production build và nêu rõ định dạng đã kiểm thử thực tế.

## 14. Palette đã trích xuất

Dữ liệu dưới đây được sao chép trực tiếp từ `src/palette.json` của app hiện tại. Giữ nguyên thứ tự `colors` để không đổi ý nghĩa chỉ số màu trong seed.

```json
{
  "source": "reference.png",
  "sha256": "4aedd339cb7a535d3d91546df4c77fdbd9a8cb5f03c6993e965003b522c852e9",
  "method": "saturation-stratified median-cut, 18 centroids stratified by hue and value",
  "colors": [
    {
      "id": "neutral_1",
      "family": "neutral",
      "hex": "#eae7e6",
      "rgb": [
        234,
        231,
        230
      ],
      "sampleCount": 157059
    },
    {
      "id": "dark_1",
      "family": "dark",
      "hex": "#27234d",
      "rgb": [
        39,
        35,
        77
      ],
      "sampleCount": 8299
    },
    {
      "id": "dark_2",
      "family": "dark",
      "hex": "#1a4e56",
      "rgb": [
        26,
        78,
        86
      ],
      "sampleCount": 5800
    },
    {
      "id": "red_1",
      "family": "red",
      "hex": "#f55d59",
      "rgb": [
        245,
        93,
        89
      ],
      "sampleCount": 9203
    },
    {
      "id": "orange_1",
      "family": "orange",
      "hex": "#f49058",
      "rgb": [
        244,
        144,
        88
      ],
      "sampleCount": 9383
    },
    {
      "id": "yellow_1",
      "family": "yellow",
      "hex": "#facc67",
      "rgb": [
        250,
        204,
        103
      ],
      "sampleCount": 4297
    },
    {
      "id": "yellow_2",
      "family": "yellow",
      "hex": "#b0a04d",
      "rgb": [
        176,
        160,
        77
      ],
      "sampleCount": 1743
    },
    {
      "id": "green_1",
      "family": "green",
      "hex": "#0c8953",
      "rgb": [
        12,
        137,
        83
      ],
      "sampleCount": 7898
    },
    {
      "id": "green_2",
      "family": "green",
      "hex": "#38ae79",
      "rgb": [
        56,
        174,
        121
      ],
      "sampleCount": 3546
    },
    {
      "id": "cyan_1",
      "family": "cyan",
      "hex": "#3ba6ac",
      "rgb": [
        59,
        166,
        172
      ],
      "sampleCount": 3990
    },
    {
      "id": "blue_1",
      "family": "blue",
      "hex": "#0c52e9",
      "rgb": [
        12,
        82,
        233
      ],
      "sampleCount": 15527
    },
    {
      "id": "blue_2",
      "family": "blue",
      "hex": "#1c6cec",
      "rgb": [
        28,
        108,
        236
      ],
      "sampleCount": 9346
    },
    {
      "id": "blue_3",
      "family": "blue",
      "hex": "#579ef0",
      "rgb": [
        87,
        158,
        240
      ],
      "sampleCount": 5950
    },
    {
      "id": "violet_1",
      "family": "violet",
      "hex": "#7c3eee",
      "rgb": [
        124,
        62,
        238
      ],
      "sampleCount": 3858
    },
    {
      "id": "violet_2",
      "family": "violet",
      "hex": "#aa77e7",
      "rgb": [
        170,
        119,
        231
      ],
      "sampleCount": 3475
    },
    {
      "id": "pink_1",
      "family": "pink",
      "hex": "#eb4db2",
      "rgb": [
        235,
        77,
        178
      ],
      "sampleCount": 11072
    },
    {
      "id": "pink_2",
      "family": "pink",
      "hex": "#fab1dd",
      "rgb": [
        250,
        177,
        221
      ],
      "sampleCount": 6997
    },
    {
      "id": "pink_3",
      "family": "pink",
      "hex": "#f594cf",
      "rgb": [
        245,
        148,
        207
      ],
      "sampleCount": 6557
    }
  ]
}
```

## 15. Cập nhật 23/09/2026 — ưu tiên hơn các mục trên nếu mâu thuẫn

- **Đối xứng trái/phải:** Hand, Foot, Shoulder, Hip luôn cùng shape và cùng màu hai bên. Thigh/Shin cùng shape hai bên (màu vẫn tự do). Lock hoặc reroll một bên áp dụng cho cả cặp. Seed cũ được chuẩn hóa khi Apply (bên R lấy theo bên L).
- **Pattern chỉ ở Torso và Pelvis.** Mọi part khác là màu solid, kể cả khi đọc seed cũ.
- **Torso (9 biến thể, lathe có fillet thật):** Bowl, Goblet, Mushroom, Hourglass, Martini, Cup, Diamond, Stack, Orb — dựa trên bảng khối tiện (bowl, dome, cone, stacked discs, bicone). Rộng nhất ở vai (bán kính 0.285), thu nhỏ về eo; scale Z 0.74.
- **Pelvis (6 biến thể, không có box):** Orb, Tire, Bowl, Dome, Puck, Diamond. Eo hẹp hơn torso, vẫn bao kín Hip (có test raycast).
- **Chân:** kind `leg` mới cho thigh/shin với các biến thể Taper, Bell, Stack, Chain, Octagon, Pill. Thigh mảnh như tay (bán kính 0.064 → 0.08), shin 0.08 → 0.118, bàn chân loe rộng dần xuống (Flare, Dome, Wedge, Puck, Bell, Octagon).
- **Rig:** shoulder x = ±0.30, hip x = ±0.105 (hai tâm Hip cách nhau 0.21). Thigh dạng chân chữ A: xoay Z ±0.085 ở At ease/Hands up. Chiều dài bone và rest height 2.4 giữ nguyên.
- **Ánh sáng/HDRI:** HDRI studio procedural (Lightformer, không tải mạng), key light có shadow PCF, fill hemisphere, rim từ phía sau, tone mapping Neutral. Panel "Lighting & material" (nút sliders trên viewport) chỉnh: key intensity/direction/height, fill, rim, HDRI intensity/rotation, exposure, tone mapping, shadow strength/softness và roughness vật liệu (mặc định 0.42 — nhựa satin). Cài đặt lưu theo trình duyệt, không nằm trong seed.
- Seed cùng label tạo nhân vật khác so với phiên bản trước (catalog và luật random đã đổi); codec seed vẫn giữ định dạng cũ.

### 15.1 Cập nhật tiếp (23/09/2026)

- **Khớp gối riêng:** thêm bone `knee_L/knee_R` (cha `thigh`, head (0, −0.60, 0), shin là con của knee với head (0,0,0)). Rig nay có **24 bone / 24 mesh**. Chiều dài chân và rest height 2.4 không đổi. Knee: Sphere hoặc Bead, bán kính 0.098, cùng shape và màu hai bên. Seed cũ 22 slot vẫn đọc được; knee được suy ra từ label.
- **Mỗi khớp chỉ một khối cầu:** vai là ball joint (r 0.09, upperarm lệch ±0.02) và upperarm không có cap. Khuỷu chỉ có một cầu nhỏ trên forearm (0.8 × bán kính tay). Chain tay/chân nằm giữa hai khớp.
- **Bevel cả mép dưới:** đã sửa lỗi fillet ở góc đầu tiên của profile lathe.
- **Orbit** xuống dưới sàn được (góc cực 0.05 → π − 0.08). Auto rotate speed 5.
- Panel Lighting & material nằm trong tab của bảng bên phải (Parts | Lighting & material).

### 15.2 Cập nhật tiếp (25/09/2026)

- **Không lặp chuỗi cầu:** mỗi tay/chân chỉ có tối đa một đoạn dạng hạt (Chain/Stack); đoạn còn lại luôn là khối liền. Seed cũ vi phạm được tự sửa khi Apply.
- **Torso to hơn** (×1.12 ngang, sâu 0.83); vai dời ra x = ±0.33. Thêm torso **Donut** (vòng xuyến dựng đứng) và **Vase** (vai tròn, eo thon cong lõm) — tổng 11 biến thể.
- **Khớp gối và khuỷu là bone riêng**, chỉ dạng Sphere, cùng màu hai bên: `knee_L/R` (r 0.105) và `elbow_L/R` (r 0.088). Rig có **26 bone / 26 mesh**. Đoạn tay/chân được cắt ngắn đúng chỗ mép tựa khít lên mặt cầu (khoảng cách √(R² − r²) từ tâm khớp), nên khớp luôn lộ rõ khi gập mà chiều dài bone và chiều cao 2.4 không đổi. Seed 22 và 24 slot vẫn đọc được.
- **Two-tone:** tay/chân dạng khối liền có ~55% khả năng chia 2 lớp màu (màu chính + accent) theo chiều dài, tỉ lệ 38/50/62%. Lưu trong seed bằng pattern index 5 và chỉ áp dụng cho tay/chân.

## 16. Hướng 2D (06/10/2026) — ưu tiên hơn các mục 3D ở trên

Bản 3D trước khi chuyển hướng được lưu nguyên ở `geofolk_3D_v1_20261006/` (chạy lại bằng `npm ci && npm run dev` trong thư mục đó).

- **Hiển thị 2D:** camera trực giao nhìn thẳng, vật liệu phẳng không ánh sáng/bóng (`MeshBasicMaterial`), các part vẽ theo thứ tự lớp cố định (`layerOf` trong `src/rig.ts`: chân → hông → thân → đầu → tay → khớp trên cùng). Shape, rig 26 bone, seed, lock/reroll và export giữ nguyên. Kéo để pan, cuộn để zoom; bỏ Front/¾/Side, auto rotate và tab Lighting.
- **Pose 2D:** mọi preset chỉ xoay quanh trục Z.
- **Pattern thân/hông:** thay bằng Basket Weave (`src/weave.ts`, port từ "Dynamic Basket Weave Generator v5", random theo seed nhân vật). UV chiếu phẳng theo mét nên pattern không méo. Slider **Pattern scale** (`density` trong seed, 2–12 → 4–24 ô ngang một tile) và chọn bảng màu HFCD / XMAS / TET (lưu theo trình duyệt).
- **Live pose (MediaPipe):** `mediapipe/server.py` copy nguyên từ `lotte-visual-haidoan-main`; chạy `npm run pose` (webcam) hoặc `npm run pose:video` (video demo) — dùng `uv` với Python 3.11 vì server cần Python ≥ 3.10. Tab **Live pose** kết nối `ws://localhost:8080`, `src/pose.ts` làm mượt và đổi 33 landmark thành góc Z cho từng bone.

## 17. Live pose tự bật server (11/10/2026)

- **Vấn đề:** bấm "Demo video" khi chưa chạy `npm run pose:video` thì không có gì xảy ra; nút chỉ gửi lệnh đổi nguồn cho một server không tồn tại.
- **Cách sửa:** `mediapipe/vite-plugin.js` thêm route `/__pose/start|stop|status` vào dev/preview server của Vite. Khi kết nối thất bại, `src/pose.ts` gọi `start` với nguồn đang chọn rồi thử nối lại mỗi 2 giây (trạng thái "Starting pose server…"). Bấm **Stop live pose** thì tắt server do app bật (server do người khác bật thì không đụng tới). Tắt `npm run dev` cũng tắt server.
- Nút **Webcam / Demo video** bấm được cả khi đang tắt: bật live pose với đúng nguồn đó. Nguồn đã chọn được gửi lại mỗi lần nối được server.
- `server.py` giữ nguyên bản chép từ `lotte-visual-haidoan`. Bản build tĩnh vẫn phải tự chạy `npm run pose` / `pose:video`.
- Phương án đã cân nhắc nhưng chưa làm: chạy MediaPipe ngay trong trình duyệt (`@mediapipe/tasks-vision`). Cách này bỏ được Python, nhưng phải tải model và WASM, và không còn dùng chung server với dự án haidoan.

## 18. Motion, thứ tự lớp và đề xuất shape 2D (11/10/2026)

- **Kiểm tra motion bằng số liệu:** chạy MediaPipe trên cả 5523 khung của video mẫu rồi đưa qua bộ giải. Phát hiện: (1) làm mượt góc cục bộ làm bắp tay bám chậm kéo lệch cẳng tay, bàn chân hơi nghiêng; (2) cẳng tay lệch lớn chỉ khi chĩa vào camera (ngắn dưới 15% thân), đây là giới hạn của hình 2D; (3) ~33% khung có bàn tay gần vai của chính nó, và thứ tự lớp cũ vẽ bàn tay dưới quả cầu vai (lỗi trong ảnh anh Nam gửi).
- **Sửa motion:** làm mượt theo hướng trên màn hình của từng bone (`smoothPose`), rồi mới đổi sang góc cục bộ (`toLocal`). Số lần giật lớn trong một khung giảm từ 706 xuống 474; bàn chân luôn nằm ngang.
- **Thứ tự lớp mới:** 7 khối kéo được (Arms, Head, Torso, Neck, Pelvis, Lower spine, Legs). Mỗi tay/chân là một khối liền với thứ tự trong cố định: bắp tay › vai › cẳng tay › khuỷu › bàn tay; đùi › ống chân › gối › bàn chân. Tay/chân gần camera hơn (z của MediaPipe) vẽ trước; tay ra sau lưng thì vẽ dưới thân; có vùng chết và giữ 5 khung để không nhấp nháy.
- **Đề xuất shape 2D:** `docs/shape-proposal-2d.html` (mở qua `npm run dev` tại `/docs/shape-proposal-2d.html`). Bộ hình phẳng kiểu giấy cắt cho đầu, thân, hông, cổ, tay, bàn tay, chân, bàn chân; bỏ hiển thị lower spine. Chưa áp dụng vào app; đang chờ anh Nam chọn shape và quyết các điểm đổi luật (sọc 3–4 màu cho tay chân, thân có mảng màu riêng, tay cong, cách đọc seed cũ).

## 19. Áp dụng shape phẳng đã chọn (11/10/2026)

Anh Nam chọn từ `docs/shape-proposal-2d.html`:

- **Đầu (6):** Circle, Triangle, Hexagon, Down triangle, Square, Dome. Bỏ Khung vuông và Viên nang.
- **Dấu mặt (6):** Dot, Dash, Triangle, Twin dots, Ring, Bar. Bar thay cho Cross (Cross không có trong bản đề xuất).
- **Thân (7):** Column, Funnel, A-line, Bowl, Fan, Orb, Donut. Thân kéo xuống tới eo nên che lower spine; Fan thu nhỏ còn 0.8 × 0.58 m để mỗi bộ phận vẫn dưới 1 m.
- **Giữ nguyên:** mọi bộ phận khác (cổ, hông, tay, bàn tay, chân, bàn chân, khớp vẫn là khối 3D) và luật pattern (thân luôn đan, hông đan ~65%, tay chân 1–2 màu). Vì vậy Fan và Donut là đan toàn bộ, không có mảng màu riêng như bản đề xuất.
- **Bo góc:** mọi góc nhọn của hình mới bo bán kính 0.022 m (dấu mặt 0.007 m); đường cong giữ nguyên.
- **Seed:** phiên bản 2. Seed phiên bản 1 vẫn mở được; thân cũ quy đổi sang thân gần nhất (`legacyTorso`), đầu và dấu mặt giữ số thứ tự.

## 20. Tỉ lệ thân và slider Proportions (11/10/2026)

- Anh Nam: thân đang to quá, các hình kiểu bát hơi to; thân Orb (rộng 0.62) là tỉ lệ đẹp. Các thân khác thu về cùng tầm cỡ: Column rộng 0.52; Funnel 0.64 → 0.22; A-line 0.40 → 0.64; Bowl rộng 0.64, cao 0.55; Fan rộng 0.66, cao 0.56. Orb và Donut giữ nguyên.
- **Vai bám mép thân:** tâm quả cầu vai cách mép thân 0.07 ở độ cao vai (`shoulderX` trong `rig.ts`), nên vị trí vai đổi theo kiểu thân (khoảng ±0.27 đến ±0.38). Chiều dài xương không đổi. Rig JSON và FBX ghi vị trí vai thật.
- **Tab Proportions:** 9 slider 50–150% (Head, Torso width, Torso height, Pelvis, Arm thickness, Leg thickness, Hands, Feet, Joints), mặc định 100%. Áp cho mọi nhân vật, lưu theo trình duyệt như bảng màu weave, chưa nằm trong seed. Thân co giãn từ cổ xuống nên đầu luôn dính cổ; đầu to/nhỏ làm đổi chiều cao tổng.

## 21. Save as default và nền đen (11/10/2026)

- **Save as default** (tab Proportions): ghi giá trị vào `src/proportions.json` qua route dev `/__defaults/proportions` (`scripts/vite-defaults.js`), nên mặc định đi theo code và áp cho mọi trình duyệt. Bản build tĩnh không ghi được file thì lưu cho riêng trình duyệt đó. Reset trả về mặc định đã lưu; có nút đưa mọi slider về 100%.
- Hai route dev (`/__pose`, `/__defaults`) chỉ nhận request có header `X-Geofolk: 1`, nên trang web khác không gọi được (không bật được camera, không ghi được file).
- **Nền đen:** khung nhân vật mặc định nền đen như video tham chiếu, chữ và nút trên khung tự đổi tông sáng. Nút mặt trời/mặt trăng ở cột nút bên phải chuyển về nền giấy. Lưu theo trình duyệt. PNG export lấy đúng nền đang chọn.

## 22. Đánh giá thiết kế (11/10/2026), chờ anh Nam chọn

`docs/design-review.html` (mở qua `npm run dev` tại `/docs/design-review.html`) đánh giá app dưới hai góc nhìn và đề xuất, chưa đổi gì trong app. Nhân vật trên trang được dựng bằng chính `src/rig.ts`, rồi áp đề xuất lên trên (`docs/design-review.js`).

- **Nhân vật:** A1 màu theo bộ (5 màu có vai trò), A2 khớp một màu và nhỏ 85%, A3 dáng chắc khỏe (tay 135%, chân 145%, bàn tay/chân 130%), A4 ô đan to (6 ô) và màu sợi theo bộ màu, A5 chất giấy, A6 thở nhẹ + tư thế Dance phát lại chuyển động đã ghi, A7 (để sau) làm phẳng tay chân.
- **Trải nghiệm:** B1 hoàn tác + dải lịch sử, B2 bấm vào bộ phận để chọn shape/màu, B3 bố cục một hàng + tên nhân vật + nút Share, B4 panel Parts/Style/Motion, B5 Generate ×6 + phím tắt, B6 link chia sẻ + PNG trong suốt + GIF/MP4, B7 cỡ chữ/tương phản + mobile.

## 23. Làm theo lựa chọn từ bản đánh giá (11/10/2026)

Anh Nam chọn A2, A4, A5, A6, A6b, B5:

- **A2 Khớp một màu:** mọi khớp chung một màu (rút trước, các bộ phận kề né màu đó), khóa/random theo nhóm (`isJoint`, `linkedIds`). Bán kính khớp còn 85%; vai đặt cách mép thân 3/4 bán kính khớp.
- **A4:** nhân vật mới có Pattern scale 6 ô (density 3).
- **A5 Chất giấy:** vân giấy (texture nhiễu + sợi) lấy theo không gian riêng của từng bộ phận, cộng đậm nhạt nhẹ từ trên xuống dưới mỗi bộ phận, chèn vào shader của `MeshBasicMaterial`. Có nút On/Off, mặc định bật. Không xuất ra FBX/OBJ.
- **A6:** ba tư thế có sẵn thở nhẹ (chu kỳ 3.6 s); tắt khi hệ điều hành bật giảm chuyển động. Export dùng tư thế sạch.
- **A6b Dance:** 184 giây nhảy từ video mẫu, nén ở 15 khung/giây (`src/dance.json`, ~114 KB), làm bằng đúng bộ giải + làm mượt + xếp lớp của Live pose. Các bước quay quá 0.9 rad/khung (MediaPipe đọc nhầm) bị chặn khi nén.
- **B5 Generate ×6:** nút ×6 cạnh Generate mở lưới 6 ứng viên trên sân khấu (giữ bộ phận đã khóa), bấm một con để chọn, Shuffle để ra 6 con khác, Esc để đóng. Ảnh dựng bằng renderer phụ (`thumbnails.ts`).
- **A1:** đang tư vấn. Anh Nam muốn mỗi nhân vật một màu riêng và đa dạng vô hạn, nên 6 bộ màu cố định không đủ. Đề xuất mới: bộ 5 màu sinh tự động theo quy tắc phối màu, có 55.536 bộ × 4 kiểu rải màu (`docs/color-proposal.html`). Chờ duyệt.

## 24. A1 bộ màu sinh tự động (11/10/2026)

Anh Nam duyệt bản `docs/color-proposal.html`.

- Mỗi nhân vật rút một bộ 5 màu theo quy tắc phối màu (`drawScheme`) và tô theo vai trò (`schemeColor`). Mọi bộ phận kề nhau luôn khác màu theo cách dựng; một nhân vật dùng tối đa 5 màu, cộng dấu mặt tối. Test: 200 nhân vật thì hơn 180 bộ màu khác nhau.
- Bộ phận khóa giữ màu. Bàn tay/bàn chân, khớp, đầu đang khóa thì ghim luôn vai trò màu đó; bộ màu được rút lại tối đa 60 lần cho khớp với các bộ phận khóa, sau đó mới sửa lẻ từng bộ phận.
- Nút random từng bộ phận giờ chỉ đổi hình (giữ màu); dòng khớp đổi màu khớp. Nút **Colors** trên thanh trên rút bộ màu mới, giữ hình và tên.
- Seed không đổi định dạng (vẫn lưu màu từng bộ phận); seed cũ mở ra đúng màu cũ.


## 25. Hạt Chain tròn đều (14/10/2026)

Anh Nam: mọi hạt trong dạng Chain phải là hình tròn đều, không bị kéo dãn hay ép dẹt.

- Trước đây mỗi đoạn Chain luôn có 4 hạt, chiều cao mỗi hạt lấy theo độ dài đoạn, nên hạt bị méo: tay thì dẹt, chân thì dài. Slider Proportions cũng chỉ kéo bề ngang.
- Giờ mỗi hạt là hình cầu thật (`beads()` trong `rig.ts`). Độ dài đoạn quyết định số hạt: các tâm cách nhau khoảng 1.35 bán kính, ít nhất 2 hạt. Slider Arms/Legs đổi cỡ hạt (và số hạt), không làm méo hạt. Hạt tay đều cỡ (bán kính bằng thân tay), hạt chân vẫn to dần xuống dưới.
- Seed không đổi.
## 26. Palette XMAS / TET đổi màu cả nhân vật (14/10/2026)

Anh Nam: ba palette phải đổi màu mọi bộ phận, không chỉ pattern đan. Ảnh tham chiếu: poster XMAS (nền xanh) và TET (nền đỏ).

- Màu lấy mẫu từ hai poster. XMAS: nền `#114DDC`; thân `#04D55D`, `#03924F`, `#FD0848`, `#FEFEFE`, `#49E8FE`, `#FDD52A`; dấu mặt `#0D1A4A`. TET: nền `#C01E2E`; thân `#FEC316`, `#EE1566`, `#FD432A`, `#FF8F2F`, `#FEF6D7`, `#21C9BA`, `#1DD478`, `#F95C7B`, `#1C8861`; dấu mặt `#261D33`.
- Đổi lúc vẽ, không đổi seed (giống pattern đan): mỗi màu nhân vật đang dùng được gán một màu riêng trong bộ, theo vai trò và quy tắc của `drawScheme`, cố định theo tên nhân vật. Bộ phận kề nhau vẫn khác màu, trừ khi nhân vật dùng nhiều màu hơn số màu của bộ (hiếm, chỉ khi khóa nhiều).
- Nền đen của sân khấu, lưới ×6 và FBX/OBJ đi theo palette. Nền giấy giữ nguyên. Nhãn trong app đổi từ "Weave palette" thành "Palette".

## 27. Undo / redo (14/10/2026)

Anh Nam yêu cầu undo/redo bằng Ctrl+Z (phần "hoàn tác" của B1; dải lịch sử chưa làm).

- Lưu ảnh chụp của nhân vật, các bộ phận khóa, thứ tự lớp, Proportions và Palette (`useHistory` trong `src/history.ts`). Mọi thay đổi đều được ghi, dù đến từ nút, ô seed hay công cụ WebMCP. Tối đa 100 bước.
- Kéo slider Proportions hoặc Pattern scale liên tục (các lần đổi cách nhau dưới 1 giây) gộp thành 1 bước.
- Không tính: nền đen/giấy, tư thế, Paper texture, khung nhìn (là cách xem, không phải chỉnh sửa).
- Phím: Ctrl/Cmd+Z hoàn tác; Ctrl/Cmd+Shift+Z hoặc Ctrl+Y làm lại. Trong ô chữ (Seed), phím giữ chức năng hoàn tác chữ. Hai nút mũi tên ở đầu thanh trên.

## 28. Thân bằng khối ghép thay cho thân + hông (14/10/2026)

Anh Nam: bỏ hông và thân cố định, dễ đoán; thay bằng 3 kiểu (ảnh poster XMAS): hai khối bằng nhau cùng hình (hai bát, hai hình tròn), một khối lớn (donut), một khối lớn trên một khối nhỏ hoặc ngược lại. Mọi khối phải dính nhau, không hở, kể cả khi xoay.

- 8 hình phẳng chung cho khối trên và khối dưới: Circle, Block, Bowl, Dome, Funnel, A-line, Donut, Diamond. 4 Build: Single (25%), Pair (30%), Big top (25%), Big bottom (20%). Pair dùng cùng hình hoặc hình lật (Funnel trên A-line = đồng hồ cát). Khối nhỏ không là Donut.
- Bộ xương giữ nguyên số bone. Bone eo (`spine_lower`) dời tới chỗ nối hai khối; cổ, vai, hông giữ độ cao nên chiều cao 2.4 không đổi. Dòng "Lower spine" trong bảng Parts thành dòng **Build**.
- Không hở: hai khối chồng nhau dọc giữa và cả hai chứa một đĩa bán kính 0.045 quanh điểm xoay eo. Thân Single không gập ở eo: góc gập chuyển cho cả thân, đùi xoay bù để chân giữ hướng.
- Khớp hông luôn nằm trọn trong khối mang nó; khối đáy hẹp tự kéo dài xuống. Mọi kiểu khớp hông vẽ thành quả cầu nhỏ (vốn bị thân che).
- Pattern: thân 1 khối đan 70% số lần; thân 2 khối luôn có ít nhất một khối đan.
- Seed phiên bản 3. Seed phiên bản 1–2 mở thành Big top với hình gần nhất.
- Làm trên nhánh `feature/body-pieces`; `main` giữ bản gốc.

## 29. Khối thân: không váy, không kéo méo, luôn có hoa văn (14/10/2026)

Anh Nam xem bản đầu (Big bottom: vòm có hoa văn trên một vòm tím, cả hai bị kéo cao):

- Khối dưới không bao giờ là Dome hay A-line (trông như váy). Pair có Dome trên thì dưới là Bowl (hình tròn chia đôi); A-line trên thì dưới là Funnel (hình thoi). Seed cũ có váy ở dưới mở ra hình lật của nó.
- Hình tròn, donut, nửa hình tròn không bao giờ bị kéo: tròn rộng bằng cao, nửa tròn rộng gấp đôi cao. Mỗi hình có chiều cao tối đa theo vai trò (khối lớn 0.8 / 0.45, khối nhỏ 0.56 / 0.3, Pair 0.8 / 0.45); khối còn lại tự dài ra để hai khối vẫn chồng nhau đúng 0.09. Thân 1 khối không là nửa tròn. Slider độ rộng chỉ áp lên khối không tròn. Đầu Dome thành nửa hình tròn thật (bán kính 0.3).
- Luôn có hoa văn: thân 1 khối luôn đan; thân 2 khối có ít nhất một khối đan (áp cả cho seed cũ).

## 30. Khớp nhiều hình (14/10/2026)

Anh Nam: khớp lúc nào cũng tròn; muốn đa dạng hình, nhưng luôn đối xứng về hình và màu.

- Vai, khuỷu, gối mỗi loại chọn một trong 5 hình: Sphere (40%), Square, Diamond, Hexagon, Triangle. Trái/phải luôn cùng hình; mọi khớp vẫn chung một màu.
- Hình phẳng có bán kính trong bằng bán kính quả cầu cũ, nên đầu các đoạn tay chân (tựa trên quả cầu) luôn nằm trong hình ở mọi góc gập. Tam giác vì vậy to gấp đôi quả cầu.
- Random dòng vai/khuỷu/gối: đổi hình của cặp đó, giữ màu. Random dòng Hip joints (bị thân che): đổi màu mọi khớp. Khóa một dòng khớp vẫn khóa tất cả khớp.
- Seed phiên bản 4; seed phiên bản 1–3 mở ra khớp tròn như lúc được tạo.

## 31. Vân giấy nét hơn (14/10/2026)

Anh Nam: vân giấy trông độ phân giải thấp.

- Trước: tấm vân 256 px cho mỗi 0,6 m, mảng loang phóng to từ ảnh 16 px, mép không liền. Phóng to là nhòe và vỡ khối.
- Giờ: tấm vân 1024 px cho mỗi mét, liền mép (lặp không thấy đường nối), 4 tầng nhiễu mịn (mảng loang, đốm, gân, gân mịn), hạt từng điểm ảnh, 1000 sợi giấy mảnh sáng/tối; có mipmap và lọc anisotropy 8. Độ đậm nhạt tổng thể giữ gần như cũ.
- Hoa văn đan vẽ ở 2048 px thay vì 1024 (vẽ vẫn khoảng 6 ms); bộ nhớ đệm giữ 12 tấm thay vì 24 để không tốn RAM.

## 32. Mỗi loại khớp một màu, khớp Ring, không Funnel ở dưới (14/10/2026)

- Anh Nam: các khớp khác nhau có màu khác nhau nhưng vẫn đối xứng (hai vai cùng hình và màu, hai khuỷu cùng hình và màu, vai và khuỷu có thể khác màu). Bộ màu của nhân vật giờ có một màu cho mỗi loại khớp (vai, khuỷu, gối; ba màu khác nhau, mỗi màu sáng hoặc tối hẳn hơn màu thân), nên một nhân vật dùng tối đa 7 màu. Khóa/random theo từng cặp khớp. Thay cho luật "mọi khớp một màu" ở mục 23.
- Không dùng tam giác cho khớp (với bán kính trong bằng quả cầu nó to gấp đôi). Thay bằng Ring: vòng tròn có lỗ 0,38 r, nhỏ hơn khe giữa hai đầu đoạn tay chân.
- XMAS chỉ có 6 màu thân: khi hết màu, chọn lại một màu mà không bộ phận kề nào đang có, nên bộ phận kề nhau vẫn luôn khác màu.
- Anh Nam: Funnel (chữ V) không được làm khối dưới. Khối dưới giờ chỉ là Circle, Block, Bowl, Donut, Diamond. Funnel và A-line không dùng cho Pair. Seed cũ: Dome dưới → Bowl, A-line/Funnel dưới → Block.

## 33. Khớp xoay theo góc trung bình (14/10/2026)

Anh Nam: khớp luôn lấy góc trung bình của đoạn trước và đoạn sau; trước đây gối xoay y như đùi.

- Mỗi khớp (vai, khuỷu, hông, gối) nhận nửa góc gập, đoạn sau nhận nửa còn lại, nên hướng tay chân không đổi (có test).
- Bắp tay gắn lệch tâm vai 2 cm; vị trí đó được xoay ngược lại theo góc của vai, nên điểm xoay của tay vẫn đứng yên.

## 34. Bàn chân hút sàn; thân 1 khối không A-line/Funnel (14/10/2026)

- Anh Nam lúc đầu muốn bàn chân luôn phẳng trên sàn, rồi đổi: chỉ khi gần sàn mới hút phẳng, có một khoảng chuyển để khi người nhảy thì nhân vật nhảy tự do. Làm: sàn là đế của bàn chân thấp hơn; bàn chân cách sàn dưới 5 cm nằm phẳng, trên 20 cm xoay theo ống chân, ở giữa chuyển mượt (smoothstep). Bộ giải Live pose vẫn đưa bàn chân ngang; rig quyết định.
- Thân 1 khối không còn A-line hay Funnel: nửa dưới của chúng chính là cái váy / chữ V không được ở dưới. Thân 1 khối giờ là Circle, Block, Donut hoặc Diamond.

## 35. Hoa văn patchwork (14/10/2026)

Anh Nam gửi ảnh tham chiếu (lưới ô cờ nhiều màu: khối bàn cờ và khối sọc xen nhau, nhiều ô hồng nhạt/trắng): thêm một hoa văn như vậy, theo palette, luôn trên 2 bộ phận cách bộ phận mang hoa văn đan đúng một bộ phận.

- Hoa văn: tấm 24 × 24 ô (ô 3,5 cm, tấm 0,84 m, lặp liền mép), chia hàng và cột thành khối 2 hoặc 3 ô; mỗi khối là bàn cờ hai màu (45%), sọc ngang (27%), sọc dọc (25%) hoặc một màu. Màu lấy từ bảng màu đan của palette đang chọn (HFCD/XMAS/TET); màu nhạt là các màu sáng của bảng cộng vài màu đậm pha trắng. Trải phẳng theo mét như hoa văn đan; hai bên trái/phải dùng chung một tấm.
- Vị trí: đúng một cặp. Khối trên đan → hai bắp tay (cách một khớp vai); khối dưới đan → hai đùi (cách một khớp hông); thân 1 khối mang cả vai lẫn hông nên chọn một trong hai. Cặp đang có giữ nguyên qua random/khóa; seed cũ được thêm cặp này khi mở.
- Seed: pattern 6 = Patchwork.

## 36. Patchwork ở hai chỗ ngẫu nhiên; mặt luôn là hình đặc (14/10/2026)

- Anh Nam: hai chỗ patchwork phải khác nhau, ở chỗ ngẫu nhiên, không phải hai bên đối xứng. Giờ: một bên bắp tay và một bên đùi (đều cách thân một bộ phận), bên chọn ngẫu nhiên, mỗi chỗ một tấm riêng. Seed cũ có cặp đối xứng giữ bắp tay trái và đùi phải.
- Dấu mặt luôn là hình đặc, không có dạng viền: Ring đổi thành Diamond.
- Anh Nam lưu tỉ lệ mặc định mới trong tab Proportions (đầu 55%, thân rộng 65%, chân 130%…), đã commit riêng.

## 37. Hai khối thân xếp chồng, không đè (14/10/2026)

Anh Nam: hai khối (ví dụ hai Bowl, hay hai khối vuông) phải xếp chồng lên nhau, không đè lên nhau, cho gọn.

- Trước: hai khối chồng nhau 9 cm dọc giữa (cả hai chứa một đĩa 4,5 cm quanh điểm xoay). Giờ chỉ chồng 1,4 cm; khối trên ngồi lên khối dưới.
- Điểm xoay eo đặt ở chỗ chạm. Trong Dance, eo gập trung vị 0,06 rad, 90% dưới 0,19 rad, lớn nhất 0,57 rad; khi gập, khe giữa hai khối lộ ra phía ngoài, nên có thêm quả cầu eo (màu cổ, bán kính 0,055) nằm sau cả hai khối để lấp khe như một khớp bản lề. Lúc đứng yên nó gần như khuất (giữa hai hình tròn thì lộ thành một hạt nhỏ).

## 38. Hai bộ phận chạm nhau không cùng có hoa văn (14/10/2026)

Anh Nam: không có hai bộ phận chạm nhau nào cùng có hoa văn; giữa chúng ít nhất phải có một khớp (như vai). Đùi chạm thân (khớp hông bị che), nên patchwork ở chân chuyển xuống ống chân.

- Patchwork: một bên bắp tay (qua khớp vai) và một bên ống chân (qua khớp gối). Seed cũ có patchwork ở đùi chuyển xuống ống chân cùng bên.
- Hai khối thân xếp chồng chạm nhau, nên thân 2 khối có đúng một khối đan (khối trên 55%). Seed cũ có cả hai khối đan giữ khối trên.
- Two-tone trên tay chân là chia màu, không tính là hoa văn.

## 39. Khớp nhiều cỡ, tay chân thon theo khớp (14/10/2026)

Anh Nam: các khớp cỡ khác nhau; cỡ khớp tạo độ thon cho tay chân (đoạn chữ nhật thành hình thon, chuỗi hạt to dần nhỏ dần). Muốn thêm nhiều tỉ lệ hơn.

- Ba cỡ S/M/L = ×0,72 / ×1 / ×1,35 bán kính khớp cũ; vai, khuỷu, gối chọn riêng, không bao giờ cả ba cùng cỡ. Variant khớp = hình + 5 × cỡ (15 kiểu). Seed phiên bản 5; seed cũ mở ra cỡ M.
- Đầu đoạn = 0,91 × khớp ở đầu đó: bắp tay từ vai tới khuỷu, cẳng tay từ khuỷu tới cổ tay (0,058), đùi từ hông (0,064) tới gối, ống chân từ gối loe ra bàn chân (0,118–0,13). Box giờ là lăng trụ vuông thon thay vì hộp bo góc.
- Bước tiếp theo cho "nhiều tỉ lệ hơn": hệ núm tỉ lệ trong docs/proportion-plan.html, chờ anh trả lời câu hỏi.

## 40. Patchwork: thêm cẳng tay, đùi khi hông trơn (14/10/2026)

Anh Nam: đùi cũng được có hoa văn nhưng chỉ khi hông (khối dưới) không có; cẳng tay cũng được.

- Hai chỗ patchwork chọn ngẫu nhiên trong bắp tay, cẳng tay, ống chân, và đùi (chỉ khi thân 2 khối và khối dưới trơn), không bao giờ là cặp đối xứng. Bắp tay và cẳng tay cùng một tay được, vì có khớp khuỷu ở giữa.
- Seed: đoạn đang có patchwork giữ nguyên nếu còn hợp lệ; đùi không còn hợp lệ chuyển xuống ống chân cùng bên; thiếu thì lấp theo thứ tự cố định.

## 41. Ngón tay ragdoll (14/10/2026)

Anh Nam: 5 ngón tay "ragdoll" mỗi bàn tay, làm bằng spline.

- 5 ngón xòe từ tâm bàn tay (ngón cái ở phía trong, ngắn và dày hơn), dài 7,5–12 cm, dày 2,8–3,6 cm ở gốc, thon về 2,2 cm với đầu tròn; dải spline Catmull-Rom (centripetal), hình đặc, cùng màu bàn tay, vẽ ngay dưới bàn tay.
- Vật lý: mỗi ngón 5 điểm verlet, bước cố định 1/60 s, trọng lực 9,8, giữ 90% vận tốc mỗi bước, độ dài đoạn giữ cố định, lực giữ dáng 0,05 (yếu dần về đầu ngón). Đo: buông tay thì đầu ngón ở dưới gốc khoảng 12 cm; giơ tay thì ngón rủ khoảng một nửa so với ngón cứng. Mô phỏng trong không gian của nhân vật nên việc đặt nhân vật xuống sàn không làm ngón rung.
- Chưa xuất vào FBX/OBJ (chỉ có trong app và ảnh).

## 42. Ngón tay cứng hơn, ngón chân, slider mới (14/10/2026)

- Anh Nam: ngón tay cứng hơn nhiều. Lực giữ dáng 0,05 → 0,3: ngón giữ dáng, chỉ lắc nhẹ theo quán tính; giơ tay thì ngón chỉ lên theo tay. Thêm slider Finger stiffness: lực = 0,3 × độ cứng^2,6 (50% ≈ 0,05 mềm như bản đầu, 150% ≈ 0,86 gần như cứng).
- Ngón chân (theo ảnh anh gửi): 5 hình tròn dọc theo đế mỗi bàn chân, vẽ đè lên bàn chân, màu = màu phụ của bàn chân. Nhân vật đứng trên ngón chân.
- Tab Proportions thêm Fingers, Finger stiffness, Toes. Slider Hair sẽ thêm cùng tóc.

## 43. Gradient Flow chuyển động (14/10/2026)

Anh Nam: vài bộ phận ngẫu nhiên có gradient tuyến tính (không dạng tròn), lệch pha chuyển động liên tục, 2–3 màu của palette mỗi lần, chu kỳ dài. Lúc đầu 2 bộ phận, sau đó đổi thành 4.

- Pattern 7 = Flow. 4 bộ phận trong đầu, bàn tay, bàn chân, bắp tay, cẳng tay, đùi, ống chân; không bao giờ là cặp đối xứng, không chạm bộ phận có hoa văn (đan, patchwork, Flow khác). Đùi chạm khối thân mang hông.
- Màu: 2 hoặc 3 màu đậm trong bảng màu đan của palette đang chọn, xếp thành vòng (màu cuối quay về màu đầu) nên trôi không có đường nối. Hướng dải màu riêng theo từng bộ phận. Một vòng màu mỗi 0,6 m; trôi một vòng mỗi 14 giây, mỗi bộ phận lệch pha riêng.
- Bộ phận đối xứng (bàn tay, bàn chân, khớp) vẫn chung hình và màu; hoa văn thì nằm riêng một bên.

## 44. Ngón tay/chân là hình tròn chạm nhau; gradient dọc theo bộ phận (14/10/2026)

- Ngón chân luôn là các hình tròn chạm nhau, không chồng, kể cả khi tăng cỡ: tâm cách nhau đúng một đường kính, cả hàng xếp giữa bàn chân.
- Ngón tay đổi từ dải spline sang chuỗi hình tròn chạm nhau, vẫn ragdoll: tâm hình tròn là điểm verlet, cách nhau một đường kính. Ngón cái tròn to hơn (bán kính 1,8 cm), các ngón khác 1,4–1,6 cm, số hình tròn theo độ dài ngón.
- Gradient Flow chạy dọc trục của bộ phận (dọc chân, dọc tay) và xoay theo bộ phận, không chéo ngẫu nhiên.

## 45. Ngón tay là 5 quả bóng bám theo tay (14/10/2026)

Anh Nam: luôn chỉ 5 hình tròn cho 5 ngón; coi như các quả bóng lơ lửng luôn bám theo bàn tay và va chạm với bàn tay: luôn về đúng chỗ nhưng bị tay đẩy, có lực hút kéo về chỗ. Ngón có màu riêng, khác màu bàn tay.

- Mỗi bóng: chỗ nghỉ ở ngay ngoài đĩa bàn tay (bán kính 8,5 cm quanh tâm bàn tay), xòe từ -1,2 đến 1,08 rad quanh trục tay (ngón cái phía trong, to nhất 3 cm, ngón út 2,4 cm). Lò xo hút 0,12 mỗi bước ở 100% (giảm dần theo slider), giữ 86% vận tốc.
- Va chạm: bóng lọt vào đĩa bàn tay thì bị đẩy ra mép và mất vận tốc hướng vào; các bóng đẩy nhau ra khi chạm; 8 vòng mỗi bước, vòng cuối luôn là bàn tay nên không bóng nào nằm trong tay.
- Màu: màu phụ của bàn tay (lưu trong seed), khác màu bàn tay.

## 46. Quay lại ngón ragdoll, không chồng lên bàn tay (14/10/2026)

Anh Nam thích ngón ragdoll (chuỗi hình tròn) hơn bản 5 quả bóng, nhưng các hình tròn không được chồng lên bàn tay.

- Ngón tay lại là chuỗi hình tròn chạm nhau (mục 44), màu riêng (màu phụ của bàn tay).
- Bàn tay coi như đĩa cứng bán kính 8,5 cm quanh tâm bàn tay: hình tròn đầu tiên của mỗi ngón nằm chạm mép ngoài; hình nào lọt vào thì bị đẩy ra mép (có test khi vung tay nhanh).
- Bản 5 quả bóng vẫn còn trong lịch sử git (commit "Fingers are five floating balls that follow the hand").

## 47. Slider Checker scale và Flow speed (14/10/2026)

Anh Nam: slider cỡ cho hoa văn ô cờ đặt cạnh Pattern scale; slider cho tốc độ trôi màu của gradient.

- Checker scale 40–250% nhân cỡ ô patchwork (mặc định 3,5 cm). Flow speed 0–300% nhân tốc độ trôi (mặc định một vòng mỗi 14 s; 0 = đứng yên).
- Lưu cùng các tỉ lệ (theo trình duyệt, có trong undo) nhưng hiện dưới Pattern scale ở bảng Parts, không ở tab Proportions.

## 48. Mỗi ngón một hình tròn (14/10/2026)

Anh Nam: 5 hình tròn cho 5 ngón, không hơn. Mỗi ngón giờ là một hình tròn buộc vào mép bàn tay bằng sợi dây ngắn (2,2 bán kính): nếu buộc cứng đúng một bán kính và không cho lọt vào tay thì hình tròn chỉ còn một vị trí, không đung đưa được. Với sợi dây, nó lăn và lắc men theo mép tay, có lực kéo về chỗ nghỉ, không lọt vào tay, không chồng nhau.

## 49. Lưu mọi cài đặt làm mặc định (14/10/2026)

Anh Nam: thêm lưu mặc định cho mọi cài đặt.

- Nút "Save all as default" (tab Proportions) lưu các tỉ lệ cùng Checker scale, Flow speed vào src/proportions.json, và palette, thứ tự lớp, Paper texture, nền đen/giấy vào src/settings.json. Server dev ghi hai file và kiểm tra từng giá trị theo khoảng của nó (trước đây chỉ nhận các khoá đã có trong file, nên Fingers, Toes, Checker scale, Flow speed không lưu được). Bản build tĩnh lưu cho trình duyệt đó.
- Trình duyệt chưa có giá trị riêng thì bắt đầu từ các mặc định này; Reset đưa mọi cài đặt về mặc định đã lưu.

## 50. Ngón tay và ngón chân cùng cỡ, cùng màu; ngón tay chạm nhau (14/10/2026)

- Một bán kính chung 2,8 cm × slider "Fingers & toes" (gộp slider Fingers và Toes) cho mọi hình tròn ngón tay, ngón chân; một màu chung (màu phụ của bàn tay).
- 5 ngón tay xếp vòng cung ôm mép ngoài bàn tay, mỗi ngón chạm ngón cạnh (tâm cách nhau một đường kính, góc 2·asin(r/(R+r))). Vật lý giữ: ngón cạnh nhau luôn chạm, không ngón nào trong tay, không chồng nhau (12 vòng giải mỗi bước).
- Flow speed được âm (-300% đến 300%): màu trôi ngược chiều.

## 51. Tóc (14/10/2026)

Anh Nam duyệt bảng 32 kiểu đầu tiên rồi góp ý: tóc không phân biệt giới tính, ưu tiên hình lớn như vương miện gai trong ảnh, bỏ hình quá nhỏ, giữ đa dạng. Sau đó hỏi tóc đâu (muốn có trong app).

- 22 kiểu + None trong `src/hair.ts`, thiết kế trong khung 200 px (đầu tròn tâm (100,112), bán kính 38); `docs/hair-proposal.html` vẽ trực tiếp từ file này (lưới trên đầu tròn và bảng mọi kiểu × 6 hình đầu). Bỏ: tóc buộc hai bên, tóc dài, đuôi ngựa, búi xiên, bím hạt, ăng-ten, chỏm tóc, mái răng cưa, vòng hạt, mũ len, pixie, mullet.
- Đặt lên đầu: khung thiết kế quy ra mét theo cỡ hình đầu (trung bình rộng và cao so với 76 px), tâm là tâm hình đầu. Mũ/mái trước = đường viền hình đầu cắt phía trên một đường (có thể nghiêng, kiểu Sweep), nở ra vài px; đường cắt không bao giờ thấp hơn đỉnh dấu mặt + 8 mm.
- Bộ phận mới `hair` (bone con của đầu, cuối danh sách nên seed cũ vẫn đọc được, tóc lấy theo tên nhân vật). Seed phiên bản 6. Màu tóc là vai trò mới R trong bộ màu (khác màu đầu, cách ≥ 60° trên vòng màu khi được); kiểu hai màu dùng màu phụ. Slider Hair (50–150%).
