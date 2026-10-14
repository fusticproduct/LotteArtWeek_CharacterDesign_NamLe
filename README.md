# Geofolk — Character Studio (bản 2D)

> Tài liệu này dành cho người mới nhận dự án, hoặc để đưa vào một trợ lý AI (ChatGPT, Claude…) làm ngữ cảnh.
> Nó mô tả đúng trạng thái mã nguồn ngày 11/10/2026. Đọc hết một lượt là đủ để chạy app, hiểu cấu trúc và sửa tiếp.

## 1. App này là gì

Geofolk là một web app tạo **nhân vật hình học** ngẫu nhiên: người ghép từ các khối đơn giản (cầu, nón, bát, đĩa, chuỗi hạt…), màu rực, trông như đồ chơi cắt giấy. App làm cho dự án Lotte Art Week.

Người dùng có thể:

- bấm **Generate** để tạo nhân vật mới; **khóa** bộ phận mình thích và **random lại** phần còn lại;
- **kéo thả thứ tự lớp** (bộ phận nào vẽ đè lên bộ phận nào);
- thân ghép từ **1 hoặc 2 khối phẳng** (Single, Pair, Big top, Big bottom), có **pattern đan (basket weave)**, chỉnh độ to nhỏ của ô và bảng màu;
- cho nhân vật **bắt chước chuyển động cơ thể** của người thật qua camera (MediaPipe Pose);
- lưu/khôi phục nhân vật bằng một chuỗi **seed**; xuất FBX, OBJ, Rig JSON, PNG.

Mọi thứ chạy trong trình duyệt. Chỉ riêng tính năng bắt chuyển động cần thêm một server Python nhỏ chạy trên cùng máy.

### Lưu ý quan trọng về "2D"

Nhân vật **trông** 2D. **Đầu, các khối thân và dấu mặt** là hình phẳng thật (như tấm bìa mỏng 3 cm, góc bo nhẹ). Các bộ phận còn lại vẫn là khối 3D. Tất cả gắn trên một bộ xương thật. Hình 2D có được nhờ ba thứ:

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
npm test        # 40 test tự động
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
| Thanh trên | Nút **Undo / Redo** (Ctrl+Z, Ctrl+Shift+Z hoặc Ctrl+Y; Cmd trên Mac): hoàn tác Generate, random từng bộ phận, Colors, chọn ở lưới ×6, áp seed, khóa/mở khóa, thứ tự lớp, Proportions, Palette, Pattern scale. Kéo slider liên tục tính là 1 bước. Nền, tư thế và Paper texture không tính. Trong ô Seed, Ctrl+Z là hoàn tác chữ. Ô **Seed** (gõ rồi Enter để áp dụng, nút copy lấy seed đầy đủ), menu **Export**, nút **Colors** (bộ màu mới, giữ nguyên hình và tên; bộ phận đã khóa giữ màu), nút **×6** (Generate ra 6 nhân vật trên sân khấu để chọn một, vẫn giữ bộ phận đã khóa; Esc để đóng), nút **Generate** |
| Khung nhân vật (trái) | Kéo để di chuyển khung nhìn, cuộn để zoom. Bốn nút bên phải khung: fit về giữa, hiện bộ xương, mở tab Live pose, đổi nền đen/nền giấy (mặc định đen, giống video tham chiếu; PNG export lấy đúng nền đang chọn) |
| Thanh dưới khung | Bốn tư thế: At ease, Hands up, Step out (ba tư thế này "thở" nhẹ: thân, đầu, tay đung đưa chu kỳ 3.6 s; tắt khi hệ điều hành bật giảm chuyển động) và **Dance** (phát lặp 3 phút nhảy đã ghi từ video mẫu, không cần server hay camera) |
| Tab **Parts** (phải) | Bộ phận và lớp: danh sách 6 khối lớp (Arms, Head, Body, Neck, Lower body, Legs). Khối Body có dòng **Build** (kiểu ghép thân) và **Top piece** (khối trên, hoặc khối duy nhất); khối Lower body có **Bottom piece** (khối dưới; "None" khi Build là Single) và khớp hông; **khối trên cùng được vẽ phía trước**. Kéo tay nắm ở đầu khối để đổi thứ tự (hoặc chọn tay nắm rồi bấm ↑/↓). Trong khối Arms/Legs, các bộ phận xếp theo thứ tự vẽ cố định (xem mục 7). Mỗi dòng có nút random (đổi **hình** của bộ phận, giữ màu; dòng Hip joints thì đổi màu mọi khớp) và nút khóa. "Reset order" trả về thứ tự mặc định |
| Tab **Look** | Mọi tùy chọn hình ảnh, chia nhóm thu gọn được (trạng thái mở/đóng nhớ theo trình duyệt), cuộn bên trong bảng: **Patterns** (Pattern scale, Checker scale, Flow speed), **Colour & print** (Palette, Paper texture, Riso và các thông số), **Effects** (Pixel parts: cỡ, FPS; Spray blur: độ mờ), **Curtains** (bật/tắt, chỗ treo, màu, số sợi, độ dài, cỡ hình, khoảng cách). Dưới cùng cố định: **Save all as default** và **Reset** |
| Dưới danh sách (tab Parts) | Số bộ phận đang khóa, Unlock all |
| Tab **Proportions** | 12 slider 50–150% chỉnh cỡ bộ phận cho mọi nhân vật: Head, Top piece width, Seam height (dời chỗ nối hai khối thân lên/xuống; khối kia tự dài ra để chạm), Bottom piece width (hai slider độ rộng chỉ áp lên khối không tròn), Arm thickness, Leg thickness, Hands, Feet, Joints, Fingers & toes (cỡ chung của hình tròn ngón tay và ngón chân), Hair (cỡ tóc), Finger stiffness (50% mềm lủng lẳng, 100% giữ dáng, 150% gần như cứng). **Save all as default** lưu mọi cài đặt làm mặc định: các tỉ lệ (kể cả Checker scale, Flow speed) vào `src/proportions.json`, palette, thứ tự lớp, Paper texture, Riso, nền đen/giấy và Pattern scale vào `src/settings.json` (khi chạy `npm run dev`), thành mặc định chung của dự án cho mọi trình duyệt; bản build tĩnh thì chỉ lưu cho trình duyệt đó. Trình duyệt mới mở app sẽ bắt đầu từ mặc định này. **Reset** trả mọi cài đặt về mặc định đã lưu; "Set all sliders to 100%" trả về cỡ gốc. Giá trị đang chỉnh lưu theo trình duyệt, không nằm trong seed |
| Tab **Live pose** | Bật/tắt bắt chuyển động, trạng thái kết nối, chọn Webcam / Demo video (bấm khi đang tắt cũng bật luôn với nguồn đó), slider **Motion smoothing**, ô xem hình camera |

Các cặp trái/phải luôn đi chung (vai, khuỷu, bàn tay, gối, bàn chân, đùi, ống chân) hiện thành một dòng. Bắp tay và cẳng tay có dòng Left/Right riêng.

## 4. Các quy tắc thiết kế đã chốt

Đây là những quyết định có chủ đích. Đừng "sửa" chúng nếu không được yêu cầu.

