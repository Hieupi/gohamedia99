import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, Image, Clock, ArrowRight, Zap, Star, ImageOff } from 'lucide-react'
import { getLibraryItems } from '../services/libraryService'

export default function HomePage() {
  const navigate = useNavigate()
  const [recentItems, setRecentItems] = useState([])

  useEffect(() => {
    const items = getLibraryItems()
    // Lấy 6 ảnh gần nhất từ Library thực tế
    const sorted = items
      .filter(i => i.imageSrc)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6)
    setRecentItems(sorted)
  }, [])

  return (
    <div className="fade-in">
      {/* Hero Banner */}
      <div className="hero-banner">
        <div className="hero-badge">
          <Zap size={10} fill="currentColor" />
          AI POWERED
        </div>
        <h1 className="hero-title">Biến ý tưởng thành<br />hiện thực thời trang</h1>
        <p className="hero-sub">Tạo ảnh người mẫu chuyên nghiệp trong vài giây với AI</p>
        <div className="hero-actions">
          <button className="btn btn-ghost btn-lg" onClick={() => navigate('/new-design')}>
            <Sparkles size={18} />
            Thiết kế ngay
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/library')}>
            Xem thư viện
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="quick-cards">
        <div className="quick-card" onClick={() => navigate('/library')}>
          <div className="quick-card-icon-wrap orange">
            <Image />
          </div>
          <div>
            <div className="quick-card-label">Thư viện mẫu</div>
            <div className="quick-card-desc">Quản lý model &amp; sản phẩm</div>
          </div>
        </div>

        <div className="quick-card" onClick={() => navigate('/new-design')}>
          <div className="quick-card-icon-wrap orange">
            <Sparkles />
          </div>
          <div>
            <div className="quick-card-label">Thiết kế mới</div>
            <div className="quick-card-desc">Tạo ảnh AI ngay bây giờ</div>
          </div>
        </div>

        <div className="quick-card" onClick={() => navigate('/storytelling')}>
          <div className="quick-card-icon-wrap orange">
            <Clock />
          </div>
          <div>
            <div className="quick-card-label">Storytelling</div>
            <div className="quick-card-desc">Kể chuyện bằng hình ảnh</div>
          </div>
        </div>

        <div className="quick-card" onClick={() => navigate('/library')}>
          <div className="quick-card-icon-wrap orange">
            <Star />
          </div>
          <div>
            <div className="quick-card-label">Yêu thích</div>
            <div className="quick-card-desc">Ảnh đã lưu của bạn</div>
          </div>
        </div>
      </div>

      {/* Recent Designs — dữ liệu thực từ Library */}
      <div>
        <div className="section-header">
          <div className="section-title">
            <Clock />
            Thiết kế gần đây
          </div>
          <span className="section-link" onClick={() => navigate('/library')} style={{ cursor: 'pointer' }}>
            Xem tất cả →
          </span>
        </div>

        {recentItems.length > 0 ? (
          <div className="image-grid">
            {recentItems.map(item => (
              <div key={item.id} className="image-card" onClick={() => navigate('/library')} style={{ cursor: 'pointer' }}>
                <img
                  className="image-card-thumb"
                  src={item.imageSrc}
                  alt={item.name}
                  loading="lazy"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
                <div className="image-card-info">
                  <div className="image-card-name">{item.name}</div>
                  <div className="image-card-date">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: 200, marginTop: 12 }}>
            <ImageOff size={40} style={{ color: 'var(--text-muted)', opacity: 0.25 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>
              Chưa có thiết kế nào
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Bắt đầu bằng cách tải ảnh lên Thư viện hoặc Tạo thiết kế mới.
            </p>
            <button className="btn btn-primary" style={{ marginTop: 14 }}
              onClick={() => navigate('/new-design')}>
              <Sparkles size={14} />
              Thiết kế ngay
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
