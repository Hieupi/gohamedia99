import { useState, useRef, useCallback } from 'react'
import { Upload, RotateCcw, Download, Save, ChevronDown, AlertCircle, Eye } from 'lucide-react'
import Portal from '../components/Portal'
import { detectObjects, generateGarmentImage } from '../services/geminiService'
import { getPrompt } from '../services/masterPrompts'
import { getApiKeys } from '../services/apiKeyService'
import { saveToLibrary, createLibraryRecord, getLibraryItems, generateUniqueName } from '../services/libraryService'

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

const SHARPNESS_OPTIONS = [
  { value: 'standard', label: 'Chuẩn' },
  { value: 'sharp', label: 'Tăng nét mạnh' },
  { value: 'ultra', label: 'Ultra chi tiết' },
]

// Chế độ xuất ảnh
const OUTPUT_MODES = [
  {
    value: 'original',
    label: 'Giữ nguyên 100%',
    icon: '🖼️',
    desc: 'Chỉ tách nền, giữ nguyên ảnh gốc trên nền trắng',
  },
  {
    value: 'multiview',
    label: 'MultiView 3 góc',
    icon: '🔄',
    desc: 'Sản phẩm từ 3 góc nhìn khác nhau trên nền trắng',
  },
  {
    value: 'ai_suggest',
    label: 'AI Đề xuất góc đẹp',
    icon: '✨',
    desc: 'AI phân tích & đề xuất góc chụp đẹp nhất',
  },
]

const CATEGORY_PREFIX = {
  electronics: 'ĐIỆN TỬ',
  furniture: 'NỘI THẤT',
  cosmetics: 'MỸ PHẨM',
  food: 'THỰC PHẨM',
  appliance: 'GIA DỤNG',
  clothing: 'THỜI TRANG',
  bag: 'TÚI',
  book: 'SÁCH',
  toy: 'ĐỒ CHƠI',
  other: 'SẢN PHẨM',
  background: 'NỀN',
}

// ─── Prompts theo chế độ ──────────────────────────────────────────────────────

function buildOriginalPrompt(item, productName, quality, aspect, sharpness) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'
  const sharpMap = {
    standard: 'sharp product photography',
    sharp: 'ultra-sharp, every edge crisp and defined',
    ultra: 'hyper-detailed 8K macro, microscopic surface texture visible',
  }
  const sharpStr = sharpMap[sharpness] || sharpMap.standard

  if (item.category === 'background') {
    return `Remove all products from the image. Keep only the background/scene.
Recreate the empty background. Resolution: ${res}, aspect ratio ${aspect}.`
  }

  return `TASK: Remove background only. Keep the product 100% identical to the original.

Product: "${item.nameVi}"
${item.description ? `Details: ${item.description}` : ''}

STRICT RULES:
- Keep EXACT same product appearance, color, texture, angle, position, and proportions as in the original image
- ONLY replace the background with pure white (#FFFFFF)
- Do NOT change the product angle, lighting, or any visual detail
- Do NOT redraw or enhance the product — preserve it exactly
- Add only a very subtle natural shadow beneath the product
- ${sharpStr}
- Resolution: ${res}, aspect ratio ${aspect}
${productName ? `- Product: "${productName}"` : ''}

Output: original product on pure white background, nothing else changed.`
}

function buildMultiViewPrompt(item, productName, quality, aspect, sharpness) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '2048x2048'
  const sharpMap = {
    standard: 'professional product photography quality',
    sharp: 'ultra-sharp lens, crisp details on all views',
    ultra: 'hyper-detailed 8K, every material texture visible',
  }
  const sharpStr = sharpMap[sharpness] || sharpMap.standard

  const viewHints = getMultiViewHints(item)

  return `TASK: Create a MULTI-VIEW product photograph showing 3 different angles of the same product.

Product: "${item.nameVi}"
${item.description ? `Details: ${item.description}` : ''}

LAYOUT: Arrange all 3 views side by side (or in a clean grid) on a PURE WHITE background (#FFFFFF).

THE 3 VIEWS TO CREATE:
${viewHints}

RULES FOR ALL VIEWS:
- Pure white background (#FFFFFF) throughout
- Consistent studio lighting across all 3 views
- Each view shows the SAME product with exact same colors, materials, and proportions
- Clean professional e-commerce product photography
- ${sharpStr}
- Resolution: ${res}, aspect ratio ${aspect}
${productName ? `- Product: "${productName}"` : ''}

Output: a single image showing all 3 product views arranged on white background.`
}

