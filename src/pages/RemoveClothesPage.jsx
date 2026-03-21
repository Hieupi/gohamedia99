import { useState, useRef, useCallback } from 'react'
import { Upload, RotateCcw, Download, Save, ChevronDown, AlertCircle } from 'lucide-react'
import { detectObjects, generateGarmentImage } from '../services/geminiService'
import { getPrompt } from '../services/masterPrompts'
import { getApiKeys } from '../services/apiKeyService'
import { saveToLibrary, createLibraryRecord, downloadImage, getLibraryItems } from '../services/libraryService'

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

const CATEGORY_EMOJI = {
  top: '👕', bottom: '👖', dress: '👗', outerwear: '🧥',
  shoes: '👠', bag: '👜', accessory: '💍', other: '🖼',
  background: '🏞️', model: '🧑',
}

// ─── Build image-gen prompt cho từng item ──────────────────────────────────────

function buildItemPrompt(item, productName, quality, aspect) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'

  if (item.category === 'model') {
    return `Looking at the reference image, isolate and recreate the PERSON/MODEL only.

Extract the person completely from the background. Recreate them on a PURE WHITE background (#FFFFFF).
Keep exact same pose, expression, hair, skin tone, and all clothing they are wearing.
Photorealistic studio quality, soft even lighting, ${res} resolution, aspect ratio ${aspect}.
${productName ? `Collection: "${productName}"` : ''}

Generate the isolated person on white background now.`
  }

  if (item.category === 'background') {
    return `Looking at the reference image, isolate and recreate ONLY the background/scene.

Remove all people and objects. Recreate the empty background scene on its own.
Keep exact same colors, lighting, textures, and architectural elements.
Photorealistic quality, ${res} resolution, aspect ratio ${aspect}.

Generate the clean background scene now.`
  }

  return `Looking at the reference image, isolate and extract ONLY this item: "${item.nameVi}"
${item.description ? `Description: ${item.description}` : ''}

Remove this item completely from the person. Recreate it as a standalone product photograph:
- Pure white background (#FFFFFF)
- Soft even studio lighting
- Maintain EXACT original color, fabric texture, stitching, hardware, proportions
- ${item.category === 'dress' || item.category === 'outerwear' ? 'Ghost mannequin positioning' : 'Clean flat-lay positioning'}
- Photorealistic studio quality, ${res} resolution, aspect ratio ${aspect}
${productName ? `- Collection: "${productName}"` : ''}

Generate the isolated product image now.`
}

function buildMasterPrompt(items, productName, quality, aspect) {
  const sizeMap = { '1K': '1024x1024', '2K': '2048x2048', '4K': '4096x4096' }
  const res = sizeMap[quality] || '1024x1024'
  const itemList = items.map((it, i) => `${i + 1}. ${it.nameVi}`).join('\n')

  return `Looking at the reference image, create a MASTER COMPOSITE product photograph.

Extract and arrange ALL of the following items together in ONE beautiful flat-lay composition on a PURE WHITE background:
${itemList}

Requirements:
- Each item isolated from the person, laid out together in an aesthetic flat-lay arrangement
- Pure white background (#FFFFFF)
- Soft even studio lighting, no harsh shadows
- Maintain exact original colors, textures, and proportions for every item
- Professional lookbook/catalogue style composition
- ${res} resolution, aspect ratio ${aspect}
${productName ? `- Collection name: "${productName}"` : ''}

Generate the master composite image now.`
}

// ─── Smart Naming Helpers ─────────────────────────────────────────────────────

const CATEGORY_PREFIX = {
  top: 'ÁO', bottom: 'QUẦN', dress: 'ĐẦM', outerwear: 'KHOÁC',
  shoes: 'GIÀY', bag: 'TÚI', accessory: 'PKIỆN', model: 'MẪU',
  background: 'NỀN', other: 'BST',
}

function generateSmartName(item, existingItems = []) {
  const prefix = CATEGORY_PREFIX[item?.category] || 'SP'
  // Lấy tên rút gọn từ nameVi (bỏ các từ chung)
  let baseName = (item?.nameVi || 'Không tên')
    .replace(/^(Áo|Quần|Đầm|Giày|Túi|Mũ|Băng|Vợt|Tất)\s*/i, '')
    .trim()
  if (baseName.length > 30) baseName = baseName.slice(0, 30).trim()

  const fullBase = `${prefix}-${baseName}`

  // Đếm số item trùng prefix + base
  const sameBase = existingItems.filter(i =>
    i.name && i.name.startsWith(fullBase)
  )
  const num = String(sameBase.length + 1).padStart(3, '0')
  return `${fullBase}-${num}`
}

