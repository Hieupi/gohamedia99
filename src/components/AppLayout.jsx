import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Home, Wand2, Scissors, Image, Shield, Settings, LogOut, Phone, BookOpen, Video, Lock, Sparkles, Share2
} from 'lucide-react'
import useSubscription from '../hooks/useSubscription'
import UpgradePrompt from './UpgradePrompt'
import NewDesignPage from '../pages/NewDesignPage'
import StorytellingPage from '../pages/StorytellingPage'
import RemoveClothesPage from '../pages/RemoveClothesPage'
import VideoPromptPage from '../pages/VideoPromptPage'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: Home, feature: null },
  { path: '/new-design', label: 'Thiết kế mới', icon: Wand2, feature: 'new-design' },
  { path: '/storytelling', label: 'Storytelling', icon: BookOpen, feature: 'storytelling' },
  { path: '/video-prompt', label: 'Video Prompt', icon: Video, feature: 'video-prompt' },
  { path: '/prompt-library', label: 'Kho Prompt', icon: BookOpen, feature: null },
  { path: '/remove-clothes', label: 'Tách đồ áo', icon: Scissors, feature: 'remove-clothes' },
  { path: '/library', label: 'Thư viện', icon: Image, feature: 'library' },
  { path: '/social', label: 'Social Links', icon: Share2, feature: null },
  { path: '/admin', label: 'Quản trị', icon: Shield, feature: 'admin' },
  { path: '/settings', label: 'Cài đặt', icon: Settings, feature: 'settings' },
]

// ─── Keep-Alive Pages ─────────────────────────────────────────────────────────
const KEEP_ALIVE_PAGES = [
  { path: '/new-design', Component: NewDesignPage, feature: 'new-design' },
  { path: '/storytelling', Component: StorytellingPage, feature: 'storytelling' },
  { path: '/remove-clothes', Component: RemoveClothesPage, feature: 'remove-clothes' },
  { path: '/video-prompt', Component: VideoPromptPage, feature: 'video-prompt' },
]

const KEEP_ALIVE_PATHS = KEEP_ALIVE_PAGES.map(p => p.path)

const FEATURE_LABELS = {
  'new-design': 'Thiết kế mới (10-shot AI)',
  'storytelling': 'Storytelling (9 cảnh)',
  'video-prompt': 'Video Prompt điện ảnh',
  'seo-aeo': 'SEO & AEO Content',
}

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { canAccess, isAdmin, getPlanLabel } = useSubscription()
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
          <img src="/assets/logo.png" alt="Goha Studio" className="sidebar-logo-img" />
          <div>
            <div className="sidebar-logo-text">Goha Studio</div>
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
