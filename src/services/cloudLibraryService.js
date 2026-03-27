/**
 * cloudLibraryService.js
 * Sync library metadata to Firestore (cloud) for cross-device persistence
 */
import { doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, collection, query, serverTimestamp } from 'firebase/firestore'
import { db } from './firebaseConfig'
import { uploadImageToCloud, deleteImageFromCloud } from './cloudStorageService'

// ─── Sync a single library item to cloud ──────────────────────────────────────
export async function syncItemToCloud(userId, item) {
    if (!userId || !item?.id) return

    try {
        // Upload image if it's a data URL (not already a cloud URL)
        let cloudImageUrl = item.imageSrc
        if (item.imageSrc && item.imageSrc.startsWith('data:')) {
            const url = await uploadImageToCloud(userId, item.id, item.imageSrc)
            if (url) cloudImageUrl = url
        }

        // Save metadata to Firestore
        const ref = doc(db, 'users', userId, 'library', item.id)
        await setDoc(ref, {
            name: item.name || 'Không tên',
            type: item.type || 'product',
            category: item.category || 'other',
            source: item.source || 'manual',
            imageSrc: cloudImageUrl,
            folderId: item.folderId || null,
            liked: item.liked || false,
            createdAt: item.createdAt || new Date().toISOString(),
            syncedAt: serverTimestamp(),
        }, { merge: true })

        return cloudImageUrl
    } catch (err) {
        console.warn('[cloudSync] Sync failed for', item.id, err.message)
        return null
    }
}

// ─── Get all cloud library items ──────────────────────────────────────────────
export async function getCloudLibraryItems(userId) {
    if (!userId) return []
    try {
        const snap = await getDocs(collection(db, 'users', userId, 'library'))
        return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    } catch (err) {
        console.warn('[cloudSync] Fetch failed:', err.message)
        return []
    }
}

// ─── Delete item from cloud ───────────────────────────────────────────────────
export async function deleteCloudItem(userId, itemId) {
    if (!userId || !itemId) return
    try {
        await deleteDoc(doc(db, 'users', userId, 'library', itemId))
        await deleteImageFromCloud(userId, itemId)
    } catch (err) {
        console.warn('[cloudSync] Delete failed:', err.message)
    }
}

// ─── Toggle like in cloud ─────────────────────────────────────────────────────
export async function toggleCloudLike(userId, itemId, liked) {
    if (!userId || !itemId) return
    try {
        await updateDoc(doc(db, 'users', userId, 'library', itemId), { liked })
    } catch (err) {
        console.warn('[cloudSync] Like toggle failed:', err.message)
    }
}

// ─── Sync folders to cloud ────────────────────────────────────────────────────
export async function syncFoldersToCloud(userId, folders) {
    if (!userId) return
    try {
        await setDoc(doc(db, 'users', userId, 'settings', 'folders'), {
            data: folders,
            syncedAt: serverTimestamp(),
        })
    } catch (err) {
        console.warn('[cloudSync] Folders sync failed:', err.message)
    }
}

// ─── Get cloud folders ────────────────────────────────────────────────────────
export async function getCloudFolders(userId) {
    if (!userId) return []
    try {
        const snap = await getDoc(doc(db, 'users', userId, 'settings', 'folders'))
        return snap.exists() ? snap.data().data || [] : []
    } catch {
        return []
    }
}

// ─── Bulk sync: push all local items to cloud ─────────────────────────────────
export async function bulkSyncToCloud(userId, items, folders) {
    if (!userId) return { synced: 0, failed: 0 }
    let synced = 0, failed = 0

    for (const item of items) {
        try {
            await syncItemToCloud(userId, item)
            synced++
        } catch {
            failed++
        }
    }

    if (folders?.length) {
        await syncFoldersToCloud(userId, folders)
    }

    return { synced, failed }
}
