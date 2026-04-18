import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, Wand2, Scissors, Image, Shield, Settings, LogOut, Phone, BookOpen, Video, Lock, Sparkles, Share2, Package, MessageSquareText, BookMarked, AlertTriangle, Tag, UserCircle2, Clapperboard
} from 'lucide-react'
import useSubscription from '../hooks/useSubscription'
import UpgradePrompt from './UpgradePrompt'
import NewDesignPage from '../pages/NewDesignPage'
import StorytellingPage from '../pages/StorytellingPage'
import KOLReviewSalesPage from '../pages/KOLReviewSalesPage'
import RemoveClothesPage from '../pages/RemoveClothesPage'
import RemoveProductPage from '../pages/RemoveProductPage'
import VideoPromptPage from '../pages/VideoPromptPage'
import KOLCreatorPage from '../pages/KOLCreatorPage'
import KlingFashionPage from '../pages/KlingFashionPage'
import PhoiDoPage from '../pages/PhoiDoPage'
import PhoiDoLotPage from '../pages/PhoiDoLotPage'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: Home, feature: null },
  { path: '/kol-creator', label: 'Tạo KOL AI', icon: UserCircle2, feature: 'storytelling' },
  { path: '/phoi-do', label: 'Phối Đồ', icon: Sparkles, feature: 'storytelling' },
  { path: '/phoi-do-lot', label: 'Phối Đồ Lót', icon: Sparkles, feature: 'storytelling' },
  { path: '/kling-fashion', label: 'Kling AI Fashion', icon: Clapperboard, feature: 'storytelling' },
  { path: '/new-design', label: 'Thiết kế mới', icon: Wand2, feature: 'new-design' },
  { path: '/storytelling', label: 'Storytelling', icon: BookOpen, feature: 'storytelling' },
  { path: '/kol-review-sales', label: 'KOL Review Bán Hàng', icon: Sparkles, feature: 'storytelling' },
  { path: '/video-prompt', label: 'Video Prompt', icon: Video, feature: 'video-prompt' },
  { path: '/prompt-library', label: 'Kho Prompt', icon: BookOpen, feature: null },
  { path: '/prompt-assistant', label: 'Trợ Lý Viết Câu Lệnh', icon: MessageSquareText, feature: null },
  { path: '/remove-clothes', label: 'Tách đồ áo', icon: Scissors, feature: 'remove-clothes' },
  { path: '/remove-product', label: 'Tách sản phẩm', icon: Package, feature: 'remove-clothes' },
  { path: '/library', label: 'Thư viện', icon: Image, feature: 'library' },
  { path: '/pricing', label: 'Bảng giá', icon: Tag, feature: null },
  { path: '/huong-dan', label: 'Hướng dẫn', icon: BookMarked, feature: null },
  { path: '/social', label: 'Social Links', icon: Share2, feature: null },
  { path: '/admin', label: 'Quản trị', icon: Shield, feature: 'admin' },
  { path: '/settings', label: 'Cài đặt', icon: Settings, feature: 'settings' },
]

// ─── Keep-Alive Pages ─────────────────────────────────────────────────────────
const KEEP_ALIVE_PAGES = [
  { path: '/kol-creator', Component: KOLCreatorPage, feature: 'storytelling' },
  { path: '/phoi-do', Component: PhoiDoPage, feature: 'storytelling' },
  { path: '/phoi-do-lot', Component: PhoiDoLotPage, feature: 'storytelling' },
  { path: '/kling-fashion', Component: KlingFashionPage, feature: 'storytelling' },
  { path: '/new-design', Component: NewDesignPage, feature: 'new-design' },
  { path: '/storytelling', Component: StorytellingPage, feature: 'storytelling' },
  { path: '/kol-review-sales', Component: KOLReviewSalesPage, feature: 'storytelling' },
  { path: '/remove-clothes', Component: RemoveClothesPage, feature: 'remove-clothes' },
  { path: '/remove-product', Component: RemoveProductPage, feature: 'remove-clothes' },
  { path: '/video-prompt', Component: VideoPromptPage, feature: 'video-prompt' },
]

const KEEP_ALIVE_PATHS = KEEP_ALIVE_PAGES.map(p => p.path)

