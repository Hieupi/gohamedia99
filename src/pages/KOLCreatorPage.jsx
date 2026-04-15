import { useRef, useState } from 'react'
import { Upload, Sparkles, X, ChevronRight, Download, User2, Eye, BookImage, Send, RotateCcw, Check } from 'lucide-react'
import { callGemini, generateGarmentImage } from '../services/geminiService'
import { saveToLibrary, createLibraryRecord, getFolders, createFolder } from '../services/libraryService'

// ─── System Instruction Prompts ("Bộ não" riêng cho từng nhiệm vụ) ────────────

/**
 * Bộ não 1 — Chuyên gia phân tích khuôn mặt Micro Detail
 * Input: ảnh KOL | Output: mô tả text siêu chi tiết khuôn mặt + tóc
 */
const BRAIN_FACE_ANALYST = `Bạn là chuyên gia phân tích khuôn mặt hàng đầu thế giới, với kiến thức sâu về:
- Giải phẫu khuôn mặt học (facial anatomy) ở cấp độ vi phẫu
- Thẩm mỹ Hàn Quốc, thẩm mỹ Châu Á và tiêu chuẩn vẻ đẹp người Việt
- Kỹ thuật nhận dạng đặc điểm khuôn mặt (landmark detection)
- Ngôn ngữ mô tả dành cho AI image generation

NHIỆM VỤ: Phân tích siêu chi tiết khuôn mặt và tóc (KHÔNG phân tích trang phục, phụ kiện, hậu cảnh).

PHÂN TÍCH:
1. TỔNG THỂ KHUÔN MẶT: hình dạng (oval/tròn/vuông/trái tim/thoi), tỷ lệ vàng, đường nét tổng thể
2. DA MẶT: tone màu, kết cấu, độ sáng, lỗ chân lông, đặc điểm đặc trưng
3. TRÁN: chiều rộng, chiều cao, đường chân tóc
4. MẮT: hình dạng (đuôi xếch/mắt phượng/hạnh nhân), màu mống mắt, mí mắt, lông mi, lông mày, khoảng cách, bọng mắt aegyosal
5. MŨI: sống mũi (cao/thấp/thẳng/cong), cánh mũi, đầu mũi
6. MÔI: độ dày trên/dưới, đường viền, cupid's bow, màu tự nhiên
7. CẰM & HÀM: jawline, cằm, má (đầy/gầy)
8. TÓC: màu sắc, kết cấu, kiểu tóc chi tiết

KẾT LUẬN:
- Điểm nổi bật cần GIỮ NGUYÊN
- Điểm có thể NÂNG CẤP để đẹp hơn
- Đề xuất phong cách KOL phù hợp nhất

Output bằng tiếng Việt, chi tiết, chuyên nghiệp.`

/** Khối kỹ thuật chung — chuẩn Idol 2026 */
const QUALITY_BLOCK = `
POSE & EXPRESSION: Direct gaze into lens, magnetic confident eyes with emotional depth, soft parted lips showing perfectly even white teeth. Bust-up portrait, head slightly tilted, chin lowered 5° for perfect face angle.
BACKGROUND: Pure white #FFFFFF studio seamless.
SKIN: luminous porcelain white skin, soft rosy-pink undertone — NOT yellow, NOT warm, NOT pale. Glass skin with natural dewy glow, subsurface scattering visible, translucent depth.
QUALITY: hyperrealistic 8K portrait, ultra-photorealistic human skin texture, micro skin pores visible, dermis glow, glass skin finish — indistinguishable from real photograph.
LIGHTING: Hollywood tri-point beauty lighting — strong key light at 45°, soft fill, hair rim light creating luminous halo, 4 perfect catch-lights sparkling in both eyes.
CAMERA: Sony A7IV + Sigma 85mm f/1.4 Art, ISO 100, extremely shallow depth of field, buttery smooth bokeh.
COLOR: cool porcelain skin tones, TikTok & Instagram viral color grading, HDR vibrance, film-grade color science.
MAKEUP 2026 TREND: Glass skin luminous finish, soft shimmer gradient eyeshadow, mega-volume lash extensions, perfectly defined brows, ultra-glossy plump lips — Korea-Vietnam beauty fusion at its finest.
HAIR: Ultra-silky hair catching studio light, individual strands visible and luminous, fresh from top luxury salon — every strand perfect.
IDOL STANDARD: This face must make viewers STOP SCROLLING. Radiates "main character energy". Top 0.01% beauty. The kind of portrait that gets 1M+ likes and spawns fan edits. Viewers should feel they're looking at a real celebrity or top idol — jaw-dropping, unforgettable.`

/**
 * Bộ não 2A — PHIÊN BẢN TRUNG THÀNH: nâng cấp đẹp hơn, giữ sát khuôn mặt gốc
 * Dùng cho biến thể 1 & 2
 */
const BRAIN_KOL_FAITHFUL = (analysis, style) => `
${analysis}

---
NHIỆM VỤ: Tạo KOL AI MỚI theo phong cách "${style}" — GIỮ SÁT khuôn mặt gốc, chỉ nâng cấp vẻ đẹp.

QUY TẮC PHIÊN BẢN TRUNG THÀNH:
✅ GIỮ NGUYÊN: hình dạng tổng thể khuôn mặt, tỷ lệ mắt-mũi-miệng, cấu trúc xương mặt, kiểu tóc (style & length)
✅ NÂNG CẤP: da trắng sáng hồng hơn, mắt sáng và có chiều sâu hơn, môi mọng hơn, tóc bóng hơn, lighting đẹp hơn
✅ Kết quả: nhìn vào nhận ra "đây là người này nhưng đẹp và hoàn hảo hơn" — như đã qua tay makeup artist và stylist hạng A
❌ KHÔNG thay đổi: hình dạng khuôn mặt, kiểu tóc, màu tóc (chỉ làm bóng hơn)
❌ KHÔNG biến thành người khác, KHÔNG biến thành người Hàn hay Tây

CHUẨN THẨM MỸ — KOL Việt Nam đẹp chuẩn 2026:
- Khuôn mặt Á Đông thanh tú: gò má vừa phải, hàm oval, mắt 2 mí tự nhiên sáng long lanh
- Da: trắng hồng sáng (porcelain rosy white) — KHÔNG vàng, KHÔNG tái
- Nét đẹp hài hòa, nhìn vào thu hút ngay, không cần makeup dày mà vẫn rạng rỡ
${QUALITY_BLOCK}
Render ảnh ngay.`

/**
 * Bộ não 2B — PHIÊN BẢN SÁNG TẠO: KOL AI mới hoàn toàn, đẹp hơn nhưng khác biệt
 * Dùng cho biến thể 3 & 4
 */
const BRAIN_KOL_CREATIVE = (analysis, style) => `
${analysis}

---
NHIỆM VỤ: Tạo KOL AI MỚI theo phong cách "${style}" — SÁNG TẠO tự do, khác biệt với bản gốc.

QUY TẮC PHIÊN BẢN SÁNG TẠO:
✅ Dùng phân tích trên làm NGUỒN CẢM HỨNG, không phải bản sao
✅ Tạo ra 1 KOL AI hoàn toàn mới — khuôn mặt, phong cách, kiểu tóc có thể khác hoàn toàn
✅ KẾT QUẢ PHẢI ĐẸP HƠN bản gốc — đây là tiêu chí số 1 không thể thỏa hiệp
✅ Phong cách: ${style}
❌ KHÔNG copy khuôn mặt gốc — đây là KOL AI độc lập, tránh vi phạm bản quyền

CHUẨN THẨM MỸ — KOL Việt Nam đẹp chuẩn 2026:
- Khuôn mặt Á Đông thanh tú, hài hòa, hút hồn
- Da: trắng hồng sáng (porcelain rosy white) — KHÔNG vàng, KHÔNG tái
- Tổng thể: xinh hơn, đẹp hơn, cá tính hơn bản gốc — đây là KOL AI nâng cấp
${QUALITY_BLOCK}
Render ảnh ngay.`

