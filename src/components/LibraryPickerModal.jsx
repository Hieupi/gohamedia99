import { useState, useMemo } from 'react'
import { FolderOpen, Search, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { getLibraryItems } from '../services/libraryService'

const PAGE_SIZE = 24

/**
 * Shared Library Picker Modal
 * Props:
 *   onSelect(item)  — called when user clicks an item
 *   onClose()       — called to dismiss modal
 *   title           — optional header string
 */
export default function LibraryPickerModal({ onSelect, onClose, title }) {
    const allItems = getLibraryItems()
    const [query, setQuery] = useState('')
    const [page, setPage] = useState(0)

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        if (!q) return allItems
        return allItems.filter(item =>
            (item.name || '').toLowerCase().includes(q)
        )
    }, [allItems, query])

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, totalPages - 1)
    const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

    const handleSearch = (e) => {
        setQuery(e.target.value)
        setPage(0)
    }

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                className="modal-box"
                onClick={e => e.stopPropagation()}
                style={{
                    maxWidth: '92vw', width: 960,
                    maxHeight: '88vh',
                    display: 'flex', flexDirection: 'column',
                    gap: 0,
                }}
            >
                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FolderOpen size={18} style={{ color: 'var(--brand)' }} />
                        {title || 'Chọn từ Kho Thư Viện'}
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
                            ({filtered.length} ảnh)
                        </span>
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6, lineHeight: 0 }}
                        title="Đóng"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Search bar ── */}
                <div style={{ position: 'relative', marginBottom: 14, flexShrink: 0 }}>
                    <Search
                        size={15}
                        style={{
                            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--text-muted)', pointerEvents: 'none',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên ảnh…"
                        value={query}
                        onChange={handleSearch}
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '9px 12px 9px 34px',
                            borderRadius: 'var(--r-md)',
                            border: '1.5px solid var(--border)',
                            background: 'var(--bg-input, var(--bg-card))',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'var(--brand)')}
                        onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setPage(0) }}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 0, padding: 2 }}
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* ── Grid ── */}
                {allItems.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                        Kho thư viện trống. Hãy tải ảnh lên hoặc tách đồ trước.
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                        Không tìm thấy ảnh nào với từ khóa "{query}".
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: 12,
                        overflowY: 'auto',
                        flex: 1,
                        padding: '4px 2px',
                    }}>
                        {pageItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => onSelect(item)}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: 'var(--r-md)',
                                    overflow: 'hidden',
                                    border: '2px solid var(--border)',
                                    transition: 'all 0.15s',
                                    background: 'var(--bg-card)',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--brand)'
                                    e.currentTarget.style.transform = 'scale(1.04)'
                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--border)'
                                    e.currentTarget.style.transform = 'scale(1)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }}
                            >
                                <img
                                    src={item.imageSrc}
                                    alt={item.name}
                                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }}
                                    loading="lazy"
                                />
                                <div style={{
                                    padding: '6px 8px',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    color: 'var(--text-secondary)',
                                }}>
                                    {item.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Footer: pagination + close ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: totalPages > 1 ? 'space-between' : 'flex-end',
                    marginTop: 14,
                    flexShrink: 0,
                    gap: 12,
                }}>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button
                                className="btn btn-ghost"
                                disabled={safePage === 0}
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                <ChevronLeft size={14} /> Trước
                            </button>

                            {/* page number pills */}
                            <div style={{ display: 'flex', gap: 4 }}>
                                {Array.from({ length: totalPages }, (_, i) => {
                                    // show first, last, current ±1, and ellipsis
                                    const show = i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1
                                    const ellipsisBefore = i === 1 && safePage > 2
                                    const ellipsisAfter = i === totalPages - 2 && safePage < totalPages - 3
                                    if (!show) return null
                                    if (ellipsisBefore) return (
                                        <span key={`e-${i}`} style={{ padding: '4px 6px', fontSize: 12, color: 'var(--text-muted)' }}>…</span>
                                    )
                                    if (ellipsisAfter) return (
                                        <span key={`e2-${i}`} style={{ padding: '4px 6px', fontSize: 12, color: 'var(--text-muted)' }}>…</span>
                                    )
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i)}
                                            style={{
                                                minWidth: 30, padding: '4px 8px',
                                                borderRadius: 6, border: '1.5px solid',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                borderColor: i === safePage ? 'var(--brand)' : 'var(--border)',
                                                background: i === safePage ? 'var(--brand)' : 'transparent',
                                                color: i === safePage ? '#fff' : 'var(--text-secondary)',
                                                transition: 'all 0.12s',
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    )
                                })}
                            </div>

                            <button
                                className="btn btn-ghost"
                                disabled={safePage >= totalPages - 1}
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                Sau <ChevronRight size={14} />
                            </button>

                            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>
                                Trang {safePage + 1}/{totalPages} · {filtered.length} ảnh
                            </span>
                        </div>
                    )}

                    <button className="btn btn-ghost" onClick={onClose}>Đóng</button>
                </div>
            </div>
        </div>
    )
}
