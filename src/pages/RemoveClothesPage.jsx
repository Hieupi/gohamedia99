import { useState, useRef, useCallback } from 'react'
import { Upload, RotateCcw, Download, Save, ChevronDown, AlertCircle, Users, Eye, X } from 'lucide-react'
import Portal from '../components/Portal'
import { detectObjects, generateGarmentImage } from '../services/geminiService'
import { getPrompt } from '../services/masterPrompts'
import { getApiKeys } from '../services/apiKeyService'
import { saveToLibrary, createLibraryRecord, downloadImage, getLibraryItems, generateUniqueName } from '../services/libraryService'

// ─── Constants ────────────────────────────────────────────────────────────────

const QUALITY_OPTIONS = [
  { value: '1K', label: '1K (SD)' },
  { value: '2K', label: '2K (HD)' },
  { value: '4K', label: '4K (Ultra)' },
]

const ASPECT_OPTIONS = [
  { value: '1:1', label: '1:1 (Vuông)' },
  { value: '16:9', label: '16:9 (Ngang)' },
  { value: '9:16', label: '9:16 (Dọc)' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
]

const REALISM_OPTIONS = [
  { value: 'standard', label: 'Chuẩn' },
  { value: 'high', label: 'Chân thực cao' },
  { value: 'ultra', label: 'Ultra Realism' },
]

const RECREATE_OPTIONS = [
  {
    value: 'original',
    icon: '🔒',
    label: 'Giữ nguyên bản',
    desc: 'Giữ đúng trạng thái gốc (kể cả bùn đất, hao mòn)',
  },
  {
    value: 'new',
    icon: '✨',
    label: 'Tái tạo như mới',
    desc: 'Sản phẩm sạch, hoàn hảo, mới tinh như vừa xuất xưởng',
  },
]

const CATEGORY_EMOJI = {
  top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥',
  shoes: '👠', bag: '👜', accessory: '💍', other: '🖼',
  background: '🏞️', model: '🧑', pose: '🤸',
}

const CATEGORY_PREFIX = {
  top: 'ÁO', bottom: 'QUẦN', dress: 'ĐẦM', outerwear: 'KHOÁC',
  shoes: 'GIÀY', bag: 'TÚI', accessory: 'PK', other: 'SP',
  background: 'BG', model: 'MẪU',
}

// ─── Build image-gen prompt cho từng item ──────────────────────────────────────

function buildItemPrompt(item, productName, quality, aspect, realism = 'standard', recreateMode = 'original') {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'

  // Deep reasoning block — yêu cầu AI phân tích trước khi tạo
  const realismBlock = {
    standard: 'Professional product photography quality.',
    high: `DEEP ANALYSIS BEFORE GENERATING:
First, carefully study this item in the reference image. Identify:
- The exact fabric/material type (cotton, silk, lace, leather, denim, polyester blend, etc.)
- Surface texture characteristics (weave pattern, knit gauge, sheen level, transparency)
- Color nuances (not just "black" — is it jet black, charcoal, faded black, etc.)
- Construction details (stitching type, seam placement, hardware finish)

Then recreate with HIGH FIDELITY — every thread, every stitch, every fold must look photographically real. The output must be indistinguishable from a real studio photograph.`,
    ultra: `ULTRA REALISM — DEEP MATERIAL ANALYSIS PROTOCOL:

STEP 1 — MATERIAL FORENSICS: Before generating anything, perform exhaustive analysis:
- Identify the EXACT fabric composition (e.g., "95% polyester lace with 5% elastane backing")
- Map the weave/knit structure at fiber level (jacquard, satin weave, jersey knit, tulle mesh...)
- Analyze light interaction: how does light scatter, reflect, or transmit through this specific material?
- Note aging/wear patterns: is the fabric new, softened, distressed, or pre-washed?
- Catalog every construction detail: blind hem, overlocked seam, French seam, topstitch width

STEP 2 — REFERENCE MATCHING: Cross-reference with real-world equivalent:
- What would this item look like in a professional e-commerce studio shoot?
- What lighting setup would best reveal the material's true character? (soft diffused vs. directional)
- How does gravity affect the drape and fold pattern of this specific fabric weight?

STEP 3 — HYPER-REALISTIC GENERATION:
- Recreate at MICROSCOPIC textile detail — individual fiber strands visible at close inspection
- Fabric grain, weave direction, and pile texture must be physically accurate
- Every fold, crease, and drape must obey real-world physics of this fabric weight/stiffness
- Hardware (zippers, buttons, clasps) rendered with metallic reflection, patina, and embossing detail
- Stitching must show actual thread thickness, stitch density, and needle penetration marks
- Color accuracy: match under D65 daylight illuminant, no color shift, no oversaturation

The result must be INDISTINGUISHABLE from a real photograph taken with a 100MP medium-format camera and macro lens. A textile expert examining this image should believe it is real.`,
  }

  const realismStr = realismBlock[realism] || realismBlock.standard

  if (item.category === 'pose') {
    return buildPosePrompt(quality, aspect)
  }

  if (item.category === 'model') {
    return `Looking at the reference image, isolate and recreate the PERSON/MODEL only.

CRITICAL RULES FOR MODEL EXTRACTION:
1. REMOVE ALL PRODUCTS, ITEMS, ACCESSORIES from the model's hands — hands must be EMPTY and posing naturally
2. Place model on PURE WHITE background (#FFFFFF)
3. Model MUST be FULL BODY — head to toe, no cropping. If the source image is cropped, EXTEND and regenerate the full body naturally
4. Face must be looking STRAIGHT AT THE CAMERA (front-facing)
5. If hands or fingers look unnatural, FIX THEM — make them look natural and beautiful
6. Keep exact same clothing, hair color, skin tone, body proportions
7. Photorealistic studio quality, soft even lighting, slight shadow under feet
8. ${realismStr}
9. Resolution: ${res}, aspect ratio ${aspect}
${productName ? `Collection: "${productName}"` : ''}

Generate the clean isolated full-body model on pure white background now.`
  }

  if (item.category === 'background') {
    return `Looking at the reference image, isolate and recreate ONLY the background/scene.
Remove all people and objects. Recreate the empty scene preserving exact colors, lighting, textures, and architecture.
Photorealistic quality, ${res} resolution, aspect ratio ${aspect}.`
  }

  // ─── Main garment/accessory prompt with deep reasoning ──────────────
  const positioningMap = {
    dress: 'Ghost mannequin positioning — item appears worn on invisible form, showing 3D silhouette and interior construction',
    outerwear: 'Ghost mannequin positioning — unzipped/unbuttoned, showing lining and collar structure',
    top: 'Ghost mannequin or clean flat-lay — show neckline, sleeve construction, and hem detail',
    bottom: 'Clean flat-lay — folded once at natural crease, showing waistband, pocket detail, and hem',
    shoes: 'Angled 3/4 view — show toe box, heel, sole edge, and interior lining',
    bag: 'Angled 3/4 view — show front hardware, strap attachment, and interior peek if applicable',
    accessory: 'Clean centered — show clasp mechanism, surface texture, and scale reference',
  }

  const positioning = positioningMap[item.category] || 'Clean professional product positioning'

  // Recreate-as-new block (only for fashion items, not model/background)
  const recreateBlock = recreateMode === 'new'
    ? `
CRITICAL — RECREATE AS BRAND NEW & PRISTINE:
- This item must look COMPLETELY CLEAN and BRAND NEW — as if just taken from the production line
- Remove ALL signs of dirt, mud, soil, stains, sweat marks, wear, aging, or any damage
- No earth tones, no watermarks, no use-creases, no fading, no discoloration from outside environment
- Every thread, surface, seam, and fabric must look fresh, clean, and perfectly unworn
- This is a professional product catalog image — the item must look store-ready and flawless
`
    : ''

  return `TASK: Isolate and recreate this SINGLE ITEM from the reference image: "${item.nameVi}"
${item.description ? `Visual reference: ${item.description}` : ''}

${realismStr}
${recreateBlock}
EXTRACTION & RECREATION RULES:
- Remove this item completely from the person/scene
- Recreate as a standalone product photograph on PURE WHITE background (#FFFFFF)
- Positioning: ${positioning}
- Studio lighting: large softbox overhead + fill light, no harsh shadows, subtle natural shadow beneath item
- Maintain EXACT original: color, pattern, print, fabric texture, hardware, proportions, silhouette
- Do NOT simplify or "clean up" the design — preserve every decorative element, embroidery, print, logo, and detail
- Resolution: ${res}, aspect ratio ${aspect}
${productName ? `- Collection: "${productName}"` : ''}

Generate the isolated garment/accessory image now.`
}

function buildMasterPrompt(items, productName, quality, aspect, realism = 'standard') {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'
  const itemList = items.map((it, i) => `${i + 1}. ${it.nameVi}${it.description ? ` — ${it.description}` : ''}`).join('\n')

  const realismHint = realism === 'ultra'
    ? 'Each item must show microscopic textile detail — individual fiber strands, weave patterns, and stitching at macro lens quality.'
    : realism === 'high'
      ? 'Each item must show high-fidelity fabric texture, accurate material sheen, and visible construction details.'
      : 'Professional e-commerce product photography quality.'

  return `Create a MASTER COMPOSITE product photograph — extract ALL items below and arrange in ONE beautiful flat-lay composition.

Items to extract and arrange:
${itemList}

Requirements:
- Pure white background (#FFFFFF)
- Soft even studio lighting, subtle natural shadows for depth
- ${realismHint}
- Maintain exact original colors, textures, and proportions for every item
- Professional lookbook/catalogue style composition with intentional spacing and hierarchy
- ${res} resolution, aspect ratio ${aspect}
${productName ? `- Collection: "${productName}"` : ''}

Generate the master composite image now.`
}

// ─── Pose Template Prompt ─────────────────────────────────────────────────────

function buildPosePrompt(quality, aspect) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '2048x2048'

  return `TASK: Retouch the model photo — remove background, beautify the body. Keep all clothing exactly as-is.

═══ WHAT TO KEEP — DO NOT CHANGE ═══
- The OUTFIT: every garment, fabric, color, pattern, texture — copy it 100% exactly
- The model's face: bone structure, eye shape, brow arch, lip shape, expression — identical
- Hair: same color, length, style, the way it falls in this exact pose
- LEGS: copy the exact leg position, angle, length, and shape from the original — do NOT alter legs at all

═══ WHAT TO CHANGE ═══

1. BACKGROUND → Remove completely, replace with pure white seamless #FFFFFF
   - No shadows on background, no color casts, no gradients
   - Only a very soft drop shadow directly under the feet for grounding

2. HANDS / ARMS — Natural repose only if stiff:
   - If hands look awkward or were holding something, gently relax them
   - Let arms hang naturally at sides OR rest one hand softly on hip
   - Fingers: softly curved, not clenched — natural editorial elegance
   - If hands look fine in the original, keep them exactly as-is

3. WAIST → Cinch it in — make it noticeably slimmer than the original:
   - Ultra-slim hourglass waist, nipped in more than reality
   - Smooth sides, no rolls or folds
   - The clothing must conform naturally to the new slimmer waist shape

4. BUST → Fuller and more lifted than the original:
   - Round, firm, youthful — beautifully shaped
   - Balanced with the narrower waist
   - Clothing drapes naturally over the enhanced shape

5. OVERALL BODY → Slight overall elongation and slimming:
   - Make the model appear a few centimeters taller and lighter
   - Skin on any exposed areas: porcelain-fair, luminous, flawless

═══ LIGHTING (keep studio mood) ═══
- Even, flattering soft-box studio lighting
- Consistent with the original lighting direction
- No harsh shadows on clothing or skin

═══ FRAMING ═══
- Full body: top of hair to bottom of feet — nothing cropped
- Centered, generous breathing room on all sides

Resolution: ${res}, aspect ratio ${aspect}

Output: the same model, same outfit, same pose — but on white background with slimmer waist, fuller bust, relaxed natural hands, and flawless skin.`
}

