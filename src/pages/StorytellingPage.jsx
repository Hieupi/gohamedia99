import { useState, useRef } from 'react'
import {
    Upload, Sparkles, Download, Save, Trash2, X, Send, Plus,
    Image as ImageIcon, Loader, FolderOpen, Eye, GripVertical,
    ChevronDown, Film, BookOpen, PlusCircle
} from 'lucide-react'
import { generateGarmentImage, callGemini } from '../services/geminiService'
import { getPrompt, buildMasterImagePrompt, VN_DNA_DEFAULTS } from '../services/masterPrompts'
import { downloadImage, getLibraryItems } from '../services/libraryService'

// ─── Story Templates ──────────────────────────────────────────────────────────
const STORY_TEMPLATES = [
    {
        id: 'motorbike',
        name: '🏍️ Lái xe máy',
        description: 'Cô gái trẻ với xe máy trên đường quê, golden hour',
        scenes: [
            { title: 'Đứng trước xe', pose: 'Standing upright beside the scooter, holding helmet in one hand, slight hip shift, confident smile, full-body front-facing', camera: 'Full-body shot from feet up, scooter visible behind her', emotion: 'Confident, bright, cheerful' },
            { title: 'Ngồi bấm điện thoại', pose: 'Sitting relaxed on scooter seat, legs crossed, one hand holding phone close to face reading a message, playful charming expression', camera: 'Eye level, slightly tilted, encompassing subject and scooter', emotion: 'Relaxed, playful, enjoying the moment' },
            { title: 'Selfie trước xe', pose: 'Standing in front of scooter wearing helmet, one hand holding phone high for selfie, other hand on hip, leaning slightly forward, mischievous smile', camera: "Bird's eye view from phone perspective, panoramic from face downward", emotion: 'Fun, youthful, social media vibe' },
            { title: 'Ngồi tinh nghịch', pose: 'Sitting on seat wearing helmet, one hand on handlebars, head tilted to side looking away dreamily, playful expression', camera: 'Full-body close-up from feet up with scooter and background', emotion: 'Dreamy, captivating, artistic' },
            { title: 'Cận mặt dễ thương', pose: 'Sitting on scooter, hand touching chin/lips, looking to the side with sweet coy smile, hair flowing', camera: 'Close-up upper body and face, shallow DOF bokeh', emotion: 'Sweet, charming, intimate' },
            { title: 'Lái xe trên đường', pose: 'Riding scooter on road, helmet on, hands on handlebars, slight smile, hair and clothes flowing in wind', camera: 'Front view at eye level from road, wide shot', emotion: 'Free, adventurous, cinematic' },
        ]
    },
    {
        id: 'cafe',
        name: '☕ Cafe chiều',
        description: 'Buổi chiều thư giãn tại quán cafe vintage',
        scenes: [
            { title: 'Bước vào quán', pose: 'Walking through cafe entrance, pushing glass door, slight turn back at camera with sweet smile', camera: 'Full-body from inside cafe looking toward entrance', emotion: 'Anticipation, elegant arrival' },
            { title: 'Chọn chỗ ngồi', pose: 'Standing by window table, hand touching chair back, looking down at the seat deciding, natural stance', camera: '3/4 angle showing cafe interior and window light', emotion: 'Casual, contemplative' },
            { title: 'Đọc menu', pose: 'Sitting at table, holding menu with both hands, looking down at it with interested expression, gentle smile', camera: 'Waist-up from across table, warm bokeh background', emotion: 'Curious, relaxed' },
            { title: 'Thưởng thức đồ uống', pose: 'Holding coffee cup with both hands near face, eyes closed in enjoyment, gentle steam visible, serene expression', camera: 'Close-up face and hands with cup, shallow DOF', emotion: 'Blissful, cozy, warm' },
            { title: 'Chụp ảnh đồ uống', pose: 'Holding phone above coffee cup taking photo for social media, bird eye view of table setup, concentrated cute expression', camera: 'Over-shoulder angle showing phone and table', emotion: 'Modern, social, fun' },
            { title: 'Ngắm ra cửa sổ', pose: 'Chin resting on hand, gazing out window with dreamy far-away look, golden light on face, coffee cup in front', camera: 'Side profile with window light, cinematic wide', emotion: 'Peaceful, dreamy, golden hour' },
        ]
    },
    {
        id: 'shopping',
        name: '🛍️ Đi mua sắm',
        description: 'Một ngày shopping tại trung tâm thương mại',
        scenes: [
            { title: 'Bước vào mall', pose: 'Walking confidently through mall entrance, shopping bags in hand, hair flowing, bright smile', camera: 'Full-body front facing, mall interior visible behind', emotion: 'Excited, confident' },
            { title: 'Xem đồ trên kệ', pose: 'Standing at clothing rack, one hand touching fabric, head tilted examining the garment, thoughtful expression', camera: '3/4 angle showing clothes rack and model', emotion: 'Curious, interested' },
            { title: 'Thử đồ trước gương', pose: 'Standing before full-length mirror, holding outfit against body, turning slightly, checking reflection with pleased smile', camera: 'Mirror reflection shot showing both model and reflection', emotion: 'Happy, deciding' },
            { title: 'Selfie phòng thử đồ', pose: 'In fitting room, new outfit on, phone held up for mirror selfie, confident pose, peace sign', camera: 'Mirror selfie perspective from phone', emotion: 'Proud, fun, sharing moment' },
            { title: 'Nghỉ ngơi ăn kem', pose: 'Sitting at food court bench, legs crossed, eating ice cream, playful expression, shopping bags beside her', camera: 'Eye level lifestyle shot with mall background', emotion: 'Relaxed, sweet, enjoying' },
            { title: 'Ra về hạnh phúc', pose: 'Walking out of mall doors, multiple shopping bags, big genuine smile, sunset light behind, looking back at camera', camera: 'Full-body from outside, golden hour backlight', emotion: 'Satisfied, glowing, cinematic finale' },
        ]
    },
    {
        id: 'custom',
        name: '✏️ Tự tạo kịch bản',
        description: 'Tạo câu chuyện của riêng bạn',
        scenes: []
    },
]

