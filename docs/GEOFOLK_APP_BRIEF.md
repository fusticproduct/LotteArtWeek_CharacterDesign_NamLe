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

## 52. Không có bóng đổ; ngón tay nằm trên bàn tay (14/10/2026)

Anh Nam yêu cầu bóng đổ giữa các lớp (thử kiểu lệch xuống phải, rồi kiểu nở đều như Expand path trong Illustrator), sau đó bỏ hẳn: app không có bóng đổ. Bản thử được cất ở nhánh `archive/shadows-dropped`, không nằm trong app. Giữ lại một ý trong lượt đó: 5 ngón tay vẽ đè lên bàn tay (như ngón chân đè lên bàn chân); bàn chân vốn đã nằm trên ống chân.

## 53. Ngón tay cách bàn tay; mặc định mới (14/10/2026)

- Ngón tay cách mép bàn tay một khoảng bằng bán kính ngón (lúc nghỉ và cả khi đung đưa), dây buộc 3,2 bán kính để có chỗ đung đưa.
- Mặc định theo ý anh Nam: Pattern scale 20 ô, Checker scale 125%, Flow speed −300%, palette HFCD, Paper texture bật. Pattern scale giờ nằm trong các cài đặt "Save all as default" (`patternScale` trong `src/settings.json`): nhân vật đầu tiên mở với số ô này, Reset trả về nó; seed chỉ có tên dùng số ô đang chọn.

## 54. Tóc vòng 2: đối xứng, mũ, robot, lủng lẳng (14/10/2026)

Góp ý của anh Nam sau vòng 1: kiểu Ears giống chuột Mickey; gai Sunburst quá mảnh trên đầu lục giác; hình trên đầu phải là khối đặc, không cắt theo hình đầu (Cloud trên đầu tam giác); không thích hình bán nguyệt; mọi kiểu phải đối xứng; cần tóc phổ thông, tóc robot, mũ bảo hiểm (trọng tâm), không afro, không kiểu riêng của một nền văn hóa, bỏ quạt (trông nữ tính) nhưng giữ kiểu múi xen màu của nó; vài kiểu có ragdoll. Sau đó anh chọn 11 kiểu vòng 1 muốn giữ: Crown, Gem, Fin, Flame, Ball top, Halo, Bowl, Flat top, Sunburst, Helmet, Leaves.

- Giữ 11 kiểu đó; Flame và Leaves vẽ lại đối xứng (Leaves vẫn hai màu); Sunburst 7 gai to và ngắn hơn.
- Bỏ: Spikes nghiêng, Afro, Cloud, Fan, Waves, Horns, Sweep, Ears, Ridge, Swoosh. Số thứ tự của chúng chuyển cho kiểu mới (seed không đổi phiên bản; tóc mới có từ hôm nay và chưa đưa lên GitHub).
- Mới: mũ Moto, Hard hat, Segments, Beanie, Plume, Bucket, Cap, Racer; robot Antenna, Twin antennas, Knight, Gear, Siren; Blocks đối xứng xen màu.
- Mũ là phần trước (front) bằng khối đặc riêng: đặt mép dưới ngay trên dấu mặt nếu thiết kế thấp hơn, rồi phóng to quanh giữa mép dưới tới khi phần đầu phía trên (cộng 12 mm) nằm trọn trong mũ. Có test cho mọi kiểu × 6 hình đầu × cỡ 50/100/150%.
- Ragdoll (`src/hairPhysics.ts`): chuỗi hình tròn, hình đầu cách điểm buộc một đoạn dây, các hình sau chạm nhau; verlet với trọng lực, giảm chấn .92, kéo về dáng nghỉ 4%/lượt × 8 lượt (mềm hơn ngón tay), giữ đúng khoảng cách sau mỗi lượt. Ball top, Beanie, Plume, Antenna, Twin antennas.
- Trong lượt này cũng có: ngón tay vẽ trên bàn tay (mục 52) và cách bàn tay một bán kính (mục 53).

## 55. Lỗ donut mang màu nền (14/10/2026)

Anh Nam: lỗ trong hình donut không được nhìn xuyên; tô bằng màu nền để trông như trong suốt; riêng bàn tay donut thì được nhìn xuyên.

- Khối thân Donut và khớp Ring có thêm một miếng lấp (`<bone>_plug`) hình lỗ, nở thêm 1,5 mm, màu nền sân khấu, vẽ ngay dưới bộ phận (thứ tự −0,05) để mép bộ phận che đường nối. `rig.setStage(màu)` đổi màu khi đổi palette hoặc nền; ảnh ×6 dùng màu nền của chúng.
- Bàn tay Ring là vòng 3D, giữ nguyên lỗ thật.

## 56. Riso (14/10/2026)

Anh Nam muốn thêm một texture dưới Paper texture để mọi màu trông như in risograph, chấm rất nhỏ.

- Nút **Riso** On/Off dưới Paper texture. Trong shader giấy (`addPaper`, rig.ts): lưới chấm 3 px (theo pixel màn hình) nghiêng 45°, cố định theo màn hình như tờ in; độ phủ mực 74–98% (màu đậm phủ dày hơn), lệch nhẹ theo vân giấy; giữa các chấm lộ màu giấy. Áp cho mọi bộ phận, cả ngón tay, ngón chân và tóc lủng lẳng (giờ cũng có vân giấy). Miếng lấp lỗ donut không có Riso để vẫn trùng màu nền.
- Mặc định tắt; lưu theo trình duyệt và trong Save all as default (`riso` trong `src/settings.json`).

## 57. Tóc vòng 3: theo ảnh tham chiếu (14/10/2026)

Góp ý trên vòng 2: Moto giống beanie (bỏ); Hard hat giống công nhân xây dựng (làm tương lai hơn); bỏ Segments; Beanie bỏ quả bông; Gear trông như vi khuẩn (bớt rối); bỏ một kiểu ở ảnh 7 (ảnh không gửi tới được, chưa biết kiểu nào). Rồi anh gửi 5 ảnh tham chiếu và yêu cầu phân tích kỹ để làm bộ mới theo phong cách tối giản của nhân vật.

Phân tích tham chiếu:
- Totem hình học: chỉ hình cơ bản (thanh chữ nhật, tròn, nửa tròn úp/ngửa, tam giác, thoi, dấu sao 8 cánh), các khối xếp chồng **chạm nhau, không đè**, tách hai màu theo đường chéo.
- Đầu punk: tóc là một mảng phẳng; mohawk khối răng cưa; vương miện gai với băng đô; ngôi sao trên que ăng-ten; kính râm gác trên đầu; đầu đinh.
- Người tối giản (2 ảnh): tóc là cái mũ một màu bo theo đỉnh đầu, búi tròn trên đỉnh, mũ lưỡi trai; rất ít chi tiết.
- Mũ mùa đông: silhouette to bản hơn đầu; nón chóp có sọc, mũ chóp cao, mũ nấm chấm bi, mũ xô, mũ trùm.

Làm:
- Nhóm Totem mới (`sits`): cả kiểu dời lên/xuống tới khi điểm thấp nhất phía trên đầu vừa chạm đỉnh đầu (đo theo đường viền thật của từng hình đầu). Slab, Quad, Bowtie, Saucer; Top hat và Cone cũng đặt kiểu này.
- Băng đô (`band`): phần đầu giữa hai đường ngang, rộng hơn đầu một chút, màu phụ, không thấp hơn dấu mặt (Punk).
- Phụ kiện (`cover: false`): phần trước không cần che kín đầu (Shades).
- Đầu chuỗi lủng lẳng có thể là hình (ngôi sao 5 cánh, dấu sao 8 cánh), xoay theo hướng chuỗi (Star, Asterisk).
- Mũ tương lai Visor (vỏ cao + khe kính) và Jet (vòm + hai cánh xếch) lấy số thứ tự của Moto và Hard hat; Saucer, Top hat, Cone lấy số của Segments, Cap, Racer; các kiểu mới khác thêm vào cuối.
- Sau đó anh Nam chỉ giữ hai kiểu robot: 30 Star và 22 Antenna. Blocks, Knight, Twin antennas, Gear, Siren, Asterisk thành kiểu "nghỉ" (`retired`): giữ số thứ tự để seed cũ vẫn mở được (thành Slab, Visor, Antenna, Crown, Antenna, Star), Generate không bao giờ chọn chúng.

## 58. Riso có thuộc tính, chấm dính theo hình (14/10/2026)

