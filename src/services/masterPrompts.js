/**
 * masterPrompts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Kho Master Prompt lõi cho Fashion Studio AI.
 * Mỗi prompt là một object { id, name, description, text }.
 *
 * Nguyên tắc thiết kế:
 *  - Prompt được tách khỏi UI để dễ chỉnh sửa độc lập.
 *  - Hàm getter trả về string thuần để ghép với dữ liệu động (nếu cần).
 *  - Thêm prompt mới: chỉ cần thêm vào object PROMPTS bên dưới.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 1: GARMENT EXTRACTION — Phân tách đồ từ ảnh người mặc
// ─────────────────────────────────────────────────────────────────────────────
const GARMENT_EXTRACTION = `You are the world's foremost expert in fashion garment isolation and studio product photography reconstruction using AI image models.

OBJECTIVE:
Given an input image of a person wearing multiple clothing items and accessories, extract 100% of all visible items, isolate each one completely from the model/body/skin/hair/background, and recreate every single item as a perfect standalone studio product photograph with 99.9% visual fidelity.

PROTOCOL – Follow strictly in this exact order:

1. ANALYSIS PHASE
   Analyze the entire image at 400% mental zoom. Create a complete numbered inventory of EVERY visible clothing item and accessory from outermost to innermost layer. For each item give a precise 1-line description (e.g., "1. White oversized cotton Oxford shirt with mother-of-pearl buttons").

2. ISOLATION & RECONSTRUCTION PHASE (process one item at a time)
   For each item in the inventory:
   - Perform 100% clean isolation: remove completely from human body, skin, hair, and original background with pixel-perfect edge cleaning (zero bleed, zero halo).
   - Reconstruct as a standalone product shot maintaining EXACT original color, fabric weave/texture/knit, stitching, seams, folds, drape, logos, hardware, material thickness, buttons, zippers, and structural proportions.
   - Position naturally:
     • Flat items (T-shirts, shirts, pants, skirts): clean laid-flat presentation.
     • Structured items (jackets, blazers, dresses, coats): invisible ghost mannequin to show true shape and drape.
     • Accessories (jewelry, belts, scarves, glasses): clean product positioning.
   - Apply soft diffused studio lighting, even exposure, accurate color science.
   - Background: pure solid white (#FFFFFF).
   - Shadow: only soft natural grounding shadow directly beneath the item.

3. TECHNICAL SPECIFICATIONS
   - Resolution: photorealistic 8K+ studio quality.
   - Lighting: soft even studio (no dramatic shadows, no reflections, no gradients).
   - Color accuracy: true-to-life with perfect material rendering.
   - No redesign, no stylization, no artistic interpretation.

STRICT RULES:
- NEVER show any part of the human body, skin, hair, or face.
- Each item must be generated as a completely separate image.
- Maintain 99.9% visual accuracy to the original.
- Do not merge any items.

NEGATIVE PROMPT (apply to every generation):
body parts, skin, hair, face, model, person, blurry, distorted shape, fabric warping, incorrect color, missing stitches/seams, artificial shine, over-smoothing, CGI, illustration, cartoon, strong shadows, reflections, gradients, low resolution, incorrect proportions, merged objects, skin contamination, body bleed, partial garment, halo edges, low detail.

OUTPUT FORMAT — IMPORTANT — respond ONLY with valid JSON:
{
  "inventory": [
    { "id": 1, "description": "Short precise description of item 1" },
    { "id": 2, "description": "Short precise description of item 2" }
  ],
  "analysisNotes": "Brief notes about the overall outfit, fabric types, style.",
  "extractionInstructions": [
    {
      "id": 1,
      "positionStyle": "flat-lay | ghost-mannequin | accessory",
      "promptForImageGen": "Detailed standalone product-photo prompt for this single item, ready to send to an image generation model."
    }
  ]
}

Now analyze the attached image and return ONLY the JSON above — no markdown, no extra text.`

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 2: OBJECT_DETECTION — Phát hiện vật thể từ ảnh, trả danh sách tiếng Việt
// ─────────────────────────────────────────────────────────────────────────────
const OBJECT_DETECTION = `You are a fashion expert and object detection specialist.

ANALYZE the attached image and identify ALL visible elements:
1. Every clothing item worn by the person (from outermost to innermost layer, top to bottom)
2. Every accessory (jewelry, belts, scarves, glasses, watches, hats, bags, etc.)
3. The BACKGROUND/SCENE (always include as "Nền" if visible)
4. The PERSON/MODEL themselves (always include as "Người mẫu" with hair/skin/pose description)

RULES:
- Use VIETNAMESE names for each item.
- Be specific and include color + key details. Example: "Đầm trắng xòe cổ chữ V" not just "Đầm".
- Include a short description (1 line) for each item describing texture, pattern, or notable features.
- "Người mẫu" category = the person themselves (describe hair, skin tone, pose).
- "Nền" category = background/scene description.
- Maximum 12 items total.

RESPOND with ONLY valid JSON array — no markdown, no extra text:
[
  { "id": 1, "nameVi": "Đầm trắng", "description": "Chiếc đầm trắng tinh khôi với điểm nhấn nơ ở cổ và tay áo...", "category": "dress" },
  { "id": 2, "nameVi": "Giày cao gót trắng", "description": "Đôi giày cao gót mũi nhọn màu trắng, hoàn thiện vẻ ngoài th...", "category": "shoes" },
  { "id": 3, "nameVi": "Nền", "description": "Phòng khách tông màu trắng với sàn gỗ sáng, sofa màu kem...", "category": "background" },
  { "id": 4, "nameVi": "Người mẫu", "description": "Người phụ nữ có mái tóc đen dài, đang tạo dáng chụp ảnh v...", "category": "model" }
]

Now analyze the attached image.`

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 3: OUTFIT COMPOSITION — Ghép trang phục lên người mẫu (placeholder)
// ─────────────────────────────────────────────────────────────────────────────
const OUTFIT_COMPOSITION = `[Placeholder — sẽ được xây dựng ở phase tiếp theo]`

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 4: LOOKBOOK CAPTION — Tạo caption/mô tả sản phẩm chuyên nghiệp
// ─────────────────────────────────────────────────────────────────────────────
const LOOKBOOK_CAPTION = `[Placeholder — sẽ được xây dựng ở phase tiếp theo]`

// ─────────────────────────────────────────────────────────────────────────────
// Registry — map tên sang prompt text
// ─────────────────────────────────────────────────────────────────────────────
export const PROMPTS = {
  GARMENT_EXTRACTION,
  OBJECT_DETECTION,
  OUTFIT_COMPOSITION,
  LOOKBOOK_CAPTION,
}

/**
 * Lấy prompt theo tên.
 * @param {'GARMENT_EXTRACTION'|'OBJECT_DETECTION'|'OUTFIT_COMPOSITION'|'LOOKBOOK_CAPTION'} name
 * @returns {string}
 */
