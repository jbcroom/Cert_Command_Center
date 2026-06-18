import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppShell({ children, onAddCert }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar onAddCert={onAddCert} />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
      <BottomNav onAddCert={onAddCert} />
    </div>
  )
}