/**
 * 6 biến thể IDOL: 2 TRUNG THÀNH (nâng cấp khuôn mặt gốc) + 4 IDOL AI (hoàn toàn mới, đỉnh cao)
 * Mỗi biến thể là 1 hình mẫu KOL tinh hoa — thu hút, được ngưỡng mộ như Idol thật
 */
const KOL_VARIANTS = [
  {
    name: '🔵 Trung thành · Tỏa sáng tự nhiên',
    type: 'faithful',
    style: 'Natural glow — ánh mắt ấm áp chân thành, nụ cười trong sáng rạng rỡ. Giữ CHÍNH XÁC khuôn mặt gốc, chỉ nâng cấp: da trắng hồng sáng như sứ, mắt to sáng hơn, môi mọng ẩm, tóc bóng mượt tươi salon. Make-up tự nhiên nhẹ nhàng nhưng hoàn hảo. Kết quả: người xem nhận ra đây là "chính cô ấy nhưng đẹp nhất cuộc đời".',
  },
  {
    name: '🔵 Trung thành · Sang chảnh đỉnh cao',
    type: 'faithful',
    style: 'Luxury editorial — sang trọng quý phái đỉnh cao. Giữ CHÍNH XÁC khuôn mặt gốc, nâng cấp toàn diện: smoky eye sắc nét, môi đỏ berry hoặc nude caramel bóng, da sứ trắng bóng ánh đèn, tóc hoàn hảo từng sợi. Ánh mắt sâu thẳm tự tin như supermodel trên tạp chí Vogue.',
  },
  {
    name: '✨ Idol · Thanh lịch Quý tộc',
    type: 'creative',
    style: 'Aristocratic elegance — KOL AI mới hoàn toàn. Khuôn mặt oval thanh tú, gò má cao, ánh mắt sâu thẳm bí ẩn như European royalty pha Á Đông. Tóc thẳng đen bóng dài hoặc búi cao kiêu sa. Make-up sophisticated: mắt smoky tinh tế, môi nude rose. Cảm giác: nhìn vào tự nhiên nghiêng mình kính nể.',
  },
  {
    name: '✨ Idol · Ngọt ngào K-Beauty',
    type: 'creative',
    style: 'Korean idol fresh — KOL AI mới hoàn toàn. Khuôn mặt tròn dịu thon V-line, mắt aegyosal cute, da thuần khiết như em bé. Tóc layer mái thưa Hàn hoặc xoăn sóng nhẹ nâu caramel honey highlight. Make-up Korea 2026: blush draping hồng đào, glossy lip, monolid liner, lashes dài. Cảm giác: ngọt ngào đến mức muốn bảo vệ — main character K-drama.',
  },
  {
    name: '✨ Idol · Cá tính Thời thượng',
    type: 'creative',
    style: 'Fashion-forward trendsetter — KOL AI mới hoàn toàn. Khuôn mặt sắc nét góc cạnh, jawline định nghĩa đẹp, ánh mắt sắc bén như fashion model. Tóc: wolf cut layer tóc phồng hoặc tóc buộc Y2K high pony với baby hair. Màu tóc: đen tuyền hoặc nâu mocha lạnh. Make-up bold: graphic liner, brow lamination, lips matte terracotta. Cảm giác: thấy cô ấy là thấy trend.',
  },
  {
    name: '✨ Idol · Quyến rũ Bí ẩn',
    type: 'creative',
    style: 'Mysterious allure — KOL AI mới hoàn toàn. Khuôn mặt hoàn hảo nhưng có gì đó bí ẩn thu hút không thể giải thích — mắt đuôi xếch deep-set với ánh nhìn nửa xa xăm nửa mời gọi. Tóc dài đen bóng óng ả hoặc sóng nhẹ nửa buông. Make-up: inner corner highlight rực rỡ, subtle smoky eye, môi berry đậm ẩm. Cảm giác: nhìn vào không thể rời mắt, muốn biết cô ấy đang nghĩ gì.',
  },
]

/**
 * Bộ não 3 — Chuyên gia tạo Multiview Reference Sheet
 * Input: ảnh 1 = chân dung KOL (FACE+HAIR ONLY), ảnh 2 = pose tham chiếu (BODY POSE ONLY, optional)
 */
const BRAIN_MULTIVIEW = (hasPoseRef) => `
You are a professional Character Reference Sheet artist. You are receiving:
- IMAGE 1 (KOL PORTRAIT): Extract ONLY the face structure + hairstyle (color, texture, length, style). IGNORE clothing.
${hasPoseRef ? '- IMAGE 2 (POSE REFERENCE): Extract body pose/stance/proportions AND note the clothing worn (for male subjects only).' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━
STEP 1 — GENDER DETECTION (do this first, before anything else):
━━━━━━━━━━━━━━━━━━━━━━━━
Analyze IMAGE 1 carefully and determine: Is the subject MALE or FEMALE?
Base your decision on facial structure, bone density, jawline, brow ridge, hair length, overall features.
This gender detection governs ALL decisions in FRAME 4 below.

━━━━━━━━━━━━━━━━━━━━━━━━
TASK: Generate ONE image — a 9:16 multiview reference sheet with exactly 4 frames.
━━━━━━━━━━━━━━━━━━━━━━━━

⚠ CRITICAL CONSISTENCY RULES — ZERO TOLERANCE:
HAIR LOCK: The exact same hairstyle (style, color, texture, length) from IMAGE 1 MUST appear IDENTICALLY in ALL 4 frames including FULL BODY. Never change the hairstyle.
FACE LOCK: Same face, same skin tone, same facial features in all 4 frames.
NO VARIATION: Do not improvise or simplify any feature between frames.

LAYOUT (4 frames, 2×2 grid):
┌─────────────┬─────────────┐
│   FRONT     │    3/4      │  ← Row 1: bust shots (shoulders up)
├─────────────┼─────────────┤
│   SIDE      │  FULL BODY  │  ← Row 2: side profile + full body
└─────────────┴─────────────┘

FRAME 1 — FRONT (bust, shoulders up):
  Facing camera directly, warm confident gaze, slight smile showing teeth, white background

FRAME 2 — 3/4 (bust, shoulders up):
  Turned ¾ to the right, elegant profile, same hairstyle as Frame 1, white background

FRAME 3 — SIDE PROFILE (bust, shoulders up):
  90° side view, same hairstyle as Frame 1, white background

FRAME 4 — FULL BODY (most important frame):
  FACE + HAIR: 100% identical to Frames 1-2-3. Same hairstyle, same face. Non-negotiable.
  ${hasPoseRef ? 'POSE: Follow the body pose from IMAGE 2 with 100% accuracy — arms, legs, weight distribution, tilt — everything matches exactly.' : 'POSE: Natural standing — confident, relaxed, proportional to the subject\'s gender.'}

  ── GENDER-ADAPTIVE RULES FOR FRAME 4 ──

  IF SUBJECT IS FEMALE:
    BODY PROPORTIONS: Slim waist hourglass silhouette, full chest, long toned legs, rounded butt — elegant and proportionate.
    OUTFIT: Plain white seamless form-fitting bodysuit — smooth, no patterns, no details. Neutral reference for outfit fitting.
    SHOES: Red pointed stiletto heels, 10cm.
    POSE style: Slight S-curve, one heel raised, one hand lightly on hip — feminine and graceful.

  IF SUBJECT IS MALE:
    BODY PROPORTIONS: Athletic male build — broad shoulders, defined chest, flat stomach, strong legs. Tall and proportionate.
    ${hasPoseRef
      ? 'OUTFIT: Recreate the EXACT outfit worn in IMAGE 2 (the pose reference) — copy the clothing style, colors, and fit accurately. This is the primary outfit instruction for male subjects.'
      : 'OUTFIT: Smart-casual male attire — plain white fitted crew-neck t-shirt + dark slim chino trousers. Clean, professional, natural fit.'}
    SHOES: ${hasPoseRef ? 'Same shoes as shown in IMAGE 2 (pose reference). If unclear, use clean white sneakers.' : 'Clean white sneakers or dark leather dress shoes — matching the outfit.'}
    POSE style: Upright confident stance — feet shoulder-width apart, arms relaxed at sides or one hand in pocket. Natural male posture.

  BACKGROUND: Pure white #FFFFFF

QUALITY: Ultra photorealistic 8K, consistent soft studio lighting across all 4 frames.
DIVIDER: Thin light-gray lines separating frames. Small label text at top-left of each frame: FRONT / 3/4 / SIDE / FULL BODY.

Render now.`

