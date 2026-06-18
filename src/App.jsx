import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { supabase } from './lib/supabaseClient'
import LoginScreen from './components/auth/LoginScreen'
import FirstRunScreen from './components/shared/FirstRunScreen'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import CertPage from './pages/CertPage'
import ArchivedPage from './pages/ArchivedPage'
import FlashcardReviewPage from './pages/FlashcardReviewPage'
import SystemScreen from './pages/SystemScreen'
import CalendarPage from './pages/CalendarPage'
import NotFound from './pages/NotFound'
import { ToastProvider } from './components/shared/ToastProvider'
import OfflineBanner from './components/shared/OfflineBanner'
import LogSessionModal from './components/shared/LogSessionModal'
import CertFormModal from './components/shared/CertFormModal'
import RescheduleDateModal from './components/shared/RescheduleDateModal'
import ArchiveModal from './components/shared/ArchiveModal'
import { useCertifications } from './hooks/useCertifications'

function TitleUpdater({ certifications }) {
  const location = useLocation()
  useEffect(() => {
    const path = location.pathname
    if (path === '/') {
      document.title = 'Command Center'
    } else if (path === '/archived') {
      document.title = 'Archived — Command Center'
    } else if (path === '/review') {
      document.title = 'Review Due — Command Center'
    } else if (path === '/calendar') {
      document.title = 'Calendar — Command Center'
    } else if (path === '/system') {
      document.title = 'System — Command Center'
    } else if (path.startsWith('/cert/')) {
      const certId = path.replace('/cert/', '')
      const cert = certifications.find(c => c.id === certId)
      document.title = cert ? `${cert.exam_code || cert.name} — Command Center` : 'Command Center'
    } else {
      document.title = 'Command Center'
    }
  }, [location, certifications])
  return null
}

function HelpModal({ open, onClose }) {
  if (!open) return null
  const shortcuts = [
    { key: 'N', desc: 'Add new certification' },
    { key: 'L', desc: 'Log study session (on cert page)' },
    { key: 'E', desc: 'Edit certification (on cert page)' },
    { key: 'A', desc: 'Archive certification (on cert page)' },
    { key: 'Esc', desc: 'Close any open modal' },
    { key: '?', desc: 'Show this help' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-bg-surface border border-bg-elevated rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-text-primary font-semibold mb-4">Keyboard Shortcuts</h2>
        <div className="space-y-2">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-text-muted">{desc}</span>
              <kbd className="text-xs bg-bg-elevated text-text-primary px-2 py-1 rounded border border-bg-elevated font-mono">{key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-5 w-full px-4 py-2 rounded-lg text-sm text-text-muted hover:bg-bg-elevated transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}

function AppRoutes() {
  const [addCertOpen, setAddCertOpen] = useState(false)
  const [logSessionCert, setLogSessionCert] = useState(null)
  const [editCert, setEditCert] = useState(null)
  const [rescheduleCert, setRescheduleCert] = useState(null)
  const [archiveCert, setArchiveCert] = useState(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const { certifications } = useCertifications({ includeArchived: true })
  const location = useLocation()
  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const closeAll = useCallback(() => {
    setLogSessionCert(null); setAddCertOpen(false); setEditCert(null)
    setRescheduleCert(null); setArchiveCert(null); setHelpOpen(false)
  }, [])

  // Derive current cert from URL for page-scoped shortcuts
  const currentCert = (() => {
    const m = location.pathname.match(/^\/cert\/(.+)$/)
    if (!m) return null
    return certifications.find(c => c.id === m[1]) || null
  })()

  // Global keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      const anyModalOpen = addCertOpen || !!logSessionCert || !!editCert || !!rescheduleCert || !!archiveCert || helpOpen
      if (e.key === 'Escape') { closeAll(); return }
      if (anyModalOpen) return
      if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return }
      if (e.key === 'n' || e.key === 'N') { setAddCertOpen(true); return }
      if (currentCert) {
        if (e.key === 'l' || e.key === 'L') { setLogSessionCert(currentCert); return }
        if (e.key === 'e' || e.key === 'E') { setEditCert(currentCert); return }
        if (e.key === 'a' || e.key === 'A') { setArchiveCert(currentCert); return }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [addCertOpen, logSessionCert, editCert, rescheduleCert, archiveCert, helpOpen, closeAll, currentCert])

  return (
    <AppShell onAddCert={() => setAddCertOpen(true)}>
      <TitleUpdater certifications={certifications} />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<Dashboard key={refreshKey} onLogSession={setLogSessionCert} onAddCert={() => setAddCertOpen(true)} />} />
        <Route path="/cert/:certId" element={
          <CertPage key={refreshKey} onLogSession={setLogSessionCert} onEdit={setEditCert} onReschedule={setRescheduleCert} onArchive={setArchiveCert} onRefresh={refresh} />
        } />
        <Route path="/archived" element={<ArchivedPage key={refreshKey} onRestore={refresh} />} />
        <Route path="/review" element={<FlashcardReviewPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/system" element={<SystemScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <LogSessionModal open={!!logSessionCert} cert={logSessionCert} onClose={() => setLogSessionCert(null)} onLogged={refresh} />
      <CertFormModal open={addCertOpen} onClose={() => setAddCertOpen(false)} onSaved={refresh} />
      <CertFormModal open={!!editCert} cert={editCert} onClose={() => setEditCert(null)} onSaved={refresh} />
      <RescheduleDateModal open={!!rescheduleCert} cert={rescheduleCert} onClose={() => setRescheduleCert(null)} onSaved={refresh} />
      <ArchiveModal open={!!archiveCert} cert={archiveCert} onClose={() => setArchiveCert(null)} onArchived={refresh} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AppShell>
  )
}

function AppContent() {
  const { session } = useAuth()
  const [certCount, setCertCount] = useState(undefined)

  useEffect(() => {
    if (!session) return
    supabase
      .from('certifications')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setCertCount(count ?? 0))
      .catch(() => setCertCount(0))
  }, [session])

  if (session === undefined || (session && certCount === undefined)) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <span className="text-text-muted text-sm">Loading…</span>
      </div>
    )
  }

  if (session === null) return <LoginScreen />

  if (certCount === 0) return <FirstRunScreen />

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  )
}