// ─── Smart Naming (dùng generateUniqueName từ libraryService) ─────────────────

// ─── Save Modal Component ─────────────────────────────────────────────────────

function resizeImageToThumbnail(dataUrl, maxSize = 300) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let w = img.width, h = img.height
      if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
      else { w = Math.round(w * maxSize / h); h = maxSize }
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.7))
    }
    img.onerror = () => resolve(dataUrl) // fallback
    img.src = dataUrl
  })
}

function SaveModal({ item, imageSrc, productName, onClose, onSave }) {
  const existingItems = getLibraryItems()

  const autoName = generateUniqueName({ category: item?.category, description: item?.nameVi })
  const [name, setName] = useState(autoName)
  const [type, setType] = useState(item?.category === 'model' ? 'model' : 'product')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)

  const isDuplicate = getLibraryItems().some(i => i.name === name)

  const handleSave = async () => {
    if (type === 'pose') {
      setSaving(true)
      try {
        // Resize ảnh xuống 300px để tránh tràn localStorage (5MB limit)
        const smallThumb = await resizeImageToThumbnail(imageSrc, 300)
        const customPose = {
          id: `custom_${Date.now()}`,
          name: name || autoName,
          emoji: '📌',
          thumbnail: smallThumb,
          category: 'custom',
          description: item?.description || name,
          bodyFocus: 'Toàn thân',
          cameraAngle: 'Custom reference',
          promptEN: `Custom pose reference: ${name}. ${item?.description || ''}`,
          isCustom: true,
          createdAt: new Date().toISOString(),
        }
        const existing = JSON.parse(localStorage.getItem('goha_custom_poses') || '[]')
        existing.push(customPose)
        localStorage.setItem('goha_custom_poses', JSON.stringify(existing))
        setSaveResult('ok')
        onSave(customPose)
        setTimeout(() => onClose(), 1000)
      } catch (err) {
        console.error('Save pose error:', err)
        setSaveResult('error')
        setSaving(false)
      }
      return
    }
    setSaving(true)
    try {
      const record = createLibraryRecord({
        name: name || autoName,
        type,
        category: item?.category || 'other',
        imageSrc,
        source: 'extract',
      })
      const result = await saveToLibrary(record)
      if (result.success) {
        setSaveResult('ok')
        onSave(record)
        setTimeout(() => onClose(), 1000)
      } else {
        console.error('Save error:', result.error)
        setSaveResult('error')
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveResult('error')
    } finally {
      setSaving(false)
    }
  }

  // Gợi ý các tên thay thế
  const suggestions = [
    autoName,
    productName ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${productName}-${item?.nameVi || ''}`.slice(0, 50) : null,
    item?.description ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${item.description.slice(0, 35)}` : null,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // unique

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
          Lưu vào Kho Tài Nguyên
        </h3>

        {/* Preview + type */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          {imageSrc && (
            <img src={imageSrc} alt={name}
              style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 'var(--r-sm)', background: '#f5f5f5' }} />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--r-full)',
                fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
                background: 'var(--brand-08)', color: 'var(--brand)',
              }}>
                {CATEGORY_PREFIX[item?.category] || 'SP'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {item?.nameVi}
              </span>
            </div>
            {item?.description && (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {item.description.slice(0, 60)}…
              </div>
            )}
          </div>
        </div>

        {/* Mã / Tên định danh */}
        <label className="select-label" style={{ marginBottom: 4, display: 'block' }}>
          Mã định danh sản phẩm
        </label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="input-field"
          style={{
            marginBottom: 4, fontFamily: 'monospace', fontSize: 13.5, fontWeight: 600,
            borderColor: isDuplicate ? '#ef4444' : undefined,
          }} />

        {/* Duplicate warning */}
        {isDuplicate && (
          <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            ⚠️ Tên này đã tồn tại trong kho — hãy chọn tên khác hoặc dùng gợi ý bên dưới.
          </div>
        )}

        {/* Suggestions */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.3 }}>
            GỢI Ý TÊN
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setName(s)}
                style={{
                  padding: '4px 10px', fontSize: 11.5, fontFamily: 'monospace',
                  border: `1.5px solid ${name === s ? 'var(--brand)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-full)', cursor: 'pointer',
                  background: name === s ? 'var(--brand-08)' : 'var(--white)',
                  color: name === s ? 'var(--brand)' : 'var(--text-secondary)',
                  fontWeight: 500,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button className={`toggle-pill ${type === 'product' ? 'active' : ''}`}
            onClick={() => setType('product')}>Sản phẩm</button>
          <button className={`toggle-pill ${type === 'model' ? 'active' : ''}`}
            onClick={() => setType('model')}>Người mẫu</button>
          <button className={`toggle-pill ${type === 'pose' ? 'active' : ''}`}
            onClick={() => setType('pose')} style={type === 'pose' ? { background: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' } : {}}>Pose</button>
        </div>
        {type === 'pose' && (
          <div style={{ fontSize: 11.5, color: 'var(--brand)', marginBottom: 12, padding: '6px 10px', background: 'rgba(255,107,53,0.06)', borderRadius: 8 }}>
            🤸 Ảnh này sẽ được lưu vào <strong>Kho Pose tùy chỉnh</strong> để dùng làm tư thế tham chiếu khi thiết kế.
          </div>
        )}

        {/* Actions */}
        {saveResult === 'error' && (
          <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>
            ❌ Lỗi lưu Pose — bộ nhớ local đã đầy. Xóa bớt pose cũ rồi thử lại.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim() || saving || saveResult === 'ok'}>
            {saving && !saveResult ? '⏳ Đang lưu...' : saveResult === 'ok' ? '✅ Đã lưu thành công!' : type === 'pose' ? '🤸 Lưu Pose' : 'Lưu ngay'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detected Item Row ────────────────────────────────────────────────────────

function ItemToggleRow({ item, isOn, onToggle }) {
  const isPose = item.category === 'pose'
  return (
    <div
      className={`item-toggle-row ${isOn ? 'active' : ''}`}
      onClick={onToggle}
      style={isPose ? {
        background: isOn ? 'rgba(139,92,246,0.07)' : undefined,
        borderTop: '2px dashed rgba(139,92,246,0.25)',
        marginTop: 4,
      } : undefined}
    >
      <div className="item-toggle-info">
        <div className="item-toggle-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isPose && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '1px 7px',
              borderRadius: 99, background: 'rgba(139,92,246,0.12)',
              color: '#7c3aed', letterSpacing: 0.4,
            }}>POSE</span>
          )}
          {item.nameVi}
        </div>
        {item.description && (
          <div className="item-toggle-desc">{item.description}</div>
        )}
      </div>
      <div className={`toggle-switch ${isOn ? 'on' : ''}`}
        style={isPose && isOn ? { background: '#7c3aed' } : undefined}>
        <div className="toggle-knob" />
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ item, imageSrc, isLoading, errorMsg, onSave, onDownload, onSavePose, onPreview, onRegenerate }) {
  const [chatInput, setChatInput] = useState('')
  const [regenLoading, setRegenLoading] = useState(false)
  const chatRef = useRef(null)

  const handleRegen = async () => {
    if (!chatInput.trim() || regenLoading || isLoading) return
    setRegenLoading(true)
    try {
      await onRegenerate(item.id, chatInput.trim())
      setChatInput('')
    } finally {
      setRegenLoading(false)
    }
  }

  const busy = isLoading || regenLoading

  return (
    <div className="result-card">
      {/* Image area */}
      <div className="result-card-img" style={{ position: 'relative' }}>
        {busy ? (
          <div className="result-loading">
            <div className="spin" style={{
              width: 32, height: 32,
              border: '3px solid var(--brand-15)', borderTopColor: 'var(--brand)', borderRadius: '50%',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              {regenLoading ? `Đang vẽ lại...` : `Đang tách ${item.nameVi}...`}
            </span>
          </div>
        ) : errorMsg ? (
          <div className="result-loading">
            <AlertCircle size={20} color="#ef4444" />
            <span style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', lineHeight: 1.4 }}>{errorMsg}</span>
          </div>
        ) : imageSrc ? (
          <>
            <img src={imageSrc} alt={item.nameVi} />
            <button onClick={onPreview} className="result-preview-btn" title="Phóng to xem">
              <Eye size={16} />
            </button>
          </>
        ) : (
          <div className="result-loading">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chờ xử lý...</span>
          </div>
        )}
      </div>

      {/* Footer: name + actions */}
      <div className="result-card-footer">
        <span className="result-card-name">{item.nameVi}</span>
        {imageSrc && !busy && (
          <div className="result-card-actions">
            <button onClick={onSave} title="Lưu vào Kho" className="icon-btn"><Save size={14} /></button>
            <button onClick={onDownload} title="Tải xuống" className="icon-btn"><Download size={14} /></button>
          </div>
        )}
      </div>

      {/* Chat / Redraw area — hiện khi đã có ảnh hoặc lỗi */}
      {(imageSrc || errorMsg) && (
        <div style={{
          borderTop: '1px solid var(--border-light)',
          padding: '8px 10px',
          background: 'var(--bg-page)',
        }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, letterSpacing: 0.3 }}>
            VẼ LẠI THEO Ý BẠN
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
            <textarea
              ref={chatRef}
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={`VD: làm sạch không bùn đất, đổi màu xanh navy, thêm viền ren...`}
              rows={2}
              disabled={busy}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleRegen()
                }
              }}
              style={{
                flex: 1, resize: 'none', fontSize: 11.5, lineHeight: 1.5,
                padding: '6px 9px', borderRadius: 'var(--r-sm)',
                border: '1.5px solid var(--border)',
                background: 'var(--white)', color: 'var(--text-primary)',
                outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--brand)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
            />
            <button
              onClick={handleRegen}
              disabled={!chatInput.trim() || busy}
              title="Vẽ lại (Enter)"
              style={{
                flexShrink: 0, width: 36, height: 36,
                borderRadius: 'var(--r-sm)',
                border: 'none', cursor: chatInput.trim() && !busy ? 'pointer' : 'not-allowed',
                background: chatInput.trim() && !busy ? 'var(--brand)' : 'var(--bg-card)',
                color: chatInput.trim() && !busy ? '#fff' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, transition: 'background 0.15s',
              }}
            >
              {regenLoading
                ? <span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%' }} />
                : '🖌️'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Save Pose Modal ──────────────────────────────────────────────────────────

function SavePoseModal({ item, imageSrc, onClose }) {
  const [poseName, setPoseName] = useState(item?.nameVi ? `Pose - ${item.nameVi}` : 'Pose tùy chỉnh')
  const [poseDesc, setPoseDesc] = useState('')
  const [bodyFocus, setBodyFocus] = useState('Toàn thân')
  const [saved, setSaved] = useState(false)

  const handleSavePose = () => {
    const customPose = {
      id: `custom_${Date.now()}`,
      name: poseName,
      emoji: '📌',
      thumbnail: imageSrc,
      category: 'custom',
      description: poseDesc || poseName,
      bodyFocus,
      cameraAngle: 'Custom reference',
      promptEN: `Custom pose reference: ${poseName}. ${poseDesc}. Body focus: ${bodyFocus}.`,
      isCustom: true,
      createdAt: new Date().toISOString(),
    }
    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('goha_custom_poses') || '[]')
    existing.push(customPose)
    localStorage.setItem('goha_custom_poses', JSON.stringify(existing))
    setSaved(true)
    setTimeout(() => onClose(), 1200)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
          🤸 Lưu làm Pose tham chiếu
        </h3>

        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          {imageSrc && (
            <img src={imageSrc} alt={poseName}
              style={{ width: 80, height: 100, objectFit: 'cover', borderRadius: 'var(--r-sm)', background: '#f5f5f5' }} />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <label className="select-label" style={{ display: 'block', marginBottom: 4 }}>Tên tư thế</label>
              <input type="text" value={poseName} onChange={e => setPoseName(e.target.value)}
                className="input-field" style={{ fontSize: 13 }} />
            </div>
            <div>
              <label className="select-label" style={{ display: 'block', marginBottom: 4 }}>Mô tả</label>
              <input type="text" value={poseDesc} onChange={e => setPoseDesc(e.target.value)}
                placeholder="VD: Tay chống hông, nghiêng đầu..."
                className="input-field" style={{ fontSize: 12 }} />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="select-label" style={{ display: 'block', marginBottom: 4 }}>Focus cơ thể</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Toàn thân', 'Thân trên', 'Chân dài', 'Mông + eo', 'Gương mặt', 'Tay + vai'].map(f => (
              <button key={f}
                className={`toggle-pill ${bodyFocus === f ? 'active' : ''}`}
                onClick={() => setBodyFocus(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSavePose} disabled={!poseName.trim() || saved}>
            {saved ? '✅ Đã lưu!' : '🤸 Lưu Pose'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RemoveClothesPage() {
  const [imageFile, setImageFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const fileRef = useRef()
  const [productName, setProductName] = useState('')

  // Detection
  const [detectedItems, setDetectedItems] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [detecting, setDetecting] = useState(false)

  // Output config
  const [quality, setQuality] = useState('2K')
  const [aspect, setAspect] = useState('1:1')
  const [realism, setRealism] = useState('standard')
  const [recreateMode, setRecreateMode] = useState('new')
  const [masterToggle, setMasterToggle] = useState(true)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState({})
  const [generatingIds, setGeneratingIds] = useState(new Set())
  const [itemErrors, setItemErrors] = useState({})

  // Modal
  const [saveModalItem, setSaveModalItem] = useState(null)
  const [savePoseItem, setSavePoseItem] = useState(null)
  const [previewZoom, setPreviewZoom] = useState(null)
  const [error, setError] = useState(null)

  // ─── File Handlers ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
    setDetectedItems([])
    setSelectedIds(new Set())
    setGeneratedImages({})
    setItemErrors({})
    setError(null)

    const keys = getApiKeys().filter(k => k.active)
    if (keys.length === 0) {
      setError('Chưa có API key. Vui lòng thêm trong Cài đặt → API Keys.')
      return
    }

    setDetecting(true)
    try {
      const prompt = getPrompt('OBJECT_DETECTION')
      const items = await detectObjects(file, prompt)
      if (Array.isArray(items) && items.length > 0) {
        // Auto-add POSE item khi có người mẫu trong ảnh
        const hasModel = items.some(i => i.category === 'model')
        const allItems = hasModel
          ? [...items, {
              id: 'pose-template',
              nameVi: 'Pose mẫu gốc',
              category: 'pose',
              description: 'Sao chép 100% tư thế, nước da, số đo của mẫu. Nền trắng, không trang phục, không phụ kiện.',
            }]
          : items
        setDetectedItems(allItems)
        setSelectedIds(new Set(allItems.map(i => i.id)))
      }
    } catch (err) {
      console.error('[Detection Error]', err)
      setError('Không thể phát hiện vật thể: ' + err.message)
    } finally {
      setDetecting(false)
    }
  }, [])

  const handleInputChange = (e) => handleFile(e.target.files?.[0])
  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  const reset = () => {
    setImageFile(null); setImageUrl(null)
    setDetectedItems([]); setSelectedIds(new Set())
    setGeneratedImages({}); setGeneratingIds(new Set())
    setItemErrors({}); setProductName(''); setError(null)
  }

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ─── Generate Images ────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const selected = detectedItems.filter(i => selectedIds.has(i.id))
    if (selected.length === 0) { setError('Chưa chọn vật thể nào.'); return }

    setGenerating(true)
    setError(null)
    setGeneratedImages({})
    setItemErrors({})

    // Đánh dấu tất cả đang loading cùng lúc
    const allIds = new Set(selected.map(i => i.id))

    // Thêm Master composite nếu toggle ON
    let masterItem = null
    if (masterToggle) {
      const compositeItems = selected.filter(i => i.category !== 'model' && i.category !== 'background' && i.category !== 'pose')
      if (compositeItems.length >= 2) {
        masterItem = { id: 'master-composite', nameVi: 'Bộ sưu tập (Flat Lay)', category: 'other', _compositeItems: compositeItems }
        allIds.add('master-composite')
        setDetectedItems(prev => {
          if (prev.find(i => i.id === 'master-composite')) return prev
          return [...prev, { id: 'master-composite', nameVi: 'Bộ sưu tập (Flat Lay)', category: 'other' }]
        })
        setSelectedIds(prev => new Set([...prev, 'master-composite']))
      }
    }

    setGeneratingIds(allIds)

    // Tạo TẤT CẢ ảnh SONG SONG cùng lúc
    const tasks = selected.map(item => (async () => {
      try {
        const prompt = buildItemPrompt(item, productName, quality, aspect, realism, recreateMode)
        const result = await generateGarmentImage(imageFile, prompt, { quality, aspect })
        const dataUrl = `data:${result.mimeType};base64,${result.base64}`
        setGeneratedImages(prev => ({ ...prev, [item.id]: dataUrl }))
      } catch (err) {
        console.error(`[Gen Error] ${item.nameVi}:`, err)
        setItemErrors(prev => ({ ...prev, [item.id]: err.message }))
      }
      setGeneratingIds(prev => { const n = new Set(prev); n.delete(item.id); return n })
    })())

    // Master composite song song luôn
    if (masterItem) {
      tasks.push((async () => {
        try {
          const prompt = buildMasterPrompt(masterItem._compositeItems, productName, quality, aspect, realism)
          const result = await generateGarmentImage(imageFile, prompt, { quality, aspect })
          const dataUrl = `data:${result.mimeType};base64,${result.base64}`
          setGeneratedImages(prev => ({ ...prev, ['master-composite']: dataUrl }))
        } catch (err) {
          console.error('[Master Gen Error]', err)
          setItemErrors(prev => ({ ...prev, ['master-composite']: err.message }))
        }
        setGeneratingIds(prev => { const n = new Set(prev); n.delete('master-composite'); return n })
      })())
    }

    // Chờ TẤT CẢ hoàn thành cùng lúc
    await Promise.all(tasks)
    setGenerating(false)
  }

  // ─── Regenerate 1 ảnh theo câu lệnh của người dùng ────────────────────────
  const handleRegenerate = useCallback(async (itemId, customPrompt) => {
    const item = detectedItems.find(i => i.id === itemId)
    if (!item || !imageFile) return

    setGeneratingIds(prev => new Set([...prev, itemId]))
    setItemErrors(prev => { const n = { ...prev }; delete n[itemId]; return n })

    try {
      let basePrompt
      if (itemId === 'master-composite') {
        const compositeItems = detectedItems.filter(i => selectedIds.has(i.id) && i.category !== 'model' && i.category !== 'background' && i.category !== 'pose')
        basePrompt = buildMasterPrompt(compositeItems, productName, quality, aspect, realism)
      } else {
        basePrompt = buildItemPrompt(item, productName, quality, aspect, realism, recreateMode)
      }

      const fullPrompt = `${basePrompt}

ADDITIONAL INSTRUCTION FROM USER (apply on top of all previous rules):
${customPrompt}`

      const result = await generateGarmentImage(imageFile, fullPrompt, { quality, aspect })
      const dataUrl = `data:${result.mimeType};base64,${result.base64}`
      setGeneratedImages(prev => ({ ...prev, [itemId]: dataUrl }))
    } catch (err) {
      console.error(`[Regen Error] ${item.nameVi}:`, err)
      setItemErrors(prev => ({ ...prev, [itemId]: err.message }))
    }

    setGeneratingIds(prev => { const n = new Set(prev); n.delete(itemId); return n })
  }, [detectedItems, imageFile, productName, quality, aspect, realism, recreateMode, selectedIds])

  const downloadImage = (dataUrl, name) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${name || 'garment'}-${Date.now()}.png`
    a.click()
  }

  // ─── Computed ───────────────────────────────────────────────────────────

  const selectedItems = detectedItems.filter(i => selectedIds.has(i.id))
  const displayItems = detectedItems.filter(i => generatedImages[i.id] || generatingIds.has(i.id) || itemErrors[i.id])
  const hasResults = displayItems.length > 0

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fade-in">
      <h1 className="page-title">Tách Đồ Áo</h1>

      <div className="tach-do-layout">
        {/* ═══ CỘT TRÁI ═══════════════════════════════════════════════════ */}
        <div className="tach-do-panel tach-do-left">

          {/* 1 — Ảnh gốc */}
          <div className="td-section-label">ẢNH GỐC</div>
          {!imageUrl ? (
            <div className="upload-zone" onClick={() => fileRef.current.click()}
              onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
              <Upload className="upload-icon" />
              <div className="upload-label">Tải ảnh mẫu</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, WEBP — tối đa 10MB</div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleInputChange} />
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img src={imageUrl} alt="Ảnh gốc"
                style={{ width: '100%', borderRadius: 'var(--r-md)', objectFit: 'contain', maxHeight: 300, background: '#fafafa' }} />
              <button onClick={reset} title="Chọn ảnh khác" className="img-reset-btn">
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {/* 2 — Tên sản phẩm */}
          <div className="td-section-label">TÊN SẢN PHẨM (TÙY CHỌN)</div>
          <input type="text" className="input-field" placeholder="VD: Áo sơ mi lụa..."
            value={productName} onChange={e => setProductName(e.target.value)} style={{ marginBottom: 20 }} />

          {/* 3 — Phát hiện vật thể */}
          <div className="td-section-label">PHÁT HIỆN VẬT THỂ</div>
          <div className="td-items-list">
            {detecting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', justifyContent: 'center' }}>
                <div className="spin" style={{
                  width: 20, height: 20, border: '2.5px solid var(--brand-15)',
                  borderTopColor: 'var(--brand)', borderRadius: '50%',
                }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI đang phát hiện vật thể...</span>
              </div>
            ) : detectedItems.length === 0 ? (
              <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Chưa có vật thể nào được phát hiện.
              </div>
            ) : (
              <>
                {detectedItems.filter(i => i.id !== 'master-composite').map(item => (
                  <ItemToggleRow key={item.id} item={item} isOn={selectedIds.has(item.id)}
                    onToggle={() => toggleItem(item.id)} />
                ))}
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                  Chọn tối đa 8 mục
                </div>
              </>
            )}
          </div>

          {/* 4 — Toggle Master */}
          {detectedItems.length > 0 && (
            <div className="item-toggle-row" onClick={() => setMasterToggle(p => !p)}
              style={{ marginTop: 12, background: 'var(--bg-page)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🖼</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Tạo ảnh tổng hợp (Master)</span>
              </div>
              <div className={`toggle-switch ${masterToggle ? 'on' : ''}`}>
                <div className="toggle-knob" />
              </div>
            </div>
          )}

          {/* 5 — Cấu hình xuất file */}
          {detectedItems.length > 0 && (
            <>
              <div className="td-section-label" style={{ marginTop: 20 }}>Cấu hình xuất file</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label className="select-label">Chất lượng</label>
                  <div className="select-wrapper">
                    <select value={quality} onChange={e => setQuality(e.target.value)} className="select-field">
                      {QUALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="select-label">Tỷ lệ</label>
                  <div className="select-wrapper">
                    <select value={aspect} onChange={e => setAspect(e.target.value)} className="select-field">
                      {ASPECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="select-chevron" />
                  </div>
                </div>
              </div>

              {/* Chế độ tái tạo */}
              <label className="select-label">Chế độ sản phẩm</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {RECREATE_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setRecreateMode(o.value)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '9px 8px', borderRadius: 'var(--r-md)', cursor: 'pointer',
                      border: `1.5px solid ${recreateMode === o.value ? 'var(--brand)' : 'var(--border)'}`,
                      background: recreateMode === o.value ? 'var(--brand-08)' : 'var(--white)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{o.icon}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 0.2,
                      color: recreateMode === o.value ? 'var(--brand)' : 'var(--text-secondary)',
                    }}>{o.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                      {o.desc}
                    </span>
                  </button>
                ))}
              </div>
              {recreateMode === 'new' && (
                <div style={{
                  fontSize: 11.5, color: '#16a34a', padding: '7px 11px', marginBottom: 12,
                  background: 'rgba(22,163,74,0.07)', borderRadius: 'var(--r-sm)', lineHeight: 1.5,
                  border: '1px solid rgba(22,163,74,0.2)',
                }}>
                  ✨ <strong>Tái tạo như mới:</strong> Trang phục sẽ được tái tạo sạch, không bùn đất, không vết bẩn — hoàn hảo như hàng mới xuất xưởng.
                </div>
              )}

              {/* Mức độ chân thực */}
              <label className="select-label">Mức độ chân thực</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {REALISM_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setRealism(o.value)}
                    className={`toggle-pill ${realism === o.value ? 'active' : ''}`}>
                    {o.label}
                  </button>
                ))}
              </div>
              {realism === 'ultra' && (
                <div style={{
                  fontSize: 11.5, color: 'var(--brand)', padding: '8px 12px', marginBottom: 12,
                  background: 'var(--brand-08)', borderRadius: 'var(--r-sm)', lineHeight: 1.5,
                }}>
                  🔬 <strong>Ultra Realism:</strong> AI sẽ phân tích chất liệu vải, cấu trúc sợi, kiểu dệt, phản xạ ánh sáng... rồi tái tạo ở mức độ vi mô. Thời gian xử lý lâu hơn nhưng chất lượng cực cao.
                </div>
              )}
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', marginBottom: 12,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 'var(--r-sm)', fontSize: 13, color: '#ef4444',
            }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* 6 — CTA */}
          {detectedItems.length > 0 && (
            <button className="btn btn-primary btn-cta" onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0}>
              {generating ? (
                <>
                  <span className="spin" style={{
                    display: 'inline-block', width: 16, height: 16,
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%',
                  }} />
                  Đang tách đồ...
                </>
              ) : (<>✂️ Tách & Tạo Ảnh ({selectedIds.size} mục)</>)}
            </button>
          )}
        </div>

        {/* ═══ CỘT PHẢI ══════════════════════════════════════════════════ */}
        <div className="tach-do-panel tach-do-right">
          {hasResults ? (
            <div className="result-grid">
              {displayItems.map(item => (
                <ResultCard key={item.id} item={item}
                  imageSrc={generatedImages[item.id] || null}
                  isLoading={generatingIds.has(item.id)}
                  errorMsg={itemErrors[item.id] || null}
                  onSave={() => setSaveModalItem({ item, imageSrc: generatedImages[item.id] })}
                  onSavePose={() => setSavePoseItem({ item, imageSrc: generatedImages[item.id] })}
                  onPreview={() => setPreviewZoom({ name: item.nameVi, src: generatedImages[item.id] })}
                  onDownload={() => downloadImage(generatedImages[item.id], item.nameVi)}
                  onRegenerate={handleRegenerate} />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ minHeight: 400 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.3 }}>
                <path d="M32 8C29.8 8 28 9.8 28 12C28 13.5 28.8 14.8 30 15.5V20L12 36V44H52V36L34 20V15.5C35.2 14.8 36 13.5 36 12C36 9.8 34.2 8 32 8Z" stroke="#9B9B9B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 44H52V48H12V44Z" stroke="#9B9B9B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18 48V56M46 48V56" stroke="#9B9B9B" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 16 }}>Chưa có kết quả</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
                Tải ảnh lên, chọn vật thể và nhấn nút tạo để xem kết quả tách đồ.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {saveModalItem && (
        <Portal>
          <SaveModal item={saveModalItem.item} imageSrc={saveModalItem.imageSrc}
            productName={productName}
            onClose={() => setSaveModalItem(null)}
            onSave={(record) => console.log('Saved:', record)} />
        </Portal>
      )}
      {savePoseItem && (
        <Portal>
          <SavePoseModal item={savePoseItem.item} imageSrc={savePoseItem.imageSrc}
            onClose={() => setSavePoseItem(null)} />
        </Portal>
      )}

      {/* Preview Zoom Overlay */}
      {previewZoom && (
        <Portal>
          <div className="modal-overlay" onClick={() => setPreviewZoom(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
              <img src={previewZoom.src} alt={previewZoom.name}
                style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
              <div style={{ textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: 600, marginTop: 10 }}>{previewZoom.name}</div>
              <button onClick={() => setPreviewZoom(null)}
                style={{ position: 'absolute', top: -12, right: -12, width: 32, height: 32, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        </Portal>
      )}
    </div>
  )
}
