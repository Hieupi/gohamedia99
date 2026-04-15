import { useState, useRef, useEffect } from 'react'
import {
    Upload, Sparkles, Download, Save, Trash2, X, Send, Plus,
    Image as ImageIcon, Loader, FolderOpen, Eye, GripVertical,
    ChevronDown, Film, BookOpen, PlusCircle, Check, RotateCcw
} from 'lucide-react'
import SeoAeoPanel from '../components/SeoAeoPanel'
import LibraryPickerModal from '../components/LibraryPickerModal'
import VideoPromptPanel from '../components/VideoPromptPanel'
import Portal from '../components/Portal'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt, VN_DNA_DEFAULTS } from '../services/masterPrompts'
import { downloadImage, getLibraryItems, saveToLibrary, createLibraryRecord, generateUniqueName } from '../services/libraryService'
import { POSE_LIBRARY, POSE_CATEGORIES, getAllPosesByCategory, PROMPT_TEMPLATES } from '../services/poseLibrary'
import {
    CAMERA_PRESETS, MAKEUP_STYLES, SKIN_PRESETS, KOL_COMBOS,
    findPreset, applyCombo, DEFAULT_KOL_CONFIG,
} from '../services/kolPresets'

// ─── Options ──────────────────────────────────────────────────────────────────
const QUALITY_OPTS = ['2K (HD)', '1K (SD)', '4K (Ultra)']
const ASPECT_OPTS = ['9:16 Dọc (Story)', '4:5 Dọc (IG)', '1:1 Vuông', '16:9 Ngang', '3:4 Chân dung']
const SKIN_OPTS = SKIN_PRESETS.map(p => p.name)
const CAMERA_OPTS = CAMERA_PRESETS.map(p => p.name)
const MAKEUP_OPTS = MAKEUP_STYLES.map(p => p.name)
const TONE_OPTS = ['🤖 Auto', 'Soft dreamy', 'Warm vintage', 'Cool tone xanh', 'Golden hour', 'Film analog', 'Cinematic', 'Pastel nhẹ nhàng']

const ST_SAVE_KEY = 'goha_storytelling_state'

function loadSavedState() {
    try { return JSON.parse(localStorage.getItem(ST_SAVE_KEY)) || {} } catch { return {} }
}

