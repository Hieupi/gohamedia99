import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

const GOOGLE_ICON = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
)

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onLogin({ email, name: name || email.split('@')[0] })
  }

  const handleGoogle = () => {
    onLogin({ email: 'user@gmail.com', name: 'Người dùng Google' })
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">FS</div>
          <div>
            <div className="auth-title">Fashion Studio AI</div>
            <div className="auth-subtitle" style={{ textAlign: 'center' }}>
              {mode === 'login' ? 'Đăng nhập để tiếp tục' : 'Tạo tài khoản mới'}
            </div>
          </div>
        </div>

        {/* Google */}
        <button className="btn-google" onClick={handleGoogle} type="button">
          <GOOGLE_ICON />
          Tiếp tục với Google
        </button>

        <div className="auth-divider">HOẶC</div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <div className="form-input-icon">
                <Mail className="input-icon" />
                <input
                  className="form-input"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="form-input-icon">
              <Mail className="input-icon" />
              <input
                className="form-input"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div className="form-input-icon" style={{ position: 'relative' }}>
              <Lock className="input-icon" />
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.35)', cursor: 'pointer'
                }}
              >
                {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>

          <button className="btn-auth-submit" type="submit">
            {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-forgot">
            <a href="#" onClick={e => e.preventDefault()}>Quên mật khẩu?</a>
          </div>
        )}

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Chưa có tài khoản? <a href="#" onClick={e => { e.preventDefault(); setMode('register') }}>Đăng ký</a></>
          ) : (
            <>Đã có tài khoản? <a href="#" onClick={e => { e.preventDefault(); setMode('login') }}>Đăng nhập</a></>
          )}
        </div>
      </div>
    </div>
  )
}
