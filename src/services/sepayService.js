/**
 * sepayService.js
 * SePay.vn integration — auto-detect bank transfers and confirm orders
 */
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebaseConfig'

const SEPAY_API_KEY = '3MO8362TCQDWEBHBADMVXXD4WBMEYV7WNHOCXBKA9UHNZSL5G0AUJ5JUI0NFHKKA'
const SEPAY_BASE_URL = 'https://my.sepay.vn/userapi'

/**
 * Fetch recent transactions from SePay
 */
export async function fetchSepayTransactions(limit = 20) {
    try {
        const url = `${SEPAY_BASE_URL}/transactions/list?limit=${limit}`
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${SEPAY_API_KEY}`,
                'Content-Type': 'application/json',
            },
        })
        if (!res.ok) {
            const errText = await res.text().catch(() => '')
            throw new Error(`SePay API error ${res.status}: ${errText.slice(0, 200)}`)
        }
        const data = await res.json()
        return data.transactions || data.data || []
    } catch (err) {
        console.warn('[SePay] Fetch failed:', err.message)
        return null
    }
}

/**
 * Compute plan expiry, stacking on existing if still active
 */
function computePlanExpiry(durationDays, currentExpiry) {
    if (!durationDays) return null

    const now = new Date()
    let baseDate = now
    if (currentExpiry) {
        const expDate = currentExpiry.toDate ? currentExpiry.toDate() : new Date(currentExpiry.seconds * 1000)
        if (expDate > now) baseDate = expDate
    }
    return new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000)
}

/**
 * Auto-match SePay transactions with pending Firestore orders
 */
export async function autoConfirmPayments() {
    const results = { matched: 0, errors: [] }

    try {
        // 1. Get pending orders
        const pendingQ = query(collection(db, 'orders'), where('status', '==', 'pending'))
        const pendingSnap = await getDocs(pendingQ)
        if (pendingSnap.empty) return results

        const pendingOrders = {}
        pendingSnap.forEach(d => {
            const order = d.data()
            pendingOrders[order.code] = { ...order, docId: d.id }
        })

        // 2. Fetch SePay transactions
        const transactions = await fetchSepayTransactions(50)
        if (!transactions) {
            results.errors.push('Không thể kết nối SePay API')
            return results
        }

        // 3. Match transactions with orders
        for (const tx of transactions) {
            const content = (tx.transaction_content || tx.description || '').toUpperCase()
            const amount = Number(tx.amount_in || tx.amount || 0)

            if (amount <= 0) continue

            for (const [code, order] of Object.entries(pendingOrders)) {
                if (content.includes(code.toUpperCase()) && amount >= order.amount) {
                    try {
                        // Get current user data to check existing expiry
                        const userRef = doc(db, 'users', order.uid)
                        const userSnap = await getDoc(userRef)
                        const userData = userSnap.exists() ? userSnap.data() : {}

                        const planExpiry = computePlanExpiry(order.durationDays, userData.planExpiry)

                        await updateDoc(doc(db, 'orders', order.docId), {
                            status: 'confirmed',
                            confirmedAt: serverTimestamp(),
                            sepayTxId: tx.id || tx.reference_number || null,
                            autoConfirmed: true,
                            planExpiryDate: planExpiry,
                        })

                        await updateDoc(userRef, {
                            plan: 'pro',
                            planExpiry: planExpiry,
                            upgradedAt: serverTimestamp(),
                        })

                        results.matched++
                        delete pendingOrders[code]
                    } catch (err) {
                        results.errors.push(`Lỗi xác nhận ${code}: ${err.message}`)
                    }
                }
            }
        }
    } catch (err) {
        results.errors.push(`Lỗi hệ thống: ${err.message}`)
    }

    return results
}

/**
 * Check if a specific order has been paid via SePay
 */
export async function checkSingleOrderPayment(orderCode, orderAmount) {
    try {
        const transactions = await fetchSepayTransactions(20)
        if (!transactions) return false

        for (const tx of transactions) {
            const content = (tx.transaction_content || tx.description || '').toUpperCase()
            const amount = Number(tx.amount_in || tx.amount || 0)
            if (content.includes(orderCode.toUpperCase()) && amount >= orderAmount) {
                return true
            }
        }
        return false
    } catch {
        return false
    }
}