function checkDuplicate(name, existingItems) {
  return existingItems.some(i => i.name === name)
}

// ─── Save Modal Component ─────────────────────────────────────────────────────

function SaveModal({ item, imageSrc, productName, onClose, onSave }) {
  const existingItems = getLibraryItems()

  const autoName = generateSmartName(item, existingItems)
  const [name, setName] = useState(autoName)
  const [type, setType] = useState(item?.category === 'model' ? 'model' : 'product')

  const isDuplicate = checkDuplicate(name, existingItems)

  const handleSave = () => {
    const record = createLibraryRecord({
      name: name || autoName,
      type,
      category: item?.category || 'other',
      imageSrc,
    })
    saveToLibrary(record)
    onSave(record)
    onClose()
  }

  // Gợi ý các tên thay thế
  const suggestions = [
    autoName,
    productName ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${productName}-${item?.nameVi || ''}`.slice(0, 50) : null,
    item?.description ? `${CATEGORY_PREFIX[item?.category] || 'SP'}-${item.description.slice(0, 35)}` : null,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // unique

  return (
    <div className="modal-overlay" onClick={onClose}>
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
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Lưu ngay
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detected Item Row ────────────────────────────────────────────────────────

function ItemToggleRow({ item, isOn, onToggle }) {
  return (
    <div className={`item-toggle-row ${isOn ? 'active' : ''}`} onClick={onToggle}>
      <div className="item-toggle-info">
        <div className="item-toggle-name">
          {item.nameVi}
        </div>
        {item.description && (
          <div className="item-toggle-desc">{item.description}</div>
        )}
      </div>
      <div className={`toggle-switch ${isOn ? 'on' : ''}`}>
        <div className="toggle-knob" />
      </div>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ item, imageSrc, isLoading, errorMsg, onSave, onDownload }) {
  return (
    <div className="result-card">
      <div className="result-card-img">
        {isLoading ? (
          <div className="result-loading">
            <div className="spin" style={{
              width: 32, height: 32,
              border: '3px solid var(--brand-15)', borderTopColor: 'var(--brand)', borderRadius: '50%',
            }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
              Đang tách {item.nameVi}...
            </span>
          </div>
        ) : errorMsg ? (
          <div className="result-loading">
            <AlertCircle size={20} color="#ef4444" />
            <span style={{ fontSize: 11, color: '#ef4444', textAlign: 'center', lineHeight: 1.4 }}>{errorMsg}</span>
          </div>
        ) : imageSrc ? (
          <img src={imageSrc} alt={item.nameVi} />
        ) : (
          <div className="result-loading">
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Chờ xử lý...</span>
          </div>
        )}
      </div>
      <div className="result-card-footer">
        <span className="result-card-name">{item.nameVi}</span>
        {imageSrc && (
          <div className="result-card-actions">
            <button onClick={onSave} title="Lưu vào Kho" className="icon-btn"><Save size={14} /></button>
            <button onClick={onDownload} title="Tải xuống" className="icon-btn"><Download size={14} /></button>
          </div>
        )}
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
  const [masterToggle, setMasterToggle] = useState(true)

  // Generation
  const [generating, setGenerating] = useState(false)
  const [generatedImages, setGeneratedImages] = useState({})
  const [generatingIds, setGeneratingIds] = useState(new Set())
  const [itemErrors, setItemErrors] = useState({})

  // Modal
  const [saveModalItem, setSaveModalItem] = useState(null)
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
        setDetectedItems(items)
        setSelectedIds(new Set(items.map(i => i.id)))
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
      const compositeItems = selected.filter(i => i.category !== 'model' && i.category !== 'background')
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
        const prompt = buildItemPrompt(item, productName, quality, aspect)
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
          const prompt = buildMasterPrompt(masterItem._compositeItems, productName, quality, aspect)
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
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
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
                  onDownload={() => downloadImage(generatedImages[item.id], item.nameVi)} />
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
        <SaveModal item={saveModalItem.item} imageSrc={saveModalItem.imageSrc}
          productName={productName}
          onClose={() => setSaveModalItem(null)}
          onSave={(record) => console.log('Saved:', record)} />
      )}
    </div>
  )
}
