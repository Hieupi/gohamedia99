import { useState, useEffect, useCallback, useRef } from 'react'
import Portal from '../components/Portal'
import {
  Search, Grid, List, Download, Trash2, Heart, Eye, X, ImageOff, Upload, Loader, Copy, Check, FolderPlus, Film
} from 'lucide-react'
import {
  getLibraryItems, deleteFromLibrary, toggleLikeInLibrary,
  downloadImage, downloadHDImage, saveToLibrary, createLibraryRecord, migrateOldLibrary,
  getFolders, createFolder, deleteFolder, moveItemToFolder, moveFolderInto
} from '../services/libraryService'
import { getOriginalImage, saveToFilesystem } from '../services/imageStorageService'
import { callGemini } from '../services/geminiService'
import {
  POSE_LIBRARY, POSE_CATEGORIES, getAllPosesByCategory, PROMPT_TEMPLATES, getCustomPoses, deleteCustomPose
} from '../services/poseLibrary'

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
  const fullBase = `${prefix} -${baseName} `
  const sameBase = existingItems.filter(i => i.name && i.name.startsWith(fullBase))
  const num = String(sameBase.length + 1).padStart(3, '0')
  return `${fullBase} -${num} `
}

// ─── AI Analyze Prompt ────────────────────────────────────────────────────────

