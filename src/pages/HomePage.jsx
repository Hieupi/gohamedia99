import { useNavigate } from 'react-router-dom'
import { Sparkles, Image, Clock, ArrowRight, Zap, Star } from 'lucide-react'

// Placeholder fashion images using picsum
const RECENT = [
  { id: 1, src: 'https://picsum.photos/seed/fashion1/300/450', name: 'Áo đầm trắng', date: '20/3/2025' },
  { id: 2, src: 'https://picsum.photos/seed/fashion2/300/450', name: 'Áo thun basic', date: '19/3/2025' },
  { id: 3, src: 'https://picsum.photos/seed/fashion3/300/450', name: 'Đầm hoa nhí', date: '18/3/2025' },
  { id: 4, src: 'https://picsum.photos/seed/fashion4/300/450', name: 'Áo khoác denim', date: '17/3/2025' },
  { id: 5, src: 'https://picsum.photos/seed/fashion5/300/450', name: 'Váy midi', date: '16/3/2025' },
  { id: 6, src: 'https://picsum.photos/seed/fashion6/300/450', name: 'Set đồ công sở', date: '15/3/2025' },
]

export default function HomePage() {
  const navigate = useNavigate()

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

        <div className="quick-card">
          <div className="quick-card-icon-wrap orange">
            <Clock />
          </div>
          <div>
            <div className="quick-card-label">Lịch sử</div>
            <div className="quick-card-desc">Xem các thiết kế trước</div>
          </div>
        </div>

        <div className="quick-card">
          <div className="quick-card-icon-wrap orange">
            <Star />
          </div>
          <div>
            <div className="quick-card-label">Yêu thích</div>
            <div className="quick-card-desc">Ảnh đã lưu của bạn</div>
          </div>
        </div>
      </div>

      {/* Recent Designs */}
      <div>
        <div className="section-header">
          <div className="section-title">
            <Clock />
            Thiết kế gần đây
          </div>
          <span className="section-link">Xem tất cả →</span>
        </div>
        <div className="image-grid">
          {RECENT.map(item => (
            <div key={item.id} className="image-card">
              <img
                className="image-card-thumb"
                src={item.src}
                alt={item.name}
                loading="lazy"
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
              <div className="image-card-info">
                <div className="image-card-name">{item.name}</div>
                <div className="image-card-date">{item.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
