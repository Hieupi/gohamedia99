import { useState } from 'react'
import {
  ExternalLink, Phone, Copy, Check,
  Globe, Users, MessageCircle, GraduationCap,
  Heart, Zap, ChevronRight, Sparkles, Gift
} from 'lucide-react'
import './SocialPage.css'

/* ─── Platform SVG Icons ────────────────────── */
const ZaloIcon = () => (
  <svg width="22" height="22" viewBox="0 0 48 48" fill="currentColor">
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm7.477 29.842h-2.4c-.8 0-1.2-.4-1.6-1.2l-3.2-6 .8 7.2h-2.4l-1.2-10.8h2.8l3.6 6.8-.4-6.8h2.4l1.6 10.8zm-12-10.8h5.6v2h-3.2v2h2.8v2h-2.8v2.8h3.2v2h-5.6v-10.8zm-3.6 0h2.4v10.8h-2.4v-10.8zm-5.2 0h2.4l2 7.2 .4-7.2h2l-1.2 10.8h-2.4l-2-7.2-.4 7.2h-2l1.2-10.8z" />
  </svg>
)

const FacebookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const TikTokIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
)

const TelegramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
)

const InstagramIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
  </svg>
)

/* ─── Social Links Data ─────────────────────── */
const SOCIAL_LINKS = [
  {
    id: 'zalo',
    title: 'Zalo Group',
    desc: 'Cộng đồng Zalo — hỗ trợ trực tiếp từ team',
    url: 'https://zalo.me/g/jcons43eyjbf2rw1tlkr',
    variant: 'zalo',
    Icon: ZaloIcon
  },
  {
    id: 'facebook',
    title: 'Facebook Cá Nhân',
    desc: 'Kết nối trực tiếp với Nguyễn Hiếu',
    url: 'https://www.facebook.com/hieudsp/',
    variant: 'facebook',
    Icon: FacebookIcon
  },
  {
    id: 'youtube',
    title: 'YouTube — Nông Dân AI',
    desc: 'Video hướng dẫn & tips thời trang AI',
    url: 'https://www.youtube.com/@NongDanAI99',
    variant: 'youtube',
    Icon: YouTubeIcon
  },
  {
    id: 'telegram',
    title: 'Telegram Channel',
    desc: 'Cập nhật nhanh & tài liệu miễn phí',
    url: 'https://t.me/+UxmRCgsa5GJmMjll',
    variant: 'telegram',
    Icon: TelegramIcon
  }
]

const COMMUNITY_LINKS = [
  {
    id: 'masterclass',
    title: 'Khoá học Masterclass',
    desc: 'Học thiết kế AI từ A-Z',
    url: '#',
    variant: 'masterclass',
    icon: <GraduationCap size={22} />
  },
  {
    id: 'website',
    title: 'Website Chính',
    desc: 'nguyenhieu.ai',
    url: 'https://nguyenhieu.ai',
    variant: 'website',
    icon: <Globe size={22} />
  },
  {
    id: 'community',
    title: 'Cộng đồng Fashion AI',
    desc: 'Kết nối & networking',
    url: '#',
    variant: 'facebook',
    icon: <Users size={22} />
  },
  {
    id: 'support',
    title: 'Hỗ trợ kỹ thuật',
    desc: 'Chat trực tiếp với team',
    url: '#',
    variant: 'zalo',
    icon: <MessageCircle size={22} />
  }
]

