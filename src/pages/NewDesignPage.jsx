import { useState, useRef } from 'react'
import {
  Upload, Sparkles, RotateCcw, Download, Save, Trash2, ChevronDown, X,
  Send, Plus, Image as ImageIcon, Settings2, Loader, FolderOpen, Check, Eye
} from 'lucide-react'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt } from '../services/masterPrompts'
import { saveToLibrary, createLibraryRecord, downloadImage, getLibraryItems } from '../services/libraryService'
import { POSE_LIBRARY, POSE_CATEGORIES, getPosesByCategory, PROMPT_TEMPLATES } from '../services/poseLibrary'

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

// ─── 8 Shot Variations — Diverse Professional Fashion Model Poses ─────────────
const SHOT_VARIATIONS = [
  'Shot 1 (Front Hero): Full-body front-facing, confident natural stance with slight S-curve hip shift, one hand lightly touching thigh, sweet genuine smile, camera at eye level — classic lookbook opener showing full garment.',
  'Shot 2 (Dynamic Walk): 3/4 angle mid-stride catwalk toward camera, hair flowing with movement, fabric swaying naturally, playful confident expression, slight head tilt — energy and motion.',
  'Shot 3 (Side Profile): Full-body pure side angle, elegant posture, chin slightly lifted, one foot forward creating long leg line, hands relaxed at sides — showcase silhouette and garment drape.',
  'Shot 4 (Back View Turn): Model from behind, head turned 3/4 looking back over shoulder with a sweet coy smile, showing garment back design, hair cascading, camera slightly below — mysterious allure.',
  'Shot 5 (Sitting Elegant): Sitting gracefully on stylish chair or step, legs crossed elegantly, one hand on knee, leaning slightly forward with warm inviting expression — approachable lifestyle.',
  'Shot 6 (Playful Jump): Captured mid-air in a joyful light jump or hop, arms slightly out, hair bouncing up, dress/skirt floating, genuine laughing expression — youthful fun energy.',
  'Shot 7 (Detail Close-up): Upper body close-up from chest to face, hands gently touching collar or earring, focus on fabric texture and skin glow, shallow depth of field bokeh — intimate product detail and beauty.',
  'Shot 8 (Editorial Finale): Artistic wide-angle composition, gentle wind blowing hair and fabric, golden-hour rim lighting, model in a graceful flowing pose with arms slightly extended — magazine-cover cinematic finale.',
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
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 30 }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
          <FolderOpen size={18} style={{ verticalAlign: -3 }} /> {title || 'Chọn từ Kho Thư Viện'}
        </h3>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Kho thư viện trống. Hãy tải ảnh lên hoặc tách đồ trước.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {items.map(item => (
              <div key={item.id} onClick={() => onSelect(item)}
                style={{ cursor: 'pointer', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--border)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}>
                <img src={item.imageSrc} alt={item.name}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
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

function ResultCard({ idx, imageSrc, isLoading, error, onSave, onDownload, onDelete, onEdit, onPreview }) {
  const [chatMsg, setChatMsg] = useState('')
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
          <>
            <img src={imageSrc} alt={`Kết quả ${idx + 1}`} className="nd-result-img" />
            <button className="nd-preview-btn" onClick={onPreview} title="Xem phóng to">
              <Eye size={16} />
            </button>
          </>
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
          <button className="icon-btn" onClick={onPreview} title="Xem phóng to"><Eye size={14} /></button>
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

// ─── Image Preview Modal (Fullscreen) ──────────────────────────────────────────

function ImagePreviewModal({ imageSrc, onClose }) {
  if (!imageSrc) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'zoom-out'
    }} onClick={onClose}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 18, right: 24, background: 'rgba(255,255,255,0.15)',
        border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
      }}><X size={22} /></button>
      <img src={imageSrc} alt="Preview" onClick={e => e.stopPropagation()} style={{
        maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain',
        borderRadius: 12, boxShadow: '0 8px 60px rgba(0,0,0,0.6)', cursor: 'default'
      }} />
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

  // Settings — defaults ưu tiên cho user (không phải Auto)
  const [quality, setQuality] = useState('2K (HD)')
  const [aspect, setAspect] = useState('9:16 Dọc (Story)')
  const [modelType, setModelType] = useState(AUTO)
  const [background, setBackground] = useState(AUTO)
  const [pose, setPose] = useState(AUTO)
  const [style, setStyle] = useState(AUTO)
  const [skinFilter, setSkinFilter] = useState('Da trắng hồng')
  const [toneFilter, setToneFilter] = useState('Soft dreamy')
  const [prompt, setPrompt] = useState('')
  const [projectName, setProjectName] = useState('')

  // Results
  const [results, setResults] = useState(Array(8).fill(null))
  const [loadingIdx, setLoadingIdx] = useState(new Set())
  const [errors, setErrors] = useState({})
  const [generating, setGenerating] = useState(false)

  // Modals
  const [saveModal, setSaveModal] = useState(null)
  const [previewImg, setPreviewImg] = useState(null)
  const [libraryPicker, setLibraryPicker] = useState(null)

  // Pose Library
  const [selectedPoses, setSelectedPoses] = useState([])
  const [poseCategory, setPoseCategory] = useState('all')
  const [poseRefImages, setPoseRefImages] = useState([])
  const [showPoseLibrary, setShowPoseLibrary] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const poseRefFileRef = useRef() // 'ref' | 'product' | null

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

      // STEP 3: Build 8 Master Prompts (one per shot variation)
      // If user selected poses, cycle through them for each shot
      const posePromptExtras = selectedPoses.length > 0
        ? selectedPoses.map(p => `\n[POSE REFERENCE — MUST FOLLOW EXACTLY]\n${p.promptEN}\nCamera angle: ${p.cameraAngle}\nBody focus: ${p.bodyFocus}`)
        : ['']
      const templateExtra = selectedTemplate ? `\nPhotography style: ${selectedTemplate.promptPrefix}` : ''

      const masterPrompts = SHOT_VARIATIONS.map((shotDesc, idx) => {
        const poseExtra = posePromptExtras[idx % posePromptExtras.length]
        const combinedUserPrompt = [prompt, poseExtra, templateExtra].filter(Boolean).join('\n')
        return buildMasterImagePrompt({
          extractedIdentity,
          extractedProduct,
          modelType, background, pose, style, skinFilter, toneFilter,
          quality, aspect,
          userPrompt: combinedUserPrompt,
          shotDescription: selectedPoses.length > 0 ? selectedPoses[idx % selectedPoses.length].promptEN : shotDesc,
        })
      })

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

          {/* ── Step 2.5: Pose Library ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number" style={{ background: 'linear-gradient(135deg, #e91e63, #ff5722)' }}>P</div>
              <div className="design-step-title">📸 THƯ VIỆN TƯ THẾ (POSE)</div>
            </div>
            <div className="nd-settings-body">

              {/* Upload pose reference images */}
              <div className="form-group">
                <label className="nd-label">ẢNH TƯ THẾ THAM CHIẾU (tùy chọn)</label>
                <div className="nd-img-grid">
                  {poseRefImages.map((img, i) => (
                    <div key={i} className="img-slot filled">
                      <img src={img.url} alt="" />
                      <button className="img-slot-remove" onClick={() => setPoseRefImages(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                    </div>
                  ))}
                  {poseRefImages.length < 3 && (
                    <>
                      <div className="img-slot empty" onClick={() => setShowPoseLibrary(true)} title="Chọn từ thư viện Pose">
                        <Plus size={18} style={{ color: 'var(--brand)' }} />
                        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Kho Pose</span>
                      </div>
                    </>
                  )}
                  <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => poseRefFileRef.current?.click()}>
                    <Upload size={12} /> Tải
                  </button>
                  <input ref={poseRefFileRef} type="file" accept="image/*" multiple hidden
                    onChange={e => {
                      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/')).slice(0, 3 - poseRefImages.length)
                      setPoseRefImages(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
                    }} />
                </div>
              </div>

              {/* Selected poses display */}
              {selectedPoses.length > 0 && (
                <div className="pose-selected-card">
                  <div className="pose-selected-info">
                    <span className="pose-selected-emoji">✅ {selectedPoses.length}/9</span>
                    <div>
                      <div className="pose-selected-name">Đã chọn {selectedPoses.length} tư thế</div>
                      <div className="pose-selected-desc">{selectedPoses.map(p => p.name).join(' • ')}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 11, flexShrink: 0 }}
                    onClick={() => setSelectedPoses([])}>
                    <X size={12} /> Xóa hết
                  </button>
                </div>
              )}

              {/* Pose Library toggle */}
              <button className="pose-lib-toggle" onClick={() => setShowPoseLibrary(p => !p)}>
                {showPoseLibrary ? 'Thu gọn thư viện' : `📚 Mở thư viện ${POSE_LIBRARY.length} tư thế`}
              </button>

              {/* Pose Library grid */}
              {showPoseLibrary && (
                <div className="pose-library">
                  {/* Category tabs */}
                  <div className="pose-categories">
                    {POSE_CATEGORIES.map(cat => (
                      <button key={cat.id}
                        className={`pose-cat-btn${poseCategory === cat.id ? ' active' : ''}`}
                        onClick={() => setPoseCategory(cat.id)}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* Pose cards with images */}
                  <div className="pose-grid">
                    {getPosesByCategory(poseCategory).map(p => {
                      const isSelected = selectedPoses.some(sp => sp.id === p.id)
                      return (
                        <div key={p.id}
                          className={`pose-card${isSelected ? ' selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPoses(prev => prev.filter(sp => sp.id !== p.id))
                            } else if (selectedPoses.length < 9) {
                              setSelectedPoses(prev => [...prev, p])
                            }
                          }}>
                          <img src={p.thumbnail} alt={p.name} className="pose-card-img" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                          <div className="pose-card-emoji-fallback" style={{ display: 'none' }}>{p.emoji}</div>
                          <div className="pose-card-name">{p.name}</div>
                          <div className="pose-card-focus">{p.bodyFocus}</div>
                          {isSelected && <div className="pose-card-check">✅</div>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                    💡 Chọn tối đa 9 tư thế — mỗi ảnh đầu ra sẽ sử dụng 1 tư thế khác nhau
                  </div>
                </div>
              )}

              {/* Prompt Template quick select */}
              <div className="form-group">
                <label className="nd-label">PHONG CÁCH CHỤP</label>
                <div className="pose-templates">
                  {PROMPT_TEMPLATES.map(t => (
                    <button key={t.id}
                      className={`pose-tpl-btn${selectedTemplate?.id === t.id ? ' active' : ''}`}
                      onClick={() => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                      title={t.description}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Step 3: Cài đặt ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">3</div>
              <div className="design-step-title">Tùy chọn thiết kế</div>
            </div>
            <div className="nd-settings-body">

              {/* Project name */}
              <div className="form-group">
                <label className="nd-label">TÊN DỰ ÁN / MÃ VIDEO</label>
                <input type="text" className="nd-input" value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="VD: BST Xuân 2026 / VID-001" />
              </div>

              {/* Quality + Aspect */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">CHẤT LƯỢNG ẢNH</label>
                  <Dropdown options={QUALITY_OPTS} value={quality} onChange={setQuality} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">TỶ LỆ KHUNG HÌNH</label>
                  <Dropdown options={ASPECT_OPTS} value={aspect} onChange={setAspect} placeholder="Chọn..." />
                </div>
              </div>

              {/* Model + Background */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">KIỂU MODEL</label>
                  <Dropdown options={MODEL_TYPES} value={modelType} onChange={setModelType} placeholder="Chọn kiểu model..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">PHÔNG NỀN</label>
                  <Dropdown options={BACKGROUNDS} value={background} onChange={setBackground} placeholder="Chọn phông nền..." />
                </div>
              </div>

              {/* Pose + Style */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">TƯ THẾ</label>
                  <Dropdown options={POSES} value={pose} onChange={setPose} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">PHONG CÁCH</label>
                  <Dropdown options={STYLES} value={style} onChange={setStyle} placeholder="Chọn..." />
                </div>
              </div>

              {/* Skin Filter — always visible */}
              <div className="form-group">
                <label className="nd-label">🎨 TONE DA / SKIN FILTER</label>
                <PillSelect options={SKIN_FILTERS} value={skinFilter} onChange={setSkinFilter} />
              </div>

              {/* Tone Filter — always visible */}
              <div className="form-group">
                <label className="nd-label">🌈 TONE MÀU / COLOR FILTER</label>
                <PillSelect options={TONE_FILTERS} value={toneFilter} onChange={setToneFilter} />
              </div>

              {/* User prompt — luôn ưu tiên */}
              <div className="form-group">
                <label className="nd-label">📝 MÔ TẢ THÊM <span style={{ color: 'var(--brand)', fontWeight: 800 }}>(ƯU TIÊN CAO NHẤT)</span></label>
                <textarea className="nd-textarea"
                  placeholder="VD: Model tóc dài, tay cầm túi, ánh sáng golden hour, zoom vào chi tiết thêu..."
                  value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>

              {/* Generate button */}
              <button className="nd-generate-btn" onClick={handleGenerate} disabled={!canGenerate}>
                {generating ? (
                  <><Loader size={18} className="spin" /> Đang tạo 8 phân cảnh AI...</>
                ) : (
                  <><Sparkles size={18} /> Tạo 8 thiết kế AI</>
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
              <div className="design-step-title">Kết quả ({results.filter(Boolean).length}/8)</div>
            </div>
            <div className="nd-results-grid">
              {[0, 1, 2, 3, 4, 5, 6, 7].map(idx => (
                <ResultCard key={idx} idx={idx}
                  imageSrc={results[idx]}
                  isLoading={loadingIdx.has(idx)}
                  error={errors[idx]}
                  onPreview={() => setPreviewImg(results[idx])}
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

      {/* Image Preview Modal */}
      {previewImg && (
        <ImagePreviewModal imageSrc={previewImg} onClose={() => setPreviewImg(null)} />
      )}
    </div>
  )
}
