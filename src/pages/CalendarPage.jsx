import { useState, useEffect } from 'react'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale/en-US'
import { Download } from 'lucide-react'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { supabase } from '../lib/supabase'
import TopBar from '../components/layout/TopBar'

function toICSDate(date, allDay = false) {
  const d = new Date(date)
  const pad = n => String(n).padStart(2, '0')
  if (allDay) {
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
  }
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
}

function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cert Command Center//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Cert Command Center',
  ]
  events.forEach((ev, i) => {
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:ccc-${ev.id || i}@certcommandcenter`)
    lines.push(`SUMMARY:${ev.title}`)
    if (ev.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${toICSDate(ev.start, true)}`)
      lines.push(`DTEND;VALUE=DATE:${toICSDate(ev.end, true)}`)
    } else {
      lines.push(`DTSTART:${toICSDate(ev.start)}`)
      lines.push(`DTEND:${toICSDate(ev.end)}`)
    }
    lines.push('END:VEVENT')
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

function downloadICS(events) {
  const ics = generateICS(events)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cert-command-center.ics'
  a.click()
  URL.revokeObjectURL(url)
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
})

// Distinct hues for certs — rotate through these
const CERT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
]

function certColor(index) {
  return CERT_COLORS[index % CERT_COLORS.length]
}

// ── Custom event pill ──────────────────────────────────────────────────────────
function EventPill({ event }) {
  return (
    <span className="text-[11px] font-medium truncate" title={event.title}>
      {event.title}
    </span>
  )
}

export default function CalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week')

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Fetch certs + related data in parallel
      const [certsRes, sessionsRes, sittingsRes, flashcardsRes, mockExamsRes] = await Promise.all([
        supabase.from('certifications').select('id, name, exam_code, target_date, color').eq('archived', false),
        supabase.from('study_sessions').select('id, cert_id, session_date, duration_minutes').order('session_date'),
        supabase.from('cert_sittings').select('id, cert_id, sitting_date, result, attempt_number'),
        supabase.from('flashcards').select('id, cert_id, next_review_at').eq('active', true).not('next_review_at', 'is', null),
        supabase.from('mock_exam_sessions').select('id, cert_id, created_at').eq('status', 'completed'),
      ])

      const certs = certsRes.data || []
      const certIndex = {}
      certs.forEach((c, i) => { certIndex[c.id] = { ...c, colorHex: c.color || certColor(i) } })

      function label(certId) {
        const c = certIndex[certId]
        return c ? (c.exam_code || c.name) : certId
      }

      const built = []

      // Target dates — all-day events
      certs.forEach(c => {
        if (!c.target_date) return
        built.push({
          id: `target-${c.id}`,
          title: `🎯 ${c.exam_code || c.name} exam`,
          start: new Date(c.target_date + 'T00:00:00'),
          end: new Date(c.target_date + 'T00:00:00'),
          allDay: true,
          type: 'target',
          certId: c.id,
          color: certIndex[c.id]?.colorHex || '#3b82f6',
        })
      })

      // Study sessions
      ;(sessionsRes.data || []).forEach(s => {
        const d = new Date(s.session_date + 'T09:00:00')
        built.push({
          id: `session-${s.id}`,
          title: `📚 ${label(s.cert_id)}${s.duration_minutes ? ` (${s.duration_minutes}m)` : ''}`,
          start: d,
          end: new Date(d.getTime() + (s.duration_minutes || 60) * 60000),
          allDay: false,
          type: 'session',
          certId: s.cert_id,
          color: certIndex[s.cert_id]?.colorHex || '#8b5cf6',
        })
      })

      // Real exam sittings
      ;(sittingsRes.data || []).forEach(s => {
        built.push({
          id: `sitting-${s.id}`,
          title: `${s.result === 'pass' ? '✅' : '❌'} ${label(s.cert_id)} attempt #${s.attempt_number}`,
          start: new Date(s.sitting_date + 'T09:00:00'),
          end: new Date(s.sitting_date + 'T12:00:00'),
          allDay: false,
          type: 'sitting',
          certId: s.cert_id,
          color: s.result === 'pass' ? '#10b981' : '#ef4444',
        })
      })

      // Flashcards due (group by cert+date)
      const dueByCertDate = {}
      ;(flashcardsRes.data || []).forEach(f => {
        if (!f.next_review_at) return
        const key = `${f.cert_id}::${f.next_review_at}`
        dueByCertDate[key] = (dueByCertDate[key] || 0) + 1
      })
      Object.entries(dueByCertDate).forEach(([key, count]) => {
        const [certId, date] = key.split('::')
        built.push({
          id: `due-${key}`,
          title: `🃏 ${label(certId)} — ${count} card${count !== 1 ? 's' : ''} due`,
          start: new Date(date + 'T00:00:00'),
          end: new Date(date + 'T00:00:00'),
          allDay: true,
          type: 'flashcard',
          certId,
          color: certIndex[certId]?.colorHex || '#06b6d4',
        })
      })

      // Mock exam sessions (group by cert+date)
      const mockByCertDate = {}
      ;(mockExamsRes.data || []).forEach(m => {
        const date = m.created_at?.split('T')[0]
        if (!date) return
        const key = `${m.cert_id}::${date}`
        mockByCertDate[key] = (mockByCertDate[key] || 0) + 1
      })
      Object.entries(mockByCertDate).forEach(([key, count]) => {
        const [certId, date] = key.split('::')
        built.push({
          id: `mock-${key}`,
          title: `📝 ${label(certId)} mock exam${count > 1 ? ` ×${count}` : ''}`,
          start: new Date(date + 'T09:00:00'),
          end: new Date(date + 'T11:00:00'),
          allDay: false,
          type: 'mock',
          certId,
          color: certIndex[certId]?.colorHex || '#f59e0b',
        })
      })

      setEvents(built)
      setLoading(false)
    }
    load()
  }, [])

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.color + '33',
      border: `1px solid ${event.color}`,
      color: event.color,
      borderRadius: '4px',
      fontSize: '11px',
      padding: '1px 4px',
    },
  })

  // Legend
  const legend = [
    { label: 'Exam date', color: '#3b82f6', icon: '🎯' },
    { label: 'Study session', color: '#8b5cf6', icon: '📚' },
    { label: 'Mock exam', color: '#f59e0b', icon: '📝' },
    { label: 'Cards due', color: '#06b6d4', icon: '🃏' },
    { label: 'Real sitting', color: '#10b981', icon: '✅' },
  ]

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col p-6 gap-4">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-text-primary">Calendar</h1>
            <p className="text-xs text-text-muted mt-0.5">All study events across your certifications</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadICS(events)}
              disabled={events.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated disabled:opacity-40 transition-colors"
              title="Export as .ics calendar file"
            >
              <Download size={13} />
              Export .ics
            </button>
            {/* View switcher */}
            {['month', 'week', 'agenda'].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                  view === v ? 'bg-accent-blue text-white' : 'text-text-muted hover:bg-bg-elevated'
                }`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 flex-shrink-0">
          {legend.map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-text-muted">
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="flex-1 min-h-0 rbc-dark-theme">
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-muted text-sm">Loading…</div>
          ) : (
            <Calendar
              localizer={localizer}
              events={events}
              defaultView={view}
              view={view}
              onView={setView}
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              components={{ event: EventPill }}
              popup
              showMultiDayTimes
            />
          )}
        </div>
      </main>
    </>
  )
}
