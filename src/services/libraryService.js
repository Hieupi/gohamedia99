/**
 * libraryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Quản lý kho ảnh — lưu/đọc/xóa từ localStorage + tải file xuống local.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const STORAGE_KEY = 'goha_studio_library'

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getLibraryItems() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
        return []
    }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export function saveToLibrary(record) {
    const items = getLibraryItems()
    // Tránh trùng id
    const exists = items.findIndex(i => i.id === record.id)
    if (exists >= 0) {
        items[exists] = { ...items[exists], ...record }
    } else {
        items.unshift(record)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return items
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
        type: type || 'product',  // 'product' | 'model'
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
