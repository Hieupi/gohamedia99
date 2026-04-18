/**
 * PhoiDoLotPage.jsx — Phối Đồ Lót  ·  Premium Dark
 * v3 — Prompt-only mode for Comfy UI / Flux Klein Edit
 */
import { useState, useRef } from 'react'
import {
  Upload, Sparkles, Copy, X, Check,
  BookImage, ChevronDown, ChevronUp, Zap, PenLine,
  Download, RotateCcw,
} from 'lucide-react'
import LibraryPickerModal from '../components/LibraryPickerModal'
import { callGemini } from '../services/geminiService'
import { downloadImageAsBlob } from '../services/cloudStorageService'

const C = {
  bg0: '#131318', bg1: '#1c1c24', bg2: '#25252f', bg3: '#2e2e3a',
  b1: '#2e2e38', b2: '#45455a', b3: '#5a5a72',
  t1: '#fafafa', t2: '#a1a1aa', t3: '#71717a',
  pk: '#ec4899', pkL: '#f472b6', pkBg: 'rgba(236,72,153,0.10)', pkBd: 'rgba(236,72,153,0.30)',
  or: '#f97316', orBg: 'rgba(249,115,22,0.08)', orBd: 'rgba(249,115,22,0.25)',
  bl: '#3b82f6', blBg: 'rgba(59,130,246,0.08)',
  fu: '#d946ef', fuBg: 'rgba(217,70,239,0.08)', fuBd: 'rgba(217,70,239,0.25)',
  s1: '#ec4899', s2: '#8b5cf6', s3: '#f97316',
  green: '#22c55e', red: '#ef4444',
}

const ASPECT_OPTS = [
  { v: '9:16', label: '9:16', sub: 'Story' },
  { v: '3:4',  label: '3:4',  sub: 'Portrait' },
  { v: '4:5',  label: '4:5',  sub: 'Feed' },
  { v: '1:1',  label: '1:1',  sub: 'Vuông' },
]
const SCENE_PRESETS = [
  { id: 'bedroom_boudoir', label: 'Phòng ngủ Boudoir', desc: 'Trắng mềm, ánh sáng vàng ấm, ga trải giường xốp', emoji: '🛏️' },
  { id: 'hotel_luxury',    label: 'Khách sạn Sang trọng', desc: 'Ga trắng sọc, đầu giường gỗ tối, đèn beside', emoji: '🏨' },
  { id: 'minimal_studio',  label: 'Studio Tối giản', desc: 'Nền trắng seamless, ánh sáng đều, phong cách catalog', emoji: '⚪' },
  { id: 'cozy_home',       label: 'Phòng ngủ Ấm cúng', desc: 'Chăn knit, gối rải, nội thất gỗ ấm, cây xanh', emoji: '🏡' },
  { id: 'bathroom_mood',   label: 'Phòng tắm Spa', desc: 'Marble trắng, khăn mềm, nến, hơi nước nhẹ', emoji: '🛁' },
]
const MOOD_OPTS = [
  'AI tự chọn',
  'Morning Soft — Ánh sáng sáng sớm, tươi mát',
  'Golden Glamour — Hoàng hôn, sang trọng, cinematic',
  'Evening Intimate — Đèn ấm, bí ẩn, quyến rũ',
  'Fresh Minimal — Sáng đều, sạch, tự nhiên',
]
const SCENE_NAMES = ['Hero Lookbook', 'Close-up Detail', 'Portrait Lifestyle', 'Back Detail']