/**
 * Bộ não Train Lora 1 — Phân tích NHIỀU ảnh cùng 1 người → mô tả sinh trắc học
 */
const BRAIN_LORA_ANALYZE = `You are a professional biometric face analysis AI with expert-level knowledge of:
- Facial anatomy at micro-detail level (landmark detection, bone structure)
- Skin tone analysis (Fitzpatrick scale, undertone, luminosity)
- Hair texture and color science

TASK: You are receiving MULTIPLE PHOTOS of the SAME PERSON. Synthesize all images to build the most complete and accurate biometric profile possible.

ANALYZE (merge information from ALL photos):

1. FACE SHAPE: exact shape (oval/round/square/heart/diamond), golden ratio proportions, face width vs height
2. SKIN: exact tone (use descriptive words like porcelain/ivory/light beige/warm sand), undertone (cool/warm/neutral), any distinctive marks (moles, birthmarks, scars — location and size)
3. EYES: exact shape (almond/round/monolid/hooded), eye color (exact shade), inner/outer corner angle (upturned/downturned/straight), lid fold type, pupil-to-pupil distance relative to face width, any unique eye features
4. EYEBROWS: arch shape, thickness, color, starting/ending points, gaps or fullness
5. NOSE: bridge height (flat/medium/high), nose width, tip shape (bulbous/pointed/round), nostril flare, profile curvature
6. LIPS: exact upper-to-lower ratio, cupid's bow shape (defined/soft), lip color, corner angle, natural lip width
7. JAW & CHIN: jawline softness/sharpness, chin projection, cheekbone prominence
8. HAIR: exact color description (include highlight/lowlight variations), texture (straight/wavy/curly), thickness, length, cut style, how it frames the face
9. UNIQUE IDENTIFIERS: any features that make this person instantly recognizable — list them all

OUTPUT: Detailed description in English, precise and technical — optimized for AI image generation. This profile will be used to recreate this person with 100% accuracy.`

/**
 * Bộ não Train Lora 2 — Tái tạo chính xác người thật từ profile sinh trắc học
 */
const BRAIN_LORA_CLONE = (analysis, aspect) => `
MISSION: EXACT IDENTITY REPRODUCTION — recreate this specific real person as a professional portrait photo.

BIOMETRIC PROFILE (analyzed from multiple reference photos of this person):
${analysis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠ IDENTITY LOCK — NON-NEGOTIABLE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FACE SHAPE: same skull proportions, same bone landmarks — no deviation
EYES: exact eye shape, exact color, exact lid fold, exact brow — copy precisely
NOSE: exact bridge height, exact nostril shape, exact tip — do not idealize
LIPS: exact ratio, exact cupid's bow, exact corners — do not change
JAW & CHIN: exact jawline, exact chin — same as reference
SKIN TONE: exact tone and undertone — do not whiten or darken
HAIR: exact same color, texture, length, style — identical
UNIQUE MARKS: all moles, birthmarks, distinctive marks — include every one

ALSO study the REFERENCE PHOTOS (sent alongside this prompt) and use them as the GROUND TRUTH for all features above.

ALLOWED IMPROVEMENTS (only these — keep everything else identical):
- Studio lighting: professional beauty lighting setup
- Focus: perfectly sharp, no motion blur
- Image quality: clean high-resolution output
- Skin: subtle retouching (smooth minor blemishes) while keeping exact skin tone

PORTRAIT SETUP:
- Bust-up portrait, shoulders and neck visible
- Subject looking directly at camera, relaxed natural confidence
- Clean white or very light neutral background
- Natural expression — slight positive, not forced smile
- Hollywood beauty lighting: key light 45°, fill light, hair rim light

TECHNICAL QUALITY:
- Ultra photorealistic — indistinguishable from a real professional photograph
- Camera equivalent: Sony A7IV + 85mm f/1.4, ISO 100, razor sharp
- Subsurface skin scattering visible, natural pore texture
- NOT illustration, NOT painting, NOT AI-looking — must look like a real photo

The final image must be immediately recognizable as the SAME person from the reference photos.
Aspect ratio: ${aspect}

Generate the portrait now.`

/**
 * Bộ não 4a — Vẽ lại chân dung (Bước 1) — chỉ điều chỉnh mặt/tóc, không pose
 */
const BRAIN_REDRAW_PORTRAIT = (userRequest) => `
Bạn là nghệ sĩ AI chuyên chỉnh sửa chân dung KOL theo yêu cầu.

YÊU CẦU: "${userRequest}"

NGUYÊN TẮC CHẶT CHẼ:
- GIỮ NGUYÊN 100%: cấu trúc khuôn mặt, đặc điểm nhận dạng cốt lõi
- CHỈ THAY ĐỔI theo yêu cầu: kiểu tóc, màu tóc, make-up, phong cách ánh nhìn, lighting
- ĐÂY LÀ CHÂN DUNG: giữ frame vai trở lên, nền trắng #FFFFFF
- Chất lượng: ultra photorealistic 8K, glass skin, beauty editorial

Render ảnh ngay.`

/**
 * Bộ não 4b — Vẽ lại full body (Bước 2) — áp dụng pose từ ảnh tham chiếu
 */
const BRAIN_REDRAW_BODY = (userRequest, hasPoseRef) => `
Bạn là nghệ sĩ AI chuyên tái tạo ảnh KOL full body theo yêu cầu.

YÊU CẦU: "${userRequest}"

${hasPoseRef ? `POSE THAM CHIẾU: Ảnh 2 là pose/dáng tham chiếu. Áp dụng CHÍNH XÁC pose/dáng đó cho KOL. GIỮ NGUYÊN khuôn mặt + tóc từ ảnh 1. KHÔNG lấy trang phục từ ảnh pose.` : ''}

NGUYÊN TẮC:
- GIỮ NGUYÊN 100%: khuôn mặt, tóc, đặc điểm nhận dạng của KOL (từ ảnh 1)
- THAY ĐỔI theo yêu cầu: pose, dáng, trang phục, hậu cảnh, ánh sáng
- Chất lượng: ultra photorealistic 8K, tự nhiên không AI-looking

Render ảnh ngay theo yêu cầu.`

// ─── Library Helper ──────────────────────────────────────────────────────────

async function getOrCreateKolFolder() {
  const folders = getFolders()
  const existing = folders.find(f => f.name === 'KOL' && !f.parentId)
  if (existing) return existing.id
  const updated = createFolder('KOL')
  return updated.find(f => f.name === 'KOL')?.id || null
}

async function saveImageToLibrary(base64, mimeType, label) {
  const dataUrl = `data:${mimeType};base64,${base64}`
  const folderId = await getOrCreateKolFolder()
  const record = createLibraryRecord({
    name: label || `KOL AI ${new Date().toLocaleDateString('vi-VN')}`,
    type: 'model',
    category: 'kol',
    imageSrc: dataUrl,
    source: 'kol-creator',
    folderId,
  })
  return saveToLibrary(record)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base64ToFile(base64, mimeType, filename) {
  const byteString = atob(base64)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i)
  return new File([ab], filename, { type: mimeType })
}

