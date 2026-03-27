/**
 * UpgradePrompt.jsx
 * Modal shown when Free users try to access Pro features
 * Now includes PaymentModal integration
 */
import { useState } from 'react'
import { Sparkles, Lock, X } from 'lucide-react'
import PaymentModal from './PaymentModal'

export default function UpgradePrompt({ featureName, onClose, onUpgrade }) {
    const [showPayment, setShowPayment] = useState(false)

    if (showPayment) {
        return (
            <PaymentModal
                onClose={onClose}
                onSuccess={() => { onUpgrade?.(); onClose?.() }}
            />
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-card)', borderRadius: 20, padding: '40px 32px',
                maxWidth: 420, width: '90%', textAlign: 'center', position: 'relative',
                border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: 12, right: 12, background: 'none',
                    border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
                }}><X size={20} /></button>

                <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(245,158,11,0.3)'
                }}>
                    <Lock size={32} color="#fff" />
                </div>

                <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>
                    Tính năng Pro
                </h2>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <strong>{featureName}</strong> là tính năng cao cấp dành cho gói <strong style={{ color: '#f59e0b' }}>Pro</strong>.
                    <br />Nâng cấp ngay để mở khóa toàn bộ công cụ AI!
                </p>

                <div style={{
                    background: 'var(--bg-main)', borderRadius: 12, padding: 16,
                    marginBottom: 24, border: '1px solid var(--border-color)'
                }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>
                        68.000đ
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Trọn đời • Không giới hạn • Ưu đãi 20 suất đầu tiên
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 24, fontSize: 13, color: 'var(--text-main)' }}>
                    <div>✅ Thiết kế mới (10-shot AI)</div>
                    <div>✅ Storytelling (9 cảnh kịch bản)</div>
                    <div>✅ Video Prompt điện ảnh</div>
                    <div>✅ SEO & AEO Content triệu view</div>
                    <div>✅ Thư viện không giới hạn</div>
                    <div>✅ Hỗ trợ ưu tiên</div>
                </div>

                <button onClick={() => setShowPayment(true)} style={{
                    width: '100%', padding: '14px 0', borderRadius: 12,
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: 16, fontWeight: 800, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                    transition: 'transform 0.2s'
                }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.02)'}
                    onMouseLeave={e => e.target.style.transform = 'scale(1)'}
                >
                    <Sparkles size={18} /> Nâng cấp Pro ngay
                </button>
            </div>
        </div>
    )
}
