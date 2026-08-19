export default function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div>
        <div className="brand-name">CloudMGWR</div>
        {!compact && <div className="brand-subtitle">Spatial modeling, without the workstation.</div>}
      </div>
    </div>
  )
}
