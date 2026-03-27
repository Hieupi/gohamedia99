import { useState } from 'react'
import { Film, Copy, Check, Loader, ChevronDown, ChevronUp, Sparkles, RefreshCcw } from 'lucide-react'
import { callGemini } from '../services/geminiService'

function CopyBtn({ text }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = () => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
    }
    return (
        <button onClick={handleCopy} title="Copy" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            color: copied ? '#10b981' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10
        }}>
            {copied ? <><Check size={12} /> Đã copy</> : <><Copy size={12} /> Copy</>}
        </button>
    )
}

export default function VideoPromptPanel({ shotDescriptions = [] }) {
    const [loading, setLoading] = useState(false)
    const [prompts, setPrompts] = useState(null)
    const [expanded, setExpanded] = useState(true)

    const hasShots = shotDescriptions.length > 0

    const handleGenerate = async () => {
        setLoading(true)
        setPrompts(null)
        try {
            const shotsContext = shotDescriptions.map((s, i) =>
                `SCENE ${String(i + 1).padStart(2, '0')}: ${s.title || ''} — ${s.shotDesc || s.pose || ''}`
            ).join('\n')

            const prompt = `You are a Hollywood AI FASHION VIDEO DIRECTOR.
Your task is to take the provided static photo shot descriptions and convert them into cinematic AI video generation prompts (for tools like Veo 3, Kling, Runway Gen-3).

=== 5 RULES FOR PERFECT VIDEO PROMPTS ===
1. ONLY describe movement and visual elements (no abstract feelings). Use Present Continuous tense (e.g. "walking", "wind blowing").
2. Explicitly define ONE Camera Movement (e.g., "Slow tracking shot", "Low angle dolly in").
3. Make sure the background/environment is consistent and clearly stated for every prompt.
4. Formulate the movement directly matching the intent of the static shot description (e.g., if it says walking away, say "walking away").
5. Keep it purely in English, maximum 60 words per prompt.

=== CONTEXT (The Shot List) ===
${shotsContext}

=== OUTPUT FORMAT ===
You MUST return a JSON array of strings. Each string is the exact video prompt for the corresponding scene. Do not include "SCENE XX:" in the prompt text itself, just the raw prompt.
Example:
[
  "Low angle tracking shot from behind, model walking down a sunlit street wearing a flowing red dress, fabric blowing in the cinematic wind, hyperrealistic, 8k resolution.",
  "..."
]

Return ONLY JSON array, no markdown, no other text.`

            const aiResponse = await callGemini({ prompt })
            let parsed
            try {
                const cleanedResult = aiResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
                const jsonMatch = cleanedResult.match(/```json\s*([\s\S]*?)```/)
                if (jsonMatch) parsed = JSON.parse(jsonMatch[1])
                else {
                    const extractJson = cleanedResult.replace(/^[^[{]*/, '').replace(/[^}\]]*$/, '')
                    parsed = JSON.parse(extractJson)
                }
            } catch (e) {
                console.error("Parse video prompt error", e)
                parsed = ["Failed to parse video prompts. Please try again."]
            }
            setPrompts(parsed)
        } catch (err) {
            console.error('Video Prompt Error:', err)
            setPrompts(["An error occurred while generating video prompts."])
        } finally {
            setLoading(false)
        }
    }

    if (!hasShots) return null

    return (
        <div style={{ marginTop: 32, background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border-color)' : 'none',
                    background: 'var(--bg-card)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ background: '#8b5cf6', width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                        <Film size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>VIDEO PROMPT</h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Tạo kịch bản chuyển động Camera điện ảnh</p>
                    </div>
                </div>
                {expanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
            </div>

            {expanded && (
                <div style={{ padding: 24 }}>
                    {!prompts && !loading && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>
                                AI sẽ phân tích các phân cảnh vừa tạo để viết Video Prompt tạo chuyển động Camera theo phong cách điện ảnh đỉnh cao.
                            </p>
                            <button onClick={handleGenerate} className="btn-primary" style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14 }}>
                                <Sparkles size={16} /> Tạo thẻ Video Prompt ngay
                            </button>
                        </div>
                    )}

                    {loading && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                            <Loader className="spin" size={32} style={{ marginBottom: 16, color: '#8b5cf6' }} />
                            <p>Đạo diễn AI đang sắp xếp góc máy và chuyển động...</p>
                        </div>
                    )}

                    {prompts && !loading && Array.isArray(prompts) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {prompts.map((p, idx) => (
                                <div key={idx} style={{ background: 'var(--bg-main)', borderRadius: 8, padding: 16, border: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                        <b style={{ color: '#8b5cf6', fontSize: 13 }}>SCENE {String(idx + 1).padStart(2, '0')}</b>
                                        <CopyBtn text={p} />
                                    </div>
                                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-main)' }}>{p}</p>
                                </div>
                            ))}
                            <div style={{ marginTop: 16, textAlign: 'center' }}>
                                <button onClick={handleGenerate} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '6px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                                    <RefreshCcw size={12} style={{ display: 'inline', marginRight: 6 }} /> Tạo lại Video Prompts
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
