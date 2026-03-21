import { useState } from 'react'
import {
  Search, SlidersHorizontal, Grid, List, Plus, Download, Trash2, Heart, Eye
} from 'lucide-react'

const CATEGORIES = ['Tất cả', 'Áo', 'Quần', 'Đầm', 'Phụ kiện', 'Bộ set']

const ITEMS = Array.from({ length: 18 }, (_, i) => ({
  id: i + 1,
  src: `https://picsum.photos/seed/lib${i}/300/450`,
  name: ['Áo đầm trắng', 'Áo thun basic', 'Đầm hoa nhí', 'Áo khoác denim',
    'Váy midi', 'Set đồ công sở', 'Áo sơ mi trắng', 'Quần jeans xanh',
    'Đầm dạ hội', 'Áo hoodie'][i % 10],
  category: CATEGORIES[1 + (i % 4)],
  date: `${10 + i}/3/2025`,
  liked: i % 3 === 0,
}))

export default function LibraryPage() {
  const [view, setView] = useState('grid') // 'grid' | 'list'
  const [selectedCat, setSelectedCat] = useState('Tất cả')
  const [searchQ, setSearchQ] = useState('')
  const [liked, setLiked] = useState(() => new Set(ITEMS.filter(x => x.liked).map(x => x.id)))

  const filtered = ITEMS.filter(item => {
    if (selectedCat !== 'Tất cả' && item.category !== selectedCat) return false
    if (searchQ && !item.name.toLowerCase().includes(searchQ.toLowerCase())) return false
    return true
  })

  const toggleLike = (id) => {
    setLiked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📚 Thư viện</h1>
        <button className="btn btn-primary">
          <Plus size={15} />
          Thêm mới
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div className="library-toolbar">
        <div className="library-search">
          <Search size={15} style={{ color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'none',
              fontSize: 13.5, color: 'var(--text-primary)'
            }}
          />
        </div>

        <div className="library-view-toggle">
          <button className={`library-view-btn${view === 'grid' ? ' active' : ''}`}
            onClick={() => setView('grid')}>
            <Grid size={15} />
          </button>
          <button className={`library-view-btn${view === 'list' ? ' active' : ''}`}
            onClick={() => setView('list')}>
            <List size={15} />
          </button>
        </div>

        <button className="btn btn-secondary" style={{ padding: '0 14px', height: 36 }}>
          <SlidersHorizontal size={14} />
          Lọc
        </button>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`category-tab${selectedCat === cat ? ' active' : ''}`}
            onClick={() => setSelectedCat(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
        Hiển thị {filtered.length} / {ITEMS.length} mẫu
      </div>

      {/* Grid */}
      {view === 'grid' ? (
        <div className="library-grid">
          {filtered.map(item => (
            <div key={item.id} className="library-card">
              <div className="library-card-img-wrap">
                <img
                  src={item.src}
                  alt={item.name}
                  className="library-card-img"
                  loading="lazy"
                />
                <div className="library-card-overlay">
                  <button className="library-card-action">
                    <Eye size={13} />
                  </button>
                  <button className="library-card-action">
                    <Download size={13} />
                  </button>
                  <button className="library-card-action danger">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="library-card-footer">
                <div>
                  <div className="library-card-name">{item.name}</div>
                  <div className="library-card-meta">{item.category} • {item.date}</div>
                </div>
                <button
                  onClick={() => toggleLike(item.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: liked.has(item.id) ? '#ef4444' : 'var(--text-muted)',
                    padding: 4, flexShrink: 0
                  }}
                >
                  <Heart size={15} fill={liked.has(item.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => (
            <div key={item.id} className="library-list-row">
              <img src={item.src} alt={item.name}
                style={{ width: 52, height: 72, objectFit: 'cover', borderRadius: 'var(--r-sm)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.category} • {item.date}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" style={{ padding: '0 10px', height: 30, fontSize: 12 }}>
                  <Download size={12} />
                </button>
                <button onClick={() => toggleLike(item.id)}
                  style={{
                    height: 30, width: 30, background: 'none', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--r-sm)', cursor: 'pointer',
                    color: liked.has(item.id) ? '#ef4444' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                  <Heart size={13} fill={liked.has(item.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
