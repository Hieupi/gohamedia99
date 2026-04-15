import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, User, Loader } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_ICON = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
)

export default function LoginPage() {
  const { login, register, loginWithGoogle, resetPassword } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const errorMessages = {
    'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập.',
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/weak-password': 'Mật khẩu phải ít nhất 6 ký tự.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/wrong-password': 'Sai mật khẩu. Vui lòng thử lại.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng đợi một lát.',
    'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập Google.',
  }

  const getErrorMsg = (err) => errorMessages[err.code] || err.message || 'Đã xảy ra lỗi.'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'register') {
        await register(email, password, name)
        setSuccess('🎉 Đăng ký thành công! Kiểm tra email để xác nhận tài khoản.')
      } else if (mode === 'reset') {
        await resetPassword(email)
        setSuccess('📧 Đã gửi link đặt lại mật khẩu. Kiểm tra email của bạn.')
        setMode('login')
      } else {
        await login(email, password)
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      console.error('Google auth error:', err)
      setError(getErrorMsg(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orb auth-bg-orb-1" />
      <div className="auth-bg-orb auth-bg-orb-2" />

      <div className="auth-card fade-in">
        {/* Logo */}
        <div className="auth-logo">
          <img src="/assets/avatar-hieu.png" alt="Nguyễn Hiếu AI"
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 20px rgba(243,112,33,0.35)' }} />
          <div>
            <div className="auth-title" style={{ textAlign: 'center' }}>NGUYỄN HIẾU AI</div>
            <div style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, marginTop: 2 }}>
              GOHA MEDIA AFF TOOL
            </div>
            <div className="auth-subtitle" style={{ textAlign: 'center', marginTop: 8 }}>
              {mode === 'login' ? 'Đăng nhập để tiếp tục' :
                mode === 'register' ? 'Tạo tài khoản mới' :
                  'Đặt lại mật khẩu'}
            </div>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12,
            color: '#ef4444', textAlign: 'center'
          }}>❌ {error}</div>
        )}
        {success && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12,
            color: '#22c55e', textAlign: 'center'
          }}>{success}</div>
        )}

        {/* Google — only for login/register */}
        {mode !== 'reset' && (
          <>
            <button className="btn-google" onClick={handleGoogle} type="button" disabled={loading}>
              {loading ? <Loader size={18} className="spin" /> : <GOOGLE_ICON />}
              Tiếp tục với Google
            </button>
            <div className="auth-divider">HOẶC</div>
          </>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <div className="form-input-icon">
                <User className="input-icon" />
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

          {mode !== 'reset' && (
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
                  minLength={6}
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
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <button className="btn-auth-submit" type="submit" disabled={loading}>
            {loading ? <Loader size={16} className="spin" style={{ marginRight: 6 }} /> : null}
            {mode === 'login' ? 'Đăng nhập' :
              mode === 'register' ? 'Tạo tài khoản' :
                'Gửi link đặt lại'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="auth-forgot">
            <a href="#" onClick={e => { e.preventDefault(); setMode('reset'); setError(''); setSuccess('') }}>Quên mật khẩu?</a>
          </div>
        )}

        <div className="auth-footer">
          {mode === 'login' ? (
            <>Chưa có tài khoản? <a href="#" onClick={e => { e.preventDefault(); setMode('register'); setError(''); setSuccess('') }}>Đăng ký</a></>
          ) : mode === 'register' ? (
            <>Đã có tài khoản? <a href="#" onClick={e => { e.preventDefault(); setMode('login'); setError(''); setSuccess('') }}>Đăng nhập</a></>
          ) : (
            <>Nhớ mật khẩu? <a href="#" onClick={e => { e.preventDefault(); setMode('login'); setError(''); setSuccess('') }}>Đăng nhập</a></>
          )}
        </div>
      </div>
    </div>
  )
}
