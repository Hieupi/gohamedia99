import { useState, useRef, useEffect } from 'react'
import {
    Upload, Sparkles, Download, Save, Trash2, X, Send, Plus,
    Image as ImageIcon, Loader, FolderOpen, Eye, GripVertical,
    ChevronDown, Film, BookOpen, PlusCircle, Check
} from 'lucide-react'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt, VN_DNA_DEFAULTS } from '../services/masterPrompts'
import { downloadImage, getLibraryItems, saveToLibrary, createLibraryRecord, generateUniqueName } from '../services/libraryService'
import { POSE_LIBRARY, POSE_CATEGORIES, getAllPosesByCategory, PROMPT_TEMPLATES } from '../services/poseLibrary'

// â”€â”€â”€ Options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const QUALITY_OPTS = ['2K (HD)', '1K (SD)', '4K (Ultra)']
const ASPECT_OPTS = ['9:16 Dá»c (Story)', '4:5 Dá»c (IG)', '1:1 VuÃ´ng', '16:9 Ngang', '3:4 ChÃ¢n dung']
const SKIN_OPTS = ['ðŸ¤– Auto', 'Da sá»© HÃ n Quá»‘c glass skin', 'Da tráº¯ng há»“ng', 'Da tráº¯ng sÃ¡ng', 'Da nÃ¢u khá»e', 'Da rÃ¡m náº¯ng']
const TONE_OPTS = ['ðŸ¤– Auto', 'Soft dreamy', 'Warm vintage', 'Cool tone xanh', 'Golden hour', 'Film analog', 'Cinematic', 'Pastel nháº¹ nhÃ ng']

const ST_SAVE_KEY = 'goha_storytelling_state'

function loadSavedState() {
    try { return JSON.parse(localStorage.getItem(ST_SAVE_KEY)) || {} } catch { return {} }
}

