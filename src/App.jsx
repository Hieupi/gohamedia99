import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import NewDesignPage from './pages/NewDesignPage'
import RemoveClothesPage from './pages/RemoveClothesPage'
import StorytellingPage from './pages/StorytellingPage'
import LibraryPage from './pages/LibraryPage'
import AdminPage from './pages/AdminPage'
import SettingsPage from './pages/SettingsPage'

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('fsa_user')
    return saved ? JSON.parse(saved) : null
  })

  const login = (userData) => {
    const u = { name: userData.name || 'Người dùng', email: userData.email || '' }
    localStorage.setItem('fsa_user', JSON.stringify(u))
    setUser(u)
  }

  const logout = () => {
    localStorage.removeItem('fsa_user')
    setUser(null)
  }

  if (!user) {
    return <LoginPage onLogin={login} />
  }

  return (
    <Routes>
      <Route path="/" element={<AppLayout user={user} onLogout={logout} />}>
        <Route index element={<Navigate to="/home" replace />} />
        <Route path="home" element={<HomePage />} />
        <Route path="new-design" element={<NewDesignPage />} />
        <Route path="storytelling" element={<StorytellingPage />} />
        <Route path="remove-clothes" element={<RemoveClothesPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="settings" element={<SettingsPage user={user} />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Route>
    </Routes>
  )
}
