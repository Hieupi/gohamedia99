import { useState, useRef, useCallback } from 'react'
import { callGemini, MODEL_TEXT } from '../services/geminiService'
import {
  Upload, Film, Copy, Check, ChevronDown, ChevronUp,
  Clapperboard, Zap, Layers, Camera, AlertCircle, RefreshCw, X
} from 'lucide-react'

/* ═══ DESIGN TOKENS — đồng bộ với PhoiDoPage ═══ */
const C = {
  bg0: '#131318', bg1: '#1c1c24', bg2: '#25252f', bg3: '#2e2e3a',
  b1: '#2e2e38', b2: '#45455a', b3: '#5a5a72',
  t1: '#fafafa', t2: '#a1a1aa', t3: '#71717a',
  re: '#dc2626', reL: '#ef4444', reBg: 'rgba(220,38,38,0.10)', reBd: 'rgba(220,38,38,0.30)',
  or: '#f97316', orL: '#fb923c', orBg: 'rgba(249,115,22,0.08)', orBd: 'rgba(249,115,22,0.25)',
  bl: '#3b82f6', blBg: 'rgba(59,130,246,0.08)', blBd: 'rgba(59,130,246,0.25)',
  fu: '#d946ef', fuL: '#e879f9', fuBg: 'rgba(217,70,239,0.08)', fuBd: 'rgba(217,70,239,0.25)',
  green: '#22c55e', greenBg: 'rgba(34,197,94,0.08)',
}

const CSS_KLING = `
  @keyframes spin-k { to { transform: rotate(360deg) } }
  @keyframes fadeUp-k {
    from { opacity: 0; transform: translateY(10px) }
    to   { opacity: 1; transform: translateY(0) }
  }
  @keyframes shimmer-k {
    0%   { background-position: -200% center }
    100% { background-position:  200% center }
  }
  .kf-card {
    background: ${C.bg1};
    border: 1px solid ${C.b1};
    border-radius: 14px;
    overflow: hidden;
    transition: border-color .25s, box-shadow .25s;
  }
  .kf-card:hover { border-color: ${C.b2}; box-shadow: 0 8px 32px rgba(0,0,0,.4); }
  .kf-section { animation: fadeUp-k .4s ease both; }
  .kf-btn-gen {
    transition: transform .15s, box-shadow .25s, filter .2s;
  }
  .kf-btn-gen:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 32px rgba(217,70,239,0.4);
    filter: brightness(1.08);
  }
  .kf-pill {
    transition: all .2s ease;
  }
  .kf-pill:hover {
    border-color: ${C.b3} !important;
    background: ${C.bg3} !important;
  }
  .kf-copy-btn {
    transition: all .2s;
  }
  .kf-copy-btn:hover { opacity: .85; }
`

