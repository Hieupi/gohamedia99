/**
 * PricingPage.jsx
 * Landing page bảng giá — Pro & Luxury design
 * Route: /pricing (trong AppLayout, cần login)
 */
import { useState, useEffect } from 'react'
import {
  Sparkles, Check, X as XIcon, Crown, Zap, Shield, Clock,
  Star, ChevronRight, Phone, MessageCircle
} from 'lucide-react'
import { fetchPricing, PLAN_KEYS, PLAN_ICONS } from '../services/pricingService'
import useSubscription from '../hooks/useSubscription'
import UpgradePrompt from '../components/UpgradePrompt'

/* ── Social SVG Icons ──────────────────────────────── */
const ZaloIcon = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" fill="currentColor">
    <path d="M24 4C12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20S35.046 4 24 4zm7.477 29.842h-2.4c-.8 0-1.2-.4-1.6-1.2l-3.2-6 .8 7.2h-2.4l-1.2-10.8h2.8l3.6 6.8-.4-6.8h2.4l1.6 10.8zm-12-10.8h5.6v2h-3.2v2h2.8v2h-2.8v2.8h3.2v2h-5.6v-10.8zm-3.6 0h2.4v10.8h-2.4v-10.8zm-5.2 0h2.4l2 7.2 .4-7.2h2l-1.2 10.8h-2.4l-2-7.2-.4 7.2h-2l1.2-10.8z" />
  </svg>
)
const FbIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

/* ── Data ────────────────────────────────────────────── */
const PLAN_BADGES = {
  monthly: null,
  quarterly: 'PHỔ BIẾN',
  yearly: 'TIẾT KIỆM NHẤT',
}

const FEATURES_TABLE = [
  { name: 'Tách đồ áo', free: true, pro: true },
  { name: 'Tách sản phẩm', free: false, pro: true },
  { name: 'Kho Prompt & Trợ lý viết câu lệnh', free: false, pro: true },
  { name: 'Thư viện ảnh cá nhân', free: false, pro: true },
  { name: 'Hướng dẫn & tài liệu', free: false, pro: true },
  { name: 'Thiết kế mới (10-shot AI)', free: false, pro: true },
  { name: 'Storytelling (9 cảnh)', free: false, pro: true },
  { name: 'KOL Review Bán Hàng', free: false, pro: true },
  { name: 'Video Prompt điện ảnh', free: false, pro: true },
  { name: 'Hỗ trợ ưu tiên 24/7', free: false, pro: true },
]

const TRUST_ITEMS = [
  { icon: <Zap size={18} />, title: 'Kích hoạt 1–5 phút', desc: 'Tự động sau khi chuyển khoản thành công qua SePay' },
  { icon: <Shield size={18} />, title: 'Thanh toán an toàn', desc: 'VietinBank QR — không qua trung gian, chuyển thẳng' },
  { icon: <Clock size={18} />, title: 'Hỗ trợ 24/7', desc: 'Admin phản hồi qua Zalo, Facebook, điện thoại' },
  { icon: <Star size={18} />, title: 'Cộng dồn thời gian', desc: 'Gia hạn lúc nào cũng được, thời gian cộng thêm vào cuối' },
]

const SOCIAL_CONTACTS = [
  {
    label: 'Zalo Group',
    url: 'https://zalo.me/g/jcons43eyjbf2rw1tlkr',
    icon: <ZaloIcon />,
    color: '#0088ff',
    bg: 'rgba(0,136,255,0.08)',
    border: 'rgba(0,136,255,0.22)',
  },
  {
    label: 'Facebook',
    url: 'https://www.facebook.com/hieudsp/',
    icon: <FbIcon />,
    color: '#1877f2',
    bg: 'rgba(24,119,242,0.08)',
    border: 'rgba(24,119,242,0.22)',
  },
  {
    label: '0981.228.229',
    url: 'tel:0981228229',
    icon: <Phone size={14} />,
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.22)',
  },
]

