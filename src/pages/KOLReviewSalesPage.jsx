import { useMemo, useRef, useState } from 'react'
import { Upload, Sparkles, X, Plus, Copy, Check, MessageSquareText, Wand2, Film, FolderOpen } from 'lucide-react'
import Portal from '../components/Portal'
import { callGemini } from '../services/geminiService'
import { getLibraryItems } from '../services/libraryService'

const KOL_TEMPLATES = [
    {
        id: 'home-appliance',
        name: 'KOL Bán Hàng Gia Dụng',
        description: 'Tập trung pain point sinh hoạt, demo trước-sau, nhấn tiết kiệm thời gian/công sức, CTA chốt đơn nhanh.',
        systemInstruction: `Bạn là KOL chuyên bán hàng gia dụng. Ưu tiên ngôn ngữ đời sống gia đình, mô tả tình huống thực tế, nêu công năng đo được, xử lý phản đối về độ bền, bảo hành, công suất, điện năng.`,
        contextHint: 'Ví dụ: nồi chiên, máy hút bụi, máy lọc nước, robot lau nhà...',
    },
    {
        id: 'fashion',
        name: 'KOL Bán Thời Trang',
        description: 'Tập trung form dáng, chất liệu, phối đồ theo ngữ cảnh, xử lý lo ngại size/chất vải, CTA mua ngay.',
        systemInstruction: `Bạn là KOL thời trang thiên về chuyển đổi. Viết thoại giàu hình dung về form, chất liệu, độ co giãn, hoàn cảnh mặc, cách phối nhanh. Luôn có lý do mua ngay: ưu đãi, số lượng giới hạn, trend.`,
        contextHint: 'Ví dụ: váy công sở, set đi chơi, áo khoác, outfit theo dáng người...',
    },
    {
        id: 'karaoke-audio',
        name: 'KOL Bán Âm Thanh Karaoke',
        description: 'Tập trung chất âm, chống hú, độ rõ mic, ghép thiết bị, nhấn trải nghiệm thực chiến và CTA chốt đơn.',
        systemInstruction: `Bạn là KOL thiết bị âm thanh karaoke. Luôn dùng từ khóa chuyên ngành dễ hiểu: chống hú, độ nhạy mic, bass-mid-treble, công suất, độ trễ, kết nối. Có ngữ cảnh test giọng thật và so sánh trước-sau.`,
        contextHint: 'Ví dụ: loa kéo, micro không dây, mixer karaoke, soundcard...',
    },
    {
        id: 'computer',
        name: 'KOL Bán Máy Tính',
        description: 'Tập trung nhu cầu sử dụng, hiệu năng, tản nhiệt, độ ổn định, xử lý lo ngại giá và CTA chuyển đổi.',
        systemInstruction: `Bạn là KOL công nghệ bán máy tính theo nhu cầu thật: học tập, văn phòng, gaming, thiết kế. Diễn giải cấu hình bằng lợi ích sử dụng, nêu benchmark ngắn gọn, tránh nói mơ hồ, có chốt đơn rõ.`,
        contextHint: 'Ví dụ: laptop văn phòng, PC gaming, mini PC, màn hình + phụ kiện...',
    },
]

const PLATFORM_CHOICES = ['Facebook', 'YouTube', 'TikTok']

