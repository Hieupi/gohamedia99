import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import {
  Home, Wand2, Scissors, Image, Shield, Settings, LogOut, Phone, BookOpen, Video
} from 'lucide-react'
import NewDesignPage from '../pages/NewDesignPage'
import StorytellingPage from '../pages/StorytellingPage'
import RemoveClothesPage from '../pages/RemoveClothesPage'
import VideoPromptPage from '../pages/VideoPromptPage'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: Home },
  { path: '/new-design', label: 'Thiết kế mới', icon: Wand2 },
  { path: '/storytelling', label: 'Storytelling', icon: BookOpen },
  { path: '/video-prompt', label: 'Video Prompt', icon: Video },
  { path: '/remove-clothes', label: 'Tách đồ áo', icon: Scissors },
  { path: '/library', label: 'Thư viện', icon: Image },
  { path: '/admin', label: 'Quản trị', icon: Shield },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
]

// ─── Keep-Alive Pages ─────────────────────────────────────────────────────────
// These pages stay mounted forever — their state is never lost when switching tabs.
const KEEP_ALIVE_PAGES = [
  { path: '/new-design', Component: NewDesignPage },
  { path: '/storytelling', Component: StorytellingPage },
  { path: '/remove-clothes', Component: RemoveClothesPage },
  { path: '/video-prompt', Component: VideoPromptPage },
]

const KEEP_ALIVE_PATHS = KEEP_ALIVE_PAGES.map(p => p.path)

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const initial = (user.name || 'U').charAt(0).toUpperCase()

  const isKeepAlivePage = KEEP_ALIVE_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo" onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
          <img
            src="/assets/logo.png"
            alt="Goha Studio"
            className="sidebar-logo-img"
          />
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
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = pathname === path || pathname.startsWith(path + '/')
            return (
              <button
                key={path}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                onClick={() => navigate(path)}
              >
                <Icon size={18} />
                {label}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{initial}</div>
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
        {KEEP_ALIVE_PAGES.map(({ path, Component }) => (
          <div
            key={path}
            style={{
              display: (pathname === path || pathname.startsWith(path + '/'))
                ? 'block'
                : 'none',
            }}
          >
            <Component />
          </div>
        ))}

        {/* Normal pages: mount/unmount normally via Outlet */}
        {!isKeepAlivePage && <Outlet />}
      </main>
    </div>
  )
}
