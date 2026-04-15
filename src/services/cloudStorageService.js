/**
 * cloudStorageService.js
 * Upload/download images to Firebase Storage (cloud)
 */
import { ref, uploadString, getDownloadURL, deleteObject, getBlob } from 'firebase/storage'
import { storage } from './firebaseConfig'

/**
 * Upload a data URL image to Firebase Storage
 * @returns {string} Download URL
 */
export async function uploadImageToCloud(userId, imageId, dataUrl) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return null
    const path = `users/${userId}/library/${imageId}`
    const storageRef = ref(storage, path)
    await uploadString(storageRef, dataUrl, 'data_url')
    return getDownloadURL(storageRef)
}

/**
 * Delete an image from Firebase Storage
 */
export async function deleteImageFromCloud(userId, imageId) {
    try {
        const path = `users/${userId}/library/${imageId}`
        await deleteObject(ref(storage, path))
    } catch (err) {
        // File may not exist in cloud — ignore
        if (err.code !== 'storage/object-not-found') {
            console.warn('[cloudStorage] Delete failed:', err.message)
        }
    }
}

/**
 * Get download URL for a cloud image
 */
export async function getCloudImageUrl(userId, imageId) {
    try {
        const path = `users/${userId}/library/${imageId}`
        return await getDownloadURL(ref(storage, path))
    } catch {
        return null
    }
}

async function fetchBlobWithTimeout(url, timeoutMs = 25000) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' })
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        return await resp.blob()
    } catch (err) {
        if (err?.name === 'AbortError') {
            throw new Error(`Timeout loading image (${Math.round(timeoutMs / 1000)}s)`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

/**
 * Download ảnh từ bất kỳ URL nào thành Blob.
 * - data URL  → decode trực tiếp (không fetch, không CORS)
 * - Firebase Storage URL → dùng Firebase SDK getBlob() (auth + CORS tự động)
 * - URL khác → fetch() thông thường
 */
export async function downloadImageAsBlob(url) {
    if (!url) throw new Error('Không có URL ảnh.')

    // Data URL — decode trực tiếp
    if (url.startsWith('data:')) {
        const [header, b64] = url.split(',')
        const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        const bytes = atob(b64)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        return new Blob([arr], { type: mime })
    }

    // Firebase Storage URL — dùng SDK (xử lý auth + CORS, không bị chặn)
    if (url.includes('firebasestorage.googleapis.com') || url.includes('storage.googleapis.com')) {
        const match = url.match(/\/o\/(.+?)(\?|$)/)
        if (match) {
            const path = decodeURIComponent(match[1])
            try {
                return await getBlob(ref(storage, path))
            } catch (sdkErr) {
                try {
                    return await fetchBlobWithTimeout(url)
                } catch {
                    const code = sdkErr?.code ? `${sdkErr.code}: ` : ''
                    throw new Error(`${code}${sdkErr?.message || 'Không tải được ảnh từ Firebase Storage.'}`)
                }
            }
        }
    }

    // URL thông thường — fetch
    return await fetchBlobWithTimeout(url)
}
