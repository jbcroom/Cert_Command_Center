import { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

export default function ExamTimer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds)
  const expiredRef = useRef(false)

  useEffect(() => {
    if (remaining <= 0 && !expiredRef.current) {
      expiredRef.current = true
      onExpire?.()
      return
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, onExpire])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  const pct = totalSeconds > 0 ? remaining / totalSeconds : 1
  const urgent = pct < 0.1

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono-data font-medium ${urgent ? 'bg-danger/10 text-danger' : 'bg-bg-elevated text-text-primary'}`}>
      <Clock size={14} className={urgent ? 'text-danger' : 'text-text-muted'} />
      {display}
    </div>
  )
}
