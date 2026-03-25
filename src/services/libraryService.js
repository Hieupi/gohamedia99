/**
 * libraryService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Quản lý kho ảnh — thumbnail localStorage, ảnh gốc IndexedDB.
 * Thư mục dự án, subfolder, kéo thả, source tagging.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { saveOriginalImage, deleteOriginalImage } from './imageStorageService'
import { saveToDownloadFolder, saveToKhoFolder } from './fileSaveService'

const STORAGE_KEY = 'goha_studio_library'
const FOLDERS_KEY = 'goha_studio_folders'

// ─── Resize ───────────────────────────────────────────────────────────────────

export function resizeForStorage(dataUrl, maxSize = 800) {
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
                resolve(canvas.toDataURL('image/jpeg', 0.82))
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

// ─── Smart Name ───────────────────────────────────────────────────────────────

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
    while (existing.some(i => i.name === candidate)) { attempt++; candidate = `${p}-${desc}-${time}${rand}${attempt}` }
    return candidate
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveToLibrary(record) {
    // Giữ bản gốc để lưu vào Kho disk
    const originalSrc = record.imageSrc
    try {
        if (record.imageSrc && record.imageSrc.startsWith('data:')) {
            await saveOriginalImage(record.id, record.imageSrc)
            record.imageSrc = await resizeForStorage(record.imageSrc, 800)
        }
        const items = getLibraryItems()
        const exists = items.findIndex(i => i.id === record.id)
        if (exists >= 0) { items[exists] = { ...items[exists], ...record } }
        else { items.unshift(record) }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))

        // ★ Auto-save bản gốc vào public/kho
        if (originalSrc && originalSrc.startsWith('data:')) {
            saveToKhoFolder(originalSrc, record.name || record.id).catch(err =>
                console.warn('[saveToLibrary] Kho disk save failed:', err.message)
            )
        }

        return { success: true, items }
    } catch (err) {
        console.error('saveToLibrary error:', err)
        if (err.name === 'QuotaExceededError' || err.code === 22) {
            try {
                record.imageSrc = await resizeForStorage(record.imageSrc, 400)
                const items = getLibraryItems(); items.unshift(record)
                localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
                return { success: true, items }
            } catch { return { success: false, error: 'localStorage đã đầy.' } }
        }
        return { success: false, error: err.message }
    }
}

// ─── Delete / Like ────────────────────────────────────────────────────────────

export function deleteFromLibrary(id) {
    const items = getLibraryItems().filter(i => i.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    deleteOriginalImage(id)
    return items
}

export function toggleLikeInLibrary(id) {
    const items = getLibraryItems().map(i => i.id === id ? { ...i, liked: !i.liked } : i)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return items
}

// ─── Record builder (with source tag) ─────────────────────────────────────────

export function createLibraryRecord({ name, type, category, imageSrc, source, folderId }) {
    return {
        id: `kho-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: name || 'Không tên',
        type: type || 'product',
        category: category || 'other',
        source: source || 'manual',  // 'design' | 'storytelling' | 'extract' | 'manual'
        imageSrc,
        folderId: folderId || null,
        liked: false,
        createdAt: new Date().toISOString(),
    }
}

// ─── Download ─────────────────────────────────────────────────────────────────

export function downloadImage(dataUrl, fileName) {
    const fullName = `${fileName || 'goha-studio'}-${Date.now()}.png`
    const a = document.createElement('a')
    a.href = dataUrl; a.download = fullName
    document.body.appendChild(a); a.click(); document.body.removeChild(a)

    // ★ Auto-save vào thư mục Download cố định
    saveToDownloadFolder(dataUrl, fullName).catch(err =>
        console.warn('[downloadImage] Disk save failed:', err.message)
    )
}

/**
 * Download ảnh chất lượng HD gốc từ IndexedDB.
 * Nếu IndexedDB không có, fallback sang thumbnail trong localStorage.
 * ★ Tự động lưu vào thư mục Download cố định.
 */
export async function downloadHDImage(itemId, itemImageSrc, fileName) {
    try {
        const { getOriginalImage } = await import('./imageStorageService')
        const hdSrc = await getOriginalImage(itemId)
        const src = hdSrc || itemImageSrc
        const fullName = `${fileName || 'goha-studio'}-${Date.now()}.png`

        // Browser download
        const a = document.createElement('a')
        a.href = src; a.download = fullName
        document.body.appendChild(a); a.click(); document.body.removeChild(a)

        // ★ Auto-save vào thư mục Download cố định
        saveToDownloadFolder(src, fullName).catch(err =>
            console.warn('[downloadHDImage] Disk save failed:', err.message)
        )
    } catch {
        downloadImage(itemImageSrc, fileName)
    }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export function getStorageUsage() {
    let total = 0
    for (let key in localStorage) { if (localStorage.hasOwnProperty(key)) total += localStorage[key].length * 2 }
    return { usedMB: (total / 1024 / 1024).toFixed(2), maxMB: 5, percent: Math.round((total / (5 * 1024 * 1024)) * 100) }
}

// ═══ FOLDERS ══════════════════════════════════════════════════════════════════

export function getFolders() {
    try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) || '[]') }
    catch { return [] }
}

export function createFolder(name, parentId = null) {
    const folders = getFolders()
    if (folders.some(f => f.name === name && f.parentId === parentId)) return folders
    folders.push({
        id: `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name, parentId,
        createdAt: new Date().toISOString(),
    })
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    return folders
}

export function deleteFolder(folderId) {
    const allFolders = getFolders()
    const toDelete = new Set([folderId])
    let changed = true
    while (changed) {
        changed = false
        allFolders.forEach(f => {
            if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
                toDelete.add(f.id); changed = true
            }
        })
    }
    const folders = allFolders.filter(f => !toDelete.has(f.id))
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders))
    const items = getLibraryItems().map(i => toDelete.has(i.folderId) ? { ...i, folderId: null } : i)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return folders
}

export function moveItemToFolder(itemId, folderId) {
    const items = getLibraryItems().map(i => i.id === itemId ? { ...i, folderId: folderId || null } : i)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    return items
}

export function moveFolderInto(folderId, targetParentId) {
    if (folderId === targetParentId) return getFolders()
    const folders = getFolders()
    let check = targetParentId
    while (check) {
        if (check === folderId) return folders
        const parent = folders.find(f => f.id === check)
        check = parent?.parentId || null
    }
    const updated = folders.map(f => f.id === folderId ? { ...f, parentId: targetParentId || null } : f)
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(updated))
    return updated
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
            if (current.length === 0 && oldItems.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(oldItems))
            localStorage.removeItem(oldKey)
        } catch { /* ignore */ }
    }
}
