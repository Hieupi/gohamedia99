import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import useSubscription from './hooks/useSubscription'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'
import SocialPage from './pages/SocialPage'
import PromptLibraryPage from './pages/PromptLibraryPage'
import CommandAssistantPage from './pages/CommandAssistantPage'
import GuidePage from './pages/GuidePage'
import PricingPage from './pages/PricingPage'

// ─── Admin Guard ──────────────────────────────────────────────────────────────
function AdminGuard({ children }) {
  const { isAdmin } = useSubscription()
  if (!isAdmin) return <Navigate to="/home" replace />
  return children
}

export default function App() {
  const { user, profile, loading, logout } = useAuth()

  // Show loading while Firebase checks auth state
  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg-main)', color: 'var(--text-muted)', fontSize: 14
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--brand), #ff8a50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 18
          }}>FS</div>
          Đang tải...
        </div>
      </div>
    )
  }

  // Not logged in → show Login
  if (!user) {
    return <LoginPage />
  }

  const appUser = {
    name: profile?.name || user.displayName || 'User',
    email: profile?.email || user.email,
    photoURL: user.photoURL,
    plan: profile?.plan || 'free',
    role: profile?.role || 'user',
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout user={appUser} onLogout={logout} />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        {/* Free features */}
        <Route path="library" element={<LibraryPage />} />
        <Route path="settings" element={<SettingsPage user={appUser} />} />
        <Route path="social" element={<SocialPage />} />
        <Route path="prompt-library" element={<PromptLibraryPage />} />
        <Route path="prompt-assistant" element={<CommandAssistantPage />} />
        <Route path="huong-dan" element={<GuidePage />} />
        <Route path="pricing" element={<PricingPage />} />
        {/* Pro features — guarded */}
        {/* NewDesign, Storytelling, VideoPrompt are keep-alive in AppLayout, guarding is done in AppLayout */}
        {/* Admin — guarded */}
        <Route path="admin" element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
