/**
 * AdminPage.jsx
 * Admin Dashboard — User management, order confirmation, stats
 */
import { useState, useEffect } from 'react'
import { Users, CreditCard, BarChart3, CheckCircle, XCircle, Loader, RefreshCw, Shield, Crown } from 'lucide-react'
import { collection, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { db } from '../services/firebaseConfig'
import { confirmPayment, getAllOrders, getProUserCount, getRemainingSlots } from '../services/paymentService'
import { autoConfirmPayments } from '../services/sepayService'

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'orders', label: 'Giao dịch', icon: CreditCard },
]

export default function AdminPage() {
  const [tab, setTab] = useState('overview')
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({ total: 0, pro: 0, slots: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [scanResult, setScanResult] = useState(null)

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

      const proCount = usersList.filter(u => u.plan === 'pro').length
      const remaining = await getRemainingSlots()
      setStats({ total: usersList.length, pro: proCount, slots: remaining })
    } catch (err) {
      console.error('Admin load error:', err)
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

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

  // ─── Manual upgrade ─────────────────────────────────────────────────────────
  const handleManualUpgrade = async (uid) => {
    if (!confirm('Nâng cấp tài khoản này lên Pro (thủ công)?')) return
    setActionLoading(uid)
    try {
      await updateDoc(doc(db, 'users', uid), {
        plan: 'pro', planExpiry: null, upgradedAt: serverTimestamp()
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
    <div className="nd-page" style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <StatCard label="Tổng Users" value={stats.total} icon="👤" color="#3b82f6" />
              <StatCard label="Users Pro" value={stats.pro} icon="💎" color="#f59e0b" />
              <StatCard label="Suất còn lại" value={`${stats.slots}/20`} icon="🎟️" color="#22c55e" />
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
                    <th style={th}>Ngày ĐK</th>
                    <th style={th}>Lần cuối</th>
                    <th style={th}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', opacity: u.banned ? 0.4 : 1 }}>
                      <td style={td}>{u.email}</td>
                      <td style={td}>{u.name || '—'}</td>
                      <td style={td}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: u.role === 'admin' ? 'rgba(168,85,247,0.2)' :
                            u.plan === 'pro' ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
                          color: u.role === 'admin' ? '#a855f7' :
                            u.plan === 'pro' ? '#f59e0b' : '#94a3b8',
                        }}>
                          {u.role === 'admin' ? '👑 Admin' : u.plan === 'pro' ? '💎 Pro' : '🆓 Free'}
                        </span>
                      </td>
                      <td style={td}>{formatDate(u.createdAt)}</td>
                      <td style={td}>{formatDate(u.lastLogin)}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {u.plan !== 'pro' && u.role !== 'admin' && (
                            <button onClick={() => handleManualUpgrade(u.id)} disabled={actionLoading === u.id}
                              style={{ ...actionBtn, background: '#f59e0b' }}>
                              {actionLoading === u.id ? <Loader size={10} className="spin" /> : <Crown size={10} />} Pro
                            </button>
                          )}
                          {u.role !== 'admin' && (
                            <button onClick={() => handleToggleBan(u.id, u.banned)} disabled={actionLoading === u.id}
                              style={{ ...actionBtn, background: u.banned ? '#22c55e' : '#ef4444' }}>
                              {u.banned ? 'Mở' : 'Khóa'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <th style={th}>Số tiền</th>
                    <th style={th}>Trạng thái</th>
                    <th style={th}>Ngày tạo</th>
                    <th style={th}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có giao dịch nào</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{o.code}</td>
                      <td style={td}>{o.email}</td>
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