- **Đối xứng:** bàn tay, bàn chân và mọi khớp (vai, khuỷu, hông, gối) luôn cùng hình và cùng màu hai bên. Đùi và ống chân cùng hình hai bên, màu tự do. Khóa hoặc random một bên là áp dụng cho cả cặp.
- **Mỗi loại khớp một màu:** vai, khuỷu, gối mỗi loại một màu riêng (ba màu khác nhau khi bảng màu cho phép), hai bên luôn cùng màu, khác màu mọi bộ phận kề nó. Khóa hoặc random một dòng khớp chỉ áp dụng cho cặp đó. Khớp hông luôn bị thân che nên không có nút random. Khớp nhỏ còn 85% cỡ bản 2D đầu tiên.
- **Màu:** chỉ dùng 18 màu trong `src/palette.json` (trích từ ảnh tham chiếu `public/reference.png`). Hai bộ phận nối liền nhau không trùng màu. Dấu trên mặt luôn màu tối.
- **Palette XMAS / TET đổi màu cả nhân vật:** HFCD dùng đúng màu trong seed. XMAS (nền xanh `#114DDC`, thân xanh lá, đỏ, trắng, xanh nhạt, vàng) và TET (nền đỏ `#C01E2E`, thân vàng, hồng, đỏ cam, cam, kem, ngọc, xanh lá) lấy mẫu từ ảnh poster của anh Nam. Khi vẽ, mỗi màu nhân vật đang dùng được đổi sang một màu riêng trong bộ, theo vai trò (thân A, cổ B, tay chân C, khớp J, đầu H) với cùng quy tắc phối màu, nên bộ phận kề nhau vẫn khác màu; dấu mặt dùng màu tối của bộ. Seed không đổi, cùng nhân vật luôn ra cùng màu. Nền giấy (sáng) giữ nguyên. Code: `src/themes.ts`.
- **Bộ màu riêng từng nhân vật:** mỗi nhân vật rút một bộ 5 màu từ 15 màu tươi: 2 màu thân (A, B), 1 màu nhấn (bàn tay, bàn chân, hông), 1 màu khớp, 1 màu đầu. B cùng tông khác độ sáng, đối nhau trên vòng màu, hoặc tương phản sáng tối với A; màu nhấn xa A và B trên vòng màu; màu khớp sáng hoặc tối hẳn hơn A, B. A và B rải lên tay chân theo 1 trong 4 kiểu (tay/chân, đoạn trên/dưới, xen kẽ, trái/phải). Có 55.536 bộ × 4 kiểu rải. Bộ màu không nằm trong seed (seed lưu màu từng bộ phận). Code: `drawScheme()`, `schemeColor()`, `paint()`, `recolor()` trong `model.ts`.
- **Giới hạn màu mỗi nhân vật (Colours per character, bảng Rules, mặc định 4, chỉnh 4–8):** theo ảnh mẫu của anh Trung Bao, mỗi nhân vật chỉ dùng một bộ nhỏ: 2 màu thân (A, B), màu nhấn C, rồi thêm màu của khớp, đầu, tóc cho đủ số. Mọi vai trò lấy màu trong bộ đó và bộ phận chạm nhau vẫn khác màu: vai và hông lấy màu ngoài A, B, C; khuỷu, gối không trùng màu tay/chân; đầu khác cổ; tóc khác đầu. Dấu mặt vẫn màu tối, không tính. Hoa văn đan, patchwork, gradient (Flow) và rèm cũng chỉ dùng màu của nhân vật (thêm sắc sáng hơn và nhạt hơn của từng màu cho vải đan). 4 là ít nhất vì khối dưới chạm khối trên và hông. 8 = bộ màu đầy đủ như trước, hoa văn lấy cả palette. Áp cho nhân vật mới (Generate, Colors). Code: `withinBudget()` (`model.ts`), `sourceOf()` (`weave.ts`), `ownColours()` (`rig.ts`).
- **Hai bộ phận chạm nhau không cùng có hoa văn** (đan hoặc patchwork); giữa hai bộ phận có hoa văn luôn có một khớp nhìn thấy được, như vai hay gối. Two-tone (hai lớp màu) không tính là hoa văn.
- **Pattern:** chỉ các khối thân có pattern đan: thân 1 khối luôn đan; thân 2 khối (chạm nhau) có đúng một khối đan, khối trên 55% số lần (cả seed cũ).
- **Flow (gradient chuyển động):** mỗi nhân vật có 4 bộ phận (đầu, bàn tay, bàn chân hoặc đoạn tay/chân) mang dải màu tuyến tính 2–3 màu của palette đang chọn, chạy dọc theo trục của bộ phận (dọc chân, dọc tay, từ cằm lên đỉnh đầu) và xoay theo bộ phận, trôi liên tục (một vòng màu mỗi 0,6 m, trôi một vòng mỗi 14 giây). Không bao giờ là cặp đối xứng, không chạm bộ phận có hoa văn khác (kể cả Flow khác). Ảnh tĩnh chụp ở thời điểm 0. Code: `drawFlow()` (`weave.ts`), `flowFits()` (`model.ts`), `tick()` (`rig.ts`).
- **Checker / Patchwork:** mỗi nhân vật có đúng hai đoạn mang hoa văn checker; mỗi đoạn tự chọn một trong 4 kiểu (hai đoạn có thể khác nhau): quilt patchwork (khối bàn cờ hai màu và sọc ngang/dọc, ô 3,5 cm, khối 2–3 ô, màu của palette đang chọn với nhiều màu nhạt), sọc ngang (ngang thân đoạn, sọc 3 cm), sọc dọc (dọc theo đoạn), hoặc bàn cờ hai màu (ô 5 cm). Sọc và bàn cờ dùng hai màu của chính nhân vật, chọn sao cho khác nhau rõ về độ sáng; slider Checker scale chỉnh cỡ cả bốn kiểu. Hai chỗ đó chọn ngẫu nhiên trong bắp tay, cẳng tay, ống chân và đùi, không bao giờ là một cặp đối xứng; đùi chạm thân (khớp hông bị che) nên chỉ mang patchwork khi thân có 2 khối và khối dưới không có hoa văn; mỗi chỗ một tấm khác nhau. Random lại đoạn đang có patchwork thì patchwork vẫn ở đó. Code: `drawPatchwork()` (`weave.ts`), `patchworkPairs()` (`model.ts`). Tay và chân dạng khối liền có thể chia **hai lớp màu** (two-tone). Mọi bộ phận khác một màu.
- **Không lặp chuỗi hạt:** mỗi tay hoặc chân có tối đa một đoạn dạng hạt (Chain/Stack).
- **Hạt Chain luôn tròn đều:** mỗi hạt là hình cầu thật, không bị kéo dãn hay ép dẹt theo độ dài đoạn hoặc slider Proportions. Độ dài đoạn quyết định số hạt (các tâm cách nhau ~1.35 bán kính); hạt ở chân vẫn to dần xuống dưới. Code: `beads()` trong `rig.ts`.
- **Khớp là bộ phận riêng, nhiều hình:** vai, khuỷu, gối mỗi loại một hình trong 5 hình (Sphere 40% số lần; Square, Diamond, Hexagon, Ring), luôn giống nhau hai bên. Không dùng tam giác. Đoạn tay/chân được cắt ngắn đúng chỗ tựa lên mặt quả cầu bán kính r; hình phẳng có bán kính trong đúng bằng r (`jointPiece()` trong `rig.ts`), nên luôn che kín đầu đoạn khi gập; lỗ của Ring (0,38 r) nhỏ hơn khe giữa hai đầu đoạn. Random một dòng khớp đổi hình của cặp đó, giữ màu.
- **Khớp nhiều cỡ, tay chân thon theo khớp:** vai, khuỷu, gối mỗi loại một cỡ S/M/L (×0,72 / ×1 / ×1,35), ba loại không bao giờ cùng cỡ. Đầu mỗi đoạn tay/chân bằng 0,91 lần khớp ở đầu đó, nên đoạn thon từ khớp này sang khớp kia: Cylinder, Octagon thành hình thon, Box thành lăng trụ vuông thon (nhìn như hình thang), Cone thu còn 62% ở đầu xa, Chain hạt to dần/nhỏ dần. Cẳng tay thon về cổ tay (0,058); ống chân vẫn loe về bàn chân. Code: `jointRadius()`, `armGeometry()` trong `rig.ts`.
- **Khớp xoay theo góc trung bình:** mỗi khớp (vai, khuỷu, hông, gối) xoay đúng nửa đường giữa đoạn trước và đoạn sau nó (gối vuông nằm giữa góc đùi và ống chân); đoạn sau xoay nốt nửa còn lại nên tay chân vẫn chỉ đúng hướng. Điểm gắn bắp tay (lệch tâm vai 2 cm) được xoay ngược lại nên không bị dời. Code: `halfway()` trong `createCharacter()` (`rig.ts`).
- **Ngón tay ragdoll, 5 hình tròn chạm nhau:** mỗi bàn tay có đúng 5 hình tròn (mỗi ngón một hình), cùng cỡ và cùng màu với ngón chân (màu phụ của bàn tay, khác màu tay), vẽ đè lên bàn tay. Lúc nghỉ chúng xếp thành vòng cung quanh mép ngoài bàn tay, cách mép một khoảng bằng bán kính ngón, ngón nào cũng chạm ngón bên cạnh. Vật lý verlet (trọng lực, quán tính, lực kéo về chỗ, sợi dây ngắn 3,2 bán kính buộc vào mép tay) cho chúng đung đưa quanh bàn tay, nhưng ngón cạnh nhau luôn chạm nhau, không ngón nào chồng lên nhau hay lại gần bàn tay hơn khoảng hở đó. Slider Fingers & toes chỉnh cỡ chung, Finger stiffness chỉnh lực kéo. Chưa xuất vào FBX/OBJ. Code: `src/fingers.ts`.
- **Tóc và mũ (vòng 3, theo ảnh tham chiếu của anh Nam):** 26 kiểu đối xứng, không phân biệt giới tính, cộng kiểu trọc (None), chia 5 nhóm. Totem (hình cơ bản xếp chồng chạm đỉnh đầu, không đè lên đầu): Slab, Quad (4 hình tròn), Bowtie (vuông chẻ nơ hai màu), Saucer (bát úp đỡ hình thoi), Gem. Mũ: Beanie (không còn quả bông), Bucket, Top hat, Cone (nón chóp sọc), Crown, Shades (kính râm gác trên đầu), Mushroom (mũ nấm chấm bi). Mũ bảo hiểm: Visor và Jet (kiểu tương lai, thay Moto và Hard hat), Helmet, Plume (chùm tròn lủng lẳng). Robot: chỉ còn Antenna và Star (ngôi sao trên ăng-ten), cả hai lủng lẳng; Blocks, Knight, Twin antennas, Gear, Siren, Asterisk đã bỏ (vẫn giữ số thứ tự để seed cũ mở ra kiểu thay thế: Slab, Visor, Antenna, Crown, Antenna, Star). Tóc: Sunburst, Flame, Fin, Flat top, Bowl, Ball top (quả cầu lủng lẳng), Halo, Mohawk (khối răng cưa), Punk (gai + băng đô); Leaves đã bỏ (trông như tai thỏ; seed cũ mở thành Flame). Phần trước của mũ là khối đặc riêng (không cắt theo hình đầu): mép dưới không bao giờ thấp hơn đỉnh dấu mặt + 8 mm, và mũ tự to lên vừa đủ để che kín phần đầu phía trên mép đó cộng 12 mm, trên mọi hình đầu và mọi cỡ Hair (trừ phụ kiện như Shades). Phần lủng lẳng (`src/hairPhysics.ts`): chuỗi hình tròn chạm nhau buộc vào đầu, hình cuối có thể là ngôi sao hoặc dấu sao xoay theo chuỗi; vật lý verlet (trọng lực, quán tính, lực kéo nhẹ về dáng đứng yên), không bao giờ giãn hay chồng nhau, vẽ sau đầu và mũ; chưa xuất vào FBX/OBJ. Màu tóc là vai trò R trong bộ màu (khác màu đầu), phần màu phụ lấy màu phụ. Kiểu nằm trong seed theo số thứ tự: kiểu bị bỏ nhường số cho kiểu mới, nên seed cũ có thể mở ra kiểu khác. Dòng Hair ở khối Head để random/khóa; slider Hair trong tab Proportions; dấu mặt luôn vẽ trên tóc và mũ. Xem `docs/hair-proposal.html`.
- **Lỗ donut:** lỗ của khối thân Donut và khớp Ring được lấp bằng đúng màu nền sân khấu (đổi theo palette và nền đen/sáng), nên trông như thủng nhưng che phần phía sau. Miếng lấp rộng hơn lỗ 1,5 mm và vẽ ngay dưới bộ phận để không lộ đường viền. Bàn tay Ring (vòng 3D) vẫn thủng thật. Không xuất vào FBX/OBJ.
- **Bộ phận pixel:** mỗi nhân vật có hai bộ phận (số chỉnh trong bảng Rules) vẽ trên lưới pixel, không bao giờ là khớp: đoạn tay/chân màu trơn trước, rồi bàn tay/bàn chân trơn, rồi đoạn two-tone (vẽ bằng màu chính). Trong tab Parts: **Pixel part** On/Off, **Pixel size** (1,5–8 cm, mặc định 3,5 cm), **FPS** (Smooth = vẽ lại theo mọi khung hình; 24/12/8/4 = chỉ vẽ lại ô pixel từng ấy lần mỗi giây nên bộ phận đó chuyển động giật cục như hoạt hình pixel). Hình bóng của nó được tô bằng ô vuông trên lưới cố định theo sân khấu (trục màn hình), nên tay chéo thành bậc thang và bậc đổi khi cử động (`src/pixelate.ts`, tính lại mỗi khi tư thế đổi). Giữ màu, vân giấy, Riso. Mesh gốc vẫn nằm trong rig (FBX/OBJ xuất hình gốc, chưa pixel).
- **Spray blur:** nút **Spray blur** On/Off và slider **Blur amount** (0,5–15 cm) trong tab Parts. Khi bật, các bộ phận spray (số trong bảng Rules, mặc định 2; đầu, khối thân, đoạn tay/chân, bàn tay hoặc bàn chân, chỉ khi màu trơn hoặc gradient: không bao giờ trên hoa văn đan, checker hay two-tone, không phải khớp hay bộ phận pixel) trông như phun sơn: vẽ thành 64 bản trong suốt của chính nó, xếp theo xoắn ốc góc vàng với độ lan kiểu Gauss, cộng lại thành màu đầy ở giữa và mờ dần mịn ra mép; một lớp hạt rõ (10–190% độ đậm mỗi bản, ô 5 mm) gắn cố định trên bộ phận (không nhấp nháy), nhìn như các chấm sơn, rõ nhất ở mép. Mọi bộ phận đều vẽ trong lượt trong suốt nên thứ tự lớp vẫn đúng. Code: `src/spray.ts`. FBX/OBJ xuất hình gốc.
- **Chọn bộ phận spray:** dưới Spray blur có **Parts: Random / Chosen**. Random giữ như cũ (số bộ phận theo bảng Rules, chọn ngẫu nhiên). Chosen: spray đúng các ô được tick: Head, **Hair**, Top piece, Bottom piece, Upper arms, Forearms, Hands, Thighs, Shins, Feet (tay/chân là cả hai bên). Hair gồm cả phần tóc sau đầu, các mảng accent và chuỗi ragdoll (ăng-ten, chùm lông, quả bông). Ở chế độ Chosen bộ phận được spray dù có hoa văn gì (kể cả khối thân đan); bộ phận pixel vẫn là pixel khi Pixel parts bật.
- **Rèm (Curtains):** rèm gồm nhiều sợi dây mềm (đường cong Catmull-Rom), mỗi sợi xâu lặp lại một hình ngẫu nhiên (tròn, vuông, tam giác, thoi, lục giác) xoay theo sợi. Mỗi sợi là một sợi dây verlet: đầu ghim vào bộ phận, phần còn lại rơi theo trọng lực, giữ đúng độ dài từng đoạn, không có lực kéo về dáng nên rủ thả lỏng, đung đưa và trễ theo chuyển động. Chỗ treo chọn bằng ô tích: Head (ghim dọc mép nửa dưới của đầu, vẽ sau cả thân như tóc dài), Top piece / Bottom piece (ghim dọc mép nửa trên của khối thân, vẽ trên khối như tua áo), Upper arms, Forearms, Thighs, Shins (ghim dọc đoạn, 15–85% chiều dài, vẽ ngay sau đoạn). Mặc định: đầu, khối trên, cẳng tay. Màu lấy từ bảng màu (theo palette đang chọn): One hoặc Random (mỗi sợi, mỗi hình một màu). Gấu rèm luôn bằng nhau: mọi sợi của một chỗ kết thúc trên cùng một đường lúc đứng yên (thấp hơn chỗ ghim thấp nhất 25 cm × Length), nên sợi ghim cao hơn (ví dụ trên đỉnh hình tròn, gần khuỷu tay) dài hơn. Strands per place 2–40, Length / Shape size 40–250%, Shape spacing 40–300%, **Stiffness** 0–100% (0 = dây thả lỏng; càng cao sợi càng giữ thẳng, ít cong và đung đưa ít hơn). Lưu theo trình duyệt và trong Save all as default. Code: `src/curtains.ts`. Chưa xuất vào FBX/OBJ.
- **Kiểu rèm ngẫu nhiên (Curtain looks):** ở tab Look, Curtains có **Look: Random / Custom**. Random (mặc định): mỗi nhân vật mặc một trong 7 kiểu theo tỉ lệ trong bảng Rules (**Curtain looks**), bấm Generate là rút lại: None 50%, Hair 5%, Body 5%, Shirt 10%, Earring 10%, Pants 10%, Long shirt 10%. Các kiểu lấy từ thông số anh Trung Bao gửi; Long shirt chưa có ảnh mẫu nên tạm là Shirt dài hơn. Dòng "This character: …" cho biết nhân vật đang mặc kiểu nào; bấm tên một kiểu để chuyển sang Custom với thông số đó. Custom: dùng các thông số bên dưới như trước. Thân Single không có khối dưới: rèm "Bottom piece" (Earring, Pants) treo từ nửa dưới của khối thân.
- **Ngón tay, ngón chân (Fingers & toes):** nhóm mới ở tab Look: **Fingers** On/Off (ẩn 5 ngón mỗi tay, ngón chân vẫn còn) và **Shape** Random / Circle / Diamond / Triangle. Ngón tay và ngón chân cùng một hình; Random cho mỗi nhân vật một hình riêng theo tên (Generate rút lại). Thoi và tam giác của ngón tay chĩa ra ngoài bàn tay; mọi hình nằm trong đúng vòng tròn cũ nên vật lý không đổi.
- **Parade view (`#parade`, link **Parade view** trên đầu trang studio):** màn hình dài 3:1 (giữ đúng tỉ lệ, viền đen hai bên nếu cửa sổ khác tỉ lệ) với 15 nhân vật đứng sát nhau như một đám đông đang nhảy (theo ảnh mẫu của anh Trung Bao, chồng lên nhau một chút), trôi từ trái sang phải thành vòng lặp. Không ai bay, không ai bị xoay nghiêng cả người; ai cũng đứng trên sàn. Chiều cao màn hình tự theo nhân vật cao nhất trong dàn: sàn cách mép dưới 8%, đỉnh đầu người cao nhất (khi đứng) ở 70% (chừa khoảng trống phía trên cho tay giơ và mũ). **Same height** (bật mặc định): mọi người được phóng to bằng chiều cao người cao nhất, giữ nguyên tỉ lệ cơ thể. Dáng lấy từ 13 ảnh mẫu của anh Trung Bao, tất cả quay sang phải (hướng trôi): 69 dáng (bảng gốc và bản đổi bên, trừ 18 dáng đã bỏ, cùng 11 dáng chuyển động) chia 4 nhóm: đứng, bước (chân phẳng, luôn trên sàn), nhảy và bay (lơ lửng 0,55–0,85 m, không xoay người). **Change poses** (bật mặc định): mỗi nhân vật giữ dáng khoảng **Hold** giây (mặc định 7) rồi nhảy lên và đáp xuống trong dáng mới, chọn sao cho không ai trùng dáng, khoảng nửa dàn trên sàn nửa trên không, xen kẽ ngẫu nhiên dọc hàng. Dáng nào cũng chuyển động nhẹ (thở, tay đung đưa; người bay nhấp nhô). Giao diện lấy đúng cài đặt Look của studio trong trình duyệt đó (nền sáng như ảnh mẫu: tắt nền đen trong studio) và tự cập nhật khi studio đổi. Thanh điều khiển tự ẩn sau 2,5 giây: Studio, New cast (phím N), Pause (Space), Speed, Size (cỡ nhân vật so với màn hình, 100% = vừa khung), Spacing (khoảng cách giữa hai người, tính theo chiều cao người cao nhất, mặc định 48%), Theme (Studio theme / HFCD / XMAS / TET: cả dàn được vẽ lại theo bộ màu đó, kể cả ô vuông), Background (Studio stage / hai màu của bộ màu đang dùng: HFCD là Black / Off-white (màu giấy `theme.paper`), XMAS là Blue / Ice, TET là Red / Gold, không còn đen và trắng ngà; viền quanh khung là màu nền tối hơn; hoặc `#parade?bg=black`, `bg=white` cho màu tối/sáng), Same height, Change poses, Hold, Poses, Full screen (F). Dàn nhân vật và các thông số được nhớ theo trình duyệt. Mã: `src/Parade.tsx`, dáng và chuyển động: `src/paradePoses.ts`. **Một khung duy nhất** (theo yêu cầu: khung Parade phải đúng y như trên trụ): khung của màn LED trụ tròn Ø4,20 × 4,01 m, trải phẳng 3,29 : 1, liền mạch (ai đi qua mép phải hiện ra ở mép trái). **View** (phím V): **Canvas** (khung phẳng; nền quanh khung tối hơn khi chọn Off-white) hoặc **Cylinder 3D** (khung cuốn quanh trụ lơ lửng trên nền trắng ngà, xoay/zoom bằng chuột). **Spacing**: khoảng cách giữa hai người (theo chiều cao người cao nhất); số người quanh trụ suy ra từ Spacing và Size (khoảng 15 ở 35% và 100%), hiện ngay trên thanh trượt. **Squares**: các ô vuông phía sau nhân vật, mỗi ô màu trơn, bàn cờ hai màu hoặc vải đan (ngẫu nhiên, màu palette), trôi ngang theo đường thẳng, không chồng nhau (xếp theo làn); **Square speed** (so với tốc độ nhân vật), **Square size** và **Size randomness** (độ chênh cỡ giữa các ô; 0 = mọi ô một cỡ). **Cast**: số nhân vật trong Parade (mặc định 50, 10–100); chỉ những người đang trên khung mới được dựng hình, mỗi người còn lại chỉ là một chuỗi seed. **Swap every** (mặc định 5 s, 0 = tắt): cứ mỗi lần, một người ở vị trí ngẫu nhiên lấy đà sâu rồi nhảy vọt ra khỏi mép trên, người kế tiếp trong Cast nhảy lên từ dưới mép dưới và đáp chân xuống sàn đúng chỗ đó; người kế tiếp được dựng và vẽ thử trước lúc máy rảnh nên không giật. Cú nhảy ra có lực: nửa đầu ngồi thụp sâu (lấy đà, người bè ra), rồi bật thẳng người như cây bút chì (chân khép, tay duỗi sát hai bên), vươn dài ra và vọt lên nhanh dần; người mới cũng vọt lên từ dưới như bút chì, mở dáng gần đỉnh rồi đáp nhún gối. **Jump push** (0 = tắt): cú nhảy ra (không phải người lên từ dưới) đẩy những người và ô vuông quanh mình ra một chút rồi trở về chỗ, như một trường lực; **Push reach** (xa bao nhiêu, tính theo chiều cao người), **Push out** và **Push back** (bao nhiêu giây để đẩy ra và để trở về, có easing), **Flip push** (cú lộn đẩy mạnh bao nhiêu so với cú nhảy ra; 0 = không đẩy). Không có giới hạn trên: tay, mũ, người bay có thể ra khỏi mép trên. Mười một dáng chuyển động (dáng Hurdle đã bỏ), khoảng một người trong năm (18,8%, chia đều): **Walk cycle**, **Run cycle** (tay đánh chéo qua thân như người đi, chạy; chạy chậm hơn trước, 0,86 s một sải), sáu điệu nhảy tại chỗ, chân luôn chạm sàn: **Dance** (nhún nhẹ theo nhịp, tay mở ra hai bên), **Disco** (tay chỉ lên rồi chỉ xuống, giữ một nhịp), **Robot** (bốn thế tay vuông góc, chuyển nhanh rồi đứng), **Twist** (gối khuỵu, chân lắc ngược nhau), **Arm wave** (sóng chạy dọc hai tay dang ngang), **Charleston** (đá chân trước sau, tay vung ngược); **Hop** (nhún nhảy tại chỗ, 0,95 s, êm), **Back flip** và **Front flip** (lấy đà chậm rãi: vung tay lên, ngồi thụp sâu, giữ một chút; bật lên, tay vút lên đầu, cuộn người xoay đủ một vòng quanh hông, lộn ngửa ngược chiều kim đồng hồ, lộn sấp xuôi chiều; mở người, đáp nhún gối, đứng dậy; 2,5 s). Vào/ra mọi dáng chuyển động cũng lấy đà và vượt quá như các dáng khác; hop và hai cú lộn chỉ đổi dáng ở lúc đứng yên trên sàn (chờ hết vòng đang dở, dáng mới được canh để bắt đầu đúng lúc đó), nên chuyển mượt. Một phần tư các dáng giữ yên (trên sàn hay trên không) giơ một tay (ngẫu nhiên bên nào) lên vẫy. **Sync every** (mặc định 20 s, 0 = tắt) và **Sync for** (mặc định 10 s, tối đa ít hơn Sync every 2 s): cứ mỗi Sync every giây (tính từ lúc bắt đầu lần trước), cả dàn cùng làm một việc, chọn ngẫu nhiên, không trùng lần trước: đi bộ, chạy bộ kiểu marathon, nhảy (cả dàn một điệu, mỗi lần một điệu khác), cổ vũ (hai tay giơ chữ V, mỗi người một nhịp riêng) hoặc đứng vẫy tay (cùng một tay); ai cũng lệch nhau một chút (tối đa 6% nhịp) nên vẫn thấy rõ là cùng một động tác mà vẫn sống động. Mỗi người chuyển vào lúc hơi khác nhau (trong 0,5 s), hết lượt thì lần lượt quay về dáng của mình; trong lúc đó và 1,5 s sau không có swap. Thêm kiểu **thể dục buổi sáng** (6 bài: Arm raise, Side stretch, Squat, Toe touch, Star jacks, Knee lift; cả dàn một bài, mỗi lượt một bài khác). Vào lượt đồng bộ bằng cách **lướt** (không nhún nhảy, chân giữ trên sàn, 1,6 s); đang đi bộ mà vào đi bộ chung thì chỉ chỉnh nhịp bước cho khớp. Ai đang bay hay đang nhảy trên không thì **rơi xuống theo trọng lực** (0,3 s, chậm rồi nhanh dần), chân chạm sàn, gối khuỵu nặng rồi đứng dậy chậm, thân trên vẫn tiếp tục động tác (áp cho mọi lần đổi dáng từ trên không xuống sàn, không chỉ khi đồng bộ). `#parade?sync=jog` (hoặc walk, dance, cheer, wave, exercise, tên một điệu như disco, hoặc tên một bài như squat): lượt đầu bắt đầu sau 1 s, để duyệt. **Đổi dáng có overlapping action:** thân và đùi đi trước, rồi cánh tay trên, rồi đầu và ống chân, cẳng tay sau cùng; bộ phận nào đổi nhiều thì đi muộn hơn và vượt quá nhiều hơn (2% đến 18% của độ đổi, không quá khoảng 17°), như lò xo, rồi dừng đúng dáng mới, không giật; gối không bao giờ duỗi quá thẳng, khuỷu không gập vào trong. Các dáng giữ yên: tay luôn mở ra phía ngoài bên mình, không vắt chéo qua thân. **Đổi dáng:** lấy đà (ngồi thụp, tay vung ra sau), bay theo đường parabol (nhanh lúc rời sàn và lúc đáp, đứng yên trên đỉnh), rồi vượt quá một chút và về lại; đáp xuống sàn thì chân giữ nguyên, phần còn lại nhún ở gối; đáp trên không thì thân và khối dưới dừng đúng chỗ, tay chân vượt quá. Trên không luôn có một chân cao hơn chân kia. **Save as default** / **Reset**: lưu cài đặt Parade làm mặc định của dự án (`src/parade.json`, khi chạy `npm run dev`; bản build tĩnh thì lưu cho trình duyệt) và quay về mặc định. **IDs** (bật mặc định): số ID của mỗi nhân vật (thứ tự được tạo trong Cast, 0001…) ở góc trên trái chỗ của nó, chữ Geist Pixel (`public/fonts`, giấy phép SIL OFL), màu xanh trên HFCD, màu của bộ màu trên XMAS/TET; người mới mang số lớn hơn nên dần dần không còn theo thứ tự; khi một người nhảy ra, số của nó mờ đi và trượt lên, số người mới mờ dần hiện ra và trượt lên vào chỗ. Sàn cách mép dưới đúng bằng khoảng từ mép trên đến đầu chữ (4% chiều cao); ô vuông luôn ở dưới chữ, không đè lên. `#parade?frames=manual`: không tự chạy khung hình (để kiểm tra chính xác từ bên ngoài). **`#parade?type=brick`** (hoặc id dáng cơ thể khác): cả dàn một dáng cơ thể, để duyệt preset. **`#parade?ui=off`**: chỉ màn hình, không thanh điều khiển và không con trỏ (cho màn hình ở sự kiện; phím Space/F/N vẫn dùng được). **`#parade?pose=back-flip`** (tên dáng, dấu cách thành gạch nối): cả dàn đầu tiên một dáng, để duyệt dáng đó. **`#poses`** (nút **Poses** trên thanh điều khiển): bảng toàn bộ 69 dáng, mỗi dáng một nhân vật, có tên và ảnh mẫu gốc, xếp theo Standing / Stepping / Jumping / Floating.
- **Khớp hông:** luôn nằm ngay ngoài mép dưới của khối thân mang nó (khối dưới, hoặc khối trên của Single), chạm mép chứ không đè: đặt thẳng dưới vị trí hông, cao nhất có thể mà đĩa khớp vẫn không chạm vào hình (`hipBelow`, body.ts), nên tự theo mọi hình thân và mọi slider. Vẽ sau khối thân nhưng trên đầu đùi. Chân bắt đầu từ khớp nên nhân vật cao thêm đúng đoạn khớp hạ xuống (chiều cao thực ghi trong rig và Rig JSON). Khớp hông lấy hình của khớp vai (và màu khớp vai) ở cỡ khớp gối; dòng Hip joints trong danh sách hiện tên hình đó. Hông không bao giờ là hình tròn (anh Trung Bao, 14/10/2026): hông lấy hình của vai, trừ khi vai là Sphere hoặc Ring; khi đó hông là Square, Diamond hoặc Hexagon theo tên nhân vật (`hipShapeOf`, model.ts).
- **Khớp vai:** cũng nằm ngoài khối thân trên, chạm cạnh chứ không đè: ở độ cao vai, gần thân nhất mà đĩa khớp vẫn không chạm hình (`shoulderBeside`, body.ts), trên mọi hình thân và slider.
- **Dáng cơ thể (art direction):** mỗi nhân vật có một dáng trong 11 dáng anh Nam chọn ở `docs/proportion-plan.html`: Geofolk today (dáng hiện tại, 40%), Orb & Strings, Bobble Baby, Lollipop, Brick, Wedge Hero, Brute, Pear, Hourglass, Beanpole, Strider (6% mỗi dáng; chỉnh trong thẻ Body types của bảng Rules). Dáng nhân các slider Proportions: cỡ đầu, chiều cao và bề rộng thân (vai loe hay thu so với đáy), độ dài tay, chân và cổ, độ dày tay chân, cỡ bàn tay/bàn chân/ngón; và khi Generate thì chọn Build và hình thân hợp dáng (ví dụ Brick: một khối vuông; Pear: tròn nhỏ trên tròn to; Wedge Hero: phễu trên khối nhỏ). Hình tròn không bao giờ bị kéo méo: thân cao/thấp hơn thì dựng lại hình. Dáng lưu trong seed (phiên bản 7, ký tự cuối); random lại một bộ phận vẫn giữ dáng; seed cũ nhận dáng theo tên. Tên dáng hiện dưới tên nhân vật trên sân khấu. Code: `src/bodyTypes.ts`. Chưa dùng các câu hỏi trong trang proportion-plan.
- **Bảng Rules (cuối trang):** mọi luật về hoa văn, gradient, pixel và spray, chỉnh được: Weave (số khối thân đan: 0/1/2), Two-tone (xác suất mỗi đoạn tay/chân hai màu; áp cho nhân vật mới), Checker (số chỗ 0–6, không bao giờ là cặp đối xứng, các kiểu được phép), Gradient/Flow (số bộ phận 0–8, không đối xứng, không bao giờ trên đầu), Touching parts (hai bộ phận chạm nhau không cùng có hoa văn), Pixel parts (0–4, mặc định 2), Spray parts (0–4, mặc định 2), Body types (tỉ lệ từng dáng cơ thể); kèm danh sách luật cố định. Đổi luật thì nhân vật trên sân khấu được sắp lại ngay (ít chỗ hơn nếu không đủ chỗ hợp luật); Reset rules trả về mặc định đã lưu; Save all as default lưu cả luật (`rules` trong `src/settings.json`). Code: `src/rules.ts`, `src/RulesPanel.tsx`.
- **Mặt (Look → Face):** ba bộ mặt, chọn một bộ cho mọi nhân vật: **Minimal** (dấu mặt hình học đậm theo bộ phận Face mark: 25 hình, một hình hoặc một cặp đối xứng như hai mắt), **Expressive** (vẫn tối giản, cùng ngôn ngữ hình học: mắt chấm, kim cương, vuông, sao bốn cánh, mí nửa tròn; miệng là cung dày cắt vuông đầu, gạch, sóng, răng cưa, nửa đĩa; dấu ?!, mắt chéo x, nháy mắt, dấu phẩy; 28 mặt) và **Many eyes** (không có miệng, 3–9 mắt xếp hàng, vòng, cụm, vương miện; 18 mặt). Mỗi nhân vật có mặt riêng của mình trong từng bộ (theo tên). **Palette colour**: bật thì mặt lấy một màu trong palette của chính nhân vật (màu nổi nhất trên màu đầu) thay vì màu đậm. Mặt nằm trong mọi hình đầu; xuất FBX/OBJ theo mặt đang hiện. Mã: `src/faces.ts`.
- **Ngón chân:** mỗi bàn chân có 5 hình tròn phẳng xếp dọc theo đế, vẽ đè lên bàn chân, luôn chạm nhau không chồng (tâm cách nhau đúng một đường kính, xếp giữa bàn chân; tăng cỡ thì hàng rộng ra); cùng cỡ, cùng màu với ngón tay. Nhân vật đứng trên điểm thấp nhất của ngón chân. Chưa xuất vào FBX/OBJ.
- **Chân:** đùi mảnh như tay, càng xuống càng to, bàn chân loe.
- **Bàn chân hút sàn:** bàn chân ở trên hoặc gần sàn (sàn = đế bàn chân thấp hơn) thì nằm phẳng; cách sàn hơn 20 cm thì xoay tự do theo ống chân, nên khi nhảy nhân vật đá chân, nhón chân thoải mái; từ 5 đến 20 cm chuyển mượt. Áp cho mọi tư thế, Dance và Live pose. Code: `settleFeet()` trong `rig.ts`.
- **Tỉ lệ:** ở mặc định (Proportions 100%) nhân vật đứng thẳng cao đúng 2.4 đơn vị; chiều dài xương không đổi theo hình dạng. Khối lớn rộng ~0.62 (tầm cỡ thân Orb cũ, anh Nam chọn là tỉ lệ đẹp).
- **Thân là 1 hoặc 2 khối phẳng** (thay cho thân + hông cố định, 14/10/2026). 8 hình: Circle, Block, Bowl, Dome, Funnel, A-line, Donut, Diamond. 4 kiểu ghép (**Build**): **Single** (một khối lớn), **Pair** (hai khối bằng nhau, cùng hình, hoặc Dome trên Bowl), **Big top** (khối lớn trên khối nhỏ), **Big bottom** (khối nhỏ trên khối lớn). Khối nhỏ không bao giờ là Donut. **Khối dưới không bao giờ là Dome, A-line (trông như váy) hay Funnel (chữ V)**; Pair có Dome trên thì dưới là Bowl (thành hình tròn chia đôi); Funnel và A-line không dùng cho Pair. Seed cũ có các hình này ở dưới mở ra Bowl (thay Dome) hoặc Block (thay A-line, Funnel). Thân 1 khối chỉ là Circle, Block, Donut hoặc Diamond (không nửa hình tròn, không A-line/Funnel vì nửa dưới của chúng là váy hoặc chữ V). Code: `src/body.ts`, luật trong `topShapes()` / `bottomShapes()` / `pairPartners()` (`model.ts`).
- **Hình tròn và nửa hình tròn không bao giờ bị kéo méo:** Circle, Donut rộng bằng cao; Bowl, Dome rộng gấp đôi cao (kể cả đầu Dome). Chúng có chiều cao tối đa theo vai trò (khối lớn, khối nhỏ, Pair), khối còn lại tự dài ra để chạm; slider độ rộng không áp lên chúng.
- **Hai khối xếp chồng, không đè lên nhau:** khối trên ngồi lên khối dưới, chỉ chồng 1,4 cm dọc giữa để không hở kẽ (áp cho mọi cặp, kể cả hai khối vuông). Điểm xoay eo nằm ngay chỗ chạm nên khối trên xoay quanh đó vẫn luôn chạm; một quả cầu eo (màu cổ, bán kính 0,055) nằm sau cả hai khối, gần như khuất khi đứng yên và lấp khe khi gập người như một khớp bản lề. Thân Single không gập ở eo: góc gập chuyển thành góc xoay cả thân, đùi xoay ngược lại để chân giữ hướng.
- **Vai bám mép khối trên, hông nằm trong khối dưới:** tâm quả cầu vai đặt ngoài mép khối trên 3/4 bán kính ở độ cao vai; khớp hông cách nhau tối đa ±0.105 và luôn nằm trọn trong khối mang nó (khối dưới, hoặc khối duy nhất). Khối có đáy hẹp tự kéo dài xuống cho vừa hông. Cổ, vai và hông giữ nguyên độ cao, nên chiều cao 2.4 không đổi.
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
  fingers.ts       ngón tay ragdoll: 5 hình tròn buộc vào mép bàn tay (verlet, va chạm)
  settings.ts      cài đặt giao diện mặc định (palette, thứ tự lớp, giấy, nền) đọc từ settings.json
  hair.ts          kiểu tóc và mũ (thiết kế trong khung 200 px) và cách đặt lên từng hình đầu
  hairPhysics.ts   tóc lủng lẳng: chuỗi hình tròn verlet (ăng-ten, chùm lông, ngôi sao, dấu sao)
  history.ts       undo / redo (lịch sử thay đổi, gộp các bước kéo slider)
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
- `pattern`: 0 = một màu; 1–4 = pattern đan (chỉ khối thân); 5 = two-tone (chỉ tay/chân); 6 = patchwork (đúng hai đoạn tay/chân, không đối xứng); 7 = flow (4 bộ phận).
- Thân: `spine_lower.variant` là Build (0 Single, 1 Pair, 2 Big top, 3 Big bottom), `spine_upper.variant` là hình khối trên, `root.variant` là hình khối dưới.
- `density`: 2–12, là slider Pattern scale (số ô đan hiển thị = `density × 2`). Nhân vật mới mặc định 3 (6 ô).