function downloadBase64(base64, mimeType, filename) {
  const link = document.createElement('a')
  link.href = `data:${mimeType};base64,${base64}`
  link.download = filename
  link.click()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function UploadZone({ label, file, onFile, onClear }) {
  const ref = useRef()
  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }
  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => !file && ref.current.click()}
      style={{
        border: file ? '2px solid var(--brand)' : '2px dashed var(--border)',
        borderRadius: 12, minHeight: file ? 'auto' : 140,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: file ? 'default' : 'pointer', position: 'relative', overflow: 'hidden',
        background: file ? 'transparent' : 'var(--bg-card)', transition: 'border-color .2s',
      }}
    >
      <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <>
          <img src={URL.createObjectURL(file)} alt="preview"
            style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 10 }} />
          <button onClick={(e) => { e.stopPropagation(); onClear() }} style={iconBtnStyle('#000', .55)}>
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <Upload size={28} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', margin: 0, padding: '0 16px' }}>
            {label}
          </p>
        </>
      )}
    </div>
  )
}

/**
 * ResultCard — hiển thị 1 ảnh kết quả
 * mode='portrait' → Bước 1: redraw chỉ mặt/tóc, không có pose upload
 * mode='body'     → Bước 2: redraw có pose upload, aspect 9:16
 */
function ResultCard({ base64, mimeType, label, variantIdx, onUseForStep2, onLightbox, mode = 'portrait' }) {
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [redrawText, setRedrawText] = useState('')
  const [redrawPoseRef, setRedrawPoseRef] = useState(null)
  const [redrawLoading, setRedrawLoading] = useState(false)
  const [redrawResult, setRedrawResult] = useState(null)
  const [redrawError, setRedrawError] = useState('')
  const redrawPoseFileRef = useRef()

  const isBody = mode === 'body'
  const dataUrl = `data:${mimeType};base64,${base64}`
  const filename = `kol-${isBody ? 'multiview' : 'portrait'}-${variantIdx + 1}-${Date.now()}.jpg`

  async function handleSave() {
    setSaving(true)
    try {
      const result = await saveImageToLibrary(base64, mimeType, `${label} — ${new Date().toLocaleDateString('vi-VN')}`)
      if (result && result.success === false) {
        alert(`Lưu thất bại: ${result.error || 'Lỗi không xác định'}`)
      } else {
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 2500)
      }
    } catch (err) {
      alert(`Lưu thất bại: ${err.message}`)
    }
    setSaving(false)
  }

  async function handleRedraw() {
    if (!redrawText.trim()) return
    setRedrawError('')
    setRedrawLoading(true)
    setRedrawResult(null)
    try {
      const kolFile = base64ToFile(base64, mimeType, filename)
      const prompt = isBody
        ? BRAIN_REDRAW_BODY(redrawText, !!redrawPoseRef)
        : BRAIN_REDRAW_PORTRAIT(redrawText)
      const refs = isBody && redrawPoseRef ? [redrawPoseRef] : []
      const result = await generateGarmentImage(kolFile, prompt, {
        quality: '2K',
        aspect: isBody ? '9:16' : '1:1',
        referenceFiles: [kolFile, ...refs],
      })
      setRedrawResult(result)
    } catch (err) {
      setRedrawError(err.message)
    }
    setRedrawLoading(false)
  }

  const redrawPlaceholder = isBody
    ? 'Mô tả yêu cầu... (ví dụ: mặc áo dài đỏ, nền cafe vintage, pose tay chạm tường)'
    : 'Mô tả yêu cầu... (ví dụ: tóc xoăn sóng nâu caramel, make-up đậm hơn)'

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden',
      background: 'var(--bg-card)', marginBottom: 16,
    }}>
      {/* Label */}
      <div style={{ padding: '10px 14px 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)' }}>{label}</span>
      </div>

      {/* Main image */}
      <div style={{ position: 'relative', margin: '8px 12px 0', borderRadius: 10, overflow: 'hidden', cursor: 'zoom-in' }}
        onClick={() => onLightbox(dataUrl)}>
        <img src={dataUrl} alt={label} style={{ width: '100%', display: 'block' }} />
        <div style={{ position: 'absolute', top: 8, right: 8 }}>
          <button style={iconBtnStyle('#000', .45)} onClick={(e) => { e.stopPropagation(); onLightbox(dataUrl) }}>
            <Eye size={14} />
          </button>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 12px', flexWrap: 'wrap' }}>
        <button onClick={() => downloadBase64(base64, mimeType, filename)} style={actionBtn}>
          <Download size={13} /> Tải xuống
        </button>
        <button onClick={handleSave} disabled={saving} style={{ ...actionBtn, background: saveOk ? '#52c41a' : undefined, color: saveOk ? '#fff' : undefined }}>
          {saveOk ? <><Check size={13} /> Đã lưu!</> : saving ? '...' : <><BookImage size={13} /> Lưu Kho KOL</>}
        </button>
        {onUseForStep2 && (
          <button onClick={onUseForStep2} style={{ ...actionBtn, background: 'var(--brand)', color: '#fff', marginLeft: 'auto' }}>
            Dùng cho Bước 2 <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Redraw section */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
            {isBody ? 'Vẽ lại theo yêu cầu (có thể upload Pose tham chiếu)' : 'Chỉnh sửa khuôn mặt / kiểu tóc'}
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
            {/* Pose upload — CHỈ hiện ở mode body */}
            {isBody && (
              <>
                <input ref={redrawPoseFileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => e.target.files[0] && setRedrawPoseRef(e.target.files[0])} />
                {redrawPoseRef ? (
                  <div style={{ position: 'relative', width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '2px solid var(--brand)' }}>
                    <img src={URL.createObjectURL(redrawPoseRef)} alt="pose" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button onClick={() => setRedrawPoseRef(null)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.6)', border: 'none', borderRadius: 20, color: '#fff', width: 18, height: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X size={10} />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => redrawPoseFileRef.current.click()} title="Upload ảnh Pose tham chiếu" style={{ width: 52, height: 52, borderRadius: 8, border: '1.5px dashed var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: 'var(--text-muted)', fontSize: 9, flexShrink: 0 }}>
                    <Upload size={13} />
                    <span>Pose</span>
                  </button>
                )}
              </>
            )}

            <div style={{ flex: 1, position: 'relative' }}>
              <textarea
                value={redrawText}
                onChange={(e) => setRedrawText(e.target.value)}
                placeholder={redrawPlaceholder}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 40px 8px 10px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--bg-main)',
                  color: 'var(--text-main)', fontSize: 12, resize: 'none', fontFamily: 'inherit',
                }}
              />
              <button onClick={handleRedraw} disabled={!redrawText.trim() || redrawLoading}
                style={{ position: 'absolute', bottom: 6, right: 6, background: redrawText.trim() ? 'var(--brand)' : 'var(--border)', border: 'none', borderRadius: 6, color: redrawText.trim() ? '#fff' : 'var(--text-muted)', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: redrawText.trim() ? 'pointer' : 'not-allowed' }}>
                {redrawLoading ? <RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
              </button>
            </div>
          </div>

          {redrawError && (
            <p style={{ fontSize: 12, color: '#cf1322', margin: '4px 0' }}>{redrawError}</p>
          )}

          {/* Redraw result */}
          {redrawResult && (
            <RedrawResult result={redrawResult} onLightbox={onLightbox} />
          )}
        </div>
      </div>
    </div>
  )
}