const BASE_SETUP_PROMPT = {
    video_style: {
        type: 'photorealistic',
        quality: 'high-quality beauty tutorial',
        aesthetic: 'vlog',
        camera: {
            shot: 'medium close-up',
            angle: 'eye-level',
            movement: 'static',
        },
        lighting: 'soft natural lighting, warm and flattering',
        motion: 'smooth and natural movements',
    },
    character: {
        appearance: {
            ethnicity: 'Asian',
            reference: 'photo #1',
            hair: 'long wavy ash-brown hair',
            outfit: 'beige ribbed knit sweater',
        },
        expression: 'gentle smile, friendly, approachable',
        tone: 'Vietnamese, soft, natural influencer style',
    },
    lip_sync: {
        quality: 'precise lip-sync to dialogue',
        movement: 'realistic mouth shapes with subtle jaw motion',
        constraint: 'lips must accurately match spoken audio at all times',
    },
    body_language: {
        posture: 'grounded and stable',
        gesture: 'minimal hand movement only when necessary',
        movement: 'no fidgeting, no unnecessary motion',
    },
    environment: {
        location: 'bright bedroom',
        details: [
            'white vanity table with mirror on the left',
            'wooden wardrobe on the right',
            'soft-focus background',
        ],
        atmosphere: 'clean, cozy, inviting',
    },
    product: {
        name: 'Skin Aqua Tone Up UV Essence sunscreen',
        reference: 'photo #2',
        requirements: [
            'keep exact perspective',
            'keep exact composition',
            'keep exact color',
            'keep exact orientation',
            'label clearly visible',
        ],
    },
    audio: {
        quality: 'balanced, clear dialogue, studio-like sound',
        noise: 'no background music, no echo, no ambient noise, no laughter, no giggle, no wow. Clean speech only. MANDATORY: Each sentence and scene ends cleanly with no added vocal effects.',
    },
    negative_constraints: [
        'ASMR',
        'whispering',
        'breathy voice',
        'hushed tone',
        'exaggerated expression',
        'hyper movement',
        'cartoonish behavior',
        'intense grin',
        'rubbery face',
        'overly animated mouth',
        'wild body movement',
        'fidgeting',
        'pacing',
        'shaky camera',
        'dynamic camera',
        'fast cuts',
        'loud ambience',
        'echoey space',
        'background music',
    ],
}

function countWords(text) {
    if (!text) return 0
    return text
        .trim()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter(Boolean).length
}

function parseModelJson(rawText) {
    const withoutThink = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    const cleaned = withoutThink.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

    try {
        return JSON.parse(cleaned)
    } catch {
        const objectMatch = cleaned.match(/\{[\s\S]*\}/)
        if (objectMatch) return JSON.parse(objectMatch[0])
        throw new Error('AI trả về không đúng định dạng JSON. Vui lòng thử lại.')
    }
}

function buildSetupPrompt({ productName, characterDescription, toneOverride }) {
    const setup = JSON.parse(JSON.stringify(BASE_SETUP_PROMPT))
    if (productName?.trim()) {
        setup.product.name = productName.trim()
    }

    if (characterDescription?.trim()) {
        const parts = characterDescription
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean)
        if (parts[0]) setup.character.appearance.hair = parts[0]
        if (parts[1]) setup.character.appearance.outfit = parts.slice(1).join(', ')
    }

    if (toneOverride?.trim()) {
        setup.character.tone = toneOverride.trim()
    }

    return setup
}

function buildScenePrompt(scene) {
    return {
        scenes: [
            {
                scene: scene.scene,
                action: scene.action,
                dialogue: scene.dialogue,
            },
        ],
    }
}

function buildVideoPrompt(setupPrompt, scenePrompt) {
    return `=========SETUP PROMPT========
${JSON.stringify(setupPrompt, null, 2)}
=========END SETUP PROMPT========

===========SCENE PROMPT=========
${JSON.stringify(scenePrompt, null, 2)}
===========END SCENE PROMPT=========`
}

function buildStepOutputs(setupPrompt, scenes) {
    const step1 = scenes
        .map((scene) => {
            return `[Cảnh ${scene.scene} | ${scene.durationSec}s]
Hành động: ${scene.action}
Thoại (${scene.wordCount} từ): ${scene.dialogue}`
        })
        .join('\n\n')

    const step2 = scenes
        .map((scene) => {
            return `[Cảnh ${scene.scene}] ${scene.title}
${scene.imagePrompt}`
        })
        .join('\n\n')

    const step3 = scenes
        .map((scene) => {
            return `[Cảnh ${scene.scene}] ${scene.title}
${buildVideoPrompt(setupPrompt, scene.scenePrompt)}`
        })
        .join('\n\n')

    return { step1, step2, step3 }
}

async function entryToFile(entry, name = 'image.png') {
    if (entry.file) return entry.file
    const response = await fetch(entry.url)
    const blob = await response.blob()
    return new File([blob], name, { type: blob.type || 'image/png' })
}

async function entriesToFiles(entries) {
    return Promise.all(entries.map((entry, idx) => entryToFile(entry, `asset-${idx}.png`)))
}

