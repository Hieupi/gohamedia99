import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search, Grid, List, Download, Trash2, Heart, Eye, X, ImageOff, Upload, Loader
} from 'lucide-react'
import {
  getLibraryItems, deleteFromLibrary, toggleLikeInLibrary,
  downloadImage, migrateOldLibrary, saveToLibrary, createLibraryRecord
} from '../services/libraryService'
import { callGemini } from '../services/geminiService'

const CATEGORIES = ['Tất cả', 'Trang phục', 'Người mẫu', 'Phụ kiện', 'Bối cảnh', 'Bộ sưu tập']

const CATEGORY_PREFIX = {
  top: 'ÁO', bottom: 'QUẦN', dress: 'ĐẦM', outerwear: 'KHOÁC',
  shoes: 'GIÀY', bag: 'TÚI', accessory: 'PKIỆN', model: 'MẪU',
  background: 'NỀN', other: 'SP',
}

function mapCategory(cat) {
  const m = {
    top: 'Trang phục', bottom: 'Trang phục', dress: 'Trang phục',
    outerwear: 'Trang phục', shoes: 'Phụ kiện', bag: 'Phụ kiện',
    accessory: 'Phụ kiện', model: 'Người mẫu', background: 'Bối cảnh', other: 'Bộ sưu tập',
  }
  return m[cat] || 'Trang phục'
}

function generateSmartName(nameVi, category, existingItems) {
  const prefix = CATEGORY_PREFIX[category] || 'SP'
  let baseName = (nameVi || 'Không tên').replace(/^(Áo|Quần|Đầm|Giày|Túi|Mũ)\s*/i, '').trim()
  if (baseName.length > 30) baseName = baseName.slice(0, 30).trim()
  const fullBase = `${prefix}-${baseName}`
  const sameBase = existingItems.filter(i => i.name && i.name.startsWith(fullBase))
  const num = String(sameBase.length + 1).padStart(3, '0')
  return `${fullBase}-${num}`
}

// ─── AI Analyze Prompt ────────────────────────────────────────────────────────

