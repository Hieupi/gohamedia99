import { useState, useEffect } from 'react'
import {
  Image, Scissors, BarChart3, Clock, Zap, HardDrive, TrendingUp
} from 'lucide-react'
import { getLibraryItems } from '../services/libraryService'
import { getApiKeys } from '../services/apiKeyService'

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [keys, setKeys] = useState([])

  useEffect(() => {
    setItems(getLibraryItems())
    setKeys(getApiKeys())
  }, [])

  const stats = {
    totalImages: items.length,
    products: items.filter(i => i.type === 'product').length,
    models: items.filter(i => i.type === 'model').length,
    liked: items.filter(i => i.liked).length,
    apiKeys: keys.filter(k => k.active).length,
    totalKeys: keys.length,
  }

  // Group by date
  const recentDates = {}
  items.forEach(item => {
    const d = new Date(item.createdAt).toLocaleDateString('vi-VN')
    recentDates[d] = (recentDates[d] || 0) + 1
  })
  const dateEntries = Object.entries(recentDates).slice(0, 7)
  const maxCount = Math.max(...dateEntries.map(([, v]) => v), 1)

  return (
    <div className="fade-in">
      <h1 className="page-title">Bảng điều khiển</h1>

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(243,112,33,0.1)', color: 'var(--brand)' }}>
            <Image size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{stats.totalImages}</div>
            <div className="admin-stat-label">Tổng ảnh trong kho</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
            <Scissors size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{stats.products}</div>
            <div className="admin-stat-label">Sản phẩm tách</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{stats.models}</div>
            <div className="admin-stat-label">Người mẫu</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            <Zap size={22} />
          </div>
          <div>
            <div className="admin-stat-value">{stats.apiKeys} / {stats.totalKeys}</div>
            <div className="admin-stat-label">API Keys hoạt động</div>
          </div>
        </div>
      </div>

      <div className="admin-grid">
        {/* Activity Chart */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <BarChart3 size={16} />
            <span>Ảnh tạo gần đây</span>
          </div>
          <div className="admin-panel-body">
            {dateEntries.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>
                Chưa có dữ liệu hoạt động.
              </div>
            ) : (
              <div className="admin-chart">
                {dateEntries.map(([date, count]) => (
                  <div key={date} className="admin-chart-bar-wrap">
                    <div className="admin-chart-bar"
                      style={{ height: `${(count / maxCount) * 100}%` }}>
                      <span className="admin-chart-count">{count}</span>
                    </div>
                    <div className="admin-chart-label">{date.slice(0, 5)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Items */}
        <div className="admin-panel">
          <div className="admin-panel-header">
            <Clock size={16} />
            <span>Ảnh mới nhất</span>
          </div>
          <div className="admin-panel-body" style={{ padding: 0 }}>
            {items.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: 13 }}>
                Chưa có ảnh nào.
              </div>
            ) : (
              <div className="admin-recent-list">
                {items.slice(0, 8).map(item => (
                  <div key={item.id} className="admin-recent-row">
                    <img src={item.imageSrc} alt={item.name} className="admin-recent-thumb" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="admin-recent-name">{item.name}</div>
                      <div className="admin-recent-meta">
                        {item.type === 'model' ? 'Mẫu' : 'Sản phẩm'} • {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="admin-panel" style={{ marginTop: 20 }}>
        <div className="admin-panel-header">
          <HardDrive size={16} />
          <span>Hệ thống</span>
        </div>
        <div className="admin-panel-body">
          <div className="admin-sys-grid">
            <div className="admin-sys-item">
              <span className="admin-sys-label">Lưu trữ</span>
              <span className="admin-sys-value">Local Browser Storage</span>
            </div>
            <div className="admin-sys-item">
              <span className="admin-sys-label">Model Vision</span>
              <span className="admin-sys-value">gemini-3.1-flash-image-preview</span>
            </div>
            <div className="admin-sys-item">
              <span className="admin-sys-label">Model Image Gen</span>
              <span className="admin-sys-value">Nano Banana 2 (Flash)</span>
            </div>
            <div className="admin-sys-item">
              <span className="admin-sys-label">Version</span>
              <span className="admin-sys-value">Goha Studio v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