`normalizeSpec()` trong `model.ts` áp mọi quy tắc ở mục 4 lên bất kỳ spec nào, kể cả seed cũ.

**Không nằm trong seed** (lưu theo trình duyệt bằng `localStorage`): thứ tự lớp, bảng màu weave, tỉ lệ bộ phận đang chỉnh (Proportions), nền đen/giấy. Mặc định của Proportions nằm trong `src/proportions.json`.

### Seed

Dạng `label~7DPPPP…T`: sau dấu `~` là số phiên bản (`7` = dáng cơ thể, thêm ký tự T cuối cùng; `6` = tóc, thêm một ô cuối; `5` = cỡ khớp; `4` = hình khớp; `3` = khối thân và Build, khớp tròn; `2` = danh mục có đầu, thân, dấu mặt phẳng; `1` = danh mục 3D cũ), một ký tự `density`, rồi 4 ký tự cho mỗi bone (variant, color, accent, pattern), tất cả ở hệ cơ số 36, theo đúng thứ tự mảng `bones`. Seed cũ 22 hoặc 24 bone vẫn đọc được; khớp còn thiếu được suy ra từ `label`. Gõ một chuỗi không có `~` thì app coi đó là `label` và sinh nhân vật từ nó.

Seed phiên bản `1` và `2` vẫn mở được, thành Build **Big top** (thân lớn trên hông nhỏ, giống trước). Thân phiên bản 1 (11 kiểu) đổi sang thân phiên bản 2 theo `legacyTorso`: Bowl→Bowl, Goblet/Martini/Cup/Vase→Funnel, Mushroom→Fan, Hourglass/Stack→Column, Diamond/Orb→Orb, Donut→Donut. Rồi thân và hông cũ đổi sang khối (`torsoV3`, `pelvisV3`): Column→Block, Fan→Dome, Orb→Circle; hông Orb→Circle, Tire→Donut (là khối nhỏ nên thành Circle), Puck→Block; còn lại giữ tên. Đầu và dấu mặt giữ nguyên số thứ tự (Sphere→Circle, Cone→Triangle, Octagon→Hexagon, Capsule→Down triangle, Cube→Square, Hemisphere→Dome; Cross→Bar).

