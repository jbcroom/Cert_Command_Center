export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && <Icon size={32} className="text-text-muted opacity-40" />}
      <p className="text-text-primary font-medium">{title}</p>
      {description && <p className="text-text-muted text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
