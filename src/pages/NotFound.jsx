import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <p className="text-4xl font-bold font-mono-data text-text-muted">404</p>
      <p className="text-text-muted text-sm">Page not found.</p>
      <Link to="/" className="text-accent-blue text-sm hover:underline">
        Back to Dashboard
      </Link>
    </div>
  )
}