### Danh mục hình

| Loại | Hình |
|---|---|
| Head (phẳng) | Circle, Triangle, Hexagon, Down triangle, Square, Dome |
| Build (kiểu ghép thân) | Single, Pair, Big top, Big bottom |
| Top piece / Bottom piece (phẳng) | Circle, Block, Bowl, Dome, Funnel, A-line, Donut, Diamond |
| Neck | Sphere, Bead, Cylinder, Capsule |
| Hip (ẩn trong thân) | Sphere, Bead, Cylinder, Capsule; mọi kiểu đều vẽ thành quả cầu nhỏ vì luôn bị thân che |
| Shoulder / Elbow / Knee | Sphere, Square, Diamond, Hexagon, Ring × cỡ S, M, L (variant = hình + 5 × cỡ; seed phiên bản 1–3 mở ra Sphere M, phiên bản 4 mở ra cỡ M) |
| Upper arm / Forearm | Cylinder, Cone, Capsule, Box, Chain, Octagon |
| Thigh / Shin | Taper, Bell, Stack, Chain, Octagon, Pill |
| Hand | Sphere, Cube, Ring, Cone, Octagon, Capsule |
| Foot | Flare, Dome, Wedge, Puck, Bell, Octagon |
| Hair (phẳng) | None + 26 kiểu: totem, mũ, mũ bảo hiểm, robot, tóc (xem `docs/hair-proposal.html`) |
| Face mark (phẳng, luôn là hình đặc) | Một hình: Dot, Dash, Triangle, Diamond, Bar, Square, Dome, Bowl, Hexagon, Plus, Star, Pill, Arc, Chevron; một cặp đối xứng như hai mắt: Twin dots, Twin dashes, Twin squares, Twin diamonds, Twin triangles, Twin domes, Twin bowls, Twin bars, Twin slants, Twin stars, Twin pills (Diamond thay Ring cũ; nét thẳng dày 3,6 cm, của cặp 2,4–2,6 cm; sáu hình đầu giữ chỗ cũ nên seed cũ vẫn giữ mặt) |

