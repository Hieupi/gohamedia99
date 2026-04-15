/**
 * PhoiDoPage.jsx — Phối Đồ  ·  Premium Dark
 * Tone: Black + Orange + White + Blue + Fuchsia
 */
import { useState, useRef } from 'react'
import {
  Upload, Sparkles, RotateCcw, Download, X, Check,
  BookImage, Video, ImageIcon, ChevronDown, ChevronUp, Zap,
} from 'lucide-react'
import LibraryPickerModal from '../components/LibraryPickerModal'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { saveToLibrary, createLibraryRecord, downloadImage, getFolders, createFolder } from '../services/libraryService'
import { downloadImageAsBlob } from '../services/cloudStorageService'

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Black base · Orange primary · Blue & Fuchsia accents
   ═══════════════════════════════════════════════════════════════════════════ */
const C = {
  // Backgrounds (layered — slightly lighter dark)
  bg0: '#131318',     // page
  bg1: '#1c1c24',     // card
  bg2: '#25252f',     // elevated
  bg3: '#2e2e3a',     // highest

  // Borders
  b1: '#2e2e38',      // subtle
  b2: '#45455a',      // medium
  b3: '#5a5a72',      // strong (hover)

  // Text
  t1: '#fafafa',      // primary
  t2: '#a1a1aa',      // secondary
  t3: '#71717a',      // muted

  // Red — primary hero accent
  re:   '#dc2626',
  reL:  '#ef4444',
  reBg: 'rgba(220,38,38,0.10)',
  reBd: 'rgba(220,38,38,0.30)',

  // Orange — action, energy
  or:   '#f97316',
  orL:  '#fb923c',
  orBg: 'rgba(249,115,22,0.08)',
  orBd: 'rgba(249,115,22,0.25)',

  // Blue — information, structure
  bl:   '#3b82f6',
  blBg: 'rgba(59,130,246,0.08)',
  blBd: 'rgba(59,130,246,0.25)',

  // Fuchsia — creative, Kling
  fu:   '#d946ef',
  fuL:  '#e879f9',
  fuBg: 'rgba(217,70,239,0.08)',
  fuBd: 'rgba(217,70,239,0.25)',

  // Scene accents
  s1: '#f97316',   // orange
  s2: '#3b82f6',   // blue
  s3: '#d946ef',   // fuchsia

  // Utility
  green: '#22c55e',
  red:   '#ef4444',
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const QUALITY_OPTS = ['2K (HD)', '4K (Ultra)']
const ASPECT_OPTS = [
  { v: '9:16',  label: '9:16', sub: 'Story' },
  { v: '3:4',   label: '3:4',  sub: 'Portrait' },
  { v: '4:5',   label: '4:5',  sub: 'Feed' },
  { v: '1:1',   label: '1:1',  sub: 'Vuông' },
  { v: '16:9',  label: '16:9', sub: 'Ngang' },
]
const BG_PRESETS = [
  'Studio trắng sang trọng — softbox 3 điểm',
  'Showroom kính hiện đại — ánh sáng vàng ấm',
  'Phố cổ châu Âu — vỉa hè đá hoa cương',
  'Quán cafe vintage — ánh sáng vàng ấm',
  'Ngoài trời thành phố — golden hour',
  'Bãi biển nhiệt đới — hoàng hôn',
  'Vườn hoa lãng mạn — nắng sớm',
  'Nội thất sang trọng — ánh nến',
  'Sân thượng rooftop — thành phố đêm',
  'Gradient pastel studio',
]
const MOOD_OPTS = [
  '🤖 AI tự chọn',
  'Thời trang cao cấp — Editorial',
  'Street style năng động',
  'Lãng mạn ngọt ngào',
  'Sang chảnh Luxury',
  'Sporty & Fresh',
  'Tối giản Minimalist',
  'Cá tính & Bold',
]

/* ═══════════════════════════════════════════════════════════════════════════
   AI BRAIN
   ═══════════════════════════════════════════════════════════════════════════ */
const BRAIN_PHOIDО_PLAN = `You are a professional fashion film director and creative director specializing in KOL content for Vietnamese social media.

You receive:
- KOL reference photo(s): face, hair, skin tone, body — MUST be replicated with absolute 100% accuracy
- Outfit/product photo(s): what is being showcased
- Optional: background reference image (highest priority — use this exact location/scene)

YOUR MISSION: Create a PRECISE SHOOTING PLAN for 4 coherent scenes optimized for Kling AI video input.

ANALYSIS RULES:
- Detect and METICULOUSLY describe KOL: gender, skin tone (exact hex-like description), hair (color+length+texture+style), face (eye shape+color, nose shape, lip shape, jaw, cheekbones, eyebrows — every detail for identity lock)
- KOL body: waist-to-hip ratio, leg length, chest, overall figure proportions
- Identify the outfit: type, color palette, material, key detail to feature
- If a background reference image was provided, describe it precisely and use it as the locked background
- Otherwise, choose ONE perfect background that matches the outfit's mood
- Design 4 scenes forming a narrative arc: Opening Hero → Dynamic Energy → Emotional Climax → Rear Silhouette

SCENE DESIGN PRINCIPLES (NON-NEGOTIABLE):
1. Scenes 1–3: KOL faces camera with DIRECT eye contact with lens
2. Scene 4 ONLY: KOL turns her BACK fully to the camera — rear silhouette shot — NO face visible
3. Background is IDENTICAL across all 4 scenes — only KOL pose/expression changes
4. Each scene MUST have built-in motion dynamics: fabric flow, hair movement, implied kinetic energy
5. All 4 scenes must feel like frames from ONE coherent fashion film

OUTPUT strictly as valid JSON (no extra text, no markdown):
{
  "kol": { "gender": "male/female", "skinTone": "description", "hair": "color, length, texture, style", "face": "EXTREMELY DETAILED: eye shape+color+lashes, nose shape, lip color+shape, jaw+chin, cheekbones, skin texture, eyebrows — every feature needed to reproduce this exact face", "body": "figure description: height impression, waist, hips, legs, chest, overall silhouette" },
  "outfit": { "description": "full outfit description", "colors": "color palette", "keyDetail": "most photogenic feature", "material": "fabric feel" },
  "lockedBackground": "VERY SPECIFIC description of the ONE background for all 4 scenes — lighting, colors, textures, depth, atmosphere.",
  "scenes": [
    { "num": 1, "name": "Opening Hero", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "klingNote": "..." },
    { "num": 2, "name": "Dynamic Energy", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "klingNote": "..." },
    { "num": 3, "name": "Emotional Climax", "poseEN": "...", "motionEN": "...", "expressionEN": "...", "outfitFocusEN": "...", "klingNote": "..." },
    { "num": 4, "name": "Rear Silhouette", "poseEN": "KOL standing with back fully turned to camera, slight hip tilt for elegance", "motionEN": "hair gently blowing, fabric of outfit visible from behind, full rear silhouette", "expressionEN": "NO face visible — back of head and hair only", "outfitFocusEN": "Full back view of outfit — back design, silhouette, drape, back details", "klingNote": "Rear-view signature shot — back of outfit showcase" }
  ]
}`

function buildScenePrompt(plan, sceneIdx, quality, aspect, bgPreset, mood, hasBgImage, hasPoseImage) {
  const sc     = plan.scenes[sceneIdx]
  const kol    = plan.kol
  const outfit = plan.outfit
  const rawQ   = quality.match(/([124]K)/i)?.[1]?.toUpperCase() || '2K'
  const rawA   = typeof aspect === 'string' ? (aspect.match(/\d+:\d+/)?.[0] || '9:16') : aspect
  const isRearScene = sceneIdx === 3

  const bgLine = hasBgImage
    ? 'Background: Use the EXACT background from the reference photo provided (last image in the reference set). Replicate its location, lighting, colors, and atmosphere precisely.'
    : `Background: ${plan.lockedBackground}`

  const faceBlock = isRearScene
    ? `═══ FACE / IDENTITY ═══
KOL BACK IS FULLY TURNED TO CAMERA — rear silhouette only.
NO face visible whatsoever. Show only the back of the head, hair, and the outfit from behind.
Hair: ${kol.hair}. Skin tone (back/arms): ${kol.skinTone}.`
    : `═══ ABSOLUTE FACE IDENTITY LOCK — CRITICAL ═══
You MUST reproduce the EXACT face from the reference photos with 100% accuracy. This is non-negotiable.
• Eye shape: ${kol.face}
• Hair: ${kol.hair}
• Skin tone: ${kol.skinTone} — porcelain-smooth, luminous, flawless
• Every facial feature (eyes, nose, lips, jaw, cheekbones, eyebrows) must be IDENTICAL to the reference photo
• DO NOT simplify, generalize, or alter ANY facial feature — copy it pixel-perfect
• Same face, same identity, same person as in the reference — viewers must recognize her instantly
BODY: ${kol.body || 'tall, slender hourglass figure — long legs, slim waist, feminine curves'}`

  const cameraBlock = isRearScene
    ? `═══ CAMERA DIRECTION — REAR SHOT ═══
Full rear silhouette. KOL's back to lens. Slight hip tilt for elegance.
Capture the complete back of the outfit — drape, back design, silhouette line.
Hair flowing naturally down the back. Arms relaxed at sides or one hand on hip.`
    : `═══ CAMERA EYE CONTACT — NON-NEGOTIABLE ═══
KOL looks DIRECTLY into the camera lens. Confident, direct gaze at the viewer.
Eyes fully open, engaging, magnetic — the viewer must feel seen.`

  const beautyBlock = isRearScene ? '' : `
═══ COMMERCIAL BEAUTY STANDARD ═══
• Skin: porcelain white, glowing, flawless — zero blemishes, ultra smooth texture
• Figure: tall statuesque model proportions — hourglass silhouette, slim waist, long elegant legs
• Hair: perfectly styled, lustrous, natural movement
• Overall: she looks stunning, elegant, naturally beautiful — ready for high-end commercial sales`

  const poseBlock = (hasPoseImage && !isRearScene) ? `
═══ POSE REFERENCE — REPLICATE EXACTLY ═══
A body pose reference photo is provided. You MUST replicate the EXACT body posture:
• Stance and weight distribution (which leg bears weight, hip tilt)
• Arm positions and hand placement
• Torso angle and shoulder line
• Head tilt and neck angle
Maintain this fundamental pose structure while naturally fitting the scene's energy.` : ''

  return `TASK: Generate a hyper-realistic commercial fashion KOL photo — Scene ${sc.num}/4 "${sc.name}".

${faceBlock}
${poseBlock}

═══ OUTFIT ═══
${outfit.description}. Colors: ${outfit.colors}. Material: ${outfit.material}.
Key visual focus: ${sc.outfitFocusEN || outfit.keyDetail}.

═══ SCENE DIRECTION ═══
${sc.poseEN}
${sc.motionEN}
${sc.expressionEN}

${cameraBlock}

═══ BACKGROUND (LOCKED — SAME ALL 4 SCENES) ═══
${bgLine}
Do NOT change background between scenes.

═══ MOTION & LIFE ═══
${sc.motionEN}
Fabric movement suggesting model just settled into pose. Natural breath. Hair subtly lifted by air.
Image must feel ALIVE — not static — perfect for Kling AI video input.
${beautyBlock}
${mood && mood !== '🤖 AI tự chọn' ? `\n═══ MOOD ═══\nAesthetic direction: ${mood}.` : ''}

═══ TECHNICAL QUALITY ═══
Hyper-photorealistic 8K commercial fashion photography. Shot on Sony A7IV + 85mm f/1.4 lens.
ISO 100, perfect exposure, cinematic color grading. Zero AI artifacts. Skin pores visible.
Image must look like a real high-end fashion magazine photo — indistinguishable from reality.
Aspect ratio: ${rawA}. Resolution: ${rawQ}.

Generate Scene ${sc.num} now.`
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */
async function entryToFile(entry, name = 'image.jpg') {
  if (entry.file) return entry.file
  const url = entry.url
  if (!url) throw new Error('Ảnh không có URL hoặc File.')
  const blob = await downloadImageAsBlob(url)
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('AI không trả về JSON hợp lệ.')
  }
}

async function getOrCreateFolder(name) {
  const folders = getFolders()
  const ex = folders.find(f => f.name === name && !f.parentId)
  if (ex) return ex.id
  const updated = createFolder(name)
  return updated.find(f => f.name === name)?.id || null
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES — clean, professional, no gimmicks
   ═══════════════════════════════════════════════════════════════════════════ */
const CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px) }
    to   { opacity: 1; transform: translateY(0) }
  }

  .pd-card {
    background: ${C.bg1};
    border: 1px solid ${C.b1};
    border-radius: 16px;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  .pd-card:hover {
    border-color: ${C.b2};
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  }

  .pd-scene {
    animation: fadeUp 0.45s ease both;
    transition: transform 0.3s ease, box-shadow 0.3s;
  }
  .pd-scene:nth-child(2) { animation-delay: 80ms }
  .pd-scene:nth-child(3) { animation-delay: 160ms }
  .pd-scene:nth-child(4) { animation-delay: 240ms }
  .pd-scene:hover {
    transform: translateY(-6px);
    box-shadow: 0 20px 48px rgba(0,0,0,0.5);
  }

  .pd-gen {
    transition: transform 0.15s, box-shadow 0.25s, filter 0.2s;
  }
  .pd-gen:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(220,38,38,0.45);
    filter: brightness(1.08);
  }
  .pd-gen:active:not(:disabled) {
    transform: translateY(0);
  }

  .pd-slot {
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .pd-slot:hover {
    border-color: ${C.b3} !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    transform: translateY(-2px);
  }

  .pd-pill {
    transition: all 0.2s ease;
  }
  .pd-pill:hover {
    border-color: ${C.b3} !important;
    background: ${C.bg3} !important;
  }

  .pd-action {
    transition: background 0.15s, color 0.15s;
  }
  .pd-action:hover {
    background: rgba(255,255,255,0.04) !important;
    color: ${C.t1} !important;
  }

  .pd-bg-opt {
    transition: all 0.15s ease;
  }
  .pd-bg-opt:hover {
    border-color: ${C.b3} !important;
    background: ${C.bg3} !important;
    padding-left: 18px !important;
  }
`

/* ═══════════════════════════════════════════════════════════════════════════
   SLOT — clean upload / library
   ═══════════════════════════════════════════════════════════════════════════ */
function Slot({ src, onRemove, onUpload, onLibrary, label }) {
  if (src) {
    return (
      <div className="pd-slot" style={{
        position: 'relative', aspectRatio: '1', borderRadius: 12,
        overflow: 'hidden', border: `1px solid ${C.b2}`,
      }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <button onClick={onRemove} style={{
          position: 'absolute', top: 6, right: 6, width: 22, height: 22,
          borderRadius: 6, background: 'rgba(0,0,0,.6)', border: 'none',
          color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
        }}><X size={10} /></button>
        {label && (
          <span style={{
            position: 'absolute', bottom: 6, left: 6,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: '#fff', background: C.or, padding: '2px 7px', borderRadius: 4,
          }}>{label}</span>
        )}
      </div>
    )
  }
  return (
    <div className="pd-slot" style={{
      aspectRatio: '1', borderRadius: 12, border: `1px dashed ${C.b2}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg2,
    }}>
      <button onClick={onUpload} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        color: C.t3,
      }}>
        <Upload size={14} strokeWidth={2.5} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
      </button>
      <div style={{ height: 1, background: C.b1, margin: '0 12px' }} />
      <button onClick={onLibrary} style={{
        flex: 1, background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        color: C.t3,
      }}>
        <BookImage size={13} strokeWidth={2.5} />
        <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SCENE CARD
   ═══════════════════════════════════════════════════════════════════════════ */