// ─── Story Templates (9 scenes each for maximum diversity) ────────────────────
const STORY_TEMPLATES = [
    {
        id: 'motorbike',
        name: '🏍️ Lái xe máy',
        description: 'Cô gái trẻ với xe máy trên đường quê, golden hour — 9 cảnh × 3s',
        scenes: [
            { title: 'Hero đứng cạnh xe', pose: 'Standing upright beside the scooter, one hand on seat, slight hip shift, confident smile, full-body front-facing', camera: 'Full-body shot from feet up, scooter visible behind her', emotion: 'Confident, bright, cheerful' },
            { title: 'Cận mặt + xe', pose: 'Leaning forward on scooter handlebars with both arms, chin resting on hands, sweet coy smile looking at camera, hair flowing to one side', camera: 'Close-up face and upper body, scooter handlebars visible', emotion: 'Sweet, intimate, charming' },
            { title: 'Ngồi bấm điện thoại', pose: 'Sitting relaxed on scooter seat, legs crossed, one hand holding phone close to face reading a message, playful charming expression', camera: 'Eye level, slightly tilted, encompassing subject and scooter', emotion: 'Relaxed, playful, modern' },
            { title: 'Selfie trước xe', pose: 'Standing in front of scooter wearing helmet, one hand holding phone high for selfie, other hand on hip, leaning slightly forward, mischievous smile', camera: "Bird's eye view from phone perspective, panoramic from face downward", emotion: 'Fun, youthful, social media vibe' },
            { title: 'Quay lưng kéo áo', pose: 'Back view standing beside scooter, both hands at waist pulling shirt hem slightly, looking over shoulder at camera with coy smile, hair cascading down back', camera: 'Full-body back view, scooter beside her', emotion: 'Flirty, artistic, body-focused' },
            { title: 'Ngồi tinh nghịch', pose: 'Sitting sideways on seat, one hand on handlebars, head tilted to side looking away dreamily, playful expression, legs dangling', camera: 'Full-body close-up with scooter and background', emotion: 'Dreamy, captivating, artistic' },
            { title: 'Cận mặt dễ thương', pose: 'Sitting on scooter, hand touching chin/lips, looking to the side with sweet coy smile, hair flowing', camera: 'Close-up upper body and face, shallow DOF bokeh', emotion: 'Sweet, charming, intimate' },
            { title: 'Lái xe trên đường', pose: 'Riding scooter on road, helmet on, hands on handlebars, slight smile, hair and clothes flowing in wind, dynamic motion', camera: 'Front view at eye level from road, wide cinematic shot', emotion: 'Free, adventurous, cinematic' },
            { title: 'Golden hour finale', pose: 'Standing beside scooter at golden hour, arms stretched wide, head tilted back, hair flowing in warm wind, ethereal silhouette with rim lighting', camera: 'Wide angle artistic composition, golden backlight', emotion: 'Freedom, euphoria, cinematic finale' },
        ]
    },
    {
        id: 'cafe',
        name: '☕ Cafe chiều',
        description: 'Buổi chiều thư giãn tại quán cafe vintage — 9 cảnh × 3s',
        scenes: [
            { title: 'Bước vào quán', pose: 'Walking through cafe entrance, pushing glass door open, slight turn back at camera with sweet smile, hair flowing with movement', camera: 'Full-body from inside cafe looking toward entrance', emotion: 'Anticipation, elegant arrival' },
            { title: 'Đứng ngắm quán', pose: 'Standing inside cafe, one hand touching chin contemplating, looking around at the vintage decor, natural relaxed stance', camera: 'Wide shot showing cafe interior and model', emotion: 'Curious, appreciative' },
            { title: 'Chọn chỗ ngồi', pose: 'Standing by window table, hand touching chair back, looking down at the seat deciding, hip shifted, natural stance', camera: '3/4 angle showing cafe interior and window light', emotion: 'Casual, contemplative' },
            { title: 'Đọc menu', pose: 'Sitting at table, holding menu with both hands, looking down at it with interested expression, gentle smile', camera: 'Waist-up from across table, warm bokeh background', emotion: 'Curious, relaxed' },
            { title: 'Selfie tại bàn', pose: 'Holding phone up for selfie at the table, peace sign with other hand, cute pouty expression, coffee shop background visible', camera: 'Selfie angle from phone perspective', emotion: 'Playful, social, fun' },
            { title: 'Thưởng thức đồ uống', pose: 'Holding coffee cup with both hands near face, eyes closed in enjoyment, gentle steam visible, serene expression', camera: 'Close-up face and hands with cup, shallow DOF', emotion: 'Blissful, cozy, warm' },
            { title: 'Chụp ảnh đồ uống', pose: 'Holding phone above coffee cup taking photo for social media, bird eye view of table setup, concentrated cute expression', camera: 'Over-shoulder angle showing phone and table', emotion: 'Modern, social, creative' },
            { title: 'Ngắm ra cửa sổ', pose: 'Chin resting on hand, gazing out window with dreamy far-away look, golden light on face, coffee cup in front', camera: 'Side profile with window light, cinematic wide', emotion: 'Peaceful, dreamy, golden hour' },
            { title: 'Tạm biệt quán', pose: 'Standing at cafe door looking back inside with nostalgic sweet smile, hand on door frame, warm backlight creating silhouette', camera: 'Inside looking out, artistic backlit composition', emotion: 'Grateful, warm, bittersweet finale' },
        ]
    },
    {
        id: 'shopping',
        name: '🛍️ Đi mua sắm',
        description: 'Một ngày shopping tại trung tâm thương mại — 9 cảnh × 3s',
        scenes: [
            { title: 'Bước vào mall', pose: 'Walking confidently through mall entrance, shopping bags in hand, hair flowing, bright smile, one hand pushing hair back', camera: 'Full-body front facing, mall interior behind', emotion: 'Excited, confident' },
            { title: 'Escalator selfie', pose: 'Standing on escalator, phone held up for selfie, looking at screen with cute expression, mall levels visible behind', camera: 'Selfie perspective from phone', emotion: 'Fun, modern, social' },
            { title: 'Xem đồ trên kệ', pose: 'Standing at clothing rack, one hand touching fabric, head tilted examining the garment, thoughtful expression', camera: '3/4 angle showing clothes rack and model', emotion: 'Curious, interested' },
            { title: 'Thử đồ trước gương', pose: 'Standing before full-length mirror, holding outfit against body, turning slightly, checking reflection with pleased smile', camera: 'Mirror reflection shot showing both model and reflection', emotion: 'Happy, deciding' },
            { title: 'Selfie phòng thử đồ', pose: 'In fitting room, new outfit on, phone held up for mirror selfie, confident pose, peace sign', camera: 'Mirror selfie perspective from phone', emotion: 'Proud, fun, sharing moment' },
            { title: 'Catwalk hành lang', pose: 'Walking down mall corridor like a catwalk, one hand on hip, chin up, confident strut, shopping bags swinging, hair bouncing', camera: 'Full-body from front, corridor stretching behind', emotion: 'Sassy, confident, main character energy' },
            { title: 'Nghỉ ngơi ăn kem', pose: 'Sitting at food court bench, legs crossed, eating ice cream, playful expression, shopping bags beside her', camera: 'Eye level lifestyle shot with mall background', emotion: 'Relaxed, sweet, enjoying' },
            { title: 'Khoe chiến lợi phẩm', pose: 'Sitting on bench, holding up a shopping bag showing the brand, other bags around her, excited proud expression looking at camera', camera: 'Medium shot, lifestyle angle', emotion: 'Triumphant, proud, showing off' },
            { title: 'Ra về hạnh phúc', pose: 'Walking out of mall doors, multiple shopping bags, big genuine smile, sunset light behind, looking back at camera with wave', camera: 'Full-body from outside, golden hour backlight', emotion: 'Satisfied, glowing, cinematic finale' },
        ]
    },
    {
        id: 'gym',
        name: '💪 Phòng gym',
        description: 'Buổi tập tại gym, năng động khỏe khoắn — 9 cảnh × 3s',
        scenes: [
            { title: 'Đến gym', pose: 'Walking into gym entrance with gym bag, wearing tight workout outfit, confident energetic smile, hair in ponytail', camera: 'Full-body front facing at gym entrance', emotion: 'Motivated, energetic, ready' },
            { title: 'Warm up stretching', pose: 'Standing stretching one arm across body, other hand pulling elbow, feet hip-width apart, looking at camera with determined smile', camera: 'Full-body 3/4 angle, gym equipment visible', emotion: 'Focused, warming up' },
            { title: 'Squat position', pose: 'Mid-squat position with perfect form, hands clasped in front, back arched, butt pushed back and down, focused expression', camera: 'Side angle showing squat form, glutes emphasized', emotion: 'Strong, powerful, concentrated' },
            { title: 'Tạo dáng với tạ', pose: 'Holding dumbbells at sides, standing with hip shifted, slight arm flex, confident smirk looking at camera, athletic stance', camera: 'Full-body front 3/4, mirrors behind showing reflection', emotion: 'Strong, confident, fierce' },
            { title: 'Selfie gương gym', pose: 'Mirror selfie in gym, phone held up, flexing one arm subtly, body turned slightly to show curves in workout gear, smirk', camera: 'Mirror reflection, gym equipment in background', emotion: 'Proud, confident, showing progress' },
            { title: 'Nghỉ giữa set', pose: 'Sitting on gym bench, one hand holding water bottle, other hand wiping forehead with towel, breathing visible, glowing skin from sweat', camera: 'Close-up upper body, gym background bokeh', emotion: 'Exhausted but satisfied, raw beauty' },
            { title: 'Plank position', pose: 'In forearm plank position on yoga mat, perfect straight body line, looking forward with fierce determination, core engaged', camera: 'Low angle from floor level showing body line', emotion: 'Powerful, determined, strong' },
            { title: 'Quay lưng khoe body', pose: 'Back view standing, both hands on waist pulling up shirt edge slightly, showing defined lower back and waist-to-hip curve, looking over shoulder', camera: 'Full-body back view, gym mirrors behind', emotion: 'Proud, body-confident, alluring' },
            { title: 'After-workout glow', pose: 'Leaning against gym wall, towel around neck, water bottle in hand, hair slightly messy from workout, serene accomplished smile, skin glowing', camera: 'Waist-up portrait, soft gym lighting', emotion: 'Accomplished, glowing, peaceful finale' },
        ]
    },
    {
        id: 'custom',
        name: '✏️ Tự tạo kịch bản',
        description: 'Tạo câu chuyện riêng của bạn — tùy ý số cảnh × 3s',
        scenes: []
    },
]

// ─── Scene Card Component (with Retry + Chat Edit) ────────────────────────────

const SCENE_QUICK_EDITS = [
    '✨ Da trắng hơn', '💋 Môi căng mọng', '👀 Mắt to sáng',
    '🌟 Sắc nét hơn', '📸 Nổi sản phẩm', '🔆 Tăng sáng',
]

