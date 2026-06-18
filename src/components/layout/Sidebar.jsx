import { useState, useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { LayoutDashboard, ChevronDown, ChevronRight, Archive, Plus, ArchiveRestore, LogOut, LayersIcon, Settings2, CalendarDays } from 'lucide-react'
import { useCertifications, getCertYear } from '../../hooks/useCertifications'
import { supabase } from '../../lib/supabase'
import NotificationBell from './NotificationBell'

const STATUS_DOT = {
  planned: 'bg-text-muted',
  in_progress: 'bg-accent-blue animate-pulse',
  complete: 'bg-accent-gold',
  failed: 'bg-danger',
}

function CertLink({ cert }) {
  return (
    <NavLink
      to={`/cert/${cert.id}`}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-1.5 min-h-[44px] rounded-md text-sm transition-colors ${
          isActive
            ? 'bg-bg-elevated text-text-primary'
            : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
        }`
      }
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[cert.status] || 'bg-text-muted'}`}
        style={cert.color ? { backgroundColor: cert.color } : undefined}
      />
      <span className="truncate">{cert.exam_code || cert.name}</span>
    </NavLink>
  )
}

function useDueCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const { count: n } = await supabase
        .from('flashcards')
        .select('id', { count: 'exact', head: true })
        .eq('active', true)
        .lte('next_review_at', today)
      setCount(n || 0)
    }
    load()
  }, [])
  return count
}

export default function Sidebar({ onAddCert }) {
  const { certifications } = useCertifications({ includeArchived: false })
  const { certifications: archived } = useCertifications({ includeArchived: true })
  const [archivedOpen, setArchivedOpen] = useState(false)
  const dueCount = useDueCount()

  const active = certifications.filter(c => !c.archived)
  const archivedList = archived.filter(c => c.archived)

  // Group active certs by year
  const grouped = active.reduce((acc, cert) => {
    const year = getCertYear(cert)
    if (!acc[year]) acc[year] = []
    acc[year].push(cert)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-screen bg-bg-surface border-r border-bg-elevated">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-bg-elevated">
        <span className="text-text-primary font-bold text-base tracking-tight">
          Command Center
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`
          }
        >
          <LayoutDashboard size={15} />
          Dashboard
        </NavLink>

        <NavLink
          to="/calendar"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`
          }
        >
          <CalendarDays size={15} />
          Calendar
        </NavLink>

        <NavLink
          to="/review"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
              isActive
                ? 'bg-bg-elevated text-text-primary'
                : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`
          }
        >
          <LayersIcon size={15} />
          Review Due
          {dueCount > 0 && (
            <span className="ml-auto text-[10px] font-bold font-mono-data bg-accent-blue text-white px-1.5 py-0.5 rounded-full">
              {dueCount}
            </span>
          )}
        </NavLink>

        <div>
          <div className="flex items-center justify-between px-3 mb-1">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Certifications</p>
            <button
              onClick={onAddCert}
              title="Add certification"
              className="text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded p-0.5 transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>
          {years.map(year => (
            <div key={year} className="mb-2">
              <p className="px-3 mb-0.5 text-[10px] font-medium text-text-muted/60 uppercase tracking-widest">{year}</p>
              <div className="space-y-0.5">
                {grouped[year].map(cert => (
                  <CertLink key={cert.id} cert={cert} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Archived section */}
        {archivedList.length > 0 && (
          <div>
            <button
              onClick={() => setArchivedOpen(o => !o)}
              className="flex items-center gap-2 px-3 py-1.5 w-full text-xs font-semibold text-text-muted uppercase tracking-widest hover:text-text-primary transition-colors"
            >
              {archivedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Archive size={12} />
              Archived
              <span className="ml-auto text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded-full">{archivedList.length}</span>
            </button>
            {archivedOpen && (
              <div className="space-y-0.5 mt-1">
                {archivedList.map(cert => (
                  <div key={cert.id} className="flex items-center gap-1 group">
                    <CertLink cert={cert} />
                  </div>
                ))}
                <NavLink
                  to="/archived"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${isActive ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'}`
                  }
                >
                  <ArchiveRestore size={12} />
                  Manage archived…
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-bg-elevated space-y-0.5">
        <NotificationBell />
        <NavLink
          to="/system"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-md text-sm transition-colors ${
              isActive ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
            }`
          }
        >
          <Settings2 size={15} />
          System
        </NavLink>
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 w-full px-3 py-2 min-h-[44px] rounded-md text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
