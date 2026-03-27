import { useState, useRef, useEffect } from 'react'
import {
  Upload, Sparkles, RotateCcw, Download, Save, Trash2, ChevronDown, X,
  Send, Plus, Image as ImageIcon, Settings2, Loader, FolderOpen, Check, Eye
} from 'lucide-react'
import SeoAeoPanel from '../components/SeoAeoPanel'
import VideoPromptPanel from '../components/VideoPromptPanel'
import Portal from '../components/Portal'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt } from '../services/masterPrompts'
import { saveToLibrary, createLibraryRecord, downloadImage, getLibraryItems, generateUniqueName, getFolders, createFolder } from '../services/libraryService'
import { POSE_LIBRARY, POSE_CATEGORIES, getAllPosesByCategory, PROMPT_TEMPLATES } from '../services/poseLibrary'
import {
  CAMERA_PRESETS, MAKEUP_STYLES, SKIN_PRESETS, KOL_COMBOS,
  findPreset, applyCombo, DEFAULT_KOL_CONFIG,
} from '../services/kolPresets'

// ─── Option Data (Auto = AI tự chọn tối ưu) ──────────────────────────────────

const AUTO = '🤖 Auto (AI tự chọn)'

const QUALITY_OPTS = [AUTO, '1K (SD)', '2K (HD)', '4K (Ultra)']
const ASPECT_OPTS = [AUTO, '1:1 Vuông', '9:16 Dọc (Story)', '16:9 Ngang', '3:4 Chân dung', '4:3 Landscape']

const MODEL_TYPES = [
  AUTO, 'Á Đông thanh lịch', 'Hàn Quốc ulzzang', 'Châu Âu cổ điển', 'Latina phóng khoáng',
  'Châu Phi hiện đại', 'Trung Đông sang trọng',
]
const BACKGROUNDS = [
  AUTO, 'Studio trắng chuyên nghiệp', 'Studio xám phẳng', 'Ngoài trời thành phố', 'Bãi biển nhiệt đới',
  'Quán cafe vintage', 'Showroom cao cấp', 'Phố cổ châu Âu', 'Vườn hoa lãng mạn',
  'Nội thất sang trọng', 'Phông nền gradient', 'Sân thượng rooftop',
]
const POSES = [
  AUTO, 'Đứng thẳng tự tin', 'Tay chống hông', 'Đi bộ catwalk', 'Ngồi ghế thanh lịch',
  'Tựa tường cool', 'Xoay nhẹ 3/4', 'Tay vuốt tóc', 'Nhảy tung tăng',
  'Ngồi bệt casual', 'Đứng nghiêng nhẹ',
]
const STYLES = [
  AUTO, 'Thời trang cao cấp', 'Street style', 'Tối giản Minimalist', 'Vintage retro',
  'Sporty năng động', 'Bohemian tự do', 'Công sở thanh lịch', 'Đồ ngủ/homewear',
  'Dạ hội/tiệc tối', 'Y2K trendy',
]
const SKIN_FILTERS = SKIN_PRESETS.map(p => p.name)
const CAMERA_FILTERS = CAMERA_PRESETS.map(p => p.name)
const MAKEUP_FILTERS = MAKEUP_STYLES.map(p => p.name)
const TONE_FILTERS = [
  AUTO, 'Warm vintage', 'Cool tone xanh', 'Pastel nhẹ nhàng', 'Moody tối',
  'Golden hour', 'Film analog', 'High contrast', 'Soft dreamy', 'Cinematic',
]

const QUICK_EDITS = [
  '✨ Nâng ngực tự nhiên', '🦵 Kéo chân dài thêm', '🌸 Da trắng hồng mịn',
  '💪 Eo thon gọn', '💇 Tóc bồng bềnh', '👁️ Mắt to sáng',
  '💋 Môi căng mọng', '🌟 Tăng độ sắc nét', '🎨 Làm nổi sản phẩm',
  '🔆 Tăng sáng tổng thể', '🌈 Màu sắc sống động', '📐 Cân đối bố cục',
]

// ─── Helper: Convert image entry to File ──────────────────────────────────────
async function entryToFile(entry, name = 'image.png') {
  if (entry.file) return entry.file
  const resp = await fetch(entry.url)
  const blob = await resp.blob()
  return new File([blob], name, { type: blob.type || 'image/png' })
}
async function entriesToFiles(entries) {
  return Promise.all(entries.map((e, i) => entryToFile(e, `img-${i}.png`)))
}

// ─── 10 Shot Variations — 5 Front/Side + 5 Rear View (Low-Angle Hack Dáng) ───
const SHOT_VARIATIONS = [
  // ===== FRONT / SIDE SHOTS (5) =====
  'Shot 1 (Front Hero): Full-body front-facing, confident natural stance with slight S-curve hip shift, one hand lightly touching thigh, sweet genuine smile, camera at eye level — classic lookbook opener showing full garment.',
  'Shot 2 (Dynamic Walk): 3/4 angle mid-stride catwalk toward camera, hair flowing with movement, fabric swaying naturally, playful confident expression, slight head tilt — energy and motion.',
  'Shot 3 (Side Profile): Full-body pure side angle, elegant posture, chin slightly lifted, one foot forward creating long leg line, hands relaxed at sides — showcase silhouette and garment drape.',
  'Shot 4 (Detail Close-up): Upper body close-up from chest to face, hands gently touching collar or earring, focus on fabric texture and skin glow, shallow depth of field bokeh — intimate product detail and beauty.',
  'Shot 5 (Editorial Finale): Artistic wide-angle composition, gentle wind blowing hair and fabric, golden-hour rim lighting, model in a graceful flowing pose with arms slightly extended — magazine-cover cinematic finale.',

  // ===== REAR VIEW SHOTS — LOW ANGLE (5) =====
  // Camera position: at KNEE or SHIN height, angled UPWARD 15-25° → legs appear extremely long and elongated

  'Shot 6 (Rear Walk Away — Forest/Street): CAMERA AT SHIN HEIGHT angled upward 20°. Full-body shot from directly behind, model walking away naturally on a beautiful path (forest trail, cobblestone street, or garden walkway). Confident balanced stride, one foot mid-step, skirt/dress swaying with each step, long hair flowing down back. Legs appear extremely long and elongated due to low camera angle. Shallow depth of field with beautiful bokeh background. Arms swinging naturally.',

  'Shot 7 (Rear Hands-Up Wall Stretch): CAMERA AT KNEE HEIGHT angled upward 25°. Model from behind with both arms raised high, hands pressing against a wall or reaching upward. Back arched slightly, standing on tiptoes. This low upward angle makes legs look incredibly long and endless. Hair cascading down back. Full body visible from feet to raised fingertips. Clean studio or minimal wall background.',

  'Shot 8 (Rear Hands-On-Hips Power): CAMERA AT KNEE HEIGHT angled upward 15°. Direct rear view, model standing with both hands on hips in a confident power pose. Feet shoulder-width apart, weight shifted slightly to one hip creating an S-curve silhouette. Low angle elongates legs dramatically. Hair resting on one shoulder. Head turned very slightly to one side but NOT looking back — pure back view showing garment fit and body proportions.',

  'Shot 9 (Rear 3/4 Over-Shoulder Glance): CAMERA AT WAIST HEIGHT angled upward 10°. Behind 3/4 angle, model pausing mid-walk and turning head to glance back over shoulder with a subtle mysterious smile. One hand touching or running through hair, other arm relaxed. Legs crossed in a model stance creating elongated leg line. Wind gently blowing fabric and hair — cinematic over-shoulder moment revealing jawline and side profile while showcasing garment back and full silhouette.',

  'Shot 10 (Rear Scenic Contemplation): CAMERA AT KNEE HEIGHT angled upward 20°. Model from behind, standing at a scenic viewpoint (railing overlooking water, balcony, rooftop, or bridge). One hand lightly resting on railing, relaxed elegant posture, gazing into the distance. Low camera angle makes legs look extremely long. Beautiful landscape/cityscape background with depth. Hair flowing in gentle breeze. Peaceful, contemplative mood — lifestyle editorial feel.',
]

