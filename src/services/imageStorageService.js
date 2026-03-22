/**
 * imageStorageService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lưu ảnh chất lượng gốc vào IndexedDB (không giới hạn 5MB như localStorage).
 * Thumbnail nhỏ vẫn lưu localStorage để hiển thị grid.
 * Preview/Download dùng ảnh gốc từ IndexedDB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DB_NAME = 'goha_studio_images'
const DB_VERSION = 1
const STORE_NAME = 'originals'

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
            const db = req.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
    })
}

/** Lưu ảnh gốc full-quality vào IndexedDB */
export async function saveOriginalImage(id, dataUrl) {
    try {
        const db = await openDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put({ id, dataUrl, savedAt: Date.now() })
        await new Promise((resolve, reject) => {
            tx.oncomplete = resolve
            tx.onerror = reject
        })
    } catch (err) {
        console.error('IndexedDB save error:', err)
    }
}

/** Lấy ảnh gốc từ IndexedDB */
export async function getOriginalImage(id) {
    try {
        const db = await openDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(id)
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result?.dataUrl || null)
            req.onerror = () => resolve(null)
        })
    } catch {
        return null
    }
}

/** Xóa ảnh gốc khỏi IndexedDB */
export async function deleteOriginalImage(id) {
    try {
        const db = await openDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(id)
    } catch (err) {
        console.error('IndexedDB delete error:', err)
    }
}

/** Lấy tất cả IDs có trong IndexedDB */
export async function getAllOriginalIds() {
    try {
        const db = await openDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).getAllKeys()
        return new Promise((resolve) => {
            req.onsuccess = () => resolve(req.result || [])
            req.onerror = () => resolve([])
        })
    } catch {
        return []
    }
}

/**
 * Lưu ảnh vào filesystem thật qua File System Access API (Chrome/Edge).
 * Tạo thư mục con nếu cần.
 * Returns: { success, filePath } hoặc null nếu user cancel / browser không hỗ trợ.
 */
export async function saveToFilesystem(dataUrl, fileName, folderName) {
    // Check browser support
    if (!window.showSaveFilePicker) {
        // Fallback: download
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = fileName || 'image.png'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        return { success: true, method: 'download' }
    }

    try {
        const handle = await window.showSaveFilePicker({
            suggestedName: fileName || 'image.png',
            types: [{
                description: 'PNG Image',
                accept: { 'image/png': ['.png'] },
            }],
        })
        const writable = await handle.createWritable()
        const response = await fetch(dataUrl)
        const blob = await response.blob()
        await writable.write(blob)
        await writable.close()
        return { success: true, method: 'filesystem', name: handle.name }
    } catch (err) {
        if (err.name === 'AbortError') return null // User cancelled
        console.error('File save error:', err)
        return { success: false, error: err.message }
    }
}