function LibraryPickerModal({ onSelect, onClose, title }) {
    const items = getLibraryItems()
    return (
        <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', width: 900, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, flexShrink: 0 }}>
                    <FolderOpen size={18} style={{ verticalAlign: -3 }} /> {title || 'Chọn từ Thư viện'}
                </h3>
                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                        Thư viện đang trống.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12, overflowY: 'auto', flex: 1, padding: '4px 0' }}>
                        {items.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => onSelect(item)}
                                style={{ cursor: 'pointer', borderRadius: 'var(--r-md)', overflow: 'hidden', border: '2px solid var(--border)', transition: 'all 0.15s' }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--brand)'
                                    e.currentTarget.style.transform = 'scale(1.03)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                    e.currentTarget.style.transform = 'scale(1)'
                                }}
                            >
                                <img src={item.imageSrc} alt={item.name} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
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

export default function KOLReviewSalesPage() {
    const refFileRef = useRef(null)
    const productFileRef = useRef(null)

    const [selectedTemplate, setSelectedTemplate] = useState(KOL_TEMPLATES[0])
    const [refImages, setRefImages] = useState([])
    const [productImages, setProductImages] = useState([])
    const [industryContext, setIndustryContext] = useState('')
    const [characterDescription, setCharacterDescription] = useState('long wavy ash-brown hair, beige ribbed knit sweater')
    const [productName, setProductName] = useState('Skin Aqua Tone Up UV Essence sunscreen')
    const [sceneCount, setSceneCount] = useState(2)
    const [platforms, setPlatforms] = useState(['Facebook', 'YouTube', 'TikTok'])
    const [setupPrompt, setSetupPrompt] = useState(null)
    const [scenes, setScenes] = useState([])
    const [error, setError] = useState('')
    const [generating, setGenerating] = useState(false)
    const [libraryPicker, setLibraryPicker] = useState(null)
    const [copiedKey, setCopiedKey] = useState('')

    const totalWords = useMemo(() => scenes.reduce((sum, scene) => sum + scene.wordCount, 0), [scenes])
    const stepOutputs = useMemo(() => {
        if (!setupPrompt || scenes.length === 0) return null
        return buildStepOutputs(setupPrompt, scenes)
    }, [setupPrompt, scenes])

    const handleCopy = async (key, text) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedKey(key)
            setTimeout(() => setCopiedKey(''), 1200)
        } catch {
            setError('Không thể sao chép. Trình duyệt đang chặn clipboard.')
        }
    }

    const togglePlatform = (platform) => {
        setPlatforms((prev) => {
            if (prev.includes(platform)) {
                if (prev.length === 1) return prev
                return prev.filter((item) => item !== platform)
            }
            return [...prev, platform]
        })
    }

    const selectTemplate = (template) => {
        setSelectedTemplate(template)
        setError('')
        setSetupPrompt(null)
        setScenes([])
    }

    const addRefImages = (files) => {
        const picked = Array.from(files)
            .filter((f) => f.type.startsWith('image/'))
            .slice(0, 5 - refImages.length)
        setRefImages((prev) => [...prev, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const addProductImages = (files) => {
        const picked = Array.from(files)
            .filter((f) => f.type.startsWith('image/'))
            .slice(0, 8 - productImages.length)
        setProductImages((prev) => [...prev, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const handleLibraryPick = (item) => {
        if (libraryPicker === 'ref') {
            setRefImages((prev) => [...prev, { url: item.imageSrc }].slice(0, 5))
        } else {
            setProductImages((prev) => [...prev, { url: item.imageSrc }].slice(0, 8))
        }
        setLibraryPicker(null)
    }

    const handleGenerate = async () => {
        if (refImages.length === 0) {
            setError('Cần ít nhất 1 ảnh người mẫu (photo #1) để khóa voice và setup KOL.')
            return
        }
        if (productImages.length === 0) {
            setError('Cần ít nhất 1 ảnh sản phẩm (photo #2) để tạo kịch bản KOL.')
            return
        }

        setGenerating(true)
        setError('')

        try {
            const productFiles = await entriesToFiles(productImages.slice(0, 2))
            const refFiles = refImages.length > 0 ? await entriesToFiles(refImages.slice(0, 2)) : []
            const imagesForAi = [...refFiles, ...productFiles]

            const aiPrompt = `You are a direct-response Vietnamese social commerce scriptwriter.

Task: Create a high-conversion KOL review script for ${platforms.join(', ')}.
Niche tab selected: ${selectedTemplate.name}
SYSTEM INSTRUCTION (BRAIN): ${selectedTemplate.systemInstruction}
Industry and product context from user:
${industryContext || selectedTemplate.contextHint}

Selected template: ${selectedTemplate.name}
Number of scenes: ${sceneCount}
Duration per scene: exactly 8 seconds.

HARD CONSTRAINTS:
1) Keep one consistent KOL voice/persona across all scenes.
2) Dialogue language: Vietnamese only.
3) Each scene dialogue must be 15-20 Vietnamese words.
4) Total words across all dialogues must be <= 40 words.
5) Strong conversion flow: hook -> key benefit/proof -> CTA to buy.
6) Natural speech pacing and lip-sync friendly.
7) Use image references order: photo #1 = model/KOL, photo #2 = product.
8) Every scene must include:
   - action (for Veo direction)
   - dialogue (Vietnamese line)
   - image_prompt (for Google Nano Banana 2, photorealistic and consistent with references)

Output ONLY valid JSON (no markdown):
{
  "character_override": {
    "appearance": "short phrase for hair + outfit",
    "tone": "short phrase for KOL voice style"
  },
  "product_override": {
    "name": "exact product name for setup prompt"
  },
  "scenes": [
    {
      "scene": 1,
      "title": "scene title",
      "duration_sec": 8,
      "action": "camera and action direction",
      "dialogue": "Vietnamese sentence",
      "image_prompt": "Nano Banana 2 image prompt"
    }
  ]
}`

            const raw = await callGemini({
                prompt: aiPrompt,
                images: imagesForAi,
                temperature: 0.35,
                maxTokens: 8192,
            })

            const parsed = parseModelJson(raw)
            if (!Array.isArray(parsed?.scenes) || parsed.scenes.length === 0) {
                throw new Error('AI chưa trả về danh sách cảnh hợp lệ.')
            }

            const setup = buildSetupPrompt({
                productName: parsed?.product_override?.name || productName,
                characterDescription: parsed?.character_override?.appearance || characterDescription,
                toneOverride: parsed?.character_override?.tone,
            })

            const normalizedScenes = parsed.scenes
                .slice(0, sceneCount)
                .map((scene, idx) => {
                    const safeDialogue = (scene.dialogue || '').trim()
                    const scenePrompt = buildScenePrompt({
                        scene: idx + 1,
                        action: (scene.action || '').trim(),
                        dialogue: safeDialogue,
                    })
                    return {
                        scene: idx + 1,
                        title: (scene.title || `Cảnh ${idx + 1}`).trim(),
                        durationSec: Number(scene.duration_sec) === 8 ? 8 : 8,
                        action: (scene.action || '').trim(),
                        dialogue: safeDialogue,
                        wordCount: countWords(safeDialogue),
                        imagePrompt: (scene.image_prompt || '').trim(),
                        scenePrompt,
                        videoPrompt: buildVideoPrompt(setup, scenePrompt),
                    }
                })

            const combinedWords = normalizedScenes.reduce((sum, scene) => sum + scene.wordCount, 0)
            if (combinedWords > 40) {
                setError(`Cảnh báo: tổng số từ đang là ${combinedWords} (>40). Bạn nên bấm tạo lại để đúng guideline Veo.`)
            }

            setSetupPrompt(setup)
            setScenes(normalizedScenes)
        } catch (err) {
            setError(err.message || 'Không thể tạo kịch bản KOL. Vui lòng thử lại.')
        } finally {
            setGenerating(false)
        }
    }

    return (
        <div className="fade-in">
            <h1 className="page-title">KOL Review Bán Hàng</h1>

            <div className="kol-subtabs-wrap">
                <div className="kol-subtabs">
                    {KOL_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            className={`kol-subtab${selectedTemplate.id === template.id ? ' active' : ''}`}
                            onClick={() => selectTemplate(template)}
                        >
                            {template.name}
                        </button>
                    ))}
                </div>
                <p className="kol-brain-note">
                    <strong>System Instruction (bộ não):</strong> {selectedTemplate.systemInstruction}
                </p>
            </div>

            <div className="st-header">
                <h2 className="st-active-title">{selectedTemplate.name}</h2>
                <span className="st-scene-count">{scenes.length || sceneCount} cảnh x 8s</span>
            </div>

            <div className="st-layout">
                        <div className="st-settings">
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">1</div>
                                    <div className="design-step-title">Ảnh người mẫu (photo #1)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => refFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={refFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addRefImages(e.target.files)} />
                                </div>
                                <div className="nd-img-grid">
                                    {refImages.map((img, idx) => (
                                        <div key={`${img.url}-${idx}`} className="img-slot filled">
                                            <img src={img.url} alt="" />
                                            <button className="img-slot-remove" onClick={() => setRefImages((prev) => prev.filter((_, i) => i !== idx))}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {refImages.length < 5 && (
                                        <div className="img-slot empty" onClick={() => setLibraryPicker('ref')}>
                                            <Plus size={18} style={{ color: 'var(--brand)' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">2</div>
                                    <div className="design-step-title">Ảnh sản phẩm (photo #2)</div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => productFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={productFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addProductImages(e.target.files)} />
                                </div>
                                <div className="nd-img-grid">
                                    {productImages.map((img, idx) => (
                                        <div key={`${img.url}-${idx}`} className="img-slot filled">
                                            <img src={img.url} alt="" />
                                            <button className="img-slot-remove" onClick={() => setProductImages((prev) => prev.filter((_, i) => i !== idx))}>
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {productImages.length < 8 && (
                                        <div className="img-slot empty" onClick={() => setLibraryPicker('product')}>
                                            <Plus size={18} style={{ color: 'var(--brand)' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">3</div>
                                    <div className="design-step-title">Cấu hình KOL</div>
                                </div>
                                <div className="nd-settings-body">
                                    <div className="form-group">
                                        <label className="nd-label">Nhân vật (tóc, trang phục)</label>
                                        <input
                                            className="nd-input"
                                            value={characterDescription}
                                            onChange={(e) => setCharacterDescription(e.target.value)}
                                            placeholder="VD: tóc nâu tro gợn sóng dài, áo len gân màu be"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="nd-label">Tên sản phẩm trong SETUP PROMPT</label>
                                        <input
                                            className="nd-input"
                                            value={productName}
                                            onChange={(e) => setProductName(e.target.value)}
                                            placeholder="Tên sản phẩm sẽ hiển thị trong setup"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="nd-label">Nền tảng mục tiêu</label>
                                        <div className="kol-chip-row">
                                            {PLATFORM_CHOICES.map((platform) => (
                                                <button
                                                    key={platform}
                                                    className={`kol-chip${platforms.includes(platform) ? ' active' : ''}`}
                                                    onClick={() => togglePlatform(platform)}
                                                >
                                                    {platform}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="nd-label">Số cảnh (khuyến nghị 2 cảnh)</label>
                                        <select className="nd-input" value={sceneCount} onChange={(e) => setSceneCount(Number(e.target.value))}>
                                            <option value={2}>2 cảnh (khuyến nghị)</option>
                                            <option value={3}>3 cảnh</option>
                                            <option value={4}>4 cảnh</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number">4</div>
                                    <div className="design-step-title">Chat ngành nghề + mục tiêu chuyển đổi</div>
                                </div>
                                <div className="nd-settings-body">
                                    <textarea
                                        className="nd-textarea"
                                        value={industryContext}
                                        onChange={(e) => setIndustryContext(e.target.value)}
                                        placeholder={selectedTemplate.contextHint}
                                    />
                                    <button className="nd-generate-btn" onClick={handleGenerate} disabled={generating}>
                                        {generating ? (
                                            <><span className="spin">...</span> Đang tạo 3 bước prompt...</>
                                        ) : (
                                            <><Sparkles size={18} /> Tạo kịch bản KOL (Bước 1-2-3)</>
                                        )}
                                    </button>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
                                        Quy tắc đã khóa cứng: 8s/cảnh, 15-20 từ/cảnh, tổng {'<='}40 từ, giữ giọng nói KOL nhất quán.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="st-timeline">
                            <div className="st-timeline-header">
                                <h3 className="st-section-title" style={{ margin: 0 }}>
                                    <Film size={18} style={{ verticalAlign: -3 }} /> Timeline KOL - {scenes.length} cảnh | Tổng {totalWords} từ
                                </h3>
                            </div>

                            {error && (
                                <div className="kol-alert">{error}</div>
                            )}

                            <div className="st-scenes-grid">
                                {scenes.length === 0 ? (
                                    <div className="st-scene-card">
                                        <div className="st-scene-placeholder">
                                            <MessageSquareText size={28} style={{ opacity: 0.25 }} />
                                            <span>Chưa có cảnh. Hãy tạo kịch bản bên trái.</span>
                                        </div>
                                    </div>
                                ) : (
                                    scenes.map((scene) => (
                                        <div key={scene.scene} className="st-scene-card">
                                            <div className="st-scene-header">
                                                <span className="st-scene-number">{scene.scene}</span>
                                                <span className="st-scene-title">{scene.title}</span>
                                                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>{scene.durationSec}s</span>
                                            </div>
                                            <div className="st-scene-meta">
                                                <div><strong>Hành động:</strong> {scene.action}</div>
                                                <div><strong>Thoại:</strong> {scene.dialogue}</div>
                                                <div><strong>Số từ:</strong> {scene.wordCount}</div>
                                            </div>
                                            <div className="kol-block">
                                                <div className="kol-block-header">
                                                    <span><Wand2 size={13} style={{ verticalAlign: -2 }} /> Prompt ảnh (Nano Banana 2)</span>
                                                    <button className="btn btn-ghost" onClick={() => handleCopy(`img-${scene.scene}`, scene.imagePrompt)}>
                                                        {copiedKey === `img-${scene.scene}` ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                <textarea className="nd-textarea kol-code" value={scene.imagePrompt} readOnly />
                                            </div>
                                            <div className="kol-block">
                                                <div className="kol-block-header">
                                                    <span><Film size={13} style={{ verticalAlign: -2 }} /> Prompt video (SETUP + SCENE)</span>
                                                    <button className="btn btn-ghost" onClick={() => handleCopy(`vid-${scene.scene}`, scene.videoPrompt)}>
                                                        {copiedKey === `vid-${scene.scene}` ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                <textarea className="nd-textarea kol-code" value={scene.videoPrompt} readOnly />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {stepOutputs && (
                                <div className="kol-step-wrap">
                                    <div className="kol-step-box">
                                        <div className="kol-block-header">
                                            <strong>Bước 1 - Kịch bản cảnh + thoại Veo 3.1 (8s)</strong>
                                            <button className="btn btn-ghost" onClick={() => handleCopy('step1', stepOutputs.step1)}>
                                                {copiedKey === 'step1' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <textarea className="nd-textarea kol-code" value={stepOutputs.step1} readOnly />
                                    </div>
                                    <div className="kol-step-box">
                                        <div className="kol-block-header">
                                            <strong>Bước 2 - Prompt ảnh cho Nano Banana 2</strong>
                                            <button className="btn btn-ghost" onClick={() => handleCopy('step2', stepOutputs.step2)}>
                                                {copiedKey === 'step2' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <textarea className="nd-textarea kol-code" value={stepOutputs.step2} readOnly />
                                    </div>
                                    <div className="kol-step-box">
                                        <div className="kol-block-header">
                                            <strong>Bước 3 - Prompt video theo cấu trúc bạn cung cấp</strong>
                                            <button className="btn btn-ghost" onClick={() => handleCopy('step3', stepOutputs.step3)}>
                                                {copiedKey === 'step3' ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                        <textarea className="nd-textarea kol-code" value={stepOutputs.step3} readOnly />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

            {libraryPicker && (
                <Portal>
                    <LibraryPickerModal
                        title={libraryPicker === 'ref' ? 'Chọn ảnh người mẫu' : 'Chọn ảnh sản phẩm'}
                        onClose={() => setLibraryPicker(null)}
                        onSelect={handleLibraryPick}
                    />
                </Portal>
            )}
        </div>
    )
}

