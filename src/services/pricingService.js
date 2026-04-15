/**
 * pricingService.js
 * Dynamic pricing from Firestore — admin can adjust prices, QR codes auto-update
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebaseConfig'

const PRICING_DOC_PATH = 'settings/pricing'

// ─── In-memory cache ──────────────────────────────────────────────────────────
let cachedPricing = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000  // 5 minutes

// ─── Default pricing (used if Firestore doc doesn't exist yet) ────────────────
const DEFAULT_PRICING = {
  plans: {
    monthly:   { price: 0, durationDays: 30,  label: 'Gói 1 tháng',  description: 'Pro 1 tháng' },
    quarterly: { price: 0, durationDays: 90,  label: 'Gói 3 tháng',  description: 'Pro 3 tháng' },
    yearly:    { price: 0, durationDays: 365, label: 'Gói 1 năm',    description: 'Pro 1 năm' },
  },
  bank: {
    bankId: 'ICB',
    accountNo: '60048899',
    accountName: 'NGUYỄN VĂN HIẾU',
    template: 'compact2',
  },
}

// ─── Fetch pricing (with cache) ───────────────────────────────────────────────
export async function fetchPricing(forceRefresh = false) {
  const now = Date.now()
  if (!forceRefresh && cachedPricing && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedPricing
  }

  try {
    const snap = await getDoc(doc(db, PRICING_DOC_PATH))
    if (snap.exists()) {
      cachedPricing = snap.data()
    } else {
      // Doc doesn't exist yet — use defaults
      cachedPricing = { ...DEFAULT_PRICING }
    }
  } catch (err) {
    console.error('[Pricing] Fetch error:', err)
    if (!cachedPricing) cachedPricing = { ...DEFAULT_PRICING }
  }

  cacheTimestamp = now
  return cachedPricing
}

// ─── Get a specific plan ──────────────────────────────────────────────────────
export async function getPlan(planKey) {
  const pricing = await fetchPricing()
  return pricing.plans?.[planKey] || null
}

// ─── Get all plans ────────────────────────────────────────────────────────────
export async function getAllPlans() {
  const pricing = await fetchPricing()
  return pricing.plans || {}
}

// ─── Get bank config ──────────────────────────────────────────────────────────
export async function getBankConfig() {
  const pricing = await fetchPricing()
  return pricing.bank || DEFAULT_PRICING.bank
}

// ─── Admin: Update pricing ────────────────────────────────────────────────────
export async function updatePricing(plans, adminUid) {
  const pricing = await fetchPricing()
  const updated = {
    ...pricing,
    plans,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || null,
  }
  await setDoc(doc(db, PRICING_DOC_PATH), updated)

  // Bust cache
  cachedPricing = { ...updated, updatedAt: new Date() }
  cacheTimestamp = Date.now()

  return updated
}

// ─── Initialize default pricing doc if missing ────────────────────────────────
export async function initDefaultPricing(adminUid) {
  const snap = await getDoc(doc(db, PRICING_DOC_PATH))
  if (snap.exists()) return snap.data()

  const initial = {
    ...DEFAULT_PRICING,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || null,
  }
  await setDoc(doc(db, PRICING_DOC_PATH), initial)
  cachedPricing = initial
  cacheTimestamp = Date.now()
  return initial
}

// ─── Plan display order ───────────────────────────────────────────────────────
export const PLAN_KEYS = ['monthly', 'quarterly', 'yearly']

export const PLAN_ICONS = {
  monthly: '📅',
  quarterly: '📦',
  yearly: '🏆',
}