const FEATURE_LABELS = {
  'new-design': 'Thiết kế mới (10-shot AI)',
  'storytelling': 'Storytelling (9 cảnh)',
  'kol-review-sales': 'KOL Review Bán Hàng',
  'video-prompt': 'Video Prompt điện ảnh',
  'seo-aeo': 'SEO & AEO Content',
}

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { canAccess, isAdmin, getPlanLabel, isExpired, isExpiringSoon, daysRemaining } = useSubscription()
  const [upgradeFeature, setUpgradeFeature] = useState(null)

  const initial = user.photoURL ? null : (user.name || 'U').charAt(0).toUpperCase()

  const isKeepAlivePage = KEEP_ALIVE_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  const handleNavClick = (item) => {
    // Admin-only check
    if (item.path === '/admin' && !isAdmin) return

    // Pro feature check
    if (item.feature && !canAccess(item.feature)) {
      setUpgradeFeature(FEATURE_LABELS[item.feature] || item.label)
      return
    }

    navigate(item.path)
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <img src="/assets/avatar-hieu.png" alt="Nguyễn Hiếu AI" className="sidebar-logo-img" style={{ borderRadius: '50%' }} />
          <div>
            <div className="sidebar-logo-text">NGUYỄN HIẾU AI</div>
            <div className="sidebar-logo-phone">
              <Phone size={10} />
              0981.228.229
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const { path, label, icon: Icon, feature } = item
            const active = pathname === path || pathname.startsWith(path + '/')

            // Hide admin from non-admins
            if (path === '/admin' && !isAdmin) return null

            const locked = feature && !canAccess(feature)

            return (
              <button
                key={path}
                className={`sidebar-nav-item${active ? ' active' : ''}${locked ? ' locked' : ''}`}
                onClick={() => handleNavClick(item)}
                style={locked ? { opacity: 0.55 } : undefined}
              >
                <Icon size={18} />
                {label}
                {locked && <Lock size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          {/* Plan badge */}
          <div style={{
            textAlign: 'center', padding: '6px 0', marginBottom: 8,
            fontSize: 11, fontWeight: 700, borderRadius: 8,
            background: isAdmin ? 'rgba(168,85,247,0.15)' :
              canAccess('new-design') ? 'rgba(245,158,11,0.15)' : 'rgba(100,116,139,0.15)',
            color: isAdmin ? '#a855f7' :
              canAccess('new-design') ? '#f59e0b' : '#94a3b8',
          }}>
            {getPlanLabel}
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : initial}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-email">{user.email}</div>
            </div>
          </div>
          <button className="sidebar-logout" onClick={onLogout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="page-content">
        {/* ★ Subscription expiry warning */}
        {isExpired && (
          <div style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.25)',
            fontSize: 13, fontWeight: 600, color: '#ef4444'
          }}>
            <AlertTriangle size={16} />
            Gói Pro đã hết hạn. Các tính năng cao cấp đã bị khóa.
            <button
              onClick={() => setUpgradeFeature('Gia hạn Pro')}
              style={{
                marginLeft: 'auto', padding: '4px 14px', borderRadius: 8, border: 'none',
                background: '#ef4444', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>
              Gia hạn ngay
            </button>
          </div>
        )}
        {isExpiringSoon && !isExpired && (
          <div style={{
            padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.25)',
            fontSize: 13, fontWeight: 600, color: '#f59e0b'
          }}>
            <AlertTriangle size={16} />
            Gói Pro còn {daysRemaining} ngày. Gia hạn để không bị gián đoạn.
            <button
              onClick={() => setUpgradeFeature('Gia hạn Pro')}
              style={{
                marginLeft: 'auto', padding: '4px 14px', borderRadius: 8, border: 'none',
                background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer'
              }}>
              Gia hạn
            </button>
          </div>
        )}

        {/* ★ Keep-Alive: work pages are always mounted, hidden with CSS */}
        {KEEP_ALIVE_PAGES.map(({ path, Component, feature }) => {
          const visible = pathname === path || pathname.startsWith(path + '/')
          // Don't render Pro pages for Free users at all
          if (!canAccess(feature)) return null
          return (
            <div key={path} style={{ display: visible ? 'block' : 'none' }}>
              <Component />
            </div>
          )
        })}

        {/* Normal pages: mount/unmount normally via Outlet */}
        {!isKeepAlivePage && <Outlet />}
      </main>

      {/* Upgrade modal */}
      {upgradeFeature && (
        <UpgradePrompt
          featureName={upgradeFeature}
          onClose={() => setUpgradeFeature(null)}
          onUpgrade={() => setUpgradeFeature(null)}
        />
      )}
    </div>
  )
}
