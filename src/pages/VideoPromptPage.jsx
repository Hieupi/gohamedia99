import { useState, useRef } from 'react'
import { Copy, Check, Video, Upload, X, Wand2, Send, RotateCcw, ImagePlus, Trash2, GripVertical, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import {
    PLATFORMS, PLATFORM_CONFIGS,
    VIDEO_SYSTEM_PROMPT, SCENE_ANALYSIS_PROMPT
} from '../services/videoPromptService'
import { callGemini } from '../services/geminiService'
import { getApiKeys } from '../services/apiKeyService'
import { getLibraryItems, getFolders } from '../services/libraryService'
import { getOriginalImage } from '../services/imageStorageService'

export default function VideoPromptPage() {
    // ─── State ───
    const [platform, setPlatform] = useState('kling')
    const [duration, setDuration] = useState('8s')
    const [aspectRatio, setAspectRatio] = useState('9:16')
    const [scenes, setScenes] = useState([]) // uploaded images: [{id, file, preview, name}]
    const [storyboard, setStoryboard] = useState(null) // AI result
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState('')
    const [isChatting, setIsChatting] = useState(false)
    const [copiedId, setCopiedId] = useState(null)
    const [expandedScene, setExpandedScene] = useState(null)
    const [showLibPicker, setShowLibPicker] = useState(false)
    const fileInputRef = useRef(null)

    // ─── Image Upload ───
    const handleFiles = (files) => {
        const newScenes = Array.from(files).map((file, i) => ({
            id: `scene_${Date.now()}_${i}`,
            file,
            preview: URL.createObjectURL(file),
            name: file.name,
        }))
        setScenes(prev => [...prev, ...newScenes].slice(0, 9))
    }

    const removeScene = (id) => setScenes(prev => prev.filter(s => s.id !== id))
    const clearAll = () => { setScenes([]); setStoryboard(null); setChatMessages([]) }

    /** Thêm ảnh từ Thư viện vào scenes */
    const addFromLibrary = async (items) => {
        const newScenes = []
        for (const item of items) {
            const hdSrc = await getOriginalImage(item.id) || item.imageSrc
            const res = await fetch(hdSrc)
            const blob = await res.blob()
            const file = new File([blob], item.name + '.png', { type: 'image/png' })
            newScenes.push({
                id: `lib_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                file,
                preview: hdSrc,
                name: item.name,
            })
        }
        setScenes(prev => [...prev, ...newScenes].slice(0, 9))
        setShowLibPicker(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        handleFiles(e.dataTransfer.files)
    }

    // ─── Convert image to base64 ───
    const toBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.readAsDataURL(file)
    })

    // ─── AI Analyze Scenes ───
    const handleAnalyze = async () => {
        const keys = getApiKeys()
        if (!keys.geminiKey) { alert('Vui lòng cài API Key Gemini trong mục Cài đặt'); return }
        if (scenes.length === 0) { alert('Vui lòng upload ít nhất 1 ảnh phân cảnh'); return }

        setIsAnalyzing(true)
        setStoryboard(null)
        setChatMessages([])

        try {
            const imageDescriptions = []
            for (let i = 0; i < scenes.length; i++) {
                const base64 = await toBase64(scenes[i].file)
                imageDescriptions.push(`[Phân cảnh ${i + 1}]: ${scenes[i].name}\n<image>${base64}</image>`)
            }

            const platformLabel = PLATFORMS.find(p => p.id === platform)?.label || platform
            const userMsg = `PLATFORM: ${platformLabel}
DURATION MỖI CẢNH: ${duration}
TỶ LỆ: ${aspectRatio}
SỐ PHÂN CẢNH: ${scenes.length}

Hãy phân tích ${scenes.length} ảnh phân cảnh dưới đây và tạo storyboard hoàn chỉnh.
Tạo kịch bản chuyển động TỐI ƯU HOÀN HẢO NHẤT cho video thời trang bán hàng.

${imageDescriptions.join('\n\n')}`

            const result = await callGemini(SCENE_ANALYSIS_PROMPT, userMsg, keys.geminiKey, null, scenes.map(s => s.file))

            // Parse JSON from result
            let parsed = null
            try {
                const jsonMatch = result.match(/```json\s*([\s\S]*?)```/)
                if (jsonMatch) {
                    parsed = JSON.parse(jsonMatch[1])
                } else {
                    // Try direct JSON parse
                    const cleanResult = result.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '')
                    parsed = JSON.parse(cleanResult)
                }
            } catch {
                // couldn't parse JSON, keep raw text
                parsed = null
            }

            setStoryboard({ raw: result, parsed, platform: platformLabel })
            setChatMessages([{ role: 'assistant', content: 'Đã phân tích xong! Bạn có thể yêu cầu chỉnh sửa bất kỳ phân cảnh nào bên dưới.' }])
        } catch (err) {
            console.error('Analyze error:', err)
            setStoryboard({ raw: '❌ Lỗi phân tích. Vui lòng thử lại.', parsed: null })
        } finally {
            setIsAnalyzing(false)
        }
    }

    // ─── Chat to refine ───
    const handleChat = async () => {
        if (!chatInput.trim() || !storyboard) return
        const keys = getApiKeys()
        if (!keys.geminiKey) return

        const userMsg = chatInput.trim()
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setChatInput('')
        setIsChatting(true)

        try {
            const context = `Storyboard hiện tại:\n${storyboard.raw}\n\nPlatform: ${storyboard.platform}\nDuration: ${duration}\nAspect: ${aspectRatio}\n\nYêu cầu chỉnh sửa từ người dùng: "${userMsg}"\n\nHãy chỉnh sửa storyboard theo yêu cầu và trả về JSON format đầy đủ như trước.`
            const result = await callGemini(SCENE_ANALYSIS_PROMPT, context, keys.geminiKey)

            let parsed = null
            try {
                const jsonMatch = result.match(/```json\s*([\s\S]*?)```/)
                if (jsonMatch) parsed = JSON.parse(jsonMatch[1])
            } catch { /* ignore */ }

            if (parsed) {
                setStoryboard(prev => ({ ...prev, raw: result, parsed }))
            }
            setChatMessages(prev => [...prev, { role: 'assistant', content: result.replace(/```json[\s\S]*?```/g, '✅ Đã cập nhật storyboard!') }])
        } catch (err) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: '❌ Lỗi xử lý. Thử lại.' }])
        } finally {
            setIsChatting(false)
        }
    }

    // ─── Copy prompt ───
    const copyPrompt = (text, id) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const copyAllPrompts = () => {
        if (!storyboard?.parsed) return
        const scenes = Array.isArray(storyboard.parsed) ? storyboard.parsed : []
        const all = scenes.map((s, i) => `--- Scene ${i + 1} ---\n${s.prompt}`).join('\n\n')
        copyPrompt(all, 'all')
    }

    const platformCfg = PLATFORM_CONFIGS[platform]

    return (
        <div className="page-wrapper vp-page">
            <h1 className="page-title">🎬 AI Video Director — Thời Trang</h1>
            <p className="page-subtitle">Upload ảnh phân cảnh → AI phân tích siêu chi tiết → tạo storyboard chuyển động hoàn hảo</p>

            {/* ═══ BƯỚC 1: CHỌN PLATFORM + CÀI ĐẶT ═══ */}
            <div className="vp-step">
                <div className="vp-step-header">
                    <span className="vp-step-num">1</span>
                    <span>Chọn Platform & Cài đặt</span>
                </div>
                <div className="vp-step-body">
                    <div className="vp-platform-grid">
                        {PLATFORMS.map(p => (
                            <button key={p.id}
                                className={`vp-platform-btn${platform === p.id ? ' active' : ''}`}
                                style={platform === p.id ? { borderColor: p.color, background: p.color + '10' } : {}}
                                onClick={() => setPlatform(p.id)}>
                                <span className="vp-platform-label">{p.label}</span>
                                <span className="vp-platform-desc">{p.desc}</span>
                            </button>
                        ))}
                    </div>
                    <div className="vp-adv-row" style={{ marginTop: 12 }}>
                        <div>
                            <label className="select-label">Thời lượng mỗi cảnh</label>
                            <div className="vp-pill-group">
                                {['4s', '6s', '8s', '10s'].map(d => (
                                    <button key={d} className={`toggle-pill${duration === d ? ' active' : ''}`}
                                        onClick={() => setDuration(d)}>{d}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="select-label">Tỷ lệ video</label>
                            <div className="vp-pill-group">
                                {['9:16', '16:9', '1:1'].map(r => (
                                    <button key={r} className={`toggle-pill${aspectRatio === r ? ' active' : ''}`}
                                        onClick={() => setAspectRatio(r)}>{r}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {platformCfg && (
                        <div className="vp-platform-tip">
                            💡 <strong>{PLATFORMS.find(p => p.id === platform)?.label}:</strong> {platformCfg.tips}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BƯỚC 2: UPLOAD ẢNH PHÂN CẢNH ═══ */}
            <div className="vp-step">
                <div className="vp-step-header">
                    <span className="vp-step-num">2</span>
                    <span>Upload ảnh phân cảnh ({scenes.length}/9)</span>
                    {scenes.length > 0 && (
                        <button className="btn btn-ghost" style={{ marginLeft: 'auto', fontSize: 11, color: '#ef4444' }} onClick={clearAll}>
                            <Trash2 size={12} /> Xóa tất cả
                        </button>
                    )}
                </div>
                <div className="vp-step-body">
                    {/* Drop zone: PC upload */}
                    <div className="vp-dropzone"
                        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
                        onClick={() => fileInputRef.current?.click()}>
                        <input ref={fileInputRef} type="file" multiple accept="image/*"
                            style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
                        <Upload size={28} strokeWidth={1.5} />
                        <div>Kéo thả hoặc nhấn để tải ảnh từ máy tính</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Tối đa 9 ảnh — mỗi ảnh = 1 phân cảnh video</div>
                    </div>

                    {/* Lấy từ Thư viện */}
                    <button
                        className="btn btn-ghost"
                        onClick={(e) => { e.stopPropagation(); setShowLibPicker(true) }}
                        style={{
                            width: '100%', marginTop: 8, padding: '10px 0',
                            fontSize: 13, fontWeight: 600,
                            border: '2px dashed var(--brand)',
                            color: 'var(--brand)', borderRadius: 'var(--r-md)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            cursor: 'pointer',
                        }}>
                        <BookOpen size={16} /> 📚 Lấy ảnh từ Thư viện
                    </button>

                    {/* Scene thumbnails */}
                    {scenes.length > 0 && (
                        <div className="vp-scene-grid">
                            {scenes.map((s, i) => (
                                <div key={s.id} className="vp-scene-thumb">
                                    <div className="vp-scene-num">{i + 1}</div>
                                    <img src={s.preview} alt={`Scene ${i + 1}`} />
                                    <button className="vp-scene-remove" onClick={() => removeScene(s.id)}><X size={12} /></button>
                                </div>
                            ))}
                            {scenes.length < 9 && (
                                <>
                                    <div className="vp-scene-add" onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={16} />
                                        <span>Từ PC</span>
                                    </div>
                                    <div className="vp-scene-add" style={{ borderColor: 'var(--brand)', color: 'var(--brand)' }}
                                        onClick={() => setShowLibPicker(true)}>
                                        <BookOpen size={16} />
                                        <span>Từ Kho</span>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BƯỚC 3: AI PHÂN TÍCH ═══ */}
            <div className="vp-step">
                <div className="vp-step-header">
                    <span className="vp-step-num">3</span>
                    <span>AI Phân tích & Tạo Storyboard</span>
                </div>
                <div className="vp-step-body">
                    <button className="btn btn-primary" onClick={handleAnalyze}
                        disabled={isAnalyzing || scenes.length === 0}
                        style={{ width: '100%', padding: '12px 0', fontSize: 14, fontWeight: 700 }}>
                        {isAnalyzing ? '⏳ AI đang phân tích ảnh & tạo kịch bản chuyển động...'
                            : `🎬 AI Director — Phân tích ${scenes.length} phân cảnh`}
                    </button>

                    {/* ═══ STORYBOARD RESULT ═══ */}
                    {storyboard && (
                        <div className="vp-storyboard">
                            <div className="vp-storyboard-header">
                                <h3>🎬 Storyboard — {storyboard.platform}</h3>
                                <button className="btn btn-primary" onClick={copyAllPrompts} style={{ fontSize: 11 }}>
                                    {copiedId === 'all' ? <><Check size={12} /> Đã copy tất cả!</> : <><Copy size={12} /> Copy tất cả Prompt</>}
                                </button>
                            </div>

                            {/* Parsed scenes */}
                            {storyboard.parsed && Array.isArray(storyboard.parsed) ? (
                                storyboard.parsed.map((scene, i) => (
                                    <div key={i} className="vp-sb-scene">
                                        <div className="vp-sb-scene-header" onClick={() => setExpandedScene(expandedScene === i ? null : i)}>
                                            <div className="vp-sb-scene-num">Cảnh {scene.scene || i + 1}</div>
                                            <div className="vp-sb-scene-title">
                                                {scene.emotional_beat || scene.camera_movement || `Scene ${i + 1}`}
                                            </div>
                                            <div className="vp-sb-scene-duration">{scene.duration || duration}</div>
                                            {expandedScene === i ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>

                                        {/* Thumbnail + mini info always visible */}
                                        {scenes[i] && (
                                            <div className="vp-sb-scene-mini">
                                                <img src={scenes[i].preview} alt="" className="vp-sb-thumb" />
                                                <div className="vp-sb-mini-info">
                                                    <div>📷 {scene.camera_movement}</div>
                                                    <div>🤸 {scene.subject_action?.substring(0, 60)}...</div>
                                                </div>
                                                <button className="btn btn-ghost" style={{ fontSize: 10, flexShrink: 0 }}
                                                    onClick={() => copyPrompt(scene.prompt, i)}>
                                                    {copiedId === i ? <Check size={12} /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        )}

                                        {/* Expanded detail */}
                                        {expandedScene === i && (
                                            <div className="vp-sb-scene-detail">
                                                {scene.image_analysis && (
                                                    <div className="vp-sb-field">
                                                        <strong>🔍 Phân tích ảnh:</strong>
                                                        <p>{scene.image_analysis}</p>
                                                    </div>
                                                )}
                                                <div className="vp-sb-field">
                                                    <strong>📷 Camera:</strong> {scene.camera_movement}
                                                </div>
                                                <div className="vp-sb-field">
                                                    <strong>🤸 Chuyển động:</strong> {scene.subject_action}
                                                </div>
                                                <div className="vp-sb-field">
                                                    <strong>💫 Cảm xúc:</strong> {scene.emotional_beat}
                                                </div>
                                                {scene.transition_note && (
                                                    <div className="vp-sb-field">
                                                        <strong>🔗 Chuyển cảnh:</strong> {scene.transition_note}
                                                    </div>
                                                )}
                                                <div className="vp-sb-prompt">
                                                    <strong>📋 Prompt:</strong>
                                                    <code>{scene.prompt}</code>
                                                    <button className="btn btn-primary" style={{ fontSize: 11, marginTop: 6, width: '100%' }}
                                                        onClick={() => copyPrompt(scene.prompt, i)}>
                                                        {copiedId === i ? <><Check size={12} /> Đã copy!</> : <><Copy size={12} /> Copy Prompt Cảnh {i + 1}</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                /* Fallback: raw text */
                                <div className="vp-sb-raw">
                                    <pre>{storyboard.raw}</pre>
                                </div>
                            )}

                            {/* Director notes */}
                            {storyboard.parsed?.director_notes && (
                                <div className="vp-director-notes">
                                    <strong>🎬 Director Notes:</strong>
                                    <p>{typeof storyboard.parsed.director_notes === 'string'
                                        ? storyboard.parsed.director_notes
                                        : JSON.stringify(storyboard.parsed.director_notes)}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ═══ BƯỚC 4: CHAT CHỈNH SỬA ═══ */}
            {storyboard && (
                <div className="vp-step">
                    <div className="vp-step-header">
                        <span className="vp-step-num">4</span>
                        <span>Chỉnh sửa kịch bản</span>
                    </div>
                    <div className="vp-step-body">
                        {/* Chat messages */}
                        <div className="vp-chat-messages">
                            {chatMessages.map((msg, i) => (
                                <div key={i} className={`vp-chat-msg ${msg.role}`}>
                                    <div className="vp-chat-bubble">{msg.content}</div>
                                </div>
                            ))}
                            {isChatting && (
                                <div className="vp-chat-msg assistant">
                                    <div className="vp-chat-bubble">⏳ Đang xử lý...</div>
                                </div>
                            )}
                        </div>

                        {/* Chat input */}
                        <div className="vp-chat-input-row">
                            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                                placeholder="VD: Cảnh 3 đổi sang quay 360°, cảnh 5 thêm tung váy bay..."
                                className="input-field" style={{ flex: 1 }}
                                onKeyDown={e => e.key === 'Enter' && handleChat()} />
                            <button className="btn btn-primary" onClick={handleChat} disabled={isChatting || !chatInput.trim()}>
                                <Send size={14} />
                            </button>
                        </div>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6 }}>
                            💬 Gợi ý: "Cảnh 2 đổi thành low angle khoe giày", "Thêm xoay váy ở cảnh 6", "Camera cảnh 4 đổi thành orbit"
                        </div>
                    </div>
                </div>
            )}

            {/* Library Picker Modal */}
            {showLibPicker && (
                <LibraryPickerModal
                    maxPick={9 - scenes.length}
                    onPick={addFromLibrary}
                    onClose={() => setShowLibPicker(false)}
                />
            )}
        </div>
    )
}

/** Modal chọn ảnh từ Thư viện */
function LibraryPickerModal({ maxPick, onPick, onClose }) {
    const allItems = getLibraryItems().filter(i => i.imageSrc)
    const folders = getFolders()
    const [selected, setSelected] = useState([])
    const [activeFolder, setActiveFolder] = useState('all')

    const filtered = activeFolder === 'all' ? allItems : allItems.filter(i => i.folderId === activeFolder)

    const toggle = (item) => {
        setSelected(prev => {
            if (prev.find(s => s.id === item.id)) return prev.filter(s => s.id !== item.id)
            if (prev.length >= maxPick) return prev
            return [...prev, item]
        })
    }

    const selectFolder = () => {
        const folderItems = filtered.filter(i => !selected.find(s => s.id === i.id))
        const canAdd = maxPick - selected.length
        setSelected(prev => [...prev, ...folderItems.slice(0, canAdd)])
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}
                style={{ maxWidth: 720, maxHeight: '85vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>📚 Chọn ảnh từ Thư viện ({selected.length}/{maxPick})</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={18} /></button>
                </div>

                {/* Folder tabs */}
                {folders.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                        <button
                            onClick={() => setActiveFolder('all')}
                            style={{
                                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                border: '1.5px solid', cursor: 'pointer',
                                borderColor: activeFolder === 'all' ? 'var(--brand)' : 'var(--border)',
                                background: activeFolder === 'all' ? 'var(--brand)' : 'transparent',
                                color: activeFolder === 'all' ? '#fff' : 'var(--text-secondary)',
                            }}>
                            📋 Tất cả ({allItems.length})
                        </button>
                        {folders.map(f => {
                            const count = allItems.filter(i => i.folderId === f.id).length
                            if (count === 0) return null
                            return (
                                <button key={f.id}
                                    onClick={() => setActiveFolder(f.id)}
                                    style={{
                                        padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                        border: '1.5px solid', cursor: 'pointer',
                                        borderColor: activeFolder === f.id ? 'var(--brand)' : 'var(--border)',
                                        background: activeFolder === f.id ? 'var(--brand)' : 'transparent',
                                        color: activeFolder === f.id ? '#fff' : 'var(--text-secondary)',
                                    }}>
                                    📁 {f.name} ({count})
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Chọn cả thư mục */}
                {filtered.length > 0 && (
                    <button
                        onClick={selectFolder}
                        style={{
                            width: '100%', marginBottom: 12, padding: '8px 0',
                            background: 'var(--brand-bg)', color: 'var(--brand)',
                            border: '1.5px dashed var(--brand)', borderRadius: 8,
                            cursor: 'pointer', fontSize: 13, fontWeight: 700,
                        }}>
                        ⚡ Chọn cả {activeFolder === 'all' ? 'thư viện' : `thư mục "${folders.find(f => f.id === activeFolder)?.name}"`} ({Math.min(filtered.length, maxPick - selected.length)} ảnh)
                    </button>
                )}

                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                        <p>{activeFolder === 'all' ? 'Thư viện trống.' : 'Thư mục này chưa có ảnh.'}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                        {filtered.map(item => (
                            <div key={item.id}
                                onClick={() => toggle(item)}
                                style={{
                                    position: 'relative', cursor: 'pointer', borderRadius: 8,
                                    border: selected.find(s => s.id === item.id) ? '3px solid var(--brand)' : '2px solid var(--border)',
                                    overflow: 'hidden', aspectRatio: '1',
                                    transition: 'all 0.12s',
                                }}>
                                <img src={item.imageSrc} alt={item.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                {selected.find(s => s.id === item.id) && (
                                    <div style={{
                                        position: 'absolute', top: 4, right: 4,
                                        background: 'var(--brand)', color: '#fff',
                                        width: 22, height: 22, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 800,
                                    }}>
                                        {selected.findIndex(s => s.id === item.id) + 1}
                                    </div>
                                )}
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2px 4px',
                                    background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {item.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {selected.length > 0 && (
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 16, padding: '10px 0', fontSize: 14, fontWeight: 700 }}
                        onClick={() => onPick(selected)}>
                        ✅ Thêm {selected.length} ảnh vào phân cảnh
                    </button>
                )}
            </div>
        </div>
    )
}
