import { Terminal, BookOpen, ArrowRight } from 'lucide-react'

export default function FirstRunScreen() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="bg-bg-surface border border-bg-elevated rounded-2xl shadow-2xl p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <BookOpen size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-text-primary font-semibold text-lg">Welcome to Cert Command Center</h1>
              <p className="text-text-muted text-sm">Setup isn't complete yet</p>
            </div>
          </div>

          <p className="text-text-secondary text-sm mb-6">
            Your app is deployed, but the database hasn't been initialized.
            Run the setup wizard from your terminal to create the database schema,
            load content banks, and create your account.
          </p>

          {/* Command block */}
          <div className="bg-bg-primary border border-bg-elevated rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={14} className="text-text-muted" />
              <span className="text-text-muted text-xs font-mono">Terminal</span>
            </div>
            <code className="text-blue-400 font-mono text-sm">npm run setup</code>
          </div>

          <p className="text-text-muted text-sm mb-6">
            Then reload this page. Setup takes about 2 minutes.
          </p>

          {/* Docs link */}
          <a
            href="https://github.com/YOUR_USERNAME/cert-command-center/blob/main/docs/installation.md"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <ArrowRight size={14} />
            Full installation guide (docs/installation.md)
          </a>
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          Already ran setup?{' '}
          <button
            onClick={() => window.location.reload()}
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Reload the page
          </button>
        </p>
      </div>
    </div>
  )
}