// ─── Scene Card Component ─────────────────────────────────────────────────────

function SceneCard({ scene, index, imageSrc, isLoading, error, onPreview, onRemove, isCustom }) {
    return (
        <div className="st-scene-card">
            <div className="st-scene-header">
                <span className="st-scene-number">{index + 1}</span>
                <span className="st-scene-title">{scene.title}</span>
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
                ) : error ? (
                    <div className="st-scene-placeholder">
                        <span style={{ color: '#ef4444', fontSize: 12 }}>❌ {error}</span>
                    </div>
                ) : imageSrc ? (
                    <>
                        <img src={imageSrc} alt={scene.title} className="st-scene-img" />
                        <button className="nd-preview-btn" onClick={onPreview} title="Xem phóng to">
                            <Eye size={16} />
                        </button>
                    </>
                ) : (
                    <div className="st-scene-placeholder">
                        <Film size={28} style={{ opacity: 0.2 }} />
                        <span>{scene.title}</span>
                    </div>
                )}
            </div>
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

// ─── Library Picker Modal ─────────────────────────────────────────────────────

function LibraryPickerModal({ onSelect, onClose, title }) {
    const items = getLibraryItems()
    return (
        <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: 30 }}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', width: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
                    <FolderOpen size={18} style={{ verticalAlign: -3 }} /> {title || 'Chọn từ Kho Thư Viện'}
                </h3>
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        Kho thư viện trống.
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

    // Images
    const [refImages, setRefImages] = useState([])
    const [productImages, setProductImages] = useState([])

    // Story
    const [selectedTemplate, setSelectedTemplate] = useState(null)
    const [scenes, setScenes] = useState([])
    const [storyContext, setStoryContext] = useState('')  // shared context: location, props, accessories

    // Settings
    const [quality] = useState('2K (HD)')
    const [aspect] = useState('9:16 Dọc (Story)')

    // Generation
    const [results, setResults] = useState({})
    const [loadingSet, setLoadingSet] = useState(new Set())
    const [errors, setErrors] = useState({})
    const [generating, setGenerating] = useState(false)

    // Modals
    const [previewImg, setPreviewImg] = useState(null)
    const [libraryPicker, setLibraryPicker] = useState(null)

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const selectTemplate = (tpl) => {
        setSelectedTemplate(tpl)
        setScenes([...tpl.scenes])
        setResults({})
        setErrors({})
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

    const handleLibraryPick = (item) => {
        if (libraryPicker === 'ref') {
            setRefImages(prev => [...prev, { url: item.imageSrc }].slice(0, 5))
        } else {
            setProductImages(prev => [...prev, { url: item.imageSrc }].slice(0, 8))
        }
        setLibraryPicker(null)
    }

    // ─── Generate ALL scenes ──────────────────────────────────────────────────

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
Pose & Action: ${scene.pose}
Camera Angle: ${scene.camera || 'Professional fashion photography angle'}
Emotion & Expression: ${scene.emotion}
${storyContext ? `Shared Story Context (location, props, accessories): ${storyContext}` : ''}
IMPORTANT: Maintain 100% visual consistency with all other scenes — same person, same outfit, same location style, same color grading.`

                        const prompt = buildMasterImagePrompt({
                            extractedIdentity,
                            extractedProduct,
                            modelType: '🤖 Auto (AI tự chọn)',
                            background: '🤖 Auto (AI tự chọn)',
                            pose: '🤖 Auto (AI tự chọn)',
                            style: '🤖 Auto (AI tự chọn)',
                            skinFilter: 'Da trắng hồng',
                            toneFilter: 'Soft dreamy',
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

    // ─── RENDER ───────────────────────────────────────────────────────────────

    return (
        <div className="fade-in">
            <h1 className="page-title">📖 Storytelling — Kể chuyện bằng hình ảnh</h1>

            {/* ── Step 1: Choose Template ── */}
            {!selectedTemplate ? (
                <div className="st-templates">
                    <h2 className="st-section-title">Chọn kịch bản câu chuyện</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
                        Mỗi kịch bản gồm nhiều phân cảnh liên tục, tạo thành 1 câu chuyện hình ảnh thu hút.
                        Lý tưởng để làm video TikTok/Reels kể chuyện.
                    </p>
                    <div className="st-template-grid">
                        {STORY_TEMPLATES.map(tpl => (
                            <div key={tpl.id} className="st-template-card" onClick={() => selectTemplate(tpl)}>
                                <div className="st-template-name">{tpl.name}</div>
                                <div className="st-template-desc">{tpl.description}</div>
                                <div className="st-template-count">
                                    {tpl.scenes.length > 0 ? `${tpl.scenes.length} phân cảnh` : 'Tự do'}
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
                        <span className="st-scene-count">{scenes.length} phân cảnh</span>
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

                            {/* Story context */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">3</div>
                                    <div className="design-step-title">Bối cảnh chung</div>
                                </div>
                                <div style={{ padding: '0' }}>
                                    <label className="nd-label">ĐỊA ĐIỂM, ĐẠO CỤ, PHỤ KIỆN (áp dụng tất cả cảnh)</label>
                                    <textarea className="nd-textarea" value={storyContext} onChange={e => setStoryContext(e.target.value)}
                                        placeholder="VD: Đường quê lúc golden hour, xe Honda Vision bạc, mũ bảo hiểm trắng, Apple Watch trắng, đồng hồ trái tay, giày trắng..." />
                                </div>
                            </div>

                            {/* Generate button */}
                            <button className="nd-generate-btn" onClick={handleGenerateAll} disabled={!canGenerate}>
                                {generating ? (
                                    <><Loader size={18} className="spin" /> Đang tạo {scenes.length} phân cảnh...</>
                                ) : (
                                    <><Sparkles size={18} /> Tạo {scenes.length} phân cảnh Storytelling</>
                                )}
                            </button>
                        </div>

                        {/* ═══ RIGHT: Scene Timeline ═══ */}
                        <div className="st-timeline">
                            <div className="st-timeline-header">
                                <h3 className="st-section-title" style={{ margin: 0 }}>
                                    <Film size={18} style={{ verticalAlign: -3 }} /> Timeline — {scenes.length} cảnh
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
            )}

            {/* Preview */}
            {previewImg && <ImagePreviewModal imageSrc={previewImg} onClose={() => setPreviewImg(null)} />}

            {/* Library Picker */}
            {libraryPicker && (
                <LibraryPickerModal
                    title={libraryPicker === 'ref' ? 'Chọn ảnh mẫu' : 'Chọn sản phẩm'}
                    onClose={() => setLibraryPicker(null)}
                    onSelect={handleLibraryPick}
                />
            )}
        </div>
    )
}
