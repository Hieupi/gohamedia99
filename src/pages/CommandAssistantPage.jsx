import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, RotateCcw, SendHorizontal, User } from 'lucide-react'
import { callGemini } from '../services/geminiService'
import { COMMAND_ASSISTANT_SYSTEM_PROMPT } from '../services/commandAssistantSystemPrompt'
import './CommandAssistantPage.css'

const MAX_CONTEXT_MESSAGES = 16
const COMMAND_ASSISTANT_MODEL = 'gemini-3-pro-image-preview'

function buildAssistantPrompt(historyMessages, latestUserInput) {
  const historyText = historyMessages
    .slice(-MAX_CONTEXT_MESSAGES)
    .map((message, index) => {
      const roleLabel = message.role === 'user' ? 'Người dùng' : 'Trợ lý'
      return `${index + 1}. ${roleLabel}: ${message.content}`
    })
    .join('\n\n')

  return `Bạn đang chạy ở chế độ trợ lý viết câu lệnh với SYSTEM INSTRUCTIONS cố định bên dưới. Tuân thủ tuyệt đối.

[SYSTEM INSTRUCTIONS]
${COMMAND_ASSISTANT_SYSTEM_PROMPT}

[QUY TẮC THỰC THI BỔ SUNG]
- Luôn trả lời bằng tiếng Việt, ngắn gọn, rõ ràng, có tính hành động.
- Khi người dùng yêu cầu tạo prompt: bắt buộc xuất theo cấu trúc C.R.A.F.T.+ và chỉ dẫn cụ thể.
- Nếu dữ liệu đầu vào chưa đủ: hỏi tối đa 5 câu hỏi làm rõ, không hỏi lan man.
- Không bịa thông tin. Nếu thiếu dữ liệu bắt buộc, nêu rõ giả định.

[LỊCH SỬ HỘI THOẠI GẦN NHẤT]
${historyText || 'Chưa có lịch sử.'}

[YÊU CẦU MỚI TỪ NGƯỜI DÙNG]
${latestUserInput}

Hãy trả lời trực tiếp cho người dùng ngay bây giờ.`
}

export default function CommandAssistantPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  const handleClearConversation = () => {
    setMessages([])
    setInput('')
    setError('')
  }

  const handleSend = async () => {
    const userInput = input.trim()
    if (!userInput || loading) return

    const historySnapshot = [...messages]
    const nextUserMessage = { role: 'user', content: userInput }

    setMessages(prev => [...prev, nextUserMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const prompt = buildAssistantPrompt(historySnapshot, userInput)
      const response = await callGemini({
        prompt,
        model: COMMAND_ASSISTANT_MODEL,
        temperature: 0.35,
        maxTokens: 4096,
      })

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: (response || '').trim() || 'Mình chưa tạo được phản hồi hợp lệ. Bạn thử lại nhé.',
        },
      ])
    } catch (err) {
      const message = err?.message || 'Không thể kết nối mô hình AI.'
      setError(message)
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Mình chưa xử lý được do lỗi: ${message}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pa-page">
      <div className="pa-header">
        <div>
          <h1>Trợ Lý Viết Câu Lệnh</h1>
          <p>Chat tự nhiên như Gemini/ChatGPT. Mô tả mục tiêu càng rõ, kết quả càng chuẩn.</p>
        </div>
        <button type="button" className="pa-reset-btn" onClick={handleClearConversation}>
          <RotateCcw size={15} />
          Cuộc trò chuyện mới
        </button>
      </div>

      <div className="pa-chat-shell">
        <div className="pa-messages">
          {messages.length === 0 && (
            <div className="pa-empty">
              <div className="pa-empty-icon">
                <Bot size={20} />
              </div>
              <div className="pa-empty-title">Bắt đầu cuộc trò chuyện</div>
              <div className="pa-empty-subtitle">
                Ví dụ: “Viết prompt tạo kế hoạch nội dung TikTok cho shop thời trang nữ trong 30 ngày.”
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`pa-message ${message.role}`}>
              <div className="pa-avatar">{message.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}</div>
              <div className="pa-bubble">{message.content}</div>
            </div>
          ))}

          {loading && (
            <div className="pa-message assistant">
              <div className="pa-avatar">
                <Bot size={14} />
              </div>
              <div className="pa-bubble loading">
                <Loader2 size={14} className="spin" />
                Đang xử lý...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="pa-composer">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Nhập yêu cầu của bạn... (Enter để gửi, Shift+Enter xuống dòng)"
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            type="button"
            className="pa-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Gửi"
          >
            {loading ? <Loader2 size={16} className="spin" /> : <SendHorizontal size={16} />}
          </button>
        </div>

        {error && <div className="pa-error">{error}</div>}
      </div>
    </div>
  )
}
