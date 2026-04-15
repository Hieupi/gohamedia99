/**
 * AdminPage.jsx
 * Admin Dashboard — User management, order confirmation, stats, guide articles
 */
import { useState, useEffect } from 'react'
import { Users, CreditCard, BarChart3, CheckCircle, XCircle, Loader, RefreshCw, Shield, Crown, BookMarked, Plus, Trash2, Edit3, Eye, EyeOff, X, PlayCircle, Tag, CalendarPlus, ChevronDown, Save } from 'lucide-react'
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore'
import { db } from '../services/firebaseConfig'
import { confirmPayment, getAllOrders, getProUserCount } from '../services/paymentService'
import { autoConfirmPayments } from '../services/sepayService'
import { fetchPricing, updatePricing, initDefaultPricing, PLAN_KEYS, PLAN_ICONS } from '../services/pricingService'
import { useAuth } from '../contexts/AuthContext'

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Giao dịch', icon: CreditCard },
  { id: 'plans', label: 'Gói dịch vụ', icon: Tag },
  { id: 'guides', label: 'Hướng dẫn', icon: BookMarked },
]

const DURATION_OPTIONS = [
  { key: 'monthly', label: '+1 tháng', days: 30 },
  { key: 'quarterly', label: '+3 tháng', days: 90 },
  { key: 'yearly', label: '+1 năm', days: 365 },
]

// ─── Helper: extract YouTube video ID ────────────────────────────────────────
function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s?/]+)/)
  return match ? match[1] : null
}

// ─── Default form for a new guide ────────────────────────────────────────────
// blocks: [{ type: 'text', content: '' } | { type: 'video', url: '', label: '' }]
const EMPTY_FORM = { id: null, title: '', blocks: [], published: true, order: 0 }

// ─── Block helpers ────────────────────────────────────────────────────────────
function makeTextBlock() { return { type: 'text', content: '', _key: Math.random() } }
function makeVideoBlock() { return { type: 'video', url: '', label: '', _key: Math.random() } }

