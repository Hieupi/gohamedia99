/**
 * firebaseConfig.js
 * Firebase initialization for Fashion Studio AI
 */
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
    apiKey: "AIzaSyAN5MzkzCTXMQMQ-TeWz8JD0mzTeLIAq8Y",
    authDomain: "fashion-studio-ai-6a7d3.firebaseapp.com",
    projectId: "fashion-studio-ai-6a7d3",
    storageBucket: "fashion-studio-ai-6a7d3.firebasestorage.app",
    messagingSenderId: "804479190625",
    appId: "1:804479190625:web:1f0590b5e7f12552b60c20",
    measurementId: "G-K3NZTB1N3L"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
