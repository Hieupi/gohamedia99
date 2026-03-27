/**
 * paymentService.js
 * QR Payment via VietQR + Firestore order tracking
 */
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, increment } from 'firebase/firestore'
import { db } from './firebaseConfig'

// ─── Bank Config ──────────────────────────────────────────────────────────────
const BANK_CONFIG = {
    bankId: 'ICB',           // VietinBank code for VietQR
    accountNo: '60048899',
    accountName: 'NGUYỄN VĂN HIẾU',
    amount: 68000,
    template: 'compact2',
}

// ─── Pricing Config ───────────────────────────────────────────────────────────
export const PRICING = {
    earlyBird: {
        price: 68000,
        label: '68.000đ',
        duration: 'lifetime',     // vĩnh viễn
        slots: 20,                // 20 suất đầu
        description: 'Ưu đãi 20 suất đầu tiên — Trọn đời',
    },
}

// ─── Generate unique payment code ─────────────────────────────────────────────
// IMPORTANT: VietinBank + SePay requires transfer content to start with "SEVQR"
// so SePay webhook can detect incoming transactions.
function generatePaymentCode(uid) {
    const short = uid.slice(0, 6).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    return `SEVQR FSA${short}${rand}`
}

// ─── Generate VietQR URL ──────────────────────────────────────────────────────
export function generateQRUrl(paymentCode, amount = BANK_CONFIG.amount) {
    const info = encodeURIComponent(paymentCode)
    return `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-${BANK_CONFIG.template}.png?amount=${amount}&addInfo=${info}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`
}

// ─── Create pending order ─────────────────────────────────────────────────────
export async function createPaymentOrder(uid, email) {
    const code = generatePaymentCode(uid)
    const order = {
        uid,
        email,
        code,
        amount: PRICING.earlyBird.price,
        plan: 'pro',
        duration: 'lifetime',
        status: 'pending',      // pending → confirmed → expired
        createdAt: serverTimestamp(),
        confirmedAt: null,
    }
    await setDoc(doc(db, 'orders', code), order)
    return { code, qrUrl: generateQRUrl(code), amount: order.amount }
}

// ─── Check order status ───────────────────────────────────────────────────────
export async function checkOrderStatus(code) {
    const snap = await getDoc(doc(db, 'orders', code))
    if (!snap.exists()) return null
    return snap.data()
}

// ─── Admin: Confirm payment manually ──────────────────────────────────────────
export async function confirmPayment(code) {
    const orderRef = doc(db, 'orders', code)
    const snap = await getDoc(orderRef)
    if (!snap.exists()) throw new Error('Order not found')

    const order = snap.data()

    // Update order status
    await updateDoc(orderRef, {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
    })

    // Upgrade user to Pro
    const userRef = doc(db, 'users', order.uid)
    await updateDoc(userRef, {
        plan: 'pro',
        planExpiry: null,  // lifetime = no expiry
        upgradedAt: serverTimestamp(),
    })

    return { success: true, uid: order.uid, email: order.email }
}

// ─── Admin: Get all orders ────────────────────────────────────────────────────
export async function getAllOrders() {
    const snap = await getDocs(collection(db, 'orders'))
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ─── Admin: Get pro user count ────────────────────────────────────────────────
export async function getProUserCount() {
    const q = query(collection(db, 'users'), where('plan', '==', 'pro'))
    const snap = await getDocs(q)
    return snap.size
}

// ─── Check remaining early bird slots ─────────────────────────────────────────
export async function getRemainingSlots() {
    const q = query(collection(db, 'orders'), where('status', '==', 'confirmed'))
    const snap = await getDocs(q)
    return Math.max(0, PRICING.earlyBird.slots - snap.size)
}

// ─── Bank info for display ────────────────────────────────────────────────────
export const BANK_DISPLAY = {
    bankName: 'VietinBank',
    accountNo: BANK_CONFIG.accountNo,
    accountName: BANK_CONFIG.accountName,
}