// â”€â”€â”€ Story Templates (9 scenes each for maximum diversity) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STORY_TEMPLATES = [
    {
        id: 'motorbike',
        name: 'ðŸï¸ LÃ¡i xe mÃ¡y',
        description: 'CÃ´ gÃ¡i tráº» vá»›i xe mÃ¡y trÃªn Ä‘Æ°á»ng quÃª, golden hour â€” 9 cáº£nh Ã— 3s',
        scenes: [
            { title: 'Hero Ä‘á»©ng cáº¡nh xe', pose: 'Standing upright beside the scooter, one hand on seat, slight hip shift, confident smile, full-body front-facing', camera: 'Full-body shot from feet up, scooter visible behind her', emotion: 'Confident, bright, cheerful' },
            { title: 'Cáº­n máº·t + xe', pose: 'Leaning forward on scooter handlebars with both arms, chin resting on hands, sweet coy smile looking at camera, hair flowing to one side', camera: 'Close-up face and upper body, scooter handlebars visible', emotion: 'Sweet, intimate, charming' },
            { title: 'Ngá»“i báº¥m Ä‘iá»‡n thoáº¡i', pose: 'Sitting relaxed on scooter seat, legs crossed, one hand holding phone close to face reading a message, playful charming expression', camera: 'Eye level, slightly tilted, encompassing subject and scooter', emotion: 'Relaxed, playful, modern' },
            { title: 'Selfie trÆ°á»›c xe', pose: 'Standing in front of scooter wearing helmet, one hand holding phone high for selfie, other hand on hip, leaning slightly forward, mischievous smile', camera: "Bird's eye view from phone perspective, panoramic from face downward", emotion: 'Fun, youthful, social media vibe' },
            { title: 'Quay lÆ°ng kÃ©o Ã¡o', pose: 'Back view standing beside scooter, both hands at waist pulling shirt hem slightly, looking over shoulder at camera with coy smile, hair cascading down back', camera: 'Full-body back view, scooter beside her', emotion: 'Flirty, artistic, body-focused' },
            { title: 'Ngá»“i tinh nghá»‹ch', pose: 'Sitting sideways on seat, one hand on handlebars, head tilted to side looking away dreamily, playful expression, legs dangling', camera: 'Full-body close-up with scooter and background', emotion: 'Dreamy, captivating, artistic' },
            { title: 'Cáº­n máº·t dá»… thÆ°Æ¡ng', pose: 'Sitting on scooter, hand touching chin/lips, looking to the side with sweet coy smile, hair flowing', camera: 'Close-up upper body and face, shallow DOF bokeh', emotion: 'Sweet, charming, intimate' },
            { title: 'LÃ¡i xe trÃªn Ä‘Æ°á»ng', pose: 'Riding scooter on road, helmet on, hands on handlebars, slight smile, hair and clothes flowing in wind, dynamic motion', camera: 'Front view at eye level from road, wide cinematic shot', emotion: 'Free, adventurous, cinematic' },
            { title: 'Golden hour finale', pose: 'Standing beside scooter at golden hour, arms stretched wide, head tilted back, hair flowing in warm wind, ethereal silhouette with rim lighting', camera: 'Wide angle artistic composition, golden backlight', emotion: 'Freedom, euphoria, cinematic finale' },
        ]
    },
    {
        id: 'cafe',
        name: 'â˜• Cafe chiá»u',
        description: 'Buá»•i chiá»u thÆ° giÃ£n táº¡i quÃ¡n cafe vintage â€” 9 cáº£nh Ã— 3s',
        scenes: [
            { title: 'BÆ°á»›c vÃ o quÃ¡n', pose: 'Walking through cafe entrance, pushing glass door open, slight turn back at camera with sweet smile, hair flowing with movement', camera: 'Full-body from inside cafe looking toward entrance', emotion: 'Anticipation, elegant arrival' },
            { title: 'Äá»©ng ngáº¯m quÃ¡n', pose: 'Standing inside cafe, one hand touching chin contemplating, looking around at the vintage decor, natural relaxed stance', camera: 'Wide shot showing cafe interior and model', emotion: 'Curious, appreciative' },
            { title: 'Chá»n chá»— ngá»“i', pose: 'Standing by window table, hand touching chair back, looking down at the seat deciding, hip shifted, natural stance', camera: '3/4 angle showing cafe interior and window light', emotion: 'Casual, contemplative' },
            { title: 'Äá»c menu', pose: 'Sitting at table, holding menu with both hands, looking down at it with interested expression, gentle smile', camera: 'Waist-up from across table, warm bokeh background', emotion: 'Curious, relaxed' },
            { title: 'Selfie táº¡i bÃ n', pose: 'Holding phone up for selfie at the table, peace sign with other hand, cute pouty expression, coffee shop background visible', camera: 'Selfie angle from phone perspective', emotion: 'Playful, social, fun' },
            { title: 'ThÆ°á»Ÿng thá»©c Ä‘á»“ uá»‘ng', pose: 'Holding coffee cup with both hands near face, eyes closed in enjoyment, gentle steam visible, serene expression', camera: 'Close-up face and hands with cup, shallow DOF', emotion: 'Blissful, cozy, warm' },
            { title: 'Chá»¥p áº£nh Ä‘á»“ uá»‘ng', pose: 'Holding phone above coffee cup taking photo for social media, bird eye view of table setup, concentrated cute expression', camera: 'Over-shoulder angle showing phone and table', emotion: 'Modern, social, creative' },
            { title: 'Ngáº¯m ra cá»­a sá»•', pose: 'Chin resting on hand, gazing out window with dreamy far-away look, golden light on face, coffee cup in front', camera: 'Side profile with window light, cinematic wide', emotion: 'Peaceful, dreamy, golden hour' },
            { title: 'Táº¡m biá»‡t quÃ¡n', pose: 'Standing at cafe door looking back inside with nostalgic sweet smile, hand on door frame, warm backlight creating silhouette', camera: 'Inside looking out, artistic backlit composition', emotion: 'Grateful, warm, bittersweet finale' },
        ]
    },
    {
        id: 'shopping',
        name: 'ðŸ›ï¸ Äi mua sáº¯m',
        description: 'Má»™t ngÃ y shopping táº¡i trung tÃ¢m thÆ°Æ¡ng máº¡i â€” 9 cáº£nh Ã— 3s',
        scenes: [
            { title: 'BÆ°á»›c vÃ o mall', pose: 'Walking confidently through mall entrance, shopping bags in hand, hair flowing, bright smile, one hand pushing hair back', camera: 'Full-body front facing, mall interior behind', emotion: 'Excited, confident' },
            { title: 'Escalator selfie', pose: 'Standing on escalator, phone held up for selfie, looking at screen with cute expression, mall levels visible behind', camera: 'Selfie perspective from phone', emotion: 'Fun, modern, social' },
            { title: 'Xem Ä‘á»“ trÃªn ká»‡', pose: 'Standing at clothing rack, one hand touching fabric, head tilted examining the garment, thoughtful expression', camera: '3/4 angle showing clothes rack and model', emotion: 'Curious, interested' },
            { title: 'Thá»­ Ä‘á»“ trÆ°á»›c gÆ°Æ¡ng', pose: 'Standing before full-length mirror, holding outfit against body, turning slightly, checking reflection with pleased smile', camera: 'Mirror reflection shot showing both model and reflection', emotion: 'Happy, deciding' },
            { title: 'Selfie phÃ²ng thá»­ Ä‘á»“', pose: 'In fitting room, new outfit on, phone held up for mirror selfie, confident pose, peace sign', camera: 'Mirror selfie perspective from phone', emotion: 'Proud, fun, sharing moment' },
            { title: 'Catwalk hÃ nh lang', pose: 'Walking down mall corridor like a catwalk, one hand on hip, chin up, confident strut, shopping bags swinging, hair bouncing', camera: 'Full-body from front, corridor stretching behind', emotion: 'Sassy, confident, main character energy' },
            { title: 'Nghá»‰ ngÆ¡i Äƒn kem', pose: 'Sitting at food court bench, legs crossed, eating ice cream, playful expression, shopping bags beside her', camera: 'Eye level lifestyle shot with mall background', emotion: 'Relaxed, sweet, enjoying' },
            { title: 'Khoe chiáº¿n lá»£i pháº©m', pose: 'Sitting on bench, holding up a shopping bag showing the brand, other bags around her, excited proud expression looking at camera', camera: 'Medium shot, lifestyle angle', emotion: 'Triumphant, proud, showing off' },
            { title: 'Ra vá» háº¡nh phÃºc', pose: 'Walking out of mall doors, multiple shopping bags, big genuine smile, sunset light behind, looking back at camera with wave', camera: 'Full-body from outside, golden hour backlight', emotion: 'Satisfied, glowing, cinematic finale' },
        ]
    },
    {
        id: 'gym',
        name: 'ðŸ’ª PhÃ²ng gym',
        description: 'Buá»•i táº­p táº¡i gym, nÄƒng Ä‘á»™ng khá»e khoáº¯n â€” 9 cáº£nh Ã— 3s',
        scenes: [
            { title: 'Äáº¿n gym', pose: 'Walking into gym entrance with gym bag, wearing tight workout outfit, confident energetic smile, hair in ponytail', camera: 'Full-body front facing at gym entrance', emotion: 'Motivated, energetic, ready' },
            { title: 'Warm up stretching', pose: 'Standing stretching one arm across body, other hand pulling elbow, feet hip-width apart, looking at camera with determined smile', camera: 'Full-body 3/4 angle, gym equipment visible', emotion: 'Focused, warming up' },
            { title: 'Squat position', pose: 'Mid-squat position with perfect form, hands clasped in front, back arched, butt pushed back and down, focused expression', camera: 'Side angle showing squat form, glutes emphasized', emotion: 'Strong, powerful, concentrated' },
            { title: 'Táº¡o dÃ¡ng vá»›i táº¡', pose: 'Holding dumbbells at sides, standing with hip shifted, slight arm flex, confident smirk looking at camera, athletic stance', camera: 'Full-body front 3/4, mirrors behind showing reflection', emotion: 'Strong, confident, fierce' },
            { title: 'Selfie gÆ°Æ¡ng gym', pose: 'Mirror selfie in gym, phone held up, flexing one arm subtly, body turned slightly to show curves in workout gear, smirk', camera: 'Mirror reflection, gym equipment in background', emotion: 'Proud, confident, showing progress' },
            { title: 'Nghá»‰ giá»¯a set', pose: 'Sitting on gym bench, one hand holding water bottle, other hand wiping forehead with towel, breathing visible, glowing skin from sweat', camera: 'Close-up upper body, gym background bokeh', emotion: 'Exhausted but satisfied, raw beauty' },
            { title: 'Plank position', pose: 'In forearm plank position on yoga mat, perfect straight body line, looking forward with fierce determination, core engaged', camera: 'Low angle from floor level showing body line', emotion: 'Powerful, determined, strong' },
            { title: 'Quay lÆ°ng khoe body', pose: 'Back view standing, both hands on waist pulling up shirt edge slightly, showing defined lower back and waist-to-hip curve, looking over shoulder', camera: 'Full-body back view, gym mirrors behind', emotion: 'Proud, body-confident, alluring' },
            { title: 'After-workout glow', pose: 'Leaning against gym wall, towel around neck, water bottle in hand, hair slightly messy from workout, serene accomplished smile, skin glowing', camera: 'Waist-up portrait, soft gym lighting', emotion: 'Accomplished, glowing, peaceful finale' },
        ]
    },
    {
        id: 'custom',
        name: 'âœï¸ Tá»± táº¡o ká»‹ch báº£n',
        description: 'Táº¡o cÃ¢u chuyá»‡n riÃªng cá»§a báº¡n â€” tÃ¹y Ã½ sá»‘ cáº£nh Ã— 3s',
        scenes: []
    },
]

