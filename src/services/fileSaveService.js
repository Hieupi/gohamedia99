/**
 * fileSaveService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gọi API local (Vite dev middleware) để lưu ảnh vào ổ đĩa thật.
 * 
 * 2 thư mục:
 *   ① Download → D:\00 VIBE CODING\Goha Studio Donwload
 *   ② Kho      → <project>/public/kho
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_SAVE = '/__api/save-image'

/**
 * Lưu ảnh base64 vào ổ đĩa thật qua Vite server middleware.
 * @param {string} dataUrl   — data:image/png;base64,... hoặc data:image/jpeg;base64,...
 * @param {string} fileName  — Tên file (VD: "ÁO-crop-top-1234.png")
 * @param {'download'|'kho'} target — Thư mục đích
 * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
 */
export async function saveImageToDisk(dataUrl, fileName, target = 'download') {
    try {
        const res = await fetch(API_SAVE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl, fileName, target }),
        })
        return await res.json()
    } catch (err) {
        console.error('[fileSaveService] error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Lưu ảnh vào thư mục Download
 */
export async function saveToDownloadFolder(dataUrl, fileName) {
    return saveImageToDisk(dataUrl, fileName, 'download')
}

/**
 * Lưu ảnh vào thư mục Kho (public/kho)
 */
export async function saveToKhoFolder(dataUrl, fileName) {
    return saveImageToDisk(dataUrl, fileName, 'kho')
}
