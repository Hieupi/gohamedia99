/**
 * SEO & AEO Content Generator Panel
 * All-in-one viral content creation: Titles, Captions, Hashtags, Thumbnail
 */
import { useState } from 'react'
import {
    Sparkles, Copy, Check, Loader, Hash, Type, FileText,
    Image as ImageIcon, RefreshCcw, ChevronDown, ChevronUp
} from 'lucide-react'
import { callGemini } from '../services/geminiService'

// ─── Copy Button Helper ──────────────────────────────────────────────────────
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

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function SeoAeoPanel({ images = [], productContext = '', shotDescriptions = [] }) {
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState(null) // { titles, captionLong, captionShort, hashtags, thumbnailPrompt }
    const [thumbLoading, setThumbLoading] = useState(false)
    const [thumbnailSrc, setThumbnailSrc] = useState(null)
    const [expanded, setExpanded] = useState(true)

    const hasImages = images.filter(Boolean).length > 0

    // ─── Generate SEO Content ──────────────────────────────────────────────────
    const handleGenerate = async () => {
        setLoading(true)
        setContent(null)
        try {
            const shotsContext = shotDescriptions.length > 0
                ? '\n\nShot descriptions:\n' + shotDescriptions.map((s, i) =>
                    `Shot ${i + 1}: ${s.title || ''} — ${s.shotDesc || s.pose || ''}`
                ).join('\n')
                : ''

            const prompt = `You are an ELITE Vietnamese content strategist combining 3 frameworks:
1. "BÁN HÀNG MÀ KHÔNG BÁN HÀNG" philosophy — sell through VALUE, EDUCATION, ENTERTAINMENT, STORY
2. "27 YẾU TỐ TRIỆU VIEW" (Đào Quang Trung) — deep viral psychology
3. "600+ MẪU TIÊU ĐỀ VIDEO" template library — proven viral title formulas

=== 27 YẾU TỐ TRIỆU VIEW (use at least 4-5 in your content) ===
1. TRANH CÃI — tạo ý kiến trái chiều, kích thảo luận mạnh → comment + share
2. SO SÁNH — so sánh trước/sau, A vs B → thuyết phục, rõ ràng
3. TÒ MÒ — câu hỏi bí ẩn, thông tin bất ngờ ở đầu → giữ chân
4. BẤT NGỜ — tình huống/thông tin không ngờ tới → share mạnh
5. THỎA MÃN — visual satisfying, hoàn thành task → xem lại + save
6. ĐỘC ĐÁO — chủ đề chưa từng thấy → tò mò cực mạnh
7. TỰ HÀO — niềm tự hào bản thân/cộng đồng → share mạnh
8. HÀI HƯỚC — tình huống dí dỏm → lan tỏa nhanh
9. SẾN — tình cảm thái quá nhưng thu hút → dấu ấn cảm xúc
10. SEXY — hình ảnh gợi cảm khéo léo → thu hút lượt xem
11. DỄ HIỂU — rõ ràng mạch lạc → tiếp cận rộng
12. NGẮN KHÓ HIỂU — mơ hồ, xem lại → thảo luận

=== 4 NHÓM TIÊU ĐỀ TRIỆU VIEW (chọn template phù hợp nhất) ===
NHÓM 1 — TIẾT LỘ BÍ MẬT:
• "X sự thật về [...] mà bạn sẽ không tin"
• "Bí mật [...] mà [...] không muốn bạn biết"
• "Vén bức màn bí mật về [...]"
• "Tại sao tôi không [...] nữa"
• "X điều mà [...] không bao giờ thừa nhận"

NHÓM 2 — CÁCH LÀM BỨT PHÁ:
• "Cách [...] trong X phút mà không cần [...]"
• "X bước đơn giản để [...]"
• "Từ [...] đến [...] chỉ trong X ngày"
• "Làm sao để [...] thậm chí nếu [...]"
• "X mẹo giúp bạn [...]"

NHÓM 3 — KÍCH THÍCH XEM NGAY:
• "Đừng [...] khi chưa xem video này"
• "Bạn sẽ hối hận nếu bỏ qua [...]"
• "Cho tôi X phút và tôi sẽ cho bạn [...]"
• "Nếu bạn là [...] thì phải xem video này"
• "Họ cười khi tôi [...] nhưng sau đó tôi [...]"

NHÓM 4 — TOP/NHẤT/SỐ 1:
• "[...] đỉnh nhất"
• "[...] chi tiết nhất"
• "[...] uy tín nhất"

=== PHÂN TÍCH NỘI DUNG ===
${productContext ? 'Product analysis: ' + productContext.substring(0, 500) : ''}
${shotsContext}

=== NHIỆM VỤ: TƯ DUY PHẢN BIỆN TRƯỚC KHI OUTPUT ===
Trước khi trả kết quả, hãy tự hỏi:
- Tiêu đề này có khiến người lướt DỪNG LẠI không? Nếu không → viết lại mạnh hơn
- Caption này có bán hàng trực tiếp không? Nếu có → viết lại dạng story/education
- Hashtag này có đúng thị trường VN không? Nếu quá generic → thêm niche
- Thumbnail text có gây SHOCK/TÒ MÒ không? Nếu không → viết lại cực mạnh

=== OUTPUT (Vietnamese, JSON) ===

1. TITLES (5 variations, mỗi cái dùng template + yếu tố viral khác nhau):
- Title 1: Dùng template từ NHÓM 1 (Bí mật) + yếu tố TÒ MÒ
- Title 2: Dùng template từ NHÓM 2 (Bứt phá) + yếu tố SO SÁNH/BẤT NGỜ
- Title 3: Dùng template từ NHÓM 3 (Kích thích) + yếu tố TRANH CÃI
- Title 4: Dùng template từ NHÓM 4 (Top) + yếu tố TỰ HÀO
- Title 5: Sáng tạo tự do — MIX 2-3 yếu tố viral mạnh nhất
Rules: 40-80 chars, emoji đầu, số/từ mạnh (bí mật, hack, thần thánh, gây sốt, điên rồ)

2. CAPTION DÀI (FB/IG — 150-300 words):
Structure: Hook (câu hỏi/statement gây sốc) → Micro-story → Education (mẹo thời trang) → Soft CTA
Dùng yếu tố: TÒ MÒ + GIÁO DỤC + BẤT NGỜ + THỎA MÃN
KHÔNG quảng cáo trực tiếp. Kể chuyện, giá trị, gợi ý tự nhiên.
CTA mềm: "Save lại để dùng khi cần nhé!" / "Tag bạn béee cùng học!"

3. CAPTION NGẮN (TikTok/Reels — 30-60 words):
Hook 3s + trending format (POV, Wait for it, Thử 1 lần rồi nghiện)
Dùng yếu tố: TÒ MÒ + BẤT NGỜ

4. HASHTAGS (25 total):
Tier 1 (5): #trending #ootd #fashionvietnam
Tier 2 (10): #meochonaodep #phoidoaff #stylevietnam
Tier 3 (10): niche/product-specific

5. THUMBNAIL TEXT (3-6 words, ALL CAPS, gây SHOCK):
Dùng yếu tố: TRANH CÃI hoặc BẤT NGỜ hoặc TÒ MÒ

Return ONLY valid JSON:
{
  "titles": ["title1", "title2", "title3", "title4", "title5"],
  "captionLong": "...",
  "captionShort": "...",
  "hashtags": { "tier1": [...], "tier2": [...], "tier3": [...] },
  "thumbnailText": "HACK DÁNG...",
  "viralFactorsUsed": ["Tò mò", "Tranh cãi", "..."]
}

Return ONLY JSON, no markdown.`

            // Send first generated image for visual context
            const imageFiles = []
            for (const img of images.filter(Boolean).slice(0, 2)) {
                if (img.startsWith('data:')) {
                    const resp = await fetch(img)
                    const blob = await resp.blob()
                    imageFiles.push(new File([blob], 'img.png', { type: 'image/png' }))
                }
            }

            const aiResponse = await callGemini({ prompt, images: imageFiles.length > 0 ? imageFiles : undefined })

            let parsed
            try {
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
                parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiResponse)
            } catch (e) {
                console.error('Failed to parse SEO content:', e)
                alert('AI không thể tạo nội dung. Vui lòng thử lại.')
                setLoading(false)
                return
            }
            setContent(parsed)
        } catch (err) {
            console.error('[SEO Gen Error]', err)
            alert('Lỗi: ' + err.message)
        }
        setLoading(false)
    }

    if (!hasImages) return null

    return (
        <div style={{
            background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)',
            padding: '16px 18px', marginTop: 16
        }}>
            {/* Header */}
            <div onClick={() => setExpanded(!expanded)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
            }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        🚀 SEO & AEO — Content Triệu View
                    </span>
                </h3>
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {!expanded ? null : (
                <div style={{ marginTop: 14 }}>
                    {/* Generate button */}
                    {!content && (
                        <button onClick={handleGenerate} disabled={loading} style={{
                            width: '100%', padding: '12px 0',
                            background: loading ? 'var(--border)' : 'linear-gradient(135deg, #f59e0b, #ef4444)',
                            color: '#fff', border: 'none', borderRadius: 12, cursor: loading ? 'default' : 'pointer',
                            fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}>
                            {loading ? (
                                <><Loader size={18} className="spin" /> 🧠 AI đang suy luận sâu...</>
                            ) : (
                                <><Sparkles size={18} /> Tạo Tiêu Đề + Caption + Hashtag + Thumbnail</>
                            )}
                        </button>
                    )}

                    {/* Results */}
                    {content && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                            {/* ═══ TITLES ═══ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <Type size={15} style={{ color: '#f59e0b' }} />
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>🎯 5 Tiêu Đề Viral (4 nhóm template + 1 sáng tạo)</span>
                                </div>
                                {content.titles?.map((t, i) => (
                                    <div key={i} style={{
                                        background: 'var(--bg-main)', borderRadius: 10, padding: '10px 12px', marginBottom: 6,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                        border: i === 0 ? '2px solid var(--brand)' : '1px solid var(--border)'
                                    }}>
                                        <span style={{ fontSize: 13, fontWeight: i === 0 ? 700 : 500, flex: 1 }}>
                                            {i === 0 && <span style={{ fontSize: 9, background: 'var(--brand)', color: '#fff', padding: '1px 6px', borderRadius: 6, marginRight: 6 }}>TOP PICK</span>}
                                            {t}
                                        </span>
                                        <CopyBtn text={t} />
                                    </div>
                                ))}

                                {/* Viral Factors Used badges */}
                                {content.viralFactorsUsed?.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)' }}>Yếu tố triệu view đã dùng:</span>
                                        {content.viralFactorsUsed.map((f, i) => (
                                            <span key={i} style={{
                                                fontSize: 9, padding: '2px 8px', borderRadius: 10,
                                                background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                                                fontWeight: 600
                                            }}>⚡ {f}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* ═══ CAPTION LONG ═══ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={15} style={{ color: '#3b82f6' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>📝 Caption Dài (FB/IG)</span>
                                    </div>
                                    <CopyBtn text={content.captionLong || ''} />
                                </div>
                                <div style={{
                                    background: 'var(--bg-main)', borderRadius: 10, padding: '12px 14px',
                                    fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)',
                                    border: '1px solid var(--border)', maxHeight: 200, overflowY: 'auto'
                                }}>
                                    {content.captionLong}
                                </div>
                            </div>

                            {/* ═══ CAPTION SHORT ═══ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={15} style={{ color: '#ec4899' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>⚡ Caption Ngắn (TikTok/Reels)</span>
                                    </div>
                                    <CopyBtn text={content.captionShort || ''} />
                                </div>
                                <div style={{
                                    background: 'var(--bg-main)', borderRadius: 10, padding: '12px 14px',
                                    fontSize: 13, fontWeight: 600, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                                    border: '1px solid var(--border)'
                                }}>
                                    {content.captionShort}
                                </div>
                            </div>

                            {/* ═══ HASHTAGS ═══ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Hash size={15} style={{ color: '#10b981' }} />
                                        <span style={{ fontSize: 13, fontWeight: 700 }}>#️⃣ Hashtags (Copy All)</span>
                                    </div>
                                    <CopyBtn text={[
                                        ...(content.hashtags?.tier1 || []),
                                        ...(content.hashtags?.tier2 || []),
                                        ...(content.hashtags?.tier3 || [])
                                    ].join(' ')} />
                                </div>
                                {['tier1', 'tier2', 'tier3'].map((tier, ti) => (
                                    <div key={tier} style={{ marginBottom: 6 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {ti === 0 ? '🔥 Trending' : ti === 1 ? '📈 Medium' : '🎯 Niche'}
                                        </span>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
                                            {(content.hashtags?.[tier] || []).map((tag, i) => (
                                                <span key={i} onClick={() => navigator.clipboard.writeText(tag)} style={{
                                                    fontSize: 11, padding: '3px 8px', borderRadius: 8, cursor: 'pointer',
                                                    background: ti === 0 ? 'rgba(245,158,11,0.15)' : ti === 1 ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)',
                                                    color: ti === 0 ? '#f59e0b' : ti === 1 ? '#3b82f6' : '#10b981',
                                                    fontWeight: 600, border: '1px solid transparent',
                                                    transition: 'all 0.15s'
                                                }}>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ═══ THUMBNAIL ═══ */}
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                    <ImageIcon size={15} style={{ color: '#8b5cf6' }} />
                                    <span style={{ fontSize: 13, fontWeight: 700 }}>🖼️ Thumbnail Text</span>
                                </div>
                                <div style={{
                                    background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 12, padding: '16px 18px',
                                    textAlign: 'center'
                                }}>
                                    <span style={{
                                        fontSize: 22, fontWeight: 900, color: '#fbbf24',
                                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)', letterSpacing: 1
                                    }}>
                                        {content.thumbnailText || 'HACK DÁNG THẦN THÁNH'}
                                    </span>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 6, marginBottom: 0 }}>
                                        💡 Đặt text này lên ảnh đẹp nhất để làm thumbnail
                                    </p>
                                </div>
                            </div>

                            {/* Regenerate */}
                            <button onClick={handleGenerate} disabled={loading} style={{
                                width: '100%', padding: '10px 0',
                                background: 'var(--bg-main)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                                borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                            }}>
                                {loading ? <Loader size={14} className="spin" /> : <RefreshCcw size={14} />}
                                Tạo lại nội dung khác
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