// ─── Full Kling 3.0 System Instruction ───────────────────────────────────────
const KLING_BRAIN = `# SYSTEM INSTRUCTION — FASHION VIDEO PROMPT ARCHITECT FOR KLING 3.0 MULTISHOTS

## 1. VAI TRÒ
Bạn là Fashion Video Prompt Architect. Khi người dùng gửi ảnh thời trang, bạn phân tích ảnh → chọn kịch bản phù hợp → viết prompt Kling 3.0 Multi-Shot → hướng dẫn thực hiện.
Ngôn ngữ giao tiếp: Tiếng Việt. Prompt đầu ra: Tiếng Anh.

## 2. KIẾN THỨC KỸ THUẬT KLING 3.0
Multi-Shot: Tạo video 3–15 giây, tối đa 6 shots/video, mỗi shot có prompt + thời lượng + camera riêng.
Hai chế độ: Smart Storyboard (1 prompt tổng → Kling tự chia shots) | Custom Storyboard (định nghĩa từng shot riêng — chế độ chính).
Element Binding: Upload ảnh người mẫu làm Element → bật "Bind Subject" → khóa khuôn mặt, trang phục xuyên suốt video.
Giới hạn: Multi-Shot không dùng cùng First Frame + Last Frame. Mỗi shot tối thiểu 2 giây. Độ phân giải: 1080p | Tỷ lệ: 9:16.

## 3. CẤU TRÚC PROMPT MỖI SHOT (5 lớp — đúng thứ tự)
[CỠ CẢNH + GÓC MÁY]. [HÀNH ĐỘNG CHỦ THỂ — 1 hành động chính]. [CHI TIẾT VẬT LÝ — vải, tóc, phụ kiện]. [CAMERA — loại + hướng + tốc độ]. [BIỂU CẢM / MOOD].
Quy tắc: 1 shot = 1 hành động chính. Mô tả outfit giống nhau chữ-đối-chữ qua mọi shot. Không dùng tính từ chủ quan.

## 4. THƯ VIỆN KỊCH BẢN
5.1 STREET WALK: Streetwear/casual/sneakers | 5 shots
5.2 DRESS REVEAL: Váy xoè/váy dài/đầm maxi | 5 shots
5.3 FITTING ROOM: Mọi trang phục/mix layers | 4 shots
5.4 ACCESSORY SPOTLIGHT: Túi/giày/trang sức | 5 shots
5.5 CAFÉ LIFESTYLE: Smart casual/đồ hẹn hò | 4 shots
5.6 JACKET SHOWCASE: Áo khoác/blazer/trench coat | 4 shots
5.7 HAIR FLIP & POSE: Mọi outfit/OOTD | 5 shots
5.8 STAIRCASE: Váy dài/đồ dự tiệc/giày cao gót | 5 shots
5.9 WIND EFFECT: Váy chiffon/trench coat/tóc dài | 4 shots
5.10 NIGHT OUT: Đồ đi chơi/sequin/metallic/leather | 4 shots
5.11 LAYER PEEL: Blazer+top/cardigan+váy/layers | 4 shots
5.12 MIRROR WALK: Mọi outfit — tận dụng phản chiếu | 4 shots

## 5. LOGIC CHỌN KỊCH BẢN
NẾU váy dài/váy xoè/đầm → 5.2 hoặc 5.9
NẾU áo khoác/blazer/layers → 5.6 hoặc 5.11
NẾU sản phẩm chính = phụ kiện → 5.4
NẾU bối cảnh gương/studio → 5.3 hoặc 5.12
NẾU bối cảnh cầu thang → 5.8
NẾU streetwear/casual/sneakers → 5.1
NẾU sang trọng/dự tiệc/elegant → 5.2 hoặc 5.8
NẾU lifestyle/café → 5.5
NẾU outfit tối/metallic/leather → 5.10
NẾU không khớp → tự thiết kế storyboard mới

## 6. NEGATIVE PROMPT TABLE
Váy/Đầm: morphing hemline, skirt disappearing, fabric clipping through legs, changing dress length, transparent becoming opaque
Áo khoác/Blazer: jacket color shifting, lapel distortion, sleeve length changing, buttons disappearing, collar morphing
Streetwear: logo warping, text distortion, sneaker morphing, graphic print shifting
Trang sức/Phụ kiện: earring disappearing, necklace breaking, ring multiplying, bag changing shape, sunglasses distortion
Giày: shoe color changing, heel height shifting, sole distortion, shoe type morphing
Mặc định (luôn thêm): blurry, low quality, distorted face, extra fingers, bad hands, changing clothes, unnatural skin, morphing features, jittery motion, abrupt cuts, watermark

## 7. PHÂN BỔ THỜI LƯỢNG
3 shots → 5+5+5 (15s) | 4 shots → 4+4+4+3 (15s) | 5 shots → 3+3+3+3+3 (15s)

## 8. QUY TẮC CỨNG
- Không tạo nội dung khiêu gợi. Video thời trang = chuyên nghiệp.
- Chỉ mô tả những gì thấy trong ảnh. Không rõ chất liệu → viết "flowing fabric".
- Luôn cung cấp cả Smart + Custom Storyboard.
- Tổng thời lượng tất cả shots phải = đúng 15s.
- Mỗi shot đủ 5 lớp: Cỡ cảnh, Hành động, Chi tiết vật lý, Camera, Biểu cảm.`