/* ── Main Component ──────────────────────────────────── */
export default function PricingPage() {
  const [plans, setPlans] = useState({})
  const [loading, setLoading] = useState(true)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [selectedInitialPlan, setSelectedInitialPlan] = useState('quarterly')
  const { isPro, isAdmin, daysRemaining } = useSubscription()

  useEffect(() => {
    fetchPricing().then(data => {
      const loaded = data.plans || {}
      setPlans(loaded)
      // default to first plan with price
      const first = PLAN_KEYS.find(k => loaded[k]?.price > 0) || 'monthly'
      setSelectedInitialPlan(first)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const monthlyPrice = plans.monthly?.price || 0

  const handleUpgradeClick = (planKey) => {
    setSelectedInitialPlan(planKey)
    setShowUpgrade(true)
  }

  /* ── styles ── */
  const pageBg = {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0a0616 0%, #0f0a1e 40%, #060d1a 100%)',
    color: '#fff',
    padding: '0 0 80px',
  }

  if (loading) {
    return (
      <div style={{ ...pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            border: '3px solid rgba(245,158,11,0.2)', borderTopColor: '#f59e0b',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>Đang tải bảng giá...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageBg}>

      {/* ── HERO ───────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: '60px 20px 56px', textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Glow blobs */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 500, height: 280,
          background: 'radial-gradient(ellipse, rgba(245,158,11,0.1) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute', bottom: -40, right: '10%',
          width: 220, height: 220,
          background: 'radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(245,158,11,0.1)', color: '#f59e0b',
            padding: '5px 16px', borderRadius: 20, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.08em', marginBottom: 20,
            border: '1px solid rgba(245,158,11,0.2)',
            boxShadow: '0 0 20px rgba(245,158,11,0.08)'
          }}>
            <Crown size={12} /> GÓI PRO — FASHION STUDIO AI
          </div>

          {/* Title */}
          <h1 style={{
            margin: '0 0 16px', fontSize: 'clamp(28px, 5vw, 42px)',
            fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em'
          }}>
            Mở khóa{' '}
            <span style={{
              background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              sức mạnh AI
            </span>{' '}
            đầy đủ
          </h1>

          <p style={{
            margin: '0 auto 28px', fontSize: 16, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.7, maxWidth: 500
          }}>
            Công cụ thiết kế thời trang AI mạnh nhất Việt Nam.
            Storytelling, Video Prompt, 10-shot AI — tất cả trong một nền tảng.
          </p>

          {/* Current status badge */}
          {isPro ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(34,197,94,0.1)', color: '#22c55e',
              padding: '8px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: '1px solid rgba(34,197,94,0.2)'
            }}>
              <Sparkles size={14} />
              Bạn đang dùng gói Pro
              {daysRemaining !== null && ` — còn ${daysRemaining} ngày`}
            </div>
          ) : isAdmin ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(168,85,247,0.1)', color: '#a855f7',
              padding: '8px 20px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              border: '1px solid rgba(168,85,247,0.2)'
            }}>
              <Shield size={14} /> Admin — Truy cập toàn quyền
            </div>
          ) : (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'rgba(255,255,255,0.35)', fontSize: 13
            }}>
              <Zap size={13} /> Kích hoạt ngay sau 1-5 phút chuyển khoản
            </div>
          )}
        </div>
      </div>

      {/* ── PLAN CARDS ─────────────────────────────────────── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px 0' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16, marginBottom: 56
        }}>
          {PLAN_KEYS.map(key => {
            const plan = plans[key]
            if (!plan) return null
            const badge = PLAN_BADGES[key]
            const isYearly = key === 'yearly'
            const isQuarterly = key === 'quarterly'
            const pricePerMonth = key === 'monthly' ? plan.price
              : key === 'quarterly' ? Math.round(plan.price / 3)
              : Math.round(plan.price / 12)
            const savingPct = monthlyPrice > 0 && key !== 'monthly'
              ? Math.round((1 - pricePerMonth / monthlyPrice) * 100)
              : 0
            const hasPrice = plan.price > 0

            return (
              <div key={key} style={{
                background: isYearly
                  ? 'linear-gradient(145deg, rgba(245,158,11,0.07) 0%, rgba(239,68,68,0.05) 100%)'
                  : 'rgba(255,255,255,0.03)',
                borderRadius: 22,
                border: isYearly
                  ? '1.5px solid rgba(245,158,11,0.35)'
                  : isQuarterly
                    ? '1.5px solid rgba(59,130,246,0.3)'
                    : '1.5px solid rgba(255,255,255,0.08)',
                padding: '30px 22px 24px', position: 'relative',
                boxShadow: isYearly
                  ? '0 12px 48px rgba(245,158,11,0.08), 0 0 0 1px rgba(245,158,11,0.05)'
                  : '0 4px 16px rgba(0,0,0,0.2)',
                transform: isYearly ? 'translateY(-4px)' : 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}>
                {/* Badge */}
                {badge && (
                  <div style={{
                    position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                    background: isYearly
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : '#3b82f6',
                    color: '#fff', fontSize: 9, fontWeight: 900,
                    padding: '3px 12px', borderRadius: 12, whiteSpace: 'nowrap',
                    letterSpacing: '0.05em',
                    boxShadow: isYearly ? '0 2px 12px rgba(245,158,11,0.5)' : '0 2px 8px rgba(59,130,246,0.4)'
                  }}>{badge}</div>
                )}

                {/* Icon & label */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>{PLAN_ICONS[key]}</div>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.85)',
                    letterSpacing: '0.02em'
                  }}>{plan.label}</div>
                </div>

                {/* Price */}
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  {hasPrice ? (
                    <>
                      <div style={{
                        fontSize: 36, fontWeight: 900, lineHeight: 1,
                        color: isYearly ? '#f59e0b' : '#fff',
                        marginBottom: 4
                      }}>
                        {plan.price.toLocaleString('vi-VN')}
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginLeft: 3 }}>đ</span>
                      </div>
                      {key !== 'monthly' && pricePerMonth > 0 && (
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                          ≈ {pricePerMonth.toLocaleString('vi-VN')}đ/tháng
                        </div>
                      )}
                      {savingPct > 0 && (
                        <div style={{
                          display: 'inline-block', marginTop: 6,
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                          fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 8,
                          border: '1px solid rgba(34,197,94,0.2)'
                        }}>
                          Tiết kiệm {savingPct}% so với gói tháng
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
                      — Liên hệ Admin —
                    </div>
                  )}
                </div>

                {/* Duration info */}
                <div style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.3)',
                  textAlign: 'center', marginBottom: 20
                }}>
                  {plan.durationDays} ngày sử dụng đầy đủ
                </div>

                {/* CTA */}
                <button
                  onClick={() => hasPrice && handleUpgradeClick(key)}
                  disabled={!hasPrice}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 12, border: 'none',
                    background: hasPrice
                      ? isYearly
                        ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
                        : 'rgba(255,255,255,0.1)'
                      : 'rgba(255,255,255,0.04)',
                    color: hasPrice ? '#fff' : 'rgba(255,255,255,0.2)',
                    fontSize: 13, fontWeight: 800, cursor: hasPrice ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    boxShadow: hasPrice && isYearly ? '0 6px 24px rgba(245,158,11,0.35)' : 'none',
                    transition: 'all 0.2s', letterSpacing: '0.01em',
                    border: hasPrice && !isYearly ? '1px solid rgba(255,255,255,0.12)' : 'none'
                  }}
                  onMouseEnter={e => hasPrice && (e.currentTarget.style.transform = 'scale(1.02)')}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {hasPrice ? (
                    <>
                      <Zap size={14} fill="currentColor" />
                      Nâng cấp ngay
                    </>
                  ) : (
                    <>
                      <MessageCircle size={14} />
                      Liên hệ Admin
                    </>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {/* ── TRUST SIGNALS ───────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginBottom: 56
        }}>
          {TRUST_ITEMS.map(({ icon, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '18px 16px',
              display: 'flex', alignItems: 'flex-start', gap: 12
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f59e0b'
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>
                  {title}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  {desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── FEATURE COMPARISON ──────────────────────────── */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, overflow: 'hidden', marginBottom: 56
        }}>
          {/* header */}
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <Sparkles size={15} style={{ color: '#f59e0b' }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              So sánh tính năng Free vs Pro
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <th style={{
                  padding: '12px 24px', textAlign: 'left',
                  fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em'
                }}>TÍNH NĂNG</th>
                <th style={{
                  padding: '12px 20px', textAlign: 'center', width: 90,
                  fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.06em'
                }}>FREE</th>
                <th style={{
                  padding: '12px 20px', textAlign: 'center', width: 90,
                  fontSize: 11, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.06em'
                }}>PRO ✦</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES_TABLE.map((f, i) => (
                <tr key={i} style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                }}>
                  <td style={{
                    padding: '11px 24px', fontSize: 13,
                    color: f.free ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.85)',
                    fontWeight: f.free ? 400 : 600
                  }}>{f.name}</td>
                  <td style={{ padding: '11px 20px', textAlign: 'center' }}>
                    {f.free
                      ? <Check size={16} style={{ color: '#22c55e' }} />
                      : <XIcon size={15} style={{ color: 'rgba(255,255,255,0.15)' }} />
                    }
                  </td>
                  <td style={{ padding: '11px 20px', textAlign: 'center' }}>
                    <Check size={16} style={{ color: '#f59e0b' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <div style={{ marginBottom: 56, textAlign: 'center' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.3)', marginBottom: 10
          }}>QUY TRÌNH THANH TOÁN</div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, marginBottom: 32, color: 'rgba(255,255,255,0.9)'
          }}>Chỉ 3 bước đơn giản</h2>

          <div style={{
            display: 'flex', gap: 0, justifyContent: 'center',
            flexWrap: 'wrap', position: 'relative'
          }}>
            {[
              { step: '01', title: 'Chọn gói', desc: 'Chọn gói phù hợp với nhu cầu — Tháng, Quý, hoặc Năm' },
              { step: '02', title: 'Quét QR', desc: 'Quét mã QR VietinBank và chuyển khoản với nội dung đúng' },
              { step: '03', title: 'Kích hoạt', desc: 'Hệ thống tự động xác nhận và kích hoạt Pro trong 1-5 phút' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 18, padding: '24px 20px', width: 200, textAlign: 'center'
                }}>
                  <div style={{
                    fontSize: 28, fontWeight: 900, color: 'rgba(245,158,11,0.3)',
                    marginBottom: 10, fontFamily: 'monospace'
                  }}>{step}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>
                    {title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', lineHeight: 1.55 }}>
                    {desc}
                  </div>
                </div>
                {i < 2 && (
                  <ChevronRight size={20} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 4px', flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTACT / SUPPORT ───────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.05) 0%, rgba(239,68,68,0.04) 100%)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 22, padding: '32px 28px', textAlign: 'center', marginBottom: 48
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>
            HỖ TRỢ & LIÊN HỆ
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, margin: '0 0 8px', color: 'rgba(255,255,255,0.9)' }}>
            Cần tư vấn hoặc hỗ trợ?
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 24px', lineHeight: 1.6 }}>
            Admin phản hồi nhanh qua các kênh dưới đây — thường trong vài phút
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {SOCIAL_CONTACTS.map(({ label, url, icon, color, bg, border }) => (
              <a
                key={label}
                href={url}
                target={url.startsWith('http') ? '_blank' : '_self'}
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 18px', borderRadius: 12, textDecoration: 'none',
                  background: bg, color: color, fontWeight: 700, fontSize: 13,
                  border: `1px solid ${border}`, transition: 'transform 0.15s, opacity 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {icon} {label}
              </a>
            ))}
          </div>
        </div>

        {/* ── BOTTOM CTA ──────────────────────────────────── */}
        {!isPro && !isAdmin && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 16 }}>
              Sẵn sàng nâng cấp? Chỉ cần chuyển khoản và tự động kích hoạt!
            </p>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                padding: '14px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                color: '#fff', fontSize: 16, fontWeight: 900,
                boxShadow: '0 8px 32px rgba(245,158,11,0.35)',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
                letterSpacing: '0.01em'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.03)'
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(245,158,11,0.45)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(245,158,11,0.35)'
              }}
            >
              <Sparkles size={18} fill="currentColor" />
              Nâng cấp Pro ngay
            </button>
          </div>
        )}
      </div>

      {/* ── UPGRADE MODAL ───────────────────────────────────── */}
      {showUpgrade && (
        <UpgradePrompt
          featureName=""
          initialPlan={selectedInitialPlan}
          onClose={() => setShowUpgrade(false)}
          onUpgrade={() => setShowUpgrade(false)}
        />
      )}
    </div>
  )
}
