import { useState } from 'react'
import {
  Users, BarChart2, Settings, AlertTriangle, Plus, Trash2, Shield, Zap
} from 'lucide-react'

const USERS_DATA = [
  { id: 1, name: 'Nguyễn Thị Lan', email: 'lan.nguyen@email.com', role: 'Admin', plan: 'Pro', generated: 234, status: 'active' },
  { id: 2, name: 'Trần Minh Khoa', email: 'khoa.tran@email.com', role: 'User',  plan: 'Basic', generated: 89,  status: 'active' },
  { id: 3, name: 'Phạm Thu Hà',   email: 'ha.pham@email.com',   role: 'User',  plan: 'Pro', generated: 412, status: 'active' },
  { id: 4, name: 'Lê Quang Đức',  email: 'duc.le@email.com',    role: 'User',  plan: 'Free', generated: 12,  status: 'suspended' },
  { id: 5, name: 'Vũ Thị Mai',    email: 'mai.vu@email.com',    role: 'User',  plan: 'Basic', generated: 67,  status: 'active' },
]

const STATS = [
  { label: 'Tổng người dùng', value: '1,234', icon: Users,    color: '#3b82f6' },
  { label: 'Ảnh tạo hôm nay', value: '4,821', icon: Zap,      color: '#f37021' },
  { label: 'Doanh thu tháng',  value: '12.4M', icon: BarChart2, color: '#10b981' },
  { label: 'Lỗi hệ thống',    value: '3',      icon: AlertTriangle, color: '#ef4444' },
]

const API_PROVIDERS = [
  { name: 'OpenAI GPT-4o',      model: 'Vision + Generation',  status: 'active',   latency: '1.2s'  },
  { name: 'Runway ML',          model: 'Gen-3 Alpha Turbo',     status: 'active',   latency: '8.4s'  },
  { name: 'Replicate',          model: 'SDXL / Flux',           status: 'active',   latency: '5.1s'  },
  { name: 'Remove.bg',          model: 'Background Removal',    status: 'inactive', latency: '—'     },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [users, setUsers] = useState(USERS_DATA)

  const roleBadge = (role) =>
    role === 'Admin' ? 'badge badge-brand' : 'badge badge-gray'
  const statusBadge = (s) =>
    s === 'active' ? 'badge badge-success' : 'badge badge-danger'
  const planBadge = (plan) =>
    plan === 'Pro' ? 'badge badge-brand' : plan === 'Free' ? 'badge badge-gray' : 'badge badge-secondary'

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
        <Shield size={22} style={{ color: 'var(--brand)' }} />
        <h1 className="page-title" style={{ marginBottom: 0 }}>Bảng quản trị</h1>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        {[
          { id: 'overview', label: 'Tổng quan' },
          { id: 'users',    label: 'Người dùng' },
          { id: 'api',      label: 'API & Providers' },
          { id: 'config',   label: 'Cấu hình' },
        ].map(t => (
          <button
            key={t.id}
            className={`admin-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>
          <div className="stats-grid">
            {STATS.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-card-icon-wrap" style={{ background: color + '18', color }}>
                  <Icon />
                </div>
                <div className="stat-card-value">{value}</div>
                <div className="stat-card-label">{label}</div>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: 28, marginBottom: 14 }}>
            <BarChart2 />
            Hoạt động 7 ngày qua
          </div>
          <div className="admin-chart-placeholder">
            {Array.from({ length: 7 }, (_, i) => {
              const h = [40, 65, 55, 80, 70, 90, 75][i]
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                  <div style={{ position: 'relative', width: '100%', height: 100, display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%', height: `${h}%`,
                      background: 'linear-gradient(to top, var(--brand), var(--brand-light))',
                      borderRadius: '4px 4px 0 0', opacity: 0.9
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    T{i + 2}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
            <button className="btn btn-primary">
              <Plus size={14} />
              Thêm người dùng
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Gói</th>
                  <th>Ảnh đã tạo</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{u.email}</div>
                    </td>
                    <td><span className={roleBadge(u.role)}>{u.role}</span></td>
                    <td><span className={planBadge(u.plan)}>{u.plan}</span></td>
                    <td style={{ fontWeight: 600 }}>{u.generated.toLocaleString()}</td>
                    <td><span className={statusBadge(u.status)}>{u.status === 'active' ? 'Hoạt động' : 'Tạm khóa'}</span></td>
                    <td>
                      <button
                        onClick={() => setUsers(us => us.filter(x => x.id !== u.id))}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', padding: 4
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API */}
      {activeTab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {API_PROVIDERS.map(p => (
            <div key={p.name} className="api-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: p.status === 'active' ? '#10b981' : '#7c8fa6',
                  flexShrink: 0
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.model}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Latency: <strong>{p.latency}</strong></span>
                <span className={p.status === 'active' ? 'badge badge-success' : 'badge badge-gray'}>
                  {p.status === 'active' ? 'Online' : 'Offline'}
                </span>
                <button className="btn btn-secondary" style={{ padding: '0 12px', height: 30, fontSize: 12 }}>
                  <Settings size={12} />
                  Cấu hình
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Config */}
      {activeTab === 'config' && (
        <div className="config-grid">
          {[
            { key: 'Watermark', value: 'Bật', type: 'toggle' },
            { key: 'Max ảnh/ngày (Free)', value: '5', type: 'number' },
            { key: 'Max ảnh/ngày (Basic)', value: '50', type: 'number' },
            { key: 'Max ảnh/ngày (Pro)', value: 'Không giới hạn', type: 'text' },
            { key: 'Kiểm duyệt nội dung', value: 'Bật', type: 'toggle' },
            { key: 'Lưu ảnh gốc', value: 'Tắt', type: 'toggle' },
          ].map(cfg => (
            <div key={cfg.key} className="config-row">
              <div style={{ fontWeight: 500, fontSize: 13.5 }}>{cfg.key}</div>
              <div style={{
                fontSize: 13, color: 'var(--text-muted)',
                background: 'var(--bg-page)', padding: '6px 14px',
                borderRadius: 'var(--r-full)', cursor: 'pointer',
                border: '1.5px solid var(--border)'
              }}>
                {cfg.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
