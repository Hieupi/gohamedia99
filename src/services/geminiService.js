/**
 * geminiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Service gọi Google Gemini API (multimodal: text + image).
 * Dùng round-robin từ apiKeyService để rotate keys tự động.
 *
 * Gemini endpoint: https://generativelanguage.googleapis.com/v1beta/models/...
 *
 * Models (verified from nano-banana-2 CLI source):
 *   - gemini-3.1-flash-image-preview → Nano Banana 2 (text+vision+image gen)
 *   - gemini-3-pro-image-preview     → Nano Banana Pro (highest quality)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getNextApiKey } from './apiKeyService'

// ─── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL_FLASH = 'gemini-3.1-flash-image-preview'  // Nano Banana 2
const MODEL_IMAGE = 'gemini-3.1-flash-image-preview'  // Same model for image gen

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
export async function callGemini({ prompt, images = [], model = MODEL_FLASH, temperature = 0.3, maxTokens = 8192 }) {
  const apiKey = getNextApiKey()
  if (!apiKey) {
    throw new Error('Chưa có API key nào. Vui lòng thêm key trong Cài đặt → API Keys.')
  }

  // Build parts
  const parts = []

  // Thêm ảnh trước (best practice multimodal)
  for (const img of images) {
    const base64 = await fileToBase64(img)
    parts.push({
      inline_data: {
        mime_type: getMimeType(img),
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

  // Lấy text từ response
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
 * Tạo ảnh sản phẩm tách đồ bằng Gemini Image Gen.
 * Gửi ảnh gốc + prompt mô tả item → nhận lại ảnh base64.
 *
 * @param {File}    imageFile  — Ảnh gốc (reference)
 * @param {string}  itemPrompt — Prompt mô tả item cần tách
 * @param {object}  opts
 * @param {string}  opts.quality  — '1K'|'2K'|'4K'
 * @param {string}  opts.aspect   — '1:1'|'16:9'|'9:16'|'3:4'|'2:3'
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
export async function generateGarmentImage(imageFile, itemPrompt, opts = {}) {
  const apiKey = getNextApiKey()
  if (!apiKey) throw new Error('Chưa có API key.')

  const base64Img = await fileToBase64(imageFile)
  const mime = getMimeType(imageFile)

  // Gemini Image Gen: IMAGE phải trước TEXT
  const body = {
    contents: [{
      role: 'user',
      parts: [
        { inline_data: { mime_type: mime, data: base64Img } },
        { text: itemPrompt },
      ],
    }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseModalities: ['TEXT', 'IMAGE'],
    },
  }

  const url = `${BASE_URL}/${MODEL_IMAGE}:generateContent?key=${apiKey}`

  console.log('[GarmentGen] Calling model:', MODEL_IMAGE, '| prompt length:', itemPrompt.length)

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    console.error('[GarmentGen] API Error:', res.status, errText)
    let errMsg = `Gemini Image API lỗi (${res.status})`
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson?.error?.message || errMsg
    } catch { /* ignore */ }
    throw new Error(errMsg)
  }

  const data = await res.json()
  console.log('[GarmentGen] Response candidates:', data?.candidates?.length)

  const parts = data?.candidates?.[0]?.content?.parts || []

  // Tìm phần image trong response
  for (const part of parts) {
    if (part.inlineData) {
      return {
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png',
      }
    }
    if (part.inline_data) {
      return {
        base64: part.inline_data.data,
        mimeType: part.inline_data.mime_type || 'image/png',
      }
    }
  }

  // Log full response nếu không tìm thấy ảnh
  console.error('[GarmentGen] No image in response. Parts:', JSON.stringify(parts).slice(0, 500))
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