Anh Nam: Riso cần bảng thuộc tính; không phải một lớp texture cố định phía sau mà phải dính theo hình; có chế độ hòa trộn, bảng chọn màu và mọi thuộc tính để chỉnh.

- `src/riso.ts`: cài đặt Riso (on, color, blend, opacity, size, coverage, angle, grain, invert), giới hạn và chuẩn hóa (đọc được cả giá trị bật/tắt cũ).
- Shader (`addPaper`): lưới chấm tính theo tọa độ của bộ phận (`vPaper`, mét), xoay theo Screen angle, nên chấm đi và xoay cùng bộ phận. Màu riso hòa lên màu bộ phận bằng chế độ đã chọn, ở khe giữa các chấm (Gaps) hoặc trong chấm (Dots), mạnh theo Opacity. Màu đậm vẫn phủ mực dày hơn một chút; Grain làm chấm lệch theo vân giấy.
- Bảng điều khiển hiện dưới nút Riso khi bật; lưu theo trình duyệt (`geofolk.riso`, JSON) và trong Save all as default (`riso` trong `src/settings.json`, máy chủ dev kiểm tra từng giá trị).

## 59. Checker có 4 kiểu (14/10/2026)

Anh Nam gửi ảnh poster sọc/caro và yêu cầu: mẫu checker luân phiên giữa mẫu đang có, sọc ngang, sọc dọc, bàn cờ hai màu, đều trong màu của nhân vật; hai chỗ checker có thể khác kiểu.

- `checkerStyleOf(spec, bộ phận)` (rig.ts): mỗi chỗ chọn ngẫu nhiên theo tên nhân vật và bộ phận một trong Patchwork, Stripes across, Stripes down, Checkerboard (không nằm trong seed; cùng seed luôn ra cùng kiểu).
- Sọc/bàn cờ: hai màu lấy từ các màu nhân vật đang dùng (`checkerColours`): màu đầu ngẫu nhiên, màu thứ hai là màu khác độ sáng nhất trong vài màu còn lại. Sọc 3 cm, ô cờ 5 cm ở Checker scale 100%, trải phẳng theo mét như patchwork.

## 60. Một bộ phận pixel hóa (14/10/2026)

Anh Nam: luôn có 1 bộ phận không có hoa văn (màu trơn), không phải khớp, bị pixel hóa như hình lượng tử hóa (ảnh tham chiếu: hình người bậc thang).

- `pixelPartOf(spec)` (rig.ts): chọn theo tên nhân vật một đoạn tay/chân màu trơn; dự phòng: bàn tay/bàn chân trơn, rồi đoạn two-tone (vẽ màu chính).
- `src/pixelate.ts`: mỗi khi tư thế đổi, lấy các tam giác của bộ phận đã tạo dáng (skin cứng một xương), đưa về không gian của nhân vật, tô ô 3,5 cm có tâm nằm trong bộ phận, gộp ô liền nhau theo hàng thành dải. Lưới theo trục màn hình nên phần chéo thành bậc thang. Mesh gốc bị ẩn nhưng vẫn dùng cho xuất file và đặt chân xuống sàn.

## 61. Điều khiển pixel, lưu mặc định ở tab Parts, mặc định mới (14/10/2026)