// ─── Dropdown Component ───────────────────────────────────────────────────────

function Dropdown({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(p => !p)}
        className="dropdown-trigger">
        <span style={{ flex: 1, textAlign: 'left' }}>{value || placeholder}</span>
        <ChevronDown size={13} style={{ opacity: 0.4 }} />
      </button>
      {open && (
        <div className="dropdown-menu">
          {options.map(opt => (
            <button key={opt} type="button"
              className={`dropdown-item ${value === opt ? 'active' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Pill Selector ────────────────────────────────────────────────────────────

function PillSelect({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {options.map(opt => (
        <button key={opt} type="button"
          className={`pill-select ${value === opt ? 'active' : ''}`}
          onClick={() => onChange(opt)}>
          {opt}
        </button>
      ))}
    </div>
  )
}

// ─── Library Picker Modal ─────────────────────────────────────────────────────

function LibraryPickerModal({ onSelect, onClose, title }) {
  const items = getLibraryItems()
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
          <FolderOpen size={18} style={{ verticalAlign: -3 }} /> {title || 'Chọn từ Kho Thư Viện'}
        </h3>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Kho thư viện trống. Hãy tải ảnh lên hoặc tách đồ trước.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {items.map(item => (
              <div key={item.id} onClick={() => onSelect(item)}
                style={{ cursor: 'pointer', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--border)', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}>
                <img src={item.imageSrc} alt={item.name}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  )
}

// ─── Image Slot ───────────────────────────────────────────────────────────────

function ImageSlot({ src, onRemove, onPickLibrary }) {
  if (src) {
    return (
      <div className="img-slot filled">
        <img src={src} alt="" />
        <button className="img-slot-remove" onClick={onRemove}><X size={12} /></button>
      </div>
    )
  }
  return (
    <div className="img-slot empty" onClick={onPickLibrary} title="Chọn từ Kho Thư Viện">
      <Plus size={18} style={{ color: 'var(--brand)' }} />
      <span style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 2 }}>Kho</span>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ idx, imageSrc, isLoading, error, onSave, onDownload, onDelete, onEdit, onPreview, onRetry, shotDesc, onGenerateSingle }) {
  const [chatMsg, setChatMsg] = useState('')
  const refUpload = useRef()
  const isBlackImage = imageSrc && !error && !isLoading && imageSrc.length < 500
  const isReviewMode = !imageSrc && !isLoading && !error && shotDesc // ★ Review mode

  const handleQuickEdit = (label) => {
    setChatMsg(label.replace(/^[^\s]+\s/, ''))
  }

  const categoryBadge = { hook: '🎬 Hook', setup: '📷 Setup', detail: '🔍 Detail', rear: '👁️ Rear', twist: '🎭 Twist', finale: '⭐ Finale' }

  return (
    <div className="nd-result-card">
      <div className="nd-result-img-wrap">
        {isLoading ? (
          <div className="nd-result-loading">
            <Loader size={24} className="spin" style={{ color: 'var(--brand)' }} />
            <span>Đang tạo ảnh {idx + 1}...</span>
          </div>
        ) : isReviewMode ? (
          /* ═══ REVIEW MODE ═══ */
          <div className="nd-result-loading" style={{ justifyContent: 'flex-start', padding: '10px 8px', gap: 5 }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)' }}>SCENE {String(idx + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginLeft: 4 }}>- {shotDesc.title}</span>
              </div>
              <span style={{ fontSize: 8, padding: '1px 6px', borderRadius: 8, background: 'var(--brand)', color: '#fff', fontWeight: 600 }}>
                {categoryBadge[shotDesc.category] || shotDesc.category}
              </span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0, textAlign: 'left' }}>
              {shotDesc.shotDesc?.substring(0, 120)}{shotDesc.shotDesc?.length > 120 ? '...' : ''}
            </p>
            {onGenerateSingle && (
              <button onClick={onGenerateSingle} style={{
                width: '100%', background: 'linear-gradient(135deg, var(--brand), #ff8a50)', color: '#fff',
                border: 'none', borderRadius: 8, padding: '7px 0', cursor: 'pointer', fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 700, marginTop: 2
              }}>
                <Sparkles size={13} /> Tạo ảnh shot này
              </button>
            )}
            {onEdit && (
              <div style={{ width: '100%', marginTop: 2 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 3, justifyContent: 'center' }}>
                  {['🎬 Hook mạnh hơn', '📐 Đổi góc quay', '🔄 Đổi tư thế'].map(q => (
                    <button key={q} onClick={() => onEdit(q.replace(/^[^\s]+\s/, ''))}
                      style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {q}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    placeholder="Sửa mô tả shot này..."
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', outline: 'none', color: 'var(--text-primary)' }}
                    onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }} />
                  <button disabled={!chatMsg.trim()}
                    onClick={() => { if (chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }}
                    style={{ background: chatMsg.trim() ? 'var(--brand)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: chatMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}>
                    <Send size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : error ? (
          <div className="nd-result-loading">
            <span style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>❌ {error}</span>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {onRetry && (
                <button onClick={onRetry} style={{
                  background: 'var(--brand)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
                }}>
                  <RotateCcw size={12} /> Tạo lại
                </button>
              )}
            </div>
            {onEdit && (
              <div style={{ width: '100%', marginTop: 8 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4, justifyContent: 'center' }}>
                  {['😇 Giảm hở hang', '👗 Thêm áo khoác', '🌿 Pose nhẹ nhàng'].map(q => (
                    <button key={q} onClick={() => onEdit(q.replace(/^[^\s]+\s/, ''))}
                      style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                      {q}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    placeholder="Sửa yêu cầu ảnh này..."
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', outline: 'none', color: 'var(--text-primary)' }}
                    onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }} />
                  <button disabled={!chatMsg.trim()}
                    onClick={() => { if (chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }}
                    style={{ background: chatMsg.trim() ? 'var(--brand)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: chatMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : isBlackImage ? (
          <div className="nd-result-loading">
            <span style={{ color: '#f59e0b', fontSize: 12, textAlign: 'center' }}>⚠️ Ảnh bị lỗi (đen/trống)</span>
            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {onRetry && (
                <button onClick={onRetry} style={{
                  background: 'var(--brand)', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
                }}>
                  <RotateCcw size={12} /> Tạo lại
                </button>
              )}
            </div>
            {onEdit && (
              <div style={{ width: '100%', marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                    placeholder="Sửa yêu cầu..."
                    style={{ flex: 1, fontSize: 11, padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg-card)', outline: 'none', color: 'var(--text-primary)' }}
                    onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }} />
                  <button disabled={!chatMsg.trim()}
                    onClick={() => { if (chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }}
                    style={{ background: chatMsg.trim() ? 'var(--brand)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: chatMsg.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : imageSrc ? (
          <>
            <img src={imageSrc} alt={`Kết quả ${idx + 1}`} className="nd-result-img" />
            <button className="nd-preview-btn" onClick={onPreview} title="Xem phóng to">
              <Eye size={16} />
            </button>
          </>
        ) : (
          <div className="nd-result-loading">
            <ImageIcon size={28} style={{ opacity: 0.2 }} />
            <span>Ảnh {idx + 1}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {imageSrc && !isBlackImage && (
        <div className="nd-result-actions">
          <button className="icon-btn" onClick={onPreview} title="Xem phóng to"><Eye size={14} /></button>
          <button className="icon-btn" onClick={onSave} title="Lưu kho"><Save size={14} /></button>
          <button className="icon-btn" onClick={onDownload} title="Tải xuống"><Download size={14} /></button>
          {onRetry && <button className="icon-btn" onClick={onRetry} title="Tạo lại" style={{ color: '#8b5cf6' }}><RotateCcw size={14} /></button>}
          <button className="icon-btn" onClick={onDelete} title="Xóa"
            style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
        </div>
      )}

      {/* Chat / Edit area */}
      {imageSrc && !isBlackImage && (
        <div className="nd-result-chat">
          <div className="nd-quick-edits">
            {QUICK_EDITS.slice(0, 6).map(q => (
              <button key={q} className="nd-quick-btn" onClick={() => handleQuickEdit(q)}>{q}</button>
            ))}
          </div>
          <div className="nd-chat-input-wrap">
            <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
              placeholder="Yêu cầu chỉnh sửa ảnh..." className="nd-chat-input"
              onKeyDown={e => { if (e.key === 'Enter' && chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }} />
            <button className="nd-chat-send" disabled={!chatMsg.trim()}
              onClick={() => { if (chatMsg.trim()) { onEdit(chatMsg); setChatMsg('') } }}>
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Image Preview Modal (Fullscreen) ──────────────────────────────────────────

function ImagePreviewModal({ imageSrc, onClose }) {
  if (!imageSrc) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      cursor: 'zoom-out'
    }} onClick={onClose}>
      <button onClick={onClose} style={{
        position: 'fixed', top: 18, right: 24, background: 'rgba(255,255,255,0.15)',
        border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', zIndex: 10000
      }}><X size={22} /></button>
      <img src={imageSrc} alt="Preview" onClick={e => e.stopPropagation()} style={{
        maxWidth: '92vw', maxHeight: '90vh', objectFit: 'contain',
        borderRadius: 12, boxShadow: '0 8px 60px rgba(0,0,0,0.6)', cursor: 'default'
      }} />
    </div>
  )
}

// ─── Save Modal ───────────────────────────────────────────────────────────────

function SaveDesignModal({ imageSrc, projectName, onClose }) {
  const autoName = generateUniqueName({ category: 'design', description: projectName })
  const [name, setName] = useState(autoName)
  const [type, setType] = useState('product')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState(null)
  const [folders, setFolders] = useState(getFolders())
  const [selectedFolder, setSelectedFolder] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return
    const updated = createFolder(newFolderName.trim())
    setFolders(updated)
    const created = updated.find(f => f.name === newFolderName.trim())
    if (created) setSelectedFolder(created.id)
    setNewFolderName(''); setShowNewFolder(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const record = createLibraryRecord({ name: name.trim() || autoName, type, category: 'design', imageSrc, source: 'design' })
      if (selectedFolder) record.folderId = selectedFolder
      const result = await saveToLibrary(record)
      if (result.success) {
        setSaveResult('ok')
        setTimeout(() => onClose(), 1000)
      } else { setSaveResult('error') }
    } catch { setSaveResult('error') }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>💾 Lưu vào Kho</h3>
        <img src={imageSrc} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 'var(--r-sm)', background: '#f5f5f5', marginBottom: 12 }} />
        <label className="select-label">Mã định danh</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-field"
          style={{ marginBottom: 10, fontFamily: 'monospace', fontWeight: 600 }} />
        <label className="select-label">Loại</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <button className={`toggle-pill ${type === 'product' ? 'active' : ''}`} onClick={() => setType('product')}>Sản phẩm</button>
          <button className={`toggle-pill ${type === 'model' ? 'active' : ''}`} onClick={() => setType('model')}>Người mẫu</button>
        </div>
        <label className="select-label">📁 Thư mục dự án</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)} className="input-field" style={{ flex: 1 }}>
            <option value="">— Không chọn thư mục —</option>
            {folders.map(f => <option key={f.id} value={f.id}>📁 {f.name}</option>)}
          </select>
          <button className="btn btn-ghost" onClick={() => setShowNewFolder(!showNewFolder)} style={{ fontSize: 11, whiteSpace: 'nowrap' }}>+ Mới</button>
        </div>
        {showNewFolder && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input type="text" value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              placeholder="Tên thư mục mới..." className="input-field" style={{ flex: 1, fontSize: 12 }}
              onKeyDown={e => e.key === 'Enter' && handleCreateFolder()} />
            <button className="btn btn-primary" onClick={handleCreateFolder} style={{ fontSize: 11 }}>Tạo</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || saveResult === 'ok'}>
            {saving && !saveResult ? '⏳ Đang lưu...' : saveResult === 'ok' ? '✅ Đã lưu!' : saveResult === 'error' ? '❌ Lỗi — thử lại' : '💾 Lưu ngay'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function NewDesignPage() {
  // Refs
  const refFileRef = useRef()
  const productFileRef = useRef()
  const refAddRef = useRef()

  // Images
  const [refImages, setRefImages] = useState([])
  const [productImages, setProductImages] = useState([])

  // Settings — defaults ưu tiên cho user (không phải Auto)
  const [quality, setQuality] = useState('2K (HD)')
  const [aspect, setAspect] = useState('9:16 Dọc (Story)')
  const [modelType, setModelType] = useState(AUTO)
  const [background, setBackground] = useState(AUTO)
  const [pose, setPose] = useState(AUTO)
  const [style, setStyle] = useState(AUTO)
  const defaultSkin = findPreset(SKIN_PRESETS, DEFAULT_KOL_CONFIG.skinPreset)
  const [skinFilter, setSkinFilter] = useState(defaultSkin.name)
  const [toneFilter, setToneFilter] = useState('Soft dreamy')
  const [prompt, setPrompt] = useState('')
  const [projectName, setProjectName] = useState('')

  // KOL Presets (NEW)
  const [cameraPreset, setCameraPreset] = useState(findPreset(CAMERA_PRESETS, DEFAULT_KOL_CONFIG.cameraPreset).name)
  const [makeupStyle, setMakeupStyle] = useState(findPreset(MAKEUP_STYLES, DEFAULT_KOL_CONFIG.makeupStyle).name)
  const [selectedCombo, setSelectedCombo] = useState(null)

  // Results
  const [results, setResults] = useState(Array(10).fill(null))
  const [loadingIdx, setLoadingIdx] = useState(new Set())
  const [errors, setErrors] = useState({})
  const [generating, setGenerating] = useState(false)

  // ─── 3-Phase Workflow: idle → scripting → review → generating ──────────
  const [designPhase, setDesignPhase] = useState('idle')
  const [shotDescriptions, setShotDescriptions] = useState([]) // AI-generated per-shot descriptions

  // Modals
  const [saveModal, setSaveModal] = useState(null)
  const [previewImg, setPreviewImg] = useState(null)
  const [libraryPicker, setLibraryPicker] = useState(null)

  // Cached analysis for retry (avoid re-analyzing)
  const lastAnalysisRef = useRef({ extractedIdentity: '', extractedProduct: '', refFiles: [], productFiles: [], masterPrompts: [] })

  // Pose Library
  const [selectedPoses, setSelectedPoses] = useState([])
  const [poseCategory, setPoseCategory] = useState('all')
  const [poseRefImages, setPoseRefImages] = useState([])
  const [showPoseLibrary, setShowPoseLibrary] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const poseRefFileRef = useRef() // 'ref' | 'product' | null

  // ─── File handlers ────────────────────────────────────────────────────────

  const addRefImage = (files) => {
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5 - refImages.length)
    setRefImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
  }

  const addProductImage = (files) => {
    const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8 - productImages.length)
    setProductImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
  }

  // Chọn ảnh từ Kho Thư Viện
  const handleLibraryPick = (item) => {
    const entry = { url: item.imageSrc, file: null, fromLibrary: true }
    if (libraryPicker === 'ref' && refImages.length < 5) {
      setRefImages(prev => [...prev, entry])
    } else if (libraryPicker === 'product' && productImages.length < 8) {
      setProductImages(prev => [...prev, entry])
    }
    setLibraryPicker(null)
  }


  // ─── 🧠 PHASE 1: AI Script Generation — create shot descriptions ───────
  const handleGenerateScript = async () => {
    if (productImages.length === 0) return
    setDesignPhase('scripting')
    try {
      const productFiles = await entriesToFiles(productImages)
      const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
      const allImages = [...refFiles, ...productFiles]

      const scriptPrompt = `You are an elite fashion photographer planning a 10-shot editorial spread.

Analyze these images: model features, outfit details, fabric, colors, mood.

CORE DIRECTIVE: CURIOSITY-DRIVEN STORYTELLING & STRICT CONSISTENCY
You must apply deep critical thinking to craft a 10-shot narrative sequence that hooks the viewer by strategically hiding and revealing the model's face, while keeping the environment absolutely consistent.

=== CRITICAL RULES ===
1. STRICT BACKGROUND CONSISTENCY: All 10 shots MUST take place in the EXACT SAME location and lighting. Choose ONE strongly defined background and repeat it verbatim or keep it completely consistent in every shot.
2. THE CURIOSITY HOOK (Shots 1-3): Start from the BACK. Show her full body, outfit, long legs, and curves from behind. Make the audience burn with curiosity to see her face. NO frontal face shots early on.
3. THE BUILD-UP (Shots 4-6): Transition to side profiles, over-the-shoulder glances, or dynamic movements (walking, turning slightly). Keep them waiting, just glimpses of the profile.
4. THE REVEAL/CLIMAX (Shots 7-10): Finally, reveal her stunning front face. Confident strides towards the camera, close-ups, dramatic poses, and a beautiful smile or fierce look.
5. CONTINUITY: The outfit, hair, and props must remain identical across all 10 shots.

Before generating the JSON, you MUST output a <think> block where you reason about:
- What is the single unifying background for all 10 shots?
- How to structure the back -> side -> front progression?
- How to ensure the shot descriptions strictly follow the "hidden face" rule early on?

After the <think> block, return ONLY a valid JSON array with exactly 10 objects:
- "title": short Vietnamese name (2-4 words, descriptive)
- "shotDesc": detailed English shot description (full sentence, 20+ words). Must explicitly enforce the narrative arc (e.g. "shot from behind, face hidden", "side profile", "front view"). Also explicitly include the chosen consistent background here if needed to ensure the image generator keeps it.
- "category": one of "hook" (back view), "setup" (side/moving), "detail" (closeups), "rear" (low angle back), "twist", "finale" (front reveal)

${prompt ? '\nUser style note: ' + prompt : ''}

Example Output:
<think>
1. Background: Luxury minimalist museum with concrete walls...
2. Arc: Shots 1-3 from behind. Shots 4-6 side profile. Shots 7-10 front reveal...
</think>
[
  {"title":"Bóng Lưng Gợi Cảm","shotDesc":"Full body shot from completely behind, showing off curves, long legs, walking away slowly, face completely hidden, wearing the exact outfit, luxury minimalist concrete museum background","category":"hook"},
  ... exactly 10 objects ...
]

Return ONLY the <think> block followed by the JSON array.`

      const aiResponse = await callGemini({ prompt: scriptPrompt, images: allImages })
      let parsed
      try {
        const cleanedResponse = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
        const jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)```/)
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1])
        } else {
          const extractJson = cleanedResponse.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '')
          parsed = JSON.parse(extractJson)
        }
      } catch (e) {
        console.error('Failed to parse AI shot script:', e)
        alert('AI không thể tạo kịch bản. Thử lại hoặc dùng mặc định.')
        setDesignPhase('idle')
        return
      }
      if (Array.isArray(parsed) && parsed.length > 0) {
        const shots = parsed.slice(0, 10).map((s, i) => ({
          title: s.title || `Shot ${i + 1}`,
          shotDesc: s.shotDesc || SHOT_VARIATIONS[i] || '',
          category: s.category || 'setup',
        }))
        setShotDescriptions(shots)
        setDesignPhase('review')
        console.log('[Script] Generated', shots.length, 'shot descriptions — entering review phase')
      }
    } catch (err) {
      console.error('[Script Error]', err)
      alert('Lỗi tạo kịch bản: ' + err.message)
      setDesignPhase('idle')
    }
  }

  // ─── 🤖 PHASE 3a: Generate ALL images ──────────────────────────────────────

  const handleGenerate = async () => {
    if (productImages.length === 0) return
    setGenerating(true)
    setDesignPhase('generating')
    setErrors({})
    setResults(Array(10).fill(null))
    setLoadingIdx(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))

    try {
      // STEP 1: Convert all images to Files
      const productFiles = await entriesToFiles(productImages)
      const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []

      // STEP 2: Bot 1 (Identity) + Bot 2 (Garment) — PARALLEL analysis
      const [extractedIdentity, extractedProduct] = await Promise.all([
        refFiles.length > 0
          ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
          : Promise.resolve(''),
        callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
      ])

      console.log('[Bot1 Identity]', extractedIdentity?.substring(0, 120))
      console.log('[Bot2 Garment]', extractedProduct?.substring(0, 120))

      // Cache for retry
      lastAnalysisRef.current = { ...lastAnalysisRef.current, extractedIdentity, extractedProduct, refFiles, productFiles }

      // STEP 3: Build 8 Master Prompts — CREATIVE POSE SYSTEM
      // Poses = creative inspiration, NOT rigid copy
      const poseInspiration = selectedPoses.length > 0
        ? selectedPoses.map((p, i) => `\n[POSE INSPIRATION ${i + 1}/${selectedPoses.length} — Use as creative starting point, NOT exact copy]\n${p.promptEN}\nCamera angle hint: ${p.cameraAngle}\nBody focus hint: ${p.bodyFocus}`).join('\n')
        : ''
      const creativePoseRule = selectedPoses.length > 0 && selectedPoses.length < 8
        ? `\n[CREATIVE DIVERSITY RULE — CRITICAL]\nUser provided ${selectedPoses.length} pose references as INSPIRATION. You MUST create 8 UNIQUE, DIVERSE shots:\n- Use references as creative starting points — vary angles, expressions, hand positions\n- INVENT completely NEW creative poses for the remaining shots:\n  • Mix camera angles: front, 3/4, profile, over-shoulder, low angle, high angle\n  • Mix body language: walking, turning, adjusting clothes, hair flip, hand on hip, arms crossed, looking over shoulder\n  • Mix expressions: confident smile, mysterious gaze, candid laugh, serious editorial, playful wink, subtle lip bite\n  • Mix framing: full body, 3/4 body, waist up, detail close-up\n- NEVER repeat the same pose/angle/expression combination\n- Each shot = a DIFFERENT moment in a fashion editorial shoot`
        : ''
      const templateExtra = selectedTemplate ? `\nPhotography style: ${selectedTemplate.promptPrefix}` : ''

      // Resolve KOL preset prompts from selected names
      const camPreset = CAMERA_PRESETS.find(p => p.name === cameraPreset)
      const mkpPreset = MAKEUP_STYLES.find(p => p.name === makeupStyle)
      const sknPreset = SKIN_PRESETS.find(p => p.name === skinFilter)

      // Use AI-generated descriptions if in review, else fallback to hardcoded
      const shotsToUse = shotDescriptions.length >= 10
        ? shotDescriptions.map(s => s.shotDesc)
        : SHOT_VARIATIONS

      const masterPrompts = shotsToUse.map((shotDesc, idx) => {
        const combinedUserPrompt = [prompt, poseInspiration, creativePoseRule, templateExtra].filter(Boolean).join('\n')
        return buildMasterImagePrompt({
          extractedIdentity,
          extractedProduct,
          modelType, background, pose, style,
          skinFilter: sknPreset?.prompt || skinFilter,
          toneFilter,
          quality, aspect,
          userPrompt: combinedUserPrompt,
          shotDescription: shotDesc,
          cameraPreset: camPreset?.prompt || '',
          makeupStyle: mkpPreset?.prompt || '',
          referenceImages: refFiles,
        })
      })

      // Cache master prompts for retry
      lastAnalysisRef.current.masterPrompts = masterPrompts

      // STEP 4: Generate 4 images in parallel
      const mainProductFile = productFiles[0]
      const tasks = masterPrompts.map((mPrompt, idx) =>
        (async () => {
          try {
            const result = await generateGarmentImage(mainProductFile, mPrompt, {
              quality, aspect,
              referenceFiles: refFiles,  // ★ Send face references to AI
            })
            const dataUrl = `data:${result.mimeType};base64,${result.base64}`
            setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
          } catch (err) {
            console.error(`[Design Gen ${idx}]`, err)
            setErrors(prev => ({ ...prev, [idx]: err.message }))
          }
          setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
        })()
      )
      await Promise.all(tasks)
    } catch (err) {
      console.error('[Pipeline Error]', err)
      setErrors({ 0: err.message, 1: err.message, 2: err.message, 3: err.message })
      setLoadingIdx(new Set())
    }
    setGenerating(false)
  }

  // ─── 📸 PHASE 3b: Generate SINGLE shot image ────────────────────────────
  const handleGenerateSingleShot = async (idx) => {
    if (productImages.length === 0) return
    setLoadingIdx(prev => new Set(prev).add(idx))
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })
    setResults(prev => { const n = [...prev]; n[idx] = null; return n })

    try {
      let { extractedIdentity, extractedProduct, refFiles, productFiles } = lastAnalysisRef.current

      // If no cached analysis, run Bot1 + Bot2
      if (!extractedIdentity && !extractedProduct) {
        productFiles = await entriesToFiles(productImages)
        refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
        const [id, prod] = await Promise.all([
          refFiles.length > 0
            ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
            : Promise.resolve(''),
          callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
        ])
        extractedIdentity = id
        extractedProduct = prod
        lastAnalysisRef.current = { ...lastAnalysisRef.current, extractedIdentity, extractedProduct, refFiles, productFiles }
      }

      const shotDesc = shotDescriptions[idx]?.shotDesc || SHOT_VARIATIONS[idx] || ''
      const camPreset = CAMERA_PRESETS.find(p => p.name === cameraPreset)
      const mkpPreset = MAKEUP_STYLES.find(p => p.name === makeupStyle)
      const sknPreset = SKIN_PRESETS.find(p => p.name === skinFilter)

      const mPrompt = buildMasterImagePrompt({
        extractedIdentity, extractedProduct,
        modelType, background, pose, style,
        skinFilter: sknPreset?.prompt || skinFilter,
        toneFilter, quality, aspect,
        userPrompt: prompt,
        shotDescription: shotDesc,
        cameraPreset: camPreset?.prompt || '',
        makeupStyle: mkpPreset?.prompt || '',
        referenceImages: refFiles,
      })

      const mainFile = productFiles[0]
      const result = await generateGarmentImage(mainFile, mPrompt, {
        quality, aspect, referenceFiles: refFiles,
      })
      const dataUrl = `data:${result.mimeType};base64,${result.base64}`
      setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
    } catch (err) {
      console.error(`[Single Shot ${idx}]`, err)
      setErrors(prev => ({ ...prev, [idx]: err.message }))
    }
    setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
  }

  // ─── 🔄 Retry single image ──────────────────────────────────────────────────

  const handleRetryImage = async (idx) => {
    const { masterPrompts, refFiles, productFiles } = lastAnalysisRef.current
    if (!masterPrompts[idx] && productImages.length === 0) return

    setLoadingIdx(prev => new Set(prev).add(idx))
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

    try {
      let prompts = masterPrompts
      let prodFiles = productFiles
      let rFiles = refFiles

      // Re-analyze if no cached data
      if (!prompts[idx]) {
        prodFiles = await entriesToFiles(productImages)
        rFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
        const [identity, product] = await Promise.all([
          rFiles.length > 0 ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: rFiles }) : Promise.resolve(''),
          callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: prodFiles }),
        ])

        const camP = CAMERA_PRESETS.find(p => p.name === cameraPreset)
        const mkP = MAKEUP_STYLES.find(p => p.name === makeupStyle)
        const skP = SKIN_PRESETS.find(p => p.name === skinFilter)

        prompts = SHOT_VARIATIONS.map(shotDesc => {
          return buildMasterImagePrompt({
            extractedIdentity: identity, extractedProduct: product,
            modelType, background, pose, style,
            skinFilter: skP?.prompt || skinFilter, toneFilter, quality, aspect,
            userPrompt: prompt, shotDescription: shotDesc,
            cameraPreset: camP?.prompt || '', makeupStyle: mkP?.prompt || '',
            referenceImages: rFiles,
          })
        })
        lastAnalysisRef.current = { extractedIdentity: identity, extractedProduct: product, refFiles: rFiles, productFiles: prodFiles, masterPrompts: prompts }
      }

      const result = await generateGarmentImage(prodFiles[0], prompts[idx], {
        quality, aspect, referenceFiles: rFiles,
      })
      const dataUrl = `data:${result.mimeType};base64,${result.base64}`
      setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
    } catch (err) {
      console.error(`[Retry ${idx}]`, err)
      setErrors(prev => ({ ...prev, [idx]: err.message }))
    }
    setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
  }

  // ─── 🤖 BOT 7: Edit image via chat ───────────────────────────────────────

  const handleEditImage = async (idx, editPrompt) => {
    if (!results[idx]) return
    setLoadingIdx(prev => new Set(prev).add(idx))
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

    try {
      const resp = await fetch(results[idx])
      const blob = await resp.blob()
      const file = new File([blob], 'edit.png', { type: 'image/png' })

      // Bot 7: Precision Retoucher
      const retouchPrompt = `${getPrompt('BOT7_PRECISION_RETOUCHER')}\n\nUSER EDIT COMMAND: ${editPrompt}\n\nApply the edit precisely. Return the modified image.`
      const result = await generateGarmentImage(file, retouchPrompt, { quality, aspect })
      const dataUrl = `data:${result.mimeType};base64,${result.base64}`
      setResults(prev => { const n = [...prev]; n[idx] = dataUrl; return n })
    } catch (err) {
      setErrors(prev => ({ ...prev, [idx]: err.message }))
    }
    setLoadingIdx(prev => { const n = new Set(prev); n.delete(idx); return n })
  }

  const canGenerate = productImages.length > 0 && !generating

  return (
    <div className="fade-in">
      <h1 className="page-title">✨ Thiết kế mới</h1>

      <div className="nd-layout">
        {/* ═══ LEFT PANEL ═══ */}
        <div className="nd-left">

          {/* ── Step 1: Ảnh mẫu tham khảo ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">1</div>
              <div className="design-step-title">Ảnh mẫu tham khảo ({refImages.length}/5)</div>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => refFileRef.current?.click()}>
                <Upload size={13} /> Tải lên
              </button>
              <input ref={refFileRef} type="file" accept="image/*" multiple hidden
                onChange={e => addRefImage(e.target.files)} />
            </div>
            <div className="nd-img-grid">
              {refImages.map((img, i) => (
                <ImageSlot key={i} src={img.url}
                  onRemove={() => setRefImages(prev => prev.filter((_, j) => j !== i))} />
              ))}
              {refImages.length < 5 && (
                <ImageSlot onPickLibrary={() => setLibraryPicker('ref')} />
              )}
            </div>
          </div>

          {/* ── Step 2: Sản phẩm ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">2</div>
              <div className="design-step-title">Sản phẩm của bạn ({productImages.length}/8)</div>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }}
                onClick={() => productFileRef.current?.click()}>
                <Upload size={13} /> Tải lên
              </button>
              <input ref={productFileRef} type="file" accept="image/*" multiple hidden
                onChange={e => addProductImage(e.target.files)} />
            </div>
            <div className="nd-img-grid">
              {productImages.map((img, i) => (
                <ImageSlot key={i} src={img.url}
                  onRemove={() => setProductImages(prev => prev.filter((_, j) => j !== i))} />
              ))}
              {productImages.length < 8 && (
                <ImageSlot onPickLibrary={() => setLibraryPicker('product')} />
              )}
            </div>
          </div>

          {/* ── Step 2.5: Pose Library ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number" style={{ background: 'linear-gradient(135deg, #e91e63, #ff5722)' }}>P</div>
              <div className="design-step-title">📸 THƯ VIỆN TƯ THẾ (POSE)</div>
            </div>
            <div className="nd-settings-body">

              {/* Upload pose reference images */}
              <div className="form-group">
                <label className="nd-label">ẢNH TƯ THẾ THAM CHIẾU (tùy chọn)</label>
                <div className="nd-img-grid">
                  {poseRefImages.map((img, i) => (
                    <div key={i} className="img-slot filled">
                      <img src={img.url} alt="" />
                      <button className="img-slot-remove" onClick={() => setPoseRefImages(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                    </div>
                  ))}
                  {poseRefImages.length < 3 && (
                    <>
                      <div className="img-slot empty" onClick={() => setShowPoseLibrary(true)} title="Chọn từ thư viện Pose">
                        <Plus size={18} style={{ color: 'var(--brand)' }} />
                        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Kho Pose</span>
                      </div>
                    </>
                  )}
                  <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => poseRefFileRef.current?.click()}>
                    <Upload size={12} /> Tải
                  </button>
                  <input ref={poseRefFileRef} type="file" accept="image/*" multiple hidden
                    onChange={e => {
                      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/')).slice(0, 3 - poseRefImages.length)
                      setPoseRefImages(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
                    }} />
                </div>
              </div>

              {/* Selected poses display */}
              {selectedPoses.length > 0 && (
                <div className="pose-selected-card">
                  <div className="pose-selected-info">
                    <span className="pose-selected-emoji">✅ {selectedPoses.length}/9</span>
                    <div>
                      <div className="pose-selected-name">Đã chọn {selectedPoses.length} tư thế</div>
                      <div className="pose-selected-desc">{selectedPoses.map(p => p.name).join(' • ')}</div>
                    </div>
                  </div>
                  <button className="btn btn-ghost" style={{ fontSize: 11, flexShrink: 0 }}
                    onClick={() => setSelectedPoses([])}>
                    <X size={12} /> Xóa hết
                  </button>
                </div>
              )}

              {/* Pose Library toggle */}
              <button className="pose-lib-toggle" onClick={() => setShowPoseLibrary(p => !p)}>
                {showPoseLibrary ? 'Thu gọn thư viện' : `📚 Mở thư viện ${POSE_LIBRARY.length} tư thế`}
              </button>

              {/* Pose Library grid */}
              {showPoseLibrary && (
                <div className="pose-library">
                  {/* Category tabs */}
                  <div className="pose-categories">
                    {POSE_CATEGORIES.map(cat => (
                      <button key={cat.id}
                        className={`pose-cat-btn${poseCategory === cat.id ? ' active' : ''}`}
                        onClick={() => setPoseCategory(cat.id)}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* Pose cards with images */}
                  <div className="pose-grid">
                    {getAllPosesByCategory(poseCategory).map(p => {
                      const isSelected = selectedPoses.some(sp => sp.id === p.id)
                      return (
                        <div key={p.id}
                          className={`pose-card${isSelected ? ' selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedPoses(prev => prev.filter(sp => sp.id !== p.id))
                            } else if (selectedPoses.length < 9) {
                              setSelectedPoses(prev => [...prev, p])
                            }
                          }}>
                          <img src={p.thumbnail} alt={p.name} className="pose-card-img" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                          <div className="pose-card-emoji-fallback" style={{ display: 'none' }}>{p.emoji}</div>
                          <div className="pose-card-name">{p.name}</div>
                          <div className="pose-card-focus">{p.bodyFocus}</div>
                          {isSelected && <div className="pose-card-check">✅</div>}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                    💡 Chọn tối đa 9 tư thế — mỗi ảnh đầu ra sẽ sử dụng 1 tư thế khác nhau
                  </div>
                </div>
              )}

              {/* Prompt Template quick select */}
              <div className="form-group">
                <label className="nd-label">PHONG CÁCH CHỤP</label>
                <div className="pose-templates">
                  {PROMPT_TEMPLATES.map(t => (
                    <button key={t.id}
                      className={`pose-tpl-btn${selectedTemplate?.id === t.id ? ' active' : ''}`}
                      onClick={() => setSelectedTemplate(selectedTemplate?.id === t.id ? null : t)}
                      title={t.description}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Step 3: Cài đặt ── */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">3</div>
              <div className="design-step-title">Tùy chọn thiết kế</div>
            </div>
            <div className="nd-settings-body">

              {/* Project name */}
              <div className="form-group">
                <label className="nd-label">TÊN DỰ ÁN / MÃ VIDEO</label>
                <input type="text" className="nd-input" value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="VD: BST Xuân 2026 / VID-001" />
              </div>

              {/* Quality + Aspect */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">CHẤT LƯỢNG ẢNH</label>
                  <Dropdown options={QUALITY_OPTS} value={quality} onChange={setQuality} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">TỶ LỆ KHUNG HÌNH</label>
                  <Dropdown options={ASPECT_OPTS} value={aspect} onChange={setAspect} placeholder="Chọn..." />
                </div>
              </div>

              {/* Model + Background */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">KIỂU MODEL</label>
                  <Dropdown options={MODEL_TYPES} value={modelType} onChange={setModelType} placeholder="Chọn kiểu model..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">PHÔNG NỀN</label>
                  <Dropdown options={BACKGROUNDS} value={background} onChange={setBackground} placeholder="Chọn phông nền..." />
                </div>
              </div>

              {/* Pose + Style */}
              <div className="nd-row-2">
                <div className="form-group">
                  <label className="nd-label">TƯ THẾ</label>
                  <Dropdown options={POSES} value={pose} onChange={setPose} placeholder="Chọn..." />
                </div>
                <div className="form-group">
                  <label className="nd-label">PHONG CÁCH</label>
                  <Dropdown options={STYLES} value={style} onChange={setStyle} placeholder="Chọn..." />
                </div>
              </div>

              {/* KOL COMBO — Quick Select */}
              <div className="form-group">
                <label className="nd-label">🎯 KOL COMBO <span style={{ color: 'var(--brand)', fontSize: 10 }}>chọn combo = auto-fill tất cả</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {KOL_COMBOS.map(combo => (
                    <button key={combo.id} type="button"
                      className={`pill-select ${selectedCombo === combo.id ? 'active' : ''}`}
                      title={combo.description + '\n\n👉 ' + combo.recommended}
                      onClick={() => {
                        if (selectedCombo === combo.id) {
                          setSelectedCombo(null)
                        } else {
                          setSelectedCombo(combo.id)
                          const applied = applyCombo(combo.id)
                          if (applied) {
                            setCameraPreset(findPreset(CAMERA_PRESETS, applied.cameraPreset).name)
                            setSkinFilter(findPreset(SKIN_PRESETS, applied.skinPreset).name)
                            setMakeupStyle(findPreset(MAKEUP_STYLES, applied.makeupStyle).name)
                          }
                        }
                      }}>
                      {combo.emoji} {combo.name.replace(/^[^—]+— /, '')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Camera Preset */}
              <div className="form-group">
                <label className="nd-label">📷 MÁY ẢNH / CAMERA</label>
                <Dropdown options={CAMERA_FILTERS} value={cameraPreset} onChange={v => { setCameraPreset(v); setSelectedCombo(null) }} placeholder="Chọn camera..." />
              </div>

              {/* Makeup Style */}
              <div className="form-group">
                <label className="nd-label">💄 TRANG ĐIỂM / MAKEUP</label>
                <PillSelect options={MAKEUP_FILTERS} value={makeupStyle} onChange={v => { setMakeupStyle(v); setSelectedCombo(null) }} />
              </div>

              {/* Skin Filter — always visible */}
              <div className="form-group">
                <label className="nd-label">🎨 TONE DA / SKIN</label>
                <PillSelect options={SKIN_FILTERS} value={skinFilter} onChange={v => { setSkinFilter(v); setSelectedCombo(null) }} />
              </div>

              {/* Tone Filter — always visible */}
              <div className="form-group">
                <label className="nd-label">🌈 TONE MÀU / COLOR FILTER</label>
                <PillSelect options={TONE_FILTERS} value={toneFilter} onChange={setToneFilter} />
              </div>

              {/* User prompt — luôn ưu tiên */}
              <div className="form-group">
                <label className="nd-label">📝 MÔ TẢ THÊM <span style={{ color: 'var(--brand)', fontWeight: 800 }}>(ƯU TIÊN CAO NHẤT)</span></label>
                <textarea className="nd-textarea"
                  placeholder="VD: Model tóc dài, tay cầm túi, ánh sáng golden hour, zoom vào chi tiết thêu..."
                  value={prompt} onChange={e => setPrompt(e.target.value)} />
              </div>

              {/* Generate buttons — phase-aware */}
              {designPhase === 'review' && shotDescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="nd-generate-btn" onClick={handleGenerate}
                    disabled={!canGenerate || generating}
                    style={{ background: generating ? undefined : 'linear-gradient(135deg, #10b981, #059669)' }}>
                    {generating ? (
                      <><Loader size={18} className="spin" /> Đang tạo 10 ảnh...</>
                    ) : (
                      <><Sparkles size={18} /> 🚀 Tạo TẤT CẢ 10 ảnh cùng lúc</>
                    )}
                  </button>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                    💡 Hoặc bấm <strong>"📸 Tạo ảnh shot này"</strong> trên từng ô kết quả bên phải.
                  </p>
                </div>
              ) : designPhase === 'scripting' ? (
                <button className="nd-generate-btn" disabled>
                  <Loader size={18} className="spin" /> 🧠 AI đang tạo kịch bản 10 shot...
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="nd-generate-btn" onClick={handleGenerateScript}
                    disabled={productImages.length === 0}
                    style={{ background: productImages.length > 0 ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : undefined }}>
                    <Sparkles size={18} /> 🧠 Tạo Kịch Bản 10 Shot (AI suy luận)
                  </button>
                  <button className="nd-generate-btn" onClick={handleGenerate}
                    disabled={!canGenerate}
                    style={{ background: canGenerate ? undefined : undefined, opacity: canGenerate ? 0.8 : 0.4, fontSize: 13 }}>
                    {generating ? (
                      <><Loader size={18} className="spin" /> Đang tạo 10 ảnh...</>
                    ) : (
                      <><Sparkles size={16} /> Tạo nhanh 10 ảnh (bỏ qua kịch bản)</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Results ═══ */}
        <div className="nd-right">
          <div className="design-step" style={{ height: '100%' }}>
            <div className="design-step-header">
              <div className="design-step-number">4</div>
              <div className="design-step-title">Kết quả ({results.filter(Boolean).length}/10)</div>
            </div>
            <div className="nd-results-grid">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(idx => (
                <ResultCard key={idx} idx={idx}
                  imageSrc={results[idx]}
                  isLoading={loadingIdx.has(idx)}
                  error={errors[idx]}
                  shotDesc={shotDescriptions[idx] || null}
                  onPreview={() => setPreviewImg(results[idx])}
                  onSave={() => setSaveModal(results[idx])}
                  onDownload={() => downloadImage(results[idx], `${projectName || 'design'}-${idx + 1}`)}
                  onDelete={() => setResults(prev => { const n = [...prev]; n[idx] = null; return n })}
                  onEdit={(msg) => handleEditImage(idx, msg)}
                  onRetry={() => handleRetryImage(idx)}
                  onGenerateSingle={() => handleGenerateSingleShot(idx)}
                />
              ))}
            </div>

            {/* ═══ Video Prompt Panel ═══ */}
            {shotDescriptions.length > 0 && <VideoPromptPanel shotDescriptions={shotDescriptions} />}

            {/* ═══ SEO & AEO Panel ═══ */}
            <SeoAeoPanel
              images={results}
              productContext={lastAnalysisRef.current?.extractedProduct || ''}
              shotDescriptions={shotDescriptions}
            />
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {saveModal && (
        <Portal>
          <SaveDesignModal imageSrc={saveModal} projectName={projectName}
            onClose={() => setSaveModal(null)} />
        </Portal>
      )}

      {/* Library Picker Modal */}
      {libraryPicker && (
        <Portal>
          <LibraryPickerModal
            title={libraryPicker === 'ref' ? 'Chọn ảnh mẫu từ Kho' : 'Chọn sản phẩm từ Kho'}
            onClose={() => setLibraryPicker(null)}
            onSelect={handleLibraryPick}
          />
        </Portal>
      )}

      {/* Image Preview Modal */}
      {previewImg && (
        <Portal>
          <ImagePreviewModal imageSrc={previewImg} onClose={() => setPreviewImg(null)} />
        </Portal>
      )}
    </div>
  )
}
