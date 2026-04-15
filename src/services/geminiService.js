/**
 * geminiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service gọi Google Gemini API (multimodal: text + image).
 * Dùng round-robin từ apiKeyService để rotate keys tự động.
 *
 * Gemini endpoint: https://generativelanguage.googleapis.com/v1beta/models/...
 *
 * Models đang dùng (verified):
 *   - gemini-3.1-flash-image-preview → Nano Banana 2 — text + vision + image gen (MODEL_TEXT)
 *   - gemini-3-pro-image-preview     → Nano Banana Pro — image gen chất lượng cao (MODEL_IMAGE)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getNextApiKey } from './apiKeyService'

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

// 2 model được xác nhận hoạt động:
const MODEL_TEXT  = 'gemini-3.1-flash-image-preview'  // Nano Banana 2 — text+vision (verified)
const MODEL_IMAGE = 'gemini-3-pro-image-preview'       // Nano Banana Pro — vẽ ảnh chất lượng cao

export { MODEL_TEXT }

// ── Kiểm tra lỗi có phải do model không tồn tại ──────────────────────────────
function isModelNotFoundError(status, msg) {
  if (status === 404) return true
  const m = typeof msg === 'string' ? msg.toLowerCase() : ''
  return (
    m.includes('not found') ||
    m.includes('does not exist') ||
    m.includes('is not supported') ||
    m.includes('not supported for generatecontent') ||
    m.includes('model is not available') ||
    m.includes('deprecated') ||
    m.includes('invalid model')
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Đọc File/Blob thành base64 string (không có prefix data:...)
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Xác định mimeType từ File object
 */
function getMimeType(file) {
  return file.type || 'image/jpeg'
}

/**
 * Nén ảnh xuống maxPx (cạnh dài nhất) trước khi gửi API text analysis.
 * Tránh request quá lớn khi ảnh gốc từ điện thoại (10-20MB/ảnh).
 * Trả về base64 string (không có prefix data:...).
 */
function resizeToBase64(file, maxPx = 768) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── Core call ────────────────────────────────────────────────────────────────

/**
 * Gọi Gemini API với nội dung text + (tuỳ chọn) ảnh.
 *
 * @param {object}  opts
 * @param {string}  opts.prompt        — Prompt text (bắt buộc)
 * @param {File[]}  [opts.images]      — Mảng File objects (tối đa 16 ảnh)
 * @param {string}  [opts.model]       — Model name (mặc định gemini-3.1-flash)
 * @param {number}  [opts.temperature] — 0–1, mặc định 0.3
 * @param {number}  [opts.maxTokens]   — Mặc định 8192
 * @returns {Promise<string>}           — Text response từ Gemini
 */
export async function callGemini({ prompt, images = [], model = MODEL_TEXT, temperature = 0.3, maxTokens = 8192 }) {
  const apiKey = getNextApiKey()
  if (!apiKey) {
    throw new Error('Chưa có API key nào. Vui lòng thêm key trong Cài đặt → API Keys.')
  }

  // Build parts — nén ảnh xuống 768px để tránh request quá lớn
  const parts = []

  for (const img of images) {
    const base64 = await resizeToBase64(img, 768).catch(() => fileToBase64(img))
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: base64,
      },
    })
  }

  // Thêm prompt text
  parts.push({ text: prompt })

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }

  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    let errMsg = `Gemini API lỗi (${res.status})`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson?.error?.message || errMsg
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Gemini không trả về nội dung. Hãy thử lại.')
  return text
}

// ─── Specialised wrappers ─────────────────────────────────────────────────────

/**
 * Phát hiện vật thể trong ảnh — trả về danh sách tiếng Việt.
 * Dùng OBJECT_DETECTION prompt.
 *
 * @param {File}   imageFile — Ảnh cần phân tích
 * @param {string} prompt    — OBJECT_DETECTION prompt
 * @returns {Promise<DetectedItem[]>}
 */
export async function detectObjects(imageFile, prompt) {
  const rawText = await callGemini({
    prompt,
    images: [imageFile],
    temperature: 0.2,
    maxTokens: 2048,
  })
  return parseJSON(rawText)
}

/**
 * Phân tích & trích xuất trang phục từ ảnh người mặc.
 * Dùng GARMENT_EXTRACTION master prompt.
 *
 * @param {File}   imageFile     — Ảnh người mặc đồ
 * @param {string} masterPrompt  — Master Prompt từ masterPrompts.js
 * @returns {Promise<GarmentExtractionResult>}
 */
export async function analyzeGarments(imageFile, masterPrompt) {
  const rawText = await callGemini({
    prompt: masterPrompt,
    images: [imageFile],
    temperature: 0.2,
    maxTokens: 4096,
  })
  return parseJSON(rawText)
}