- Anh Nam muốn điều khiển phần pixel hóa và có lượng tử hóa FPS: **Pixel part** On/Off, **Pixel size** 1,5–8 cm, **FPS** Smooth/24/12/8/4 (ô pixel chỉ vẽ lại từng ấy lần mỗi giây; các bộ phận khác vẫn mượt). Lưu theo trình duyệt (`geofolk.pixel`) và trong Save all as default (`pixel` trong `src/settings.json`).
- Nút **Save all as default** thêm ở cuối tab Parts, làm đúng như nút ở tab Proportions (lưu tất cả).
- Mặc định mới theo ảnh anh gửi: Pattern scale 20 ô, Checker scale 80%, Flow speed −300%, HFCD, Paper bật, Riso bật (Opacity 75%, chấm 7,5 mm, Ink coverage 30%, Screen angle 90°, Grain 100%, màu #ffffff, Overlay, màu trong chấm). Các tỉ lệ khác, thứ tự lớp và nền giữ như cũ (trình duyệt của anh đang có Fingers 150% và Finger stiffness 50% chưa lưu; bấm Save all as default nếu muốn lưu cả hai).

## 62. Spray blur (14/10/2026)

Anh Nam gửi ảnh tranh phun sơn và muốn một hàm làm mờ có nhiễu cho 2 bộ phận ngẫu nhiên, có nút bật và slider độ mờ.

- `sprayPartsOf(spec)` (rig.ts): hai bộ phận khác nhau theo tên nhân vật, trong đầu, khối thân (trừ khối dưới của Single), đoạn tay/chân, bàn tay, bàn chân; không phải khớp, không phải bộ phận pixel.
- `src/spray.ts`: 20 bản mờ (16% mỗi bản, ở giữa cộng lại ~97%) và 6 hạt bắn (5%, xa hơn), mỗi bản lệch cố định theo hướng ngẫu nhiên nhân với Blur amount (đẩy trong shader sau khi skin). Độ trong suốt dùng alpha hash (bỏ điểm ảnh theo nhiễu gắn với bộ phận), nên vẫn là vật thể đục: đúng thứ tự lớp, hạt dính theo bộ phận. Mesh gốc ẩn khi bật (vẫn dùng cho xuất file); miếng lấp lỗ donut cũng ẩn theo.
- Mặc định tắt (`spray` trong `src/settings.json`).

## 63. Khớp hông nhìn thấy được (14/10/2026)

Anh Nam: khối thân dưới không bao giờ che khớp của đùi.

- Thứ tự vẽ: mỗi khớp hông nằm trên cả khối thân mang nó (khối dưới, hoặc khối trên của Single) và đùi, với mọi thứ tự lớp (`restack`, rig.ts).
- Hình: khớp hông lấy hình khớp vai (Sphere, Square, Diamond, Hexagon, Ring; Ring có lỗ lấp màu nền) ở cỡ khớp gối; màu vẫn là màu khớp loại 0 (như vai). Vị trí giữ nguyên trong khối thân (test `holdsDisc` vẫn đúng). Luật hoa văn của đùi giữ như cũ.

## 64. Khớp hông sau khối thân, luôn ở ngoài (14/10/2026)

Anh Nam: khớp đùi đang nằm trên khối thân dưới; cần nằm sau, nhưng khớp và chân luôn tự điều chỉnh để khớp luôn ở ngoài khối thân (đang bị đè).

- `hipBelow(piece, x, r)` (body.ts): từ điểm thấp nhất của hình tại x, hạ xuống một bán kính, rồi tiếp tục hạ từng 0,5 mm tới khi đĩa khớp nằm ngoài hình và cách mọi cạnh ít nhất r. Bone hông đặt ở đó (rig.ts `place`), nên khớp chạm mép dưới trên mọi hình thân, mọi Build và slider.
- Thứ tự vẽ: khớp hông ngay trên đùi của nó (+0,3), nên với thứ tự lớp thường vẫn nằm sau khối thân.
- Chiều cao: chân không đổi độ dài, nên nhân vật cao hơn 2,4 m đúng bằng đoạn hông hạ xuống; `group.userData.restHeight` và Rig JSON ghi chiều cao thật.

## 65. Pixel 2 bộ phận; bảng Rules (14/10/2026)

Anh Nam: pixel hóa 2 bộ phận, không bao giờ là khớp; liệt kê toàn bộ luật (gradient, hoa văn…) ở cuối trang, chỉnh được số lượng và luật.

- `src/rules.ts`: luật hiện hành (weave, twoTone, checker + checkerApart + checkerStyles, flow + flowApart, touching, pixel, spray), mặc định đúng như các vòng trước (pixel nay là 2). `generate`/`normalizeSpec` (model.ts) và rig đọc luật hiện hành; seed đầy đủ mở ra theo luật đang dùng.
- `src/RulesPanel.tsx`: bảng ở cuối trang; đổi luật thì nhân vật được `normalizeSpec` lại ngay; luật chỉ ảnh hưởng hình vẽ (pixel, spray, kiểu checker) thì sân khấu dựng lại rig.
- `pixelPartsOf`: đoạn trơn, rồi bàn tay/chân trơn, rồi đoạn two-tone, mỗi nhóm xáo theo tên nhân vật, lấy đủ số theo luật.

## 66. Khớp vai ngoài thân (14/10/2026)

Anh Nam: khớp vai cũng không được chạm (đè) lên thân, như khớp đùi. `shoulderBeside(piece, y, r)` (body.ts): từ mép thân ở độ cao vai đẩy ra một bán kính, rồi tiếp tục ra ngoài từng 0,5 mm tới khi đĩa khớp cách mọi cạnh ít nhất r. Trước đây tâm khớp chỉ cách mép 3/4 bán kính nên khớp đè lên thân.

## 67. Góc sạch (14/10/2026)

Anh Nam gửi ảnh các góc nhỏ thò ra chỗ hai hình chồng nhau và muốn hình sạch.

- Mối nối hai khối thân (`seatOn`, body.ts): khối trên giữ nguyên phía trên đường đỉnh của khối dưới; phía dưới đường đó chỉ giữ phần nằm trong khối dưới (tính theo khối dưới đã bo góc như lúc vẽ). Không còn mẩu góc thò ra bên cạnh; chỗ khối trên rộng hơn là một gờ thẳng. Khối trên hình tròn không bị cắt (tròn không có góc, và hình tròn không bao giờ bị biến dạng).
- Mũ/mái cắt từ hình đầu (hair.ts): vẫn nở ra quanh đầu nhưng giảm dần về 0 ở đường cắt, nên hai đầu mũ nằm đúng trên mép đầu; hai góc đó không bo (`sharp`) để khớp mép đầu.
- Beanie: thân mũ hẹp hơn vành 6 px mỗi bên, không lộ góc ở góc bo của vành.
- `roundCorners`/`paper` nhận danh sách góc không bo; `clipConvex` cắt một hình bằng một hình lồi.

## 68. Không gradient trên đầu; Spray mịn (14/10/2026)

- Anh Nam không thích gradient (Flow) trên đầu: đầu không còn trong danh sách bộ phận Flow. Khi bỏ đầu, có nhân vật chỉ đủ chỗ hợp luật cho 3 gradient; `generate` thử tới 12 cách xếp và giữ cách được nhiều chỗ nhất. Test kiểm tra: ít hơn 4 thì không còn bộ phận nào nhận thêm được.
- Spray quá nhiễu và hạt nhảy liên tục (alpha hash theo điểm ảnh): nay là 36 bản trong suốt thật, xếp xoắn ốc góc vàng, bán kính theo phân vị Gauss, mỗi bản ~9%, cộng lại 97% ở giữa; hạt nhẹ ±25% gắn theo tọa độ của bộ phận (ô 4 mm) nên đứng yên trên bộ phận. Để bản trong suốt vẫn nằm đúng lớp, mọi vật liệu của nhân vật đều vẽ trong lượt trong suốt của three.js (lượt này cũng xếp theo renderOrder).
- Sau đó: Spray mịn hơn (64 bản), hạt rõ hơn (mỗi bản một lần rút ngẫu nhiên, 10–190% độ đậm, ô 5 mm, vẫn gắn cố định trên bộ phận), và chỉ dùng cho bộ phận màu trơn hoặc gradient: không bao giờ trên khối đan, checker hay two-tone (khối thân trơn thì được).

## 69. Dáng cơ thể theo art direction (14/10/2026)

Anh Nam thích các dáng trong `docs/proportion-plan.html` (gửi ảnh 11 dáng) và muốn dùng ngay cho art direction, dáng Geofolk hiện tại chiếm tỉ lệ cao nhất; tạm bỏ qua 30 câu hỏi.

- `src/bodyTypes.ts`: 11 dáng với các hệ số như trong trang plan (đầu, chiều cao thân, bề rộng, loe vai:đáy, tay dài, chân dài, độ dày tay chân, bàn tay/chân, cổ) và Build + hình thân ưu tiên. Không dùng Apple Egg và Bean (anh không chọn); Orb & Strings không có tay chân dạng hạt vì luật "không hai đoạn hạt trên một chi".
- Chọn dáng theo tên nhân vật với tỉ lệ trong bảng Rules (mặc định 40% today, 6% mỗi dáng khác). Dáng lưu trong seed (phiên bản 7: một ký tự sau các bộ phận); random một bộ phận giữ dáng; Generate chọn dáng mới.
- Rig: `typedProportions` nhân các slider; `bodyLayout(..., length)` dời đường đỉnh thân (dựng lại hình, không kéo); độ dài đoạn tay/chân/cổ và vị trí khuỷu, bàn tay, gối, bàn chân, đầu nhân theo dáng. Chiều cao nghỉ đo thật từ hình (`restHeight`).
- Test chạy với 100% dáng today để các kích thước danh nghĩa không đổi; một test riêng kiểm tra tỉ lệ dáng, seed, giữ dáng khi random một bộ phận, Build/hình và độ dài theo từng dáng.

## 70. Rèm cẳng tay (14/10/2026)

Anh Nam: trên 2 cẳng tay có rèm ragdoll: nhiều sợi spline với các hình hình học ngẫu nhiên nhân bản trên sợi, rơi theo trọng lực, thả lỏng không cứng; chọn 1 màu hoặc màu ngẫu nhiên từ bảng màu. Sau đó thêm tùy chọn độ dài, mật độ.

- `src/curtains.ts`: mỗi sợi 9 đoạn verlet, đầu ghim trên xương cẳng tay (15–85% chiều dài), trọng lực, giảm chấn 0,985, 12 lượt nới đều rồi một lượt từ chỗ ghim xuống đặt đúng độ dài từng đoạn (tay giật mạnh cũng không giãn dây). Không có lực kéo về dáng. Vẽ: dải 6 mm theo đường Catmull-Rom qua các điểm, hình xâu đều trên sợi, xoay theo hướng sợi. Lưới vẽ gộp theo màu, loại (dây/hình) và tay, vẽ ngay sau cẳng tay (dây −0,25, hình −0,2).
- Màu: các màu trong bảng màu trừ trắng giấy và màu tối, theo palette đang chọn (XMAS/TET đổi theo). One: một màu cho cả hai rèm; Random: mỗi sợi và mỗi hình một màu. Mỗi sợi rút ngẫu nhiên từ dòng riêng (tên nhân vật + tay + số thứ tự), nên đổi một tùy chọn không xáo trộn các sợi khác.
- Tùy chọn: Strands per arm 2–16, Curtain length / Shape size 40–250%, Shape spacing 40–300%.

## 71. Bỏ tóc Leaves (14/10/2026)

Anh Nam thấy kiểu Leaves giống tai thỏ: chuyển thành kiểu nghỉ (seed cũ mở thành Flame), Generate không chọn nữa.

## 72. Rèm ở nhiều chỗ; tab Look (14/10/2026)

- Rèm gắn được vào đầu, khối trên, khối dưới, bắp tay, cẳng tay, đùi, ống chân (ô tích). Ở khối thân, các sợi ghim dọc mép nửa trên của khối (lần theo đường viền, mỗi 1 cm), vẽ trên khối như tua áo; ở đầu, ghim dọc mép nửa dưới của đầu và vẽ sau toàn bộ cơ thể như tóc. Các sợi chia đều theo chiều dài đường ghim. Số sợi mỗi chỗ tối đa 40.
- Giao diện: bảng bên phải bị tràn (nút Save all as default đè lên bảng Rules). Mọi tùy chọn hình ảnh chuyển sang tab mới **Look** (`src/LookPanel.tsx`): nhóm thu gọn được (Patterns, Colour & print, Effects, Curtains), cuộn bên trong bảng, Save all as default và Reset cố định ở đáy. Tab Parts chỉ còn danh sách bộ phận và dòng khóa.

## 73. Độ cứng của rèm (14/10/2026)

Anh Nam muốn thanh chỉnh độ cứng cho rèm. **Stiffness** 0–100% (mặc định 0, dây thả lỏng như trước): mỗi lượt ràng buộc kéo từng điểm về phía đường thẳng nối tiếp đoạn phía trên (tối đa 45%/lượt), và giảm chấn tăng nhẹ (0,985 → 0,95) nên sợi cứng đung đưa ít hơn. Test: sau cùng một cú vung, sợi cứng cong ít hơn 60% so với sợi thả lỏng.

## 74. Không còn khe hở ở hình ghép; gấu rèm bằng nhau (14/10/2026)

- Anh Nam gửi ảnh một vệt sáng mảnh giữa hai mảng hồng–vàng ("trông như lỗi"). Kiểm tra: khối thân không bị thủng (diện tích tam giác hóa khớp diện tích hình ở mọi tổ hợp). Nguyên nhân hợp lý nhất: các kiểu tóc ghép từ nhiều mảnh chung cạnh, mỗi mảnh bo góc nên hở khe hoặc lẹm góc ở chỗ nối. Sửa: Bowtie vẽ một hình vuông liền màu chính rồi đặt 2 tam giác màu phụ lên trên; các mảnh đặt chồng (sọc Cone, dải Top hat, dải Bucket, tam giác Bowtie) và hình vuông Bowtie giữ góc nhọn (`inlay`, hair.ts) để mép trùng khít.
- Gấu rèm: mọi sợi của một chỗ kết thúc trên cùng một đường lúc đứng yên, thấp hơn chỗ ghim thấp nhất 25 cm × Length; sợi ghim cao hơn dài hơn tương ứng (không còn độ dài ngẫu nhiên).

## 75. Chọn bộ phận spray, có cả tóc (14/10/2026)

- Yêu cầu (Trung Bao): thêm lựa chọn bộ phận nào được spray, có cả tóc.
- `src/spray.ts`: `SpraySettings` thêm `pick` (`random` | `chosen`) và `places` (head, hair, torso, pelvis, upperarms, forearms, hands, thighs, shins, feet; mặc định chỉ Hair). Cài đặt cũ không có hai trường này đọc ra `random`, nên nhân vật cũ không đổi.
- `createSpray` nhận cả mesh thường (chuỗi ragdoll của tóc): các bản mờ là con của mesh đó nên đi theo nó, và mesh gốc ẩn bằng `material.visible` để con vẫn hiện.
- `rig.ts`: spray được tạo lần đầu khi cần rồi giữ lại; `setSpray` bật đúng các bộ phận được chọn. Tóc = `hair_mesh` + `hair_back`, `hair_back_accent`, `hair_front_accent` + các mảnh ragdoll. Bộ phận pixel vẫn pixel khi Pixel parts bật (`setPixel` áp lại spray). Sửa kèm: tìm nắp lỗ Donut chỉ cho mesh tên `*_mesh` (trước đó tên `hair_dangle` làm ẩn nhầm mảnh ragdoll đầu tiên).
- Chế độ Chosen bỏ qua luật "không spray khối đan / checker / two-tone" vì người dùng tự chọn; chế độ Random giữ nguyên luật.

## 76. Bỏ mũ phớt và ngôi sao, thêm nón lá và 5 hình đầu (14/10/2026)

- Yêu cầu (Trung Bao): bỏ mũ phớt (kiểu **Bucket**) và kiểu **Star**; thêm nón lá; thêm hình đầu là hình học cơ bản.
- `hair.ts`: Bucket và Star thành kiểu đã nghỉ (seed cũ mở thành Nón lá và Antenna; Asterisk trước trỏ tới Star nay trỏ tới Antenna). **Nón lá** là tam giác rộng, thấp (168 × 64 px trong khung thiết kế) phủ đỉnh đầu, có một dải accent nằm khít mép dưới. Nó lấy chỉ số cuối cùng còn trống: seed lưu mỗi kiểu bằng một chữ số hệ 36, nên danh mục tóc tối đa 36 kiểu. Kiểu mới sau này phải nhận lại chỉ số của một kiểu đã nghỉ.
- `rig.ts` `headOutlines` và `model.ts` `variants.head`: thêm Pentagon, Octagon, Diamond, Trapezoid, Pill (cao 0 → 0,31 như các đầu khác). Nhân vật tạo từ tên (không có `~`) có thể ra đầu khác trước vì danh sách dài hơn; seed đầy đủ vẫn mở đúng.

## 77. Kiểu rèm theo tỉ lệ (14/10/2026)

- Yêu cầu (Trung Bao): các bộ thông số rèm anh gửi là preset; mỗi preset có tỉ lệ, đa số không có rèm, Earring/Pants/Shirt nhiều hơn; Generate thì random.
- `curtains.ts`: `curtainLooks` (None, Hair, Body, Shirt, Earring, Pants, Long shirt), `curtainLookOf(label, weights)` rút theo tên nhân vật, `curtainsFor` trả thông số dùng để vẽ. `CurtainSettings.look` = `random` (mặc định) | `custom`.
- `rules.ts`: `curtainLooks` (tỉ lệ 0–100 mỗi kiểu, mặc định 50/5/5/10/10/10/10), chỉnh trong bảng Rules như Body types.
- Cần hỏi lại: ảnh "Earring" có thông số Bottom piece, 18 sợi, 130%, gần giống Pants; ảnh "Long shirt" chưa gửi (tạm: Shirt với Length 160%).
- Thân Single: rèm Bottom piece treo từ nửa dưới khối thân (trước đó không hiện gì).

## 78. Hình ngón tay, ngón chân; bật/tắt ngón tay (14/10/2026)

- Yêu cầu (Trung Bao): thêm hình thoi, tam giác cho ngón tay và ngón chân; nút bật/tắt ngón tay.
- `fingers.ts`: `DigitSettings` {fingers, shape: random | circle | diamond | triangle}, `digitOutline` (mọi hình 24 điểm viền, nằm trong vòng tròn bán kính r). Ngón tay vẽ lại mỗi khung theo hình đang chọn, chĩa ra ngoài tâm bàn tay.
- `rig.ts`: dựng sẵn 3 bộ ngón chân (mỗi hình một bộ, gắn xương lúc đứng yên), `setDigits` chỉ hiện một bộ; chạm đất chỉ tính bộ đang hiện. Lưu theo trình duyệt (`geofolk.digits`) và trong Save all as default (`digits`).

## 79. Parade view (14/10/2026)

- Yêu cầu (Trung Bao): một màn hình mới, dài 3:1, 15 nhân vật trôi từ trái sang phải thành vòng lặp; dáng khác nhau (bay, đứng, bước đi/chạy), đứng yên nhưng không đóng băng.
- `src/main.tsx`: `#parade` mở `Parade`, còn lại là studio. `src/settings.ts` `browserLook()`: đọc cùng các khóa localStorage studio dùng.
- `src/paradePoses.ts`: 22 dáng ([trái, phải], dương là ra xa thân), `castPoses` (5 mỗi loại, không trùng, không hai người bay cạnh nhau, có lật trái/phải và lệch nhẹ), `paradeFrame` (chuyển động nhỏ theo loại).
- `src/Parade.tsx`: một Canvas trực giao; mỗi nhân vật là một group riêng nên three.js vẽ cả nhân vật thành một khối (người bay đè lên người đứng). Rig tự đặt nhân vật lên sàn mỗi lần đổi dáng (theo tọa độ thế giới), nên độ bay cộng vào sau đó. Vòng lặp dài ít nhất bằng màn hình cộng 4,4 m, nhân vật ngoài màn hình không được tính dáng. Khoảng 7 ms CPU mỗi khung cho cả 15 nhân vật.
- Lưu ý: tên file `parade.ts` trùng `Parade.tsx` trên ổ không phân biệt hoa thường của macOS, nên file dáng tên `paradePoses.ts`.
- Thêm: `#parade?ui=off` (không thanh điều khiển, không con trỏ) và `#poses` (`src/PoseSheet.tsx`): bảng 22 dáng vẽ bằng ảnh tĩnh qua `renderThumbnail` (`thumbnails.ts` nhận thêm `HeldPose`: góc, độ bay, khung nhìn), giữ dáng như trong Parade nhưng không lật, không lệch.
- Chụp màn hình bằng Chrome headless trên macOS: không có display link nên hầu như không có khung `requestAnimationFrame` nào chạy và `setTimeout` không chạy; ảnh chỉ là khung đầu. Vì vậy bảng dáng vẽ trong effect chứ không qua timer.

## 80. Parade vòng 2: đứng sát nhau, đầy khung, không bay (14/10/2026)

- Yêu cầu (Trung Bao, kèm ảnh mẫu một đám đông nhân vật đứng sát nhau): khoảng cách như ảnh; nhân vật phủ kín chiều cao khung từ đầu tới chân, chừa khoảng trống phía trên và lề dưới; không bay, không xoay.
- `paradePoses.ts`: bỏ 8 dáng bay và mọi góc `root`; Hop thành Skip (một chân trên sàn); thêm 6 dáng theo ảnh mẫu: Groove (ngồi xổm rộng, tay dang xuống), Disco, Cheer, Lunge, Boogie, Swing. Còn 20 dáng (11 đứng, 9 bước); một dàn 15 người lấy 8 đứng, 7 bước, không trùng.
- `Parade.tsx`: chiều cao màn hình = chiều cao nhân vật cao nhất trong dàn (`restHeight`, từ 2,0 m Baby tới 3,0 m Pole) / (0,86 − 0,08): sàn ở 8% từ dưới, đầu người cao nhất ở 86%. Khoảng cách = 33% chiều cao đó (ảnh mẫu khoảng 35%). Slider Size (70–125%) và Spacing (22–80%) thay cho Wall height và Spacing tính bằng mét; thông số lưu ở khóa mới `geofolk.parade.v2`. Thứ tự vẽ giữa hàng xóm xen kẽ (`(i*7)%15`).

## 81. Giới hạn màu mỗi nhân vật; Parade nền đen/trắng; bỏ Bobble Baby (14/10/2026)

- Yêu cầu (Trung Bao, kèm lại ảnh mẫu đám đông): mỗi nhân vật ít màu hơn, theo mật độ màu của ảnh mẫu, làm thành một hệ thống; đứng xa nhau hơn một chút; thử một màn nền đen và một màn nền trắng; bỏ dáng em bé đầu to.
- `rules.ts` `colours` (4–8, mặc định 4). `model.ts` `withinBudget()`: bộ màu = A, B, C rồi lần lượt màu khớp vai, đầu, khớp khuỷu, tóc, khớp gối (đã chọn theo luật cũ) đến khi đủ số; J0 (vai, hông) ngoài A/B/C, J1/J2 trong bộ trừ A/B, H trong bộ trừ B, R trong bộ trừ H (ưu tiên xa H trên vòng màu). Bộ phận khóa giữ màu (có thể vượt số). Bước sửa chạm màu ở `paint()` lấy màu trong bộ trước. 8 = như cũ, không tiêu thêm số ngẫu nhiên nên nhân vật cũ ra y hệt.
- 3 màu không được: khối dưới (root) chạm khối trên (A) qua viên eo và chạm hông, nên hông phải là màu thứ tư.
- `weave.ts` `sourceOf(name, own)`: khi có màu riêng, vải đan dùng main = màu nhân vật, secondary = sáng hơn 22%, accent = pha trắng 62%; patchwork và Flow cũng vậy. `rig.ts` `ownColours`/`ownIndices`; `createCurtains(..., allowed)`.
- Parade: Spacing mặc định 42% (khóa `geofolk.parade.v3`); Background Studio stage / Black (#000) / White (#FFF), cũng đặt được bằng `#parade?bg=black|white`.
- `bodyTypes.ts`: Bobble Baby `retired: 'today'`: không bao giờ được rút, ẩn khỏi bảng Rules, seed cũ có Baby mở thành Geofolk today. Danh sách giữ nguyên chỗ vì seed lưu chỉ số.

## 82. Cùng chiều cao, nền trắng ngà; chỉnh Brick và Lollipop (14/10/2026)

- Yêu cầu (Trung Bao): nền trắng phải là trắng ngà; trên màn Parade mọi người cùng chiều cao (phóng to người thấp, giữ tỉ lệ); Brick có khớp và chân quá to, rối; Lollipop đầu quá to.
- `Parade.tsx`: White = `stageColors.light` (theme.paper). `equal` (Same height, bật mặc định): `rig.group.scale` = cao nhất / `restHeight`; rig tự đặt lên sàn ở mọi tỉ lệ (`ground()` đo theo tọa độ thế giới). Vì người to ra, đầu người cao nhất hạ xuống 80% (từ 86%), Spacing mặc định 48% (từ 42%), khóa `geofolk.parade.v4`; khoảng quay vòng ngoài màn hình 0,65 × chiều cao. `#parade?type=<id>`: cả dàn một dáng cơ thể.
- `bodyTypes.ts`: Brick `thick` 1,4 → 0,95 (tay chân và khớp, khớp theo căn bậc hai), `ends` 1,3 → 0,95 (bàn tay, bàn chân, ngón); Lollipop `head` 2,3 → 1,5.

## 83. Dáng từ ảnh mẫu, quay hướng phải, thư viện lớn và đổi dáng liên tục (14/10/2026)

- Yêu cầu (Trung Bao, kèm 13 ảnh mẫu): lấy dáng từ ảnh, tất cả quay sang phải; bỏ mũ Top hat; đầu Lollipop còn quá to; nhân vật lên xuống nhiều hơn, thêm dáng bay; thư viện càng nhiều dáng càng tốt và lần lượt đổi qua; dáng chân phẳng đứng trên sàn, dáng nhảy thì bay; khi đổi dáng thì nhảy lên rồi đáp; trộn ngẫu nhiên, không quá nhiều người trên sàn hay trên không cùng lúc.
- `paradePoses.ts`: góc viết theo màn hình (độ, từ thẳng xuống, ngược chiều kim đồng hồ, + là phía trước = bên phải), mỗi chi [trên, dưới] tuyệt đối; near = bên trái nhân vật (bên phải màn hình, vẽ trước). Góc cục bộ của rig đều ngược chiều kim đồng hồ ở cả hai bên nên chi trên lấy thẳng góc màn hình, chi dưới lấy hiệu. 39 dáng gốc (12 đứng, 12 bước, 9 nhảy, 6 bay) + bản đổi bên (near/far đổi chỗ, vẫn quay phải) = 74. Luật: khuỷu chỉ gập về trước (0–160°), gối chỉ gập về sau (0 đến −130°), không xoay cả người, lưng nghiêng tối đa 12°. Đứng/bước lift 0; nhảy 0,55–0,75 m; bay 0,7–0,85 m (cho người 2,6 m).
- `Parade.tsx`: hướng phải = `setDepth({frontArm:'L',frontLeg:'L',behind:{R:true}})` và dấu mặt dời sang phải 35% độ cao của nó. Đổi dáng (Change poses, Hold mặc định 7 s ± 25%): sau mỗi lượt giữ, chọn dáng mới không ai đang giữ, nửa trên không hay nửa trên sàn theo `airChance` (hướng về một nửa cả dàn trên không, tránh giống cả hai người bên cạnh), chuyển trong 1,3 s (smootherstep) kèm một cú nhảy 0,45 m (sin). Đầu người cao nhất khi đứng ở 70% khung để người bay còn chỗ.
- `hair.ts`: Top hat nghỉ (seed cũ mở thành Beanie). `bodyTypes.ts`: Lollipop head 1,5 → 1,1.
- `#poses`: bảng theo nhóm (Standing / Stepping / Jumping / Floating), lưới tự xuống dòng.

## 84. Màn LED trụ tròn; lấy đà, trọng lực, vượt quá; lưu mặc định Parade (14/10/2026)

- Yêu cầu (Trung Bao): chế độ cuốn cả khung Parade lên trụ 3D theo kích thước màn LED trụ tròn Ø4,20 × 4,01 m (chỉ là kích thước trụ; nền 3D trắng ngà, trụ lơ lửng); khi đổi dáng có lấy đà và vượt quá (đáp sàn thì chân giữ, đáp trên không thì thân và khối dưới khóa đúng chỗ, tay chân vượt quá); nhảy có cảm giác trọng lực, chậm dần về 0 ở đỉnh; trên không luôn có một chân cao hơn; nút lưu mặc định cho Parade.
- `paradeOptions.ts`: `view` (wall | unwrapped | cylinder) và các thông số Parade, `ledCylinder`, `ledRatio` = π·4,2/4,01 ≈ 3,29. `src/parade.json`: mặc định của dự án; route `/__defaults/parade` trong `scripts/vite-defaults.js`.
- `Parade.tsx`: nhân vật nằm trong một scene riêng, camera trực giao riêng, tự vẽ mỗi khung (`useFrame` ưu tiên 1). Liền mạch: vẽ ba lượt, khung dời ±một chiều rộng, chỉ những người gần mép tham gia lượt phụ. Hai lỗi đã gặp: nền của scene làm three.js xóa khung ở mỗi lượt (nay scene không có nền, xóa một lần bằng màu sân khấu); render target multisample bị three.js bỏ nội dung sau mỗi lần render (nay không multisample, cao 1600 px, mipmap sau lượt cuối). Cylinder 3D: lưới trụ 192 cạnh mở hai đầu, mặt trong tối, hai viền mảnh, OrbitControls.
- `paradePoses.ts` `changeFrame`: 0–24% lấy đà (ngồi thụp: đùi +0,5, cẳng −0,95, lưng −0,16, tay −0,55 rad), nhả trong 8%, bay 24–78% theo 4h·u(1−u), sau 78% vượt quá 16% × sin(πv)(1−v); đáp sàn: độ cao không vượt, nhún gối 0,55 × sin(πv); đáp trên không: độ cao, lưng và gốc khóa ở dáng mới. Giới hạn gối −2,4 rad, khuỷu 2,8 rad. Thời gian đổi dáng 1,6 s, cú nhảy 0,5 m.
- Dáng trên không: chân này cao hơn chân kia ít nhất 0,15 m (với đoạn chân 0,6 m), có test.
- Sửa: "Save all as default" của studio làm mất cài đặt mới khi ghi `settings.json` (spray Parts/Chosen, ngón tay, curtain look, số màu, tỉ lệ rèm). `scripts/vite-defaults.js` nay giữ đủ.

## 85. Một khung cho trụ, hình trôi, dáng đi/chạy, bỏ trần (14/10/2026)

- Yêu cầu (Trung Bao): khung Parade phải đúng y như trên trụ; nền quanh khung tối hơn khi Off-white; hình học nhỏ màu palette trôi ngang như điểm ảnh, thị sai, không chồng nhau, đường thẳng; một dáng đi và một dáng chạy chuyển động (vào/ra vẫn vượt quá, nảy, easing; chân giữ trên sàn); trả lại Spacing; bỏ giới hạn trên (đã thử: giới hạn trên có nảy cho từng bộ phận chạm, nhưng tay bị cứng và giật nên anh bỏ).
- `paradeOptions.ts`: chỉ còn `canvas` | `cylinder`; `wall` và `unwrapped` cũ mở thành `canvas`; thêm `shapes` (0–150, mặc định 60). Số người = round(ledRatio / ((0,7 − 0,08) × Size × Spacing)), 5–32; cast là danh sách 32 tên, dùng các tên đầu.
- `paradeShapes.ts`: làn đều từ sàn tới mép trên, mỗi làn một độ sâu 0,25–0,65 (tốc độ = trôi × độ sâu, cỡ 0,45–1,2% chiều cao), làn cách nhau ~3% > cỡ lớn nhất, mỗi làn cách đều; vuông nhiều nhất, thêm tròn, tam giác, thoi, lục giác; vẽ trước nhân vật (group renderOrder −1).
- `paradePoses.ts`: `cycle: 'walk' | 'run'`, `cycleAngles(cycle, u)`: đùi lắc ±22° (chạy ±40°), gối gập khi chân đưa về trước (đi 42°, chạy 95°), tay ngược chân, khuỷu gập hơn khi tay ra trước; chu kỳ 1,15 s / 0,72 s. Không có bản đổi bên (là cùng chu kỳ lệch nửa bước).
- `rig.ts`: bỏ `top`/`reach` (chỉ dùng cho trần).

## 86. Tay mở ra ngoài, dáng nhảy múa, đổi dáng mượt, ô vuông hoa văn, Parade 50 người với màn nhảy ra/nhảy vào (14/10/2026)

- Yêu cầu (Trung Bao): bỏ 18 dáng (Shoulder line, Run (knee drive), March và 15 bản "other side"); tay không vắt sang bên kia thân (trừ đi và chạy, tay đánh chéo như cũ); thêm một dáng nhảy múa nhẹ; mọi chuyển động phải mượt, không nhảy cóc; ô vuông nền: ít hơn, to hơn, cùng tốc độ nhân vật, chỉ hình vuông, bàn cờ hoặc vải đan, thêm màu trơn, có slider tốc độ và cỡ; dựng nhân vật thật nhanh; Parade có khoảng 50 người, mỗi 5 s một người ở chỗ ngẫu nhiên lấy đà nhiều hơn và nhảy ra khỏi mép trên, người khác nhảy lên từ dưới và đáp chân xuống sàn.
- Tay: mọi tay của bảng dáng được đặt lại về phía mình (gương góc âm sang dương với tay gần, ngược lại với tay xa; khuỷu gập ra ngoài, không quá đỉnh đầu); bản "other side" đổi chân và lấy tay bên kia soi gương. Test: khuỷu và bàn tay không quá 3 cm / 6 cm sang phía thân bên kia.
- `cycleAngles('dance')`: hai nhịp mỗi chu kỳ 0,95 s, gối nhún 8–20°, hông lắc ±5°, tay 40° ± 10° gập 70–85°, đầu gật ±4°. Gối của đi/chạy theo ((1 + cos)/2)^n (không có góc gãy).
- Đổi dáng mượt: đồng hồ của dáng cũ chậm dần (tốc độ (1 − k)², không chạy lùi), của dáng mới nhanh dần và khớp đúng lúc kết thúc; giới hạn khớp mềm (`softAdd`) thay cho chặn cứng; lỗi cũ: chặn khuỷu tay xa sai chiều làm tay giật ở cuối. Test: 300 lần đổi dáng ngẫu nhiên từng khung 60 fps, độ đổi tốc độ mỗi khung < 0,12 rad, chỉ cho phép xung lực lúc rời sàn/đáp.
- `paradeShapes.ts`: ô vuông 4–9% chiều cao × Square size, 1/3 màu trơn, 1/3 bàn cờ, 1/3 vải đan (`drawWeave`, 256 px); làn cách nhau hơn ô lớn nhất, số ô mỗi làn giới hạn theo chu vi.
- Tốc độ dựng (đo trong Node, không texture): 27,7 → 15 ms mỗi nhân vật, 195 → 67 mesh. (1) bản sao spray chỉ tạo khi spray bật; (2) vật lý ngón tay, tóc, rèm cập nhật ma trận một lần mỗi lần update/settle thay vì mỗi bước, mỗi sợi; (3) Parade dùng texture vải đan 512 px (`setWeaveTextureSize`).
- Swap (`exitFrame`, `entryFrame` trong `paradePoses.ts`; Parade: Cast, Swap every): ra 1,8 s (lấy đà 1,6× trong 34%, rồi bay lên nhanh dần chậm, vượt mép trên); vào 1,5 s (parabol trọng lực từ dưới mép dưới, đỉnh 0,6 m, đáp ở 68% rồi nhún gối, vượt quá). Người kế tiếp được dựng trong lúc máy rảnh (2 người chờ sẵn) và vẽ thử một lần vào target 16 × 16 để hình, xương, texture, shader lên GPU trước. Đo trong Chrome headless (CDP): 21 s, 4 lần swap, khung chậm nhất 21 ms, không lỗi.


## 87. Cú nhảy có lực, trường lực đẩy, lộn, nhún, năm điệu nhảy, vẫy tay, bộ màu trong Parade, mặt Expressive và Many eyes, hông không tròn (14/10/2026)

- Yêu cầu (Trung Bao, theo thứ tự): người nhảy ra lấy đà mạnh hơn, bật thẳng người như vọt lên, tay duỗi sát hai bên, phải thấy lực và tốc độ; thêm back flip, front flip, nhún nhảy tại chỗ (cùng tỉ lệ dáng chuyển động, chỉ thêm đa dạng); chạy chậm lại một chút; một phần tư số dáng giơ một tay lên vẫy; slider độ ngẫu nhiên cỡ ô vuông; cú nhảy đẩy nhẹ những người và ô vuông xung quanh rồi trả về chỗ (như trường lực), có slider lực; các khớp ở trên đùi không bao giờ là hình tròn; flip và hop phải chuyển mượt từ dáng khác, lộn chậm hơn, lấy đà có chủ ý; chỉ người nhảy lên đẩy, người lên từ dưới không đẩy, thêm điều khiển easing; nhún chậm và mượt hơn; năm điệu nhảy khác nhau; XMAS và TET dùng màu nền của bộ màu, có nút đổi bộ màu trong Parade; tỉ lệ dáng chuyển động tăng thêm 15%; mặt thứ hai (tối giản nhưng biểu cảm, theo bảng tham khảo nhưng là của mình) và bộ mặt nhiều mắt không miệng; nút cho mặt lấy màu palette.
- **Cú nhảy ra** (`exitFrame`, `swapTimeline`, 1,05 s): nửa đầu ngồi thụp sâu gấp 2,4 lần một lần đổi dáng, người bè ra (rộng +6%, thấp −10%); 12% kế tiếp bật thẳng thành dáng "bút chì" (`pencil`: chân khép thẳng, tay duỗi 7° hai bên, đứng im không thở), vươn cao +22%; từ 56% vọt lên nhanh dần (độ cao rise · s^1,2) ra khỏi mép trên. **Người vào** (`entryFrame`, 1,15 s): bút chì vọt lên từ dưới mép dưới theo parabol, dài ra theo tốc độ, mở dáng gần đỉnh, đáp ở 70% rồi nhún gối. Bút chì không lấy nhịp thở của dáng jump (lỗi đã sửa: ống chân lệch 2°).
- **Trường lực** (`paradeField.ts`): chỉ cú nhảy ra (và cú lộn rời sàn, nhân Flip push) đẩy. Người khác trượt dọc hàng ra xa người nhảy theo đường chuông exp(−(d/Push reach)²), gần nhất tối đa 10% chiều cao người × Jump push; ô vuông bị đẩy thẳng ra xa tâm người nhảy (nửa chiều cao người), xa hơn 1,2 lần; đường đi: easing ra trong Push out giây (mặc định 0,18), easing về trong Push back giây (mặc định 1,2). Đo trong Chrome headless: không tốn thêm thời gian khung (trung vị 12,1 ms có đẩy, 12,4 ms không đẩy; máy đang tải 10–14).
- **Hop, Back flip, Front flip** (`bounceFrame`): mỗi vòng có một lúc nghỉ trên sàn (u = 0); Parade chờ hết vòng đang dở mới đổi dáng (`restAt`) và canh pha dáng mới để bắt đầu đúng lúc đổi dáng xong (`alignCycle`); trong lúc đổi dáng, dáng hop/flip giữ khung nghỉ (`restFrame`), đáp vào nó tính như đáp xuống sàn. Lộn (2,5 s, `flipTimeline`): vung tay lên phía trước, ngồi thụp sâu (gối 70°) với tay vung xuống sau, giữ, bật, rời sàn ở 48%, cuộn người, xoay đủ 2π quanh hông (smootherstep), mở tay rộng, chân hơi cong với xuống, gối bắt đầu khuỵu ngay trước khi chạm sàn, đáp ở 80%, đứng dậy đến 97%. Trên không hông đi đúng đường parabol (độ cao 1,3 m cho người 2,6 m, `pivot`) dù người xoay hay cuộn; không bao giờ thấp hơn người đứng trên sàn. Lộn ngửa ngược chiều kim đồng hồ (đầu ra sau trước), lộn sấp xuôi chiều. Bàn chân hút sàn không áp vào lúc đang lộn. Hop: 0,95 s, cao 0,32 m, gối và tay theo cos nên mượt.
- **Năm điệu nhảy** (`danceAngles`, đều đứng trên sàn, tay mở ra phía mình): Disco (1,5 s), Robot (2 s, bốn thế tay vuông, mỗi thế chuyển trong nửa nhịp rồi giữ), Twist (1,05 s), Arm wave (1,6 s), Charleston (1,25 s). Chạy: 0,72 → 0,86 s một sải.
- **Tỉ lệ dáng chuyển động** (`movingShare`): ban đầu giữ 3,8% (tỉ lệ của đi, chạy, nhảy cũ) khi thêm dáng; sau đó +15 điểm = 18,8% (khoảng một người trong năm), chia đều 11 dáng; dáng giữ yên chia phần còn lại, mỗi loại (đứng/bước, nhảy/bay) vẫn nửa phần của nửa mình. Test: 60 000 lần chọn khớp với tỉ lệ.
- **Vẫy tay** (`holdPose`, `waveChance` 25%): dáng giữ yên (không phải dáng chuyển động) giơ một tay ngẫu nhiên lên 140° ra phía mình, cẳng tay dựng lên, bàn tay vẫy ±22° mỗi 0,5 s.
- **Ô vuông**: mỗi ô một cỡ riêng, Size randomness 0–1 (0,45 = 4–9% như trước; 1 = 1–12%); làn vẫn cách nhau hơn ô lớn nhất có thể.
- **Bộ màu trong Parade**: nút Theme (Studio theme / HFCD / XMAS / TET) vẽ lại cả dàn; nền theo bộ màu: HFCD Black / Off-white, XMAS Blue `#114DDC` / Ice `#DFFDFE`, TET Red `#C01E2E` / Gold `#FFD31F`; Studio stage lấy màu tối hay sáng theo cài đặt nền của studio; viền quanh khung là màu nền tối hơn 16%.
- **Mặt** (`faces.ts`, Look → Face): Minimal (dấu mặt cũ), Expressive (28 mặt), Many eyes (18 mặt, không miệng), hiện lớn hơn 25% so với nét vẽ, test: nằm trong cả 11 hình đầu ở chỗ đặt dấu mặt. Mỗi nhân vật có mặt riêng trong mỗi bộ (theo tên, rng). Rig: `setFace` đổi hình và vật liệu của mesh `face_mark_mesh` (mỗi bộ dựng lần đầu khi cần), nên thứ tự lớp giữ nguyên và FBX/OBJ xuất đúng mặt đang hiện. Palette colour: trong các màu nhân vật đang mặc (không tính màu đậm, không tính màu đầu), lấy màu có độ tương phản WCAG cao nhất với màu đầu. Lưu theo trình duyệt (`geofolk.face`) và trong Save all as default (`settings.json`, `vite-defaults.js`).
- **Hông** (`hipShapeOf`): lấy hình vai, trừ Sphere và Ring; khi đó Square/Diamond/Hexagon theo tên.
- Duyệt: `#parade?pose=back-flip` (cả dàn một dáng). Kiểm tra: 87 test (thêm: lộn và nhún, đổi dáng vào/ra ở lúc nghỉ, năm điệu nhảy, vẫy tay, trường lực, mặt, hông; 9 000 lần đổi dáng ngẫu nhiên vẫn < 0,12 rad/khung²), build, Chrome headless 40 s với swap mỗi 3 s, đẩy, đổi dáng: 19 swap, không lỗi.

## 88. Bộ mặt Minimal mở rộng (14/10/2026)

- Yêu cầu (Trung Bao): nâng cấp bộ mặt Minimal: thêm hình, thêm nhiều mặt gồm hai hình đối xứng như hai mắt, vẫn giữ mặt một hình; nét thẳng dày hơn.
- `minimalFaces` (faces.ts) thay `markOutlines` (rig.ts): 25 dấu mặt, theo đúng thứ tự `variants.face` (model.ts); sáu dấu đầu (Dot, Dash, Triangle, Twin dots, Diamond, Bar) giữ chỉ số cũ nên seed cũ giữ mặt của mình; nhân vật tạo từ tên thì có thể ra dấu mới (vẫn một lần rút ngẫu nhiên, các bộ phận khác không đổi).
- 14 dấu một hình: Dot, Dash, Triangle, Diamond, Bar, Square, Dome, Bowl, Hexagon, Plus, Star, Pill, Arc, Chevron. 11 cặp đối xứng (ảnh gương qua trục giữa): Twin dots, dashes, squares, diamonds, triangles, domes, bowls, bars, slants, stars, pills.
- Nét thẳng dày hơn: Dash và Bar 2,4–2,6 → 3,6 cm; Plus 3 cm; cặp gạch 2,4–2,6 cm; Arc 2,2 cm; Chevron 2,6 cm. Tất cả trong ±6 cm ngang và ±4,5 cm dọc quanh điểm đặt dấu, dưới mép mũ/tóc (5 cm).
- Expressive và Many eyes (phóng 1,25 lần) giờ cũng được kéo xuống dưới `faceTop` (4,6 cm trên điểm đặt dấu) và thu nhỏ nếu cần để không xuống dưới −6,6 cm, để mũ và helmet không bao giờ đè lên mặt; test tóc giờ kiểm tra cả ba bộ mặt trên mọi đầu và mọi kiểu tóc.
- Kiểm tra: test mới (tên khớp `variants.face`, số một hình/cặp, cặp là ảnh gương, độ dày nét, giới hạn kích thước, mọi dấu đều xuất hiện trên 400 nhân vật, mọi mặt của ba bộ nằm trong 11 hình đầu và dưới tóc), build; bảng 25 dấu vẽ trong Chrome headless không lỗi.

## 89. Cả dàn đồng bộ (Sync) và chuyển dáng theo từng bộ phận (14/10/2026)

- Yêu cầu (Trung Bao): thỉnh thoảng cả dàn chuyển động đồng bộ (mỗi 20 s thì đồng bộ 10 s), có slider chỉnh; các kiểu: đi bộ (gần như cùng nhịp, lệch chút), nhảy cùng nhau, cổ vũ (mỗi người một nhịp), đứng vẫy tay; thêm chạy bộ kiểu marathon; mỗi 20 s bắt đầu một kiểu ngẫu nhiên; đồng bộ nhưng lệch nhau một chút (vẫn thấy là cùng một động tác); khi chuyển từ các dáng khác vào dáng đồng bộ, mỗi bộ phận có overshoot và easing riêng theo mức thay đổi; chỉ chuyển liền mạch, không giật.
- `ParadeOptions.syncEvery` (0–120 s, mặc định 20, 0 = tắt; từ lúc bắt đầu lượt này đến lượt sau), `syncFor` (3–40 s, mặc định 10, tối đa `syncEvery − 2`). Lưu trong `parade.json`, kiểm tra trong `vite-defaults.js`.
- `syncPose` (paradePoses.ts), `SyncMode`: `walk` (Walk cycle), `jog` (chu kỳ mới, giữa đi và chạy: sải 28°, gối gập 70°, tay vung 30°, 0,92 s), `dance` (cả dàn một điệu trong 6 điệu, mỗi lượt nhảy khác lượt nhảy trước), `cheer` (chu kỳ mới, chỉ dùng khi đồng bộ: hai tay chữ V đấm lên mỗi nhịp, gối nhún khi tay hạ, nhịp riêng 0,6–0,85 s mỗi người), `wave` (đứng thẳng, cả dàn vẫy cùng một tay). Mỗi người lệch pha ngẫu nhiên tối đa ±6% (`syncSpread`). `ParadePose.period`: chu kỳ riêng (cheer).
- Parade.tsx: lượt chọn ngẫu nhiên, khác lượt trước; mỗi chỗ (slot) có dáng riêng và lúc bắt đầu riêng (0–0,5 s); người đang lộn/nhún chờ đến lúc nghỉ; đang đổi dáng thì đổi xong rồi vào; người mới vào trong lúc đó cũng nhập theo dáng của chỗ mình. Hết lượt: mỗi người đổi sang dáng mới sau 0,2–1,8 s (tắt Change poses thì quay về dáng cũ). Swap dừng trong lượt đồng bộ và 1,5 s sau. `#parade?sync=<mode>`: lượt đầu sau 1 s.
- Chuyển dáng theo từng bộ phận (`follow`, `followLag`, dùng cho mọi lần đổi dáng): mỗi khớp đi theo một lò xo bắt đầu từ đứng yên, đỉnh vượt đầu tiên ở 62% thời gian của nó, độ vượt từ 2% (đổi ít) đến 18% (đổi từ 70° trở lên), tối đa 0,3 rad; 28% cuối thời gian phần dao động còn lại được easing về 0 nên đến đúng dáng mới, vận tốc 0, đúng lúc đổi xong. Trễ (overlapping action, phần của thời gian bay): thân 0, đùi 0,02, cánh tay trên 0,03, đầu và ống chân 0,06, cẳng tay 0,09, nhân (0,5 + mức đổi). Vượt quá trong giới hạn khớp (`softAdd`): gối không quá thẳng (+0,02 rad), khuỷu không gập vào trong (0,05 rad). Thân và gốc vẫn khóa khi đáp trên không. Robot: mỗi thế chuyển trong 56% (trước 50%) nhịp của nó.
- Kiểm tra: 91 test (thêm: năm kiểu đồng bộ, jog và cheer, follow); 9 000 lần đổi dáng ngẫu nhiên (1/3 vào dáng đồng bộ) vẫn < 0,12 rad/khung²; Chrome headless 62 s với Sync every 12 s, Sync for 6 s: 6 lượt (jog, wave, dance, wave, dance, wave), mỗi lượt 6 s, không lỗi.

## 90. Thể dục buổi sáng, lướt vào đồng bộ, rơi theo trọng lực, số ID, sàn thấp hơn (14/10/2026)

- Yêu cầu (Trung Bao): một bộ 6 bài thể dục buổi sáng cho lượt đồng bộ; vào đồng bộ bị giật và có người nhún nhảy lên xuống (như đang đi mà nhảy lên rồi xuống để vào nhịp), phải biến hình mượt; người đang bay rơi xuống phải rơi nhanh theo trọng lực, chân chạm sàn, thân dưới khuỵu nặng, thân trên vẫn làm động tác (cả khi đổi dáng thường); bỏ dáng Hurdle; số ID trên đầu mỗi chỗ (bật/tắt, mặc định bật), Geist Pixel, xanh; người mới mang số lớn hơn nên thứ tự bị xáo; khi nhảy ra thì số mờ đi trượt lên, số mới mờ hiện trượt lên; hạ sàn để lề dưới bằng khoảng từ mép trên đến đầu chữ; ô vuông luôn dưới chữ, không chồng lên.
- `exerciseAngles` (paradePoses.ts), `ExerciseCycle`: Arm raise (2,4 s), Side stretch (3,2 s), Squat (2,2 s), Toe touch (2,8 s), Star jacks (1,4 s, bước chân ra, không rời sàn), Knee lift (1,8 s). `SyncMode` thêm `exercise`; mỗi lượt một bài khác lượt trước; lệch pha ±6% như các kiểu khác. Không có trong thư viện dáng.
- Lướt (`changeFrame` với `glide`, Parade `syncMorph` 1,6 s): không ngồi lấy đà, không bay; mỗi bộ phận theo lò xo của nó bắt đầu ngay, khởi động bằng smoothstep (cả gia tốc cũng không nhảy). Cùng chu kỳ bước (walk, jog, run): trượt pha thay vì trộn hai sải chân. Lỗi đã sửa: người đang bận (đang đổi dáng) lúc lượt đồng bộ bắt đầu được tính giờ bắt đầu từ lúc lượt bắt đầu, nên khi rảnh thì nhảy ngay vào giữa quá trình (giật 1,5–3,5 rad trong một khung); nay giờ bắt đầu chỉ đặt một lần khi người đó rảnh, không bao giờ ở quá khứ. Lỗi Robot: pha âm làm chỉ số khung khóa âm, nay quay vòng đúng.
- Rơi (`fallTimeline`): mọi lần đổi từ dáng trên không (jump, float, trừ hop/flip) sang dáng trên sàn: rơi trong 0,3 s theo trọng lực (độ cao × (1 − (k/k₀)²)), chân về dáng mới trong 3 lần thời gian rơi, gối bắt đầu chịu lực ở 70% cú rơi, khuỵu sâu 1,15 lần crouch (nhanh, rồi đứng dậy chậm đến hết lần đổi dáng), thân hơi chúi; thân trên tiếp tục vào dáng mới. Chạm sàn là một cú dừng độ cao (không tính vào giới hạn giật độ cao); góc khớp vẫn < 0,12 rad/khung².
- Bỏ Hurdle (và bản đổi bên đã bỏ từ trước).
- `paradeLabels.ts`: `idText` (0001…), `labelState` (ra: mờ và trượt lên 1,1 lần chiều cao chữ trong 0,45 s; vào: từ dưới lên trong 0,6 s, đều easing), màu `idColours` (HFCD xanh `#0564F8`; XMAS trắng trên nền Blue, xanh trên Ice; TET vàng trên Red, đỏ trên Gold); chữ vẽ vào texture (canvas 256 × 64, chữ số canh giữa theo đo thật), mỗi chỗ một mesh trong cảnh, vẽ trên cùng, liền mạch qua đường nối và lên trụ. `ParadeOptions.ids` (mặc định bật), nút IDs.
- Bố cục: `idTop` 0,04 (đầu chữ cách mép trên 4%) = `floorAt` (sàn cách mép dưới 4%, trước là 8%; nhân vật cao hơn khoảng 6%); chữ cao 4,2%; ô vuông dưới chữ cách 2,5%, bị đẩy cũng không vượt lên hay xuống dưới sàn.
- Kiểm tra: 93 test; 18 000 lần đổi dáng/lướt/rơi ngẫu nhiên: giật lớn nhất 0,102 rad/khung²; Chrome headless 120 s ở `frames=manual` (đúng 1/60 s mỗi khung) với đo giật từng khớp từng nhân vật: chỉ còn cú bật thẳng người có chủ ý khi nhảy ra khỏi mép trên (swap), không lỗi.