function SceneCard({ idx, scene, result, isLoading, error, klingSelected, onToggleKling, onRetry, onDownload }) {
  const [saveOk, setSaveOk] = useState(false)
  const [saving, setSaving] = useState(false)
  const NAMES = ['Opening Hero', 'Dynamic Energy', 'Emotional Climax', 'Rear Silhouette']
  const accent = [C.s1, C.s2, C.s3, C.green][idx]
  const dataUrl = result ? `data:${result.mimeType};base64,${result.base64}` : null

  async function handleSave() {
    if (!dataUrl) return
    setSaving(true)
    try {
      const folderId = await getOrCreateFolder('Phối Đồ')
      const record = createLibraryRecord({
        name: `Phối Đồ Scene ${idx + 1} · ${new Date().toLocaleDateString('vi-VN')}`,
        type: 'outfit', category: 'phoi-do', imageSrc: dataUrl, source: 'phoi-do', folderId,
      })
      const res = saveToLibrary(record)
      if (res?.success === false) alert(`Lưu thất bại: ${res.error}`)
      else { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    } catch (e) { alert(`Lưu thất bại: ${e.message}`) }
    setSaving(false)
  }

  return (
    <div className="pd-scene" style={{
      borderRadius: 14, overflow: 'hidden', background: C.bg1,
      border: klingSelected ? `2px solid ${C.fu}` : `1px solid ${C.b1}`,
    }}>
      {/* Accent bar */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />

      {/* Header */}
      <div style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${C.b1}`,
      }}>
        <span style={{
          fontSize: 32, fontWeight: 900, color: accent, opacity: 0.15,
          lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: 'system-ui',
        }}>0{idx + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.t1 }}>
            {scene?.name || NAMES[idx]}
          </p>
          {scene?.klingNote && (
            <p style={{ margin: '2px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {scene.klingNote}
            </p>
          )}
        </div>
        <button onClick={onToggleKling} title="Kling frame" style={{
          width: 30, height: 30, borderRadius: 8, cursor: 'pointer',
          border: `1px solid ${klingSelected ? C.fu : C.b2}`,
          background: klingSelected ? C.fuBg : 'transparent',
          color: klingSelected ? C.fu : C.t3,
          display: 'grid', placeItems: 'center', transition: 'all .2s',
        }}><Video size={13} /></button>
      </div>

      {/* Image */}
      <div style={{ minHeight: 180, background: C.bg0, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 36 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `2.5px solid ${C.b2}`, borderTopColor: accent,
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: 10, color: C.t3, letterSpacing: '0.06em', fontWeight: 600 }}>
              Rendering...
            </span>
          </div>
        )}
        {!isLoading && error && (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: C.red, fontSize: 12, margin: '0 0 10px', lineHeight: 1.5 }}>{error}</p>
            <button onClick={onRetry} style={{
              padding: '7px 16px', borderRadius: 8, border: `1px solid ${C.b2}`,
              background: C.bg2, color: C.t2, cursor: 'pointer', fontSize: 11,
              display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600,
            }}>
              <RotateCcw size={11} /> Thử lại
            </button>
          </div>
        )}
        {!isLoading && dataUrl && (
          <img src={dataUrl} alt={`Scene ${idx + 1}`}
            style={{ width: '100%', display: 'block', cursor: 'zoom-in' }}
            onClick={() => {
              const w = window.open()
              w.document.write(`<body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${dataUrl}" style="max-width:100%;max-height:100vh"></body>`)
            }}
          />
        )}
        {!isLoading && !dataUrl && !error && (
          <div style={{ padding: 36, textAlign: 'center' }}>
            <ImageIcon size={24} style={{ color: C.b2, marginBottom: 8 }} />
            <p style={{ margin: 0, fontSize: 10, color: C.t3 }}>Chờ render...</p>
          </div>
        )}
        {klingSelected && dataUrl && (
          <span style={{
            position: 'absolute', top: 8, left: 8,
            background: C.fu, color: '#fff',
            fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
            letterSpacing: '0.06em',
          }}>KLING</span>
        )}
      </div>

      {/* Actions */}
      {dataUrl && (
        <div style={{ display: 'flex', borderTop: `1px solid ${C.b1}` }}>
          {[
            { icon: <Download size={12} />, label: 'Tải về', fn: onDownload },
            { icon: saveOk ? <Check size={12} /> : <BookImage size={12} />, label: saveOk ? 'Đã lưu' : 'Lưu kho', fn: handleSave, ok: saveOk },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} disabled={saving} className="pd-action" style={{
              flex: 1, padding: '9px 0', background: b.ok ? 'rgba(34,197,94,.08)' : 'transparent',
              border: 'none', borderRight: i === 0 ? `1px solid ${C.b1}` : 'none',
              color: b.ok ? C.green : C.t3, cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              fontWeight: 600,
            }}>
              {b.icon} {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function PhoiDoPage() {
  const [refEntries, setRefEntries]       = useState([])
  const [outfitEntries, setOutfitEntries] = useState([])
  const [poseEntries, setPoseEntries]     = useState([])
  const [bgEntry, setBgEntry]             = useState(null)
  const [bgPreset, setBgPreset]           = useState('')
  const [bgPresetExpanded, setBgPresetExpanded] = useState(false)

  const [quality, setQuality] = useState('2K (HD)')
  const [aspect, setAspect]   = useState('9:16')
  const [mood, setMood]       = useState('🤖 AI tự chọn')

  const [plan, setPlan]               = useState(null)
  const [planning, setPlanning]       = useState(false)
  const [planExpanded, setPlanExpanded] = useState(false)
  const [results, setResults]         = useState([null, null, null, null])
  const [loading, setLoading]         = useState([false, false, false, false])
  const [errors, setErrors]           = useState([null, null, null, null])
  const [generating, setGenerating]   = useState(false)
  const [planError, setPlanError]     = useState('')
  const [klingSelected, setKlingSelected] = useState([])

  const [pickerOpen, setPickerOpen]     = useState(false)
  const [pickerTarget, setPickerTarget] = useState(null)

  const refInput    = useRef()
  const outfitInput = useRef()
  const poseInput   = useRef()
  const bgInput     = useRef()
  const generateBusyRef = useRef(false)

  /* ─── handlers ────────────────────────────────────────────────────────── */
  function addFiles(files, type) {
    const entries = Array.from(files).map(f => ({ file: f, url: URL.createObjectURL(f) }))
    if (type === 'ref')    setRefEntries(p => [...p, ...entries].slice(0, 3))
    if (type === 'outfit') setOutfitEntries(p => [...p, ...entries].slice(0, 2))
    if (type === 'pose')   setPoseEntries(p => [...p, ...entries].slice(0, 1))
    if (type === 'bg')     setBgEntry(entries[0] || null)
  }
  function openPicker(type) { setPickerTarget(type); setPickerOpen(true) }
  function handlePickLibrary(item) {
    const entry = { url: item.imageSrc || item.url, file: null }
    if (pickerTarget === 'ref')    setRefEntries(p => [...p, entry].slice(0, 3))
    if (pickerTarget === 'outfit') setOutfitEntries(p => [...p, entry].slice(0, 2))
    if (pickerTarget === 'pose')   setPoseEntries(p => [...p, entry].slice(0, 1))
    if (pickerTarget === 'bg')     setBgEntry(entry)
    setPickerOpen(false)
  }
  function toggleKling(idx) {
    setKlingSelected(p => {
      if (p.includes(idx)) return p.filter(i => i !== idx)
      if (p.length >= 2) return p
      return [...p, idx].sort()
    })
  }

  async function handleGenerate() {
    if (generateBusyRef.current) return
    if (refEntries.length === 0 && outfitEntries.length === 0) return
    generateBusyRef.current = true
    setPlanError(''); setPlan(null)
    setResults([null, null, null, null]); setErrors([null, null, null, null]); setKlingSelected([])
    setLoading([false, false, false, false])

    setPlanning(true)

    let refFiles
    let outfitFiles
    let poseFile
    let bgFile
    try {
      refFiles    = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
      outfitFiles = await Promise.all(outfitEntries.map((e, i) => entryToFile(e, `outfit-${i}.jpg`)))
      poseFile    = poseEntries[0] ? await entryToFile(poseEntries[0], 'pose.jpg') : null
      bgFile      = bgEntry ? await entryToFile(bgEntry, 'bg.jpg') : null
    } catch (err) {
      setPlanError(`Lỗi xử lý ảnh đầu vào: ${err.message}`)
      setPlanning(false)
      generateBusyRef.current = false
      return
    }
    const analysisImgs = [...refFiles, ...outfitFiles, ...(poseFile ? [poseFile] : []), ...(bgFile ? [bgFile] : [])].slice(0, 6)

    let scenePlan
    try {
      const bgNote = bgFile
        ? '\n\nBACKGROUND: User has provided a background reference photo (last image). Use it as the locked background for all 3 scenes — describe it precisely and replicate it exactly.'
        : bgPreset ? `\n\nBACKGROUND INSTRUCTION: User wants: "${bgPreset}". Use this as the locked background.` : ''
      const poseNote = poseFile ? '\n\nPOSE REFERENCE: A body pose reference photo is included. Use this pose as the base body positioning for all scenes — the stance, arm positions, leg placement, and overall posture structure. Adapt naturally to each scene energy but keep the fundamental pose.' : ''
      const moodNote = mood !== '🤖 AI tự chọn' ? `\n\nMOOD: "${mood}"` : ''
      const raw = await callGemini({ prompt: BRAIN_PHOIDО_PLAN + bgNote + poseNote + moodNote, images: analysisImgs, temperature: 0.3, maxTokens: 4096 })
      scenePlan = parseJSON(raw)
      setPlan(scenePlan)
      setPlanExpanded(true)
    } catch (err) {
      setPlanError(`Lỗi lên kế hoạch: ${err.message}`)
      setPlanning(false)
      generateBusyRef.current = false
      return
    }
    setPlanning(false)

    setGenerating(true)
    try {
      const genRefs = [...refFiles, ...outfitFiles, ...(poseFile ? [poseFile] : []), ...(bgFile ? [bgFile] : [])].slice(0, 5)
      const mainImg = outfitFiles[0] || refFiles[0]
      for (let i = 0; i < 4; i++) {
        setLoading(p => { const n = [...p]; n[i] = true; return n })
        try {
          const prompt = buildScenePrompt(scenePlan, i, quality, aspect, bgPreset, mood, !!bgFile, !!poseFile)
          const result = await generateGarmentImage(mainImg, prompt, { quality, aspect, referenceFiles: genRefs })
          setResults(p => { const n = [...p]; n[i] = result; return n })
          setErrors(p => { const n = [...p]; n[i] = null; return n })
        } catch (err) { setErrors(p => { const n = [...p]; n[i] = err.message; return n }) }
        setLoading(p => { const n = [...p]; n[i] = false; return n })
      }
    } finally {
      setGenerating(false)
      generateBusyRef.current = false
    }
  }

  async function retryScene(idx) {
    if (!plan) return
    const refFiles    = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
    const outfitFiles = await Promise.all(outfitEntries.map((e, i) => entryToFile(e, `outfit-${i}.jpg`)))
    const poseFileR   = poseEntries[0] ? await entryToFile(poseEntries[0], 'pose.jpg') : null
    const bgFile      = bgEntry ? await entryToFile(bgEntry, 'bg.jpg') : null
    const genRefs = [...refFiles, ...outfitFiles, ...(poseFileR ? [poseFileR] : []), ...(bgFile ? [bgFile] : [])].slice(0, 5)
    const mainImg = outfitFiles[0] || refFiles[0]
    setLoading(p => { const n = [...p]; n[idx] = true; return n })
    setErrors(p => { const n = [...p]; n[idx] = null; return n })
    try {
      const prompt = buildScenePrompt(plan, idx, quality, aspect, bgPreset, mood, !!bgFile, !!poseFileR)
      const result = await generateGarmentImage(mainImg, prompt, { quality, aspect, referenceFiles: genRefs })
      setResults(p => { const n = [...p]; n[idx] = result; return n })
    } catch (err) { setErrors(p => { const n = [...p]; n[idx] = err.message; return n }) }
    setLoading(p => { const n = [...p]; n[idx] = false; return n })
  }

  async function saveKlingFrames() {
    for (const idx of klingSelected) {
      const r = results[idx]; if (!r) continue
      const folderId = await getOrCreateFolder('Phối Đồ')
      const record = createLibraryRecord({
        name: `Kling Frame ${idx + 1} · ${new Date().toLocaleDateString('vi-VN')}`,
        type: 'outfit', category: 'phoi-do',
        imageSrc: `data:${r.mimeType};base64,${r.base64}`,
        source: 'phoi-do', folderId,
      })
      saveToLibrary(record)
    }
    alert('Đã lưu 2 Kling frame vào Thư Viện → folder "Phối Đồ".\nSang Kling AI Fashion → Multi-Shot 15s để tạo video!')
  }

  const canGenerate  = (refEntries.length > 0 || outfitEntries.length > 0) && !planning && !generating
  const hasAnyResult = results.some(Boolean)
  const klingReady   = klingSelected.length === 2

  /* ─── RENDER ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: C.bg0, minHeight: '100vh', margin: '-32px', padding: '0 0 100px' }}>
      <style>{CSS}</style>

      {pickerOpen && <LibraryPickerModal onSelect={handlePickLibrary} onClose={() => setPickerOpen(false)} />}
      <input ref={refInput}    type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'ref');    e.target.value = '' }} />
      <input ref={outfitInput} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'outfit'); e.target.value = '' }} />
      <input ref={poseInput}   type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'pose');   e.target.value = '' }} />
      <input ref={bgInput}     type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'bg');     e.target.value = '' }} />

      {/* ═══ HERO HEADER ═══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.re} 0%, #a01010 30%, #1a0808 60%, ${C.bg0} 100%)`,
        padding: '36px 32px 28px',
        marginBottom: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative glows */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(249,115,22,0.15)', filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: 80,
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(220,38,38,0.12)', filter: 'blur(50px)', pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              Phối Đồ
            </h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { t: '4 phân cảnh', c: '#fb923c' },
                { t: 'Face Lock 100%', c: '#f87171' },
                { t: 'Nền cố định', c: '#60a5fa' },
                { t: 'POSE tham chiếu', c: '#fbbf24' },
                { t: 'KOL → Ống kính', c: '#e879f9' },
                { t: 'Quay lưng Scene 4', c: '#4ade80' },
                { t: 'Kling-ready', c: '#e879f9' },
              ].map(tag => (
                <span key={tag.t} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: tag.c,
                  background: 'rgba(255,255,255,0.08)',
                  border: `1px solid rgba(255,255,255,0.15)`,
                  padding: '3px 9px', borderRadius: 20,
                  backdropFilter: 'blur(4px)',
                }}>{tag.t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 0' }}>

      {/* ═══ SECTION 1: ASSETS ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Tài nguyên đầu vào
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 0.6fr', gap: 20 }}>
          {/* KOL */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>
              KOL / Người mẫu <span style={{ color: C.t3, fontWeight: 400, fontSize: 11 }}>(tối đa 3)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[0,1,2].map(i => (
                <Slot key={i}
                  src={refEntries[i]?.url}
                  label={i === 0 && refEntries[0] ? 'KOL' : null}
                  onRemove={() => setRefEntries(p => p.filter((_,j) => j !== i))}
                  onUpload={() => refInput.current.click()}
                  onLibrary={() => openPicker('ref')}
                />
              ))}
            </div>
          </div>
          {/* Outfit */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>
              Trang phục <span style={{ color: C.t3, fontWeight: 400, fontSize: 11 }}>(tối đa 2)</span>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[0,1].map(i => (
                <Slot key={i}
                  src={outfitEntries[i]?.url}
                  label={i === 0 && outfitEntries[0] ? 'OUTFIT' : null}
                  onRemove={() => setOutfitEntries(p => p.filter((_,j) => j !== i))}
                  onUpload={() => outfitInput.current.click()}
                  onLibrary={() => openPicker('outfit')}
                />
              ))}
            </div>
          </div>
          {/* Pose */}
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1, display: 'flex', alignItems: 'center', gap: 6 }}>
              Dáng Pose
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                color: '#fbbf24', background: 'rgba(251,191,36,0.12)',
                border: '1px solid rgba(251,191,36,0.3)',
                padding: '2px 7px', borderRadius: 20,
              }}>TUỲ CHỌN</span>
            </p>
            <div style={{ maxWidth: 90 }}>
              <Slot
                src={poseEntries[0]?.url}
                label={poseEntries[0] ? 'POSE' : null}
                onRemove={() => setPoseEntries([])}
                onUpload={() => poseInput.current.click()}
                onLibrary={() => openPicker('pose')}
              />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.5 }}>
              Ảnh tham chiếu dáng đứng / tư thế của KOL
            </p>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 2: BACKGROUND ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Hậu cảnh <span style={{ color: C.t3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— cố định cả 3 phân cảnh</span>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: bgEntry ? '100px 1fr' : '80px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Left: upload/preview */}
          <div>
            {bgEntry ? (
              <div className="pd-slot" style={{
                position: 'relative', aspectRatio: '1', borderRadius: 10,
                overflow: 'hidden', border: `2px solid ${C.or}`,
              }}>
                <img src={bgEntry.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setBgEntry(null)} style={{
                  position: 'absolute', top: 4, right: 4, width: 20, height: 20,
                  borderRadius: 5, background: 'rgba(0,0,0,.7)', border: 'none',
                  color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center',
                }}><X size={9} /></button>
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: C.or, color: '#fff', fontSize: 7, fontWeight: 800,
                  textAlign: 'center', padding: '2.5px 0', letterSpacing: '0.08em',
                }}>ƯU TIÊN #1</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => bgInput.current.click()} className="pd-slot" style={{
                  width: '100%', padding: '12px 0', borderRadius: 10,
                  border: `1px dashed ${C.b2}`, background: C.bg2,
                  color: C.t3, cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 5,
                }}>
                  <Upload size={15} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
                </button>
                <button onClick={() => openPicker('bg')} className="pd-slot" style={{
                  width: '100%', padding: '8px 0', borderRadius: 10,
                  border: `1px dashed ${C.b2}`, background: C.bg2,
                  color: C.t3, cursor: 'pointer', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9,
                }}>
                  <BookImage size={12} />
                  <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.t3 }}>
                {bgEntry ? 'Ảnh upload sẽ được ưu tiên.' : 'Hoặc chọn nền:'}
              </span>
              {bgPreset && !bgEntry && (
                <button onClick={() => setBgPreset('')} style={{
                  background: 'none', border: 'none', color: C.t3, cursor: 'pointer',
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 3,
                }}><X size={10} /> Bỏ</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(bgPresetExpanded ? BG_PRESETS : BG_PRESETS.slice(0, 4)).map(p => {
                const on = bgPreset === p
                return (
                  <button key={p} onClick={() => setBgPreset(on ? '' : p)} className="pd-bg-opt" style={{
                    padding: '7px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer',
                    border: on ? `1px solid ${C.or}` : `1px solid ${C.b1}`,
                    background: on ? C.orBg : 'transparent',
                    color: on ? C.or : C.t3, fontSize: 11, fontWeight: on ? 600 : 400,
                    opacity: bgEntry ? 0.35 : 1,
                  }}>{p}</button>
                )
              })}
              <button onClick={() => setBgPresetExpanded(p => !p)} style={{
                padding: '5px 12px', borderRadius: 8, border: `1px dashed ${C.b1}`,
                background: 'transparent', color: C.t3, cursor: 'pointer',
                fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {bgPresetExpanded ? <><ChevronUp size={11} /> Thu gọn</> : <><ChevronDown size={11} /> +{BG_PRESETS.length - 4} nền</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SECTION 3: SETTINGS ═══ */}
      <div className="pd-card" style={{ padding: '20px 18px', marginBottom: 20 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Cấu hình
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          {/* Quality */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Chất lượng</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {QUALITY_OPTS.map(q => {
                const on = quality === q
                return (
                  <button key={q} onClick={() => setQuality(q)} className="pd-pill" style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                    border: on ? `1.5px solid ${C.or}` : `1px solid ${C.b2}`,
                    background: on ? C.orBg : C.bg2, color: on ? C.or : C.t3,
                    fontSize: 12, fontWeight: on ? 700 : 400,
                  }}>{q}</button>
                )
              })}
            </div>
          </div>
          {/* Mood */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Phong cách</p>
            <div style={{ position: 'relative' }}>
              <select value={mood} onChange={e => setMood(e.target.value)} style={{
                width: '100%', padding: '9px 12px', borderRadius: 10, appearance: 'none',
                border: `1px solid ${mood !== '🤖 AI tự chọn' ? C.orBd : C.b2}`,
                background: C.bg2, color: mood !== '🤖 AI tự chọn' ? C.or : C.t3,
                fontSize: 12, cursor: 'pointer', fontWeight: mood !== '🤖 AI tự chọn' ? 600 : 400,
              }}>
                {MOOD_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.t3, pointerEvents: 'none' }} />
            </div>
          </div>
        </div>

        {/* Aspect */}
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Tỷ lệ ảnh</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASPECT_OPTS.map(opt => {
              const on = aspect === opt.v
              return (
                <button key={opt.v} onClick={() => setAspect(opt.v)} className="pd-pill" style={{
                  padding: '7px 14px', borderRadius: 10, cursor: 'pointer',
                  border: on ? `1.5px solid ${C.or}` : `1px solid ${C.b2}`,
                  background: on ? C.orBg : C.bg2, color: on ? C.or : C.t3,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{opt.label}</div>
                  <div style={{ fontSize: 9, opacity: .6, marginTop: 1 }}>{opt.sub}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ GENERATE BUTTON ═══ */}
      <button className="pd-gen" onClick={handleGenerate} disabled={!canGenerate} style={{
        width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
        cursor: canGenerate ? 'pointer' : 'not-allowed',
        background: canGenerate
          ? `linear-gradient(135deg, ${C.re}, #c02020, ${C.or}, #fb923c)`
          : C.bg2,
        backgroundSize: '200% auto',
        animation: (planning || generating) ? 'shimmer 2s linear infinite' : 'none',
        color: canGenerate ? '#fff' : C.t3,
        fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: canGenerate ? '0 4px 28px rgba(220,38,38,0.35)' : 'none',
        marginBottom: 20,
      }}>
        {planning ? (
          <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />Đang lên kế hoạch...</>
        ) : generating ? (
          <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />Rendering {results.filter(Boolean).length}/4...</>
        ) : (
          <><Zap size={16} />Tạo 4 Phân Cảnh · {quality} · {aspect}</>
        )}
      </button>

      {planError && (
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,.06)', border: `1px solid rgba(239,68,68,.2)`,
          color: C.red, fontSize: 13,
        }}>{planError}</div>
      )}

      {/* ═══ AI PLAN PREVIEW ═══ */}
      {plan && (
        <div className="pd-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <button onClick={() => setPlanExpanded(p => !p)} style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: planExpanded ? 14 : 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Kế hoạch AI
            </span>
            {planExpanded ? <ChevronUp size={14} style={{ color: C.t3 }} /> : <ChevronDown size={14} style={{ color: C.t3 }} />}
          </button>
          {planExpanded && (
            <>
              <div style={{
                padding: '12px 16px', borderRadius: 10, marginBottom: 12,
                background: C.bg2, borderLeft: `3px solid ${C.bl}`,
              }}>
                <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: C.bl, letterSpacing: '0.08em' }}>LOCKED BACKGROUND</p>
                <p style={{ margin: 0, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{plan.lockedBackground}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                {plan.scenes?.map((sc, i) => {
                  const accent = [C.s1, C.s2, C.s3][i]
                  return (
                    <div key={i} style={{
                      background: C.bg2, borderRadius: 10, padding: '10px 12px',
                      borderTop: `2px solid ${accent}`,
                    }}>
                      <p style={{ margin: '0 0 3px', fontSize: 9, fontWeight: 800, color: accent, letterSpacing: '0.08em' }}>
                        SCENE {sc.num}
                      </p>
                      <p style={{ margin: '0 0 3px', fontSize: 11, fontWeight: 700, color: C.t1 }}>{sc.name}</p>
                      <p style={{ margin: 0, fontSize: 10, color: C.t3, lineHeight: 1.4 }}>{sc.klingNote}</p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ RESULTS ═══ */}
      {(hasAnyResult || loading.some(Boolean) || errors.some(Boolean)) && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.t1 }}>3 Phân Cảnh</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: C.t3 }}>
                Bấm <Video size={10} style={{ verticalAlign: 'middle', color: C.fu }} /> chọn 2 frame → Kling video
              </p>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {[0,1,2].map(i => {
                const accent = [C.s1, C.s2, C.s3][i]
                return (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: results[i] ? accent : loading[i] ? `${accent}50` : C.b2,
                    border: `1.5px solid ${results[i] || loading[i] ? accent : C.b2}`,
                    transition: 'all .3s',
                  }} />
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {[0,1,2,3].map(i => (
              <SceneCard key={i} idx={i}
                scene={plan?.scenes?.[i]} result={results[i]}
                isLoading={loading[i]} error={errors[i]}
                klingSelected={klingSelected.includes(i)}
                onToggleKling={() => toggleKling(i)}
                onRetry={() => retryScene(i)}
                onDownload={() => results[i] && downloadImage(
                  `data:${results[i].mimeType};base64,${results[i].base64}`,
                  `phoi-do-${i + 1}-${Date.now()}.jpg`
                )}
              />
            ))}
          </div>

          {/* Kling CTA */}
          {klingReady && (
            <div style={{
              padding: '16px 20px', borderRadius: 14,
              background: C.fuBg, border: `1px solid ${C.fuBd}`,
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: C.t1 }}>
                  {klingSelected.length} Kling frames sẵn sàng
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: C.t3 }}>
                  Lưu → Thư Viện → Kling AI Fashion → Multi-Shot 15s
                </p>
              </div>
              <button onClick={saveKlingFrames} style={{
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.fu}, #a855f7)`,
                color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: '0.04em',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
                boxShadow: '0 4px 16px rgba(217,70,239,0.25)',
              }}>
                <Video size={14} /> LƯU KLING
              </button>
            </div>
          )}
          {klingSelected.length === 1 && (
            <p style={{ textAlign: 'center', fontSize: 11, color: C.t3, marginTop: 10 }}>
              Chọn thêm 1 phân cảnh để tạo cặp frame Kling
            </p>
          )}
        </div>
      )}
      </div>{/* end content wrapper */}
    </div>
  )
}