## 7. Bộ xương (26 bone)

Trục Y hướng lên, nhân vật quay mặt về +Z, bên trái của nhân vật là +X. Đơn vị là mét. Vị trí dưới đây tính theo bone cha; `±` là + cho bên L, − cho bên R.

```text
root (khối dưới)              (0, 1.39, 0)
├─ spine_lower (điểm xoay eo) (0, p, 0)        p = độ cao chỗ nối: giữa phần chồng của hai khối; theo Build và cỡ thật của khối tròn (Single 0.07)
│  └─ spine_upper (khối trên) (0, 0, 0)
│     ├─ neck                 (0, 0.63 − p, 0)  dài 0.07
│     │  └─ head              (0, 0.07, 0)      dài 0.31
│     │     └─ face_mark      (0, 0.145, 0.163)
│     └─ shoulder_L/R         (±x, 0.535 − p, 0) x = mép khối trên + 3/4 bán kính khớp vai
│        └─ upperarm_L/R      (±0.02, 0, 0)     dài 0.30
│           └─ elbow_L/R      (0, −0.30, 0)
│              └─ forearm_L/R (0, 0, 0)         dài 0.28
│                 └─ hand_L/R (0, −0.28, 0)
└─ hip_L/R                    (±x, −0.03, 0)    x ≤ 0.105, sao cho khớp hông nằm trọn trong thân
   └─ thigh_L/R               (0, 0, 0)         dài 0.60
      └─ knee_L/R             (0, −0.60, 0)
         └─ shin_L/R          (0, 0, 0)         dài 0.60
            └─ foot_L/R       (0, −0.60, 0)     cao 0.16
```

