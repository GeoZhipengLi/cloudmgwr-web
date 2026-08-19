export function formatBytes(bytes) {
  const n = Number(bytes || 0)
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1)
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export function formatDuration(seconds) {
  const n = Number(seconds)
  if (!Number.isFinite(n)) return '—'
  if (n < 60) return `${n.toFixed(1)} s`
  if (n < 3600) return `${(n / 60).toFixed(1)} min`
  return `${(n / 3600).toFixed(2)} h`
}

export function shortId(value) {
  if (!value) return '—'
  if (value.length <= 20) return value
  return `${value.slice(0, 10)}…${value.slice(-7)}`
}