function SceneCard({ scene, index, imageSrc, isLoading, error, onPreview, onRemove, onSave, onDownload, isCustom, onRetry, onEdit, onGenerateSingle }) {
    const [chatMsg, setChatMsg] = useState('')
    const isBlackImage = imageSrc && !error && !isLoading && imageSrc.length < 500
    const isReviewMode = !imageSrc && !isLoading && !error // ★ Review mode: script ready, no image yet

    return (
        <div className="st-scene-card">
            <div className="st-scene-header">
                <span className="st-scene-number">{index + 1}</span>
                <span className="st-scene-title">
                    <span style={{ color: 'var(--brand)', marginRight: 4 }}>SCENE {String(index + 1).padStart(2, '0')}</span>
                    - {scene.title}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>3s</span>
                {isCustom && (
                    <button className="st-scene-remove" onClick={onRemove} title="Xóa cảnh"><X size={14} /></button>
                )}
            </div>
            <div className="st-scene-img-wrap">
                {isLoading ? (
                    <div className="st-scene-placeholder">
                        <Loader size={24} className="spin" style={{ color: 'var(--brand)' }} />
                        <span>Đang tạo cảnh {index + 1}...</span>
                    </div>
                ) : isReviewMode && scene.pose ? (
                    /* ═══ REVIEW MODE ═══ Script ready, show description + generate button */
                    <div className="st-scene-placeholder" style={{ justifyContent: 'flex-start', padding: '10px 8px', gap: 6 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, textAlign: 'left', width: '100%' }}>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: 10 }}>📐 Pose:</strong>{' '}
                                <span style={{ fontSize: 10 }}>{scene.pose?.substring(0, 80)}{scene.pose?.length > 80 ? '...' : ''}</span>
                            </div>
                            <div style={{ marginBottom: 4 }}>
                                <strong style={{ color: 'var(--text-primary)', fontSize: 10 }}>🎥 Camera:</strong>{' '}
                                <span style={{ fontSize: 10 }}>{scene.camera}</span>
                            </div>
                            <div>
                                <strong style={{ color: 'var(--text-primary)', fontSize: 10 }}>😊 Cảm xúc:</strong>{' '}
                                <span style={{ fontSize: 10 }}>{scene.emotion}</span>
                            </div>
                        </div>

                        {/* Per-scene generate button */}
                        {onGenerateSingle && (
                            <button onClick={onGenerateSingle} style={{
                                width: '100%', background: 'linear-gradient(135deg, var(--brand), #ff8a50)', color: '#fff',
                                border: 'none', borderRadius: 8, padding: '7px 0', cursor: 'pointer', fontSize: 11,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontWeight: 700,
                                marginTop: 4
                            }}>
                                <Sparkles size={13} /> Tạo ảnh cảnh này
                            </button>
                        )}

                        {/* Edit chat for review */}
                        {onEdit && (
                            <div style={{ width: '100%', marginTop: 4 }}>
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
                                        placeholder="Sửa kịch bản cảnh này..."
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
                    <div className="st-scene-placeholder">
                        <span style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>❌ {error}</span>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            {onRetry && (
                                <button onClick={onRetry} style={{
                                    background: 'var(--brand)', color: '#fff', border: 'none',
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                                }}>
                                    <RotateCcw size={12} /> Tạo lại
                                </button>
                            )}
                        </div>
                        {onEdit && (
                            <div style={{ width: '100%', marginTop: 8, padding: '0 4px' }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4, justifyContent: 'center' }}>
                                    {['😇 Giảm hở hang', '👗 Thêm áo khoác', '🌿 Pose nhẹ nhàng hơn'].map(q => (
                                        <button key={q} onClick={() => onEdit(q.replace(/^[^\s]+\s/, ''))}
                                            style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                            {q}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                                        placeholder="Sửa kịch bản cảnh này..."
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
                ) : isBlackImage ? (
                    <div className="st-scene-placeholder">
                        <span style={{ color: '#f59e0b', fontSize: 12, textAlign: 'center' }}>⚠️ Ảnh bị lỗi (đen/trống)</span>
                        <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                            {onRetry && (
                                <button onClick={onRetry} style={{
                                    background: 'var(--brand)', color: '#fff', border: 'none',
                                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11,
                                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600
                                }}>
                                    <RotateCcw size={12} /> Tạo lại
                                </button>
                            )}
                        </div>
                        {onEdit && (
                            <div style={{ width: '100%', marginTop: 6, padding: '0 4px' }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                                        placeholder="Sửa kịch bản..."
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
                ) : imageSrc ? (
                    <img src={imageSrc} alt={scene.title} className="st-scene-img" />
                ) : (
                    <div className="st-scene-placeholder">
                        <Film size={28} style={{ opacity: 0.2 }} />
                        <span>{scene.title}</span>
                    </div>
                )}
            </div>

            {/* Action buttons */}
            {imageSrc && !isBlackImage && (
                <div style={{ display: 'flex', gap: 4, padding: '4px 6px', justifyContent: 'center', background: 'var(--bg-elevated)', flexWrap: 'wrap' }}>
                    <button onClick={onPreview} title="Xem phóng to" style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Eye size={12} /> Xem
                    </button>
                    <button onClick={onSave} title="Lưu vào kho" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Save size={12} /> Lưu
                    </button>
                    <button onClick={onDownload} title="Tải xuống" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Download size={12} /> Tải
                    </button>
                    {onRetry && (
                        <button onClick={onRetry} title="Tạo lại cảnh này" style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <RotateCcw size={12} /> Lại
                        </button>
                    )}
                </div>
            )}

            {/* Chat Edit area — appears when image exists */}
            {imageSrc && !isBlackImage && onEdit && (
                <div style={{ padding: '4px 6px 6px', background: 'var(--bg-elevated)', borderRadius: '0 0 8px 8px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                        {SCENE_QUICK_EDITS.map(q => (
                            <button key={q} onClick={() => onEdit(q.replace(/^[^\s]+\s/, ''))}
                                style={{ fontSize: 9, padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                {q}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <input type="text" value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                            placeholder="Yêu cầu chỉnh sửa ảnh..."
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

            <div className="st-scene-meta">
                <div><strong>Pose:</strong> {scene.pose?.substring(0, 60)}...</div>
                <div><strong>Cảm xúc:</strong> {scene.emotion}</div>
            </div>
        </div>
    )
}

// ─── Image Preview Modal ──────────────────────────────────────────────────────

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

// ─── Library Picker Modal ─────────────────────────────────────────────────────

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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function StorytellingPage() {
    const refFileRef = useRef()
    const productFileRef = useRef()
    const poseRefFileRef = useRef()
    const bgFileRef = useRef()

    // Images
    const [refImages, setRefImages] = useState([])
    const [productImages, setProductImages] = useState([])
    const [bgImages, setBgImages] = useState([])

    const isRemixMode = bgImages.length > 0

    // Story
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [scenes, setScenes] = useState([])
    const [storyContext, setStoryContext] = useState('')

    // Pose Library
    const [selectedPoses, setSelectedPoses] = useState([])
    const [poseCategory, setPoseCategory] = useState('all')
    const [poseRefImages, setPoseRefImages] = useState([])
    const [showPoseLibrary, setShowPoseLibrary] = useState(false)

    // Settings
    const saved = loadSavedState()
    const [quality, setQuality] = useState(saved.quality || '2K (HD)')
    const [aspect, setAspect] = useState(saved.aspect || '9:16 Dọc (Story)')
    const [skinFilter, setSkinFilter] = useState(saved.skinFilter || findPreset(SKIN_PRESETS, DEFAULT_KOL_CONFIG.skinPreset).name)
    const [toneFilter, setToneFilter] = useState(saved.toneFilter || 'Soft dreamy')
    const [cameraPreset, setCameraPreset] = useState(findPreset(CAMERA_PRESETS, DEFAULT_KOL_CONFIG.cameraPreset).name)
    const [makeupStyle, setMakeupStyle] = useState(findPreset(MAKEUP_STYLES, DEFAULT_KOL_CONFIG.makeupStyle).name)
    const [selectedCombo, setSelectedCombo] = useState(null)

    // Auto-analyze
    const [analyzing, setAnalyzing] = useState(false)

    // ─── 3-Phase Workflow: idle → scripting → review → generating ──────────
    // 'idle'       = no script yet
    // 'scripting'  = AI generating script
    // 'review'     = script ready, user can review/edit before generating images
    // 'generating' = images being generated
    const [scriptPhase, setScriptPhase] = useState('idle')

    // Generation
    const [results, setResults] = useState({})
    const [loadingSet, setLoadingSet] = useState(new Set())
    const [errors, setErrors] = useState({})
    const [generating, setGenerating] = useState(false)

    // Modals
    const [previewImg, setPreviewImg] = useState(null)
    const [libraryPicker, setLibraryPicker] = useState(null)

    // Cached analysis for retry/edit (avoid re-analyzing)
    const lastAnalysisRef = useRef({ extractedIdentity: '', extractedProduct: '', extractedBackground: '', refFiles: [], productFiles: [], bgFiles: [] })

    // ─── Auto-save settings to localStorage ────────────────────────────────────
    useEffect(() => {
        const state = { quality, aspect, skinFilter, toneFilter, storyContext }
        try { localStorage.setItem(ST_SAVE_KEY, JSON.stringify(state)) } catch { }
    }, [quality, aspect, skinFilter, toneFilter, storyContext])

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const selectTemplate = (tpl) => {
        setSelectedTemplate(tpl)
        setScenes([...tpl.scenes])
        setResults({})
        setErrors({})
        if (tpl.scenes.length > 0) setScriptPhase('review')
    }

    const addScene = () => {
        setScenes(prev => [...prev, {
            title: `Cảnh ${prev.length + 1}`,
            pose: '',
            camera: '',
            emotion: 'Natural, genuine'
        }])
    }

    const updateScene = (idx, field, value) => {
        setScenes(prev => {
            const n = [...prev]
            n[idx] = { ...n[idx], [field]: value }
            return n
        })
    }

    const removeScene = (idx) => {
        setScenes(prev => prev.filter((_, i) => i !== idx))
    }

    const addRefImage = (files) => {
        const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5 - refImages.length)
        setRefImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const addProductImage = (files) => {
        const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8 - productImages.length)
        setProductImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const addBgImage = (files) => {
        const newImgs = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 3 - bgImages.length)
        setBgImages(prev => [...prev, ...newImgs.map(f => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const handleLibraryPick = (item) => {
        if (libraryPicker === 'ref') {
            setRefImages(prev => [...prev, { url: item.imageSrc }].slice(0, 5))
        } else if (libraryPicker === 'bg') {
            setBgImages(prev => [...prev, { url: item.imageSrc }].slice(0, 3))
        } else {
            setProductImages(prev => [...prev, { url: item.imageSrc }].slice(0, 8))
        }
        setLibraryPicker(null)
    }

    // Apply pose from library to a specific scene
    const applyPoseToScene = (sceneIdx, pose) => {
        updateScene(sceneIdx, 'pose', pose.promptEN)
        updateScene(sceneIdx, 'camera', pose.cameraAngle)
        updateScene(sceneIdx, 'emotion', 'Confident, alluring')
    }

    // Toggle pose in multi-select (max 9)
    const togglePose = (pose) => {
        setSelectedPoses(prev => {
            const exists = prev.some(p => p.id === pose.id)
            if (exists) return prev.filter(p => p.id !== pose.id)
            if (prev.length >= 9) return prev
            return [...prev, pose]
        })
    }

    // ─── Auto-analyze images to generate 9-scene script ─────────────────────

    const handleAutoAnalyze = async () => {
        if (productImages.length === 0) return
        setAnalyzing(true)
        try {
            const productFiles = await entriesToFiles(productImages)
            const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
            const bgFiles = bgImages.length > 0 ? await entriesToFiles(bgImages) : []
            const allImages = [...refFiles, ...productFiles, ...bgFiles]

            // REMIX: Analyze real background in parallel
            let extractedBackground = lastAnalysisRef.current.extractedBackground || ''
            if (bgFiles.length > 0 && !extractedBackground) {
                try {
                    extractedBackground = await callGemini({ prompt: getPrompt('BOT_BG_ANALYZER'), images: bgFiles })
                    lastAnalysisRef.current.extractedBackground = extractedBackground
                    lastAnalysisRef.current.bgFiles = bgFiles
                } catch (e) { console.warn('[BG Analyzer ST]', e) }
            }

            const remixContext = isRemixMode && extractedBackground
                ? `\n\n=== REAL BACKGROUND (REMIX MODE) ===\n${extractedBackground}\nAll 9 scenes MUST take place in this real store/showroom. Design poses that naturally showcase the KOL in this real commercial space.\n===`
                : ''

            const analyzePrompt = `You are an elite fashion content director creating VIRAL TikTok/Reels videos.

Analyze these images carefully — model, outfit, accessories, setting, mood.

CORE DIRECTIVE: CURIOSITY-DRIVEN STORYTELLING & STRICT CONSISTENCY
You must apply deep critical thinking to craft a 9-scene narrative arc that hooks the viewer by strategically hiding and revealing the model's face, while keeping the environment absolutely consistent.

=== CRITICAL RULES ===
1. STRICT BACKGROUND CONSISTENCY: All 9 scenes MUST take place in the EXACT SAME location and lighting. Choose ONE strongly defined background and repeat it verbatim or keep it completely consistent in every scene.
2. THE CURIOSITY HOOK (Scenes 1-3): Start from the BACK. Show her full body, outfit, long legs, and curves from behind. Make the audience burn with curiosity to see her face. NO frontal face shots early on.
3. THE BUILD-UP (Scenes 4-6): Transition to side profiles, over-the-shoulder glances, or dynamic movements (walking, turning slightly). Keep them waiting, just glimpses of the profile.
4. THE REVEAL/CLIMAX (Scenes 7-9): Finally, reveal her stunning front face. Confident strides towards the camera, dramatic poses, and a beautiful smile or fierce look.
5. CONTINUITY: The outfit, hair, and props must remain identical across all 9 scenes.

Before generating the JSON, you MUST output a <think> block where you reason about:
- What is the single unifying background for all 9 scenes?
- How to structure the back -> side -> front progression?
- How to ensure the pose descriptions strictly follow the "hidden face" rule early on?

After the <think> block, return ONLY a valid JSON array with exactly 9 objects:
- "title": short Vietnamese scene name (2-4 words)
- "pose": detailed English pose description (full sentence, 20+ words). Must explicitly enforce the narrative arc (e.g. "shot from behind, face hidden", "side profile", "front view"). Also explicitly include the chosen consistent background here if needed to ensure the image generator keeps it.
- "camera": English camera angle description
- "emotion": English emotion/expression (2-3 words)

Example Output:
<think>
1. Background: Luxury minimalist museum with concrete walls...
2. Arc: Scenes 1-3 walking away showing back curves. Scenes 4-6 side profile looking over shoulder. Scenes 7-9 front reveal walking to camera...
</think>
[
  {"title":"Bóng Lưng Gợi Cảm","pose":"Full body shot from completely behind, showing off curves, long legs, walking away slowly, face completely hidden, wearing the exact outfit, luxury minimalist concrete museum background","camera":"Low angle following from behind","emotion":"Mysterious, confident"},
  ... exactly 9 objects ...
]

Return ONLY the <think> block followed by the JSON array.${remixContext}`

            const aiResponse = await callGemini({ prompt: analyzePrompt, images: allImages })

            // Parse JSON from response
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
                console.error('Failed to parse AI scene response:', e, aiResponse)
                alert('AI không thể phân tích. Vui lòng thử lại hoặc viết kịch bản thủ công.')
                setAnalyzing(false)
                return
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                const newScenes = parsed.slice(0, 9).map(s => ({
                    title: s.title || 'Cảnh',
                    pose: s.pose || '',
                    camera: s.camera || '',
                    emotion: s.emotion || 'Natural'
                }))
                setScenes(newScenes)
                setScriptPhase('review') // → Go to review phase, NOT image generation
                console.log('[Auto-analyze] Generated', newScenes.length, 'scenes — entering review phase')
            }
        } catch (err) {
            console.error('[Auto-analyze error]', err)
            alert('Lỗi phân tích: ' + err.message)
        }
        setAnalyzing(false)
    }

    // ─── Helper: Build shot description for a scene ──────────────────────────

    const buildSceneShotDesc = (scene, idx, totalScenes, extractedIdentity, extractedBackground = '') => {
        const bgLock = extractedBackground
            ? `BACKGROUND: REAL STORE/SHOWROOM from reference photo — ${extractedBackground.substring(0, 200)}... MUST preserve exact real environment`
            : 'LOCATION: SAME area style, architecture, color palette'
        return `STORYTELLING SCENE ${idx + 1} of ${totalScenes}: "${scene.title}"
THIS IS SCENE ${idx + 1} IN A CONTINUOUS STORY. This scene happens IMMEDIATELY AFTER scene ${idx} and BEFORE scene ${idx + 2}.
Pose & Action: ${scene.pose}
Camera Angle: ${scene.camera || 'Professional fashion photography angle'}
Emotion & Expression: ${scene.emotion}
${storyContext ? `Shared Story Context: ${storyContext}` : ''}

=== DNA LOCK ===
FACE: SAME face shape, eyes, nose, lips, jawline, makeup, eyebrows
BODY: SAME breast size, waist, hip, shoulder width, height, weight
HAIR: SAME color, length, style, bangs
OUTFIT: SAME clothes, fabric color, pattern, shoes
PROP: If bicycle appears, SAME model/basket/color in ALL scenes. If umbrella, SAME umbrella.
TIME: SAME time of day, lighting direction, shadow angle, weather
${bgLock}
${extractedIdentity ? `\nIdentity DNA: ${extractedIdentity}` : ''}

Each scene = next moment in a CONTINUOUS story. Same person, same everything.`
    }

    // ─── Generate ALL scenes ──────────────────────────────────────────────────

    const handleGenerateAll = async () => {
        if (productImages.length === 0 || scenes.length === 0) return
        setGenerating(true)
        setScriptPhase('generating')
        setErrors({})
        setResults({})
        const allIdx = new Set(scenes.map((_, i) => i))
        setLoadingSet(allIdx)

        try {
            const productFiles = await entriesToFiles(productImages)
            const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
            const bgFiles = bgImages.length > 0 ? await entriesToFiles(bgImages) : []

            // Bot 1 + Bot 2 + Bot BG — PARALLEL analysis
            const [extractedIdentity, extractedProduct, extractedBackground] = await Promise.all([
                refFiles.length > 0
                    ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
                    : Promise.resolve(''),
                callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
                bgFiles.length > 0
                    ? callGemini({ prompt: getPrompt('BOT_BG_ANALYZER'), images: bgFiles })
                    : Promise.resolve(''),
            ])

            console.log('[Story Bot1]', extractedIdentity?.substring(0, 100))
            console.log('[Story Bot2]', extractedProduct?.substring(0, 100))
            if (extractedBackground) console.log('[Story BotBG]', extractedBackground?.substring(0, 100))

            // Cache for retry/edit
            lastAnalysisRef.current = { extractedIdentity, extractedProduct, extractedBackground, refFiles, productFiles, bgFiles }

            const mainFile = productFiles[0]
            const allRefFiles = isRemixMode ? [...refFiles, ...bgFiles] : refFiles

            // Generate each scene
            const tasks = scenes.map((scene, idx) =>
                (async () => {
                    try {
                        const shotDesc = buildSceneShotDesc(scene, idx, scenes.length, extractedIdentity, extractedBackground)

                        const camPreset = CAMERA_PRESETS.find(p => p.name === cameraPreset)
                        const mkpPreset = MAKEUP_STYLES.find(p => p.name === makeupStyle)
                        const sknPreset = SKIN_PRESETS.find(p => p.name === skinFilter)

                        const prompt = buildMasterImagePrompt({
                            extractedIdentity,
                            extractedProduct,
                            modelType: '🤖 Auto (AI tự chọn)',
                            background: '🤖 Auto (AI tự chọn)',
                            pose: '🤖 Auto (AI tự chọn)',
                            style: '🤖 Auto (AI tự chọn)',
                            skinFilter: sknPreset?.prompt || skinFilter,
                            toneFilter,
                            quality, aspect,
                            userPrompt: '',
                            shotDescription: shotDesc,
                            cameraPreset: camPreset?.prompt || '',
                            makeupStyle: mkpPreset?.prompt || '',
                            referenceImages: refFiles,
                            extractedBackground,
                            isRemixMode,
                            bgCount: bgFiles.length,
                        })

                        const result = await generateGarmentImage(mainFile, prompt, {
                            quality, aspect,
                            referenceFiles: allRefFiles,
                        })
                        const dataUrl = `data:${result.mimeType};base64,${result.base64}`
                        setResults(prev => ({ ...prev, [idx]: dataUrl }))
                    } catch (err) {
                        console.error(`[Story Scene ${idx}]`, err)
                        setErrors(prev => ({ ...prev, [idx]: err.message }))
                    }
                    setLoadingSet(prev => { const n = new Set(prev); n.delete(idx); return n })
                })()
            )

            await Promise.all(tasks)
        } catch (err) {
            console.error('[Story Pipeline Error]', err)
            scenes.forEach((_, i) => setErrors(prev => ({ ...prev, [i]: err.message })))
            setLoadingSet(new Set())
        }
        setGenerating(false)
    }

    // ─── Generate SINGLE scene image ──────────────────────────────────────────
    const handleGenerateSingle = async (idx) => {
        if (productImages.length === 0 || !scenes[idx]) return

        setLoadingSet(prev => new Set(prev).add(idx))
        setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

        try {
            let { extractedIdentity, extractedProduct, extractedBackground, refFiles, productFiles, bgFiles } = lastAnalysisRef.current

            // If no cached analysis, run Bot1 + Bot2 + BotBG
            if (!extractedIdentity && !extractedProduct) {
                productFiles = await entriesToFiles(productImages)
                refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
                bgFiles = bgImages.length > 0 ? await entriesToFiles(bgImages) : []

                const [id, prod, bg] = await Promise.all([
                    refFiles.length > 0
                        ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
                        : Promise.resolve(''),
                    callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
                    bgFiles.length > 0
                        ? callGemini({ prompt: getPrompt('BOT_BG_ANALYZER'), images: bgFiles })
                        : Promise.resolve(''),
                ])
                extractedIdentity = id
                extractedProduct = prod
                extractedBackground = bg
                lastAnalysisRef.current = { extractedIdentity, extractedProduct, extractedBackground, refFiles, productFiles, bgFiles }
            }

            const scene = scenes[idx]
            const shotDesc = buildSceneShotDesc(scene, idx, scenes.length, extractedIdentity, extractedBackground)

            const camPreset = CAMERA_PRESETS.find(p => p.name === cameraPreset)
            const mkpPreset = MAKEUP_STYLES.find(p => p.name === makeupStyle)
            const sknPreset = SKIN_PRESETS.find(p => p.name === skinFilter)
            const allRefFiles = isRemixMode ? [...(refFiles || []), ...(bgFiles || [])] : (refFiles || [])

            const prompt = buildMasterImagePrompt({
                extractedIdentity,
                extractedProduct,
                modelType: '🤖 Auto (AI tự chọn)',
                background: '🤖 Auto (AI tự chọn)',
                pose: '🤖 Auto (AI tự chọn)',
                style: '🤖 Auto (AI tự chọn)',
                skinFilter: sknPreset?.prompt || skinFilter,
                toneFilter,
                quality, aspect,
                userPrompt: '',
                shotDescription: shotDesc,
                cameraPreset: camPreset?.prompt || '',
                makeupStyle: mkpPreset?.prompt || '',
                referenceImages: refFiles || [],
                extractedBackground,
                isRemixMode,
                bgCount: (bgFiles || []).length,
            })

            const mainFile = productFiles[0]
            const result = await generateGarmentImage(mainFile, prompt, {
                quality, aspect,
                referenceFiles: refFiles,
            })
            const dataUrl = `data:${result.mimeType};base64,${result.base64}`
            setResults(prev => ({ ...prev, [idx]: dataUrl }))
        } catch (err) {
            console.error(`[Single Scene ${idx}]`, err)
            setErrors(prev => ({ ...prev, [idx]: err.message }))
        }
        setLoadingSet(prev => { const n = new Set(prev); n.delete(idx); return n })
    }

    // ─── Retry single scene ───────────────────────────────────────────────────

    const handleRetryScene = async (idx) => {
        const { extractedIdentity, extractedProduct, refFiles } = lastAnalysisRef.current
        if (!extractedProduct && productImages.length === 0) return

        setLoadingSet(prev => { const n = new Set(prev); n.add(idx); return n })
        setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

        try {
            let prodFiles = lastAnalysisRef.current.productFiles
            let identity = extractedIdentity
            let product = extractedProduct
            let rFiles = refFiles

            // Re-analyze if no cached data
            if (!product) {
                prodFiles = await entriesToFiles(productImages)
                rFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
                const [id, pd] = await Promise.all([
                    rFiles.length > 0 ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: rFiles }) : Promise.resolve(''),
                    callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: prodFiles }),
                ])
                identity = id; product = pd
                lastAnalysisRef.current = { extractedIdentity: identity, extractedProduct: product, refFiles: rFiles, productFiles: prodFiles }
            }

            const scene = scenes[idx]
            const shotDesc = buildSceneShotDesc(scene, idx, scenes.length, identity)
            const camP = CAMERA_PRESETS.find(p => p.name === cameraPreset)
            const mkP = MAKEUP_STYLES.find(p => p.name === makeupStyle)
            const skP = SKIN_PRESETS.find(p => p.name === skinFilter)

            const prompt = buildMasterImagePrompt({
                extractedIdentity: identity, extractedProduct: product,
                modelType: '🤖 Auto (AI tự chọn)', background: '🤖 Auto (AI tự chọn)',
                pose: '🤖 Auto (AI tự chọn)', style: '🤖 Auto (AI tự chọn)',
                skinFilter: skP?.prompt || skinFilter, toneFilter, quality, aspect,
                userPrompt: '', shotDescription: shotDesc,
                cameraPreset: camP?.prompt || '', makeupStyle: mkP?.prompt || '',
                referenceImages: rFiles,
            })

            const result = await generateGarmentImage(prodFiles[0], prompt, {
                quality, aspect, referenceFiles: rFiles,
            })
            const dataUrl = `data:${result.mimeType};base64,${result.base64}`
            setResults(prev => ({ ...prev, [idx]: dataUrl }))
        } catch (err) {
            console.error(`[Retry Scene ${idx}]`, err)
            setErrors(prev => ({ ...prev, [idx]: err.message }))
        }
        setLoadingSet(prev => { const n = new Set(prev); n.delete(idx); return n })
    }

    // ─── Edit single scene with user instruction ──────────────────────────────

    const handleEditScene = async (idx, editInstruction) => {
        const { extractedIdentity, extractedProduct, refFiles } = lastAnalysisRef.current
        if (!extractedProduct && productImages.length === 0) return

        setLoadingSet(prev => { const n = new Set(prev); n.add(idx); return n })
        setErrors(prev => { const n = { ...prev }; delete n[idx]; return n })

        try {
            let prodFiles = lastAnalysisRef.current.productFiles
            let identity = extractedIdentity
            let product = extractedProduct
            let rFiles = refFiles

            if (!product) {
                prodFiles = await entriesToFiles(productImages)
                rFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
                const [id, pd] = await Promise.all([
                    rFiles.length > 0 ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: rFiles }) : Promise.resolve(''),
                    callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: prodFiles }),
                ])
                identity = id; product = pd
                lastAnalysisRef.current = { extractedIdentity: identity, extractedProduct: product, refFiles: rFiles, productFiles: prodFiles }
            }

            const scene = scenes[idx]
            const shotDesc = buildSceneShotDesc(scene, idx, scenes.length, identity)
            const camP = CAMERA_PRESETS.find(p => p.name === cameraPreset)
            const mkP = MAKEUP_STYLES.find(p => p.name === makeupStyle)
            const skP = SKIN_PRESETS.find(p => p.name === skinFilter)

            const editSuffix = `\n[USER EDIT INSTRUCTION — HIGHEST PRIORITY]\n${editInstruction}\nApply this edit while keeping the SAME face identity, outfit, and scene composition.`

            const prompt = buildMasterImagePrompt({
                extractedIdentity: identity, extractedProduct: product,
                modelType: '🤖 Auto (AI tự chọn)', background: '🤖 Auto (AI tự chọn)',
                pose: '🤖 Auto (AI tự chọn)', style: '🤖 Auto (AI tự chọn)',
                skinFilter: skP?.prompt || skinFilter, toneFilter, quality, aspect,
                userPrompt: editSuffix, shotDescription: shotDesc,
                cameraPreset: camP?.prompt || '', makeupStyle: mkP?.prompt || '',
                referenceImages: rFiles,
            })

            const result = await generateGarmentImage(prodFiles[0], prompt, {
                quality, aspect, referenceFiles: rFiles,
            })
            const dataUrl = `data:${result.mimeType};base64,${result.base64}`
            setResults(prev => ({ ...prev, [idx]: dataUrl }))
        } catch (err) {
            console.error(`[Edit Scene ${idx}]`, err)
            setErrors(prev => ({ ...prev, [idx]: err.message }))
        }
        setLoadingSet(prev => { const n = new Set(prev); n.delete(idx); return n })
    }

    const canGenerate = productImages.length > 0 && scenes.length > 0 && !generating
    const isCustom = selectedTemplate?.id === 'custom'
    const totalDuration = scenes.length * 3

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="fade-in">
            <h1 className="page-title">📖 Storytelling — Kể chuyện bằng hình ảnh</h1>

            {/* ── Step 1: Choose Template ── */}
            {!selectedTemplate ? (
                <div className="st-templates">
                    <h2 className="st-section-title">Chọn kịch bản câu chuyện</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                        Mỗi kịch bản gồm <strong>9 phân cảnh × 3 giây</strong> = video 27s hấp dẫn.
                        Đa dạng góc máy + cảm xúc → tăng tỷ lệ giữ chân tối đa trên TikTok/Reels.
                    </p>
                    <div className="st-template-grid">
                        {STORY_TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="st-template-card" onClick={() => selectTemplate(tpl)}>
                                <div className="st-template-name">{tpl.name}</div>
                                <div className="st-template-desc">{tpl.description}</div>
                                <div className="st-template-count">
                                    {tpl.scenes.length > 0 ? `${tpl.scenes.length} cảnh × 3s = ${tpl.scenes.length * 3}s` : 'Tự do'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* ── Header ── */}
                    <div className="st-header">
                        <button className="btn btn-ghost" onClick={() => { setSelectedTemplate(null); setScenes([]); setResults({}); setErrors({}) }}>
                            ← Đổi kịch bản
                        </button>
                        <h2 className="st-active-title">{selectedTemplate.name}</h2>
                        <span className="st-scene-count">{scenes.length} cảnh × 3s = {totalDuration}s</span>
                    </div>

                    <div className="st-layout">
                        {/* ═══ LEFT: Settings ═══ */}
                        <div className="st-settings">

                            {/* Reference images */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">1</div>
                                    <div className="design-step-title">Ảnh mẫu ({refImages.length}/5)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => refFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={refFileRef} type="file" accept="image/*" multiple hidden onChange={e => addRefImage(e.target.files)} />
                                </div>
                                <div className="nd-img-grid">
                                    {refImages.map((img, i) => (
                                        <div key={i} className="img-slot filled">
                                            <img src={img.url} alt="" />
                                            <button className="img-slot-remove" onClick={() => setRefImages(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                                        </div>
                                    ))}
                                    {refImages.length < 5 && (
                                        <div className="img-slot empty" onClick={() => setLibraryPicker('ref')}>
                                            <Plus size={18} style={{ color: 'var(--brand)' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Product images */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">2</div>
                                    <div className="design-step-title">Sản phẩm ({productImages.length}/8)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => productFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={productFileRef} type="file" accept="image/*" multiple hidden onChange={e => addProductImage(e.target.files)} />
                                </div>
                                <div className="nd-img-grid">
                                    {productImages.map((img, i) => (
                                        <div key={i} className="img-slot filled">
                                            <img src={img.url} alt="" />
                                            <button className="img-slot-remove" onClick={() => setProductImages(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                                        </div>
                                    ))}
                                    {productImages.length < 8 && (
                                        <div className="img-slot empty" onClick={() => setLibraryPicker('product')}>
                                            <Plus size={18} style={{ color: 'var(--brand)' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Pose Library ── */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number" style={{ background: 'linear-gradient(135deg, #e91e63, #ff5722)' }}>P</div>
                                    <div className="design-step-title">📸 Thư viện Pose</div>
                                </div>
                                <div className="nd-settings-body">
                                    {/* Pose ref upload */}
                                    <div className="form-group">
                                        <label className="nd-label">ẢNH TƯ THẾ THAM CHIẾU</label>
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

                                    {/* Selected poses summary */}
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

                                    {showPoseLibrary && (
                                        <div className="pose-library">
                                            <div className="pose-categories">
                                                {POSE_CATEGORIES.map(cat => (
                                                    <button key={cat.id}
                                                        className={`pose-cat-btn${poseCategory === cat.id ? ' active' : ''}`}
                                                        onClick={() => setPoseCategory(cat.id)}>
                                                        {cat.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="pose-grid">
                                                {getAllPosesByCategory(poseCategory).map(p => {
                                                    const isSelected = selectedPoses.some(sp => sp.id === p.id)
                                                    return (
                                                        <div key={p.id}
                                                            className={`pose-card${isSelected ? ' selected' : ''}`}
                                                            onClick={() => togglePose(p)}>
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
                                                💡 Chọn tối đa 9 tư thế — mỗi cảnh sẽ sử dụng 1 tư thế khác nhau
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quality + Aspect */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">3</div>
                                    <div className="design-step-title">Cài đặt đầu ra</div>
                                </div>
                                <div className="nd-settings-body">
                                    <div className="nd-row-2">
                                        <div className="form-group">
                                            <label className="nd-label">CHẤT LƯỢNG ẢNH</label>
                                            <div className="pose-templates">
                                                {QUALITY_OPTS.map(q => (
                                                    <button key={q}
                                                        className={`pose-tpl-btn${quality === q ? ' active' : ''}`}
                                                        onClick={() => setQuality(q)}>
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="nd-label">TỶ LỆ KHUNG HÌNH</label>
                                            <div className="pose-templates">
                                                {ASPECT_OPTS.map(a => (
                                                    <button key={a}
                                                        className={`pose-tpl-btn${aspect === a ? ' active' : ''}`}
                                                        onClick={() => setAspect(a)}>
                                                        {a}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="nd-row-2">
                                        <div className="form-group">
                                            <label className="nd-label">🎯 KOL COMBO</label>
                                            <div className="pose-templates">
                                                {KOL_COMBOS.map(combo => (
                                                    <button key={combo.id}
                                                        className={`pose-tpl-btn${selectedCombo === combo.id ? ' active' : ''}`}
                                                        title={combo.description}
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
                                    </div>
                                    <div className="nd-row-2">
                                        <div className="form-group">
                                            <label className="nd-label">📷 CAMERA</label>
                                            <div className="pose-templates">
                                                {CAMERA_OPTS.map(c => (
                                                    <button key={c}
                                                        className={`pose-tpl-btn${cameraPreset === c ? ' active' : ''}`}
                                                        onClick={() => { setCameraPreset(c); setSelectedCombo(null) }}>
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="nd-label">💄 MAKEUP</label>
                                            <div className="pose-templates">
                                                {MAKEUP_OPTS.map(m => (
                                                    <button key={m}
                                                        className={`pose-tpl-btn${makeupStyle === m ? ' active' : ''}`}
                                                        onClick={() => { setMakeupStyle(m); setSelectedCombo(null) }}>
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="nd-row-2">
                                        <div className="form-group">
                                            <label className="nd-label">🎨 TONE DA</label>
                                            <div className="pose-templates">
                                                {SKIN_OPTS.map(s => (
                                                    <button key={s}
                                                        className={`pose-tpl-btn${skinFilter === s ? ' active' : ''}`}
                                                        onClick={() => { setSkinFilter(s); setSelectedCombo(null) }}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="nd-label">🌈 TONE MÀU</label>
                                            <div className="pose-templates">
                                                {TONE_OPTS.map(t => (
                                                    <button key={t}
                                                        className={`pose-tpl-btn${toneFilter === t ? ' active' : ''}`}
                                                        onClick={() => setToneFilter(t)}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Story context + Auto-analyze */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">4</div>
                                    <div className="design-step-title">Bối cảnh & Kịch bản</div>
                                </div>
                                <div className="nd-settings-body">
                                    <div className="form-group">
                                        <label className="nd-label">ĐỊA ĐIỂM, ĐẠO CỤ, PHỤ KIỆN <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>(áp dụng tất cả cảnh)</span></label>
                                        <textarea className="nd-textarea" value={storyContext} onChange={e => setStoryContext(e.target.value)}
                                            placeholder="VD: Đường quê lúc golden hour, xe Honda Vision bạc, mũ bảo hiểm trắng..." />
                                    </div>

                                    {/* Auto-analyze button */}
                                    <button className="pose-lib-toggle" onClick={handleAutoAnalyze}
                                        disabled={productImages.length === 0 || analyzing}
                                        style={{ background: analyzing ? 'rgba(255,107,53,0.06)' : undefined }}>
                                        {analyzing ? (
                                            <><Loader size={14} className="spin" style={{ verticalAlign: -2 }} /> AI đang phân tích ảnh và tạo kịch bản 9 cảnh...</>
                                        ) : (
                                            <>🧠 AI tự động phân tích ảnh → Tạo kịch bản 9 cảnh</>
                                        )}
                                    </button>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                                        💡 AI sẽ phân tích trang phục, người mẫu, bối cảnh từ ảnh upload để tự tạo 9 phân cảnh tối ưu.
                                        <br />⚡ Nếu bạn viết kịch bản hoặc chọn template → kịch bản đó được <strong>ưu tiên tuyệt đối</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Generate buttons — phase-aware */}
                            {scriptPhase === 'review' && scenes.length > 0 ? (
                                /* ═══ PHASE 3: Review complete → show "Generate All" button ═══ */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <button className="nd-generate-btn" onClick={handleGenerateAll}
                                        disabled={!canGenerate || generating}
                                        style={{ background: generating ? undefined : 'linear-gradient(135deg, #10b981, #059669)' }}>
                                        {generating ? (
                                            <><Loader size={18} className="spin" /> Đang tạo {scenes.length} cảnh...</>
                                        ) : (
                                            <><Sparkles size={18} /> 🚀 Tạo TẤT CẢ {scenes.length} ảnh cùng lúc</>
                                        )}
                                    </button>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                                        💡 Hoặc bấm <strong>"📸 Tạo ảnh cảnh này"</strong> trên từng phân cảnh bên phải để chạy từng ảnh một.
                                    </p>
                                </div>
                            ) : (
                                /* ═══ PHASE 1: No script yet → show original generate button ═══ */
                                <button className="nd-generate-btn" onClick={handleGenerateAll} disabled={!canGenerate}>
                                    {generating ? (
                                        <><Loader size={18} className="spin" /> Đang tạo {scenes.length} phân cảnh...</>
                                    ) : (
                                        <><Sparkles size={18} /> Tạo {scenes.length} cảnh × 3s = {totalDuration}s video</>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* ═══ RIGHT: Scene Timeline ═══ */}
                        <div className="st-timeline">
                            <div className="st-timeline-header">
                                <h3 className="st-section-title" style={{ margin: 0 }}>
                                    <Film size={18} style={{ verticalAlign: -3 }} /> Timeline — {scenes.length} cảnh ({totalDuration}s)
                                </h3>
                                {isCustom && (
                                    <button className="btn btn-ghost" onClick={addScene}>
                                        <PlusCircle size={14} /> Thêm cảnh
                                    </button>
                                )}
                            </div>

                            <div className="st-scenes-grid">
                                {scenes.map((scene, idx) => (
                                    <SceneCard
                                        key={idx}
                                        scene={scene}
                                        index={idx}
                                        imageSrc={results[idx]}
                                        isLoading={loadingSet.has(idx)}
                                        error={errors[idx]}
                                        onPreview={() => setPreviewImg(results[idx])}
                                        onRemove={() => removeScene(idx)}
                                        onSave={async () => {
                                            if (!results[idx]) return
                                            try {
                                                const record = createLibraryRecord({
                                                    name: generateUniqueName({ category: 'storytelling', description: scene.title }),
                                                    type: 'storytelling',
                                                    category: 'storytelling',
                                                    imageSrc: results[idx],
                                                    source: 'storytelling',
                                                })
                                                const res = await saveToLibrary(record)
                                                alert(res.success ? `✅ Đã lưu "${scene.title}" vào kho!` : '❌ Lỗi lưu: ' + res.error)
                                            } catch (e) { alert('❌ Lỗi: ' + e.message) }
                                        }}
                                        onDownload={() => {
                                            if (!results[idx]) return
                                            downloadImage(results[idx], `Story-Scene-${idx + 1}-${scene.title}.png`)
                                        }}
                                        onRetry={() => handleRetryScene(idx)}
                                        onEdit={(msg) => handleEditScene(idx, msg)}
                                        onGenerateSingle={() => handleGenerateSingle(idx)}
                                        isCustom={isCustom}
                                    />
                                ))}

                                {isCustom && (
                                    <div className="st-add-scene" onClick={addScene}>
                                        <PlusCircle size={32} />
                                        <span>Thêm phân cảnh</span>
                                    </div>
                                )}
                            </div>

                            {/* Custom scene editor */}
                            {isCustom && scenes.length > 0 && (
                                <div className="st-scene-editor">
                                    <h3 className="st-section-title">Chỉnh sửa phân cảnh</h3>
                                    {scenes.map((scene, idx) => (
                                        <div key={idx} className="st-edit-row">
                                            <div className="st-edit-number">{idx + 1}</div>
                                            <div className="st-edit-fields">
                                                <input className="nd-input" value={scene.title}
                                                    onChange={e => updateScene(idx, 'title', e.target.value)}
                                                    placeholder="Tên cảnh..." />
                                                <textarea className="nd-textarea" style={{ minHeight: 50 }}
                                                    value={scene.pose}
                                                    onChange={e => updateScene(idx, 'pose', e.target.value)}
                                                    placeholder="Mô tả tư thế, hành động..." />
                                                <input className="nd-input" value={scene.emotion}
                                                    onChange={e => updateScene(idx, 'emotion', e.target.value)}
                                                    placeholder="Cảm xúc: VD: Vui vẻ, mơ mộng..." />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )
            }

            {/* ═══ Video Prompt Panel ═══ */}
            {Object.keys(results).length > 0 && <VideoPromptPanel shotDescriptions={scenes.map(s => ({ title: s.title, shotDesc: s.pose, category: 'setup' }))} />}

            {/* ═══ SEO & AEO Panel ═══ */}
            <SeoAeoPanel
                images={Object.values(results)}
                productContext={lastAnalysisRef.current?.extractedProduct || ''}
                shotDescriptions={scenes.map(s => ({ title: s.title, shotDesc: s.pose, category: 'setup' }))}
            />

            {/* Preview */}
            {previewImg && <Portal><ImagePreviewModal imageSrc={previewImg} onClose={() => setPreviewImg(null)} /></Portal>}

            {/* Library Picker */}
            {
                libraryPicker && (
                    <Portal>
                        <LibraryPickerModal
                            title={libraryPicker === 'ref' ? 'Chọn ảnh mẫu' : 'Chọn sản phẩm'}
                            onClose={() => setLibraryPicker(null)}
                            onSelect={handleLibraryPick}
                        />
                    </Portal>
                )
            }
        </div >
    )
}