export default function AdminPage() {
  const { user: adminUser } = useAuth()
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ total: 0, pro: 0, expiringSoon: 0, expired: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [scanResult, setScanResult] = useState(null)

  // ─── Pricing state ──────────────────────────────────────────────────────────
  const [pricingPlans, setPricingPlans] = useState({})
  const [pricingEditing, setPricingEditing] = useState(null)  // planKey being edited
  const [pricingSaving, setPricingSaving] = useState(false)

  // ─── User action modal ──────────────────────────────────────────────────────
  const [userAction, setUserAction] = useState(null)  // { uid, action }
  const [customExpiry, setCustomExpiry] = useState('')

  // ─── Guide state ────────────────────────────────────────────────────────────
  const [guides, setGuides] = useState([])
  const [guideForm, setGuideForm] = useState(null)   // null = closed
  const [guideSaving, setGuideSaving] = useState(false)

  // ─── Pricing CRUD ───────────────────────────────────────────────────────────
  const loadPricing = async () => {
    try {
      const data = await fetchPricing(true)
      setPricingPlans(data.plans || {})
    } catch (err) {
      console.error('Pricing load error:', err)
    }
  }

  const handleInitPricing = async () => {
    try {
      const data = await initDefaultPricing(adminUser?.uid)
      setPricingPlans(data.plans || {})
    } catch (err) {
      alert('Lỗi khởi tạo bảng giá: ' + err.message)
    }
  }

  const handleSavePricing = async () => {
    setPricingSaving(true)
    try {
      await updatePricing(pricingPlans, adminUser?.uid)
      setPricingEditing(null)
    } catch (err) {
      alert('Lỗi lưu giá: ' + err.message)
    }
    setPricingSaving(false)
  }

  // ─── User subscription management ──────────────────────────────────────────
  const handleExtendUser = async (uid, days, label) => {
    if (!confirm(`Gia hạn ${label} cho tài khoản này?`)) return
    setActionLoading(uid)
    try {
      const userRef = doc(db, 'users', uid)
      const userSnap = await getDocs(query(collection(db, 'users')))
      const userData = userSnap.docs.find(d => d.id === uid)?.data() || {}

      const now = new Date()
      let baseDate = now
      if (userData.planExpiry) {
        const exp = userData.planExpiry.toDate ? userData.planExpiry.toDate() : new Date(userData.planExpiry.seconds * 1000)
        if (exp > now) baseDate = exp
      }
      const newExpiry = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)

      await updateDoc(userRef, {
        plan: 'pro',
        planExpiry: newExpiry,
        upgradedAt: serverTimestamp(),
      })
      await loadData()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
    setActionLoading(null)
    setUserAction(null)
  }

  const handleSetCustomExpiry = async (uid) => {
    if (!customExpiry) return alert('Chọn ngày hết hạn.')
    if (!confirm('Đặt hạn sử dụng tùy chỉnh cho tài khoản này?')) return
    setActionLoading(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        plan: 'pro',
        planExpiry: new Date(customExpiry),
        upgradedAt: serverTimestamp(),
      })
      await loadData()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
    setActionLoading(null)
    setUserAction(null)
    setCustomExpiry('')
  }

  const handleDowngradeUser = async (uid) => {
    if (!confirm('Hạ xuống Free? Tài khoản sẽ mất quyền Pro.')) return
    setActionLoading(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        plan: 'free',
        planExpiry: null,
        downgradedAt: serverTimestamp(),
      })
      await loadData()
    } catch (err) {
      alert('Lỗ: ' + err.message)
    }
    setActionLoading(null)
    setUserAction(null)
  }

  // ─── Guide CRUD ─────────────────────────────────────────────────────────────
  const loadGuides = async () => {
    try {
      const q = query(collection(db, 'guides'), orderBy('order', 'asc'))
      const snap = await getDocs(q)
      setGuides(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) {
      console.error('Guide load error:', err)
    }
  }

  const handleSaveGuide = async () => {
    if (!guideForm.title.trim()) return alert('Vui lòng nhập tiêu đề bài viết.')
    setGuideSaving(true)
    try {
      // Strip internal _key before saving
      const cleanBlocks = guideForm.blocks.map(({ _key, ...b }) => b)
      const payload = {
        title: guideForm.title.trim(),
        blocks: cleanBlocks,
        published: guideForm.published,
        order: Number(guideForm.order) || 0,
        updatedAt: serverTimestamp(),
      }
      if (guideForm.id) {
        await updateDoc(doc(db, 'guides', guideForm.id), payload)
      } else {
        await addDoc(collection(db, 'guides'), { ...payload, createdAt: serverTimestamp() })
      }
      await loadGuides()
      setGuideForm(null)
    } catch (err) {
      alert('Lỗi lưu bài: ' + err.message)
    }
    setGuideSaving(false)
  }

  const handleDeleteGuide = async (id, title) => {
    if (!confirm(`Xóa bài "${title}"?`)) return
    try {
      await deleteDoc(doc(db, 'guides', id))
      await loadGuides()
      if (guideForm?.id === id) setGuideForm(null)
    } catch (err) {
      alert('Lỗi xóa: ' + err.message)
    }
  }

  const handleTogglePublish = async (g) => {
    try {
      await updateDoc(doc(db, 'guides', g.id), { published: !g.published, updatedAt: serverTimestamp() })
      await loadGuides()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
  }

  // ─── Block operations ────────────────────────────────────────────────────────
  const addBlock = (type) => {
    const block = type === 'text' ? makeTextBlock() : makeVideoBlock()
    setGuideForm(f => ({ ...f, blocks: [...f.blocks, block] }))
  }

  const updateBlock = (idx, changes) => {
    setGuideForm(f => {
      const blocks = f.blocks.map((b, i) => i === idx ? { ...b, ...changes } : b)
      return { ...f, blocks }
    })
  }

  const removeBlock = (idx) => {
    setGuideForm(f => ({ ...f, blocks: f.blocks.filter((_, i) => i !== idx) }))
  }

  const moveBlock = (idx, dir) => {
    setGuideForm(f => {
      const blocks = [...f.blocks]
      const target = idx + dir
      if (target < 0 || target >= blocks.length) return f
      ;[blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]
      return { ...f, blocks }
    })
  }

  // ─── SePay Auto-Scan ──────────────────────────────────────────────────────
  const handleAutoScan = async () => {
    setActionLoading('scan')
    setScanResult(null)
    try {
      const result = await autoConfirmPayments()
      setScanResult(result)
      if (result.matched > 0) await loadData()
      setTimeout(() => setScanResult(null), 8000)
    } catch (err) {
      setScanResult({ matched: 0, errors: [err.message] })
    }
    setActionLoading(null)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const usersSnap = await getDocs(collection(db, 'users'))
      const usersList = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      setUsers(usersList)

      const ordersList = await getAllOrders()
      setOrders(ordersList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))

      const now = new Date()
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const proCount = usersList.filter(u => u.plan === 'pro').length
      const expiringSoon = usersList.filter(u => {
        if (u.plan !== 'pro' || !u.planExpiry) return false
        const exp = u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry.seconds * 1000)
        return exp > now && exp <= sevenDays
      }).length
      const expired = usersList.filter(u => {
        if (u.plan !== 'pro' || !u.planExpiry) return false
        const exp = u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry.seconds * 1000)
        return exp <= now
      }).length
      setStats({ total: usersList.length, pro: proCount, expiringSoon, expired })
    } catch (err) {
      console.error('Admin load error:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadData(); loadGuides(); loadPricing() }, [])

  // ─── Confirm an order ───────────────────────────────────────────────────────
  const handleConfirm = async (code) => {
    if (!confirm(`Xác nhận thanh toán đơn ${code}? User sẽ được nâng lên Pro.`)) return
    setActionLoading(code)
    try {
      await confirmPayment(code)
      await loadData()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
    setActionLoading(null)
  }

  // ─── Toggle user ban ────────────────────────────────────────────────────────
  const handleToggleBan = async (uid, currentlyBanned) => {
    const action = currentlyBanned ? 'Mở khóa' : 'Khóa'
    if (!confirm(`${action} tài khoản này?`)) return
    setActionLoading(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        banned: !currentlyBanned,
        bannedAt: currentlyBanned ? null : serverTimestamp()
      })
      await loadData()
    } catch (err) {
      alert('Lỗi: ' + err.message)
    }
    setActionLoading(null)
  }

  const formatDate = (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="nd-page" style={{ maxWidth: (tab === 'guides' || tab === 'plans') ? 'none' : 1100, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Shield size={28} style={{ color: 'var(--brand)' }} />
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Admin Dashboard</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Quản lý Users & Giao dịch</p>
        </div>
        <button onClick={handleAutoScan} disabled={actionLoading === 'scan'} style={{
          marginLeft: 'auto', background: '#22c55e', border: 'none',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#fff',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700
        }}>
          {actionLoading === 'scan' ? <Loader size={14} className="spin" /> : <CheckCircle size={14} />}
          Quét SePay
        </button>
        <button onClick={loadData} style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
          borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-main)',
          display: 'flex', alignItems: 'center', gap: 4, fontSize: 12
        }}>
          <RefreshCw size={14} /> Làm mới
        </button>
      </div>

      {/* Scan result */}
      {scanResult && (
        <div style={{
          padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12, fontWeight: 600,
          background: scanResult.matched > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
          color: scanResult.matched > 0 ? '#22c55e' : '#94a3b8',
          border: `1px solid ${scanResult.matched > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(100,116,139,0.3)'}`,
        }}>
          {scanResult.matched > 0
            ? `✅ Đã tìm thấy và xác nhận ${scanResult.matched} giao dịch!`
            : '📭 Không tìm thấy giao dịch mới nào khớp.'}
          {scanResult.errors?.length > 0 && <div style={{ color: '#ef4444', marginTop: 4 }}>{scanResult.errors.join(', ')}</div>}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: tab === id ? 'var(--brand)' : 'var(--bg-elevated)',
            color: tab === id ? '#fff' : 'var(--text-muted)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader size={32} className="spin" style={{ color: 'var(--brand)' }} />
        </div>
      ) : (
        <>
          {/* ═══ Overview ═══ */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <StatCard label="Tổng Users" value={stats.total} icon="👤" color="#3b82f6" />
              <StatCard label="Users Pro" value={stats.pro} icon="💎" color="#f59e0b" />
              <StatCard label="Sắp hết hạn" value={stats.expiringSoon} icon="⏳" color="#f97316" />
              <StatCard label="Đã hết hạn" value={stats.expired} icon="🚫" color="#ef4444" />
            </div>
          )}

          {/* ═══ Users ═══ */}
          {tab === 'users' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={th}>Email</th>
                    <th style={th}>Tên</th>
                    <th style={th}>Gói</th>
                    <th style={th}>Hạn sử dụng</th>
                    <th style={th}>Ngày ĐK</th>
                    <th style={th}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const expiryDate = u.planExpiry
                      ? (u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry.seconds * 1000))
                      : null
                    const isExp = expiryDate && expiryDate <= new Date()
                    const showingAction = userAction?.uid === u.id

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: u.banned ? 0.4 : 1 }}>
                        <td style={td}>{u.email}</td>
                        <td style={td}>{u.name || '—'}</td>
                        <td style={td}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: u.role === 'admin' ? 'rgba(168,85,247,0.2)' :
                              u.plan === 'pro' ? (isExp ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.2)') : 'rgba(100,116,139,0.2)',
                            color: u.role === 'admin' ? '#a855f7' :
                              u.plan === 'pro' ? (isExp ? '#ef4444' : '#f59e0b') : '#94a3b8',
                          }}>
                            {u.role === 'admin' ? '👑 Admin' : u.plan === 'pro' ? (isExp ? '⚠️ Hết hạn' : '💎 Pro') : '🆓 Free'}
                          </span>
                        </td>
                        <td style={td}>
                          {u.plan === 'pro' && expiryDate
                            ? <span style={{ color: isExp ? '#ef4444' : 'var(--text-main)', fontWeight: isExp ? 700 : 400 }}>
                                {expiryDate.toLocaleDateString('vi-VN')}
                              </span>
                            : u.plan === 'pro' ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Vĩnh viễn</span> : '—'
                          }
                        </td>
                        <td style={td}>{formatDate(u.createdAt)}</td>
                        <td style={td}>
                          {u.role !== 'admin' && (
                            <div style={{ position: 'relative' }}>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button
                                  onClick={() => setUserAction(showingAction ? null : { uid: u.id })}
                                  style={{ ...actionBtn, background: 'var(--brand)' }}
                                  disabled={actionLoading === u.id}
                                >
                                  {actionLoading === u.id
                                    ? <Loader size={10} className="spin" />
                                    : <CalendarPlus size={10} />}
                                  Quản lý
                                  <ChevronDown size={9} />
                                </button>
                                <button onClick={() => handleToggleBan(u.id, u.banned)}
                                  disabled={actionLoading === u.id}
                                  style={{ ...actionBtn, background: u.banned ? '#22c55e' : '#ef4444' }}>
                                  {u.banned ? 'Mở' : 'Khóa'}
                                </button>
                              </div>
                              {showingAction && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 20,
                                  background: 'var(--bg-card)', borderRadius: 10, padding: 10,
                                  border: '1px solid var(--border-color)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                  minWidth: 200
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>GIA HẠN</div>
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                    {DURATION_OPTIONS.map(opt => (
                                      <button key={opt.key}
                                        onClick={() => handleExtendUser(u.id, opt.days, opt.label)}
                                        style={{ ...actionBtn, background: '#22c55e', padding: '4px 8px' }}>
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>ĐẶT NGÀY</div>
                                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                    <input type="date" value={customExpiry}
                                      onChange={e => setCustomExpiry(e.target.value)}
                                      style={{ ...inputStyle, flex: 1, padding: '3px 6px', fontSize: 11 }} />
                                    <button onClick={() => handleSetCustomExpiry(u.id)}
                                      style={{ ...actionBtn, background: '#3b82f6' }}>OK</button>
                                  </div>
                                  {u.plan === 'pro' && (
                                    <>
                                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 6 }}>
                                        <button onClick={() => handleDowngradeUser(u.id)}
                                          style={{ ...actionBtn, background: '#ef4444', width: '100%', justifyContent: 'center' }}>
                                          Hạ xuống Free
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ Plans (Gói dịch vụ) ═══ */}
          {tab === 'plans' && (
            <div>
              {Object.keys(pricingPlans).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Chưa có bảng giá</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Nhấn nút dưới để khởi tạo bảng giá mặc định.</div>
                  <button onClick={handleInitPricing} style={{
                    padding: '10px 24px', borderRadius: 10, border: 'none',
                    background: 'var(--brand)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer'
                  }}>Khởi tạo bảng giá</button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
                    {PLAN_KEYS.map(key => {
                      const plan = pricingPlans[key]
                      if (!plan) return null
                      const isEditing = pricingEditing === key
                      return (
                        <div key={key} style={{
                          background: 'var(--bg-card)', borderRadius: 16, padding: 20,
                          border: isEditing ? '2px solid var(--brand)' : '1px solid var(--border-color)',
                          transition: 'border 0.2s'
                        }}>
                          <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 8 }}>{PLAN_ICONS[key]}</div>
                          {isEditing ? (
                            <>
                              <div style={{ marginBottom: 8 }}>
                                <label style={labelStyle}>Tên gói</label>
                                <input value={plan.label}
                                  onChange={e => setPricingPlans(p => ({ ...p, [key]: { ...p[key], label: e.target.value } }))}
                                  style={inputStyle} />
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <label style={labelStyle}>Giá (VNĐ)</label>
                                <input type="text" inputMode="numeric" value={plan.price === 0 && pricingEditing === key ? '' : plan.price}
                                  onChange={e => {
                                    const val = e.target.value.replace(/[^0-9]/g, '')
                                    setPricingPlans(p => ({ ...p, [key]: { ...p[key], price: val === '' ? 0 : Number(val) } }))
                                  }}
                                  onFocus={e => { if (plan.price === 0) e.target.value = '' }}
                                  placeholder="Nhập giá VNĐ..."
                                  style={inputStyle} />
                              </div>
                              <div style={{ marginBottom: 8 }}>
                                <label style={labelStyle}>Mô tả</label>
                                <input value={plan.description || ''}
                                  onChange={e => setPricingPlans(p => ({ ...p, [key]: { ...p[key], description: e.target.value } }))}
                                  style={inputStyle} />
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>
                                Thời hạn: {plan.durationDays} ngày
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{plan.label}</div>
                              <div style={{ textAlign: 'center', fontSize: 28, fontWeight: 900, color: 'var(--brand)', marginBottom: 4 }}>
                                {plan.price > 0 ? `${plan.price.toLocaleString('vi-VN')}đ` : 'Chưa đặt giá'}
                              </div>
                              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                {plan.description || `${plan.durationDays} ngày`}
                              </div>
                            </>
                          )}
                          <button
                            onClick={() => setPricingEditing(isEditing ? null : key)}
                            style={{
                              width: '100%', padding: '7px 0', borderRadius: 8, border: 'none',
                              background: isEditing ? 'var(--bg-elevated)' : 'var(--brand)',
                              color: isEditing ? 'var(--text-muted)' : '#fff',
                              fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                            }}>
                            {isEditing ? <><X size={12} /> Đóng</> : <><Edit3 size={12} /> Chỉnh sửa</>}
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Save button */}
                  {pricingEditing && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={handleSavePricing} disabled={pricingSaving} style={{
                        padding: '10px 32px', borderRadius: 10, border: 'none',
                        background: 'var(--brand)', color: '#fff', fontSize: 14, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                      }}>
                        {pricingSaving ? <Loader size={14} className="spin" /> : <Save size={14} />}
                        Lưu bảng giá
                      </button>
                    </div>
                  )}

                  {/* Bank info (read-only) */}
                  <div style={{
                    marginTop: 24, background: 'var(--bg-card)', borderRadius: 12, padding: 16,
                    border: '1px solid var(--border-color)', maxWidth: 400
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                      Thông tin ngân hàng (QR code)
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 2 }}>
                      <div>Ngân hàng: <strong>VietinBank</strong></div>
                      <div>Số TK: <strong>60048899</strong></div>
                      <div>Chủ TK: <strong>NGUYỄN VĂN HIẾU</strong></div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══ Guides ═══ */}
          {tab === 'guides' && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {/* List */}
              <div style={{ width: 280, flexShrink: 0 }}>
                <button
                  onClick={() => setGuideForm({ ...EMPTY_FORM, order: guides.length })}
                  style={{
                    width: '100%', padding: '8px 14px', marginBottom: 12,
                    background: 'var(--brand)', color: '#fff', border: 'none',
                    borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                  }}>
                  <Plus size={14} /> Thêm bài mới
                </button>
                {guides.length === 0 && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 24 }}>
                    Chưa có bài nào
                  </div>
                )}
                {guides.map(g => (
                  <div key={g.id} style={{
                    padding: '10px 12px', marginBottom: 6,
                    background: guideForm?.id === g.id ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    borderRadius: 10, border: '1px solid var(--border-color)',
                    borderLeft: guideForm?.id === g.id ? '3px solid var(--brand)' : '1px solid var(--border-color)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{g.title}</div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() => handleTogglePublish(g)}
                          title={g.published ? 'Ẩn bài' : 'Hiện bài'}
                          style={{ ...iconBtn, color: g.published ? '#22c55e' : '#94a3b8' }}>
                          {g.published ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button
                          onClick={() => setGuideForm({ ...g, blocks: (g.blocks || []).map(b => ({ ...b, _key: Math.random() })) })}
                          title="Chỉnh sửa"
                          style={{ ...iconBtn, color: 'var(--brand)' }}>
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteGuide(g.id, g.title)}
                          title="Xóa"
                          style={{ ...iconBtn, color: '#ef4444' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {g.published ? '🟢 Đang hiển thị' : '⚫ Đã ẩn'} · Thứ tự: {g.order}
                      {g.videos?.length > 0 && ` · ${g.videos.length} video`}
                    </div>
                  </div>
                ))}
              </div>

              {/* Editor + Preview */}
              {guideForm ? (
                <div style={{ flex: 1, display: 'flex', gap: 16, minWidth: 0 }}>

                  {/* ── Editor panel ── */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    background: 'var(--bg-card)', borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                  }}>
                    {/* Editor header */}
                    <div style={{
                      padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
                    }}>
                      <Edit3 size={15} style={{ color: 'var(--brand)' }} />
                      <span style={{ fontWeight: 800, fontSize: 14 }}>
                        {guideForm.id ? 'Chỉnh sửa bài' : 'Bài mới'}
                      </span>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        {/* Published toggle */}
                        <button
                          onClick={() => setGuideForm(f => ({ ...f, published: !f.published }))}
                          style={{
                            padding: '4px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700,
                            background: guideForm.published ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
                            color: guideForm.published ? '#22c55e' : '#94a3b8',
                            outline: `1.5px solid ${guideForm.published ? '#22c55e' : '#64748b'}`
                          }}>
                          {guideForm.published ? '🟢 Hiển thị' : '⚫ Ẩn'}
                        </button>
                        <button onClick={() => setGuideForm(null)} style={{ ...iconBtn, color: 'var(--text-muted)' }}>
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Editor body — scrollable */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {/* Title */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={labelStyle}>Tiêu đề bài viết *</label>
                        <input
                          value={guideForm.title}
                          onChange={e => setGuideForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="VD: Hướng dẫn dùng tính năng Thiết kế mới"
                          style={{ ...inputStyle, fontSize: 15, fontWeight: 700 }}
                        />
                      </div>

                      {/* Blocks */}
                      <label style={labelStyle}>Nội dung bài ({guideForm.blocks.length} khối)</label>

                      {guideForm.blocks.length === 0 && (
                        <div style={{
                          padding: '20px', marginBottom: 12,
                          background: 'rgba(var(--brand-rgb, 255,107,53), 0.05)',
                          border: '1.5px dashed var(--border-color)',
                          borderRadius: 10, textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                            Bài viết chưa có nội dung
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                            Nhấn nút bên dưới để thêm đoạn văn bản hoặc video YouTube.<br />
                            Bạn có thể xen kẽ văn bản và video theo thứ tự tùy ý.
                          </div>
                        </div>
                      )}

                      {guideForm.blocks.map((block, idx) => (
                        <div key={block._key || idx} style={{
                          marginBottom: 10, borderRadius: 10,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-elevated)', overflow: 'hidden'
                        }}>
                          {/* Block header bar */}
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 10px',
                            background: block.type === 'text'
                              ? 'rgba(59,130,246,0.08)'
                              : 'rgba(239,68,68,0.08)',
                            borderBottom: '1px solid var(--border-color)'
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                              letterSpacing: 0.8,
                              color: block.type === 'text' ? '#3b82f6' : '#ef4444'
                            }}>
                              {block.type === 'text' ? '📝 Văn bản' : '🎬 Video YouTube'}
                            </span>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                              <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0}
                                style={{ ...iconBtn, opacity: idx === 0 ? 0.3 : 1, fontSize: 11 }}
                                title="Lên trên">▲</button>
                              <button onClick={() => moveBlock(idx, 1)} disabled={idx === guideForm.blocks.length - 1}
                                style={{ ...iconBtn, opacity: idx === guideForm.blocks.length - 1 ? 0.3 : 1, fontSize: 11 }}
                                title="Xuống dưới">▼</button>
                              <button onClick={() => removeBlock(idx)}
                                style={{ ...iconBtn, color: '#ef4444' }} title="Xóa khối này">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Block content */}
                          <div style={{ padding: '10px' }}>
                            {block.type === 'text' && (
                              <textarea
                                value={block.content}
                                onChange={e => updateBlock(idx, { content: e.target.value })}
                                placeholder="Viết nội dung hướng dẫn tại đây...&#10;&#10;Gõ Enter để xuống dòng bình thường.&#10;Bạn có thể viết nhiều đoạn, dùng ký hiệu như:&#10;• Gạch đầu dòng&#10;① ② ③ Các bước tuần tự"
                                rows={5}
                                style={{
                                  ...inputStyle, resize: 'vertical',
                                  fontFamily: 'inherit', lineHeight: 1.75,
                                  border: 'none', background: 'transparent',
                                  padding: 0
                                }}
                              />
                            )}
                            {block.type === 'video' && (
                              <div>
                                <div style={{ marginBottom: 8 }}>
                                  <label style={{ ...labelStyle, marginBottom: 3 }}>Link YouTube</label>
                                  <input
                                    value={block.url}
                                    onChange={e => updateBlock(idx, { url: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                                    style={inputStyle}
                                  />
                                </div>
                                <div style={{ marginBottom: 8 }}>
                                  <label style={{ ...labelStyle, marginBottom: 3 }}>Tiêu đề video (tùy chọn)</label>
                                  <input
                                    value={block.label}
                                    onChange={e => updateBlock(idx, { label: e.target.value })}
                                    placeholder="VD: Video demo tính năng Thiết kế mới"
                                    style={inputStyle}
                                  />
                                </div>
                                {getYouTubeId(block.url) && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                                    <img
                                      src={`https://img.youtube.com/vi/${getYouTubeId(block.url)}/mqdefault.jpg`}
                                      alt="thumbnail"
                                      style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 6 }}
                                    />
                                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>
                                      ✅ URL hợp lệ — video sẽ hiển thị trong bài
                                    </span>
                                  </div>
                                )}
                                {block.url && !getYouTubeId(block.url) && (
                                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                                    ⚠️ URL không nhận ra — hãy dùng link youtube.com/watch?v= hoặc youtu.be/
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add block buttons */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button onClick={() => addBlock('text')} style={{
                          flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(59,130,246,0.08)', color: '#3b82f6',
                          border: '1.5px dashed #3b82f6', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                        }}>
                          <Plus size={13} /> Thêm đoạn văn bản
                        </button>
                        <button onClick={() => addBlock('video')} style={{
                          flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                          border: '1.5px dashed #ef4444', fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                        }}>
                          <PlayCircle size={13} /> Thêm video YouTube
                        </button>
                      </div>
                    </div>

                    {/* Editor footer */}
                    <div style={{
                      padding: '12px 16px', borderTop: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ ...labelStyle, margin: 0 }}>Thứ tự:</label>
                        <input
                          type="number" value={guideForm.order}
                          onChange={e => setGuideForm(f => ({ ...f, order: e.target.value }))}
                          style={{ ...inputStyle, width: 60, padding: '4px 8px' }}
                        />
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <button onClick={() => setGuideForm(null)} style={{
                          padding: '7px 16px', borderRadius: 8,
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 600
                        }}>Hủy</button>
                        <button onClick={handleSaveGuide} disabled={guideSaving} style={{
                          padding: '7px 20px', borderRadius: 8, border: 'none',
                          background: 'var(--brand)', color: '#fff',
                          cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          {guideSaving ? <Loader size={13} className="spin" /> : <CheckCircle size={13} />}
                          Lưu bài
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Preview panel ── */}
                  <div style={{
                    flex: 1, minWidth: 0,
                    background: 'var(--bg-card)', borderRadius: 12,
                    border: '1px solid var(--border-color)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
                    }}>
                      <Eye size={15} style={{ color: '#22c55e' }} />
                      <span style={{ fontWeight: 800, fontSize: 14 }}>Preview — Người dùng sẽ thấy</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                      {!guideForm.title && !guideForm.blocks.length ? (
                        <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                          Bắt đầu viết để xem preview...
                        </div>
                      ) : (
                        <article>
                          <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 900, lineHeight: 1.35, color: 'var(--text-main)' }}>
                            {guideForm.title || '(Chưa có tiêu đề)'}
                          </h2>
                          {guideForm.blocks.map((block, i) => {
                            if (block.type === 'text') {
                              return (
                                <div key={i} style={{
                                  fontSize: 14, lineHeight: 1.8, color: 'var(--text-main)',
                                  whiteSpace: 'pre-wrap', marginBottom: 20
                                }}>
                                  {block.content || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(Đoạn văn trống)</span>}
                                </div>
                              )
                            }
                            if (block.type === 'video') {
                              const vid = getYouTubeId(block.url)
                              return (
                                <div key={i} style={{ marginBottom: 20 }}>
                                  {block.label && (
                                    <div style={{
                                      fontSize: 13, fontWeight: 700, marginBottom: 8,
                                      display: 'flex', alignItems: 'center', gap: 5,
                                      color: 'var(--text-main)'
                                    }}>
                                      <PlayCircle size={14} style={{ color: '#ef4444' }} />
                                      {block.label}
                                    </div>
                                  )}
                                  {vid ? (
                                    <div style={{
                                      position: 'relative', paddingBottom: '56.25%', height: 0,
                                      borderRadius: 10, overflow: 'hidden',
                                      border: '1px solid var(--border-color)'
                                    }}>
                                      <iframe
                                        src={`https://www.youtube.com/embed/${vid}`}
                                        title={block.label || `Video ${i + 1}`}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                      />
                                    </div>
                                  ) : (
                                    <div style={{
                                      padding: '16px', borderRadius: 10, textAlign: 'center',
                                      background: 'rgba(239,68,68,0.08)', border: '1px dashed #ef4444',
                                      color: '#ef4444', fontSize: 12
                                    }}>
                                      🎬 Chưa có URL video hợp lệ
                                    </div>
                                  )}
                                </div>
                              )
                            }
                            return null
                          })}
                        </article>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty state */
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-card)', borderRadius: 12,
                  border: '1px dashed var(--border-color)', minHeight: 300, gap: 12
                }}>
                  <div style={{ fontSize: 48 }}>📚</div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>Bài hướng dẫn sử dụng</div>
                  <div style={{
                    fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
                    lineHeight: 1.7, maxWidth: 380
                  }}>
                    Viết bài hướng dẫn để giúp người dùng hiểu cách dùng từng tính năng.<br />
                    Mỗi bài có thể kết hợp <strong>văn bản</strong> và <strong>video YouTube</strong> xen kẽ nhau.
                  </div>
                  <button
                    onClick={() => setGuideForm({ ...EMPTY_FORM, order: guides.length })}
                    style={{
                      marginTop: 8, padding: '10px 24px',
                      background: 'var(--brand)', color: '#fff',
                      border: 'none', borderRadius: 10,
                      cursor: 'pointer', fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 8
                    }}>
                    <Plus size={16} /> Viết bài hướng dẫn đầu tiên
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══ Orders ═══ */}
          {tab === 'orders' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={th}>Mã GD</th>
                    <th style={th}>Email</th>
                    <th style={th}>Gói</th>
                    <th style={th}>Số tiền</th>
                    <th style={th}>Trạng thái</th>
                    <th style={th}>Ngày tạo</th>
                    <th style={th}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch nào</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{o.code}</td>
                      <td style={td}>{o.email}</td>
                      <td style={td}>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600 }}>
                          {o.durationLabel || o.duration || '—'}
                        </span>
                      </td>
                      <td style={td}>{(o.amount || 0).toLocaleString('vi-VN')}đ</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: o.status === 'confirmed' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)',
                          color: o.status === 'confirmed' ? '#22c55e' : '#f59e0b'
                        }}>
                          {o.status === 'confirmed' ? '✅ Đã xác nhận' : '⏳ Chờ xử lý'}
                        </span>
                      </td>
                      <td style={td}>{formatDate(o.createdAt)}</td>
                      <td style={td}>
                        {o.status === 'pending' && (
                          <button onClick={() => handleConfirm(o.code)} disabled={actionLoading === o.code}
                            style={{ ...actionBtn, background: '#22c55e' }}>
                            {actionLoading === o.code ? <Loader size={10} className="spin" /> : <CheckCircle size={10} />} Xác nhận
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 16, padding: 20,
      border: '1px solid var(--border-color)', textAlign: 'center'
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  )
}

const th = { padding: '10px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }
const td = { padding: '10px 8px', whiteSpace: 'nowrap' }
const actionBtn = {
  color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px',
  cursor: 'pointer', fontSize: 10, fontWeight: 700,
  display: 'inline-flex', alignItems: 'center', gap: 3
}
const iconBtn = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center'
}
const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8, fontSize: 13,
  background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
  color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box'
}
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }
