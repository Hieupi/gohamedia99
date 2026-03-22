# 💎 GOHA STUDIO — BẢN ĐẶC TẢ SIÊU CHI TIẾT DÀNH CHO AI (MASTER WORKFLOW V4.0)

> TÀI LIỆU DÀNH CHO CLAUDE AI:
> Sử dụng tài liệu này để hiểu toàn bộ luồng chức năng của tab "Thiết Kế Mới" và tạo ra các **System Instructions Prompt** và **Cấu trúc Image Prompt** chính xác tuyệt đối.

---

## 📋 TỔNG QUAN QUY TRÌNH (THE PIPELINE)

**Bước 1:** Giao diện Nhập liệu (Người dùng cung cấp Ảnh và Tùy chỉnh).
**Bước 2:** Phân tích Ngầm (AI tách đặc điểm khuôn mặt và sản phẩm).
**Bước 3:** Khớp nối Hệ thống (Tạo Master Image Prompt và Bắn API sinh 4 ảnh).
**Bước 4:** Giao diện Hậu kỳ (Chỉnh sửa chi tiết Inpainting bằng Chat/Nút bấm).

---

## BƯỚC 1: GIAO DIỆN NHẬP LIỆU & TÙY CHỌN (USER INPUTS)

### 1.1 Khung 1: Ảnh mẫu tham khảo (Identity Reference)

* **Chức năng:** Tải lên từ máy hoặc chọn (+) từ Kho Thư Viện (Max 5 ảnh).
* **Nhiệm vụ:** Cung cấp DNA gốc (Khuôn mặt, màu da bản địa, kiểu tóc, tỉ lệ cơ thể).
* **Biến số hệ thống:** `[REFERENCE_IMAGES]`

### 1.2 Khung 2: Sản phẩm của bạn (Garment Reference)

* **Chức năng:** Tải lên từ máy hoặc chọn (+) từ Kho Thư Viện (Max 8 ảnh).
* **Nhiệm vụ:** Cung cấp thiết kế gốc (Đường cắt, chất liệu, họa tiết, màu sắc quần áo/phụ kiện).
* **Biến số hệ thống:** `[PRODUCT_IMAGES]`

### 1.3 Cài đặt nâng cao (Toàn bộ 10 Tùy chọn)

Tất cả mặc định tại thời điểm bắt đầu là **`🤖 Auto (AI tự chọn tối ưu)`**.

#### A. Cấu hình Kỹ thuật

* **Chất lượng ảnh:** Quyết định mức độ chi tiết và thời gian render. `(1K SD, 2K HD, 4K Ultra)`
* **Tỷ lệ khung hình:** Khớp với nền tảng đăng tải. `(1:1 Vuông, 9:16 Dọc Story, 16:9 Ngang Youtube, 3:4 Chân dung Lookbook, 4:3 Landscape)`

#### B. Cấu hình Nhân vật (Model)

* **Kiểu Model (Chủng tộc/Thần thái):** `[Á Đông thanh lịch, Hàn Quốc ulzzang, Châu Âu cổ điển, Latina phóng khoáng, Châu Phi hiện đại, Trung Đông sang trọng]`
  * *Nhiệm vụ:* Nắn lại tỉ lệ xương mặt hoặc da nếu user không có ảnh mẫu, hoặc để blend ảnh mẫu vào một concept lai.

#### C. Cấu hình Bối cảnh & Không gian (Scene)

* **Phông nền (Background):** `[Studio trắng chuyên nghiệp, Studio xám phẳng, Ngoài trời thành phố, Bãi biển nhiệt đới, Quán cafe vintage, Showroom cao cấp, Phố cổ châu Âu, Vườn hoa lãng mạn, Nội thất sang trọng, Phông nền gradient, Sân thượng rooftop]`
  * *Nhiệm vụ:* Cung cấp bối cảnh (Môi trường) và Ánh sáng môi trường (Ambient Light).

#### D. Cấu hình Hành động (Pose)

* **Tư thế (Body Language):** `[Đứng thẳng tự tin, Tay chống hông, Đi bộ catwalk, Ngồi ghế thanh lịch, Tựa tường cool, Xoay nhẹ 3/4, Tay vuốt tóc, Nhảy tung tăng, Ngồi bệt casual, Đứng nghiêng nhẹ]`
  * *Nhiệm vụ:* Định hướng đường cong cơ thể, sự tương tác với trang phục để tôn dáng đồ.

#### E. Cấu hình Thẩm mỹ (Aesthetics)

* **Phong cách (Vibe/Style):** `[Thời trang cao cấp, Street style, Tối giản Minimalist, Vintage retro, Sporty năng động, Bohemian tự do, Công sở thanh lịch, Đồ ngủ/homewear, Dạ hội/tiệc tối, Y2K trendy]`
  * *Nhiệm vụ:* Bao trùm mood board (bảng cảm xúc) của toàn bộ bức ảnh.
* **Filter Tone Da (Skin Tone):** `[Da trắng sáng, Da trắng hồng, Da nâu khỏe, Da rám nắng, Da sứ Hàn Quốc, Da olive Địa Trung Hải]`
  * *Nhiệm vụ:* Ghi đè hoặc cường điệu hóa màu da nguyên bản, xử lý hậu kỳ (Retouching) độ mịn của da.
* **Filter Tone Màu (Color Grading/Lut):** `[Warm vintage, Cool tone xanh, Pastel nhẹ nhàng, Moody tối, Golden hour, Film analog, High contrast, Soft dreamy, Cinematic]`
  * *Nhiệm vụ:* Chỉnh sửa tone màu ánh sáng (Color grading) sau khi render xong hình.

#### F. Cấu hình Bắt buộc (Override)

* **Mô tả thêm (Textarea):** User tự do nhập text.
  * *Nhiệm vụ:* Ghi đè TUYỆT ĐỐI mọi cấu hình bên trên. Dùng để tả chi tiết hoặc ra lệnh cụ thể (VD: "Người mẫu cầm hoa hồng, gió thổi tóc bay về bên trái").
  * *Biến số hệ thống:* `[USER_CUSTOM_PROMPT]`

---

## BƯỚC 2: AI PHÂN TÍCH CHẠY NGẦM (PRE-PROCESSING SYSTEM PROMPTS)

Để render một bức ảnh thời trang hoàn hảo, AI không thể chỉ ném "cục ảnh" vào Image Generator. Cần 2 **System Prompt phân tích (Vision)** chạy ngầm trước.

### 🔴 System Prompt 1: Chuyên gia Định danh Khuôn mặt (Identity Analyzer)

* **Dữ liệu Input:** Nhận `[REFERENCE_IMAGES]`
* **Yêu cầu điều khiển (Prompt Requirement):**
  * "Bạn là một Bác sĩ Phẫu thuật Thẩm mỹ & Chuyên gia Nhân tướng học."
  * Nhiệm vụ: Phân tích 1-5 bức ảnh gốc để trích xuất CẤU TRÚC XƯƠNG (mặt vuông/tròn/V-line), ĐẶC ĐIỂM MẮT (1 mí/2 mí/khoảng cách mắt), MŨI, MÔI, KIỂU TÓC, ĐỘ DÀI TÓC, MÀU TÓC, MÀU DA.
  * Bắt buộc liệt kê các khuyết điểm hoặc nốt ruồi đặc trưng (nếu có để làm tăng độ chân thực).
* **Output cần sinh ra:** Biến `[EXTRACTED_IDENTITY]` (Đoạn text siêu chi tiết bằng tiếng Anh miêu tả nhân dạng sinh học).

### 🔴 System Prompt 2: Chuyên gia Phân tích Thời trang (Garment Analyzer)

* **Dữ liệu Input:** Nhận `[PRODUCT_IMAGES]`
* **Yêu cầu điều khiển (Prompt Requirement):**
  * "Bạn là một Nhà thiết kế Thời trang & Thợ may Haute Couture."
  * Nhiệm vụ: Phân tích 1-8 bức ảnh vứt dưới đất/móc áo.
  * Nhận diện CHẤT LIỆU (Độ bóng, độ xốp, độ rủ của lụa/cotton/len/denim).
  * Nhận diện FORM DÁNG (Ôm, suông, oversize, A-line).
  * Nhận diện MÀU SẮC CHÍNH XÁC (hex or descriptive: baby blue, navy, magenta) và CHI TIẾT ĐIỂM NHẤN (khóa kéo, nếp gấp xếp ly, ren, cổ khoét V).
  * Đề xuất CÁCH MẶC (Sơ vin, thả rông, khoác hờ).
* **Output cần sinh ra:** Biến `[EXTRACTED_PRODUCT]` (Đoạn text kỹ thuật may mặc bằng tiếng Anh).

---

## BƯỚC 3: CẤU TRÚC IMAGE PROMPT TẠO ẢNH CUỐI CÙNG (MASTER GENERATION)

Ghép dữ liệu từ Bước 1 và Bước 2 để cấu thành "Câu Thần Chú" vĩ đại gửi cho Gemini Render Image.

### 🔴 Lệnh Điều Khiển Chính (Master Director System Prompt)

* **Vai trò:** Giám đốc Nhiếp ảnh Thương mại Thời trang (Commercial Fashion Photography Director).
* **Quy tắc Sinh Tử (Death Rules):**
  * [1] TUYỆT ĐỐI BẢO LƯU `[EXTRACTED_IDENTITY]`: Cấm thay đổi cấu trúc khuôn mặt người mẫu thành mặt chung chung của AI.
  * [2] BẢO TOÀN TRANG PHỤC `[EXTRACTED_PRODUCT]`: Cấm biến tấu thêm họa tiết, cấm thay đổi cấu trúc form dáng, cấm thay đổi kiểu cắt may của sản phẩm đầu vào.
  * [3] DNA VIỆT NAM (Nếu user bỏ mặc định toàn bộ setting ở Bước 1):
    * Tự động chèn: *"Vietnamese young woman, sweet Gen Z styling, natural flawless porcelain-pink skin, trendy hair, soft studio key light bringing a fresh and youthful aesthetic."*