function getMultiViewHints(item) {
  const cat = item.category
  if (cat === 'electronics') {
    return `1. FRONT VIEW: Screen/face of the device, straight on
2. CLOSED/BACK VIEW: Device closed or showing the back panel
3. SIDE/ANGLE VIEW: 3/4 angle showing depth and ports`
  }
  if (cat === 'furniture') {
    return `1. FRONT VIEW: Straight-on frontal view
2. SIDE VIEW: Profile view showing silhouette
3. 3/4 ANGLE: Diagonal view showing depth and form`
  }
  if (cat === 'bag') {
    return `1. FRONT VIEW: Main face of the bag
2. BACK VIEW: Reverse side
3. SIDE/TOP VIEW: Side profile or top-down view`
  }
  if (cat === 'cosmetics') {
    return `1. FRONT VIEW: Label/branding facing camera
2. BACK VIEW: Ingredient list / back label
3. OPEN/DETAIL VIEW: Product open or close-up of texture`
  }
  return `1. FRONT VIEW: Main face, straight on
2. BACK/REVERSE VIEW: Opposite side
3. 3/4 ANGLE VIEW: Diagonal perspective showing form and depth`
}

function buildAiSuggestPrompt(item, productName, quality, aspect, sharpness) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '2048x2048'
  const sharpMap = {
    standard: 'professional product photography quality',
    sharp: 'ultra-sharp, every detail crisp',
    ultra: 'hyper-detailed 8K ultra-sharp photography',
  }
  const sharpStr = sharpMap[sharpness] || sharpMap.standard

  return `TASK: You are a professional product photographer. Analyze this product and create the MOST VISUALLY COMPELLING photograph possible.

Product: "${item.nameVi}"
${item.description ? `Details: ${item.description}` : ''}

STEP 1 — ANALYSIS: Study the product's:
- Shape, form factor, and key design features
- Materials, textures, and surface finishes
- Most photogenic angle that shows the product's best features
- Lighting that would best flatter this specific product

STEP 2 — CREATE THE BEST SHOT:
- Choose the single best camera angle that shows this product at its most attractive
- Place on pure white background (#FFFFFF)
- Use ideal studio lighting for this specific product type (e.g., soft box for shiny surfaces, etc.)
- Highlight the product's most compelling features
- Add a subtle reflection or shadow for depth if it enhances the image
- ${sharpStr}
- Resolution: ${res}, aspect ratio ${aspect}
${productName ? `- Product: "${productName}"` : ''}

Create the definitive hero shot of this product — the image that would look best in an advertisement or premium catalog.`
}

function buildMasterPrompt(items, productName, quality, aspect) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'
  const itemList = items.map((it, i) => `${i + 1}. ${it.nameVi}`).join('\n')

  return `Create a MASTER COMPOSITE product photograph in flat-lay style on PURE WHITE background.

Products:
${itemList}

Requirements:
- Each product arranged aesthetically in one flat-lay composition
- Pure white background (#FFFFFF)
- Soft even studio lighting, subtle natural shadows
- Maintain exact original colors, textures, proportions
- Professional e-commerce / catalog composition
- ${res} resolution, aspect ratio ${aspect}
${productName ? `- Product set: "${productName}"` : ''}

Generate the master composite flat-lay now.`
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

