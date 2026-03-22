import { useState, useRef } from 'react'
import {
  Upload, Sparkles, RotateCcw, Download, Save, Trash2, ChevronDown, X,
  Send, Plus, Image as ImageIcon, Settings2, Loader, FolderOpen, Check
} from 'lucide-react'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt } from '../services/masterPrompts'
import { saveToLibrary, createLibraryRecord, downloadImage, getLibraryItems } from '../services/libraryService'

// ─── Option Data (Auto = AI tự chọn tối ưu) ──────────────────────────────────

const AUTO = '🤖 Auto (AI tự chọn)'

const QUALITY_OPTS = [AUTO, '1K (SD)', '2K (HD)', '4K (Ultra)']
const ASPECT_OPTS = [AUTO, '1:1 Vuông', '9:16 Dọc (Story)', '16:9 Ngang', '3:4 Chân dung', '4:3 Landscape']

const MODEL_TYPES = [
  AUTO, 'Á Đông thanh lịch', 'Hàn Quốc ulzzang', 'Châu Âu cổ điển', 'Latina phóng khoáng',
  'Châu Phi hiện đại', 'Trung Đông sang trọng',
]
const BACKGROUNDS = [
  AUTO, 'Studio trắng chuyên nghiệp', 'Studio xám phẳng', 'Ngoài trời thành phố', 'Bãi biển nhiệt đới',
  'Quán cafe vintage', 'Showroom cao cấp', 'Phố cổ châu Âu', 'Vườn hoa lãng mạn',
  'Nội thất sang trọng', 'Phông nền gradient', 'Sân thượng rooftop',
]
const POSES = [
  AUTO, 'Đứng thẳng tự tin', 'Tay chống hông', 'Đi bộ catwalk', 'Ngồi ghế thanh lịch',
  'Tựa tường cool', 'Xoay nhẹ 3/4', 'Tay vuốt tóc', 'Nhảy tung tăng',
  'Ngồi bệt casual', 'Đứng nghiêng nhẹ',
]
const STYLES = [
  AUTO, 'Thời trang cao cấp', 'Street style', 'Tối giản Minimalist', 'Vintage retro',
  'Sporty năng động', 'Bohemian tự do', 'Công sở thanh lịch', 'Đồ ngủ/homewear',
  'Dạ hội/tiệc tối', 'Y2K trendy',
]
const SKIN_FILTERS = [
  AUTO, 'Da trắng hồng', 'Da trắng sáng', 'Da sứ Hàn Quốc', 'Da nâu khỏe',
  'Da rám nắng', 'Da olive Địa Trung Hải',
]
const TONE_FILTERS = [
  AUTO, 'Warm vintage', 'Cool tone xanh', 'Pastel nhẹ nhàng', 'Moody tối',
  'Golden hour', 'Film analog', 'High contrast', 'Soft dreamy', 'Cinematic',
]

const QUICK_EDITS = [
  '✨ Nâng ngực tự nhiên', '🦵 Kéo chân dài thêm', '🌸 Da trắng hồng mịn',
  '💪 Eo thon gọn', '💇 Tóc bồng bềnh', '👁️ Mắt to sáng',
  '💋 Môi căng mọng', '🌟 Tăng độ sắc nét', '🎨 Làm nổi sản phẩm',
  '🔆 Tăng sáng tổng thể', '🌈 Màu sắc sống động', '📐 Cân đối bố cục',
]

// ─── Helper: Convert image entry to File ──────────────────────────────────────
async function entryToFile(entry, name = 'image.png') {
  if (entry.file) return entry.file
  const resp = await fetch(entry.url)
  const blob = await resp.blob()
  return new File([blob], name, { type: blob.type || 'image/png' })
}
async function entriesToFiles(entries) {
  return Promise.all(entries.map((e, i) => entryToFile(e, `img-${i}.png`)))
}