function RedrawResult({ result, onLightbox }) {
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const dataUrl = `data:${result.mimeType};base64,${result.base64}`

  async function handleSave() {
    setSaving(true)
    try {
      const res = await saveImageToLibrary(result.base64, result.mimeType, `KOL Vẽ lại ${new Date().toLocaleDateString('vi-VN')}`)
      if (res && res.success === false) {
        alert(`Lưu thất bại: ${res.error || 'Lỗi không xác định'}`)
      } else {
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 2500)
      }
    } catch (err) {
      alert(`Lưu thất bại: ${err.message}`)
    }
    setSaving(false)
  }

  return (
    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--brand)', cursor: 'zoom-in' }}
      onClick={() => onLightbox(dataUrl)}>
      <img src={dataUrl} alt="Vẽ lại" style={{ width: '100%', display: 'block' }} />
      <div style={{ display: 'flex', gap: 6, padding: '8px' }}>
        <button onClick={(e) => { e.stopPropagation(); downloadBase64(result.base64, result.mimeType, `kol-redraw-${Date.now()}.jpg`) }} style={actionBtn}>
          <Download size={13} /> Tải
        </button>
        <button onClick={(e) => { e.stopPropagation(); handleSave() }} disabled={saving} style={{ ...actionBtn, background: saveOk ? '#52c41a' : undefined }}>
          {saveOk ? <><Check size={13} /> Đã lưu!</> : <><BookImage size={13} /> Lưu Kho KOL</>}
        </button>
      </div>
    </div>
  )
}

