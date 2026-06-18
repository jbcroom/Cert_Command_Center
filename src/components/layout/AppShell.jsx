import { useState } from 'react'
import Sidebar from './Sidebar'

export default function AppShell({ children, onAddCert }) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Sidebar onAddCert={onAddCert} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
