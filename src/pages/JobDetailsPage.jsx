import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock, Download, FileText, RefreshCw, Server, Square, TriangleAlert } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'
import Toast from '../components/Toast'
import { backend } from '../services/api'
import { formatBytes, formatDate, formatDuration } from '../utils/format'

const TERMINAL = new Set(['COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELLED', 'INTERRUPTED'])

const PUBLIC_RESULTS = [
  {
    name: 'output/Local_results.csv',
    label: 'Local_results.csv',
    description: 'Local estimates, fitted values, residuals, inference, and optional local diagnostics.',
  },
  {
    name: 'output/Summary.txt',
    label: 'Summary.txt',
    description: 'Model settings, global regression results, MGWR results, and overall diagnostics.',
  },
]

export default function JobDetailsPage() {
  const { jobId } = useParams()
  const [job, setJob] = useState(null)
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await backend.job(jobId)
      setJob(data.job)
      if (data.job?.status === 'COMPLETED') {
        const artifactData = await backend.artifacts(jobId)
        setArtifacts(artifactData.artifacts || [])
      } else {
        setArtifacts([])
      }
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!job || TERMINAL.has(job.status)) return undefined
    const timer = window.setInterval(load, 5000)
    return () => window.clearInterval(timer)
  }, [job, load])

  const publicFiles = useMemo(() => {
    const byName = new Map(artifacts.map((artifact) => [artifact.name, artifact]))
    return PUBLIC_RESULTS.map((item) => ({
      ...item,
      artifact: byName.get(item.name) || null,
    }))
  }, [artifacts])

  async function download(name) {
    try {
      const data = await backend.artifactUrl(jobId, name)
      const a = document.createElement('a')
      a.href = data.download_url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    }
  }

  async function stopJob() {
    if (!job || !['QUEUED', 'RUNNING'].includes(job.status)) return
    const confirmed = window.confirm(
      'Stop this job?\n\nA running MGWR process will be terminated. Normal users are charged for compute time already used. This action cannot be undone.',
    )
    if (!confirmed) return

    setCancelBusy(true)
    try {
      const data = await backend.cancelJob(jobId)
      if (data.job) setJob(data.job)
      setArtifacts([])
      setToast({ type: 'success', message: data.message || 'Stop request accepted.' })
      window.setTimeout(load, 700)
    } catch (error) {
      setToast({ type: 'error', message: error.message })
    } finally {
      setCancelBusy(false)
    }
  }

  if (loading) return <div className="panel-card"><div className="skeleton-block tall" /></div>
  if (!job) return <div className="panel-card empty-state"><TriangleAlert /><strong>Job not found</strong><Link className="text-link" to="/jobs">Return to My Jobs</Link></div>

  const active = ['QUEUED', 'RUNNING', 'CANCEL_REQUESTED'].includes(job.status)
  const cancellable = ['QUEUED', 'RUNNING'].includes(job.status)
  const stopping = job.status === 'CANCEL_REQUESTED'
  const completed = job.status === 'COMPLETED'
  const availableCount = publicFiles.filter((item) => item.artifact).length

  const progressTitle = job.status === 'QUEUED'
    ? 'Waiting for compute'
    : stopping
      ? 'Stopping job'
      : 'MGWR is running'

  const progressSubtitle = stopping
    ? 'The stop request has been accepted. The compute worker is terminating the MGWR process.'
    : 'This page refreshes automatically every 5 seconds.'

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <Link className="back-link" to="/jobs"><ArrowLeft size={16} /> My jobs</Link>
          <div className="job-title-line"><h1>Job details</h1><StatusBadge status={job.status} /></div>
          <code className="job-full-id">{job.job_id}</code>
        </div>

        <div className="job-actions">
          {(cancellable || stopping) && (
            <button
              className="danger-button"
              type="button"
              onClick={stopJob}
              disabled={!cancellable || cancelBusy}
            >
              <Square size={16} fill="currentColor" />
              {stopping ? 'Stopping…' : cancelBusy ? 'Requesting…' : 'Stop job'}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={load}>
            <RefreshCw size={17} /> Refresh
          </button>
        </div>
      </div>

      {active && (
        <div className={`progress-card ${stopping ? 'progress-stopping' : ''}`}>
          <div className="pulse-dot" />
          <div><strong>{progressTitle}</strong><span>{progressSubtitle}</span></div>
          <div className="progress-line"><span /></div>
        </div>
      )}

      {job.status === 'CANCELLED' && (
        <div className="cancelled-card">
          <Square size={18} fill="currentColor" />
          <div>
            <strong>Job stopped</strong>
            <p>{job.status_message || 'This job was stopped by the user.'}</p>
          </div>
        </div>
      )}

      {job.status === 'INTERRUPTED' && (
        <div className="error-card">
          <TriangleAlert size={21} />
          <div>
            <strong>Job interrupted</strong>
            <p>{job.status_message || job.interruption_reason || 'The compute worker became unavailable before this job completed.'}</p>
          </div>
        </div>
      )}

      {job.error_message && !['CANCELLED', 'INTERRUPTED'].includes(job.status) && (
        <div className="error-card"><TriangleAlert size={21} /><div><strong>Model did not complete</strong><p>{job.error_message}</p></div></div>
      )}

      <section className="content-grid job-detail-grid">
        <div className="panel-card">
          <div className="panel-heading"><div><h2>Execution</h2></div></div>
          <div className="detail-list">
            <div><span><FileText size={16} /> Input file</span><strong>{job.client_filename || 'input.csv'}</strong></div>
            <div><span><Clock size={16} /> Runtime</span><strong>{formatDuration(job.runtime_seconds)}</strong></div>
            <div><span><Server size={16} /> Worker</span><strong>{job.ec2_worker_id || 'Waiting'}</strong></div>
            <div><span>Charged time</span><strong>{job.quota_exempt ? 'Quota exempt' : job.charged_runtime_minutes != null ? `${job.charged_runtime_minutes} min` : '—'}</strong></div>
          </div>
        </div>
        <div className="panel-card">
          <div className="panel-heading"><div><h2>Job lifecycle</h2></div></div>
          <div className="timeline">
            <div className="timeline-item done"><span /><div><strong>Submitted</strong><small>{formatDate(job.created_at)}</small></div></div>
            <div className={`timeline-item ${job.started_at ? 'done' : ''}`}><span /><div><strong>Worker started</strong><small>{formatDate(job.started_at)}</small></div></div>
            <div className={`timeline-item ${job.finished_at ? 'done' : ''}`}><span /><div><strong>Terminal state</strong><small>{job.finished_at ? `${job.status} · ${formatDate(job.finished_at)}` : '—'}</small></div></div>
            <div className="timeline-item"><span /><div><strong>Retention expiry</strong><small>{formatDate(job.expires_at)}</small></div></div>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-heading">
          <div><h2>Results & Logs</h2></div>
          <span className="muted-copy">
            {completed
              ? `${availableCount} of 2 result files available`
              : active
                ? 'Available after the run finishes'
                : 'No result files'}
          </span>
        </div>
        <div className="artifact-grid">
          {publicFiles.map((item) => (
            <button
              type="button"
              className="artifact-card"
              key={item.name}
              disabled={!item.artifact}
              onClick={() => item.artifact && download(item.name)}
            >
              <div className="artifact-icon"><FileText size={20} /></div>
              <div>
                <strong>{item.label}</strong>
                <span>
                  {item.artifact
                    ? `${item.description} · ${formatBytes(item.artifact.size_bytes)}`
                    : item.description}
                </span>
              </div>
              <Download size={18} />
            </button>
          ))}
        </div>
      </section>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