// â”€â”€â”€ Scene Card Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SceneCard({ scene, index, imageSrc, isLoading, error, onPreview, onRemove, onSave, onDownload, isCustom }) {
    return (
        <div className="st-scene-card">
            <div className="st-scene-header">
                <span className="st-scene-number">{index + 1}</span>
                <span className="st-scene-title">{scene.title}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 'auto' }}>3s</span>
                {isCustom && (
                    <button className="st-scene-remove" onClick={onRemove} title="XÃ³a cáº£nh"><X size={14} /></button>
                )}
            </div>
            <div className="st-scene-img-wrap" style={{ position: 'relative' }}>
                {isLoading ? (
                    <div className="st-scene-placeholder">
                        <Loader size={24} className="spin" style={{ color: 'var(--brand)' }} />
                        <span>Äang táº¡o cáº£nh {index + 1}...</span>
                    </div>
                ) : error ? (
                    <div className="st-scene-placeholder">
                        <span style={{ color: '#ef4444', fontSize: 12 }}>âŒ {error}</span>
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
            {imageSrc && (
                <div style={{ display: 'flex', gap: 4, padding: '4px 6px', justifyContent: 'center', background: 'var(--bg-elevated)', borderRadius: '0 0 8px 8px' }}>
                    <button onClick={onPreview} title="Xem phÃ³ng to" style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Eye size={12} /> Xem
                    </button>
                    <button onClick={onSave} title="LÆ°u vÃ o kho" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Save size={12} /> LÆ°u
                    </button>
                    <button onClick={onDownload} title="Táº£i xuá»‘ng" style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Download size={12} /> Táº£i
                    </button>
                </div>
            )}
            <div className="st-scene-meta">
                <div><strong>Pose:</strong> {scene.pose?.substring(0, 60)}...</div>
                <div><strong>Cáº£m xÃºc:</strong> {scene.emotion}</div>
            </div>
        </div>
    )
}

