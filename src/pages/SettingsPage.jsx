import { useState } from 'react'
import { User, Palette, Bell, Shield, Key, ChevronRight, Crown, Calendar, Clock, Sparkles } from 'lucide-react'
import { useTheme } from '../contexts/ThemeProvider'
import { useAuth } from '../contexts/AuthContext'
import useSubscription from '../hooks/useSubscription'
import UpgradePrompt from '../components/UpgradePrompt'

const LANGUAGES = ['Tiếng Việt', 'English', '日本語', '한국어']
const THEMES = ['Sáng', 'Tối', 'Luxury', 'Theo hệ thống']

export default function SettingsPage({ user }) {
  const [activeSection, setActiveSection] = useState('account')
  const [showUpgrade, setShowUpgrade] = useState(false)

  const { profile } = useAuth()
  const { isPro, isAdmin, isExpired, isExpiringSoon, daysRemaining, planExpiry, getPlanLabel } = useSubscription()
  const { theme: currentTheme, setTheme: applyTheme } = useTheme()
  const themeMap = { 'Sáng': 'light', 'Tối': 'dark', 'Luxury': 'luxury', 'Theo hệ thống': 'system' }
  const themeMapReverse = { light: 'Sáng', dark: 'Tối', luxury: 'Luxury', system: 'Theo hệ thống' }

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    language: 'Tiếng Việt',
    theme: themeMapReverse[currentTheme] || 'Sáng',
    emailNotif: true,
    pushNotif: false,
    mktNotif: true,
  })

  const set = (k, v) => {
    setForm(prev => ({ ...prev, [k]: v }))
    if (k === 'theme' && themeMap[v]) applyTheme(themeMap[v])
  }

  const SECTIONS = [
    { id: 'account', label: 'Tài khoản', icon: User },
    { id: 'subscription', label: 'Gói đăng ký', icon: Crown },
    { id: 'display', label: 'Giao diện', icon: Palette },
    { id: 'notif', label: 'Thông báo', icon: Bell },
    { id: 'security', label: 'Bảo mật', icon: Shield },
    { id: 'api', label: 'API Keys', icon: Key },
  ]

  const Toggle = ({ value, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: value ? 'var(--brand)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: value ? 20 : 3, width: 18, height: 18,
        background: 'white', borderRadius: '50%', transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )

  return (
    <div className="fade-in">
      <h1 className="page-title">⚙️ Cài đặt</h1>

      <div className="settings-layout">
        {/* Sidebar nav */}
        <div className="settings-nav">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`settings-nav-item${activeSection === id ? ' active' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                <Icon size={16} />
                {label}
              </div>
              <ChevronRight size={14} style={{ opacity: 0.35 }} />
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="settings-panel">

          {/* ── Account ── */}
          {activeSection === 'account' && (
            <div>
              <div className="settings-panel-title">Thông tin tài khoản</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #e55a00)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>
                    {(form.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{form.name || 'Người dùng'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{form.email}</div>
                    <button className="btn btn-secondary" style={{ padding: '0 14px', height: 30, fontSize: 12.5 }}>
                      Đổi ảnh đại diện
                    </button>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Họ và tên</label>
                    <input className="form-input" type="text" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0901 234 567" />
                  </div>
                  <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Lưu thay đổi</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Subscription ── */}
          {activeSection === 'subscription' && (
            <div>
              <div className="settings-panel-title">Gói đăng ký</div>

              {/* Plan badge card */}
              <div style={{
                padding: 24, borderRadius: 16, marginBottom: 20,
                background: isAdmin
                  ? 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(168,85,247,0.02))'
                  : isPro
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))'
                    : 'var(--bg)',
                border: `1.5px solid ${isAdmin ? 'rgba(168,85,247,0.2)' : isPro ? 'rgba(245,158,11,0.2)' : 'var(--border)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: isAdmin
                      ? 'linear-gradient(135deg, #a855f7, #7c3aed)'
                      : isPro
                        ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                        : 'var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Crown size={26} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-main)' }}>
                      {getPlanLabel}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                      {isAdmin ? 'Toàn quyền quản trị' : isPro ? 'Truy cập đầy đủ tính năng AI' : 'Truy cập các tính năng cơ bản'}
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 12
                }}>
                  {/* Ngày đăng ký */}
                  <InfoCard
                    icon={<Calendar size={16} style={{ color: '#3b82f6' }} />}
                    label="Ngày đăng ký"
                    value={profile?.createdAt
                      ? (profile.createdAt.toDate
                          ? profile.createdAt.toDate()
                          : new Date(profile.createdAt.seconds * 1000)
                        ).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'
                    }
                  />

                  {/* Gói hiện tại */}
                  <InfoCard
                    icon={<Sparkles size={16} style={{ color: '#f59e0b' }} />}
                    label="Gói hiện tại"
                    value={isAdmin ? 'Admin' : isPro ? 'Pro' : 'Free'}
                    valueColor={isAdmin ? '#a855f7' : isPro ? '#f59e0b' : '#94a3b8'}
                  />

                  {/* Ngày nâng cấp */}
                  <InfoCard
                    icon={<Sparkles size={16} style={{ color: '#22c55e' }} />}
                    label="Ngày nâng cấp"
                    value={profile?.upgradedAt
                      ? (profile.upgradedAt.toDate
                          ? profile.upgradedAt.toDate()
                          : new Date(profile.upgradedAt.seconds * 1000)
                        ).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'
                    }
                  />

                  {/* Ngày hết hạn */}
                  <InfoCard
                    icon={<Clock size={16} style={{ color: isExpired ? '#ef4444' : isExpiringSoon ? '#f97316' : '#22c55e' }} />}
                    label="Ngày hết hạn"
                    value={
                      isAdmin ? 'Không giới hạn'
                        : !isPro && !isExpired ? '—'
                        : planExpiry
                          ? planExpiry.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                          : 'Vĩnh viễn'
                    }
                    valueColor={isExpired ? '#ef4444' : isExpiringSoon ? '#f97316' : undefined}
                  />
                </div>

                {/* Expiry warning */}
                {isExpired && (
                  <div style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    fontSize: 13, color: '#ef4444', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    ⚠️ Gói Pro đã hết hạn. Gia hạn để tiếp tục sử dụng tính năng cao cấp.
                  </div>
                )}
                {isExpiringSoon && !isExpired && (
                  <div style={{
                    marginTop: 16, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    fontSize: 13, color: '#f59e0b', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 8
                  }}>
                    ⏳ Gói Pro còn {daysRemaining} ngày. Gia hạn sớm để không bị gián đoạn.
                  </div>
                )}
              </div>

              {/* Action buttons */}
              {!isAdmin && (
                <div style={{ display: 'flex', gap: 10 }}>
                  {(!isPro || isExpired || isExpiringSoon) && (
                    <button
                      onClick={() => setShowUpgrade(true)}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 24px', fontSize: 14, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                        border: 'none', borderRadius: 10
                      }}>
                      <Sparkles size={16} />
                      {isExpired ? 'Gia hạn ngay' : isExpiringSoon ? 'Gia hạn sớm' : 'Nâng cấp Pro'}
                    </button>
                  )}
                  <button
                    onClick={() => window.location.href = '#/pricing'}
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px', fontSize: 13 }}>
                    Xem bảng giá
                  </button>
                </div>
              )}

              {/* Pro features list */}
              <div style={{
                marginTop: 24, padding: 20, borderRadius: 14,
                background: 'var(--bg)', border: '1px solid var(--border)'
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-main)' }}>
                  Tính năng Pro bao gồm
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 13 }}>
                  {[
                    'Thiết kế mới (10-shot AI)',
                    'Storytelling (9 cảnh)',
                    'KOL Review Bán Hàng',
                    'Video Prompt điện ảnh',
                    'SEO & AEO Content',
                    'Hỗ trợ ưu tiên',
                  ].map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-main)' }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5,
                        background: (isPro || isAdmin) ? 'rgba(34,197,94,0.15)' : 'var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, fontSize: 11
                      }}>
                        {(isPro || isAdmin) ? '✓' : '🔒'}
                      </span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Display ── */}
          {activeSection === 'display' && (
            <div>
              <div className="settings-panel-title">Giao diện &amp; Ngôn ngữ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="form-group">
                  <label className="form-label">Ngôn ngữ</label>
                  <select className="form-input" style={{ height: 42 }} value={form.language} onChange={e => set('language', e.target.value)}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <div className="form-label">Chủ đề màu sắc</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {THEMES.map(t => (
                      <button key={t} onClick={() => set('theme', t)} style={{
                        flex: 1, height: 40, border: '2px solid',
                        borderColor: form.theme === t ? 'var(--brand)' : 'var(--border)',
                        borderRadius: 'var(--r-md)', background: 'var(--white)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        color: form.theme === t ? 'var(--brand)' : 'var(--text-secondary)',
                        transition: 'all 0.15s',
                      }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Lưu cài đặt</button>
              </div>
            </div>
          )}

          {/* ── Notifications ── */}
          {activeSection === 'notif' && (
            <div>
              <div className="settings-panel-title">Thông báo</div>
              {[
                { key: 'emailNotif', label: 'Email thông báo', desc: 'Gửi email khi tạo ảnh hoàn thành' },
                { key: 'pushNotif', label: 'Thông báo đẩy', desc: 'Nhận thông báo trực tiếp trên trình duyệt' },
                { key: 'mktNotif', label: 'Khuyến mãi & Tin tức', desc: 'Nhận thông tin về gói Pro và tính năng mới' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '16px 0', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{desc}</div>
                  </div>
                  <Toggle value={form[key]} onChange={v => set(key, v)} />
                </div>
              ))}
            </div>
          )}

          {/* ── Security ── */}
          {activeSection === 'security' && (
            <div>
              <div className="settings-panel-title">Bảo mật</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu hiện tại</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>
                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input className="form-input" type="password" placeholder="••••••••" />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Đổi mật khẩu</button>
                <div style={{
                  marginTop: 8, padding: 16,
                  background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--r-md)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}>
                  <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6 }}>Vùng nguy hiểm</div>
                  <button className="btn" style={{
                    background: '#ef4444', color: 'white', border: 'none',
                    padding: '0 16px', height: 34, fontSize: 13,
                  }}>
                    Xóa tài khoản
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── API Keys ── */}
          {activeSection === 'api' && <ApiKeyManager />}

        </div>
      </div>

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradePrompt
          featureName=""
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}

// ─── Info Card for subscription section ───────────────────────────────────────
function InfoCard({ icon, label, value, valueColor }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--bg-card, #fff)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: valueColor || 'var(--text-main)' }}>
        {value}
      </div>
    </div>
  )
}

/* ====================================================================
   API KEY MANAGER
   Inline component — quản lý nhiều Gemini key với round-robin rotation.
   Lưu trong localStorage của trình duyệt.
   ==================================================================== */

const LS_KEYS = 'fsa_api_keys'
const LS_IDX = 'fsa_api_key_index'

function lsLoadKeys() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS) || '[]') } catch { return [] }
}
function lsSaveKeys(k) { localStorage.setItem(LS_KEYS, JSON.stringify(k)) }
function lsGetIdx() { return parseInt(localStorage.getItem(LS_IDX) || '0', 10) }
function lsSaveIdx(i) { localStorage.setItem(LS_IDX, String(i)) }
function maskKey(k) { return k && k.length > 8 ? '••••' + k.slice(-4) : '••••••••' }

