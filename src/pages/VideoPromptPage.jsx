import { useState, useEffect, useMemo } from 'react'
import { Copy, Check, Video, Camera, Lightbulb, MapPin, Sparkles, ChevronDown, Wand2, RotateCcw, Settings2 } from 'lucide-react'
import {
    PLATFORMS, FASHION_MOTIONS, MOTION_CATEGORIES, CAMERA_MOVEMENTS,
    LIGHTING_MOODS, SCENE_SETTINGS, PLATFORM_CONFIGS,
    VIDEO_SYSTEM_PROMPT, buildVideoPrompt
} from '../services/videoPromptService'
import { callGemini } from '../services/geminiService'
import { getApiKeys } from '../services/apiKeyService'

export default function VideoPromptPage() {
    // Form state
    const [platform, setPlatform] = useState('veo3')
    const [motionCat, setMotionCat] = useState('catwalk')
    const [motion, setMotion] = useState('cw_strut')
    const [camera, setCamera] = useState('tracking')
    const [lighting, setLighting] = useState('studio')
    const [scene, setScene] = useState('studio_white')
    const [customScene, setCustomScene] = useState('')
    const [extraNotes, setExtraNotes] = useState('')
    const [aspectRatio, setAspectRatio] = useState('9:16')
    const [duration, setDuration] = useState('8s')

    // Output state
    const [copied, setCopied] = useState(false)
    const [aiPrompt, setAiPrompt] = useState('')
    const [isGeneratingAI, setIsGeneratingAI] = useState(false)
    const [history, setHistory] = useState(() => {
        try { return JSON.parse(localStorage.getItem('goha_video_prompts') || '[]') } catch { return [] }
    })

    // Filtered motions by category
    const filteredMotions = useMemo(
        () => FASHION_MOTIONS.filter(m => m.category === motionCat),
        [motionCat]
    )

    // Auto-select first motion when category changes
    useEffect(() => {
        const first = filteredMotions[0]
        if (first) setMotion(first.id)
    }, [motionCat])

    // Live manual prompt
    const manualPrompt = useMemo(
        () => buildVideoPrompt({ platform, motion, camera, lighting, scene, customScene, extraNotes, aspectRatio, duration }),
        [platform, motion, camera, lighting, scene, customScene, extraNotes, aspectRatio, duration]
    )

    // Active prompt (AI or manual)
    const activePrompt = aiPrompt || manualPrompt

    // Copy
    const handleCopy = () => {
        navigator.clipboard.writeText(activePrompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    // Save to history
    const saveToHistory = (prompt) => {
        const entry = { id: Date.now(), prompt, platform, motion, camera, lighting, scene, createdAt: new Date().toISOString() }
        const updated = [entry, ...history].slice(0, 20)
        setHistory(updated)
        localStorage.setItem('goha_video_prompts', JSON.stringify(updated))
    }

    // AI enhance prompt
    const handleAIEnhance = async () => {
        const keys = getApiKeys()
        if (!keys.geminiKey) { alert('Vui lòng cài đặt API Key Gemini trong mục Cài đặt.'); return }
        setIsGeneratingAI(true)
        try {
            const userMsg = `Platform: ${platform}. Base prompt: "${manualPrompt}". Hãy nâng cấp prompt này thành video prompt chuyên nghiệp nhất, giữ nguyên ý chính, thêm chi tiết fabric physics, lighting nuances, camera precision. Output CHỈ prompt tiếng Anh, không giải thích.`
            const result = await callGemini(VIDEO_SYSTEM_PROMPT, userMsg, keys.geminiKey)
            if (result) {
                setAiPrompt(result.trim())
                saveToHistory(result.trim())
            }
        } catch (err) {
            console.error('AI enhance error:', err)
        } finally {
            setIsGeneratingAI(false)
        }
    }

    // Reset AI prompt
    const handleResetAI = () => setAiPrompt('')

    const platformCfg = PLATFORM_CONFIGS[platform]
    const selectedMotion = FASHION_MOTIONS.find(m => m.id === motion)

    return (
        <div className="page-wrapper vp-page">
            <h1 className="page-title">🎬 Video Prompt — Thời Trang AI</h1>
            <p className="page-subtitle">Tạo prompt video chuyên nghiệp cho người mẫu thời trang — tối ưu Veo 3, Kling AI, Grok</p>

            <div className="vp-layout">
                {/* ════════════ CỘT TRÁI — FORM BUILDER ════════════ */}
                <div className="vp-form">

                    {/* Platform selection */}
                    <div className="vp-section">
                        <div className="vp-section-title"><Video size={14} /> Platform AI</div>
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
                        {platformCfg && (
                            <div className="vp-platform-tip">
                                💡 <strong>Tips:</strong> {platformCfg.tips}
                            </div>
                        )}
                    </div>

                    {/* Motion category + selection */}
                    <div className="vp-section">
                        <div className="vp-section-title">🤸 Tư thế & Chuyển động</div>
                        <div className="vp-cat-tabs">
                            {MOTION_CATEGORIES.map(cat => (
                                <button key={cat.id}
                                    className={`vp-cat-tab${motionCat === cat.id ? ' active' : ''}`}
                                    onClick={() => setMotionCat(cat.id)}>
                                    {cat.emoji} {cat.label.split(' ').slice(1).join(' ')}
                                </button>
                            ))}
                        </div>
                        <div className="vp-motion-grid">
                            {filteredMotions.map(m => (
                                <button key={m.id}
                                    className={`vp-motion-btn${motion === m.id ? ' active' : ''}`}
                                    onClick={() => setMotion(m.id)}>
                                    <span className="vp-motion-emoji">{m.emoji}</span>
                                    <span className="vp-motion-name">{m.name}</span>
                                    <span className="vp-motion-desc">{m.promptVN}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Camera */}
                    <div className="vp-section">
                        <div className="vp-section-title"><Camera size={14} /> Camera & Góc quay</div>
                        <div className="vp-option-grid">
                            {CAMERA_MOVEMENTS.map(c => (
                                <button key={c.id}
                                    className={`vp-option-btn${camera === c.id ? ' active' : ''}`}
                                    onClick={() => setCamera(c.id)}>
                                    <span>{c.emoji} {c.name}</span>
                                    <span className="vp-option-desc">{c.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lighting */}
                    <div className="vp-section">
                        <div className="vp-section-title"><Lightbulb size={14} /> Ánh sáng & Mood</div>
                        <div className="vp-option-grid cols-2">
                            {LIGHTING_MOODS.map(l => (
                                <button key={l.id}
                                    className={`vp-option-btn${lighting === l.id ? ' active' : ''}`}
                                    onClick={() => setLighting(l.id)}>
                                    {l.emoji} {l.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scene */}
                    <div className="vp-section">
                        <div className="vp-section-title"><MapPin size={14} /> Bối cảnh</div>
                        <div className="vp-option-grid cols-2">
                            {SCENE_SETTINGS.map(s => (
                                <button key={s.id}
                                    className={`vp-option-btn${scene === s.id ? ' active' : ''}`}
                                    onClick={() => setScene(s.id)}>
                                    {s.emoji} {s.name}
                                </button>
                            ))}
                        </div>
                        {scene === 'custom' && (
                            <input type="text" value={customScene} onChange={e => setCustomScene(e.target.value)}
                                placeholder="Mô tả bối cảnh tùy chỉnh bằng tiếng Anh..."
                                className="input-field" style={{ marginTop: 8 }} />
                        )}
                    </div>

                    {/* Advanced settings */}
                    <div className="vp-section">
                        <div className="vp-section-title"><Settings2 size={14} /> Tùy chỉnh nâng cao</div>
                        <div className="vp-adv-row">
                            <div>
                                <label className="select-label">Tỷ lệ</label>
                                <div className="vp-pill-group">
                                    {['16:9', '9:16', '1:1'].map(r => (
                                        <button key={r} className={`toggle-pill${aspectRatio === r ? ' active' : ''}`}
                                            onClick={() => setAspectRatio(r)}>{r}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="select-label">Thời lượng</label>
                                <div className="vp-pill-group">
                                    {['4s', '6s', '8s', '10s'].map(d => (
                                        <button key={d} className={`toggle-pill${duration === d ? ' active' : ''}`}
                                            onClick={() => setDuration(d)}>{d}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div style={{ marginTop: 10 }}>
                            <label className="select-label">Ghi chú thêm (không bắt buộc)</label>
                            <textarea value={extraNotes} onChange={e => setExtraNotes(e.target.value)}
                                placeholder="VD: Áo lụa trắng bay, tóc ngắn pixie, biểu cảm ngọt ngào..."
                                className="input-field" rows={2} style={{ resize: 'vertical', fontSize: 12 }} />
                        </div>
                    </div>
                </div>

                {/* ════════════ CỘT PHẢI — PROMPT OUTPUT ════════════ */}
                <div className="vp-output">

                    {/* Live prompt preview */}
                    <div className="vp-output-card">
                        <div className="vp-output-header">
                            <span className="vp-output-title">
                                {aiPrompt ? '✨ AI Enhanced Prompt' : '📋 Live Prompt Preview'}
                            </span>
                            <div className="vp-output-badges">
                                <span className="vp-badge" style={{ background: PLATFORMS.find(p => p.id === platform)?.color + '20', color: PLATFORMS.find(p => p.id === platform)?.color }}>
                                    {PLATFORMS.find(p => p.id === platform)?.label}
                                </span>
                                <span className="vp-badge">{aspectRatio}</span>
                                <span className="vp-badge">{duration}</span>
                            </div>
                        </div>

                        <div className="vp-prompt-text">
                            {activePrompt}
                        </div>

                        <div className="vp-output-actions">
                            <button className="btn btn-primary" onClick={handleCopy}>
                                {copied ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Copy Prompt</>}
                            </button>
                            <button className="btn btn-ghost" onClick={handleAIEnhance} disabled={isGeneratingAI}>
                                {isGeneratingAI ? '⏳ Đang nâng cấp...' : <><Wand2 size={14} /> AI Nâng cấp</>}
                            </button>
                            {aiPrompt && (
                                <button className="btn btn-ghost" onClick={handleResetAI}>
                                    <RotateCcw size={14} /> Reset
                                </button>
                            )}
                            <button className="btn btn-ghost" onClick={() => saveToHistory(activePrompt)}>
                                💾 Lưu
                            </button>
                        </div>
                    </div>

                    {/* Selected motion preview */}
                    {selectedMotion && (
                        <div className="vp-motion-preview">
                            <div className="vp-motion-preview-title">{selectedMotion.emoji} {selectedMotion.name}</div>
                            <div className="vp-motion-preview-vn">{selectedMotion.promptVN}</div>
                            <div className="vp-motion-preview-en">{selectedMotion.promptEN}</div>
                        </div>
                    )}

                    {/* History */}
                    {history.length > 0 && (
                        <div className="vp-history">
                            <div className="vp-section-title">📜 Lịch sử Prompt ({history.length})</div>
                            <div className="vp-history-list">
                                {history.slice(0, 5).map(h => (
                                    <div key={h.id} className="vp-history-item"
                                        onClick={() => { navigator.clipboard.writeText(h.prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                                        <div className="vp-history-text">{h.prompt.substring(0, 120)}...</div>
                                        <div className="vp-history-meta">
                                            {new Date(h.createdAt).toLocaleString('vi-VN')} · Click để copy
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Platform info */}
                    <div className="vp-platform-info">
                        <h4>📌 Hướng dẫn sử dụng prompt</h4>
                        <ol>
                            <li>Chọn <strong>Platform</strong> phù hợp tool bạn dùng</li>
                            <li>Chọn <strong>Tư thế & Chuyển động</strong> cho model</li>
                            <li>Chọn <strong>Camera, Ánh sáng, Bối cảnh</strong></li>
                            <li>Nhấn <strong>Copy Prompt</strong> hoặc <strong>AI Nâng cấp</strong></li>
                            <li>Dán prompt vào Veo 3 / Kling / Grok và tạo video!</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    )
}
