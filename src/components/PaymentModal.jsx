/**
 * PaymentModal.jsx
 * QR Code payment modal — shows VietQR, bank info, and auto-polls for confirmation
 */
import { useState, useEffect, useRef } from 'react'
import { X, Copy, Check, Loader, QrCode, CreditCard, Clock, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createPaymentOrder, checkOrderStatus, BANK_DISPLAY, PRICING } from '../services/paymentService'

export default function PaymentModal({ onClose, onSuccess }) {
    const { user, refreshProfile } = useAuth()
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState('pending') // pending | checking | confirmed
    const [copied, setCopied] = useState(null)
    const pollRef = useRef(null)

    // Create order on mount
    useEffect(() => {
        if (!user) return
        createPaymentOrder(user.uid, user.email)
            .then(o => { setOrder(o); setLoading(false) })
            .catch(err => { console.error(err); setLoading(false) })
    }, [user])

    // Poll for confirmation: check Firestore + SePay every 15s
    useEffect(() => {
        if (!order?.code) return
        const checkPayment = async () => {
            try {
                // 1. Check Firestore (admin may have confirmed manually)
                const data = await checkOrderStatus(order.code)
                if (data?.status === 'confirmed') {
                    setStatus('confirmed')
                    clearInterval(pollRef.current)
                    await refreshProfile()
                    setTimeout(() => onSuccess?.(), 2000)
                    return
                }
                // 2. Check SePay for matching bank transfer
                const { autoConfirmPayments } = await import('../services/sepayService')
                const result = await autoConfirmPayments()
                if (result.matched > 0) {
                    // Re-check this specific order
                    const updated = await checkOrderStatus(order.code)
                    if (updated?.status === 'confirmed') {
                        setStatus('confirmed')
                        clearInterval(pollRef.current)
                        await refreshProfile()
                        setTimeout(() => onSuccess?.(), 2000)
                    }
                }
            } catch (e) { /* ignore polling errors */ }
        }
        // First check after 10s, then every 15s
        const timer = setTimeout(() => {
            checkPayment()
            pollRef.current = setInterval(checkPayment, 15000)
        }, 10000)
        return () => { clearTimeout(timer); clearInterval(pollRef.current) }
    }, [order?.code])

    const copyText = async (text, field) => {
        await navigator.clipboard.writeText(text)
        setCopied(field)
        setTimeout(() => setCopied(null), 2000)
    }

    if (status === 'confirmed') {
        return (
            <div className="modal-overlay" style={overlayStyle}>
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #22c55e, #10b981)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 20px', animation: 'pop 0.5s ease'
                    }}>
                        <Sparkles size={36} color="#fff" />
                    </div>
                    <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 900, color: 'var(--text-main)' }}>
                        🎉 Nâng cấp thành công!
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                        Tài khoản của bạn đã được kích hoạt gói <strong style={{ color: '#f59e0b' }}>Pro vĩnh viễn</strong>.
                        <br />Toàn bộ tính năng AI đã được mở khóa!
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose} style={overlayStyle}>
            <div onClick={e => e.stopPropagation()} style={cardStyle}>
                <button onClick={onClose} style={closeBtn}><X size={20} /></button>

                <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, textAlign: 'center', color: 'var(--text-main)' }}>
                    <CreditCard size={20} style={{ marginRight: 6, verticalAlign: -3 }} />
                    Thanh toán nâng cấp Pro
                </h2>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
                    Quét QR hoặc chuyển khoản ngân hàng
                </p>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                        <Loader size={32} className="spin" style={{ color: 'var(--brand)' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>Đang tạo đơn hàng...</p>
                    </div>
                ) : order ? (
                    <>
                        {/* QR Code */}
                        <div style={{
                            background: '#fff', borderRadius: 12, padding: 12,
                            display: 'flex', justifyContent: 'center', marginBottom: 16
                        }}>
                            <img
                                src={order.qrUrl}
                                alt="QR Payment"
                                style={{ width: 220, height: 220, borderRadius: 8 }}
                                onError={e => { e.target.style.display = 'none' }}
                            />
                        </div>

                        {/* Bank Info */}
                        <div style={{
                            background: 'var(--bg-main)', borderRadius: 12, padding: 14,
                            fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8,
                            border: '1px solid var(--border-color)', marginBottom: 16
                        }}>
                            <InfoRow label="Ngân hàng" value={BANK_DISPLAY.bankName} />
                            <InfoRow
                                label="Số tài khoản"
                                value={BANK_DISPLAY.accountNo}
                                onCopy={() => copyText(BANK_DISPLAY.accountNo, 'account')}
                                copied={copied === 'account'}
                            />
                            <InfoRow label="Chủ TK" value={BANK_DISPLAY.accountName} />
                            <InfoRow
                                label="Số tiền"
                                value={`${order.amount.toLocaleString('vi-VN')}đ`}
                                onCopy={() => copyText(String(order.amount), 'amount')}
                                copied={copied === 'amount'}
                                highlight
                            />
                            <InfoRow
                                label="Nội dung CK"
                                value={order.code}
                                onCopy={() => copyText(order.code, 'code')}
                                copied={copied === 'code'}
                                highlight
                            />
                        </div>

                        {/* Status */}
                        <div style={{
                            textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                        }}>
                            <Clock size={14} className="spin" style={{ animationDuration: '3s' }} />
                            Đang chờ xác nhận thanh toán...
                        </div>

                        <p style={{
                            textAlign: 'center', fontSize: 11, color: 'var(--text-muted)',
                            margin: '8px 0 0', opacity: 0.7
                        }}>
                            ⚠️ Ghi đúng nội dung chuyển khoản: <strong>{order.code}</strong>
                            <br />Hệ thống sẽ tự động kích hoạt trong 1-5 phút sau khi thanh toán.
                        </p>
                    </>
                ) : (
                    <p style={{ textAlign: 'center', color: '#ef4444' }}>Không thể tạo đơn hàng. Vui lòng thử lại.</p>
                )}
            </div>
        </div>
    )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, onCopy, copied, highlight }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
            <span style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontWeight: highlight ? 800 : 600,
                color: highlight ? '#f59e0b' : 'var(--text-main)'
            }}>
                {value}
                {onCopy && (
                    <button onClick={onCopy} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: copied ? '#22c55e' : 'var(--text-muted)', padding: 2
                    }}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                )}
            </span>
        </div>
    )
}

const overlayStyle = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
}

const cardStyle = {
    background: 'var(--bg-card)', borderRadius: 20, padding: '28px 24px',
    maxWidth: 420, width: '92%', position: 'relative',
    border: '1px solid var(--border-color)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    maxHeight: '90vh', overflowY: 'auto'
}

const closeBtn = {
    position: 'absolute', top: 12, right: 12, background: 'none',
    border: 'none', cursor: 'pointer', color: 'var(--text-muted)'
}
