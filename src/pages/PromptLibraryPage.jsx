import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, X, Copy, Check, ExternalLink, ChevronUp,
  BookOpen, Sparkles, ImageOff, Loader2, Eye, Filter
} from 'lucide-react'
import './PromptLibraryPage.css'

const PAGE_SIZE = 30 // load 30 items at a time

export default function PromptLibraryPage() {
  /* ── state ──────────────────────────────────────────────────────────── */
  const [allPrompts, setAllPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(null)        // id of copied prompt
  const [modal, setModal] = useState(null)           // prompt object for modal
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [showTop, setShowTop] = useState(false)

  const sentinelRef = useRef(null)
  const pageRef = useRef(null)

  /* ── load data ──────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch('/data/prompts.json')
      .then(r => r.json())
      .then(data => { setAllPrompts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  /* ── filtered list ──────────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return allPrompts
    const q = search.toLowerCase()
    return allPrompts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.prompt?.toLowerCase().includes(q)
    )
  }, [allPrompts, search])

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount])
  const hasMore = visibleCount < filtered.length

  /* ── infinite scroll via IntersectionObserver ────────────────────────── */
  useEffect(() => {
    if (!sentinelRef.current) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore) {
        setVisibleCount(c => c + PAGE_SIZE)
      }
    }, { rootMargin: '400px' })
    obs.observe(sentinelRef.current)
    return () => obs.disconnect()
  }, [hasMore, filtered.length])

  /* reset visible count when search changes */
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [search])

  /* ── scroll-to-top button ───────────────────────────────────────────── */
  useEffect(() => {
    const el = pageRef.current?.closest('.page-content') || window
    const handler = () => {
      const scrollY = el === window ? window.scrollY : el.scrollTop
      setShowTop(scrollY > 600)
    }
    el.addEventListener('scroll', handler, { passive: true })
    return () => el.removeEventListener('scroll', handler)
  }, [])

  const scrollToTop = () => {
    const el = pageRef.current?.closest('.page-content') || window
    el.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ── copy prompt ────────────────────────────────────────────────────── */
  const handleCopy = useCallback((p) => {
    navigator.clipboard.writeText(p.prompt).then(() => {
      setCopied(p.id)
      setTimeout(() => setCopied(null), 1800)
    })
  }, [])

  /* ── render ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="pl-loading">
        <Loader2 className="pl-spin" size={36} />
        <p>Đang tải kho prompt...</p>
      </div>
    )
  }

  return (
    <div className="prompt-library fade-in" ref={pageRef}>
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="pl-header">
        <div className="pl-title-row">
          <div className="pl-icon-wrap">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="pl-title">Kho Prompt AI</h1>
            <p className="pl-subtitle">
              {filtered.length.toLocaleString()} prompt hình ảnh chất lượng cao
            </p>
          </div>
        </div>

        {/* search */}
        <div className="pl-search-wrap">
          <Search size={16} className="pl-search-icon" />
          <input
            className="pl-search"
            placeholder="Tìm kiếm prompt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="pl-search-clear" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── grid ────────────────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="pl-empty">
          <ImageOff size={48} />
          <p>Không tìm thấy prompt nào</p>
          <button className="btn btn-ghost" onClick={() => setSearch('')}>Xóa bộ lọc</button>
        </div>
      ) : (
        <div className="pl-grid">
          {visible.map(p => (
            <PromptCard
              key={p.id}
              prompt={p}
              copied={copied === p.id}
              onCopy={() => handleCopy(p)}
              onPreview={() => setModal(p)}
            />
          ))}
        </div>
      )}

      {/* ── sentinel for infinite scroll ───────────────────────────────── */}
      {hasMore && (
        <div ref={sentinelRef} className="pl-sentinel">
          <Loader2 className="pl-spin" size={20} />
          <span>Đang tải thêm...</span>
        </div>
      )}

      {/* ── back to top ────────────────────────────────────────────────── */}
      {showTop && (
        <button className="pl-fab" onClick={scrollToTop} title="Lên đầu trang">
          <ChevronUp size={20} />
        </button>
      )}

      {/* ── modal ───────────────────────────────────────────────────────── */}
      {modal && (
        <PromptModal
          prompt={modal}
          copied={copied === modal.id}
          onCopy={() => handleCopy(modal)}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  PromptCard                                                            */
/* ─────────────────────────────────────────────────────────────────────── */
function PromptCard({ prompt, copied, onCopy, onPreview }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="pl-card">
      {/* image */}
      <div className="pl-card-img-wrap" onClick={onPreview}>
        {prompt.image && !imgError ? (
          <img
            src={prompt.image}
            alt={prompt.title}
            loading="lazy"
            className="pl-card-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="pl-card-img-placeholder">
            <Sparkles size={28} />
          </div>
        )}
        <div className="pl-card-overlay">
          <Eye size={18} />
          <span>Xem chi tiết</span>
        </div>
      </div>

      {/* body */}
      <div className="pl-card-body">
        <h3 className="pl-card-title">{prompt.title}</h3>
        <p className="pl-card-snippet">
          {prompt.prompt?.slice(0, 120)}...
        </p>
      </div>

      {/* actions */}
      <div className="pl-card-actions">
        <button
          className={`pl-btn-copy${copied ? ' copied' : ''}`}
          onClick={onCopy}
          title="Copy prompt"
        >
          {copied ? <><Check size={13} /> Đã copy</> : <><Copy size={13} /> Copy</>}
        </button>
        {prompt.url && (
          <a
            className="pl-btn-link"
            href={prompt.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Xem bài gốc"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */
/*  PromptModal                                                           */
/* ─────────────────────────────────────────────────────────────────────── */
function PromptModal({ prompt, copied, onCopy, onClose }) {
  const [imgError, setImgError] = useState(false)

  /* close on Escape */
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="pl-modal-overlay" onClick={onClose}>
      <div className="pl-modal" onClick={e => e.stopPropagation()}>
        <button className="pl-modal-close" onClick={onClose}><X size={18} /></button>

        {/* image */}
        {prompt.image && !imgError ? (
          <img
            src={prompt.image}
            alt={prompt.title}
            className="pl-modal-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="pl-modal-img-placeholder">
            <Sparkles size={48} />
          </div>
        )}

        {/* content */}
        <div className="pl-modal-body">
          <h2 className="pl-modal-title">{prompt.title}</h2>
          <pre className="pl-modal-prompt">{prompt.prompt}</pre>

          <div className="pl-modal-actions">
            <button
              className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
              onClick={onCopy}
            >
              {copied ? <><Check size={14} /> Đã copy!</> : <><Copy size={14} /> Copy Prompt</>}
            </button>
            {prompt.url && (
              <a
                className="btn btn-ghost"
                href={prompt.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={14} /> Bài gốc
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