const ANALYZE_PROMPT = `Bạn là chuyên gia thời trang.Phân tích ảnh và trả về JSON duy nhất(không markdown):
{
  "nameVi": "Tên tiếng Việt ngắn gọn của sản phẩm/đối tượng chính",
    "category": "top|bottom|dress|outerwear|shoes|bag|accessory|model|background",
      "type": "product hoặc model",
        "description": "Mô tả ngắn 1 dòng về màu sắc, chất liệu, phong cách"
}
Chỉ trả về đúng 1 đối tượng nổi bật nhất.Chỉ JSON, không text khác.`

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ item, onClose }) {
  const [hdSrc, setHdSrc] = useState(null)
  useEffect(() => {
    if (!item) return
    getOriginalImage(item.id).then(src => setHdSrc(src || item.imageSrc))
  }, [item])
  if (!item) return null
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="preview-modal" onClick={e => e.stopPropagation()}>
        <button className="preview-close" onClick={onClose}><X size={18} /></button>
        <img src={hdSrc || item.imageSrc} alt={item.name} className="preview-img" />
        <div className="preview-info">
          <h3>{item.name}</h3>
          <span className="preview-badge">{item.type === 'model' ? 'Người mẫu' : 'Sản phẩm'}</span>
          <span className="preview-date">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
          {hdSrc && hdSrc !== item.imageSrc && <span className="preview-badge" style={{ background: '#10b981' }}>HD</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" style={{ flex: 1, fontSize: 12 }}
            onClick={() => downloadHDImage(item.id, item.imageSrc, item.name)}>
            <Download size={12} /> Tải xuống HD
          </button>
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

  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleFile = async (f) => {
    if (!f || !f.type.startsWith('image/')) return
    setFile(f)
    // Đọc file thành base64 thay vì objectURL (objectURL bị mất khi reload)
    const base64 = await readFileAsBase64(f)
    setPreviewUrl(base64)
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

  const handleSave = async () => {
    if (!previewUrl || !name.trim()) return
    setSaving(true)
    try {
      const record = createLibraryRecord({
        name: name.trim(),
        type,
        category,
        imageSrc: previewUrl,
      })
      const result = await saveToLibrary(record)
      if (result.success) {
        onSaved()
        onClose()
      } else {
        alert(result.error || 'Lỗi lưu ảnh. Thử xóa bớt ảnh trong thư viện.')
        setSaving(false)
      }
    } catch (err) {
      alert('Lỗi lưu: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
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

  // Main tab: 'images' | 'poses' | 'prompts'
  const [mainTab, setMainTab] = useState('images')
  const [poseCatFilter, setPoseCatFilter] = useState('all')
  const [copiedId, setCopiedId] = useState(null)

  // Folder management
  const [folders, setFolders] = useState(getFolders())
  const [activeFolder, setActiveFolder] = useState('all')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  // Drag & Drop state
  const [dragItemId, setDragItemId] = useState(null)
  const [dragFolderId, setDragFolderId] = useState(null)
  const [dragOverFolderId, setDragOverFolderId] = useState(null)

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    const updated = createFolder(newFolderName.trim())
    setFolders(updated)
    const created = updated.find(f => f.name === newFolderName.trim())
    if (created) setActiveFolder(created.id)
    setNewFolderName(''); setShowNewFolder(false)
  }

  const handleDeleteFolder = (e, folderId) => {
    e.stopPropagation()
    if (!confirm('Xóa thư mục này? Ảnh bên trong sẽ không bị xóa.')) return
    const updated = deleteFolder(folderId)
    setFolders(updated)
    setActiveFolder('all')
    setItems(getLibraryItems())
  }

  // ─── Drag & Drop handlers ────────────────────────────────────────────
  const handleDragStartItem = (e, itemId) => {
    setDragItemId(itemId); setDragFolderId(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `item:${itemId}`)
  }
  const handleDragStartFolder = (e, folderId) => {
    setDragFolderId(folderId); setDragItemId(null)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', `folder:${folderId}`)
  }
  const handleDragOverFolder = (e, folderId) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    setDragOverFolderId(folderId)
  }
  const handleDragLeave = () => setDragOverFolderId(null)
  const handleDropOnFolder = (e, targetFolderId) => {
    e.preventDefault(); setDragOverFolderId(null)
    if (dragItemId) {
      const updated = moveItemToFolder(dragItemId, targetFolderId)
      setItems(updated)
    } else if (dragFolderId && dragFolderId !== targetFolderId) {
      const updated = moveFolderInto(dragFolderId, targetFolderId)
      setFolders(updated)
    }
    setDragItemId(null); setDragFolderId(null)
  }
  const handleDropOnRoot = (e) => {
    e.preventDefault(); setDragOverFolderId(null)
    if (dragItemId) {
      const updated = moveItemToFolder(dragItemId, null)
      setItems(updated)
    } else if (dragFolderId) {
      const updated = moveFolderInto(dragFolderId, null)
      setFolders(updated)
    }
    setDragItemId(null); setDragFolderId(null)
  }
  const handleDragEnd = () => {
    setDragItemId(null); setDragFolderId(null); setDragOverFolderId(null)
  }

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

  const handleDownload = (item) => downloadHDImage(item.id, item.imageSrc, item.name)

  const filtered = items.filter(item => {
    if (selectedCat !== 'Tất cả' && mapCategory(item.category) !== selectedCat) return false
    if (searchQ && !item.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    if (activeFolder !== 'all' && item.folderId !== activeFolder) return false
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
          <span className="lib-stat">{POSE_LIBRARY.length} tư thế</span>
          <span className="lib-stat">•</span>
          <span className="lib-stat">{PROMPT_TEMPLATES.length} prompt</span>
        </div>
        {mainTab === 'images' && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
            onClick={() => setShowUpload(true)}>
            <Upload size={15} />
            Tải lên & Nhập kho
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <div className="lib-main-tabs">
        {[
          { id: 'images', label: '🖼️ Ảnh & Trang phục' },
          { id: 'finished', label: '🏆 Ảnh Thành Phẩm' },
          { id: 'videos', label: '🎬 Video Thành Phẩm' },
          { id: 'poses', label: `🤸 Kho Pose(${POSE_LIBRARY.length})` },
          { id: 'prompts', label: `✨ Prompt(${PROMPT_TEMPLATES.length})` },
        ].map(t => (
          <button key={t.id}
            className={`lib-main-tab${mainTab === t.id ? ' active' : ''}`}
            onClick={() => setMainTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ TAB: IMAGES ════════════ */}
      {mainTab === 'images' && (<>

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

        {/* Folder Bar */}
        <div className="lib-folder-bar">
          <div className="lib-folder-list">
            <button className={`lib-folder-btn${activeFolder === 'all' ? ' active' : ''}${dragOverFolderId === 'root' ? ' drag-over' : ''}`}
              onClick={() => setActiveFolder('all')}
              onDragOver={e => { e.preventDefault(); setDragOverFolderId('root') }}
              onDragLeave={handleDragLeave}
              onDrop={handleDropOnRoot}>📋 Tất cả</button>
            {folders.filter(f => !f.parentId).map(f => (
              <button key={f.id}
                className={`lib-folder-btn${activeFolder === f.id ? ' active' : ''}${dragOverFolderId === f.id ? ' drag-over' : ''}`}
                onClick={() => setActiveFolder(f.id)}
                draggable
                onDragStart={e => handleDragStartFolder(e, f.id)}
                onDragOver={e => handleDragOverFolder(e, f.id)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDropOnFolder(e, f.id)}
                onDragEnd={handleDragEnd}>
                📁 {f.name}
                <span className="lib-folder-count">{items.filter(i => i.folderId === f.id).length}</span>
                <span className="lib-folder-del" onClick={e => handleDeleteFolder(e, f.id)}>✕</span>
                {/* Subfolders */}
                {folders.filter(sf => sf.parentId === f.id).map(sf => (
                  <span key={sf.id} className="lib-subfolder-tag" onClick={e => { e.stopPropagation(); setActiveFolder(sf.id) }}>
                    └ {sf.name} ({items.filter(i => i.folderId === sf.id).length})
                  </span>
                ))}
              </button>
            ))}
          </div>
          {showNewFolder ? (
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                placeholder="Tên thư mục..." className="input-field" style={{ flex: 1, fontSize: 12, height: 32 }}
                onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus />
              <button className="btn btn-primary" onClick={handleCreateFolder} style={{ fontSize: 11, height: 32 }}>Tạo</button>
              <button className="btn btn-ghost" onClick={() => setShowNewFolder(false)} style={{ fontSize: 11, height: 32 }}>Hủy</button>
            </div>
          ) : (
            <button className="lib-folder-add" onClick={() => setShowNewFolder(true)}>+ Thư mục mới</button>
          )}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          {filtered.length} / {items.length} ảnh
          {activeFolder !== 'all' && ` • 📁 ${folders.find(f => f.id === activeFolder)?.name}`}
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
              <div key={item.id} className={`lib-card${dragItemId === item.id ? ' dragging' : ''}`}
                draggable
                onDragStart={e => handleDragStartItem(e, item.id)}
                onDragEnd={handleDragEnd}>
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
        )
        }
      </>)}

      {/* ════════════ TAB: POSES ════════════ */}
      {
        mainTab === 'poses' && (
          <div className="lib-pose-section">
            <div className="pose-categories" style={{ marginBottom: 16 }}>
              {POSE_CATEGORIES.map(cat => (
                <button key={cat.id}
                  className={`pose-cat-btn${poseCatFilter === cat.id ? ' active' : ''}`}
                  onClick={() => setPoseCatFilter(cat.id)}>
                  {cat.label}
                  {cat.id === 'custom' && getCustomPoses().length > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10, background: 'var(--brand)', color: '#fff', borderRadius: 99, padding: '1px 5px' }}>
                      {getCustomPoses().length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="lib-pose-grid">
              {getAllPosesByCategory(poseCatFilter).map(p => (
                <div key={p.id} className="lib-pose-card">
                  <img src={p.thumbnail} alt={p.name} className="lib-pose-img"
                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                  <div className="pose-card-emoji-fallback" style={{ display: 'none', height: 140 }}>{p.emoji}</div>
                  <div className="lib-pose-info">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="lib-pose-name">{p.emoji} {p.name}</div>
                      {p.isCustom && (
                        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px', color: '#ef4444' }}
                          onClick={() => { deleteCustomPose(p.id); setPoseCatFilter(prev => prev) /* force re-render */; window.location.reload() }}
                          title="Xóa pose tự tạo">
                          🗑️ Xóa
                        </button>
                      )}
                    </div>
                    <div className="lib-pose-desc">{p.description}</div>
                    <div className="lib-pose-meta">
                      <span>📷 {p.cameraAngle}</span>
                      <span>🎯 {p.bodyFocus}</span>
                      {p.isCustom && <span>📌 Pose tự tạo</span>}
                    </div>
                    <div className="lib-pose-prompt">
                      <code>{p.promptEN.substring(0, 120)}...</code>
                      <button className="btn btn-ghost" style={{ fontSize: 10, padding: '2px 6px' }}
                        onClick={() => { navigator.clipboard.writeText(p.promptEN); setCopiedId(p.id); setTimeout(() => setCopiedId(null), 2000) }}>
                        {copiedId === p.id ? <><Check size={10} /> Đã copy</> : <><Copy size={10} /> Copy Prompt</>}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {getAllPosesByCategory(poseCatFilter).length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: 14 }}>Chưa có pose nào trong mục này.</p>
                  <p style={{ fontSize: 12, marginTop: 4 }}>Vào tab <strong>Tách đồ áo</strong> → lưu ảnh với type <strong>Pose</strong> để tạo pose tùy chỉnh.</p>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* ════════════ TAB: PROMPTS ════════════ */}
      {
        mainTab === 'prompts' && (
          <div className="lib-prompt-section">
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Kho prompt mẫu sẵn dùng — nhấn Copy để dán vào ô prompt khi thiết kế.
            </p>
            <div className="lib-prompt-grid">
              {PROMPT_TEMPLATES.map(t => (
                <div key={t.id} className="lib-prompt-card">
                  <div className="lib-prompt-name">{t.name}</div>
                  <div className="lib-prompt-desc">{t.description}</div>
                  <div className="lib-prompt-prefix">
                    <code>{t.promptPrefix}</code>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, fontSize: 12 }}
                    onClick={() => { navigator.clipboard.writeText(t.promptPrefix); setCopiedId(t.id); setTimeout(() => setCopiedId(null), 2000) }}>
                    {copiedId === t.id ? <><Check size={12} /> Đã copy!</> : <><Copy size={12} /> Copy Prompt</>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* ═══ TAB: ẢNH THÀNH PHẨM (Folder Explorer) ═══ */}
      {mainTab === 'finished' && (() => {
        const currentFolder = activeFolder === 'all' ? null : activeFolder
        const childFolders = folders.filter(f => (f.parentId || null) === currentFolder)
        const finishedItems = items.filter(i => {
          const isFinished = i.source === 'design' || i.source === 'storytelling' || i.category === 'design'
          if (!isFinished) return false
          if (currentFolder) return i.folderId === currentFolder
          return !i.folderId || !folders.some(f => f.id === i.folderId)
        })
        const breadcrumb = []
        let bc = currentFolder
        while (bc) { const f = folders.find(x => x.id === bc); if (f) { breadcrumb.unshift(f); bc = f.parentId || null } else break }
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              <button className="lib-breadcrumb-btn" onClick={() => setActiveFolder('all')}>🏠 Gốc</button>
              {breadcrumb.map(f => (<span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ opacity: 0.4 }}>›</span><button className="lib-breadcrumb-btn" onClick={() => setActiveFolder(f.id)}>📁 {f.name}</button></span>))}
            </div>
            <div style={{ marginBottom: 12 }}>
              {showNewFolder ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Tên thư mục mới..." className="input-field" style={{ flex: 1, fontSize: 12, height: 32 }} onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} autoFocus />
                  <button className="btn btn-primary" onClick={handleCreateFolder} style={{ fontSize: 11, height: 32 }}>Tạo</button>
                  <button className="btn btn-ghost" onClick={() => setShowNewFolder(false)} style={{ fontSize: 11, height: 32 }}>Hủy</button>
                </div>
              ) : (<button className="lib-folder-add" onClick={() => setShowNewFolder(true)}>📁 + Thư mục mới</button>)}
            </div>
            <div className="lib-grid">
              {childFolders.map(f => (
                <div key={f.id} className={`lib-folder-card${dragOverFolderId === f.id ? ' drag-over' : ''}`}
                  onClick={() => setActiveFolder(f.id)} draggable
                  onDragStart={e => handleDragStartFolder(e, f.id)}
                  onDragOver={e => handleDragOverFolder(e, f.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDropOnFolder(e, f.id)}
                  onDragEnd={handleDragEnd}>
                  <div className="lib-folder-card-icon">📁</div>
                  <div className="lib-folder-card-name">{f.name}</div>
                  <div className="lib-folder-card-count">{items.filter(i => i.folderId === f.id).length} ảnh</div>
                  <button className="lib-folder-card-del" onClick={e => { e.stopPropagation(); handleDeleteFolder(e, f.id) }}>✕</button>
                </div>
              ))}
              {finishedItems.map(item => (
                <div key={item.id} className={`lib-card${dragItemId === item.id ? ' dragging' : ''}`}
                  draggable onDragStart={e => handleDragStartItem(e, item.id)} onDragEnd={handleDragEnd}>
                  <div className="lib-card-img-wrap">
                    <img src={item.imageSrc} alt={item.name} className="lib-card-img" loading="lazy" />
                    <div className="lib-card-overlay">
                      <button className="lib-card-action" onClick={() => setPreview(item)}><Eye size={14} /></button>
                      <button className="lib-card-action" onClick={() => handleDownload(item)}><Download size={14} /></button>
                      <button className="lib-card-action danger" onClick={e => handleDelete(e, item.id)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <div className="lib-card-info"><div className="lib-card-name">{item.name}</div></div>
                </div>
              ))}
            </div>
            {childFolders.length === 0 && finishedItems.length === 0 && (
              <div className="empty-state" style={{ minHeight: 200 }}>
                <ImageOff size={40} style={{ opacity: 0.2 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{currentFolder ? 'Thư mục trống. Kéo ảnh vào hoặc tạo thư mục con.' : 'Chưa có ảnh thành phẩm. Tạo ảnh ở Thiết kế mới → Lưu vào kho.'}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* ══════════ TAB: VIDEO THÀNH PHẨM ══════════ */}
      {
        mainTab === 'videos' && (
          <div className="empty-state" style={{ minHeight: 300 }}>
            <Film size={48} style={{ opacity: 0.2 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 16 }}>Video Thành Phẩm</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, textAlign: 'center' }}>
              Sắp ra mắt! Video được tạo từ tab 🎬 Video Prompt sẽ xuất hiện ở đây.
            </p>
          </div>
        )
      }

      {preview && <Portal><PreviewModal item={preview} onClose={() => setPreview(null)} /></Portal>}

      {
        showUpload && (
          <Portal>
            <UploadModal
              onClose={() => setShowUpload(false)}
              onSaved={() => setItems(getLibraryItems())}
            />
          </Portal>
        )
      }
    </div >
  )
}
