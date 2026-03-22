/**
 * libraryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Quản lý kho ảnh — lưu/đọc/xóa từ localStorage + tải file xuống local.
 * FIX: Tự động resize ảnh trước khi lưu để tránh tràn localStorage (5MB limit)
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'goha_studio_library'

// ─── Resize Helper (tránh tràn localStorage) ──────────────────────────────────

export function resizeForStorage(dataUrl, maxSize = 400) {
    return new Promise((resolve) => {
        if (!dataUrl || !dataUrl.startsWith('data:')) {
            resolve(dataUrl)
            return
        }
        const img = new Image()
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas')
                let w = img.width, h = img.height
                if (w > maxSize || h > maxSize) {
                    if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
                    else { w = Math.round(w * maxSize / h); h = maxSize }
                }
                canvas.width = w; canvas.height = h
                canvas.getContext('2d').drawImage(img, 0, 0, w, h)
                resolve(canvas.toDataURL('image/jpeg', 0.65))
            } catch {
                resolve(dataUrl)
            }
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
    })
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getLibraryItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

// ─── Write (có resize + try/catch) ────────────────────────────────────────────

export async function saveToLibrary(record) {
    try {
        // Resize ảnh trước khi lưu (400px max → ~20-40KB thay vì 2-5MB)
        if (record.imageSrc && record.imageSrc.startsWith('data:')) {
            record.imageSrc = await resizeForStorage(record.imageSrc, 400)
        }

        const items = getLibraryItems()
        const exists = items.findIndex(i => i.id === record.id)
        if (exists >= 0) {
            items[exists] = { ...items[exists], ...record }
        } else {
            items.unshift(record)
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
        return { success: true, items }
    } catch (err) {
        console.error('saveToLibrary error:', err)
        // Nếu vẫn tràn, thử resize nhỏ hơn nữa
        if (err.name === 'QuotaExceededError' || err.code === 22) {
            try {
                record.imageSrc = await resizeForStorage(record.imageSrc, 200)
                const items = getLibraryItems()
                items.unshift(record)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
                return { success: true, items }
            } catch {
                return { success: false, error: 'Bộ nhớ localStorage đã đầy. Hãy xóa bớt ảnh trong Thư viện.' }
            }
        }
        return { success: false, error: err.message }
    }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function deleteFromLibrary(id) {
    const items = getLibraryItems().filter(i => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return items
}

// ─── Toggle Like ──────────────────────────────────────────────────────────────

export function toggleLikeInLibrary(id) {
    const items = getLibraryItems().map(i =>
        i.id === id ? { ...i, liked: !i.liked } : i
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return items
}

// ─── Build record from garment extraction ─────────────────────────────────────

export function createLibraryRecord({ name, type, category, imageSrc }) {
    return {
        id: `kho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name || 'Không tên',
        type: type || 'product',
        category: category || 'other',
        imageSrc,
        liked: false,
        createdAt: new Date().toISOString(),
    }
}

// ─── Download ảnh ra file ─────────────────────────────────────────────────────

export function downloadImage(dataUrl, fileName) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${fileName || 'goha-studio'}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

// ─── Storage usage info ───────────────────────────────────────────────────────

export function getStorageUsage() {
    let total = 0
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += localStorage[key].length * 2
        }
    }
    return {
        usedMB: (total / 1024 / 1024).toFixed(2),
        maxMB: 5,
        percent: Math.round((total / (5 * 1024 * 1024)) * 100)
    }
}

// ─── Migrate from old key ─────────────────────────────────────────────────────

export function migrateOldLibrary() {
    const oldKey = 'fashionStudio_library'
    const old = localStorage.getItem(oldKey)
    if (old) {
        try {
            const oldItems = JSON.parse(old)
            const current = getLibraryItems()
            if (current.length === 0 && oldItems.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(oldItems))
            }
            localStorage.removeItem(oldKey)
        } catch { /* ignore */ }
    }
}
