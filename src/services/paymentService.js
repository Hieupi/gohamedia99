/**
 * paymentService.js
 * QR Payment via VietQR + Firestore order tracking
 * Pricing is dynamic from Firestore (admin-adjustable)
 */
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore'
import { db } from './firebaseConfig'
import { getPlan, getBankConfig } from './pricingService'

// ─── Generate unique payment code ─────────────────────────────────────────────
function generatePaymentCode(uid) {
    const short = uid.slice(0, 6).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
    return `SEVQR FSA${short}${rand}`
}

// ─── Generate VietQR URL ──────────────────────────────────────────────────────
export function generateQRUrl(bankConfig, paymentCode, amount) {
    const { bankId, accountNo, accountName, template } = bankConfig
    const info = encodeURIComponent(paymentCode)
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${info}&accountName=${encodeURIComponent(accountName)}`
}

// ─── Create pending order ─────────────────────────────────────────────────────
export async function createPaymentOrder(uid, email, planKey = 'monthly') {
    const plan = await getPlan(planKey)
    if (!plan) throw new Error(`Gói "${planKey}" không tồn tại.`)
    if (!plan.price || plan.price <= 0) throw new Error(`Gói "${planKey}" chưa được thiết lập giá.`)

    const bankConfig = await getBankConfig()
    const code = generatePaymentCode(uid)
    const order = {
        uid,
        email,
        code,
        amount: plan.price,
        plan: 'pro',
        duration: planKey,
        durationDays: plan.durationDays,
        durationLabel: plan.label,
        status: 'pending',
        createdAt: serverTimestamp(),
        confirmedAt: null,
    }
    await setDoc(doc(db, 'orders', code), order)
    return {
        code,
        qrUrl: generateQRUrl(bankConfig, code, plan.price),
        amount: plan.price,
        duration: planKey,
        durationLabel: plan.label,
    }
}

// ─── Check order status ───────────────────────────────────────────────────────
export async function checkOrderStatus(code) {
    const snap = await getDoc(doc(db, 'orders', code))
    if (!snap.exists()) return null
    return snap.data()
}

// ─── Compute plan expiry (stacks on existing if still active) ─────────────────
function computePlanExpiry(durationDays, currentExpiry) {
    if (!durationDays) return null  // safety: should not happen now

    const now = new Date()
    let baseDate = now
    if (currentExpiry) {
        const expDate = currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry.seconds * 1000)
        if (expDate > now) baseDate = expDate  // stack time
    }
    return new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
}

// ─── Admin: Confirm payment manually ──────────────────────────────────────────
export async function confirmPayment(code) {
    const orderRef = doc(db, 'orders', code)
    const snap = await getDoc(orderRef)
    if (!snap.exists()) throw new Error('Order not found')

    const order = snap.data()

    // Get current user data to check existing expiry
    const userRef = doc(db, 'users', order.uid)
    const userSnap = await getDoc(userRef)
    const userData = userSnap.exists() ? userSnap.data() : {}

    const planExpiry = computePlanExpiry(order.durationDays, userData.planExpiry)

    // Update order status
    await updateDoc(orderRef, {
        status: 'confirmed',
        confirmedAt: serverTimestamp(),
        planExpiryDate: planExpiry,
    })

    // Upgrade user to Pro
    await updateDoc(userRef, {
        plan: 'pro',
        planExpiry: planExpiry,
        upgradedAt: serverTimestamp(),
    })

    return { success: true, uid: order.uid, email: order.email, planExpiry }
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

// ─── Bank info for display (async now) ────────────────────────────────────────
export async function getBankDisplay() {
    const bank = await getBankConfig()
    return {
        bankName: 'VietinBank',
        accountNo: bank.accountNo,
        accountName: bank.accountName,
    }
}