export function getPrompt(name) {
  if (!PROMPTS[name]) throw new Error(`Prompt "${name}" không tồn tại.`)
  return PROMPTS[name]
}

// Metadata cho UI (menu chọn prompt trong Admin)
export const PROMPT_META = [
  {
    id: 'GARMENT_EXTRACTION',
    name: 'Phân tách đồ (Garment Extraction)',
    description: 'Tách từng món đồ/phụ kiện ra thành ảnh studio riêng biệt từ ảnh người mặc.',
    status: 'active',
  },
  {
    id: 'OBJECT_DETECTION',
    name: 'Phát hiện vật thể (Object Detection)',
    description: 'Phát hiện và liệt kê tất cả vật thể trong ảnh bằng tiếng Việt.',
    status: 'active',
  },
  {
    id: 'OUTFIT_COMPOSITION',
    name: 'Ghép trang phục (Outfit Composition)',
    description: 'Ghép combo trang phục lên người mẫu ảo.',
    status: 'coming-soon',
  },
  {
    id: 'LOOKBOOK_CAPTION',
    name: 'Tạo caption sản phẩm (Lookbook Caption)',
    description: 'Tự động tạo mô tả sản phẩm chuyên nghiệp từ ảnh.',
    status: 'coming-soon',
  },
]