Mỗi bộ phận là một `THREE.SkinnedMesh` tên `<bone>_mesh`, gắn cứng vào đúng một bone (mọi đỉnh trọng số 1). `spine_lower` chỉ là một quả cầu nhỏ ẩn giữa hai khối; với thân Single, `root` cũng chỉ là một quả cầu nhỏ ẩn giữa hai hông. Sau mỗi lần đổi tư thế, cả nhân vật được dịch theo Y để điểm thấp nhất chạm sàn (`ground()` trong `rig.ts`).

### Thứ tự lớp

6 khối lớp, người dùng kéo để đổi. Mặc định từ trên (trước) xuống dưới (sau):

`Arms › Head › Body › Neck › Lower body › Legs`

Thứ tự lớp đã lưu từ bản cũ vẫn dùng được; khối Lower spine cũ bị bỏ (quả cầu eo nằm ngay dưới khối dưới).

Quy tắc bên trong (không kéo được, để tay chân không bao giờ trông như bị gãy):

- **Mỗi tay/chân là một khối liền**, không xen kẽ với tay/chân bên kia. Thứ tự từ sau ra trước: bắp tay › vai › cẳng tay › khuỷu › bàn tay; đùi › ống chân › gối › bàn chân. Nhờ vậy quả cầu khớp luôn che hai đầu đoạn nó nối, và bàn tay gập lên vai vẫn nằm trước vai.
- **Tay/chân nào ở trước:** mặc định là bên trái nhân vật. Khi Live pose, app dùng độ sâu `z` của MediaPipe: tay (khuỷu + cổ tay) hoặc chân (gối + cổ chân) gần camera hơn thì vẽ trước. Có vùng chết (0.12 cho tay, 0.1 cho chân) và chỉ đổi khi tín hiệu giữ đủ 5 khung hình, nên không nhấp nháy.
- **Tay ra sau lưng** (cổ tay xa camera hơn vai quá 0.2; trở lại khi dưới 0.05) thì được vẽ ngay dưới thân. Chỉ áp dụng khi khối Arms đang nằm trên Body.
- Dấu trên mặt luôn nằm ngay trên đầu; khớp hông luôn nằm ngay dưới hông.

