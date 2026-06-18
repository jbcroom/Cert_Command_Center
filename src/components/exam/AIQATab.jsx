import { useState, useEffect, useRef } from 'react'
import { Send, RefreshCw, AlertCircle } from 'lucide-react'
import { askCertAI } from '../../lib/anthropic'

const STORAGE_KEY = certId => `aiqa_${certId}`
const MAX_MESSAGES = 50
const SOFT_WARN = 20

export default function AIQATab({ cert }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [restored, setRestored] = useState(false)
  const [count, setCount] = useState(0)
  const bottomRef = useRef(null)
  const timerRef = useRef(null)

  // Restore session
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY(cert.id))
    if (saved) { try { setMessages(JSON.parse(saved)); setRestored(true) } catch {} }
  }, [cert.id])

  // Persist session
  useEffect(() => {
    if (messages.length) sessionStorage.setItem(STORAGE_KEY(cert.id), JSON.stringify(messages))
  }, [messages, cert.id])

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function clearSession() { setMessages([]); setRestored(false); setCount(0); sessionStorage.removeItem(STORAGE_KEY(cert.id)) }

  async function send(e) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading || count >= MAX_MESSAGES) return

    const userMsg = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    timerRef.current = setTimeout(() => setError('timeout'), 15000)

    try {
      const reply = await askCertAI(cert.id, next)
      clearTimeout(timerRef.current)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
      setCount(c => c + 1)
    } catch (err) {
      clearTimeout(timerRef.current)
      setError(err.message || 'unknown')
    } finally {
      setLoading(false)
    }
  }

  const atCap = count >= MAX_MESSAGES

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">AI study assistant for {cert.exam_code || cert.name}</span>
          {count > 0 && <span className={`text-xs font-mono-data ${count >= SOFT_WARN ? 'text-warning' : 'text-text-muted'}`}>({count}/{MAX_MESSAGES})</span>}
        </div>
        {messages.length > 0 && (
          <button onClick={clearSession} className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={11} /> Start fresh
          </button>
        )}
      </div>

      {/* Restore banner */}
      {restored && messages.length > 0 && (
        <div className="flex items-center justify-between px-3 py-2 bg-accent-blue/10 border border-accent-blue/20 rounded-lg mb-3 flex-shrink-0">
          <span className="text-xs text-accent-blue">Previous conversation restored</span>
          <button onClick={clearSession} className="text-xs text-accent-blue hover:underline">Start fresh</button>
        </div>
      )}

      {/* Soft warning */}
      {count >= SOFT_WARN && count < MAX_MESSAGES && (
        <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg mb-3 flex-shrink-0">
          <p className="text-xs text-warning">You've sent {count} messages this session — AI Q&A is great for focused questions.</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-text-muted text-sm">Ask me anything about {cert.exam_code || cert.name}</p>
              <p className="text-text-muted text-xs">Concepts, practice questions, domain explanations…</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-accent-blue text-white rounded-br-sm'
                : 'bg-bg-elevated text-text-primary rounded-bl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-elevated px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 px-3 py-2 bg-danger/10 border border-danger/20 rounded-lg">
            <AlertCircle size={13} className="text-danger flex-shrink-0" />
            <span className="text-xs text-danger">
              {error === 'timeout' ? "Response timed out — try rephrasing." : `Error: ${error}`}
            </span>
            <button onClick={() => setError(null)} className="ml-auto text-xs text-danger hover:underline">Dismiss</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex gap-2 flex-shrink-0">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading || atCap}
          placeholder={atCap ? 'Message limit reached — start a fresh session' : 'Ask a question…'}
          className="flex-1 bg-bg-elevated border border-bg-elevated rounded-xl px-4 py-2.5 text-sm text-text-primary focus:outline-none focus:border-accent-blue placeholder-text-muted disabled:opacity-50"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) send(e) }}
        />
        <button type="submit" disabled={loading || !input.trim() || atCap}
          className="px-4 py-2.5 rounded-xl bg-accent-blue text-white hover:bg-accent-blue/80 disabled:opacity-40 transition-colors flex-shrink-0">
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}