// â”€â”€â”€ Image Preview Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ImagePreviewModal({ imageSrc, onClose }) {
    if (!imageSrc) return null
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
        }} onClick={onClose}>
            <button onClick={onClose} style={{
                position: 'absolute', top: 18, right: 24, background: 'rgba(255,255,255,0.15)',
                border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
            }}><X size={22} /></button>
            <img src={imageSrc} alt="Preview" onClick={e => e.stopPropagation()} style={{
                maxWidth: '92vw', maxHeight: '92vh', objectFit: 'contain',
                borderRadius: 12, boxShadow: '0 8px 60px rgba(0,0,0,0.6)', cursor: 'default'
            }} />
        </div>
    )
}

// â”€â”€â”€ Library Picker Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LibraryPickerModal({ onSelect, onClose, title }) {
    const items = getLibraryItems()
    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 30 }}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
                    <FolderOpen size={18} style={{ verticalAlign: -3 }} /> {title || 'Chá»n tá»« Kho ThÆ° Viá»‡n'}
                </h3>
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        Kho thÆ° viá»‡n trá»‘ng.
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
                    <button className="btn btn-ghost" onClick={onClose}>ÄÃ³ng</button>
                </div>
            </div>
        </div>
    )
}

// â”€â”€â”€ Helper: Convert image entry to File â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function entryToFile(entry, name = 'image.png') {
    if (entry.file) return entry.file
    const resp = await fetch(entry.url)
    const blob = await resp.blob()
    return new File([blob], name, { type: blob.type || 'image/png' })
}
async function entriesToFiles(entries) {
    return Promise.all(entries.map((e, i) => entryToFile(e, `img-${i}.png`)))
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN PAGE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

export default function StorytellingPage() {
    const refFileRef = useRef()
    const productFileRef = useRef()
    const poseRefFileRef = useRef()

    // Images
    const [refImages, setRefImages] = useState([])
    const [productImages, setProductImages] = useState([])

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
    const [aspect, setAspect] = useState(saved.aspect || '9:16 Dá»c (Story)')
    const [skinFilter, setSkinFilter] = useState(saved.skinFilter || 'Da sá»© HÃ n Quá»‘c glass skin')
    const [toneFilter, setToneFilter] = useState(saved.toneFilter || 'Soft dreamy')

    // Auto-analyze
    const [analyzing, setAnalyzing] = useState(false)

    // Generation
    const [results, setResults] = useState({})
    const [loadingSet, setLoadingSet] = useState(new Set())
    const [errors, setErrors] = useState({})
    const [generating, setGenerating] = useState(false)

    // Modals
    const [previewImg, setPreviewImg] = useState(null)
    const [libraryPicker, setLibraryPicker] = useState(null)

    // â”€â”€â”€ Auto-save settings to localStorage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        const state = { quality, aspect, skinFilter, toneFilter, storyContext }
        try { localStorage.setItem(ST_SAVE_KEY, JSON.stringify(state)) } catch { }
    }, [quality, aspect, skinFilter, toneFilter, storyContext])

    // â”€â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const selectTemplate = (tpl) => {
        setSelectedTemplate(tpl)
        setScenes([...tpl.scenes])
        setResults({})
        setErrors({})
    }

    const addScene = () => {
        setScenes(prev => [...prev, {
            title: `Cáº£nh ${prev.length + 1}`,
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

    const handleLibraryPick = (item) => {
        if (libraryPicker === 'ref') {
            setRefImages(prev => [...prev, { url: item.imageSrc }].slice(0, 5))
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

    // â”€â”€â”€ Auto-analyze images to generate 9-scene script â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleAutoAnalyze = async () => {
        if (productImages.length === 0) return
        setAnalyzing(true)
        try {
            const productFiles = await entriesToFiles(productImages)
            const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []
            const allImages = [...refFiles, ...productFiles]

            const analyzePrompt = `You are an elite fashion content director creating VIRAL TikTok/Reels videos.

Analyze these images carefully â€” model, outfit, accessories, setting, mood.

CORE FORMULA: GIÃO Dá»¤C + GIáº¢I TRÃ + Ká»‚ CHUYá»†N (Edutainment + Storytelling)
The video must TEACH something (fashion tip, style hack, outfit idea) while ENTERTAINING and TELLING A STORY.

=== 8 Yáº¾U Tá» TRIá»†U VIEW ===
1. HOOK 3 GIÃ‚Y: Scene 1 = the most SHOCKING or CURIOSITY-INDUCING moment. NOT just a pretty pose. Think: unexpected action, dramatic entrance, or a "wait, what?" moment
2. THUMBNAIL POWER: Scene 1 must make scrollers STOP â€” strong emotion, dramatic lighting, or unusual pose
3. GIÃO Dá»¤C (EDUCATION): Weave in a fashion tip â€” "CÃ¡ch phá»‘i outfit nÃ y", "Máº¹o chá»n mÃ u", "Trick táº¡o dÃ¡ng"
4. GIáº¢I TRÃ (ENTERTAINMENT): Each scene must be visually FUN â€” dynamic angles, playful poses, unexpected moments
5. Ká»‚ CHUYá»†N (STORYTELLING): Build narrative: who is she? where is she going? what happens?
6. TÃŒNH HUá»NG XOAY CHUYá»‚N (TWIST): Scene 6-7 = sudden mood/location/style shift that surprises
7. Yáº¾U Tá» GÃ‚Y TRANH CÃƒI (CONTROVERSY TRIGGER): Include ONE scene with a deliberate "imperfect" or "debatable" element â€” slightly unusual styling choice, controversial fashion mix, or pose that people will comment about. This triggers engagement through comments and debates.
8. GIÃ TRá»Š CHIA Sáºº: Final scene = so beautiful or surprising that viewers tag friends or save the video

Create EXACTLY 9 scenes. Each scene = 1 photo â†’ 3-second video clip.

Scene Structure:
- Scene 1: HOOK â€” dramatic/shocking/curiosity (makes them STOP scrolling)
- Scene 2-3: SETUP â€” introduce character + outfit (education element: style tip)
- Scene 4-5: RISING ACTION â€” showcase from multiple angles (entertainment: dynamic)
- Scene 6: CONTROVERSY SCENE â€” the "imperfect" moment that triggers debate/comments
- Scene 7: TWIST â€” unexpected shift in mood/location/emotion
- Scene 8-9: CLIMAX + FINALE â€” most stunning shots + memorable ending (share-worthy)

Rules:
- All 9 scenes: SAME person, SAME outfit, SAME location area
- Mix camera angles: front, back, side, close-up, selfie, wide, artistic
- Scenes must be SEQUENTIAL - each scene is the NEXT MOMENT in time
${storyContext ? `\\nShared context: ${storyContext}` : ''}

Return ONLY a valid JSON array with exactly 9 objects:
- "title": short Vietnamese scene name (2-4 words)
- "pose": detailed English pose description (full sentence, 15+ words)
- "camera": English camera angle description
- "emotion": English emotion/expression (2-3 words)

Example:
[{"title":"ÄÃ³ng bÄƒng thá»i gian","pose":"Standing frozen mid-stride, hair and skirt caught in wind, dramatic backlit silhouette, one hand reaching forward","camera":"Low angle wide shot, golden hour backlight","emotion":"Mysterious, powerful"}]

CONTROVERSY SCENE (Scene 6) - pick ONE realistic accident:
- Wind blows skirt up (she catches it embarrassed)
- Cute dog pulls on her skirt
- She spills coffee on white outfit
- Her heel breaks and she stumbles
- Her dress catches on something
Must look NATURAL, creates viral comments!

Return ONLY the JSON array, no markdown.`

            const aiResponse = await callGemini({ prompt: analyzePrompt, images: allImages })

            // Parse JSON from response
            let parsed
            try {
                const jsonMatch = aiResponse.match(/\[\s*\{[\s\S]*\}\s*\]/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[0])
                } else {
                    parsed = JSON.parse(aiResponse)
                }
            } catch (e) {
                console.error('Failed to parse AI scene response:', e, aiResponse)
                alert('AI khÃ´ng thá»ƒ phÃ¢n tÃ­ch. Vui lÃ²ng thá»­ láº¡i hoáº·c viáº¿t ká»‹ch báº£n thá»§ cÃ´ng.')
                setAnalyzing(false)
                return
            }

            if (Array.isArray(parsed) && parsed.length > 0) {
                const newScenes = parsed.slice(0, 9).map(s => ({
                    title: s.title || 'Cáº£nh',
                    pose: s.pose || '',
                    camera: s.camera || '',
                    emotion: s.emotion || 'Natural'
                }))
                setScenes(newScenes)
                console.log('[Auto-analyze] Generated', newScenes.length, 'scenes')
            }
        } catch (err) {
            console.error('[Auto-analyze error]', err)
            alert('Lá»—i phÃ¢n tÃ­ch: ' + err.message)
        }
        setAnalyzing(false)
    }

    // â”€â”€â”€ Generate ALL scenes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleGenerateAll = async () => {
        if (productImages.length === 0 || scenes.length === 0) return
        setGenerating(true)
        setErrors({})
        setResults({})
        const allIdx = new Set(scenes.map((_, i) => i))
        setLoadingSet(allIdx)

        try {
            const productFiles = await entriesToFiles(productImages)
            const refFiles = refImages.length > 0 ? await entriesToFiles(refImages) : []

            // Bot 1 + Bot 2 analysis
            const [extractedIdentity, extractedProduct] = await Promise.all([
                refFiles.length > 0
                    ? callGemini({ prompt: getPrompt('BOT1_IDENTITY_ANALYZER'), images: refFiles })
                    : Promise.resolve(''),
                callGemini({ prompt: getPrompt('BOT2_GARMENT_ANALYZER'), images: productFiles }),
            ])

            console.log('[Story Bot1]', extractedIdentity?.substring(0, 100))
            console.log('[Story Bot2]', extractedProduct?.substring(0, 100))

            const mainFile = productFiles[0]

            // Generate each scene
            const tasks = scenes.map((scene, idx) =>
                (async () => {
                    try {
                        const shotDesc = `STORYTELLING SCENE ${idx + 1} of ${scenes.length}: "${scene.title}"
THIS IS SCENE ${idx + 1} IN A CONTINUOUS STORY. This specific scene happens IMMEDIATELY AFTER scene ${idx} and BEFORE scene ${idx + 2}.
VIDEO CLIP: This image will become a 3-second short video clip. Design the pose to have subtle motion potential.
Pose & Action: ${scene.pose}
Camera Angle: ${scene.camera || 'Professional fashion photography angle'}
Emotion & Expression: ${scene.emotion}
${storyContext ? `Shared Story Context: ${storyContext}` : ''}

=== DNA PROFILE â€” ABSOLUTE CHARACTER LOCK ===
CRITICAL: You MUST maintain 100% IDENTICAL character across ALL ${scenes.length} scenes:

FACE LOCK:
- SAME face shape, eyes, nose, lips, jawline, chin â€” this is ONE PERSON
- SAME makeup style and intensity in every scene
- SAME eyebrow shape and thickness

BODY LOCK:
- SAME breast size (do NOT change cup size between scenes â€” keep EXACT same proportions)
- SAME waist, hip, shoulder width â€” identical body proportions
- SAME height and leg length
- SAME body weight â€” no thinner/thicker between scenes

HAIR LOCK:
- SAME hair color, length, style, bangs â€” do NOT change hairstyle

OUTFIT LOCK:
- SAME clothes, same fabric color, same pattern, SAME shoes
- If wearing a specific item â†’ it appears IDENTICALLY in every scene

PROP LOCK:
- If scene uses a bicycle â†’ SAME bicycle model, SAME basket/no-basket, SAME color in ALL scenes that show it
- If scene uses an umbrella â†’ SAME umbrella in all scenes with it
- Do NOT add or remove accessories between scenes

TIME & LOCATION CONTINUITY:
- All scenes happen in the SAME time of day (same lighting direction, same shadow angle)
- All scenes feel like the SAME location area (same architecture style, same color palette)
- Weather is CONSISTENT across all scenes

${extractedIdentity ? `\nExtracted Identity DNA: ${extractedIdentity}` : ''}

IMPORTANT: Each scene = next moment in a CONTINUOUS story. Same person, same everything, different pose/angle only.`

                        const prompt = buildMasterImagePrompt({
                            extractedIdentity,
                            extractedProduct,
                            modelType: 'ðŸ¤– Auto (AI tá»± chá»n)',
                            background: 'ðŸ¤– Auto (AI tá»± chá»n)',
                            pose: 'ðŸ¤– Auto (AI tá»± chá»n)',
                            style: 'ðŸ¤– Auto (AI tá»± chá»n)',
                            skinFilter,
                            toneFilter,
                            quality, aspect,
                            userPrompt: '',
                            shotDescription: shotDesc,
                        })

                        const result = await generateGarmentImage(mainFile, prompt, { quality, aspect })
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

    const canGenerate = productImages.length > 0 && scenes.length > 0 && !generating
    const isCustom = selectedTemplate?.id === 'custom'
    const totalDuration = scenes.length * 3

    // â”€â”€â”€ RENDER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <div className="fade-in">
            <h1 className="page-title">ðŸ“– Storytelling â€” Ká»ƒ chuyá»‡n báº±ng hÃ¬nh áº£nh</h1>

            {/* â”€â”€ Step 1: Choose Template â”€â”€ */}
            {!selectedTemplate ? (
                <div className="st-templates">
                    <h2 className="st-section-title">Chá»n ká»‹ch báº£n cÃ¢u chuyá»‡n</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                        Má»—i ká»‹ch báº£n gá»“m <strong>9 phÃ¢n cáº£nh Ã— 3 giÃ¢y</strong> = video 27s háº¥p dáº«n.
                        Äa dáº¡ng gÃ³c mÃ¡y + cáº£m xÃºc â†’ tÄƒng tá»· lá»‡ giá»¯ chÃ¢n tá»‘i Ä‘a trÃªn TikTok/Reels.
                    </p>
                    <div className="st-template-grid">
                        {STORY_TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="st-template-card" onClick={() => selectTemplate(tpl)}>
                                <div className="st-template-name">{tpl.name}</div>
                                <div className="st-template-desc">{tpl.description}</div>
                                <div className="st-template-count">
                                    {tpl.scenes.length > 0 ? `${tpl.scenes.length} cáº£nh Ã— 3s = ${tpl.scenes.length * 3}s` : 'Tá»± do'}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* â”€â”€ Header â”€â”€ */}
                    <div className="st-header">
                        <button className="btn btn-ghost" onClick={() => { setSelectedTemplate(null); setScenes([]); setResults({}); setErrors({}) }}>
                            â† Äá»•i ká»‹ch báº£n
                        </button>
                        <h2 className="st-active-title">{selectedTemplate.name}</h2>
                        <span className="st-scene-count">{scenes.length} cáº£nh Ã— 3s = {totalDuration}s</span>
                    </div>

                    <div className="st-layout">
                        {/* â•â•â• LEFT: Settings â•â•â• */}
                        <div className="st-settings">

                            {/* Reference images */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">1</div>
                                    <div className="design-step-title">áº¢nh máº«u ({refImages.length}/5)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => refFileRef.current?.click()}>
                                        <Upload size={13} /> Táº£i
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
                                    <div className="design-step-title">Sáº£n pháº©m ({productImages.length}/8)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => productFileRef.current?.click()}>
                                        <Upload size={13} /> Táº£i
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

                            {/* â”€â”€ Pose Library â”€â”€ */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number" style={{ background: 'linear-gradient(135deg, #e91e63, #ff5722)' }}>P</div>
                                    <div className="design-step-title">ðŸ“¸ ThÆ° viá»‡n Pose</div>
                                </div>
                                <div className="nd-settings-body">
                                    {/* Pose ref upload */}
                                    <div className="form-group">
                                        <label className="nd-label">áº¢NH TÆ¯ THáº¾ THAM CHIáº¾U</label>
                                        <div className="nd-img-grid">
                                            {poseRefImages.map((img, i) => (
                                                <div key={i} className="img-slot filled">
                                                    <img src={img.url} alt="" />
                                                    <button className="img-slot-remove" onClick={() => setPoseRefImages(prev => prev.filter((_, j) => j !== i))}><X size={12} /></button>
                                                </div>
                                            ))}
                                            {poseRefImages.length < 3 && (
                                                <>
                                                    <div className="img-slot empty" onClick={() => setShowPoseLibrary(true)} title="Chá»n tá»« thÆ° viá»‡n Pose">
                                                        <Plus size={18} style={{ color: 'var(--brand)' }} />
                                                        <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>Kho Pose</span>
                                                    </div>
                                                </>
                                            )}
                                            <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => poseRefFileRef.current?.click()}>
                                                <Upload size={12} /> Táº£i
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
                                                <span className="pose-selected-emoji">âœ… {selectedPoses.length}/9</span>
                                                <div>
                                                    <div className="pose-selected-name">ÄÃ£ chá»n {selectedPoses.length} tÆ° tháº¿</div>
                                                    <div className="pose-selected-desc">{selectedPoses.map(p => p.name).join(' â€¢ ')}</div>
                                                </div>
                                            </div>
                                            <button className="btn btn-ghost" style={{ fontSize: 11, flexShrink: 0 }}
                                                onClick={() => setSelectedPoses([])}>
                                                <X size={12} /> XÃ³a háº¿t
                                            </button>
                                        </div>
                                    )}

                                    {/* Pose Library toggle */}
                                    <button className="pose-lib-toggle" onClick={() => setShowPoseLibrary(p => !p)}>
                                        {showPoseLibrary ? 'Thu gá»n thÆ° viá»‡n' : `ðŸ“š Má»Ÿ thÆ° viá»‡n ${POSE_LIBRARY.length} tÆ° tháº¿`}
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
                                                            {isSelected && <div className="pose-card-check">âœ…</div>}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
                                                ðŸ’¡ Chá»n tá»‘i Ä‘a 9 tÆ° tháº¿ â€” má»—i cáº£nh sáº½ sá»­ dá»¥ng 1 tÆ° tháº¿ khÃ¡c nhau
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Quality + Aspect */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">3</div>
                                    <div className="design-step-title">CÃ i Ä‘áº·t Ä‘áº§u ra</div>
                                </div>
                                <div className="nd-settings-body">
                                    <div className="nd-row-2">
                                        <div className="form-group">
                                            <label className="nd-label">CHáº¤T LÆ¯á»¢NG áº¢NH</label>
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
                                            <label className="nd-label">Tá»¶ Lá»† KHUNG HÃŒNH</label>
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
                                            <label className="nd-label">ðŸŽ¨ TONE DA / SKIN FILTER</label>
                                            <div className="pose-templates">
                                                {SKIN_OPTS.map(s => (
                                                    <button key={s}
                                                        className={`pose-tpl-btn${skinFilter === s ? ' active' : ''}`}
                                                        onClick={() => setSkinFilter(s)}>
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="nd-label">ðŸŒˆ TONE MÃ€U / COLOR FILTER</label>
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
                                    <div className="design-step-title">Bá»‘i cáº£nh & Ká»‹ch báº£n</div>
                                </div>
                                <div className="nd-settings-body">
                                    <div className="form-group">
                                        <label className="nd-label">Äá»ŠA ÄIá»‚M, Äáº O Cá»¤, PHá»¤ KIá»†N <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>(Ã¡p dá»¥ng táº¥t cáº£ cáº£nh)</span></label>
                                        <textarea className="nd-textarea" value={storyContext} onChange={e => setStoryContext(e.target.value)}
                                            placeholder="VD: ÄÆ°á»ng quÃª lÃºc golden hour, xe Honda Vision báº¡c, mÅ© báº£o hiá»ƒm tráº¯ng..." />
                                    </div>

                                    {/* Auto-analyze button */}
                                    <button className="pose-lib-toggle" onClick={handleAutoAnalyze}
                                        disabled={productImages.length === 0 || analyzing}
                                        style={{ background: analyzing ? 'rgba(255,107,53,0.06)' : undefined }}>
                                        {analyzing ? (
                                            <><Loader size={14} className="spin" style={{ verticalAlign: -2 }} /> AI Ä‘ang phÃ¢n tÃ­ch áº£nh vÃ  táº¡o ká»‹ch báº£n 9 cáº£nh...</>
                                        ) : (
                                            <>ðŸ§  AI tá»± Ä‘á»™ng phÃ¢n tÃ­ch áº£nh â†’ Táº¡o ká»‹ch báº£n 9 cáº£nh</>
                                        )}
                                    </button>
                                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                                        ðŸ’¡ AI sáº½ phÃ¢n tÃ­ch trang phá»¥c, ngÆ°á»i máº«u, bá»‘i cáº£nh tá»« áº£nh upload Ä‘á»ƒ tá»± táº¡o 9 phÃ¢n cáº£nh tá»‘i Æ°u.
                                        <br />âš¡ Náº¿u báº¡n viáº¿t ká»‹ch báº£n hoáº·c chá»n template â†’ ká»‹ch báº£n Ä‘Ã³ Ä‘Æ°á»£c <strong>Æ°u tiÃªn tuyá»‡t Ä‘á»‘i</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Generate button */}
                            <button className="nd-generate-btn" onClick={handleGenerateAll} disabled={!canGenerate}>
                                {generating ? (
                                    <><Loader size={18} className="spin" /> Äang táº¡o {scenes.length} phÃ¢n cáº£nh...</>
                                ) : (
                                    <><Sparkles size={18} /> Táº¡o {scenes.length} cáº£nh Ã— 3s = {totalDuration}s video</>
                                )}
                            </button>
                        </div>

                        {/* â•â•â• RIGHT: Scene Timeline â•â•â• */}
                        <div className="st-timeline">
                            <div className="st-timeline-header">
                                <h3 className="st-section-title" style={{ margin: 0 }}>
                                    <Film size={18} style={{ verticalAlign: -3 }} /> Timeline â€” {scenes.length} cáº£nh ({totalDuration}s)
                                </h3>
                                {isCustom && (
                                    <button className="btn btn-ghost" onClick={addScene}>
                                        <PlusCircle size={14} /> ThÃªm cáº£nh
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
                                                alert(res.success ? `âœ… ÄÃ£ lÆ°u "${scene.title}" vÃ o kho!` : 'âŒ Lá»—i lÆ°u: ' + res.error)
                                            } catch (e) { alert('âŒ Lá»—i: ' + e.message) }
                                        }}
                                        onDownload={() => {
                                            if (!results[idx]) return
                                            downloadImage(results[idx], `Story-Scene-${idx + 1}-${scene.title}.png`)
                                        }}
                                        isCustom={isCustom}
                                    />
                                ))}

                                {isCustom && (
                                    <div className="st-add-scene" onClick={addScene}>
                                        <PlusCircle size={32} />
                                        <span>ThÃªm phÃ¢n cáº£nh</span>
                                    </div>
                                )}
                            </div>

                            {/* Custom scene editor */}
                            {isCustom && scenes.length > 0 && (
                                <div className="st-scene-editor">
                                    <h3 className="st-section-title">Chá»‰nh sá»­a phÃ¢n cáº£nh</h3>
                                    {scenes.map((scene, idx) => (
                                        <div key={idx} className="st-edit-row">
                                            <div className="st-edit-number">{idx + 1}</div>
                                            <div className="st-edit-fields">
                                                <input className="nd-input" value={scene.title}
                                                    onChange={e => updateScene(idx, 'title', e.target.value)}
                                                    placeholder="TÃªn cáº£nh..." />
                                                <textarea className="nd-textarea" style={{ minHeight: 50 }}
                                                    value={scene.pose}
                                                    onChange={e => updateScene(idx, 'pose', e.target.value)}
                                                    placeholder="MÃ´ táº£ tÆ° tháº¿, hÃ nh Ä‘á»™ng..." />
                                                <input className="nd-input" value={scene.emotion}
                                                    onChange={e => updateScene(idx, 'emotion', e.target.value)}
                                                    placeholder="Cáº£m xÃºc: VD: Vui váº», mÆ¡ má»™ng..." />
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

            {/* Preview */}
            {previewImg && <ImagePreviewModal imageSrc={previewImg} onClose={() => setPreviewImg(null)} />}

            {/* Library Picker */}
            {
                libraryPicker && (
                    <LibraryPickerModal
                        title={libraryPicker === 'ref' ? 'Chá»n áº£nh máº«u' : 'Chá»n sáº£n pháº©m'}
                        onClose={() => setLibraryPicker(null)}
                        onSelect={handleLibraryPick}
                    />
                )
            }
        </div >
    )
}
