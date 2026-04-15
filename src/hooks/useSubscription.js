/**
 * useSubscription.js
 * Hook to check user's subscription plan, feature access, and expiry status
 */
import { useAuth } from '../contexts/AuthContext'

const FREE_FEATURES = ['remove-clothes', 'library', 'settings']

function parseExpiry(planExpiry) {
    if (!planExpiry) return null
    if (planExpiry.toDate) return planExpiry.toDate()
    if (planExpiry.seconds) return new Date(planExpiry.seconds * 1000)
    if (planExpiry instanceof Date) return planExpiry
    return null
}

export default function useSubscription() {
    const { profile, isAdmin } = useAuth()

    const expiryDate = parseExpiry(profile?.planExpiry)
    const now = new Date()

    // Pro is valid only if plan='pro' AND (no expiry OR expiry in future)
    const isPro = profile?.role === 'admin' || (
        profile?.plan === 'pro' && (!expiryDate || expiryDate > now)
    )

    const isExpired = profile?.plan === 'pro' && expiryDate && expiryDate <= now
    const daysRemaining = expiryDate ? Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))) : null
    const isExpiringSoon = isPro && daysRemaining !== null && daysRemaining <= 7

    const canAccess = (feature) => {
        if (isAdmin) return true
        if (isPro) return true
        return FREE_FEATURES.includes(feature)
    }

    const getPlan = () => {
        if (isAdmin) return 'admin'
        if (isPro) return 'pro'
        return 'free'
    }

    const getPlanLabel = () => {
        if (isAdmin) return '👑 Admin'
        if (isPro) return '💎 Pro'
        return '🆓 Free'
    }

    return {
        canAccess,
        getPlan: getPlan(),
        getPlanLabel: getPlanLabel(),
        isAdmin,
        isPro,
        isExpired: !!isExpired,
        isExpiringSoon: !!isExpiringSoon,
        daysRemaining,
        planExpiry: expiryDate,
    }
}
