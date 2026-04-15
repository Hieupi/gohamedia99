/**
 * UpgradePrompt.jsx
 * Modal shown when Free users try to access Pro features
 * Shows 3 plan options (monthly/quarterly/yearly) with dynamic pricing from Firestore
 * Bug fix: auto-selects first plan with price > 0 instead of hardcoding 'quarterly'
 */
import { useState, useEffect } from 'react'
import { Sparkles, X, Check, Zap, Shield, Clock } from 'lucide-react'
import { fetchPricing, PLAN_KEYS, PLAN_ICONS } from '../services/pricingService'
import PaymentModal from './PaymentModal'

const PLAN_BADGES = {
  monthly: null,
  quarterly: 'PHỔ BIẾN',
  yearly: 'TIẾT KIỆM NHẤT',
}

const PRO_FEATURES = [
  'Tách sản phẩm',
  'Thiết kế mới (10-shot AI)',
  'Storytelling (9 cảnh)',
  'KOL Review Bán Hàng',
  'Video Prompt điện ảnh',
  'Thư viện ảnh cá nhân',
  'Kho Prompt & Trợ lý AI',
  'Hỗ trợ ưu tiên 24/7',
]

export default function UpgradePrompt({ featureName, onClose, onUpgrade, initialPlan }) {
  const [showPayment, setShowPayment] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(initialPlan || 'quarterly')
  const [plans, setPlans] = useState({})
  const [loadingPlans, setLoadingPlans] = useState(true)

  useEffect(() => {
    fetchPricing().then(data => {
      const loadedPlans = data.plans || {}
      setPlans(loadedPlans)
      // Fix bug: auto-select first plan with price > 0
      const preferred = initialPlan && loadedPlans[initialPlan]?.price > 0
        ? initialPlan
        : PLAN_KEYS.find(k => loadedPlans[k]?.price > 0) || 'monthly'
      setSelectedPlan(preferred)
      setLoadingPlans(false)
    }).catch(() => setLoadingPlans(false))
  }, [initialPlan])

  if (showPayment) {
    return (
      <PaymentModal
        selectedPlan={selectedPlan}
        onClose={onClose}
        onSuccess={() => { onUpgrade?.(); onClose?.() }}
      />
    )
  }

  const monthlyPrice = plans.monthly?.price || 0
  const activePlan = plans[selectedPlan]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(150deg, #0f0a1e 0%, #1a0f2e 55%, #0a0f1e 100%)',
          borderRadius: 24, padding: '36px 30px 26px',
          maxWidth: 540, width: '94%', position: 'relative',
          border: '1px solid rgba(245,158,11,0.22)',
          boxShadow: '0 32px 90px rgba(0,0,0,0.6), 0 0 80px rgba(245,158,11,0.05)',
          maxHeight: '90vh', overflowY: 'auto'
        }}
      >
        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: -40, right: -20, width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none'
        }} />

        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: 6,
          display: 'flex', alignItems: 'center', transition: 'background 0.2s'
        }}>
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24, position: 'relative' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(245,158,11,0.12)', color: '#f59e0b',
            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.06em', marginBottom: 14,
            border: '1px solid rgba(245,158,11,0.22)'
          }}>
            <Sparkles size={11} /> NÂNG CẤP LÊN PRO
          </div>

          <h2 style={{
            margin: '0 0 8px', fontSize: 21, fontWeight: 900, color: '#fff', lineHeight: 1.3
          }}>
            {featureName
              ? <>Mở khóa{' '}<span style={{ color: '#f59e0b' }}>{featureName}</span></>
              : 'Mở khóa toàn bộ sức mạnh AI'
            }
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6 }}>
            Chọn gói phù hợp — Tự động kích hoạt sau <strong style={{ color: 'rgba(255,255,255,0.7)' }}>1-5 phút</strong> chuyển khoản
          </p>
        </div>

        {/* Plan Cards */}
        {loadingPlans ? (
          <div style={{ padding: '20px 0', color: 'rgba(255,255,255,0.35)', fontSize: 13, textAlign: 'center' }}>
            Đang tải bảng giá...
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {PLAN_KEYS.map(key => {
              const plan = plans[key]
              if (!plan || !plan.price) return null
              const active = selectedPlan === key
              const badge = PLAN_BADGES[key]
              const isYearly = key === 'yearly'
              const pricePerMonth = key === 'monthly' ? plan.price
                : key === 'quarterly' ? Math.round(plan.price / 3)
                : Math.round(plan.price / 12)
              const savingPct = monthlyPrice > 0 && key !== 'monthly'
                ? Math.round((1 - pricePerMonth / monthlyPrice) * 100)
                : 0

              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlan(key)}
                  style={{
                    flex: 1, padding: '14px 8px 12px', borderRadius: 14, cursor: 'pointer',
                    background: active
                      ? (isYearly ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)')
                      : 'rgba(255,255,255,0.03)',
                    border: active
                      ? `2px solid ${isYearly ? '#f59e0b' : 'rgba(245,158,11,0.5)'}`
                      : '1.5px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.2s', position: 'relative', textAlign: 'center',
                    boxShadow: active && isYearly ? '0 0 24px rgba(245,158,11,0.12)' : 'none'
                  }}
                >
                  {badge && (
                    <div style={{
                      position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)',
                      background: isYearly
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : '#3b82f6',
                      color: '#fff', fontSize: 8, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 10, whiteSpace: 'nowrap',
                      letterSpacing: '0.04em',
                      boxShadow: isYearly ? '0 2px 8px rgba(245,158,11,0.4)' : 'none'
                    }}>{badge}</div>
                  )}
                  <div style={{ fontSize: 24, marginBottom: 4 }}>{PLAN_ICONS[key]}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                    {plan.label}
                  </div>
                  <div style={{
                    fontSize: 17, fontWeight: 900,
                    color: active ? '#f59e0b' : 'rgba(255,255,255,0.85)'
                  }}>
                    {plan.price.toLocaleString('vi-VN')}đ
                  </div>
                  {key !== 'monthly' && pricePerMonth > 0 && (
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>
                      ≈{pricePerMonth.toLocaleString('vi-VN')}đ/tháng
                    </div>
                  )}
                  {savingPct > 0 && (
                    <div style={{ fontSize: 9, color: '#22c55e', fontWeight: 800, marginTop: 2 }}>
                      -{savingPct}%
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Features */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 16px',
          marginBottom: 20, padding: '14px 12px',
          background: 'rgba(255,255,255,0.03)', borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.06)'
        }}>
          {PRO_FEATURES.map(f => (
            <div key={f} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11.5, color: 'rgba(255,255,255,0.6)'
            }}>
              <Check size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => activePlan?.price > 0 && setShowPayment(true)}
          disabled={!activePlan?.price}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 13,
            background: activePlan?.price
              ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
              : 'rgba(255,255,255,0.07)',
            color: activePlan?.price ? '#fff' : 'rgba(255,255,255,0.3)',
            border: 'none', cursor: activePlan?.price ? 'pointer' : 'default',
            fontSize: 15, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: activePlan?.price ? '0 6px 24px rgba(245,158,11,0.35)' : 'none',
            transition: 'transform 0.15s, box-shadow 0.15s',
            marginBottom: 14, letterSpacing: '0.01em'
          }}
          onMouseEnter={e => activePlan?.price && (e.currentTarget.style.transform = 'scale(1.015)')}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Zap size={16} fill="currentColor" />
          {activePlan?.price
            ? `Nâng cấp ${activePlan.label} — ${activePlan.price.toLocaleString('vi-VN')}đ`
            : 'Chưa có giá — liên hệ Admin'
          }
        </button>

        {/* Trust signals */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 14,
          marginBottom: 14, flexWrap: 'wrap'
        }}>
          {[
            { icon: <Zap size={10} />, text: 'Kích hoạt 1-5 phút' },
            { icon: <Shield size={10} />, text: 'Chuyển khoản an toàn' },
            { icon: <Clock size={10} />, text: 'Hỗ trợ 24/7' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, color: 'rgba(255,255,255,0.35)'
            }}>
              {icon} {text}
            </div>
          ))}
        </div>

        {/* Social Contact */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 14,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 10, flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Cần hỗ trợ?</span>
          <a href="https://zalo.me/g/jcons43eyjbf2rw1tlkr" target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: 11, color: '#0088ff', fontWeight: 700, textDecoration: 'none',
              background: 'rgba(0,136,255,0.08)', padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(0,136,255,0.2)'
            }}>
            💬 Zalo Group
          </a>
          <a href="https://www.facebook.com/hieudsp/" target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: 11, color: '#1877f2', fontWeight: 700, textDecoration: 'none',
              background: 'rgba(24,119,242,0.08)', padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(24,119,242,0.2)'
            }}>
            📘 Facebook
          </a>
          <a href="tel:0981228229"
            style={{
              fontSize: 11, color: '#22c55e', fontWeight: 700, textDecoration: 'none',
              background: 'rgba(34,197,94,0.08)', padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(34,197,94,0.2)'
            }}>
            📞 0981.228.229
          </a>
        </div>
      </div>
    </div>
  )
}