Thứ tự được tính trong `drawOrder()` (`rig.ts`) rồi đổi thành `renderOrder` của mesh; vật liệu tắt kiểm tra độ sâu nên thứ tự vẽ quyết định cái gì che cái gì. Thứ tự 14 nhóm cũ lưu trong trình duyệt được tự đổi sang 7 khối.

## 8. Pattern đan

`weave.ts` giữ nguyên thuật toán của file HTML gốc: chọn kiểu bố cục (balanced, vertical, horizontal, blocks, offset), số cột/hàng, bề rộng sợi, màu sợi, màu ô giao nhau, vài dải phủ mờ và lớp hạt. Khác biệt duy nhất: nguồn ngẫu nhiên được khởi tạo từ `label | bone | color | accent | pattern` của nhân vật, nên cùng seed luôn ra cùng tấm vải.

Tấm vải được vẽ ra canvas 1024×1024 rồi dùng làm texture lặp. Các khối thân dùng **UV chiếu phẳng theo mét** (`planarUV()` trong `rig.ts`) nên pattern không bị méo theo hình khối. Kích thước một tấm ngoài đời = `16 / (density × 2) × 0.64` mét.

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

`npm test` chạy 59 test: bộ màu riêng từng nhân vật, seed khứ hồi, seed cũ và seed phiên bản 1, màu kề nhau không trùng, đối xứng trái/phải qua random và khóa, pattern đúng chỗ, không lặp chuỗi hạt, bo mép trên và dưới, khớp hông nằm trọn trong khối thân, hai khối thân luôn dính nhau ở eo (mọi Build, mọi slider), hình tròn/nửa tròn không méo, không có váy ở dưới, Build/Pair qua random và khóa, seed phiên bản 1–2 sang 3, chiều cao 2.4, bộ xương và trọng số, giải góc từ landmark, làm mượt theo hướng màn hình, thứ tự lớp trong tay/chân và theo độ sâu, slider tỉ lệ và vai bám mép khối trên, tư thế chỉ xoay trong mặt phẳng, khớp xoay nửa đường giữa hai đoạn, tay chân thon theo cỡ khớp, ngón tay ragdoll không lọt vào bàn tay, ngón chân, gradient Flow trên 4 bộ phận, bàn chân hút sàn, patchwork ở hai chỗ ngẫu nhiên không đối xứng, không hai bộ phận chạm nhau cùng có hoa văn, xuất FBX/OBJ, palette XMAS/TET đổi màu cả nhân vật mà bộ phận kề nhau vẫn khác màu.