const BRAIN_PROMPT = `You are a fashion photography prompt engineer for Comfy UI / Flux Klein Edit.

You receive images of: KOL reference, lingerie product (full set or separate pieces), optional accessories, optional pose reference, optional background.

═══ TASK ═══
Analyze all images and output exactly 4 scene prompts as structured JSON. Keep subject identity, clothing, and background CONSISTENT across all 4 scenes. Only vary: pose, expression, photography angle/shot.

═══ 4 SCENES ═══
Scene 1 "Hero Lookbook" — standing or seated elegant fashion pose showing complete set. Full body shot, slightly high angle.
Scene 2 "Close-up Detail" — medium close-up from waist up. Emphasize bra fit, lace texture, strap details.
Scene 3 "Portrait Lifestyle" — face and upper chest portrait. Beauty lighting, lifestyle feeling, emotional expression.
Scene 4 "Back Detail" — back view. Highlight back closure, strap architecture, panty back details.

═══ TEMPLATE — FOLLOW THIS EXACTLY ═══
Each scene prompt MUST match this structure field-by-field. Do NOT add or remove fields. Fill every field with specific descriptive English values.

{
  "subject": {
    "description": "beautiful young East Asian woman early 20s with long jet black hair lying seductively on back on soft white fluffy bed",
    "mirror_rules": "",
    "age": "early 20s",
    "expression": {
      "eyes": { "look": "seductive", "energy": "alluring intense", "direction": "looking up at viewer" },
      "mouth": { "position": "slightly parted glossy lips", "energy": "teasing smile" },
      "overall": "sensual and inviting"
    },
    "face": { "preserve_original": true, "makeup": "natural with glossy pink lips and subtle eye makeup" },
    "hair": { "color": "jet black", "style": "long straight hair spread out on bedding", "effect": "silky flowing strands" },
    "body": {
      "frame": "slim toned", "waist": "narrow", "chest": "full breasts", "legs": "long legs bent and raised at knees",
      "skin": { "visible_areas": "torso arms thighs", "tone": "fair smooth Asian skin", "texture": "silky soft that feels warm and smooth to the touch", "lighting_effect": "gentle natural highlights accentuating curves" }
    },
    "pose": { "position": "lying on back", "base": "on white fluffy blanket", "overall": "reclining seductive pose with arms near head and legs playfully elevated, slight natural tilt" },
    "clothing": {
      "top": { "type": "strappy harness bra", "color": "black", "details": "triangle cups with black floral appliques and thin straps", "effect": "revealing intricate" },
      "bottom": { "type": "matching strappy panties and garters", "color": "black", "details": "complex harness straps with bows and thigh bands", "effect": "revealing intricate" }
    }
  },
  "accessories": { "jewelry": "small silver earrings", "other": "" },
  "photography": {
    "camera_style": "realistic high-angle boudoir smartphone photo",
    "angle": "overhead top-down view",
    "shot_type": "full body from above focusing on torso and face",
    "aspect_ratio": "portrait",
    "texture": "sharp details soft fabric and skin texture",
    "lighting": "soft diffused bedroom lighting with natural shadows",
    "depth_of_field": "shallow focus on subject"
  },
  "background": { "setting": "bedroom bed", "elements": ["white fluffy textured blanket", "light wooden floor edge"], "atmosphere": "intimate private bedroom", "lighting": "soft ambient" },
  "the_vibe": { "energy": "seductive relaxed", "mood": "sensual intimate", "aesthetic": "erotic boudoir", "authenticity": "natural lifestyle photo with organic imperfections", "intimacy": "high teasing connection", "story": "confident woman in lingerie inviting gaze while lying comfortably in bed", "caption_energy": "come hither look in soft sheets" },
  "constraints": { "safety": "commercial fashion editorial suitable for social media advertising", "quality": "hyper-realistic sharp details professional photography", "style": "elegant classy empowering confident vibe" }
}

═══ OUTPUT FORMAT — STRICT JSON (no markdown fences, no extra text) ═══
{
  "kol_analysis": { "gender": "", "age_range": "", "skin_tone": "", "hair": "", "face_features": "", "body_type": "" },
  "lingerie_analysis": {
    "set_overview": "",
    "top": { "type": "", "color": "", "fabric": "", "details": "" },
    "bottom": { "type": "", "color": "", "fabric": "", "details": "" },
    "accessories": ""
  },
  "scenes": [
    {
      "name": "Hero Lookbook",
      "prompt": {
        "subject": {
          "description": "", "mirror_rules": "", "age": "",
          "expression": { "eyes": { "look": "", "energy": "", "direction": "" }, "mouth": { "position": "", "energy": "" }, "overall": "" },
          "face": { "preserve_original": true, "makeup": "" },
          "hair": { "color": "", "style": "", "effect": "" },
          "body": { "frame": "", "waist": "", "chest": "", "legs": "", "skin": { "visible_areas": "", "tone": "", "texture": "", "lighting_effect": "" } },
          "pose": { "position": "", "base": "", "overall": "" },
          "clothing": { "top": { "type": "", "color": "", "details": "", "effect": "" }, "bottom": { "type": "", "color": "", "details": "", "effect": "" } }
        },
        "accessories": { "jewelry": "", "other": "" },
        "photography": { "camera_style": "", "angle": "", "shot_type": "", "aspect_ratio": "", "texture": "", "lighting": "", "depth_of_field": "" },
        "background": { "setting": "", "elements": [], "atmosphere": "", "lighting": "" },
        "the_vibe": { "energy": "", "mood": "", "aesthetic": "", "authenticity": "", "intimacy": "", "story": "", "caption_energy": "" },
        "constraints": { "safety": "commercial fashion editorial suitable for social media advertising", "quality": "hyper-realistic sharp details professional photography", "style": "elegant classy empowering confident vibe" }
      }
    },
    { "name": "Close-up Detail", "prompt": { ... same structure ... } },
    { "name": "Portrait Lifestyle", "prompt": { ... same structure ... } },
    { "name": "Back Detail", "prompt": { ... same structure ... } }
  ]
}

═══ RULES ═══
1. face.preserve_original = true in every scene
2. subject.description must be vivid and specific like the template example — NOT generic
3. clothing must match product images EXACTLY (color, type, fabric, details)
4. clothing.top and clothing.bottom MUST include "effect" field
5. Background is LOCKED — same across ALL 4 scenes
6. Only vary between scenes: subject.pose, subject.expression, photography
7. All text in English
8. skin.texture must be tactile and sensory
9. expression.eyes MUST have look, energy, direction
10. expression.mouth MUST have position AND energy
11. the_vibe MUST have ALL 7 fields filled
12. Output valid JSON only — no markdown fences, no extra text
13. Every field must be filled — no empty strings, no generic fillers
14. accessories MUST include both "jewelry" and "other" fields`