/**
 * Tạo ảnh bằng Gemini Image Gen.
 * Gửi ảnh tham chiếu (nếu có) + ảnh sản phẩm + prompt → nhận lại ảnh base64.
 *
 * ★ CRITICAL: Reference images go FIRST so AI sees the face identity before anything else.
 *
 * @param {File}    imageFile       — Ảnh sản phẩm chính
 * @param {string}  itemPrompt      — Prompt mô tả
 * @param {object}  opts
 * @param {string}  opts.quality    — '1K'|'2K'|'4K'
 * @param {string}  opts.aspect     — '1:1'|'16:9'|'9:16'|'3:4'|'2:3'
 * @param {File[]}  opts.referenceFiles — Ảnh mẫu tham chiếu khuôn mặt (gửi trước product)
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
export async function generateGarmentImage(imageFile, itemPrompt, opts = {}) {
  const apiKey = getNextApiKey()
  if (!apiKey) throw new Error('Chưa có API key.')

  // Map quality to API imageSize — handles all formats:
  // '2K' (RemoveClothes), '2K (HD)' (NewDesign/Storytelling), '4K (Ultra)' etc
  const rawQuality = opts.quality || '2K'
  const sizeMatch = rawQuality.match(/([124]K)/i)
  const apiImageSize = sizeMatch ? sizeMatch[1].toUpperCase() : '2K'

  // Normalize aspect ratio format (e.g. "9:16 Dọc (Story)" → "9:16")
  const rawAspect = opts.aspect || '1:1'
  const apiAspectRatio = rawAspect.match(/\d+:\d+/)?.[0] || '1:1'

  // ★ Build image parts: REFERENCE FACES FIRST, then product image
  // This order is critical — AI prioritizes early images for identity
  const imageParts = []

  // Add reference face images FIRST (img1, img2...) for identity lock
  // Resize to 1024px max to keep payload manageable (avoids "failed to fetch" with large phone photos)
  const refFiles = opts.referenceFiles || []
  for (const refFile of refFiles) {
    const refBase64 = await resizeToBase64(refFile, 1024).catch(() => fileToBase64(refFile))
    imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: refBase64 } })
  }

  // Add product image AFTER references — also resize to avoid huge payloads
  const base64Img = await resizeToBase64(imageFile, 1024).catch(() => fileToBase64(imageFile))
  imageParts.push({ inline_data: { mime_type: 'image/jpeg', data: base64Img } })

  // Gemini Image Gen: IMAGEs before TEXT
  const body = {
    contents: [{
      role: 'user',
      parts: [
        ...imageParts,
        { text: itemPrompt },
      ],
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseModalities: ['TEXT', 'IMAGE'],
      // ★ CRITICAL: imageConfig controls actual output resolution
      // Without this, API defaults to 1K (1024px)
      imageConfig: {
        imageSize: apiImageSize,
        aspectRatio: apiAspectRatio,
      },
    },
  }

  const url = `${BASE_URL}/${MODEL_IMAGE}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    let errMsg = `Gemini Image API lỗi (${res.status})`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson?.error?.message || errMsg
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  const data = await res.json()
  const responseParts = data?.candidates?.[0]?.content?.parts || []

  for (const part of responseParts) {
    const imgData = part.inlineData || part.inline_data
    if (imgData) {
      return {
        base64: imgData.data,
        mimeType: imgData.mimeType || imgData.mime_type || 'image/jpeg',
      }
    }
  }

  throw new Error('Gemini không trả về ảnh. Hãy thử lại hoặc đổi prompt.')
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

/**
 * Parse JSON response từ Gemini (có thể có ký tự thừa bao quanh)
 * @param {string} raw
 * @returns {any}
 */
function parseJSON(raw) {
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    // Thử tìm JSON array hoặc object
    const matchArr = cleaned.match(/\[[\s\S]*\]/)
    if (matchArr) {
      try { return JSON.parse(matchArr[0]) } catch { /* fall through */ }
    }
    const matchObj = cleaned.match(/\{[\s\S]*\}/)
    if (matchObj) {
      try { return JSON.parse(matchObj[0]) } catch { /* fall through */ }
    }

    throw new Error(
      'Gemini trả về định dạng không phải JSON. Thử lại.\n\nRaw: ' +
      raw.slice(0, 300)
    )
  }
}

/**
 * @typedef {object} DetectedItem
 * @property {number} id
 * @property {string} nameVi
 * @property {string} category
 *
 * @typedef {object} GarmentItem
 * @property {number} id
 * @property {string} description
 *
 * @typedef {object} ExtractionInstruction
 * @property {number} id
 * @property {'flat-lay'|'ghost-mannequin'|'accessory'} positionStyle
 * @property {string} promptForImageGen
 *
 * @typedef {object} GarmentExtractionResult
 * @property {GarmentItem[]}            inventory
 * @property {string}                   analysisNotes
 * @property {ExtractionInstruction[]}  extractionInstructions
 */
