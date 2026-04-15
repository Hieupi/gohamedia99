/**
 * GuidePage.jsx
 * Hướng dẫn sử dụng — đọc bài viết + xem video YouTube nhúng
 */
import { useState, useEffect } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '../services/firebaseConfig'
import { BookMarked, Loader, PlayCircle } from 'lucide-react'

function getYouTubeId(url) {
  if (!url) return null
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s?/]+)/)
  return match ? match[1] : null
}

export default function GuidePage() {
  const [guides, setGuides] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(
          collection(db, 'guides'),
          where('published', '==', true),
          orderBy('order', 'asc')
        )
        const snap = await getDocs(q)
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setGuides(list)
        if (list.length > 0) setSelected(list[0])
      } catch (err) {
        console.error('Guide load error:', err)
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Loader size={28} className="spin" style={{ color: 'var(--brand)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', overflow: 'hidden' }}>

      {/* ── Sidebar danh sách bài ── */}
      <div style={{
        width: 240, flexShrink: 0,
        borderRight: '1px solid var(--border-color)',
        overflowY: 'auto', padding: '16px 0',
        background: 'var(--bg-card)'
      }}>
        <div style={{
          padding: '0 16px 12px',
          fontSize: 11, fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: 1,
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <BookMarked size={13} />
          Hướng dẫn
        </div>

        {guides.length === 0 && (
          <div style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            Chưa có bài hướng dẫn nào.
          </div>
        )}

        {guides.map(g => (
          <button
            key={g.id}
            onClick={() => setSelected(g)}
            style={{
              width: '100%', textAlign: 'left',
              padding: '10px 16px 10px 13px',
              background: selected?.id === g.id ? 'var(--bg-elevated)' : 'transparent',
              border: 'none',
              borderLeft: selected?.id === g.id
                ? '3px solid var(--brand)'
                : '3px solid transparent',
              cursor: 'pointer', fontSize: 13,
              fontWeight: selected?.id === g.id ? 700 : 400,
              color: selected?.id === g.id ? 'var(--brand)' : 'var(--text-main)',
              transition: 'all 0.15s', lineHeight: 1.4
            }}
          >
            {g.title}
          </button>
        ))}
      </div>

      {/* ── Nội dung bài viết ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {!selected ? (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)', fontSize: 14 }}>
            Chọn một bài hướng dẫn ở bên trái
          </div>
        ) : (
          <article style={{ maxWidth: 820 }}>
            <h1 style={{ margin: '0 0 24px', fontSize: 26, fontWeight: 900, lineHeight: 1.35 }}>
              {selected.title}
            </h1>

            {/* Render blocks (text + video interleaved) */}
            {(selected.blocks || []).map((block, i) => {
              if (block.type === 'text') {
                return (
                  <div key={i} style={{
                    fontSize: 15, lineHeight: 1.85,
                    color: 'var(--text-main)',
                    whiteSpace: 'pre-wrap',
                    marginBottom: 28
                  }}>
                    {block.content}
                  </div>
                )
              }
              if (block.type === 'video') {
                const videoId = getYouTubeId(block.url)
                if (!videoId) return null
                return (
                  <div key={i} style={{ marginBottom: 28 }}>
                    {block.label && (
                      <div style={{
                        fontSize: 14, fontWeight: 700, marginBottom: 10,
                        display: 'flex', alignItems: 'center', gap: 6,
                        color: 'var(--text-main)'
                      }}>
                        <PlayCircle size={16} style={{ color: '#ef4444' }} />
                        {block.label}
                      </div>
                    )}
                    <div style={{
                      position: 'relative', paddingBottom: '56.25%', height: 0,
                      borderRadius: 12, overflow: 'hidden',
                      border: '1px solid var(--border-color)'
                    }}>
                      <iframe
                        src={`https://www.youtube.com/embed/${videoId}`}
                        title={block.label || `Video ${i + 1}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      />
                    </div>
                  </div>
                )
              }
              return null
            })}
          </article>
        )}
      </div>
    </div>
  )
}