async function testKeyDirect(keyStr) {
  // Test key bằng cách gọi Gemini text model đơn giản nhất
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyStr}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Reply with: OK' }] }],
      generationConfig: { maxOutputTokens: 5 }
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `HTTP ${res.status}`)
  }
  return true
}

function ApiKeyManager() {
  const [keys, setKeys] = useState(lsLoadKeys)
  const [newKey, setNewKey] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [errMsg, setErrMsg] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [visibleSet, setVisibleSet] = useState(new Set())
  const [editId, setEditId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [rotIdx, setRotIdx] = useState(lsGetIdx)
  const [testingId, setTestingId] = useState(null)
  const [testStatus, setTestStatus] = useState({})

  const persist = updated => { lsSaveKeys(updated); setKeys(updated) }

  const flash = (type, msg) => {
    type === 'ok' ? (setOkMsg(msg), setErrMsg('')) : (setErrMsg(msg), setOkMsg(''))
    setTimeout(() => { setOkMsg(''); setErrMsg('') }, 3000)
  }

  /* Add */
  const doAdd = () => {
    const k = newKey.trim()
    if (!k) return flash('err', 'Vui lòng nhập API Key.')
    if (keys.some(x => x.key === k)) return flash('err', 'Key này đã tồn tại.')
    const entry = {
      id: Date.now().toString(),
      label: newLabel.trim() || `Key ${keys.length + 1}`,
      key: k,
      active: true,
      addedAt: new Date().toISOString(),
      requestCount: 0,
    }
    persist([...keys, entry])
    setNewKey(''); setNewLabel('')
    flash('ok', `Đã thêm "${entry.label}"!`)
  }

  /* Remove */
  const doRemove = id => {
    const updated = keys.filter(k => k.id !== id)
    persist(updated)
    const active = updated.filter(k => k.active)
    const ni = active.length ? rotIdx % active.length : 0
    lsSaveIdx(ni); setRotIdx(ni)
    flash('ok', 'Đã xóa key.')
  }

  /* Toggle active */
  const doToggle = id => persist(keys.map(k => k.id === id ? { ...k, active: !k.active } : k))

  /* Rename */
  const doRename = id => {
    if (!editLabel.trim()) return
    persist(keys.map(k => k.id === id ? { ...k, label: editLabel.trim() } : k))
    setEditId(null); setEditLabel('')
  }

  /* Show/hide key value */
  const toggleVisible = id => setVisibleSet(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  /* Copy */
  const doCopy = key => navigator.clipboard.writeText(key).then(() => flash('ok', 'Đã sao chép!'))

  /* Test key thực tế */
  const doTest = async (k) => {
    setTestingId(k.id)
    setTestStatus(prev => ({ ...prev, [k.id]: null }))
    try {
      await testKeyDirect(k.key)
      setTestStatus(prev => ({ ...prev, [k.id]: { ok: true, msg: 'Key hợp lệ, kết nối thành công!' } }))
    } catch (err) {
      setTestStatus(prev => ({ ...prev, [k.id]: { ok: false, msg: err.message } }))
    } finally {
      setTestingId(null)
    }
  }

  /* Simulate round-robin */
  const activeKeys = keys.filter(k => k.active)
  const currentKey = activeKeys.length ? activeKeys[rotIdx % activeKeys.length] : null

  const doSimulate = () => {
    if (!activeKeys.length) return flash('err', 'Không có key nào đang bật.')
    const idx = rotIdx % activeKeys.length
    const chosen = activeKeys[idx]
    persist(keys.map(k => k.id === chosen.id ? { ...k, requestCount: (k.requestCount || 0) + 1 } : k))
    const nxt = (idx + 1) % activeKeys.length
    lsSaveIdx(nxt); setRotIdx(nxt)
    flash('ok', `✓ Đã dùng "${chosen.label}" — kế tiếp: "${activeKeys[nxt]?.label}"`)
  }

  return (
    <div>
      <div className="settings-panel-title">🔑 Quản lý API Keys</div>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
        Thêm nhiều <strong>Gemini API Key</strong>. App sẽ <strong>tự động xoay vòng</strong> (round-robin)
        để tránh rate-limit. Chỉ các key <span style={{ color: '#16a34a', fontWeight: 600 }}>đang bật</span> mới được sử dụng.
      </p>

      {/* ─ Add new key ─ */}
      <div style={{
        padding: 18, border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)', marginBottom: 20, background: 'var(--bg)',
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>➕ Thêm API Key mới</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="form-input"
            placeholder="Nhãn (vd: Key cá nhân, Key của shop…)"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              placeholder="AIzaSy… (dán Gemini API Key vào đây)"
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doAdd()}
              type="password"
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
            />
            <button className="btn btn-primary" onClick={doAdd} style={{ flexShrink: 0, padding: '0 20px' }}>
              Thêm
            </button>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Lấy key tại: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>aistudio.google.com/app/apikey</a>
          </div>
        </div>
      </div>

      {/* ─ Flash messages ─ */}
      {errMsg && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, fontSize: 13,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 8, color: '#dc2626',
        }}>⚠ {errMsg}</div>
      )}
      {okMsg && (
        <div style={{
          padding: '10px 14px', marginBottom: 12, fontSize: 13,
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 8, color: '#15803d',
        }}>✓ {okMsg}</div>
      )}

      {/* ─ Round-robin status ─ */}
      {activeKeys.length > 0 && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'rgba(255,107,0,0.06)', border: '1px solid rgba(255,107,0,0.2)',
          borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 3 }}>
              🔄 Key sẽ dùng tiếp theo ({activeKeys.length} key active)
            </div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--brand)' }}>
              {currentKey?.label}
              <span style={{ fontFamily: 'monospace', fontWeight: 400, fontSize: 12.5, marginLeft: 8, color: 'var(--text-secondary)' }}>
                {maskKey(currentKey?.key)}
              </span>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={doSimulate} style={{ fontSize: 12, padding: '0 14px', height: 32, flexShrink: 0 }}>
            Test xoay vòng
          </button>
        </div>
      )}

      {/* ─ Key list ─ */}
      {keys.length === 0 ? (
        <div style={{
          padding: 36, textAlign: 'center',
          border: '2px dashed var(--border)', borderRadius: 'var(--r-md)',
          color: 'var(--text-muted)', fontSize: 14,
        }}>
          Chưa có API Key nào. Thêm key Gemini của bạn ở trên.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {keys.map((k, i) => {
            const isNext = currentKey?.id === k.id
            const isVisible = visibleSet.has(k.id)
            const isEditing = editId === k.id

            return (
              <div key={k.id} style={{
                padding: '14px 16px',
                border: `1px solid ${isNext && k.active ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)',
                background: k.active ? 'var(--white)' : 'var(--bg)',
                opacity: k.active ? 1 : 0.6,
                transition: 'all 0.2s',
              }}>
                {/* Row 1 — label + badges + toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{
                    minWidth: 24, height: 24, borderRadius: '50%',
                    background: 'rgba(255,107,0,0.12)', color: 'var(--brand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>

                  {isEditing ? (
                    <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                      <input
                        className="form-input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') doRename(k.id); if (e.key === 'Escape') setEditId(null) }}
                        style={{ height: 30, padding: '0 8px', fontSize: 13 }}
                        autoFocus
                      />
                      <button className="btn btn-primary" onClick={() => doRename(k.id)} style={{ height: 30, padding: '0 12px', fontSize: 12 }}>Lưu</button>
                      <button className="btn btn-secondary" onClick={() => setEditId(null)} style={{ height: 30, padding: '0 10px', fontSize: 12 }}>Hủy</button>
                    </div>
                  ) : (
                    <span
                      style={{ fontWeight: 600, fontSize: 14, flex: 1, cursor: 'pointer' }}
                      title="Click để đổi tên"
                      onClick={() => { setEditId(k.id); setEditLabel(k.label) }}
                    >
                      {k.label} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>✏</span>
                    </span>
                  )}

                  {isNext && k.active && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px',
                      background: 'var(--brand)', color: 'white', borderRadius: 10,
                    }}>NEXT</span>
                  )}
                  {!k.active && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '2px 7px',
                      background: 'var(--border)', color: 'var(--text-muted)', borderRadius: 10,
                    }}>TẮT</span>
                  )}

                  {/* Toggle switch */}
                  <button
                    onClick={() => doToggle(k.id)}
                    title={k.active ? 'Tắt key này' : 'Bật key này'}
                    style={{
                      width: 38, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
                      background: k.active ? 'var(--brand)' : 'var(--border)',
                      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 2.5, left: k.active ? 17 : 2.5,
                      width: 17, height: 17, background: 'white', borderRadius: '50%',
                      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>

                {/* Row 2 — masked key + action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <code style={{
                    flex: 1, fontSize: 12.5, fontFamily: 'monospace',
                    background: 'var(--bg)', padding: '6px 10px',
                    borderRadius: 6, border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', letterSpacing: '0.5px',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {isVisible ? k.key : maskKey(k.key)}
                  </code>
                  <button className="btn btn-secondary" onClick={() => toggleVisible(k.id)}
                    title={isVisible ? 'Ẩn key' : 'Hiện key'}
                    style={{ height: 32, padding: '0 10px', fontSize: 13, flexShrink: 0 }}>
                    {isVisible ? '🙈' : '👁'}
                  </button>
                  <button className="btn btn-secondary" onClick={() => doCopy(k.key)}
                    title="Sao chép key"
                    style={{ height: 32, padding: '0 10px', fontSize: 13, flexShrink: 0 }}>
                    📋
                  </button>
                  {/* ── Test key button ── */}
                  <button
                    onClick={() => doTest(k)}
                    disabled={testingId === k.id}
                    title="Kiểm tra key có hoạt động không"
                    style={{
                      height: 32, padding: '0 12px', fontSize: 12, flexShrink: 0,
                      border: '1px solid rgba(99,179,237,0.4)', borderRadius: 'var(--r-sm)',
                      background: testingId === k.id ? 'rgba(99,179,237,0.05)' : 'rgba(99,179,237,0.1)',
                      color: '#2b6cb0', cursor: testingId === k.id ? 'wait' : 'pointer',
                      fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                    {testingId === k.id
                      ? <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span> Đang test...</>
                      : '🧪 Test'
                    }
                  </button>
                  <button onClick={() => doRemove(k.id)}
                    title="Xóa key này"
                    style={{
                      height: 32, padding: '0 10px', fontSize: 13, flexShrink: 0,
                      border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--r-sm)',
                      background: 'rgba(239,68,68,0.06)', color: '#dc2626', cursor: 'pointer',
                    }}>
                    🗑
                  </button>
                </div>

                {/* Test result */}
                {testStatus[k.id] && (
                  <div style={{
                    marginTop: 8, padding: '7px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                    background: testStatus[k.id].ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${testStatus[k.id].ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: testStatus[k.id].ok ? '#15803d' : '#dc2626',
                    wordBreak: 'break-word',
                  }}>
                    {testStatus[k.id].ok ? '✅' : '❌'} {testStatus[k.id].msg}
                  </div>
                )}

                {/* Row 3 — stats */}
                <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 16 }}>
                  <span>Đã dùng: <strong>{k.requestCount || 0} lần</strong></span>
                  <span>Thêm ngày: {new Date(k.addedAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─ How it works ─ */}
      <div style={{
        marginTop: 20, padding: 14,
        background: 'rgba(255,107,0,0.05)', borderRadius: 'var(--r-md)',
        border: '1px solid rgba(255,107,0,0.15)', fontSize: 13,
      }}>
        <div style={{ fontWeight: 600, color: 'var(--brand)', marginBottom: 6 }}>💡 Cách hoạt động</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', lineHeight: 1.9 }}>
          <li>Mỗi lần gọi AI, app dùng 1 key rồi chuyển sang key kế tiếp (round-robin)</li>
          <li>Key bị <strong>tắt</strong> sẽ bị bỏ qua trong vòng xoay</li>
          <li>Nhấn <strong>🧪 Test</strong> để kiểm tra từng key có hợp lệ không</li>
          <li>Keys được lưu trong trình duyệt (localStorage) — không ai khác truy cập được</li>
        </ul>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
