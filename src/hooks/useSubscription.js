/**
 * useSubscription.js
 * Hook to check user's subscription plan and feature access
 */
import { useAuth } from '../contexts/AuthContext'

const FREE_FEATURES = ['remove-clothes', 'library', 'settings']
const PRO_FEATURES = ['remove-clothes', 'library', 'settings', 'new-design', 'storytelling', 'video-prompt', 'seo-aeo']

export default function useSubscription() {
    const { profile, isAdmin, isPro } = useAuth()

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
        planExpiry: profile?.planExpiry || null,
    }
}
