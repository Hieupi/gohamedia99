/**
 * libraryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Quản lý kho ảnh — thumbnail lưu localStorage, ảnh gốc lưu IndexedDB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { saveOriginalImage, deleteOriginalImage } from './imageStorageService'

const STORAGE_KEY = 'goha_studio_library'

// ─── Resize Helper ────────────────────────────────────────────────────────────

export function resizeForStorage(dataUrl, maxSize = 400) {
    return new Promise((resolve) => {
        if (!dataUrl || !dataUrl.startsWith('data:')) { resolve(dataUrl); return }
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
            } catch { resolve(dataUrl) }
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
    })
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getLibraryItems() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch { return [] }
}

// ─── Smart Unique Name Generator ──────────────────────────────────────────────

const CATEGORY_PREFIXES = {
    top: 'ÁO', bottom: 'QUẦN', dress: 'ĐẦM', outerwear: 'KHOÁC',
    shoes: 'GIÀY', bag: 'TÚI', accessory: 'PKIỆN', model: 'MẪU',
    background: 'NỀN', other: 'SP', design: 'DESIGN', pose: 'POSE',
}

export function generateUniqueName({ category, description, prefix } = {}) {
    const existing = getLibraryItems()
    const p = prefix || CATEGORY_PREFIXES[category] || 'SP'
    let desc = (description || '').replace(/^(Áo|Quần|Đầm|Giày|Túi|Mũ|Váy)\s*/i, '').trim()
    if (desc.length > 20) desc = desc.slice(0, 20).trim()
    if (!desc) desc = p === 'DESIGN' ? 'Mới' : 'Item'
    const now = new Date()
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0')
    const rand = Math.random().toString(36).slice(2, 4)
    let candidate = `${p}-${desc}-${time}${rand}`
    let attempt = 0
    while (existing.some(i => i.name === candidate)) {
        attempt++
        candidate = `${p}-${desc}-${time}${rand}${attempt}`
    }
    return candidate
}

// ─── Write (IndexedDB cho ảnh gốc + localStorage cho thumbnail) ───────────────

export async function saveToLibrary(record) {
    try {
        // 1) Lưu ảnh GỐC vào IndexedDB (full quality cho preview)
        if (record.imageSrc && record.imageSrc.startsWith('data:')) {
            await saveOriginalImage(record.id, record.imageSrc)
            // 2) Resize xuống thumbnail cho localStorage
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
    deleteOriginalImage(id) // Xóa ảnh gốc khỏi IndexedDB
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

// ─── Build record ─────────────────────────────────────────────────────────────

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

// ─── Download ─────────────────────────────────────────────────────────────────

export function downloadImage(dataUrl, fileName) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${fileName || 'goha-studio'}-${Date.now()}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
}

// ─── Storage usage ────────────────────────────────────────────────────────────

export function getStorageUsage() {
    let total = 0
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) total += localStorage[key].length * 2
    }
    return { usedMB: (total / 1024 / 1024).toFixed(2), maxMB: 5, percent: Math.round((total / (5 * 1024 * 1024)) * 100) }
}

// ─── Project Folders ──────────────────────────────────────────────────────────

const FOLDERS_KEY = 'goha_studio_folders'

export function getFolders() {
    try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]') }
    catch { return [] }
}

export function createFolder(name) {
    const folders = getFolders()
    if (folders.some(f => f.name === name)) return folders
    folders.push({
        id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name,
        createdAt: new Date().toISOString(),
    })
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    return folders
}

export function deleteFolder(folderId) {
    const folders = getFolders().filter(f => f.id !== folderId)
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    const items = getLibraryItems().map(i =>
        i.folderId === folderId ? { ...i, folderId: null } : i
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return folders
}

export function getItemsByFolder(folderId) {
    return getLibraryItems().filter(i => i.folderId === folderId)
}

// ─── Migrate ──────────────────────────────────────────────────────────────────

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