const CSS = `
  @keyframes spin { to { transform: rotate(360deg) } }
  @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
  .lot-card { background: ${C.bg1}; border: 1px solid ${C.b1}; border-radius: 16px; transition: border-color 0.25s, box-shadow 0.25s; }
  .lot-card:hover { border-color: ${C.b2}; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .lot-prompt-card { animation: fadeUp 0.45s ease both; }
  .lot-prompt-card:nth-child(2) { animation-delay: 80ms }
  .lot-prompt-card:nth-child(3) { animation-delay: 160ms }
  .lot-prompt-card:nth-child(4) { animation-delay: 240ms }
  .lot-gen { transition: transform 0.15s, box-shadow 0.25s, filter 0.2s; }
  .lot-gen:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(236,72,153,0.45); filter: brightness(1.08); }
  .lot-gen:active:not(:disabled) { transform: translateY(0); }
  .lot-slot { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
  .lot-slot:hover { border-color: ${C.b3} !important; box-shadow: 0 4px 16px rgba(0,0,0,0.3); transform: translateY(-2px); }
  .lot-pill { transition: all 0.2s ease; }
  .lot-pill:hover { border-color: ${C.b3} !important; background: ${C.bg3} !important; }
  .lot-scene-opt { transition: all 0.15s ease; }
  .lot-scene-opt:hover { border-color: ${C.b3} !important; background: ${C.bg3} !important; }
  .lot-action { transition: background 0.15s, color 0.15s; }
  .lot-action:hover { background: rgba(255,255,255,0.04) !important; color: ${C.t1} !important; }
`

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
    if (m) try { return JSON.parse(m[0]) } catch { /* */ }
    throw new Error('AI không trả về JSON hợp lệ.')
  }
}

async function callPlanning(prompt, images, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (images.length > 0 && attempt === 0) {
        return await callGemini({ prompt, images, temperature: 0.3, maxTokens: 8192 })
      }
      return await callGemini({ prompt, images: [], temperature: 0.3, maxTokens: 8192 })
    } catch (err) {
      const msg = (err.message || '').toLowerCase()
      const isImageError = msg.includes('does not support image') || msg.includes('image input') || msg.includes('cannot read')
      if (isImageError && images.length > 0 && attempt === 0) {
        continue
      }
      if (attempt < maxRetries) continue
      throw err
    }
  }
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Slot({ src, onRemove, onUpload, onLibrary, label }) {
  if (src) {
    return (
      <div className="lot-slot" style={{ position: 'relative', aspectRatio: '1', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.b2}` }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <button onClick={onRemove} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={10} /></button>
        {label && <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', background: C.pk, padding: '2px 7px', borderRadius: 4 }}>{label}</span>}
      </div>
    )
  }
  return (
    <div className="lot-slot" style={{ aspectRatio: '1', borderRadius: 12, border: `1px dashed ${C.b2}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg2 }}>
      <button onClick={onUpload} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: C.t3 }}>
        <Upload size={14} strokeWidth={2.5} /><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
      </button>
      <div style={{ height: 1, background: C.b1, margin: '0 12px' }} />
      <button onClick={onLibrary} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: C.t3 }}>
        <BookImage size={13} strokeWidth={2.5} /><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
      </button>
    </div>
  )
}