/** LoraResultCard — hiển thị ảnh Số Hóa KOL + ô chat chỉnh sửa + đề xuất Multiview */
function LoraResultCard({ base64, mimeType, idx, loraImages, loraAnalysis, loraQuality, loraRatio, onLightbox, onUseForStep2 }) {
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [redrawText, setRedrawText] = useState('')
  const [redrawLoading, setRedrawLoading] = useState(false)
  const [redrawResult, setRedrawResult] = useState(null)
  const [redrawError, setRedrawError] = useState('')
  const dataUrl = `data:${mimeType};base64,${base64}`

  async function handleSave() {
    setSaving(true)
    try {
      const res = await saveImageToLibrary(base64, mimeType, `Số Hóa KOL #${idx} · ${new Date().toLocaleDateString('vi-VN')}`)
      if (res && res.success === false) alert(`Lưu thất bại: ${res.error}`)
      else { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    } catch (err) { alert(`Lưu thất bại: ${err.message}`) }
    setSaving(false)
  }

  async function handleRedraw() {
    if (!redrawText.trim() || loraImages.length === 0) return
    setRedrawLoading(true)
    setRedrawError('')
    setRedrawResult(null)
    try {
      const basePrompt = BRAIN_LORA_CLONE(loraAnalysis, loraRatio)
      const fullPrompt = `${basePrompt}

ADDITIONAL INSTRUCTION (apply on top of all identity rules above):
${redrawText.trim()}`
      const refs = loraImages.length < 4 ? [...loraImages, ...loraImages] : loraImages
      const result = await generateGarmentImage(loraImages[0], fullPrompt, {
        quality: loraQuality,
        aspect: loraRatio,
        referenceFiles: refs,
      })
      setRedrawResult(result)
    } catch (err) {
      setRedrawError(err.message)
    }
    setRedrawLoading(false)
  }

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(124,58,237,.4)', background: 'var(--bg-card)' }}>
      {/* Main image */}
      <div style={{ position: 'relative', cursor: 'zoom-in' }} onClick={() => onLightbox(dataUrl)}>
        <img src={dataUrl} alt={`Số Hóa ${idx}`} style={{ width: '100%', display: 'block' }} />
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontSize: 10, padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>
          🧬 #{idx}
        </div>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', gap: 6, padding: '8px 8px 0' }}>
        <button onClick={() => downloadBase64(base64, mimeType, `so-hoa-kol-${idx}-${Date.now()}.jpg`)} style={actionBtn}>
          <Download size={13} /> Tải
        </button>
        <button onClick={handleSave} disabled={saving} style={{ ...actionBtn, background: saveOk ? '#52c41a' : undefined, color: saveOk ? '#fff' : undefined, border: saveOk ? '1px solid #52c41a' : undefined }}>
          {saveOk ? <><Check size={13} /> Đã lưu!</> : <><BookImage size={13} /> Lưu Kho KOL</>}
        </button>
        <button onClick={() => onUseForStep2(base64, mimeType)} title="Dùng ảnh này cho Bước 2 Multiview" style={{ ...actionBtn, marginLeft: 'auto', color: '#722ed1', borderColor: 'rgba(114,46,209,.4)' }}>
          <ChevronRight size={13} /> Multiview
        </button>
      </div>

      {/* Redraw chat box */}
      <div style={{ padding: '10px 8px 10px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: .5 }}>
          Chỉnh sửa / Vẽ lại theo yêu cầu
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            value={redrawText}
            onChange={(e) => setRedrawText(e.target.value)}
            placeholder="VD: Thêm tóc xoăn nhẹ, mặc áo trắng cổ V, background gradient tím..."
            rows={2}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '8px 38px 8px 10px',
              borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-main)',
              color: 'var(--text-main)', fontSize: 12, resize: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleRedraw}
            disabled={!redrawText.trim() || redrawLoading}
            style={{
              position: 'absolute', bottom: 6, right: 6,
              background: redrawText.trim() ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'var(--border)',
              border: 'none', borderRadius: 6, color: redrawText.trim() ? '#fff' : 'var(--text-muted)',
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: redrawText.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {redrawLoading ? <RotateCcw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
          </button>
        </div>
        {redrawError && <p style={{ fontSize: 12, color: '#cf1322', margin: '4px 0 0' }}>{redrawError}</p>}
        {redrawResult && (
          <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1.5px solid rgba(124,58,237,.5)', cursor: 'zoom-in' }}
            onClick={() => onLightbox(`data:${redrawResult.mimeType};base64,${redrawResult.base64}`)}>
            <img src={`data:${redrawResult.mimeType};base64,${redrawResult.base64}`} alt="vẽ lại" style={{ width: '100%', display: 'block' }} />
            <div style={{ display: 'flex', gap: 6, padding: '6px 8px' }}>
              <button onClick={(e) => { e.stopPropagation(); downloadBase64(redrawResult.base64, redrawResult.mimeType, `so-hoa-redraw-${Date.now()}.jpg`) }} style={actionBtn}>
                <Download size={13} /> Tải
              </button>
              <button onClick={(e) => { e.stopPropagation(); onUseForStep2(redrawResult.base64, redrawResult.mimeType) }} style={{ ...actionBtn, color: '#722ed1' }}>
                <ChevronRight size={13} /> Multiview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Lightbox overlay */
function Lightbox({ src, onClose }) {
  if (!src) return null
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
      <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: 20, color: '#fff', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <X size={18} />
      </button>
      <img src={src} alt="preview" style={{ maxWidth: '92vw', maxHeight: '92vh', borderRadius: 12, objectFit: 'contain' }} onClick={(e) => e.stopPropagation()} />
    </div>
  )
}

// Shared styles
const iconBtnStyle = (color, alpha) => ({
  position: 'absolute', top: 6, right: 6,
  background: `rgba(${color === '#000' ? '0,0,0' : '255,255,255'},${alpha})`,
  border: 'none', borderRadius: 20, color: '#fff',
  width: 28, height: 28, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
})

const actionBtn = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--bg-main)', color: 'var(--text-main)', cursor: 'pointer',
  fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KOLCreatorPage() {
  const [activeTab, setActiveTab] = useState(1)

  // Bước 1
  const [uploadedKOL, setUploadedKOL] = useState(null)
  const [analysisText, setAnalysisText] = useState('')
  const [kolResults, setKolResults] = useState([])
  const [analyzingFace, setAnalyzingFace] = useState(false)
  const [generatingKOL, setGeneratingKOL] = useState(false)
  const [generatingVariant, setGeneratingVariant] = useState(-1)
  const [step1Error, setStep1Error] = useState('')
  const [step1Quality, setStep1Quality] = useState('2K')
  const [step1Ratio, setStep1Ratio] = useState('1:1')

  // Bước 2
  const [step2Face, setStep2Face] = useState(null)    // chân dung KOL (lấy mặt)
  const [step2Pose, setStep2Pose] = useState(null)    // ảnh pose tham chiếu (lấy dáng)
  const [multiviewResult, setMultiviewResult] = useState(null)
  const [generatingMultiview, setGeneratingMultiview] = useState(false)
  const [step2Error, setStep2Error] = useState('')

  // Tab 3 — Train Lora
  const [loraImages, setLoraImages] = useState([])          // File[] — nhiều ảnh cùng 1 người
  const [loraAnalysis, setLoraAnalysis] = useState('')
  const [loraResults, setLoraResults] = useState([])
  const [loraAnalyzing, setLoraAnalyzing] = useState(false)
  const [loraGenerating, setLoraGenerating] = useState(false)
  const [loraGenIdx, setLoraGenIdx] = useState(0)
  const [loraError, setLoraError] = useState('')
  const [loraQuality, setLoraQuality] = useState('2K')
  const [loraRatio, setLoraRatio] = useState('3:4')
  const [loraCount, setLoraCount] = useState(3)
  const loraInputRef = useRef()

  // Shared
  const [lightboxSrc, setLightboxSrc] = useState(null)

  // ─── Bước 1: phân tích + tạo 3 biến thể ────────────────────────────────────
  async function handleAnalyzeAndGenerate() {
    if (!uploadedKOL) return
    setStep1Error('')
    setAnalysisText('')
    setKolResults([])

    // Phase 1: phân tích khuôn mặt
    setAnalyzingFace(true)
    let analysis = ''
    try {
      analysis = await callGemini({
        prompt: BRAIN_FACE_ANALYST,
        images: [uploadedKOL],
        temperature: 0.3,
        maxTokens: 4096,
      })
      setAnalysisText(analysis)
    } catch (err) {
      setStep1Error(`Lỗi phân tích: ${err.message}`)
      setAnalyzingFace(false)
      return
    }
    setAnalyzingFace(false)

    // Phase 2: tạo 6 biến thể tuần tự (2 trung thành + 4 idol sáng tạo)
    setGeneratingKOL(true)
    for (let i = 0; i < KOL_VARIANTS.length; i++) {
      const variant = KOL_VARIANTS[i]
      setGeneratingVariant(i)
      try {
        // Faithful: gửi ảnh gốc làm reference MẠNH (gửi 2 lần để AI bám sát)
        // Creative: gửi ảnh gốc 1 lần chỉ để tham khảo phong cách
        const isFaithful = variant.type === 'faithful'
        const prompt = isFaithful
          ? BRAIN_KOL_FAITHFUL(analysis, variant.style)
          : BRAIN_KOL_CREATIVE(analysis, variant.style)
        const result = await generateGarmentImage(uploadedKOL, prompt, {
          quality: step1Quality,
          aspect: step1Ratio,
          referenceFiles: isFaithful ? [uploadedKOL, uploadedKOL] : [uploadedKOL],
        })
        setKolResults(prev => [...prev, { ...result, variant: variant.name, type: variant.type }])
      } catch (err) {
        setKolResults(prev => [...prev, { error: err.message, variant: variant.name }])
      }
    }
    setGeneratingVariant(-1)
    setGeneratingKOL(false)
  }

  function handleUseForStep2(base64, mimeType) {
    const file = base64ToFile(base64, mimeType, `kol-face-${Date.now()}.jpg`)
    setStep2Face(file)
    setActiveTab(2)
  }

  function handleSoHoaToStep2(base64, mimeType) {
    const file = base64ToFile(base64, mimeType, `soHoa-face-${Date.now()}.jpg`)
    setStep2Face(file)
    setActiveTab(2)
  }

  // ─── Bước 2: tạo Multiview ──────────────────────────────────────────────────
  async function handleGenerateMultiview() {
    if (!step2Face) return
    setStep2Error('')
    setMultiviewResult(null)
    setGeneratingMultiview(true)
    try {
      // Gửi: faceFile = ảnh chính, referenceFiles = [faceFile, poseRef?]
      // AI nhận face trước → ưu tiên nhận dạng khuôn mặt từ đó
      const refs = step2Pose ? [step2Face, step2Pose] : [step2Face]
      const prompt = BRAIN_MULTIVIEW(!!step2Pose)
      const result = await generateGarmentImage(step2Face, prompt, {
        quality: '2K',
        aspect: '9:16',
        referenceFiles: refs,
      })
      setMultiviewResult(result)
    } catch (err) {
      setStep2Error(err.message)
    }
    setGeneratingMultiview(false)
  }

  // ─── Train Lora: phân tích + tái tạo chính xác người thật ─────────────────
  async function handleTrainLora() {
    if (loraImages.length === 0) return
    setLoraError('')
    setLoraAnalysis('')
    setLoraResults([])

    // Phase 1: phân tích tất cả ảnh → profile sinh trắc học
    setLoraAnalyzing(true)
    let analysis = ''
    try {
      analysis = await callGemini({
        prompt: BRAIN_LORA_ANALYZE,
        images: loraImages,
        temperature: 0.1,
        maxTokens: 4096,
      })
      setLoraAnalysis(analysis)
    } catch (err) {
      setLoraError(`Lỗi phân tích: ${err.message}`)
      setLoraAnalyzing(false)
      return
    }
    setLoraAnalyzing(false)

    // Phase 2: tạo N ảnh tuần tự — gửi TẤT CẢ ảnh làm reference để AI lock face
    setLoraGenerating(true)
    // Gửi mỗi ảnh 2 lần nếu ít hơn 4 ảnh → tăng trọng số nhận diện
    const refs = loraImages.length < 4
      ? [...loraImages, ...loraImages]
      : loraImages

    for (let i = 0; i < loraCount; i++) {
      setLoraGenIdx(i + 1)
      try {
        const prompt = BRAIN_LORA_CLONE(analysis, loraRatio)
        const result = await generateGarmentImage(loraImages[0], prompt, {
          quality: loraQuality,
          aspect: loraRatio,
          referenceFiles: refs,
        })
        setLoraResults(prev => [...prev, result])
      } catch (err) {
        setLoraResults(prev => [...prev, { error: err.message }])
      }
    }
    setLoraGenIdx(0)
    setLoraGenerating(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 80px' }}>

      {/* Lightbox */}
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* CSS spin animation */}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--brand), #ff8a50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User2 size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>Tạo KOL AI</h1>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              Phân tích & tạo KOL ảo đẹp chuẩn thị hiếu Việt — nhất quán 100% mọi phân cảnh
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-card)', borderRadius: 10, padding: 4, border: '1px solid var(--border)' }}>
        {[
          { id: 1, label: 'Bước 1 — Tạo KOL AI' },
          { id: 2, label: 'Bước 2 — Multiview' },
          { id: 3, label: '🧬 Số Hóa KOL' },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '8px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 12,
            background: activeTab === tab.id
              ? tab.id === 3 ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'var(--brand)'
              : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'var(--text-muted)', transition: 'all .2s',
          }}>{tab.label}</button>
        ))}
      </div>

      {/* ── TAB 1 ── */}
      {activeTab === 1 && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--text-main)' }}>Cách dùng:</b> Upload ảnh chân dung KOL bất kỳ. AI phân tích Micro Detail khuôn mặt, sau đó tạo ra <b>6 phiên bản KOL Idol tinh hoa</b> — thu hút mọi ánh nhìn, được ngưỡng mộ như Idol thật sự.
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: 8 }}>Ảnh KOL tham chiếu</label>
            <UploadZone
              label="Kéo thả hoặc click để upload ảnh chân dung KOL"
              file={uploadedKOL}
              onFile={setUploadedKOL}
              onClear={() => { setUploadedKOL(null); setAnalysisText(''); setKolResults([]); setStep1Error('') }}
            />
          </div>

          {/* Quality & Ratio selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            {/* Quality */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Chất lượng ảnh</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {['2K', '4K'].map(q => (
                  <button key={q} onClick={() => setStep1Quality(q)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: step1Quality === q ? '2px solid var(--brand)' : '1.5px solid var(--border)',
                    background: step1Quality === q ? 'rgba(var(--brand-rgb,99,102,241),.1)' : 'var(--bg-card)',
                    color: step1Quality === q ? 'var(--brand)' : 'var(--text-muted)',
                  }}>{q}</button>
                ))}
              </div>
            </div>
            {/* Ratio */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Tỷ lệ ảnh</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { value: '1:1', label: '1:1', desc: 'Vuông' },
                  { value: '4:5', label: '4:5', desc: 'Dọc' },
                  { value: '3:4', label: '3:4', desc: 'Portrait' },
                ].map(r => (
                  <button key={r.value} onClick={() => setStep1Ratio(r.value)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    border: step1Ratio === r.value ? '2px solid var(--brand)' : '1.5px solid var(--border)',
                    background: step1Ratio === r.value ? 'rgba(var(--brand-rgb,99,102,241),.1)' : 'var(--bg-card)',
                    color: step1Ratio === r.value ? 'var(--brand)' : 'var(--text-muted)',
                    lineHeight: 1.3,
                  }}>
                    {r.label}<br /><span style={{ fontSize: 9, fontWeight: 400, opacity: .7 }}>{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={handleAnalyzeAndGenerate} disabled={!uploadedKOL || analyzingFace || generatingKOL} style={{
            width: '100%', padding: '12px 0',
            background: !uploadedKOL || analyzingFace || generatingKOL ? 'var(--border)' : 'linear-gradient(135deg, var(--brand), #ff8a50)',
            color: !uploadedKOL || analyzingFace || generatingKOL ? 'var(--text-muted)' : '#fff',
            border: 'none', borderRadius: 10, cursor: !uploadedKOL || analyzingFace || generatingKOL ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Sparkles size={16} />
            {analyzingFace ? 'Đang phân tích khuôn mặt...'
              : generatingKOL ? `Đang vẽ ${generatingVariant + 1}/6 — ${KOL_VARIANTS[generatingVariant]?.name}...`
              : `Phân tích & Tạo 6 KOL Idol AI · ${step1Quality} · ${step1Ratio}`}
          </button>

          {step1Error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, color: '#cf1322', fontSize: 13 }}>
              {step1Error}
            </div>
          )}

          {/* Analysis text */}
          {analysisText && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Phân tích Micro Detail</p>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: 'var(--text-main)', lineHeight: 1.7, maxHeight: 260, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {analysisText}
              </div>
            </div>
          )}

          {/* 3 variants */}
          {kolResults.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                Kết quả — {kolResults.length} biến thể KOL AI
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                🔵 Trung thành × 2: nâng cấp khuôn mặt gốc lên chuẩn Idol &nbsp;·&nbsp; ✨ Idol AI × 4: hoàn toàn mới, mỗi biến thể là 1 hình mẫu riêng biệt
              </p>
              {kolResults.map((r, i) => r.error ? (
                <div key={i} style={{ padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, color: '#cf1322', fontSize: 12, marginBottom: 12 }}>
                  Biến thể {i + 1} ({r.variant}): {r.error}
                </div>
              ) : (
                <ResultCard
                  key={i}
                  base64={r.base64}
                  mimeType={r.mimeType}
                  label={`Biến thể ${i + 1} — ${r.variant}`}
                  variantIdx={i}
                  mode="portrait"
                  onLightbox={(src) => setLightboxSrc(src)}
                  onUseForStep2={() => handleUseForStep2(r.base64, r.mimeType)}
                />
              ))}

              {/* Progress indicator khi đang gen tiếp */}
              {generatingKOL && generatingVariant >= 0 && kolResults.length < KOL_VARIANTS.length && (
                <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  ✨ Đang vẽ {generatingVariant + 1}/6 — <b>{KOL_VARIANTS[generatingVariant]?.name}</b>...
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3 — Số Hóa KOL ── */}
      {activeTab === 3 && (
        <div>
          {/* Description */}
          <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,.08),rgba(219,39,119,.08))', border: '1px solid rgba(124,58,237,.25)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-main)', lineHeight: 1.7 }}>
            <b style={{ color: '#7c3aed' }}>🧬 Số Hóa KOL — Số hóa người thật thành KOL AI</b>
            <br />
            Upload <b>3–6 ảnh</b> của cùng 1 người (nhiều góc / ánh sáng khác nhau). AI phân tích sinh trắc học khuôn mặt từ tất cả ảnh, sau đó tái tạo chính xác người đó như ảnh thật — không thay đổi đặc điểm nhận dạng.
          </div>

          {/* Multi-image upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                Ảnh tham chiếu ({loraImages.length}/6)
              </label>
              {loraImages.length < 6 && (
                <button
                  onClick={() => loraInputRef.current.click()}
                  style={{ fontSize: 12, color: '#7c3aed', background: 'none', border: '1px solid rgba(124,58,237,.4)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}
                >
                  + Thêm ảnh
                </button>
              )}
              <input ref={loraInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files)
                  setLoraImages(prev => {
                    const combined = [...prev, ...files]
                    return combined.slice(0, 6)
                  })
                  e.target.value = ''
                }}
              />
            </div>

            {loraImages.length === 0 ? (
              <div
                onClick={() => loraInputRef.current.click()}
                style={{ border: '2px dashed rgba(124,58,237,.4)', borderRadius: 12, minHeight: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(124,58,237,.03)', gap: 8 }}
              >
                <Upload size={28} style={{ color: '#7c3aed', opacity: .6 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '0 20px' }}>
                  Kéo thả hoặc click để upload<br />
                  <b>3–6 ảnh</b> cùng 1 người (nhiều góc càng tốt)
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {loraImages.map((f, idx) => (
                  <div key={idx} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(124,58,237,.35)', aspectRatio: '1' }}>
                    <img src={URL.createObjectURL(f)} alt={`ref-${idx}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                      onClick={() => setLightboxSrc(URL.createObjectURL(f))} />
                    <button
                      onClick={() => setLoraImages(prev => prev.filter((_, i) => i !== idx))}
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.65)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={12} />
                    </button>
                    {idx === 0 && (
                      <div style={{ position: 'absolute', bottom: 4, left: 4, background: '#7c3aed', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>CHÍNH</div>
                    )}
                  </div>
                ))}
                {loraImages.length < 6 && (
                  <div
                    onClick={() => loraInputRef.current.click()}
                    style={{ border: '1.5px dashed rgba(124,58,237,.3)', borderRadius: 10, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', gap: 4, color: 'var(--text-muted)' }}
                  >
                    <Upload size={18} />
                    <span style={{ fontSize: 10 }}>Thêm ảnh</span>
                  </div>
                )}
              </div>
            )}

            {loraImages.length > 0 && loraImages.length < 3 && (
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#d97706' }}>
                Khuyên dùng ít nhất 3 ảnh để AI nhận diện chính xác hơn.
              </p>
            )}
          </div>

          {/* Settings */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
            {/* Quality */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Chất lượng</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['2K', '4K'].map(q => (
                  <button key={q} onClick={() => setLoraQuality(q)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: loraQuality === q ? '2px solid #7c3aed' : '1.5px solid var(--border)',
                    background: loraQuality === q ? 'rgba(124,58,237,.1)' : 'var(--bg-card)',
                    color: loraQuality === q ? '#7c3aed' : 'var(--text-muted)',
                  }}>{q}</button>
                ))}
              </div>
            </div>
            {/* Ratio */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Tỷ lệ</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {['1:1', '3:4', '4:5'].map(r => (
                  <button key={r} onClick={() => setLoraRatio(r)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                    border: loraRatio === r ? '2px solid #7c3aed' : '1.5px solid var(--border)',
                    background: loraRatio === r ? 'rgba(124,58,237,.1)' : 'var(--bg-card)',
                    color: loraRatio === r ? '#7c3aed' : 'var(--text-muted)',
                  }}>{r}</button>
                ))}
              </div>
            </div>
            {/* Count */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Số ảnh tạo</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setLoraCount(n)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: loraCount === n ? '2px solid #7c3aed' : '1.5px solid var(--border)',
                    background: loraCount === n ? 'rgba(124,58,237,.1)' : 'var(--bg-card)',
                    color: loraCount === n ? '#7c3aed' : 'var(--text-muted)',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={handleTrainLora}
            disabled={loraImages.length === 0 || loraAnalyzing || loraGenerating}
            style={{
              width: '100%', padding: '13px 0', border: 'none', borderRadius: 10, cursor: loraImages.length === 0 || loraAnalyzing || loraGenerating ? 'not-allowed' : 'pointer',
              background: loraImages.length === 0 || loraAnalyzing || loraGenerating
                ? 'var(--border)'
                : 'linear-gradient(135deg, #7c3aed, #db2777)',
              color: loraImages.length === 0 || loraAnalyzing || loraGenerating ? 'var(--text-muted)' : '#fff',
              fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <Sparkles size={16} />
            {loraAnalyzing
              ? `Đang phân tích ${loraImages.length} ảnh...`
              : loraGenerating
              ? `Đang tạo ảnh ${loraGenIdx}/${loraCount}...`
              : `🧬 Phân tích & Số hóa KOL → ${loraCount} ảnh · ${loraQuality} · ${loraRatio}`}
          </button>

          {loraError && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, color: '#cf1322', fontSize: 13 }}>
              {loraError}
            </div>
          )}

          {/* Analysis result */}
          {loraAnalysis && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>Hồ sơ sinh trắc học</p>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', fontSize: 12, color: 'var(--text-main)', lineHeight: 1.7, maxHeight: 220, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {loraAnalysis}
              </div>
            </div>
          )}

          {/* Results grid */}
          {loraResults.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                Kết quả — {loraResults.length}/{loraCount} ảnh
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                Mỗi ảnh tái tạo chính xác người trong ảnh tham chiếu
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: loraResults.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
                {loraResults.map((r, i) => r.error ? (
                  <div key={i} style={{ padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, color: '#cf1322', fontSize: 12 }}>
                    Ảnh {i + 1}: {r.error}
                  </div>
                ) : (
                  <LoraResultCard
                    key={i}
                    base64={r.base64}
                    mimeType={r.mimeType}
                    idx={i + 1}
                    loraImages={loraImages}
                    loraAnalysis={loraAnalysis}
                    loraQuality={loraQuality}
                    loraRatio={loraRatio}
                    onLightbox={(src) => setLightboxSrc(src)}
                    onUseForStep2={handleSoHoaToStep2}
                  />
                ))}
              </div>

              {loraGenerating && loraResults.length < loraCount && (
                <div style={{ marginTop: 12, padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                  🧬 Đang tạo ảnh {loraGenIdx}/{loraCount}...
                </div>
              )}

              {/* Gợi ý sang Bước 2 Multiview — hiện sau khi tạo xong */}
              {!loraGenerating && loraResults.some(r => !r.error) && (
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'linear-gradient(135deg,rgba(114,46,209,.08),rgba(235,47,150,.08))', border: '1.5px solid rgba(114,46,209,.3)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-main)' }}>Tạo Reference Sheet Multiview?</p>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Dùng ảnh tốt nhất → Bước 2 tạo ảnh 4 góc (Front / 3/4 / Side / Full Body)</p>
                  </div>
                  <button
                    onClick={() => {
                      const best = loraResults.find(r => !r.error)
                      if (best) handleSoHoaToStep2(best.base64, best.mimeType)
                    }}
                    style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#722ed1,#eb2f96)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <ChevronRight size={14} /> Tạo Multiview
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2 ── */}
      {activeTab === 2 && (
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <b style={{ color: 'var(--text-main)' }}>Mục đích:</b> Tạo Reference Sheet 4 góc (Front / 3/4 / Side / Full Body).
            <br />
            <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Ảnh 1 — Chân dung:</span> AI chỉ lấy khuôn mặt + tóc. &nbsp;
            <span style={{ color: '#722ed1', fontWeight: 600 }}>Ảnh 2 — Pose (tùy chọn):</span> AI chỉ lấy dáng đứng, KHÔNG lấy trang phục → body trung tính để phối đồ sau.
          </div>

          {/* 2 input zones side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* Input 1: Chân dung */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', display: 'block', marginBottom: 6 }}>
                Ảnh 1 — Chân dung KOL
              </label>
              {step2Face ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--brand)' }}>
                  <img src={URL.createObjectURL(step2Face)} alt="face"
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                    onClick={() => setLightboxSrc(URL.createObjectURL(step2Face))} />
                  <button onClick={() => setStep2Face(null)} style={iconBtnStyle('#000', .55)}><X size={14} /></button>
                  <div style={{ position: 'absolute', bottom: 4, left: 4, background: 'var(--brand)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>FACE</div>
                </div>
              ) : (
                <UploadZone label="Upload chân dung KOL (mặt + tóc)" file={step2Face} onFile={setStep2Face} onClear={() => setStep2Face(null)} />
              )}
            </div>

            {/* Input 2: Pose */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#722ed1', display: 'block', marginBottom: 6 }}>
                Ảnh 2 — Pose tham chiếu <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(tùy chọn)</span>
              </label>
              {step2Pose ? (
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid #722ed1' }}>
                  <img src={URL.createObjectURL(step2Pose)} alt="pose"
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                    onClick={() => setLightboxSrc(URL.createObjectURL(step2Pose))} />
                  <button onClick={() => setStep2Pose(null)} style={{ ...iconBtnStyle('#000', .55) }}><X size={14} /></button>
                  <div style={{ position: 'absolute', bottom: 4, left: 4, background: '#722ed1', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>POSE</div>
                </div>
              ) : (
                <UploadZone label="Upload ảnh pose dáng đứng (chỉ lấy dáng, không lấy trang phục)" file={step2Pose} onFile={setStep2Pose} onClear={() => setStep2Pose(null)} />
              )}
            </div>
          </div>

          {!step2Face && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
              Hoặc{' '}
              <button onClick={() => setActiveTab(1)} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                quay lại Bước 1
              </button>{' '}
              để tạo KOL AI trước
            </p>
          )}

          <button onClick={handleGenerateMultiview} disabled={!step2Face || generatingMultiview} style={{
            width: '100%', padding: '12px 0',
            background: !step2Face || generatingMultiview ? 'var(--border)' : 'linear-gradient(135deg, #722ed1, #eb2f96)',
            color: !step2Face || generatingMultiview ? 'var(--text-muted)' : '#fff',
            border: 'none', borderRadius: 10, cursor: !step2Face || generatingMultiview ? 'not-allowed' : 'pointer',
            fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Sparkles size={16} />
            {generatingMultiview ? 'Đang tạo Multiview...' : 'Tạo Reference Sheet Multiview 4 góc'}
          </button>

          {step2Error && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 8, color: '#cf1322', fontSize: 13 }}>
              {step2Error}
            </div>
          )}

          {multiviewResult && (
            <ResultCard
              base64={multiviewResult.base64}
              mimeType={multiviewResult.mimeType}
              label="Reference Sheet — Front / 3/4 / Side / Full Body"
              variantIdx={0}
              mode="body"
              onLightbox={(src) => setLightboxSrc(src)}
            />
          )}
        </div>
      )}
    </div>
  )
}
