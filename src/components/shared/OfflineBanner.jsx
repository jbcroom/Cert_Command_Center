import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setIsOnline(true)
    const down = () => setIsOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down) }
  }, [])

  if (isOnline) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border-b border-warning/20 text-xs text-warning">
      <WifiOff size={13} />
      You're offline — study data and AI Q&A unavailable. Flashcards still work.
    </div>
  )
}