Test chạy trong Node, không có canvas, nên không phủ phần vẽ texture và giao diện. Sau khi sửa hình hay giao diện, cần mở app xem bằng mắt.

## 12. Muốn sửa thì sửa ở đâu

| Việc | File |
|---|---|
| Thêm/sửa một hình | Hình phẳng: thêm đường viền vào `headOutlines` trong `rig.ts` hoặc dấu mặt vào `minimalFaces` trong `faces.ts` (kèm tên trong `variants.face`, model.ts, cùng thứ tự), hình khối thân vào `shapeOutline()` trong `body.ts` (dựng bằng `paper()` trong `geometry.ts`, tự bo góc nhọn). Khối 3D: `geometry.ts` và hàm tương ứng trong `rig.ts` (`legGeometry`, `armGeometry`, `footGeometry`, `geometryFor`). Thêm tên vào `variants` trong `model.ts` |
| Đổi luật random, đối xứng, pattern | `generate()` và `normalizeSpec()` trong `model.ts`; luật phối màu ở `drawScheme()` / `schemeColor()` |
| Đổi tỉ lệ cơ thể | mảng `bones` trong `model.ts` (đổi vị trí sẽ ảnh hưởng test chiều cao); cỡ khối thân theo Build: `topShare`, `widths`, `caps` trong `body.ts` |
| Đổi luật ghép thân | `bodyBuilds`, `pairPartners`, `buildWeights` trong `model.ts`; `drawBuild()`, `fitBody()` |
| Đổi tư thế có sẵn | `poseRotation()` trong `model.ts`; nhịp thở trong `breathe()` (`motion.ts`) |
| Đổi điệu Dance | Trích landmark từ video bằng `scripts/extract_landmarks.py`, rồi `npx vite-node scripts/bake-dance.ts <landmarks.json>` ghi lại `src/dance.json` (đi qua đúng bộ giải, làm mượt và xếp lớp của Live pose; bước quay quá 0.9 rad/khung bị chặn vì là MediaPipe đọc nhầm) |
| Đổi chất giấy | `paperGrain()` và `addPaper()` trong `rig.ts`: tấm vân 1024 px liền mép cho mỗi mét, 4 tầng nhiễu mịn, hạt từng điểm ảnh và 1000 sợi giấy. Hoa văn đan vẽ ở 2048 px (`weaveCanvas()`, giữ 12 tấm gần nhất) |
| Đổi cách bắt chuyển động | `solvePose()` trong `pose.ts` |
| Đổi màu / bảng màu weave | `palette.json`; `weavePalettes` trong `weave.ts`; màu thân và nền của XMAS/TET trong `paletteLooks` (`themes.ts`) |
| Đổi thứ tự lớp mặc định | `defaultLayerOrder` trong `rig.ts` |
| Giao diện | `App.tsx`, `PartsPanel.tsx`, `PosePanel.tsx`, `styles.css` |

Thêm hình mới vào **cuối** danh sách `variants` để seed cũ không đổi nghĩa. Thêm bone mới sẽ đổi độ dài seed: phải thêm thứ tự cũ vào `legacyOrders` trong `model.ts`. Bỏ hoặc thay cả danh mục của một bộ phận thì tăng số phiên bản seed và thêm bảng quy đổi (như `legacyTorso`, `torsoV3`, `pelvisV3`).

Đỉnh đầu phải chạm đúng 2.4 (có test); hình đầu tự được nâng lên sau khi bo góc. Mỗi bộ phận phải nhỏ hơn 1 m, riêng khối thân dưới 1.3 m (có test). Vai luôn đặt theo mép khối trên nên khối nào cũng mang được tay.

## 13. Lỗi hay gặp

- **Canvas trắng khi tab trình duyệt đang ẩn:** trình duyệt tạm dừng vẽ ở tab ẩn. Đưa tab lên trước là hiện.
- **Live pose báo "Not connected":** server không bật được. Đọc dòng lỗi dưới trạng thái (thường là thiếu `uv` hoặc chưa cấp quyền Camera). Nếu đang mở bản build tĩnh thì phải tự chạy `npm run pose` hoặc `npm run pose:video`.
- **Hình trong ô Camera không phải video của Geofolk:** một dự án khác (ví dụ `lotte-visual-haidoan`) đang chạy server riêng ở cùng cổng 8080. Tắt server đó đi.
- **Server báo không mở được camera:** chưa cấp quyền Camera cho terminal, hoặc camera đang bị app khác dùng.
- **`uv: command not found`:** chưa cài `uv`.
- **Mở `dist/index.html` trực tiếp thấy trắng:** bản build phải chạy qua HTTP (`npm run preview`).
