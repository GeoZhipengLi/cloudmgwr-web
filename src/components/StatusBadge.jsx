const LABELS = {
  CANCEL_REQUESTED: 'STOPPING',
  INTERRUPTED: 'INTERRUPTED',
}

export default function StatusBadge({ status }) {
  const value = String(status || 'UNKNOWN').toUpperCase()
  const label = LABELS[value] || value
  return (
    <span
      className={`status-badge status-${value.toLowerCase()}`}
      title={value === label ? undefined : value}
    >
      {label}
    </span>
  )
}