function SaveModal({ item, imageSrc, productName, onClose, onSave }) {
  const autoName = generateUniqueName({ category: item?.category, description: item?.nameVi })
  const [name, setName] = useState(autoName)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)

  const isDuplicate = getLibraryItems().some(i => i.name === name)

  const suggestions = [
    autoName,
    productName ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${productName}-${item?.nameVi || ''}`.slice(0, 50) : null,
    item?.description ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${item.description.slice(0, 35)}` : null,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

  const handleSave = async () => {
    setSaving(true)
    try {
      const record = createLibraryRecord({
        name: name || autoName,
        type: 'product',
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
        setSaveResult('error')
      }
    } catch {
      setSaveResult('error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
          Lưu vào Kho Tài Nguyên
        </h3>
        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          {imageSrc && (
            <img src={imageSrc} alt={name}
              style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 'var(--r-sm)', background: '#f5f5f5' }} />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 'var(--r-full)',
                fontSize: 11, fontWeight: 700, background: 'var(--brand-08)', color: 'var(--brand)',
              }}>
                {CATEGORY_PREFIX[item?.category] || 'SP'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item?.nameVi}</span>
            </div>
          </div>
        </div>
        <label className="select-label" style={{ marginBottom: 4, display: 'block' }}>Mã định danh</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="input-field"
          style={{ marginBottom: 4, fontFamily: 'monospace', fontSize: 13.5, fontWeight: 600, borderColor: isDuplicate ? '#ef4444' : undefined }} />
        {isDuplicate && (
          <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 8 }}>⚠️ Tên đã tồn tại — chọn tên khác.</div>
        )}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>GỢI Ý TÊN</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => setName(s)}
                style={{
                  padding: '4px 10px', fontSize: 11.5, fontFamily: 'monospace',
                  border: `1.5px solid ${name === s ? 'var(--brand)' : 'var(--border)'}`,
                  borderRadius: 'var(--r-full)', cursor: 'pointer',
                  background: name === s ? 'var(--brand-08)' : 'var(--white)',
                  color: name === s ? 'var(--brand)' : 'var(--text-secondary)', fontWeight: 500,
                }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {saveResult === 'error' && (
          <div style={{ fontSize: 11.5, color: '#ef4444', marginBottom: 8, textAlign: 'center' }}>❌ Lỗi lưu — thử lại.</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim() || saving || saveResult === 'ok'}>
            {saving && !saveResult ? '⏳ Đang lưu...' : saveResult === 'ok' ? '✅ Đã lưu!' : 'Lưu ngay'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Item Toggle Row ──────────────────────────────────────────────────────────

function ItemToggleRow({ item, isOn, onToggle }) {
  return (
    <div className={`item-toggle-row ${isOn ? 'active' : ''}`} onClick={onToggle}>
      <div className="item-toggle-info">
        <div className="item-toggle-name">{item.nameVi}</div>
        {item.description && <div className="item-toggle-desc">{item.description}</div>}
      </div>
      <div className={`toggle-switch ${isOn ? 'on' : ''}`}>
        <div className="toggle-knob" />
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ item, results, isLoading, onSave, onDownload, onPreview }) {
  // results = { original?, multiview?, ai_suggest? }
  const hasAny = results && Object.values(results).some(Boolean)
  const resultEntries = results ? Object.entries(results).filter(([, v]) => v) : []

  const modeLabels = {
    original: '🖼️ Gốc (Nền trắng)',
    multiview: '🔄 MultiView',
    ai_suggest: '✨ AI Đề xuất',
    'master-composite': '🖼 Flat Lay',
  }

  if (isLoading && !hasAny) {
    return (
      <div className="result-card">
        <div className="result-card-img">
          <div className="result-loading">
            <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--brand-15)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Đang xử lý {item.nameVi}...</span>
          </div>
        </div>
        <div className="result-card-footer">
          <span className="result-card-name">{item.nameVi}</span>
        </div>
      </div>
    )
  }

  if (resultEntries.length === 1) {
    const [modeKey, src] = resultEntries[0]
    return (
      <div className="result-card">
        <div className="result-card-img" style={{ position: 'relative' }}>
          <img src={src} alt={item.nameVi} />
          <button onClick={() => onPreview(src, item.nameVi)} className="result-preview-btn" title="Phóng to">
            <Eye size={16} />
          </button>
        </div>
        <div className="result-card-footer">
          <div>
            <span className="result-card-name">{item.nameVi}</span>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{modeLabels[modeKey]}</div>
          </div>
          <div className="result-card-actions">
            <button onClick={() => onSave(src, item)} title="Lưu vào Kho" className="icon-btn"><Save size={14} /></button>
            <button onClick={() => onDownload(src, `${item.nameVi}-${modeKey}`)} title="Tải xuống" className="icon-btn"><Download size={14} /></button>
          </div>
        </div>
      </div>
    )
  }

  // Multiple results — show stacked cards
  return (
    <>
      {resultEntries.map(([modeKey, src]) => (
        <div key={modeKey} className="result-card">
          <div className="result-card-img" style={{ position: 'relative' }}>
            <img src={src} alt={`${item.nameVi} — ${modeKey}`} />
            <button onClick={() => onPreview(src, `${item.nameVi} — ${modeLabels[modeKey]}`)} className="result-preview-btn" title="Phóng to">
              <Eye size={16} />
            </button>
          </div>
          <div className="result-card-footer">
            <div>
              <span className="result-card-name">{item.nameVi}</span>
              <div style={{ fontSize: 10.5, color: 'var(--brand)', marginTop: 2, fontWeight: 600 }}>{modeLabels[modeKey]}</div>
            </div>
            <div className="result-card-actions">
              <button onClick={() => onSave(src, item)} title="Lưu" className="icon-btn"><Save size={14} /></button>
              <button onClick={() => onDownload(src, `${item.nameVi}-${modeKey}`)} title="Tải" className="icon-btn"><Download size={14} /></button>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RemoveProductPage() {
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
  const [sharpness, setSharpness] = useState('standard')
  const [outputModes, setOutputModes] = useState(new Set(['original']))
  const [masterToggle, setMasterToggle] = useState(false)

  const toggleOutputMode = (mode) => {
    setOutputModes(prev => {
      const next = new Set(prev)
      if (next.has(mode)) {
        if (next.size === 1) return prev // giữ ít nhất 1 mode
        next.delete(mode)
      } else {
        next.add(mode)
      }
      return next
    })
  }

  // Generation — results keyed by itemId → { original?, multiview?, ai_suggest? }
  const [generating, setGenerating] = useState(false)
  const [generatedResults, setGeneratedResults] = useState({})  // { [itemId]: { [mode]: dataUrl } }
  const [loadingItems, setLoadingItems] = useState(new Set())
  const [itemErrors, setItemErrors] = useState({})

  // Modal
  const [saveModalData, setSaveModalData] = useState(null)
  const [previewZoom, setPreviewZoom] = useState(null)
  const [error, setError] = useState(null)

  // ─── File Handlers ──────────────────────────────────────────────────────

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
    setDetectedItems([])
    setSelectedIds(new Set())
    setGeneratedResults({})
    setItemErrors({})
    setError(null)

    const keys = getApiKeys().filter(k => k.active)
    if (keys.length === 0) {
      setError('Chưa có API key. Vui lòng thêm trong Cài đặt → API Keys.')
      return
    }

    setDetecting(true)
    try {
      const prompt = getPrompt('PRODUCT_DETECTION')
      const items = await detectObjects(file, prompt)
      if (Array.isArray(items) && items.length > 0) {
        setDetectedItems(items)
        setSelectedIds(new Set(items.filter(i => i.category !== 'background').map(i => i.id)))
      }
    } catch (err) {
      setError('Không thể phát hiện sản phẩm: ' + err.message)
    } finally {
      setDetecting(false)
    }
  }, [])

  const handleInputChange = (e) => handleFile(e.target.files?.[0])
  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]) }

  const reset = () => {
    setImageFile(null); setImageUrl(null)
    setDetectedItems([]); setSelectedIds(new Set())
    setGeneratedResults({}); setLoadingItems(new Set())
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
    if (selected.length === 0) { setError('Chưa chọn sản phẩm nào.'); return }

    setGenerating(true)
    setError(null)
    setGeneratedResults({})
    setItemErrors({})

    const loadingSet = new Set(selected.map(i => i.id))

    let masterItem = null
    if (masterToggle) {
      const compositeItems = selected.filter(i => i.category !== 'background')
      if (compositeItems.length >= 2) {
        masterItem = {
          id: 'master-composite',
          nameVi: 'Bộ sản phẩm (Flat Lay)',
          category: 'other',
          _compositeItems: compositeItems,
        }
        loadingSet.add('master-composite')
        setDetectedItems(prev => {
          if (prev.find(i => i.id === 'master-composite')) return prev
          return [...prev, { id: 'master-composite', nameVi: 'Bộ sản phẩm (Flat Lay)', category: 'other' }]
        })
        setSelectedIds(prev => new Set([...prev, 'master-composite']))
      }
    }

    setLoadingItems(loadingSet)

    const promptBuilders = {
      original: (item) => buildOriginalPrompt(item, productName, quality, aspect, sharpness),
      multiview: (item) => buildMultiViewPrompt(item, productName, quality, aspect, sharpness),
      ai_suggest: (item) => buildAiSuggestPrompt(item, productName, quality, aspect, sharpness),
    }

    const selectedModes = [...outputModes]

    // Mỗi item × mỗi mode → 1 API call, tất cả chạy song song
    const tasks = selected.flatMap(item =>
      selectedModes.map(mode => (async () => {
        try {
          const prompt = promptBuilders[mode](item)
          const result = await generateGarmentImage(imageFile, prompt, { quality, aspect })
          const dataUrl = `data:${result.mimeType};base64,${result.base64}`
          setGeneratedResults(prev => ({
            ...prev,
            [item.id]: { ...prev[item.id], [mode]: dataUrl },
          }))
        } catch (err) {
          setItemErrors(prev => ({ ...prev, [item.id]: err.message }))
        }
        // Xóa loading khi TẤT CẢ mode của item hoàn thành
        setLoadingItems(prev => {
          // Kiểm tra xem còn mode nào đang chạy không
          const n = new Set(prev); n.delete(item.id); return n
        })
      })())
    )

    if (masterItem) {
      tasks.push((async () => {
        try {
          const prompt = buildMasterPrompt(masterItem._compositeItems, productName, quality, aspect)
          const result = await generateGarmentImage(imageFile, prompt, { quality, aspect })
          const dataUrl = `data:${result.mimeType};base64,${result.base64}`
          setGeneratedResults(prev => ({
            ...prev,
            'master-composite': { ...prev['master-composite'], 'master-composite': dataUrl },
          }))
        } catch (err) {
          setItemErrors(prev => ({ ...prev, 'master-composite': err.message }))
        }
        setLoadingItems(prev => { const n = new Set(prev); n.delete('master-composite'); return n })
      })())
    }

    await Promise.all(tasks)
    setGenerating(false)
  }

  const handleDownload = (dataUrl, name) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${name || 'product'}-${Date.now()}.png`
    a.click()
  }

  // ─── Computed ───────────────────────────────────────────────────────────

  const displayItems = detectedItems.filter(i =>
    generatedResults[i.id] || loadingItems.has(i.id) || itemErrors[i.id]
  )
  const hasResults = displayItems.length > 0

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fade-in">
      <h1 className="page-title">Tách Sản Phẩm</h1>

      <div className="tach-do-layout">
        {/* ═══ CỘT TRÁI ═══════════════════════════════════════════════════ */}
        <div className="tach-do-panel tach-do-left">

          {/* 1 — Ảnh gốc */}
          <div className="td-section-label">ẢNH GỐC</div>
          {!imageUrl ? (
            <div className="upload-zone" onClick={() => fileRef.current.click()}
              onDrop={handleDrop} onDragOver={e => e.preventDefault()}>
              <Upload className="upload-icon" />
              <div className="upload-label">Tải ảnh sản phẩm</div>
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
          <input type="text" className="input-field" placeholder="VD: Laptop Lenovo ThinkPad X1..."
            value={productName} onChange={e => setProductName(e.target.value)} style={{ marginBottom: 20 }} />

          {/* 3 — Phát hiện sản phẩm */}
          <div className="td-section-label">PHÁT HIỆN SẢN PHẨM</div>
          <div className="td-items-list">
            {detecting ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', justifyContent: 'center' }}>
                <div className="spin" style={{ width: 20, height: 20, border: '2.5px solid var(--brand-15)', borderTopColor: 'var(--brand)', borderRadius: '50%' }} />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI đang phát hiện sản phẩm...</span>
              </div>
            ) : detectedItems.length === 0 ? (
              <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Tải ảnh lên để phát hiện sản phẩm.
              </div>
            ) : (
              <>
                {detectedItems.filter(i => i.id !== 'master-composite').map(item => (
                  <ItemToggleRow key={item.id} item={item} isOn={selectedIds.has(item.id)}
                    onToggle={() => toggleItem(item.id)} />
                ))}
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'right', marginTop: 4 }}>
                  {selectedIds.size} / {detectedItems.filter(i => i.id !== 'master-composite').length} sản phẩm được chọn
                </div>
              </>
            )}
          </div>

          {/* 4 — Chế độ xuất ảnh */}
          {detectedItems.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 }}>
                <div className="td-section-label" style={{ margin: 0 }}>CHẾ ĐỘ XUẤT ẢNH</div>
                {outputModes.size > 0 && selectedIds.size > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 'var(--r-full)', background: 'var(--brand)',
                    color: '#fff', letterSpacing: 0.3,
                  }}>
                    {outputModes.size * selectedIds.size} ảnh
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {OUTPUT_MODES.map(mode => {
                  const isOn = outputModes.has(mode.value)
                  return (
                    <div
                      key={mode.value}
                      onClick={() => toggleOutputMode(mode.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                        borderRadius: 'var(--r-md)', cursor: 'pointer',
                        border: `2px solid ${isOn ? 'var(--brand)' : 'var(--border)'}`,
                        background: isOn ? 'var(--brand-08)' : 'var(--white)',
                        transition: 'all 0.15s ease',
                      }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>{mode.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: isOn ? 'var(--brand)' : 'var(--text-primary)' }}>
                          {mode.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2 }}>
                          {mode.desc}
                        </div>
                      </div>
                      {/* Checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${isOn ? 'var(--brand)' : 'var(--border)'}`,
                        background: isOn ? 'var(--brand)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}>
                        {isOn && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* 5 — Toggle Master Flat Lay */}
          {detectedItems.filter(i => i.id !== 'master-composite').length > 1 && (
            <div className="item-toggle-row" onClick={() => setMasterToggle(p => !p)}
              style={{ marginBottom: 16, background: 'var(--bg-page)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>🖼</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Thêm ảnh Flat Lay tổng hợp</span>
              </div>
              <div className={`toggle-switch ${masterToggle ? 'on' : ''}`}>
                <div className="toggle-knob" />
              </div>
            </div>
          )}

          {/* 6 — Cấu hình xuất file */}
          {detectedItems.length > 0 && (
            <>
              <div className="td-section-label">CẤU HÌNH XUẤT FILE</div>
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
              <label className="select-label">Tăng nét & chi tiết</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {SHARPNESS_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setSharpness(o.value)}
                    className={`toggle-pill ${sharpness === o.value ? 'active' : ''}`}>
                    {o.label}
                  </button>
                ))}
              </div>
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

          {/* 7 — CTA */}
          {detectedItems.length > 0 && (
            <button className="btn btn-primary btn-cta" onClick={handleGenerate}
              disabled={generating || selectedIds.size === 0 || outputModes.size === 0}>
              {generating ? (
                <>
                  <span className="spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} />
                  Đang xử lý {outputModes.size * selectedIds.size} ảnh...
                </>
              ) : (
                <>
                  🛍️ Tạo {outputModes.size * selectedIds.size} ảnh ({selectedIds.size} SP × {outputModes.size} chế độ)
                </>
              )}
            </button>
          )}
        </div>

        {/* ═══ CỘT PHẢI ══════════════════════════════════════════════════ */}
        <div className="tach-do-panel tach-do-right">
          {hasResults ? (
            <div className="result-grid">
              {displayItems.map(item => (
                <ResultCard
                  key={item.id}
                  item={item}
                  results={generatedResults[item.id] || {}}
                  isLoading={loadingItems.has(item.id)}
                  onSave={(src, it) => setSaveModalData({ item: it, imageSrc: src })}
                  onPreview={(src, name) => setPreviewZoom({ src, name })}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ minHeight: 400 }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.3 }}>
                <rect x="8" y="16" width="48" height="36" rx="4" stroke="#9B9B9B" strokeWidth="2.5" />
                <path d="M8 28h48" stroke="#9B9B9B" strokeWidth="2.5" />
                <circle cx="20" cy="22" r="2" fill="#9B9B9B" />
                <circle cx="28" cy="22" r="2" fill="#9B9B9B" />
                <path d="M24 38l8-8 8 8" stroke="#9B9B9B" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 16 }}>Chưa có kết quả</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, textAlign: 'center', lineHeight: 1.6 }}>
                Tải ảnh sản phẩm lên, chọn chế độ xuất ảnh và nhấn nút để bắt đầu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Modal */}
      {saveModalData && (
        <Portal>
          <SaveModal
            item={saveModalData.item}
            imageSrc={saveModalData.imageSrc}
            productName={productName}
            onClose={() => setSaveModalData(null)}
            onSave={() => setSaveModalData(null)}
          />
        </Portal>
      )}

      {/* Preview Zoom */}
      {previewZoom && (
        <div onClick={() => setPreviewZoom(null)} style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 24,
        }}>
          <img src={previewZoom.src} alt={previewZoom.name}
            style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
          <div style={{ color: '#fff', marginTop: 12, fontSize: 14, fontWeight: 600, opacity: 0.9 }}>
            {previewZoom.name}
          </div>
        </div>
      )}
    </div>
  )
}