const ANALYZE_PROMPT = `Bạn là chuyên gia thời trang. Phân tích ảnh và trả về JSON duy nhất (không markdown):
{
  "nameVi": "Tên tiếng Việt ngắn gọn của sản phẩm/đối tượng chính",
  "category": "top|bottom|dress|outerwear|shoes|bag|accessory|model|background",
  "type": "product hoặc model",
  "description": "Mô tả ngắn 1 dòng về màu sắc, chất liệu, phong cách"
}
Chỉ trả về đúng 1 đối tượng nổi bật nhất. Chỉ JSON, không text khác.`

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }) {
  if (!item) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}><X size={18} /></button>
        <img src={item.imageSrc} alt={item.name} className="preview-img" />
        <div className="preview-info">
          <h3>{item.name}</h3>
          <span className="preview-badge">{item.type === 'model' ? 'Người mẫu' : 'Sản phẩm'}</span>
          <span className="preview-date">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSaved }) {
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('product')
  const [category, setCategory] = useState('other')
  const [saving, setSaving] = useState(false)

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setAnalyzing(true)
    setAiResult(null)

    try {
      const raw = await callGemini({ prompt: ANALYZE_PROMPT, images: [f], temperature: 0.2 })
      const clean = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(clean)
      setAiResult(parsed)
      setCategory(parsed.category || 'other')
      setType(parsed.type || 'product')
      // Auto-generate smart name
      const existingItems = getLibraryItems()
      setName(generateSmartName(parsed.nameVi, parsed.category, existingItems))
    } catch (err) {
      console.error('[AI Analyze]', err)
      setName('SP-Upload-' + Date.now().toString(36))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = () => {
    if (!previewUrl || !name.trim()) return
    setSaving(true)
    const record = createLibraryRecord({
      name: name.trim(),
      type,
      category,
      imageSrc: previewUrl,
    })
    saveToLibrary(record)
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>
          Tải ảnh lên Kho
        </h3>

        {/* Upload zone / Preview */}
        {!previewUrl ? (
          <div className="upload-zone" onClick={() => fileRef.current?.click()}
            style={{ marginBottom: 16, minHeight: 160 }}>
            <Upload size={28} style={{ color: 'var(--text-muted)' }} />
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Chọn ảnh sản phẩm</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, WEBP</div>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => handleFile(e.target.files?.[0])} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <img src={previewUrl} alt="preview"
              style={{ width: 90, height: 90, objectFit: 'contain', borderRadius: 'var(--r-sm)', background: '#f5f5f5' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              {analyzing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Loader size={16} className="spin" style={{ color: 'var(--brand)' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>AI đang phân tích...</span>
                </div>
              ) : aiResult ? (
                <>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 'var(--r-full)',
                      fontSize: 11, fontWeight: 700, background: 'var(--brand-08)', color: 'var(--brand)',
                    }}>
                      {CATEGORY_PREFIX[aiResult.category] || 'SP'}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{aiResult.nameVi}</span>
                  </div>
                  {aiResult.description && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {aiResult.description}
                    </div>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Không thể phân tích</span>
              )}
              <button onClick={() => { setFile(null); setPreviewUrl(null); setAiResult(null); setName('') }}
                style={{
                  alignSelf: 'flex-start', marginTop: 4, fontSize: 12, color: 'var(--brand)',
                  background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline',
                }}>
                Đổi ảnh khác
              </button>
            </div>
          </div>
        )}

        {/* Name field */}
        {previewUrl && !analyzing && (
          <>
            <label className="select-label" style={{ marginBottom: 4, display: 'block' }}>
              Mã định danh
            </label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="input-field"
              style={{ marginBottom: 12, fontFamily: 'monospace', fontSize: 13.5, fontWeight: 600 }} />

            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <button className={`toggle-pill ${type === 'product' ? 'active' : ''}`}
                onClick={() => setType('product')}>Sản phẩm</button>
              <button className={`toggle-pill ${type === 'model' ? 'active' : ''}`}
                onClick={() => setType('model')}>Người mẫu</button>
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave}
            disabled={!previewUrl || analyzing || !name.trim() || saving}>
            {saving ? 'Đang lưu...' : 'Nhập vào Kho'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [items, setItems] = useState([])
  const [view, setView] = useState('grid')
  const [selectedCat, setSelectedCat] = useState('Tất cả')
  const [searchQ, setSearchQ] = useState('')
  const [preview, setPreview] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  useEffect(() => {
    migrateOldLibrary()
    setItems(getLibraryItems())
  }, [])

  const handleDelete = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    const updated = deleteFromLibrary(id)
    setItems(updated)
  }

  const handleToggleLike = (e, id) => {
    e.stopPropagation()
    const updated = toggleLikeInLibrary(id)
    setItems(updated)
  }

  const handleDownload = (item) => downloadImage(item.imageSrc, item.name)

  const filtered = items.filter(item => {
    if (selectedCat !== 'Tất cả' && mapCategory(item.category) !== selectedCat) return false
    if (searchQ && !item.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const stats = {
    total: items.length,
    products: items.filter(i => i.type === 'product').length,
    models: items.filter(i => i.type === 'model').length,
  }

  return (
    <div className="fade-in">
      <div className="lib-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Thư viện</h1>
        <div className="lib-stats">
          <span className="lib-stat">{stats.total} ảnh</span>
          <span className="lib-stat">•</span>
          <span className="lib-stat">{stats.products} sản phẩm</span>
          <span className="lib-stat">•</span>
          <span className="lib-stat">{stats.models} mẫu</span>
        </div>
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
          onClick={() => setShowUpload(true)}>
          <Upload size={15} />
          Tải lên & Nhập kho
        </button>
      </div>

      {/* Toolbar */}
      <div className="lib-toolbar">
        <div className="lib-search">
          <Search size={15} className="lib-search-icon" />
          <input type="text" placeholder="Tìm kiếm..." value={searchQ}
            onChange={e => setSearchQ(e.target.value)} className="lib-search-input" />
        </div>
        <div className="lib-view-toggle">
          <button className={`lib-view-btn ${view === 'grid' ? 'active' : ''}`}
            onClick={() => setView('grid')}><Grid size={16} /></button>
          <button className={`lib-view-btn ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}><List size={16} /></button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="lib-tabs">
        {CATEGORIES.map(cat => (
          <button key={cat}
            className={`lib-tab ${selectedCat === cat ? 'active' : ''}`}
            onClick={() => setSelectedCat(cat)}>
            {cat}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {filtered.length} / {items.length} ảnh
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <ImageOff size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 16 }}>
            {items.length === 0 ? 'Thư viện trống' : 'Không tìm thấy ảnh'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, textAlign: 'center' }}>
            {items.length === 0
              ? 'Tách đồ hoặc tải ảnh lên để bắt đầu.'
              : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
          {items.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 16 }}
              onClick={() => setShowUpload(true)}>
              <Upload size={15} /> Tải ảnh lên
            </button>
          )}
        </div>
      ) : view === 'grid' ? (
        <div className="lib-grid">
          {filtered.map(item => (
            <div key={item.id} className="lib-card">
              <div className="lib-card-img-wrap">
                <img src={item.imageSrc} alt={item.name} className="lib-card-img" loading="lazy" />
                <div className="lib-card-overlay">
                  <button className="lib-card-action" onClick={() => setPreview(item)} title="Xem">
                    <Eye size={14} />
                  </button>
                  <button className="lib-card-action" onClick={() => handleDownload(item)} title="Tải xuống">
                    <Download size={14} />
                  </button>
                  <button className="lib-card-action danger" onClick={(e) => handleDelete(e, item.id)} title="Xóa">
                    <Trash2 size={14} />
                  </button>
                </div>
                {item.type === 'model' && <span className="lib-card-badge model">Mẫu</span>}
              </div>
              <div className="lib-card-footer">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="lib-card-name">{item.name}</div>
                  <div className="lib-card-meta">
                    {mapCategory(item.category)} • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <button onClick={(e) => handleToggleLike(e, item.id)} className="lib-like-btn"
                  style={{ color: item.liked ? '#ef4444' : 'var(--text-muted)' }}>
                  <Heart size={15} fill={item.liked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="lib-list">
          {filtered.map(item => (
            <div key={item.id} className="lib-list-row">
              <img src={item.imageSrc} alt={item.name} className="lib-list-thumb" loading="lazy" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {mapCategory(item.category)} • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="icon-btn" onClick={() => setPreview(item)}><Eye size={14} /></button>
                <button className="icon-btn" onClick={() => handleDownload(item)}><Download size={14} /></button>
                <button className="icon-btn" onClick={(e) => handleToggleLike(e, item.id)}
                  style={{ color: item.liked ? '#ef4444' : undefined }}>
                  <Heart size={14} fill={item.liked ? 'currentColor' : 'none'} />
                </button>
                <button className="icon-btn" onClick={(e) => handleDelete(e, item.id)}
                  style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <PreviewModal item={preview} onClose={() => setPreview(null)} />

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSaved={() => setItems(getLibraryItems())}
        />
      )}
    </div>
  )
}
