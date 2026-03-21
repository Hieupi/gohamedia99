import { useState, useEffect, useCallback } from 'react'
import {
  Search, Grid, List, Download, Trash2, Heart, Eye, X, ImageOff
} from 'lucide-react'
import {
  getLibraryItems, deleteFromLibrary, toggleLikeInLibrary,
  downloadImage, migrateOldLibrary
} from '../services/libraryService'

const CATEGORIES = ['Tất cả', 'Trang phục', 'Người mẫu', 'Phụ kiện', 'Bộ sưu tập']

function mapCategory(cat) {
  const m = {
    top: 'Trang phục', bottom: 'Trang phục', dress: 'Trang phục',
    outerwear: 'Trang phục', shoes: 'Phụ kiện', bag: 'Phụ kiện',
    accessory: 'Phụ kiện', model: 'Người mẫu', background: 'Khác', other: 'Bộ sưu tập',
  }
  return m[cat] || 'Trang phục'
}

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [items, setItems] = useState([])
  const [view, setView] = useState('grid')
  const [selectedCat, setSelectedCat] = useState('Tất cả')
  const [searchQ, setSearchQ] = useState('')
  const [preview, setPreview] = useState(null)

  // Load items on mount + migrate old data
  useEffect(() => {
    migrateOldLibrary()
    setItems(getLibraryItems())
  }, [])

  const refresh = useCallback(() => setItems(getLibraryItems()), [])

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

  const handleDownload = (item) => {
    downloadImage(item.imageSrc, item.name)
  }

  // Filter
  const filtered = items.filter(item => {
    if (selectedCat !== 'Tất cả' && mapCategory(item.category) !== selectedCat) return false
    if (searchQ && !item.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const stats = {
    total: items.length,
    products: items.filter(i => i.type === 'product').length,
    models: items.filter(i => i.type === 'model').length,
    liked: items.filter(i => i.liked).length,
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

      {/* Count */}
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
              ? 'Hãy tách đồ từ ảnh và lưu vào đây để quản lý.'
              : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'}
          </p>
        </div>
      ) : view === 'grid' ? (
        /* Grid View */
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
                {item.type === 'model' && (
                  <span className="lib-card-badge model">Mẫu</span>
                )}
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
        /* List View */
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

      {/* Preview Modal */}
      <PreviewModal item={preview} onClose={() => setPreview(null)} />
    </div>
  )
}