function CombinedSlot({ entries, onRemove, onUpload, onLibrary, labels }) {
  if (entries.length > 0) {
    return (
      <div className="lot-slot" style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.b2}`, background: C.bg2 }}>
        <div style={{ display: 'grid', gridTemplateColumns: entries.length === 1 ? '1fr' : '1fr 1fr', gap: 2 }}>
          {entries.map((entry, i) => (
            <div key={i} style={{ position: 'relative', aspectRatio: '3/4', overflow: 'hidden' }}>
              <img src={entry.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)', pointerEvents: 'none' }} />
              <button onClick={() => onRemove(i)} style={{ position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={10} /></button>
              {labels?.[i] && <span style={{ position: 'absolute', bottom: 6, left: 6, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#fff', background: C.pk, padding: '2px 7px', borderRadius: 4 }}>{labels[i]}</span>}
            </div>
          ))}
        </div>
        {entries.length < 2 && (
          <button onClick={onUpload} style={{ width: '100%', padding: '10px 0', background: C.bg1, border: 'none', borderTop: `1px solid ${C.b1}`, color: C.t3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Upload size={12} /> Thêm ảnh
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="lot-slot" style={{ aspectRatio: '3/4', borderRadius: 12, border: `1px dashed ${C.b2}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: C.bg2 }}>
      <button onClick={onUpload} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: C.t3 }}>
        <Upload size={16} strokeWidth={2.5} /><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
      </button>
      <div style={{ height: 1, background: C.b1, margin: '0 12px' }} />
      <button onClick={onLibrary} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: C.t3 }}>
        <BookImage size={14} strokeWidth={2.5} /><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
      </button>
    </div>
  )
}