/* ─── Component ─────────────────────────────── */
export default function SocialPage() {
  const [copied, setCopied] = useState(false)

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCardClick = (url) => {
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="social-page">
      <div className="social-inner">

        {/* ── Hero ─────────────────────────── */}
        <div className="social-hero social-section">
          <div className="social-hero-badge">
            <Zap size={10} fill="currentColor" />
            SOCIAL LINKS
          </div>
          <div className="social-hero-avatar">
            <img src="/avatar-hieu.png" alt="Nguyễn Hiếu" className="social-hero-avatar-img" />
          </div>
          <h1 className="social-hero-title">NGUYỄN HIẾU AI</h1>
          <p className="social-hero-tagline">
            Kết nối với chúng tôi trên mọi nền tảng. Tham gia cộng đồng để nhận tips, tài liệu và hỗ trợ trực tiếp.
          </p>
        </div>

        {/* ── Hotline Card ────────────────── */}
        <div className="social-section">
          <div className="social-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div
              className="social-card social-card--phone"
              onClick={() => handleCardClick('tel:0981228229')}
            >
              <div className="social-card-icon">
                <Phone size={22} />
              </div>
              <div className="social-card-content">
                <div className="social-card-title">Liên hệ công việc</div>
                <div className="social-card-desc">0981 228 229 — Gọi ngay để được tư vấn</div>
              </div>
              <ChevronRight size={16} className="social-card-arrow" />
            </div>
          </div>
        </div>

        {/* ── Donation / Bank Transfer ────── */}
        <div className="social-section">
          <div className="social-section-title">
            <Gift size={14} />
            Ủng hộ & Donate
          </div>
          <div className="social-donate-box">
            <div className="social-donate-box-title">
              <Heart size={14} style={{ display: 'inline', verticalAlign: -2, marginRight: 6 }} />
              Mời Nguyễn Hiếu 1 ly cafe
            </div>
            <div className="social-donate-box-desc">ủng hộ duy trì hệ thống và Website ☕</div>

            {/* QR Code */}
            <div className="social-qr-section">
              <img src="/qr-vietinbank.png" alt="QR Chuyển khoản Vietinbank" className="social-qr-img" />
            </div>

            <div className="social-bank-info">
              <div className="social-bank-logo">
                <img src="/logo-vietinbank.png" alt="VietinBank" className="social-bank-logo-img" />
              </div>
              <div className="social-bank-details">
                <div className="social-bank-name">Vietinbank</div>
                <div className="social-bank-number">60048899</div>
                <div className="social-bank-holder">NGUYEN VAN HIEU</div>
                <div className="social-bank-note">Nội dung CK: <strong>SEVQR</strong> + lời nhắn</div>
              </div>
              <button
                className="social-copy-btn"
                onClick={(e) => { e.stopPropagation(); handleCopy('60048899') }}
              >
                {copied ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Copy STK</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Social Channels ─────────────── */}
        <div className="social-section">
          <div className="social-section-title">
            <Sparkles size={14} />
            Kênh Social
          </div>
          <div className="social-grid">
            {SOCIAL_LINKS.map(link => (
              <div
                key={link.id}
                className={`social-card social-card--${link.variant}`}
                onClick={() => handleCardClick(link.url)}
              >
                <div className="social-card-icon">
                  <link.Icon />
                </div>
                <div className="social-card-content">
                  <div className="social-card-title">{link.title}</div>
                  <div className="social-card-desc">{link.desc}</div>
                </div>
                <ChevronRight size={16} className="social-card-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Community & Resources ────────── */}
        <div className="social-section">
          <div className="social-section-title">
            <Users size={14} />
            Cộng đồng & Tài nguyên
          </div>
          <div className="social-grid">
            {COMMUNITY_LINKS.map(link => (
              <div
                key={link.id}
                className={`social-card social-card--${link.variant}`}
                onClick={() => handleCardClick(link.url)}
              >
                <div className="social-card-icon">
                  {link.icon}
                </div>
                <div className="social-card-content">
                  <div className="social-card-title">{link.title}</div>
                  <div className="social-card-desc">{link.desc}</div>
                </div>
                <ChevronRight size={16} className="social-card-arrow" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ────────────────────────── */}
        <div className="social-footer">
          <div className="social-footer-text">
            © 2026 <span className="social-footer-brand">NGUYỄN HIẾU AI</span> — All rights reserved
          </div>
        </div>

      </div>
    </div>
  )
}
