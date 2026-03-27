/**
 * AuthContext.jsx
 * Firebase Authentication Context — provides useAuth() hook
 * Handles login, register, Google sign-in, logout, and user profile in Firestore
 */
import { createContext, useContext, useState, useEffect } from 'react'
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, googleProvider, db } from '../services/firebaseConfig'

const ADMIN_EMAIL = 'dangbinhwzkvu8882@gmail.com'

const AuthContext = createContext(null)

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside AuthProvider')
    return ctx
}

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null)        // Firebase Auth user
    const [profile, setProfile] = useState(null)   // Firestore profile {role, plan, ...}
    const [loading, setLoading] = useState(true)

    // ─── Create/Update Firestore User Doc ───────────────────────────────────────
    async function ensureUserDoc(firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid)
        const snap = await getDoc(ref)

        if (!snap.exists()) {
            // New user → create doc
            const isAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
            const newProfile = {
                email: firebaseUser.email,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                photoURL: firebaseUser.photoURL || null,
                role: isAdmin ? 'admin' : 'user',
                plan: isAdmin ? 'pro' : 'free',
                planExpiry: null,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            }
            await setDoc(ref, newProfile)
            setProfile({ ...newProfile, id: firebaseUser.uid })
        } else {
            // Existing user → update lastLogin
            await updateDoc(ref, { lastLogin: serverTimestamp() })
            setProfile({ ...snap.data(), id: firebaseUser.uid })
        }
    }

    // ─── Auth State Listener ────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser)
                try {
                    await ensureUserDoc(firebaseUser)
                } catch (err) {
                    console.error('Firestore profile error:', err)
                    // Fallback profile from Auth only
                    setProfile({
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        name: firebaseUser.displayName || 'User',
                        role: firebaseUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
                        plan: 'free',
                        planExpiry: null,
                    })
                }
            } else {
                setUser(null)
                setProfile(null)
            }
            setLoading(false)
        })
        return unsub
    }, [])

    // ─── Register with Email ────────────────────────────────────────────────────
    async function register(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (displayName) {
            await updateProfile(cred.user, { displayName })
        }
        await sendEmailVerification(cred.user)
        await ensureUserDoc(cred.user)
        return cred.user
    }

    // ─── Login with Email ───────────────────────────────────────────────────────
    async function login(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        await ensureUserDoc(cred.user)
        return cred.user
    }

    // ─── Login with Google ──────────────────────────────────────────────────────
    async function loginWithGoogle() {
        const cred = await signInWithPopup(auth, googleProvider)
        await ensureUserDoc(cred.user)
        return cred.user
    }

    // ─── Logout ─────────────────────────────────────────────────────────────────
    async function logout() {
        await signOut(auth)
        setUser(null)
        setProfile(null)
    }

    // ─── Reset Password ─────────────────────────────────────────────────────────
    async function resetPassword(email) {
        await sendPasswordResetEmail(auth, email)
    }

    // ─── Refresh Profile (after plan change etc) ────────────────────────────────
    async function refreshProfile() {
        if (!user) return
        const ref = doc(db, 'users', user.uid)
        const snap = await getDoc(ref)
        if (snap.exists()) {
            setProfile({ ...snap.data(), id: user.uid })
        }
    }

    const value = {
        user,
        profile,
        loading,
        register,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        refreshProfile,
        isAdmin: profile?.role === 'admin',
        isPro: profile?.plan === 'pro' || profile?.role === 'admin',
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}