function buildPrompt(numShots) {
  return `${KLING_BRAIN}

---
NHIỆM VỤ: Phân tích ảnh thời trang và tạo prompt Kling 3.0 Multi-Shot cho ${numShots} shots (tổng 15s).
Phân bổ thời lượng: ${numShots === 3 ? '5+5+5' : numShots === 4 ? '4+4+4+3' : '3+3+3+3+3'}s.

Xuất kết quả CHỈNH XÁC theo JSON sau (không thêm text ngoài JSON, không dùng markdown code block):
{
  "analysis": {
    "gender": "giới tính",
    "skinTone": "tông da",
    "hair": "kiểu tóc + màu",
    "outfit": "mô tả chi tiết trang phục (loại, màu, chất liệu nhìn thấy, kiểu dáng)",
    "accessories": "mô tả phụ kiện (giày, túi, trang sức...)",
    "style": "phong cách tổng thể",
    "background": "mô tả bối cảnh ảnh",
    "highlight": "sản phẩm/item cần highlight nhất"
  },
  "scenarioMain": {
    "id": "5.X",
    "name": "TÊN KỊCH BẢN",
    "reason": "lý do chọn kịch bản này (1-2 câu)"
  },
  "scenarioAlt": {
    "id": "5.X",
    "name": "TÊN KỊCH BẢN PHỤ",
    "reason": "lý do gợi ý thêm (1-2 câu)"
  },
  "smartPrompt": "1 prompt tổng tiếng Anh mô tả toàn bộ chuỗi cảnh cho Smart Storyboard",
  "smartNote": "giải thích ngắn Smart Storyboard bằng tiếng Việt",
  "masterPrompt": "Bối cảnh + nhân vật + style tiếng Anh cho Custom Storyboard Master Prompt",
  "shots": [
    {
      "num": 1,
      "duration": 0,
      "name": "tên shot ngắn gọn",
      "prompt": "prompt tiếng Anh đầy đủ 5 lớp",
      "note": "giải thích Việt 1 dòng"
    }
  ],
  "negativePrompt": "negative prompt tiếng Anh đầy đủ gồm mặc định + phù hợp outfit",
  "instructions": [
    "1. Element Library → Upload ảnh → Tạo Element",
    "2. Video 3.0 → Image to Video → Upload ảnh → 9:16 → 15s → 1080p",
    "3. Bật Multi-Shot → Custom Multi-Shot → Nhập từng shot theo thứ tự",
    "4. Bind Subject → Chọn Element đã tạo → Khóa nhân vật xuyên video",
    "5. Generate → Nếu chưa ưng, chỉnh prompt shot cụ thể và thử lại"
  ]
}`
}

// ─── Copy button helper ───────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy', style }) {
  const [copied, setCopied] = useState(false)
  const handle = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="kf-copy-btn" style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px',
      borderRadius: 7,
      border: `1px solid ${copied ? C.green + '50' : C.b2}`,
      background: copied ? C.greenBg : C.bg3,
      color: copied ? C.green : C.t2,
      fontSize: 11, fontWeight: 700, cursor: 'pointer',
      ...style
    }}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Đã copy!' : label}
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = C.bl, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="kf-card kf-section" style={{ marginBottom: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '13px 16px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? `1px solid ${C.b1}` : 'none',
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: color + '18', border: `1px solid ${color}30`,
          display: 'grid', placeItems: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: C.t1 }}>{title}</span>
        {open
          ? <ChevronUp size={14} style={{ color: C.t3 }} />
          : <ChevronDown size={14} style={{ color: C.t3 }} />}
      </button>
      {open && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  )
}

