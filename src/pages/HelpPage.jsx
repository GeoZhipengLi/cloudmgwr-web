import { Database, Gauge, LockKeyhole, Waypoints } from 'lucide-react'

export default function HelpPage() {
  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Documentation</span>
          <h1>Using CloudMGWR</h1>
        </div>
      </div>

      <section className="help-grid">
        <article className="panel-card help-card"><Database /><h2>1. Prepare a CSV</h2><p>Use one header row. Coordinate, dependent, and explanatory columns must have distinct names. An ID column is optional.</p></article>
        <article className="panel-card help-card"><Waypoints /><h2>2. Assign variables</h2><p>Choose X/Y coordinate columns, one dependent variable, and one or more explanatory variables. Projected and spherical coordinates are supported.</p></article>
        <article className="panel-card help-card"><Gauge /><h2>3. Configure MGWR</h2><p>Select adaptive or fixed bandwidths, a spatial kernel, search criterion, and advanced backfitting, inference, and diagnostic settings.</p></article>
        <article className="panel-card help-card"><LockKeyhole /><h2>4. Submit securely</h2><p>Your browser receives a temporary S3 upload URL. User ID, job ID, quota status, and runtime limits are trusted backend values rather than browser inputs.</p></article>
      </section>
    </div>
  )
}