// ─── 8 Shot Variations (Bot 5 template) ───────────────────────────────────────
const SHOT_VARIATIONS = [
  'Shot 1: Full-body front-facing confident stance, slight S-curve, hands naturally at sides, garment fully visible head to toe — hero lookbook opener.',
  'Shot 2: 3/4 angle walking toward camera, left foot forward mid-stride, hair flowing, fabric in gentle motion — dynamic catwalk.',
  'Shot 3: Waist-up close-up, hands gently touching neckline, focus on fabric texture and design details, soft bokeh background — product detail.',
  'Shot 4: Side angle full-body, hand on hip, weight on one leg, showing garment silhouette and drape — body contour showcase.',
  'Shot 5: Sitting elegantly on chair or cafe setting, legs crossed, relaxed lifestyle pose — lifestyle context.',
  'Shot 6: Gentle spin/twirl captured mid-motion, dress hem and hair flowing, joyful expression — motion energy.',
  'Shot 7: Close-up face and upper body, genuine smile, hand touching earring or hair, eye contact with camera — emotional connection.',
  'Shot 8: Editorial over-shoulder look-back, dramatic rim lighting, wind effect on hair and dress, cinematic wide composition — magazine-cover finale.',
]

// ─── Dropdown Component ───────────────────────────────────────────────────────

function Dropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="dropdown-trigger">
        <span style={{ flex: 1, textAlign: 'left' }}>{value || placeholder}</span>
        <ChevronDown size={13} style={{ opacity: 0.4 }} />
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(opt => (
            <button key={opt} type="button"
              className={`dropdown-item ${value === opt ? 'active' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pill Selector ────────────────────────────────────────────────────────────

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button key={opt} type="button"
          className={`pill-select ${value === opt ? 'active' : ''}`}
          onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Library Picker Modal ─────────────────────────────────────────────────────

function LibraryPickerModal({ onSelect, onClose, title }) {
  const items = getLibraryItems()
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
          <FolderOpen size={16} style={{ verticalAlign: -2 }} /> {title || 'Chọn từ Kho Thư Viện'}
        </h3>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            Kho thư viện trống. Hãy tải ảnh lên hoặc tách đồ trước.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, maxHeight: 400, overflowY: 'auto', padding: '4px 0' }}>
            {items.map(item => (
              <div key={item.id} onClick={() => onSelect(item)}
                style={{ cursor: 'pointer', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--border)', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <img src={item.imageSrc} alt={item.name}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '4px 6px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ─── Image Slot ───────────────────────────────────────────────────────────────

function ImageSlot({ src, onRemove, onPickLibrary }) {
  if (src) {
    return (
      <div className="img-slot filled">
        <img src={src} alt="" />
        <button className="img-slot-remove" onClick={onRemove}><X size={12} /></button>
      </div>
    )
  }
  return (
    <div className="img-slot empty" onClick={onPickLibrary} title="Chọn từ Kho Thư Viện">
      <Plus size={18} style={{ color: 'var(--brand)' }} />
      <span style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>Kho</span>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ idx, imageSrc, isLoading, error, onSave, onDownload, onDelete, onEdit, allImages }) {
  const [chatMsg, setChatMsg] = useState('')
  const [editing, setEditing] = useState(false)
  const refUpload = useRef()

  const handleQuickEdit = (label) => {
    setChatMsg(label.replace(/^[^\s]+\s/, ''))
  }

  return (
    <div className="nd-result-card">
      <div className="nd-result-img-wrap">
        {isLoading ? (
          <div className="nd-result-loading">
            <Loader size={24} className="spin" style={{ color: 'var(--brand)' }} />
            <span>Đang tạo ảnh {idx + 1}...</span>
          </div>
        ) : error ? (
          <div className="nd-result-loading">
            <span style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>❌ {error}</span>
          </div>
        ) : imageSrc ? (
          <img src={imageSrc} alt={`Kết quả ${idx + 1}`} className="nd-result-img" />
        ) : (
          <div className="nd-result-loading">
            <ImageIcon size={28} style={{ opacity: 0.2 }} />
            <span>Ảnh {idx + 1}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {imageSrc && (
        <div className="nd-result-actions">
          <button className="icon-btn" onClick={onSave} title="Lưu kho"><Save size={14} /></button>
          <button className="icon-btn" onClick={onDownload} title="Tải xuống"><Download size={14} /></button>
          <button className="icon-btn" onClick={onDelete} title="Xóa"
            style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
        </div>
      )}

      {/* Chat / Edit area */}
      {imageSrc && (
        <div className="nd-result-chat">
          <div className="nd-quick-edits">
            {QUICK_EDITS.slice(0, 6).map(q => (
              <button key={q} className="nd-quick-btn" onClick={() => handleQuickEdit(q)}>{q}</button>
            ))}
          </div>
          <div className="nd-chat-input-wrap">
            <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              placeholder="Yêu cầu chỉnh sửa ảnh..." className="nd-chat-input"
              onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }} />
            <button className="nd-chat-send" disabled={!chatMsg.trim()}
              onClick={() => { if (chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

function SaveDesignModal({ imageSrc, projectName, onClose }) {
  const existing = getLibraryItems()
  const num = String(existing.filter(i => i.name?.startsWith('DESIGN')).length + 1).padStart(3, '0')
  const [name, setName] = useState(projectName ? `DESIGN-${projectName}-${num}` : `DESIGN-${num}`)
  const [type, setType] = useState('product')

  const handleSave = () => {
    const record = createLibraryRecord({ name: name.trim() || `DESIGN-${num}`, type, category: 'other', imageSrc })
    saveToLibrary(record)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Lưu vào Kho</h3>
        <img src={imageSrc} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 'var(--r-sm)', background: '#f5f5f5', marginBottom: 12 }} />
        <label className="select-label">Mã định danh</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field"
          style={{ marginBottom: 12, fontFamily: 'monospace', fontWeight: 600 }} />
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button className={`toggle-pill ${type === 'product' ? 'active' : ''}`} onClick={() => setType('product')}>Sản phẩm</button>
          <button className={`toggle-pill ${type === 'model' ? 'active' : ''}`} onClick={() => setType('model')}>Người mẫu</button>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave}>Lưu ngay</button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function NewDesignPage() {
  // Refs
  const refFileRef = useRef()
  const productFileRef = useRef()
  const refAddRef = useRef()

  // Images
  const [refImages, setRefImages] = useState([])
  const [productImages, setProductImages] = useState([])

  // Settings — tất cả mặc định Auto (VN DNA Gen Z)
  const [quality, setQuality] = useState(AUTO)
  const [aspect, setAspect] = useState(AUTO)
  const [modelType, setModelType] = useState(AUTO)
  const [background, setBackground] = useState(AUTO)
  const [pose, setPose] = useState(AUTO)
  const [style, setStyle] = useState(AUTO)
  const [skinFilter, setSkinFilter] = useState(AUTO)
  const [toneFilter, setToneFilter] = useState(AUTO)
  const [prompt, setPrompt] = useState('')
  const [projectName, setProjectName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Results
  const [results, setResults] = useState(Array(8).fill(null))
  const [loadingIdx, setLoadingIdx] = useState(new Set())
  const [errors, setErrors] = useState({})
  const [generating, setGenerating] = useState(false)

  // Modals
  const [saveModal, setSaveModal] = useState(null)
  const [libraryPicker, setLibraryPicker] = useState(null) // 'ref' | 'product' | null

  // ─── File handlers ────────────────────────────────────────────────────────

  const addRefImage = (files) => {
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5 - refImages.length)
    setRefImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
  }

  const addProductImage = (files) => {
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8 - productImages.length)
    setProductImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
  }

  // Chọn ảnh từ Kho Thư Viện
  const handleLibraryPick = (item) => {
    const entry = { url: item.imageSrc, file: null, fromLibrary: true }
    if (libraryPicker === 'ref' && refImages.length < 5) {
      setRefImages(prev => [...prev, entry])
    } else if (libraryPicker === 'product' && productImages.length < 8) {
      setProductImages(prev => [...prev, entry])
    }
    setLibraryPicker(null)
  }


  // ─── 🤖 MULTI-BOT PIPELINE: Generate 8 images ─────────────────────────────

  const handleGenerate = async () => {
    if (productImages.length === 0) return
    setGenerating(true)
    setErrors({})
    setResults(Array(8).fill(null))
    setLoadingIdx(new Set([0, 1, 2, 3, 4, 5, 6, 7]))

    try {
      // STEP 1: Convert all images to Files
      const productFiles = await entriesToFiles(productImages)
      const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []

      // STEP 2: Bot 1 (Identity) + Bot 2 (Garment) — PARALLEL analysis
      const [extractedIdentity, extractedProduct] = await Promise.all([
        refFiles.length > 0
          ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
          : Promise.resolve(''),
        callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
      ])

      console.log('[Bot1 Identity]', extractedIdentity?.substring(0, 120))
      console.log('[Bot2 Garment]', extractedProduct?.substring(0, 120))

      // STEP 3: Build 4 Master Prompts (one per shot variation)
      const masterPrompts = SHOT_VARIATIONS.map(shotDesc =>
        buildMasterImagePrompt({
          extractedIdentity,
          extractedProduct,
          modelType, background, pose, style, skinFilter, toneFilter,
          quality, aspect,
          userPrompt: prompt,
          shotDescription: shotDesc,
        })
      )

      // STEP 4: Generate 4 images in parallel
      const mainProductFile = productFiles[0]
      const tasks = masterPrompts.map((mPrompt, idx) =>
        (async () => {
          try {
            const result = await generateGarmentImage(mainProductFile, mPrompt, { quality, aspect })
            const dataUrl = `data:${result.mimeType};base64,${result.base64}`
            setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
          } catch (err) {
            console.error(`[Design Gen ${idx}]`, err)
            setErrors(prev => ({ ...prev, [idx]: err.message }))
          }
          setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
        })()
      )
      await Promise.all(tasks)
    } catch (err) {
      console.error('[Pipeline Error]', err)
      setErrors({ 0: err.message, 1: err.message, 2: err.message, 3: err.message })
      setLoadingIdx(new Set())
    }
    setGenerating(false)
  }

  // ─── 🤖 BOT 7: Edit image via chat ───────────────────────────────────────

  const handleEditImage = async (idx, editPrompt) => {
    if (!results[idx]) return
    setLoadingIdx(prev => new Set(prev).add(idx))
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

    try {
      const resp = await fetch(results[idx])
      const blob = await resp.blob()
      const file = new File([blob], 'edit.png', { type: 'image/png' })

      // Bot 7: Precision Retoucher
      const retouchPrompt = `${getPrompt('BOT7_PRECISION_RETOUCHER')}\n\nUSER EDIT COMMAND: ${editPrompt}\n\nApply the edit precisely. Return the modified image.`
      const result = await generateGarmentImage(file, retouchPrompt, { quality, aspect })
      const dataUrl = `data:${result.mimeType};base64,${result.base64}`
      setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
    } catch (err) {
      setErrors(prev => ({ ...prev, [idx]: err.message }))
    }
    setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
  }

  const canGenerate = productImages.length > 0 && !generating

  return (
    <div className="fade-in">
      <h1 className="page-title">✨ Thiết kế mới</h1>

      <div className="nd-layout">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="nd-left">

          {/* ── Step 1: Ảnh mẫu tham khảo ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">1</div>
              <div className="design-step-title">Ảnh mẫu tham khảo ({refImages.length}/5)</div>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => refFileRef.current?.click()}>
                <Upload size={13} /> Tải lên
              </button>
              <input ref={refFileRef} type="file" accept="image/*" multiple hidden
                onChange={e => addRefImage(e.target.files)} />
            </div>
            <div className="nd-img-grid">
              {refImages.map((img, i) => (
                <ImageSlot key={i} src={img.url}
                  onRemove={() => setRefImages(prev => prev.filter((_, j) => j !== i))} />
              ))}
              {refImages.length < 5 && (
                <ImageSlot onPickLibrary={() => setLibraryPicker('ref')} />
              )}
            </div>
          </div>

          {/* ── Step 2: Sản phẩm ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">2</div>
              <div className="design-step-title">Sản phẩm của bạn ({productImages.length}/8)</div>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => productFileRef.current?.click()}>
                <Upload size={13} /> Tải lên
              </button>
              <input ref={productFileRef} type="file" accept="image/*" multiple hidden
                onChange={e => addProductImage(e.target.files)} />
            </div>
            <div className="nd-img-grid">
              {productImages.map((img, i) => (
                <ImageSlot key={i} src={img.url}
                  onRemove={() => setProductImages(prev => prev.filter((_, j) => j !== i))} />
              ))}
              {productImages.length < 8 && (
                <ImageSlot onPickLibrary={() => setLibraryPicker('product')} />
              )}
            </div>
          </div>

          {/* ── Step 3: Cài đặt ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">3</div>
              <div className="design-step-title">Cài đặt nâng cao</div>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => setShowAdvanced(p => !p)}>
                <Settings2 size={13} /> {showAdvanced ? 'Ẩn' : 'Mở rộng'}
              </button>
            </div>
            <div className="design-step-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Project name */}
              <div className="form-group">
                <label className="form-label">Tên dự án / Mã video</label>
                <input type="text" className="input-field" value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="VD: BST Xuân 2026 / VID-001" />
              </div>

              {/* Quality + Aspect */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Chất lượng ảnh</label>
                  <Dropdown options={QUALITY_OPTS} value={quality} onChange={setQuality} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Tỷ lệ khung hình</label>
                  <Dropdown options={ASPECT_OPTS} value={aspect} onChange={setAspect} placeholder="Chọn..." />
                </div>
              </div>

              {/* Model + Background */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Kiểu Model</label>
                  <Dropdown options={MODEL_TYPES} value={modelType} onChange={setModelType} placeholder="Chọn kiểu model..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Phông nền</label>
                  <Dropdown options={BACKGROUNDS} value={background} onChange={setBackground} placeholder="Chọn phông nền..." />
                </div>
              </div>

              {/* Pose + Style */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tư thế</label>
                  <Dropdown options={POSES} value={pose} onChange={setPose} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Phong cách</label>
                  <Dropdown options={STYLES} value={style} onChange={setStyle} placeholder="Chọn..." />
                </div>
              </div>

              {/* Advanced section */}
              {showAdvanced && (
                <>
                  <div className="form-group">
                    <label className="form-label">🎨 Tone da / Skin Filter</label>
                    <PillSelect options={SKIN_FILTERS} value={skinFilter} onChange={setSkinFilter} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">🌈 Tone màu / Color Filter</label>
                    <PillSelect options={TONE_FILTERS} value={toneFilter} onChange={setToneFilter} />
                  </div>
                </>
              )}

              {/* User prompt — luôn ưu tiên */}
              <div className="form-group">
                <label className="form-label">📝 Mô tả thêm <span style={{ color: 'var(--brand)', fontWeight: 700 }}>(Ưu tiên cao nhất)</span></label>
                <textarea className="form-input" style={{ height: 80, padding: '10px 14px', resize: 'vertical' }}
                  placeholder="VD: Model tóc dài, tay cầm túi, ánh sáng golden hour, zoom vào chi tiết thêu..."
                  value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>

              {/* Generate button */}
              <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}
                onClick={handleGenerate} disabled={!canGenerate}>
                {generating ? (
                  <><Loader size={17} className="spin" /> Đang tạo 8 phân cảnh AI...</>
                ) : (
                  <><Sparkles size={17} /> Tạo 8 thiết kế AI</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Results ═══ */}
        <div className="nd-right">
          <div className="design-step" style={{ height: '100%' }}>
            <div className="design-step-header">
              <div className="design-step-number">4</div>
              <div className="design-step-title">Kết quả ({results.filter(Boolean).length}/4)</div>
            </div>
            <div className="nd-results-grid">
              {[0, 1, 2, 3].map(idx => (
                <ResultCard key={idx} idx={idx}
                  imageSrc={results[idx]}
                  isLoading={loadingIdx.has(idx)}
                  error={errors[idx]}
                  onSave={() => setSaveModal(results[idx])}
                  onDownload={() => downloadImage(results[idx], `${projectName || 'design'}-${idx + 1}`)}
                  onDelete={() => setResults(prev => { const n = [...prev]; n[idx] = null; return n })}
                  onEdit={(msg) => handleEditImage(idx, msg)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {saveModal && (
        <SaveDesignModal imageSrc={saveModal} projectName={projectName}
          onClose={() => setSaveModal(null)} />
      )}

      {/* Library Picker Modal */}
      {libraryPicker && (
        <LibraryPickerModal
          title={libraryPicker === 'ref' ? 'Chọn ảnh mẫu từ Kho' : 'Chọn sản phẩm từ Kho'}
          onClose={() => setLibraryPicker(null)}
          onSelect={handleLibraryPick}
        />
      )}
    </div>
  )
}