// ─── Shot Card ────────────────────────────────────────────────────────────────
const SHOT_ACCENTS = [C.or, C.fu, C.bl, C.green, C.reL, C.orL]
function ShotCard({ shot }) {
  const accent = SHOT_ACCENTS[(shot.num - 1) % SHOT_ACCENTS.length]
  return (
    <div style={{
      background: C.bg2, border: `1px solid ${C.b1}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: 14, marginBottom: 8,
      transition: 'border-color .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: accent + '22', color: accent,
            borderRadius: 20, padding: '3px 11px', fontSize: 10, fontWeight: 800,
            border: `1px solid ${accent}40`, letterSpacing: '0.05em',
          }}>
            SHOT {shot.num} · {shot.duration}s
          </span>
          <span style={{ color: C.t2, fontSize: 12, fontWeight: 600 }}>"{shot.name}"</span>
        </div>
        <CopyBtn text={shot.prompt} />
      </div>
      <p style={{ color: C.t1, fontSize: 12, lineHeight: 1.85, margin: '0 0 8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        {shot.prompt}
      </p>
      {shot.note && (
        <p style={{ color: C.t3, fontSize: 11, margin: 0, borderTop: `1px solid ${C.b1}`, paddingTop: 8 }}>
          → {shot.note}
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function KlingFashionPage() {
  const [image, setImage] = useState(null)       // { file, url }
  const [numShots, setNumShots] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  // ── Image handling ──────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage({ file, url: URL.createObjectURL(file) })
    setResult(null)
    setError(null)
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleFileInput = (e) => handleFile(e.target.files[0])

  const clearImage = () => {
    if (image?.url) URL.revokeObjectURL(image.url)
    setImage(null)
    setResult(null)
    setError(null)
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!image) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const raw = await callGemini({
        prompt: buildPrompt(numShots),
        images: [image.file],
        model: MODEL_TEXT,
        temperature: 0.5,
        maxTokens: 8192,
      })

      // Parse JSON — strip any markdown fences
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      const parsed = JSON.parse(cleaned)
      setResult(parsed)
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError('AI trả về định dạng không hợp lệ. Thử lại lần nữa.')
      } else {
        setError(err.message || 'Đã xảy ra lỗi. Thử lại.')
      }
    } finally {
      setLoading(false)
    }
  }

  const SHOT_OPTS = [
    { n: 3, label: '3 Shots', sub: '5+5+5s', note: 'Tập trung, ấn tượng' },
    { n: 4, label: '4 Shots', sub: '4+4+4+3s', note: 'Cân bằng nhịp điệu' },
    { n: 5, label: '5 Shots', sub: '3+3+3+3+3s', note: 'Nhanh, TikTok/Reels' },
  ]

  return (
    <div style={{ background: C.bg0, minHeight: '100vh', margin: '-32px', padding: '0 0 100px' }}>
      <style>{CSS_KLING}</style>

      {/* ══ HERO HEADER ══ */}
      <div style={{
        background: `linear-gradient(135deg, ${C.fu} 0%, #7c1fa8 25%, #1a0828 60%, ${C.bg0} 100%)`,
        padding: '36px 32px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 220, height: 220, borderRadius: '50%', background: 'rgba(217,70,239,0.15)', filter: 'blur(70px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, left: 60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(249,115,22,0.10)', filter: 'blur(55px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 16, maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Clapperboard size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}>
              Kling AI Fashion
            </h1>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {[
                { t: 'Multi-Shot 15s', c: '#e879f9' },
                { t: 'Smart Storyboard', c: '#4ade80' },
                { t: 'Custom Storyboard', c: '#60a5fa' },
                { t: 'Element Binding', c: '#fb923c' },
                { t: 'Kling 3.0', c: '#e879f9' },
              ].map(tag => (
                <span key={tag.t} style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
                  color: tag.c, background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '3px 9px', borderRadius: 20, backdropFilter: 'blur(4px)',
                }}>{tag.t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ CONTENT ══ */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px 0' }}>

      {/* ── Upload Zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !image && fileRef.current?.click()}
        className="kf-card"
        style={{
          border: `2px dashed ${dragOver ? C.fu : image ? C.b2 : C.b1}`,
          minHeight: image ? 'auto' : 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: image ? 'default' : 'pointer',
          background: dragOver ? C.fuBg : C.bg1,
          transition: 'all .2s', marginBottom: 12, overflow: 'hidden', position: 'relative',
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />

        {image ? (
          <div style={{ width: '100%', position: 'relative' }}>
            <img src={image.url} alt="Fashion" style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }} />
            <button onClick={(e) => { e.stopPropagation(); clearImage() }} style={{
              position: 'absolute', top: 10, right: 10,
              background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
              width: 28, height: 28, display: 'grid', placeItems: 'center',
              cursor: 'pointer', color: '#fff',
            }}><X size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }} style={{
              position: 'absolute', bottom: 10, right: 10,
              background: C.fuBg, border: `1px solid ${C.fuBd}`, borderRadius: 8,
              padding: '5px 12px', fontSize: 11, color: C.fuL, cursor: 'pointer', fontWeight: 700,
            }}>Đổi ảnh</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 36 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: C.fuBg,
              border: `1px solid ${C.fuBd}`, display: 'grid', placeItems: 'center',
              margin: '0 auto 12px',
            }}>
              <Upload size={22} style={{ color: C.fu }} />
            </div>
            <p style={{ color: C.t1, fontWeight: 700, margin: '0 0 6px', fontSize: 14 }}>
              Kéo thả hoặc click để upload ảnh thời trang
            </p>
            <p style={{ color: C.t3, fontSize: 12, margin: 0 }}>
              Ảnh rõ nét, thấy đủ outfit → video càng đẹp · JPG / PNG / WEBP
            </p>
          </div>
        )}
      </div>

      {/* ── Shot Selector ── */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ color: C.t3, fontSize: 10, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Số shots / video (15 giây)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SHOT_OPTS.map(({ n, label, sub, note }) => (
            <button key={n} onClick={() => setNumShots(n)} className="kf-pill" style={{
              padding: '11px 12px', borderRadius: 10,
              border: `2px solid ${numShots === n ? C.fu : C.b1}`,
              background: numShots === n ? C.fuBg : C.bg1,
              color: numShots === n ? C.t1 : C.t3,
              cursor: 'pointer', textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{label}</div>
              <div style={{ fontSize: 10, color: numShots === n ? C.fuL : C.t3, marginTop: 2 }}>{sub}</div>
              <div style={{ fontSize: 10, color: numShots === n ? C.fu : C.t3, marginTop: 2 }}>{note}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Generate Button ── */}
      <button
        onClick={generate}
        disabled={!image || loading}
        className="kf-btn-gen"
        style={{
          width: '100%', padding: '16px 0', borderRadius: 14, border: 'none',
          background: (!image || loading)
            ? C.bg2
            : `linear-gradient(135deg, ${C.re}, #8b14b0, ${C.fu}, #e879f9)`,
          backgroundSize: '200% auto',
          animation: loading ? 'shimmer-k 2s linear infinite' : 'none',
          color: (!image || loading) ? C.t3 : '#fff',
          fontSize: 14, fontWeight: 800, letterSpacing: '0.05em',
          cursor: (!image || loading) ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: (!image || loading) ? 'none' : '0 4px 28px rgba(217,70,239,0.35)',
        }}
      >
        {loading ? (
          <>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin-k .8s linear infinite' }} />
            Đang phân tích & viết prompt...
          </>
        ) : (
          <>
            <Clapperboard size={16} />
            Phân tích Outfit & Tạo Prompt Kling · {numShots} Shots
          </>
        )}
      </button>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: C.reBg, border: `1px solid ${C.reBd}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 8, color: C.reL, fontSize: 12,
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            paddingBottom: 12, borderBottom: `1px solid ${C.b1}`,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.fuBg, border: `1px solid ${C.fuBd}`, display: 'grid', placeItems: 'center' }}>
              <Film size={14} style={{ color: C.fu }} />
            </div>
            <span style={{ color: C.fu, fontSize: 13, fontWeight: 800, letterSpacing: '0.05em' }}>KẾT QUẢ PHÂN TÍCH</span>
          </div>

          {/* Analysis */}
          <Section icon={Camera} title="📸 Phân tích ảnh" color={C.green}>
            {result.analysis && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Người mẫu', `${result.analysis.gender || ''} · ${result.analysis.skinTone || ''}`],
                  ['Kiểu tóc', result.analysis.hair],
                  ['Trang phục', result.analysis.outfit],
                  ['Phụ kiện', result.analysis.accessories],
                  ['Phong cách', result.analysis.style],
                  ['Bối cảnh', result.analysis.background],
                  ['Highlight', result.analysis.highlight],
                ].map(([label, val]) => val && (
                  <div key={label} style={{ background: C.bg2, border: `1px solid ${C.b1}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ color: C.green, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                    <div style={{ color: C.t1, fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Scenarios */}
          <Section icon={Layers} title="🎬 Kịch bản đề xuất" color={C.or}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {result.scenarioMain && (
                <div style={{ background: C.orBg, border: `1px solid ${C.orBd}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ background: C.or, color: '#fff', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                      CHÍNH · {result.scenarioMain.id}
                    </span>
                  </div>
                  <div style={{ color: C.orL, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{result.scenarioMain.name}</div>
                  <div style={{ color: C.t3, fontSize: 11, lineHeight: 1.5 }}>{result.scenarioMain.reason}</div>
                </div>
              )}
              {result.scenarioAlt && (
                <div style={{ background: C.bg2, border: `1px solid ${C.b1}`, borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ background: C.bg3, color: C.t2, borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                      PHỤ · {result.scenarioAlt.id}
                    </span>
                  </div>
                  <div style={{ color: C.t2, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{result.scenarioAlt.name}</div>
                  <div style={{ color: C.t3, fontSize: 11, lineHeight: 1.5 }}>{result.scenarioAlt.reason}</div>
                </div>
              )}
            </div>
          </Section>

          {/* Smart Storyboard */}
          <Section icon={Zap} title="🟢 Smart Storyboard — 1 Prompt duy nhất (15s)" color={C.green}>
            {result.smartPrompt && (
              <>
                {result.smartNote && (
                  <p style={{ color: C.t3, fontSize: 12, marginBottom: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                    {result.smartNote}
                  </p>
                )}
                <div style={{ background: C.bg2, border: `1px solid ${C.b1}`, borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: C.greenBg, borderBottom: `1px solid ${C.b1}` }}>
                    <span style={{ color: C.green, fontSize: 10, fontWeight: 800, letterSpacing: '0.05em' }}>PROMPT + NEGATIVE PROMPT</span>
                    <CopyBtn text={`${result.smartPrompt}\n\nNegative prompt: ${result.negativePrompt || ''}`} label="Copy tất cả" />
                  </div>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.b1}` }}>
                    <div style={{ color: C.green, fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>PROMPT</div>
                    <p style={{ color: C.t1, fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{result.smartPrompt}</p>
                  </div>
                  {result.negativePrompt && (
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ color: C.reL, fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: '0.05em' }}>NEGATIVE PROMPT</div>
                      <p style={{ color: C.t2, fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{result.negativePrompt}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Section>

          {/* Custom Storyboard */}
          <Section icon={Film} title="🔵 Custom Storyboard (chuyên nghiệp)" color={C.bl}>
            {result.masterPrompt && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: C.bl, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Master Prompt</span>
                  <CopyBtn text={result.masterPrompt} />
                </div>
                <div style={{ background: C.bg2, border: `1px solid ${C.blBd}`, borderRadius: 10, padding: 14 }}>
                  <p style={{ color: C.t1, fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>{result.masterPrompt}</p>
                </div>
              </div>
            )}
            {result.shots && result.shots.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: C.bl, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {result.shots.length} Shots · Tổng {result.shots.reduce((s, sh) => s + (sh.duration || 0), 0)}s
                  </span>
                  <CopyBtn label="Copy tất cả shots" text={result.shots.map(s => `SHOT ${s.num} | ${s.duration}s — "${s.name}"\n${s.prompt}`).join('\n\n')} />
                </div>
                {result.shots.map((shot, i) => <ShotCard key={i} shot={shot} />)}
              </div>
            )}
          </Section>

          {/* Instructions */}
          <Section icon={Clapperboard} title="📋 Hướng dẫn thực hiện trên Kling" color={C.fu} defaultOpen={false}>
            {result.instructions && (
              <ol style={{ margin: 0, paddingLeft: 18, color: C.t3, fontSize: 12, lineHeight: 2.2 }}>
                {result.instructions.map((step, i) => (
                  <li key={i} style={{ color: C.t1 }}>{step.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            )}
            <div style={{ marginTop: 12, background: C.fuBg, border: `1px solid ${C.fuBd}`, borderRadius: 8, padding: '10px 14px', fontSize: 11, color: C.fuL }}>
              💡 Mẹo: Có thể cần generate 2–3 lần để đạt kết quả tốt nhất. Upload 2–4 ảnh từ nhiều góc làm Element cho kết quả ổn định hơn.
            </div>
          </Section>
        </div>
      )}
      </div>{/* end content */}
    </div>
  )
}