function ScenePromptCard({ idx, prompt, sceneName, onUpdate }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const accent = [C.s1, C.s2, C.s3, C.green][idx]

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(prompt, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleDownload() {
    downloadJson(prompt, `phoi-do-lot-scene-${idx + 1}-${Date.now()}.json`)
  }

  function startEdit() {
    setEditText(JSON.stringify(prompt, null, 2))
    setEditing(true)
  }

  function saveEdit() {
    try {
      const parsed = JSON.parse(editText)
      onUpdate(idx, parsed)
      setEditing(false)
    } catch {
      alert('JSON không hợp lệ. Vui lòng kiểm tra lại.')
    }
  }

  if (!prompt) return null

  return (
    <div className="lot-prompt-card" style={{ borderRadius: 14, overflow: 'hidden', background: C.bg1, border: `1px solid ${C.b1}` }}>
      <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.b1}` }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: accent, opacity: 0.15, lineHeight: 1, fontVariantNumeric: 'tabular-nums', fontFamily: 'system-ui' }}>0{idx + 1}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.t1 }}>{sceneName}</p>
          <p style={{ margin: '2px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prompt.subject?.description?.slice(0, 80)}...</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${C.b1}` }}>
        <button onClick={handleCopy} className="lot-action" style={{ flex: 1, padding: '9px 0', background: copied ? 'rgba(34,197,94,.08)' : 'transparent', border: 'none', borderRight: `1px solid ${C.b1}`, color: copied ? C.green : C.t3, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 600 }}>
          {copied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy JSON</>}
        </button>
        <button onClick={handleDownload} className="lot-action" style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', borderRight: `1px solid ${C.b1}`, color: C.t3, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 600 }}>
          <Download size={12} /> Download .json
        </button>
        <button onClick={() => setOpen(p => !p)} className="lot-action" style={{ flex: 1, padding: '9px 0', background: 'transparent', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontWeight: 600 }}>
          {open ? <><ChevronUp size={12} /> Thu gọn</> : <><ChevronDown size={12} /> Xem chi tiết</>}
        </button>
      </div>

      {open && (
        <div style={{ padding: '12px 14px' }}>
          {!editing ? (
            <div style={{ position: 'relative' }}>
              <pre style={{ margin: 0, padding: '14px 16px', background: C.bg0, borderRadius: 10, border: `1px solid ${C.b1}`, color: C.t2, fontSize: 11, lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 500, overflow: 'auto', fontFamily: 'inherit' }}>
                {JSON.stringify(prompt, null, 2)}
              </pre>
              <button onClick={startEdit} style={{ position: 'absolute', top: 8, right: 8, padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.b2}`, background: C.bg2, color: C.t3, cursor: 'pointer', fontSize: 10, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <PenLine size={10} /> Edit
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: '100%', minHeight: 300, background: C.bg0, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '12px 14px', color: C.t1, fontSize: 11, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'monospace' }} />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button onClick={() => setEditing(false)} style={{ padding: '7px 16px', borderRadius: 7, border: `1px solid ${C.b2}`, background: 'none', color: C.t3, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Huỷ</button>
                <button onClick={() => { const result = saveEdit(); if (result !== null) { /* parent will handle */ } }} style={{ padding: '7px 16px', borderRadius: 7, border: 'none', background: `linear-gradient(90deg, ${C.pk}, ${C.fu})`, color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Check size={11} /> Lưu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function PhoiDoLotPage() {
  const [refEntries, setRefEntries]         = useState([])
  const [lingerieEntries, setLingerieEntries] = useState([])
  const [accessoryEntries, setAccessoryEntries] = useState([])
  const [poseEntries, setPoseEntries]       = useState([])
  const [bgEntry, setBgEntry]               = useState(null)
  const [scenePresetId, setScenePresetId] = useState('bedroom_boudoir')
  const [sceneExpanded, setSceneExpanded] = useState(false)
  const [storyline, setStoryline]         = useState('')

  const [aspect, setAspect]   = useState('9:16')
  const [mood, setMood]       = useState('AI tự chọn')

  const [plan, setPlan]               = useState(null)
  const [planning, setPlanning]       = useState(false)
  const [planExpanded, setPlanExpanded] = useState(false)
  const [prompts, setPrompts]         = useState([null, null, null, null])
  const [planError, setPlanError]     = useState('')

  const [pickerOpen, setPickerOpen]     = useState(false)
  const [pickerTarget, setPickerTarget] = useState(null)

  const refInput       = useRef()
  const lingerieInput  = useRef()
  const accessoryInput = useRef()
  const poseInput      = useRef()
  const bgInput        = useRef()
  const busyRef     = useRef(false)

  function addFiles(files, type) {
    const entries = Array.from(files).map(f => ({ file: f, url: URL.createObjectURL(f) }))
    if (type === 'ref')       setRefEntries(p => [...p, ...entries].slice(0, 2))
    if (type === 'lingerie')  setLingerieEntries(p => [...p, ...entries].slice(0, 2))
    if (type === 'accessory') setAccessoryEntries(p => [...p, ...entries].slice(0, 2))
    if (type === 'pose')      setPoseEntries(p => [...p, ...entries].slice(0, 1))
    if (type === 'bg')        setBgEntry(entries[0] || null)
  }
  function openPicker(type) { setPickerTarget(type); setPickerOpen(true) }
  function handlePickLibrary(item) {
    const entry = { url: item.imageSrc || item.url, file: null }
    if (pickerTarget === 'ref')       setRefEntries(p => [...p, entry].slice(0, 2))
    if (pickerTarget === 'lingerie')  setLingerieEntries(p => [...p, entry].slice(0, 2))
    if (pickerTarget === 'accessory') setAccessoryEntries(p => [...p, entry].slice(0, 2))
    if (pickerTarget === 'pose')      setPoseEntries(p => [...p, entry].slice(0, 1))
    if (pickerTarget === 'bg')        setBgEntry(entry)
    setPickerOpen(false)
  }

  async function handleGenerate() {
    if (busyRef.current) return
    if (refEntries.length === 0 && lingerieEntries.length === 0) return
    busyRef.current = true
    setPlanError(''); setPlan(null); setPrompts([null, null, null, null])
    setPlanning(true)

    let refFiles, lingerieFiles, accessoryFiles, poseFile, bgFile
    try {
      refFiles       = await Promise.all(refEntries.map((e, i) => entryToFile(e, `ref-${i}.jpg`)))
      lingerieFiles  = await Promise.all(lingerieEntries.map((e, i) => entryToFile(e, `lingerie-${i}.jpg`)))
      accessoryFiles = await Promise.all(accessoryEntries.map((e, i) => entryToFile(e, `accessory-${i}.jpg`)))
      poseFile       = poseEntries[0] ? await entryToFile(poseEntries[0], 'pose.jpg') : null
      bgFile         = bgEntry ? await entryToFile(bgEntry, 'bg.jpg') : null
    } catch (err) {
      setPlanError(`Lỗi xử lý ảnh đầu vào: ${err.message}`)
      setPlanning(false); busyRef.current = false
      return
    }
    const analysisImgs = [...refFiles, ...lingerieFiles, ...accessoryFiles, ...(poseFile ? [poseFile] : []), ...(bgFile ? [bgFile] : [])].slice(0, 6)

    try {
      const presetObj = SCENE_PRESETS.find(p => p.id === scenePresetId)
      const sceneNote = presetObj ? `\n\nSCENE: "${presetObj.label}" — ${presetObj.desc}. Use as locked background for all 4 scenes.` : ''
      const bgNote = bgFile ? '\n\nBACKGROUND: User provided background reference (last image). Use it as locked background for all 4 scenes.' : ''
      const accessoryNote = accessoryFiles.length > 0 ? '\n\nACCESSORIES: User provided accessory images. Analyze and include them naturally in all scenes.' : ''
      const moodNote = mood !== 'AI tự chọn' ? `\n\nMOOD: "${mood}"` : ''
      const storylineNote = storyline.trim() ? `\n\nUSER STORYLINE (HIGHEST PRIORITY — override default scenes where they conflict): "${storyline.trim()}"` : ''
      const aspectNote = `\n\nASPECT RATIO: ${aspect} — apply to photography.aspect_ratio field`

      const raw = await callPlanning(BRAIN_PROMPT + sceneNote + bgNote + accessoryNote + moodNote + storylineNote + aspectNote, analysisImgs)
      const parsed = parseJSON(raw)
      setPlan(parsed)
      setPlanExpanded(true)

      if (parsed.scenes && parsed.scenes.length > 0) {
        setPrompts(parsed.scenes.map(s => s.prompt || s))
      }
    } catch (err) {
      setPlanError(`Lỗi tạo prompt: ${err.message}`)
    }

    setPlanning(false)
    busyRef.current = false
  }

  function copyAllPrompts() {
    const allPrompts = prompts.filter(Boolean).map((p, i) => `═══ Scene ${i + 1}: ${SCENE_NAMES[i]} ═══\n${JSON.stringify(p, null, 2)}`).join('\n\n')
    navigator.clipboard.writeText(allPrompts)
  }

  function downloadAllPrompts() {
    const allPrompts = { generated_at: new Date().toISOString(), scenes: prompts.filter(Boolean).map((p, i) => ({ name: SCENE_NAMES[i], prompt: p })) }
    downloadJson(allPrompts, `phoi-do-lot-all-scenes-${Date.now()}.json`)
  }

  const canGenerate  = (refEntries.length > 0 || lingerieEntries.length > 0) && !planning
  const hasPrompts   = prompts.some(Boolean)

  return (
    <div style={{ background: C.bg0, minHeight: '100vh', margin: '-32px', padding: '0 0 100px' }}>
      <style>{CSS}</style>

      {pickerOpen && <LibraryPickerModal onSelect={handlePickLibrary} onClose={() => setPickerOpen(false)} />}
      <input ref={refInput}       type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'ref');       e.target.value = '' }} />
      <input ref={lingerieInput}  type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'lingerie');  e.target.value = '' }} />
      <input ref={accessoryInput} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(e.target.files, 'accessory'); e.target.value = '' }} />
      <input ref={poseInput}      type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'pose');      e.target.value = '' }} />
      <input ref={bgInput}        type="file" accept="image/*"          hidden onChange={e => { addFiles(e.target.files, 'bg');        e.target.value = '' }} />

      <div style={{ background: `linear-gradient(135deg, ${C.pk} 0%, #9d174d 30%, #1a0812 60%, ${C.bg0} 100%)`, padding: '36px 32px 28px', marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(236,72,153,0.15)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(217,70,239,0.12)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 760, margin: '0 auto' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <Sparkles size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>Phối Đồ Lót</h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { t: 'Flux Klein Edit', c: '#f472b6' }, { t: 'Face Lock 100%', c: '#f87171' },
                { t: 'Nền Studio', c: '#c084fc' }, { t: 'Fabric Physics', c: '#fbbf24' },
                { t: 'Commercial Safe', c: '#4ade80' }, { t: 'Kịch bản riêng', c: '#60a5fa' },
              ].map(tag => (
                <span key={tag.t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: tag.c, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', padding: '3px 9px', borderRadius: 20, backdropFilter: 'blur(4px)' }}>{tag.t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 18px 0' }}>

      <div className="lot-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tài nguyên đầu vào</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.7fr', gap: 20, alignItems: 'start' }}>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>KOL / Người mẫu <span style={{ color: C.t3, fontWeight: 400, fontSize: 11 }}>(tối đa 2)</span></p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
              {[0,1].map(i => <Slot key={i} src={refEntries[i]?.url} label={i === 0 && refEntries[0] ? 'KOL' : null} onRemove={() => setRefEntries(p => p.filter((_,j) => j !== i))} onUpload={() => refInput.current.click()} onLibrary={() => openPicker('ref')} />)}
            </div>
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1 }}>Áo Lót + Quần Lót <span style={{ color: C.pk, fontWeight: 400, fontSize: 11 }}>(tối đa 2)</span></p>
            <CombinedSlot entries={lingerieEntries} onRemove={i => setLingerieEntries(p => p.filter((_,j) => j !== i))} onUpload={() => lingerieInput.current.click()} onLibrary={() => openPicker('lingerie')} labels={['ÁO', 'QUẦN']} />
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1, display: 'flex', alignItems: 'center', gap: 6 }}>
              Phụ Kiện
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 7px', borderRadius: 20 }}>TUỲ CHỌN</span>
            </p>
            <CombinedSlot entries={accessoryEntries} onRemove={i => setAccessoryEntries(p => p.filter((_,j) => j !== i))} onUpload={() => accessoryInput.current.click()} onLibrary={() => openPicker('accessory')} labels={['PK1', 'PK2']} />
          </div>
          <div>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: C.t1, display: 'flex', alignItems: 'center', gap: 6 }}>
              Dáng Pose
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', padding: '2px 7px', borderRadius: 20 }}>TUỲ CHỌN</span>
            </p>
            <div style={{ maxWidth: 90 }}>
              <Slot src={poseEntries[0]?.url} label={poseEntries[0] ? 'POSE' : null} onRemove={() => setPoseEntries([])} onUpload={() => poseInput.current.click()} onLibrary={() => openPicker('pose')} />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 10, color: C.t3, lineHeight: 1.5 }}>Ảnh tham chiếu dáng / fashion pose</p>
          </div>
        </div>
      </div>

      <div className="lot-card" style={{ padding: '20px 18px', marginBottom: 12 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Bối cảnh Fashion <span style={{ color: C.t3, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— cố định cả 4 phân cảnh</span>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: bgEntry ? '100px 1fr' : '80px 1fr', gap: 14, alignItems: 'start' }}>
          <div>
            {bgEntry ? (
              <div className="lot-slot" style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: `2px solid ${C.pk}` }}>
                <img src={bgEntry.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setBgEntry(null)} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 5, background: 'rgba(0,0,0,.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={9} /></button>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: C.pk, color: '#fff', fontSize: 7, fontWeight: 800, textAlign: 'center', padding: '2.5px 0', letterSpacing: '0.08em' }}>ƯU TIÊN #1</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => bgInput.current.click()} className="lot-slot" style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: `1px dashed ${C.b2}`, background: C.bg2, color: C.t3, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <Upload size={15} /><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>UPLOAD</span>
                </button>
                <button onClick={() => openPicker('bg')} className="lot-slot" style={{ width: '100%', padding: '8px 0', borderRadius: 10, border: `1px dashed ${C.b2}`, background: C.bg2, color: C.t3, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 9 }}>
                  <BookImage size={12} /><span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>KHO</span>
                </button>
              </div>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: C.t3 }}>{bgEntry ? 'Ảnh upload sẽ được ưu tiên.' : 'Chọn bối cảnh fashion:'}</span>
              {scenePresetId && !bgEntry && <button onClick={() => setScenePresetId('')} style={{ background: 'none', border: 'none', color: C.t3, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}><X size={10} /> Bỏ</button>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(sceneExpanded ? SCENE_PRESETS : SCENE_PRESETS.slice(0, 3)).map(p => {
                const on = scenePresetId === p.id
                return (
                  <button key={p.id} onClick={() => setScenePresetId(on ? '' : p.id)} className="lot-scene-opt" style={{ padding: '7px 12px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', border: on ? `1px solid ${C.pk}` : `1px solid ${C.b1}`, background: on ? C.pkBg : 'transparent', color: on ? C.pk : C.t3, fontSize: 11, fontWeight: on ? 600 : 400, opacity: bgEntry ? 0.35 : 1 }}>
                    <span style={{ fontWeight: on ? 700 : 500 }}>{p.emoji} {p.label}</span>
                    <span style={{ display: 'block', fontSize: 10, color: C.t3, marginTop: 1 }}>{p.desc}</span>
                  </button>
                )
              })}
              <button onClick={() => setSceneExpanded(p => !p)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px dashed ${C.b1}`, background: 'transparent', color: C.t3, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
                {sceneExpanded ? <><ChevronUp size={11} /> Thu gọn</> : <><ChevronDown size={11} /> +{SCENE_PRESETS.length - 3} bối cảnh</>}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lot-card" style={{ padding: '20px 18px', marginBottom: 12, borderColor: storyline.trim() ? C.pkBd : C.b1 }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PenLine size={13} style={{ color: C.pk }} />
          Kịch bản của bạn
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: '#60a5fa', background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.3)', padding: '2px 7px', borderRadius: 20, textTransform: 'none' }}>ƯU TIÊN CAO</span>
        </p>
        <textarea
          value={storyline}
          onChange={e => setStoryline(e.target.value)}
          placeholder="Mô tả kịch bản bạn muốn... (vd: Cô ấy đứng trước gương lớn trong studio, ánh sáng mềm từ cửa sổ, nở nụ cười tự tin. Tay chạm vào ren áo lót...) — 4 phân cảnh sẽ bám theo kịch bản này!"
          rows={3}
          style={{
            width: '100%', background: C.bg0, border: `1px solid ${storyline.trim() ? C.pkBd : C.b2}`,
            borderRadius: 10, padding: '12px 14px', color: C.t1,
            fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none',
            fontFamily: 'inherit', minHeight: 72,
          }}
        />
        {storyline.trim() && (
          <p style={{ margin: '8px 0 0', fontSize: 11, color: C.pk, fontWeight: 600 }}>
            Kịch bản sẽ được ưu tiên cao nhất khi tạo 4 phân cảnh
          </p>
        )}
      </div>

      <div className="lot-card" style={{ padding: '20px 18px', marginBottom: 20 }}>
        <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cấu hình</p>
        <div style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Mood Fashion</p>
          <div style={{ position: 'relative' }}>
            <select value={mood} onChange={e => setMood(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: 10, appearance: 'none', border: `1px solid ${mood !== 'AI tự chọn' ? C.pkBd : C.b2}`, background: C.bg2, color: mood !== 'AI tự chọn' ? C.pk : C.t3, fontSize: 12, cursor: 'pointer', fontWeight: mood !== 'AI tự chọn' ? 600 : 400 }}>
              {MOOD_OPTS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: C.t3, pointerEvents: 'none' }} />
          </div>
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: C.t3 }}>Tỷ lệ ảnh</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ASPECT_OPTS.map(opt => { const on = aspect === opt.v; return <button key={opt.v} onClick={() => setAspect(opt.v)} className="lot-pill" style={{ padding: '7px 14px', borderRadius: 10, cursor: 'pointer', border: on ? `1.5px solid ${C.pk}` : `1px solid ${C.b2}`, background: on ? C.pkBg : C.bg2, color: on ? C.pk : C.t3, textAlign: 'center' }}><div style={{ fontSize: 13, fontWeight: 800 }}>{opt.label}</div><div style={{ fontSize: 9, opacity: .6, marginTop: 1 }}>{opt.sub}</div></button> })}
          </div>
        </div>
      </div>

      <button className="lot-gen" onClick={handleGenerate} disabled={!canGenerate} style={{
        width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
        cursor: canGenerate ? 'pointer' : 'not-allowed',
        background: canGenerate ? `linear-gradient(135deg, ${C.pk}, #c026a0, ${C.fu}, #a855f7)` : C.bg2,
        backgroundSize: '200% auto', animation: planning ? 'shimmer 2s linear infinite' : 'none',
        color: canGenerate ? '#fff' : C.t3, fontWeight: 800, fontSize: 14, letterSpacing: '0.06em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: canGenerate ? '0 4px 28px rgba(236,72,153,0.35)' : 'none', marginBottom: 20,
      }}>
        {planning ? (
          <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .8s linear infinite' }} />Đang phân tích & tạo Prompt...</>
        ) : (
          <><Zap size={16} />Tạo 4 Prompt · Flux Klein Edit · {aspect}</>
        )}
      </button>

      {planError && <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', color: C.red, fontSize: 13 }}>{planError}</div>}

      {plan && (
        <div className="lot-card" style={{ padding: '16px 18px', marginBottom: 20 }}>
          <button onClick={() => setPlanExpanded(p => !p)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: planExpanded ? 14 : 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.t2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Phân tích AI</span>
            {planExpanded ? <ChevronUp size={14} style={{ color: C.t3 }} /> : <ChevronDown size={14} style={{ color: C.t3 }} />}
          </button>
          {planExpanded && (
            <>
              {plan.kol_analysis && (
                <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 8, background: C.bg2, borderLeft: `3px solid ${C.s1}` }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: C.s1, letterSpacing: '0.08em' }}>KOL ANALYSIS</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{JSON.stringify(plan.kol_analysis, null, 2)}</p>
                </div>
              )}
              {plan.lingerie_analysis && (
                <div style={{ padding: '12px 16px', borderRadius: 10, marginBottom: 8, background: C.bg2, borderLeft: `3px solid ${C.s2}` }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 800, color: C.s2, letterSpacing: '0.08em' }}>LINGERIE ANALYSIS</p>
                  <p style={{ margin: 0, fontSize: 12, color: C.t2, lineHeight: 1.6 }}>{JSON.stringify(plan.lingerie_analysis, null, 2)}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {hasPrompts && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.t1 }}>4 Fashion Prompts</p>
              <p style={{ margin: '3px 0 0', fontSize: 11, color: C.t3 }}>Comfy UI · Flux Klein Edit — Copy JSON hoặc Download .json</p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={copyAllPrompts} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.b2}`, background: C.bg2, color: C.t3, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Copy size={11} /> Copy All
              </button>
              <button onClick={downloadAllPrompts} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.b2}`, background: C.bg2, color: C.t3, cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Download size={11} /> Download All
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginBottom: 16 }}>
            {prompts.map((p, i) => p ? <ScenePromptCard key={i} idx={i} prompt={p} sceneName={SCENE_NAMES[i]} onUpdate={(idx, newPrompt) => setPrompts(prev => { const n = [...prev]; n[idx] = newPrompt; return n })} /> : null)}
          </div>
        </div>
      )}

      </div>
    </div>
  )
}
