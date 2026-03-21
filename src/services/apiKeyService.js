/**
 * apiKeyService.js
 * Quản lý danh sách Gemini API Keys với round-robin auto-rotation.
 * Lưu trong localStorage — không gửi lên server.
 */

const STORAGE_KEY = 'fsa_api_keys'
const INDEX_KEY   = 'fsa_api_key_index'

// ---------- helpers ----------

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function save(keys) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

function getIndex() {
  return parseInt(localStorage.getItem(INDEX_KEY) || '0', 10)
}

function saveIndex(i) {
  localStorage.setItem(INDEX_KEY, String(i))
}

// ---------- public API ----------

/** Trả về toàn bộ list key (object: { id, label, key, active, addedAt, requestCount }) */
export function getApiKeys() {
  return load()
}

/** Thêm key mới. Trả về list mới. */
export function addApiKey(keyStr, label = '') {
  const keys = load()

  // Kiểm tra trùng
  if (keys.some(k => k.key === keyStr.trim())) {
    throw new Error('Key này đã tồn tại trong danh sách.')
  }
  if (!keyStr.trim()) {
    throw new Error('Key không được để trống.')
  }

  const newKey = {
    id:           Date.now().toString(),
    label:        label.trim() || `Key ${keys.length + 1}`,
    key:          keyStr.trim(),
    active:       true,
    addedAt:      new Date().toISOString(),
    requestCount: 0,
  }

  const updated = [...keys, newKey]
  save(updated)
  return updated
}

/** Xóa key theo id. Trả về list mới. */
export function removeApiKey(id) {
  const keys = load().filter(k => k.id !== id)
  save(keys)
  // Reset index nếu vượt
  const active = keys.filter(k => k.active)
  if (active.length === 0) saveIndex(0)
  else saveIndex(getIndex() % active.length)
  return keys
}

/** Toggle active/inactive cho key. */
export function toggleApiKey(id) {
  const keys = load().map(k => k.id === id ? { ...k, active: !k.active } : k)
  save(keys)
  return keys
}

/** Cập nhật label của key. */
export function updateApiKeyLabel(id, label) {
  const keys = load().map(k => k.id === id ? { ...k, label } : k)
  save(keys)
  return keys
}

/**
 * Lấy API key kế tiếp theo round-robin.
 * Chỉ xoay trong các key đang active.
 * Tăng requestCount. Trả về string key hoặc null nếu không có key nào.
 */
export function getNextApiKey() {
  const keys = load()
  const active = keys.filter(k => k.active)
  if (active.length === 0) return null

  let idx = getIndex() % active.length
  const chosen = active[idx]

  // Tăng requestCount
  const updated = keys.map(k =>
    k.id === chosen.id ? { ...k, requestCount: (k.requestCount || 0) + 1 } : k
  )
  save(updated)

  // Chuyển sang key kế tiếp
  saveIndex((idx + 1) % active.length)

  return chosen.key
}

/** Xóa toàn bộ keys. */
export function clearAllApiKeys() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(INDEX_KEY)
  return []
}

/** Mask key để hiển thị an toàn (chỉ lộ 4 ký tự cuối) */
export function maskKey(key) {
  if (!key || key.length < 8) return '••••••••'
  return '••••••••••••' + key.slice(-4)
}
