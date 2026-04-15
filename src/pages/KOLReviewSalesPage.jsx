import { useMemo, useRef, useState } from 'react'
import { Upload, Sparkles, X, Plus, Copy, Check, MessageSquareText, Wand2, Film } from 'lucide-react'
import Portal from '../components/Portal'
import LibraryPickerModal from '../components/LibraryPickerModal'
import { callGemini } from '../services/geminiService'
import { getPrompt } from '../services/masterPrompts'

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

function buildSetupPrompt({ productName, characterDescription, toneOverride, extractedBackground }) {
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

    if (extractedBackground?.trim()) {
        setup.environment = {
            location: 'REAL STORE/SHOWROOM — from uploaded reference photos',
            details: [extractedBackground.trim()],
            atmosphere: 'real commercial space, authentic, product in natural context',
            remix_mode: true,
        }
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

export default function KOLReviewSalesPage() {
    const refFileRef = useRef(null)
    const productFileRef = useRef(null)
    const bgFileRef = useRef(null)
    const logoFileRef = useRef(null)

    const [selectedTemplate, setSelectedTemplate] = useState(KOL_TEMPLATES[0])
    const [refImages, setRefImages] = useState([])
    const [productImages, setProductImages] = useState([])
    const [bgImages, setBgImages] = useState([])
    const [logoImages, setLogoImages] = useState([])
    const isRemixMode = bgImages.length > 0
    const [industryContext, setIndustryContext] = useState('')
    const [characterDescription, setCharacterDescription] = useState('long wavy ash-brown hair, beige ribbed knit sweater')
    const [productName, setProductName] = useState('Skin Aqua Tone Up UV Essence sunscreen')
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

    const addBgImages = (files) => {
        const picked = Array.from(files)
            .filter((f) => f.type.startsWith('image/'))
            .slice(0, 3 - bgImages.length)
        setBgImages((prev) => [...prev, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const addLogoImages = (files) => {
        const picked = Array.from(files)
            .filter((f) => f.type.startsWith('image/'))
            .slice(0, 3 - logoImages.length)
        setLogoImages((prev) => [...prev, ...picked.map((f) => ({ file: f, url: URL.createObjectURL(f) }))])
    }

    const handleLibraryPick = (item) => {
        if (libraryPicker === 'ref') {
            setRefImages((prev) => [...prev, { url: item.imageSrc }].slice(0, 5))
        } else if (libraryPicker === 'bg') {
            setBgImages((prev) => [...prev, { url: item.imageSrc }].slice(0, 3))
        } else if (libraryPicker === 'logo') {
            setLogoImages((prev) => [...prev, { url: item.imageSrc }].slice(0, 3))
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
            const bgFiles = bgImages.length > 0 ? await entriesToFiles(bgImages) : []
            const logoFiles = logoImages.length > 0 ? await entriesToFiles(logoImages) : []

            // Run BotBG in parallel with image prep
            const extractedBackground = bgFiles.length > 0
                ? await callGemini({ prompt: getPrompt('BOT_BG_ANALYZER'), images: bgFiles })
                : ''

            // Pass logos + refs to AI so it can describe them in image_prompts
            const imagesForAi = [...refFiles, ...productFiles, ...logoFiles]

            const remixContext = isRemixMode && extractedBackground
                ? `\n\nREAL STORE/SHOWROOM CONTEXT (REMIX MODE):\nThe KOL is filming INSIDE the real store/showroom shown in the background photos. All scene actions, image prompts, and the environment in SETUP PROMPT must reflect this real commercial space:\n${extractedBackground}\nIMPORTANT: Every image_prompt must integrate the KOL naturally into this real background — the store/shelves/products/decor must be visible and authentic.`
                : ''

            const logoContext = logoFiles.length > 0
                ? `\n\nLOGO DNA LOCK (CRITICAL):\nThe last ${logoFiles.length} image(s) in the references are brand/store logos. STRICT RULES:\n1. These logos must appear IDENTICALLY in EVERY scene's image_prompt — same color, same design, same proportions\n2. Describe the logo placement consistently (e.g. "logo on wall behind KOL" or "logo on product packaging") — NEVER vary between scenes\n3. Include explicit logo description in every image_prompt field\n4. Logo must be clearly visible and NOT distorted or reinterpreted`
                : ''

            const aiPrompt = `You are a direct-response Vietnamese social commerce scriptwriter specialising in short-form video for Veo 3.1.

═══════════════════════════════════════════════
TASK
═══════════════════════════════════════════════
Analyse the user's script/context below and produce a full KOL review sequence for ${platforms.join(', ')}.
Niche: ${selectedTemplate.name}
Brain: ${selectedTemplate.systemInstruction}

User script / product context:
"""
${industryContext || selectedTemplate.contextHint}
"""
${remixContext}

═══════════════════════════════════════════════
STEP 1 — SCENE COUNT ANALYSIS (reason before writing)
═══════════════════════════════════════════════
Read the user's script carefully. Count its logical beats, then decide the optimal scene count:

• 2 scenes — very short hook or single-benefit script (< 2 clear beats)
• 3 scenes — standard hook → benefit → CTA (most common)
• 4 scenes — hook → pain-point → demo/proof → CTA
• 5 scenes — narrative arc: hook → problem → solution → proof → CTA
• 6 scenes — rich storytelling with before/after, comparison, or multi-benefit demo

Rule: scene count must match CONTENT richness — never pad, never truncate real beats.
Output your reasoning in the field "scene_count_reasoning".

═══════════════════════════════════════════════
STEP 2 — WORD COUNT PER SCENE (8-second Veo 3.1)
═══════════════════════════════════════════════
Each clip is exactly 8 seconds.
Natural Vietnamese speech rate: ~2.1 words/second.
Reserve 1.5–2 s for: natural inhale before speaking, mid-sentence pause for emphasis, end-of-scene breath.
Effective speech window per scene: 6–6.5 seconds → 12–14 words ideal, HARD CAP 15 words.

Per-scene word budget formula:
  words_this_scene = min(15, floor(scene_emotional_weight × 13))
  • hook scenes (high energy): 13–14 words
  • proof/demo scenes (measured pace): 12–13 words
  • CTA scenes (punchy close): 11–13 words

Dialogue must feel naturally spoken, NOT read. Include micro-pauses via punctuation (comma = 0.3s pause, ellipsis = 0.6s pause).
Total word cap: scene_count × 13 (never exceed).

═══════════════════════════════════════════════
STEP 3 — BACKGROUND LOCK (product review = fixed environment)
═══════════════════════════════════════════════
This is a product REVIEW — the background/environment is LOCKED across ALL scenes:
• Identical room, same product placement, same prop arrangement in every scene.
• ONLY the KOL's camera angle, pose, gesture, and facial expression change per scene.
• Every image_prompt must describe THE EXACT SAME background.
• Use explicit lock phrase in each image_prompt: "[BG LOCKED] same [location description] background"${isRemixMode ? '\n• REMIX MODE ACTIVE: background is the real store/showroom — KOL integrated naturally into that real space in every scene.' : ''}
${logoContext}

═══════════════════════════════════════════════
CONSTRAINTS (NON-NEGOTIABLE)
═══════════════════════════════════════════════
1. One consistent KOL voice/persona across ALL scenes.
2. Dialogue: Vietnamese ONLY.
3. Strict per-scene word cap: 15 words max (see Step 2 formula).
4. Natural lip-sync friendly phrasing — no run-on sentences.
5. Conversion arc: hook → proof/benefit → CTA (must close with clear buy action).
6. Image reference order: photo #1 = KOL/model identity, photo #2 = product.
7. image_prompt: photorealistic, Veo/Nano Banana 2 compatible, include [BG LOCKED] tag.

═══════════════════════════════════════════════
OUTPUT FORMAT — JSON ONLY (no markdown, no commentary)
═══════════════════════════════════════════════
{
  "scene_count_reasoning": "brief explanation of why X scenes",
  "word_budget_note": "total words planned and per-scene breakdown",
  "character_override": {
    "appearance": "hair + outfit short phrase",
    "tone": "KOL voice style short phrase"
  },
  "product_override": {
    "name": "exact product name"
  },
  "scenes": [
    {
      "scene": 1,
      "title": "scene title",
      "duration_sec": 8,
      "action": "camera angle + KOL gesture/pose direction (background identical to all other scenes)",
      "dialogue": "Vietnamese line — natural phrasing, 12–15 words",
      "word_count": 13,
      "image_prompt": "[BG LOCKED] same [background description]. [KOL description specific to this scene]. Photorealistic, natural lighting."
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
                extractedBackground,
            })

            const normalizedScenes = parsed.scenes
                .slice(0, 6) // AI-determined, cap at 6 for UX
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
                        durationSec: 8,
                        action: (scene.action || '').trim(),
                        dialogue: safeDialogue,
                        wordCount: countWords(safeDialogue),
                        imagePrompt: (scene.image_prompt || '').trim(),
                        scenePrompt,
                        videoPrompt: buildVideoPrompt(setup, scenePrompt),
                    }
                })

            const combinedWords = normalizedScenes.reduce((sum, scene) => sum + scene.wordCount, 0)
            const wordCap = normalizedScenes.length * 15
            const sceneOverLimit = normalizedScenes.filter(s => s.wordCount > 15)
            if (sceneOverLimit.length > 0 || combinedWords > wordCap) {
                const overScenes = sceneOverLimit.map(s => `Cảnh ${s.scene} (${s.wordCount} từ)`).join(', ')
                setError(`Cảnh báo: ${overScenes ? overScenes + ' vượt 15 từ/cảnh. ' : ''}Tổng ${combinedWords}/${wordCap} từ. KOL sẽ đọc bị vội — nên tạo lại.`)
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
                <span className="st-scene-count">{scenes.length > 0 ? `${scenes.length} cảnh` : 'AI tự tính'} × 8s</span>
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

                            {/* ── Step BG: REMIX ── */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number" style={{ background: isRemixMode ? 'linear-gradient(135deg, #f59e0b, #d97706)' : undefined }}>BG</div>
                                    <div className="design-step-title">
                                        Nền thật ({bgImages.length}/3)
                                        {isRemixMode && <span style={{ marginLeft: 8, fontSize: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', borderRadius: 6, padding: '1px 7px', fontWeight: 700, letterSpacing: 0.5 }}>REMIX</span>}
                                    </div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => bgFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={bgFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addBgImages(e.target.files)} />
                                </div>
                                <div style={{ padding: '0 12px 12px' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                                        Tùy chọn: Tải ảnh cửa hàng/showroom thật — AI sẽ đặt KOL vào bối cảnh thật trong script và image prompt.
                                    </p>
                                    <div className="nd-img-grid">
                                        {bgImages.map((img, idx) => (
                                            <div key={`${img.url}-${idx}`} className="img-slot filled">
                                                <img src={img.url} alt="" />
                                                <button className="img-slot-remove" onClick={() => setBgImages((prev) => prev.filter((_, i) => i !== idx))}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {bgImages.length < 3 && (
                                            <div className="img-slot empty" onClick={() => setLibraryPicker('bg')}>
                                                <Plus size={18} style={{ color: 'var(--brand)' }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ── Step Logo ── */}
                            <div className="design-step">
                                <div className="design-step-header">
                                    <div className="design-step-number" style={{ background: logoImages.length > 0 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : undefined }}>LG</div>
                                    <div className="design-step-title">
                                        Logo thương hiệu ({logoImages.length}/3)
                                        {logoImages.length > 0 && <span style={{ marginLeft: 8, fontSize: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', borderRadius: 6, padding: '1px 7px', fontWeight: 700, letterSpacing: 0.5 }}>DNA LOCK</span>}
                                    </div>
                                    <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={() => logoFileRef.current?.click()}>
                                        <Upload size={13} /> Tải
                                    </button>
                                    <input ref={logoFileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addLogoImages(e.target.files)} />
                                </div>
                                <div style={{ padding: '0 12px 12px' }}>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>
                                        Tùy chọn: Logo thương hiệu/cửa hàng — AI khóa logo đồng nhất trên tất cả phân cảnh trong image_prompt.
                                    </p>
                                    <div className="nd-img-grid">
                                        {logoImages.map((img, idx) => (
                                            <div key={`${img.url}-${idx}`} className="img-slot filled">
                                                <img src={img.url} alt="" />
                                                <button className="img-slot-remove" onClick={() => setLogoImages((prev) => prev.filter((_, i) => i !== idx))}>
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {logoImages.length < 3 && (
                                            <div className="img-slot empty" onClick={() => setLibraryPicker('logo')}>
                                                <Plus size={18} style={{ color: 'var(--brand)' }} />
                                            </div>
                                        )}
                                    </div>
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
                                        <label className="nd-label">Số phân cảnh</label>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '8px 12px',
                                            borderRadius: 'var(--r-md)',
                                            border: '1.5px solid var(--border)',
                                            background: 'var(--bg-input, var(--bg-card))',
                                            fontSize: 13,
                                            color: 'var(--text-secondary)',
                                        }}>
                                            <Sparkles size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                                            <span>
                                                AI tự phân tích kịch bản — tính số cảnh tối ưu (2–6)
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '5px 0 0', lineHeight: 1.4 }}>
                                            AI đếm các nhịp nội dung, chia cảnh theo kịch bản, tính từ/cảnh để KOL đọc tự nhiên trong 8 giây.
                                        </p>
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
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                                        AI phân tích kịch bản → tự chia số cảnh → tính 12–15 từ/cảnh cho 8s Veo 3.1 tự nhiên. Nền bối cảnh khóa cố định, chỉ góc máy + tư thế KOL thay đổi.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="st-timeline">
                            <div className="st-timeline-header">
                                <h3 className="st-section-title" style={{ margin: 0 }}>
                                    <Film size={18} style={{ verticalAlign: -3 }} /> Timeline KOL
                                    {scenes.length > 0 && (
                                        <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
                                            {scenes.length} cảnh · {totalWords} từ · {scenes.length * 8}s tổng
                                        </span>
                                    )}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <strong>Số từ:</strong>
                                                    <span style={{
                                                        fontWeight: 700,
                                                        color: scene.wordCount > 15 ? '#ef4444' : scene.wordCount >= 12 ? '#22c55e' : '#f59e0b',
                                                        fontSize: 12,
                                                        background: scene.wordCount > 15 ? 'rgba(239,68,68,0.1)' : scene.wordCount >= 12 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                                                        padding: '1px 7px',
                                                        borderRadius: 5,
                                                    }}>
                                                        {scene.wordCount} từ / 8s
                                                    </span>
                                                    {scene.wordCount > 15 && <span style={{ fontSize: 11, color: '#ef4444' }}>⚠ Quá nhanh</span>}
                                                    {scene.wordCount >= 12 && scene.wordCount <= 15 && <span style={{ fontSize: 11, color: '#22c55e' }}>✓ Tự nhiên</span>}
                                                    {scene.wordCount < 12 && <span style={{ fontSize: 11, color: '#f59e0b' }}>Có thể thêm</span>}
                                                </div>
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
                        title={libraryPicker === 'ref' ? 'Chọn ảnh người mẫu' : libraryPicker === 'bg' ? 'Chọn ảnh nền cửa hàng' : libraryPicker === 'logo' ? 'Chọn logo thương hiệu' : 'Chọn ảnh sản phẩm'}
                        onClose={() => setLibraryPicker(null)}
                        onSelect={handleLibraryPick}
                    />
                </Portal>
            )}
        </div>
    )
}

