/**
 * cloudStorageService.js
 * Upload/download images to Firebase Storage (cloud)
 */
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage'
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