### ⚙️ CẤU TRÚC CHUỖI TEXT PROMPT (Image Generation Payload)

Khi code gọi API, nó sẽ gửi chuỗi này làm lõi:

```text
[SYSTEM DIRECTIVES]
Role: High-end Fashion Commercial Photographer.
Objective: Generate a photorealistic lookbook image.
STRICT COMMAND: The face and hair MUST 100% match the identity described below. The clothing MUST 100% match the structural design and material described below. NO hallucinating new clothes or facial structures.

[IDENTITY LOCK]
Model Identity: {EXTRACTED_IDENTITY}

[GARMENT LOCK]
Product Details: {EXTRACTED_PRODUCT}

[SCENE & ART DIRECTION]
- Model Casting: {modelType}
- Setting/Background: {background}
- Model Pose: {pose}
- Overall Fashion Style: {style}

[POST-PROCESSING (RETOUCH & COLOR GRADING)]
- Skin Aesthetic: {skinFilter} (Flawless, smooth texture).
- Color Grading: {toneFilter}
- Resolution/Setup: {quality} shot on 85mm portrait lens, 
- Aspect Ratio formatting: {aspect}

[USER OVERRIDES]
CRITICAL ADDITIONAL INSTRUCTIONS (Prioritize above all stylistic settings):
{prompt}

[OUTPUT VARIATION]
Compose the shot as: {Sẽ lặp 4 lần: 1. Default angle / 2. Slight side angle / 3. Waist-up close up / 4. Editorial magazine cover}
```

*(Hệ thống sẽ chạy song song 4 luồng với phần `[OUTPUT VARIATION]` từ 1 đến 4, để sinh ra 4 khung ảnh cùng lúc trên giao diện).*

---

## BƯỚC 4: CHỈNH SỬA HẬU KỲ THÔNG MINH (POST-EDITING)

Giao diện (Kết quả 4 hình đã render) -> Dưới mỗi ảnh có một **Ô Chat** và một hàng **Nút Chỉnh sửa nhanh (Quick-edits)**. Gồm: Nâng ngực, Kéo chân, Bóp eo, Trắng da, Tóc bồng, v.v.

### 🔴 System Prompt 4: Chuyên gia Retouch Ảnh Xóa Lỗi (Precision Retoucher)

* **Trạng thái kích hoạt (Trigger):** User click "Kéo chân dài thêm" hoặc gõ chat "Cho eo bé lại".
* **Dữ liệu Input:** Ảnh đã tạo ra + Lệnh text.
* **Yêu cầu điều khiển (Prompt Requirement):**
  * "Bạn là Chuyên gia Photoshop & Liquid-Retouch hạng S."
  * Sử dụng cơ chế Local Image Inpainting (Chỉnh sửa cực bộ).
  * TUYỆT ĐỐI KHÔNG làm sai lệch hay vẽ lại (redraw) KHUÔN MẶT và ÁO QUẦN ở khu vực không bị yêu cầu chỉnh sửa. Không làm xô lệch hoặc cong vẹo kiến trúc phông nền (như cột nhà, vách tường).
* **Cơ chế Lệnh Nút Bấm ngầm (Khi user click vào Button, mã thực tế gửi đi là tiếng Anh chuẩn mực hình học):**
  * *Nút "Nâng ngực tự nhiên":* `Enhance bust cup size naturally, keep garment fabric folds intact, strictly proportional to body frame.`
  * *Nút "Kéo chân dài thêm":* `Elongate the legs below the knee by 1.2x ratio, creating a taller model presence, ensure the background perspective remains undistorted.`
  * *Nút "Eo thon gọn":* `Slim down the waistline to create a subtle hourglass figure, adjust the garment fit perfectly to the new waist contour.`
  * *Nút "Mắt to sáng":* `Slightly enlarge pupils and enhance iris reflection (catchlights), make eyes appear brighter and more awake, DO NOT alter the core identity.`
  * *Nút "Da trắng hồng mịn":* `Apply frequency separation skin retouching. Brighten skin lightness and blend with a soft peach/pink undertone, remove all blemishes while keeping natural skin texture.`

---
*Tài liệu Đặc tả Kỹ thuật v4.0 - Bạn có thể copy CHÍNH XÁC cấu trúc này thả vào Claude AI để nó thiết kế 4 khối System Prompts hoàn chỉnh mã máy cho Goha.*
