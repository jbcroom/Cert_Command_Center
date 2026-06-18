import { useState, useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { House, BookOpen, LayersIcon, CalendarDays, MoreHorizontal, X, Plus, Settings2, LogOut, ChevronRight, ChevronDown, Archive, ArchiveRestore } from 'lucide-react'
import { useCertifications, getCertYear } from '../../hooks/useCertifications'
import { supabase } from '../../lib/supabase'

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

const STATUS_DOT = {
  planned: 'bg-text-muted',
  in_progress: 'bg-accent-blue animate-pulse',
  complete: 'bg-accent-gold',
  failed: 'bg-danger',
}

function Backdrop({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/50"
      onClick={onClose}
    />
  )
}

function CertDrawer({ open, onClose, onAddCert }) {
  const { certifications } = useCertifications({ includeArchived: false })
  const { certifications: allCerts } = useCertifications({ includeArchived: true })
  const [archivedOpen, setArchivedOpen] = useState(false)
  const navigate = useNavigate()

  const active = certifications.filter(c => !c.archived)
  const archivedList = allCerts.filter(c => c.archived)

  const grouped = active.reduce((acc, cert) => {
    const year = getCertYear(cert)
    if (!acc[year]) acc[year] = []
    acc[year].push(cert)
    return acc
  }, {})
  const years = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  function goToCert(id) {
    navigate(`/cert/${id}`)
    onClose()
  }

  return (
    <>
      {open && <Backdrop onClose={onClose} />}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-bg-surface border-t border-bg-elevated rounded-t-2xl
                    transition-transform duration-300 ease-out
                    ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '80vh' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-bg-elevated" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-bg-elevated">
          <span className="text-text-primary font-semibold text-sm">Certifications</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onAddCert?.(); onClose() }}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              title="Add certification"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Cert list */}
        <div className="overflow-y-auto px-2 py-2" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          {years.map(year => (
            <div key={year} className="mb-3">
              <p className="px-3 mb-1 text-[10px] font-medium text-text-muted/60 uppercase tracking-widest">{year}</p>
              {grouped[year].map(cert => (
                <button
                  key={cert.id}
                  onClick={() => goToCert(cert.id)}
                  className="flex items-center gap-2.5 w-full px-3 py-3 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[cert.status] || 'bg-text-muted'}`}
                    style={cert.color ? { backgroundColor: cert.color } : undefined}
                  />
                  <span className="truncate text-left">{cert.exam_code || cert.name}</span>
                </button>
              ))}
            </div>
          ))}

          {archivedList.length > 0 && (
            <div className="mb-2">
              <button
                onClick={() => setArchivedOpen(o => !o)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-semibold text-text-muted uppercase tracking-widest hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
              >
                {archivedOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                <Archive size={12} />
                Archived
                <span className="ml-auto text-[10px] bg-bg-elevated px-1.5 py-0.5 rounded-full">{archivedList.length}</span>
              </button>
              {archivedOpen && (
                <div className="mt-1">
                  {archivedList.map(cert => (
                    <button
                      key={cert.id}
                      onClick={() => goToCert(cert.id)}
                      className="flex items-center gap-2.5 w-full px-3 py-3 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-text-muted" style={cert.color ? { backgroundColor: cert.color } : undefined} />
                      <span className="truncate text-left">{cert.exam_code || cert.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => { navigate('/archived'); onClose() }}
                    className="flex items-center gap-2 w-full px-3 py-3 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
                  >
                    <ArchiveRestore size={12} />
                    Manage archived…
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function MoreDrawer({ open, onClose }) {
  const navigate = useNavigate()

  return (
    <>
      {open && <Backdrop onClose={onClose} />}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 bg-bg-surface border-t border-bg-elevated rounded-t-2xl
                    transition-transform duration-300 ease-out
                    ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-bg-elevated" />
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-b border-bg-elevated">
          <span className="text-text-primary font-semibold text-sm">More</span>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-2 py-2 pb-8">
          <button
            onClick={() => { navigate('/system'); onClose() }}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
          >
            <Settings2 size={18} className="text-text-muted" />
            System
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors min-h-[44px]"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default function BottomNav({ onAddCert }) {
  const location = useLocation()
  const [certDrawerOpen, setCertDrawerOpen] = useState(false)
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false)
  const dueCount = useDueCount()

  const pathname = location.pathname
  const isHome = pathname === '/'
  const isCert = pathname.startsWith('/cert/')
  const isReview = pathname === '/review'
  const isCalendar = pathname === '/calendar'
  const isMore = pathname === '/system'

  const tabCls = (active) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] transition-colors ${
      active ? 'text-accent-blue' : 'text-text-muted'
    }`

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-bg-surface border-t border-bg-elevated flex">
        <NavLink to="/" end className={tabCls(isHome)}>
          <House size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        <button
          onClick={() => { setMoreDrawerOpen(false); setCertDrawerOpen(o => !o) }}
          className={tabCls(isCert || certDrawerOpen)}
        >
          <BookOpen size={20} />
          <span className="text-[10px] font-medium">Certs</span>
        </button>

        <NavLink to="/review" className={tabCls(isReview)}>
          <div className="relative">
            <LayersIcon size={20} />
            {dueCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 text-[9px] font-bold bg-accent-blue text-white px-1 rounded-full leading-tight">
                {dueCount > 99 ? '99+' : dueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Review</span>
        </NavLink>

        <NavLink to="/calendar" className={tabCls(isCalendar)}>
          <CalendarDays size={20} />
          <span className="text-[10px] font-medium">Calendar</span>
        </NavLink>

        <button
          onClick={() => { setCertDrawerOpen(false); setMoreDrawerOpen(o => !o) }}
          className={tabCls(isMore || moreDrawerOpen)}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      <CertDrawer
        open={certDrawerOpen}
        onClose={() => setCertDrawerOpen(false)}
        onAddCert={onAddCert}
      />
      <MoreDrawer
        open={moreDrawerOpen}
        onClose={() => setMoreDrawerOpen(false)}
      />
    </>
  )
}
