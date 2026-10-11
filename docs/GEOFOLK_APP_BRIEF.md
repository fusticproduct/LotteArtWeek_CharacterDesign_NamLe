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
