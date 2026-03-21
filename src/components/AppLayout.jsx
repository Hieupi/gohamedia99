import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Wand2, Scissors, Image, Shield, Settings, LogOut, Phone
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: Home },
  { path: '/new-design', label: 'Thiết kế mới', icon: Wand2 },
  { path: '/remove-clothes', label: 'Tách đồ áo', icon: Scissors },
  { path: '/library', label: 'Thư viện', icon: Image },
  { path: '/admin', label: 'Quản trị', icon: Shield },
  { path: '/settings', label: 'Cài đặt', icon: Settings },
]

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const initial = (user.name || 'U').charAt(0).toUpperCase()

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
        <Outlet />
      </main>
    </div>
  )
}
