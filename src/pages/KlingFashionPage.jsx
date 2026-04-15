import { useState, useRef, useCallback } from 'react'
import { callGemini, MODEL_TEXT } from '../services/geminiService'
import {
  Upload, Film, Copy, Check, ChevronDown, ChevronUp,
  Clapperboard, Zap, Layers, Camera, AlertCircle, RefreshCw, X
} from 'lucide-react'

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
    <button onClick={handle} style={{
      display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px',
      borderRadius: 7, border: '1px solid rgba(99,179,237,0.35)',
      background: copied ? 'rgba(72,187,120,0.18)' : 'rgba(99,179,237,0.12)',
      color: copied ? '#68d391' : '#90cdf4',
      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
      ...style
    }}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Đã copy!' : label}
    </button>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color = '#63b3ed', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.10)`,
      borderRadius: 12, overflow: 'hidden', marginBottom: 12
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '13px 16px', background: 'rgba(255,255,255,0.02)', border: 'none',
          color: '#f0f4ff', cursor: 'pointer', textAlign: 'left',
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none'
        }}
      >
        <Icon size={16} style={{ color }} />
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1, color: '#f0f4ff' }}>{title}</span>
        {open
          ? <ChevronUp size={14} style={{ color: '#a0aec0' }} />
          : <ChevronDown size={14} style={{ color: '#a0aec0' }} />}
      </button>
      {open && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  )
}

// ─── Shot Card ────────────────────────────────────────────────────────────────
function ShotCard({ shot }) {
  return (
    <div style={{
      background: 'rgba(99,179,237,0.06)', border: '1px solid rgba(99,179,237,0.18)',
      borderRadius: 10, padding: 14, marginBottom: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: 'rgba(99,179,237,0.25)', color: '#90cdf4',
            borderRadius: 20, padding: '3px 11px', fontSize: 11, fontWeight: 800
          }}>
            SHOT {shot.num} · {shot.duration}s
          </span>
          <span style={{ color: '#cbd5e0', fontSize: 12, fontWeight: 600 }}>"{shot.name}"</span>
        </div>
        <CopyBtn text={shot.prompt} />
      </div>
      <p style={{ color: '#e8edf5', fontSize: 12, lineHeight: 1.8, margin: '0 0 8px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        {shot.prompt}
      </p>
      {shot.note && (
        <p style={{ color: '#a0aec0', fontSize: 11, margin: 0, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8 }}>
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
    <div style={{ padding: '24px 28px', maxWidth: 860, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clapperboard size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#e2e8f0' }}>
              KLING AI FASHION
            </h1>
            <p style={{ margin: 0, fontSize: 11, color: '#718096' }}>
              Fashion Video Prompt Architect · Kling 3.0 Multi-Shot
            </p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#a0aec0', lineHeight: 1.6 }}>
          Upload ảnh thời trang → AI phân tích → Tạo prompt Smart + Custom Storyboard chuyên nghiệp cho Kling 3.0
        </p>
      </div>

      {/* ── Upload Zone ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !image && fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? '#667eea' : image ? 'rgba(102,126,234,0.4)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 14, minHeight: image ? 'auto' : 180,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: image ? 'default' : 'pointer',
          background: dragOver ? 'rgba(102,126,234,0.08)' : 'rgba(255,255,255,0.02)',
          transition: 'all .2s', marginBottom: 16, overflow: 'hidden', position: 'relative'
        }}
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileInput} style={{ display: 'none' }} />

        {image ? (
          <div style={{ width: '100%', position: 'relative' }}>
            <img
              src={image.url}
              alt="Fashion"
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', display: 'block' }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); clearImage() }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff'
              }}
            >
              <X size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              style={{
                position: 'absolute', bottom: 10, right: 10,
                background: 'rgba(102,126,234,0.8)', border: 'none', borderRadius: 8,
                padding: '5px 12px', fontSize: 11, color: '#fff', cursor: 'pointer', fontWeight: 600
              }}
            >
              Đổi ảnh
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Upload size={32} style={{ color: '#718096', marginBottom: 10 }} />
            <p style={{ color: '#cbd5e0', fontWeight: 600, margin: '0 0 6px', fontSize: 14 }}>
              Kéo thả hoặc click để upload ảnh thời trang
            </p>
            <p style={{ color: '#a0aec0', fontSize: 12, margin: 0 }}>
              Ảnh rõ nét, thấy đủ outfit → video càng đẹp · JPG / PNG / WEBP
            </p>
          </div>
        )}
      </div>

      {/* ── Shot Selector ── */}
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#cbd5e0', fontSize: 12, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
          Số shots / Video (15 giây)
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {SHOT_OPTS.map(({ n, label, sub, note }) => (
            <button
              key={n}
              onClick={() => setNumShots(n)}
              style={{
                padding: '10px 12px', borderRadius: 10, border: '2px solid',
                borderColor: numShots === n ? '#667eea' : 'rgba(255,255,255,0.08)',
                background: numShots === n ? 'rgba(102,126,234,0.15)' : 'rgba(255,255,255,0.02)',
                color: numShots === n ? '#e2e8f0' : '#718096',
                cursor: 'pointer', transition: 'all .2s', textAlign: 'center'
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{sub}</div>
              <div style={{ fontSize: 10, color: numShots === n ? '#a78bfa' : '#4a5568', marginTop: 2 }}>{note}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Generate Button ── */}
      <button
        onClick={generate}
        disabled={!image || loading}
        style={{
          width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
          background: !image || loading
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: !image || loading ? '#4a5568' : '#fff',
          fontSize: 14, fontWeight: 700, cursor: !image || loading ? 'not-allowed' : 'pointer',
          transition: 'all .3s', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
        }}
      >
        {loading ? (
          <>
            <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
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
          background: 'rgba(245,101,101,0.1)', border: '1px solid rgba(245,101,101,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 8, color: '#fc8181', fontSize: 12
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
            paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)'
          }}>
            <Film size={16} style={{ color: '#a78bfa' }} />
            <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 700 }}>KẾT QUẢ PHÂN TÍCH</span>
          </div>

          {/* Analysis */}
          <Section icon={Camera} title="📸 Phân tích ảnh" color="#68d391">
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
                  <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ color: '#90cdf4', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                    <div style={{ color: '#e8edf5', fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Scenarios */}
          <Section icon={Layers} title="🎬 Kịch bản đề xuất" color="#f6ad55">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {result.scenarioMain && (
                <div style={{
                  background: 'rgba(246,173,85,0.08)', border: '1px solid rgba(246,173,85,0.25)',
                  borderRadius: 10, padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      background: '#f6ad55', color: '#1a202c',
                      borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 800
                    }}>
                      CHÍNH · {result.scenarioMain.id}
                    </span>
                  </div>
                  <div style={{ color: '#f6ad55', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {result.scenarioMain.name}
                  </div>
                  <div style={{ color: '#a0aec0', fontSize: 11, lineHeight: 1.5 }}>
                    {result.scenarioMain.reason}
                  </div>
                </div>
              )}
              {result.scenarioAlt && (
                <div style={{
                  background: 'rgba(160,174,192,0.05)', border: '1px solid rgba(160,174,192,0.15)',
                  borderRadius: 10, padding: 12
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      background: 'rgba(160,174,192,0.2)', color: '#a0aec0',
                      borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 800
                    }}>
                      PHỤ · {result.scenarioAlt.id}
                    </span>
                  </div>
                  <div style={{ color: '#cbd5e0', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
                    {result.scenarioAlt.name}
                  </div>
                  <div style={{ color: '#718096', fontSize: 11, lineHeight: 1.5 }}>
                    {result.scenarioAlt.reason}
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Smart Storyboard */}
          <Section icon={Zap} title="🟢 Smart Storyboard — 1 Prompt duy nhất (15s)" color="#68d391">
            {result.smartPrompt && (
              <>
                {result.smartNote && (
                  <p style={{ color: '#a0aec0', fontSize: 12, marginBottom: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                    {result.smartNote}
                  </p>
                )}
                {/* Combined prompt + negative prompt block */}
                <div style={{
                  background: 'rgba(26,32,44,0.6)', border: '1px solid rgba(104,211,145,0.2)',
                  borderRadius: 10, overflow: 'hidden'
                }}>
                  {/* Label row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 14px', background: 'rgba(104,211,145,0.08)',
                    borderBottom: '1px solid rgba(104,211,145,0.12)'
                  }}>
                    <span style={{ color: '#68d391', fontSize: 11, fontWeight: 800, letterSpacing: 0.5 }}>
                      PROMPT + NEGATIVE PROMPT
                    </span>
                    <CopyBtn
                      text={`${result.smartPrompt}\n\nNegative prompt: ${result.negativePrompt || ''}`}
                      label="Copy tất cả"
                    />
                  </div>
                  {/* Prompt */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ color: '#68d391', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>PROMPT</div>
                    <p style={{ color: '#e8edf5', fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                      {result.smartPrompt}
                    </p>
                  </div>
                  {/* Negative prompt */}
                  {result.negativePrompt && (
                    <div style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#fc8181', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>NEGATIVE PROMPT</div>
                      <p style={{ color: '#e8edf5', fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {result.negativePrompt}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </Section>

          {/* Custom Storyboard */}
          <Section icon={Film} title="🔵 Custom Storyboard (chuyên nghiệp)" color="#63b3ed">
            {result.masterPrompt && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#90cdf4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Master Prompt
                  </span>
                  <CopyBtn text={result.masterPrompt} />
                </div>
                <div style={{
                  background: 'rgba(26,32,44,0.6)', border: '1px solid rgba(99,179,237,0.18)',
                  borderRadius: 10, padding: 14
                }}>
                  <p style={{ color: '#e8edf5', fontSize: 12, lineHeight: 1.8, margin: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {result.masterPrompt}
                  </p>
                </div>
              </div>
            )}

            {result.shots && result.shots.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: '#90cdf4', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {result.shots.length} Shots · Tổng {result.shots.reduce((s, sh) => s + (sh.duration || 0), 0)}s
                  </span>
                  <CopyBtn
                    label="Copy tất cả shots"
                    text={result.shots.map(s => `SHOT ${s.num} | ${s.duration}s — "${s.name}"\n${s.prompt}`).join('\n\n')}
                  />
                </div>
                {result.shots.map((shot, i) => <ShotCard key={i} shot={shot} />)}
              </div>
            )}
          </Section>

          {/* Instructions */}
          <Section icon={Clapperboard} title="📋 Hướng dẫn thực hiện trên Kling" color="#a78bfa" defaultOpen={false}>
            {result.instructions && (
              <ol style={{ margin: 0, paddingLeft: 16, color: '#a0aec0', fontSize: 12, lineHeight: 2 }}>
                {result.instructions.map((step, i) => (
                  <li key={i} style={{ color: '#e2e8f0' }}>{step.replace(/^\d+\.\s*/, '')}</li>
                ))}
              </ol>
            )}
            <div style={{
              marginTop: 12, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
              borderRadius: 8, padding: '10px 12px', fontSize: 11, color: '#a78bfa'
            }}>
              💡 Mẹo: Có thể cần generate 2–3 lần để đạt kết quả tốt nhất. Upload 2–4 ảnh từ nhiều góc làm Element cho kết quả ổn định hơn.
            </div>
          </Section>
        </div>
      )}

      {/* CSS keyframe for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
