import { useState, useRef } from 'react'
import {
  Upload, Wand2, ChevronDown, RotateCcw, Download, Sparkles, Image
} from 'lucide-react'

const MODELS = ['Á Đông', 'Châu Âu', 'Hàn Quốc', 'Ngẫu nhiên']
const BACKGROUNDS = ['Studio trắng', 'Studio xám', 'Ngoài trời', 'Thương mại', 'Nghệ thuật']
const POSES = ['Đứng thẳng', 'Đặt tay eo', 'Tự nhiên', 'Đi bộ', 'Ngồi']
const STYLES = ['Chuyên nghiệp', 'Casual', 'Thể thao', 'Thời trang', 'Tối giản']

function DropdownSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', height: 42, padding: '0 12px 0 14px',
          border: '1.5px solid var(--border)', borderRadius: 'var(--r-md)',
          background: 'var(--white)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13.5, color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'border-color 0.15s',
        }}
      >
        {value || placeholder}
        <ChevronDown size={14} style={{ opacity: 0.5 }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: 'var(--white)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-md)', marginTop: 4,
          boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => { onChange(opt); setOpen(false) }}
              style={{
                width: '100%', padding: '9px 14px', textAlign: 'left',
                background: value === opt ? 'var(--brand-08)' : 'none',
                border: 'none', cursor: 'pointer', fontSize: 13.5,
                color: value === opt ? 'var(--brand)' : 'var(--text-primary)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = 'var(--bg-page)' }}
              onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'none' }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NewDesignPage() {
  const [productImg, setProductImg] = useState(null)
  const [modelType, setModelType] = useState('')
  const [background, setBackground] = useState('')
  const [pose, setPose] = useState('')
  const [style, setStyle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const fileRef = useRef()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setProductImg(url)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setProductImg(url)
    setResult(null)
  }

  const handleGenerate = async () => {
    if (!productImg) return
    setLoading(true)
    setResult(null)
    // Simulate generation
    await new Promise(r => setTimeout(r, 2500))
    // Use a random picsum image as "result"
    setResult(`https://picsum.photos/seed/${Date.now()}/450/675`)
    setLoading(false)
  }

  const handleReset = () => {
    setProductImg(null)
    setResult(null)
    setModelType('')
    setBackground('')
    setPose('')
    setStyle('')
    setPrompt('')
  }

  return (
    <div className="fade-in">
      <h1 className="page-title">✨ Thiết kế mới</h1>

      <div className="design-layout">
        {/* Left: Upload + Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Step 1: Upload */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">1</div>
              <div className="design-step-title">Tải ảnh sản phẩm</div>
            </div>
            <div className="design-step-body">
              {!productImg ? (
                <div
                  className="upload-zone"
                  onClick={() => fileRef.current.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                >
                  <Upload className="upload-icon" />
                  <div className="upload-label">Kéo thả hoặc click để chọn ảnh</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>PNG, JPG, WEBP — tối đa 10MB</div>
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img
                    src={productImg}
                    alt="Sản phẩm"
                    style={{
                      width: '100%', height: 260, objectFit: 'contain',
                      borderRadius: 'var(--r-md)', background: 'var(--bg-page)'
                    }}
                  />
                  <button
                    onClick={handleReset}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.55)', color: 'white',
                      border: 'none', borderRadius: 'var(--r-full)',
                      width: 30, height: 30, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Settings */}
          <div className="design-step">
            <div className="design-step-header">
              <div className="design-step-number">2</div>
              <div className="design-step-title">Tùy chỉnh AI</div>
            </div>
            <div className="design-step-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Kiểu model</label>
                  <DropdownSelect options={MODELS} value={modelType} onChange={setModelType} placeholder="Chọn kiểu model" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phông nền</label>
                  <DropdownSelect options={BACKGROUNDS} value={background} onChange={setBackground} placeholder="Chọn phông nền" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Tư thế</label>
                    <DropdownSelect options={POSES} value={pose} onChange={setPose} placeholder="Chọn..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phong cách</label>
                    <DropdownSelect options={STYLES} value={style} onChange={setStyle} placeholder="Chọn..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Mô tả thêm (tùy chọn)</label>
                  <textarea
                    className="form-input"
                    style={{ height: 80, padding: '10px 14px', resize: 'vertical' }}
                    placeholder="Ví dụ: ánh sáng tự nhiên, model tóc dài, da đẹp..."
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={handleGenerate}
                  disabled={!productImg || loading}
                >
                  {loading ? (
                    <>
                      <span className="spin" style={{ display: 'inline-block', width: 16, height: 16,
                        border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white',
                        borderRadius: '50%' }} />
                      Đang tạo ảnh AI...
                    </>
                  ) : (
                    <>
                      <Sparkles size={17} />
                      Tạo ảnh AI
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Result */}
        <div className="design-step" style={{ minHeight: 500 }}>
          <div className="design-step-header">
            <div className="design-step-number">3</div>
            <div className="design-step-title">Kết quả</div>
          </div>
          <div className="design-step-body" style={{ height: 'calc(100% - 55px)' }}>
            {loading ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 16, height: 400
              }}>
                <div style={{
                  width: 52, height: 52, border: '3px solid var(--brand-15)',
                  borderTopColor: 'var(--brand)', borderRadius: '50%'
                }} className="spin" />
                <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>AI đang tạo ảnh...</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thường mất 15-30 giây</div>
              </div>
            ) : result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <img
                  src={result}
                  alt="Kết quả AI"
                  style={{
                    width: '100%', maxHeight: 480, objectFit: 'contain',
                    borderRadius: 'var(--r-md)', background: 'var(--bg-page)'
                  }}
                />
                <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                  <button className="btn btn-primary" style={{ flex: 1 }}>
                    <Download size={15} />
                    Tải xuống
                  </button>
                  <button className="btn btn-secondary" onClick={handleGenerate}>
                    <RotateCcw size={15} />
                    Tạo lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <Image />
                <h3>Kết quả sẽ hiện ở đây</h3>
                <p>Tải ảnh sản phẩm và nhấn "Tạo ảnh AI" để bắt đầu</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
