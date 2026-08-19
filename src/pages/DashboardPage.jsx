import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Clock3, Cloud, Cpu, FileClock, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import JobTable from '../components/JobTable'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../contexts/AuthContext'
import { backend } from '../services/api'

export default function DashboardPage() {
  const { profile, refresh } = useAuth()
  const [jobs, setJobs] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    Promise.all([backend.jobs(), backend.health(), refresh()])
      .then(([jobData, healthData]) => {
        if (!active) return
        setJobs(jobData.jobs || [])
        setHealth(healthData)
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [refresh])

  const completed = jobs.filter((j) => j.status === 'COMPLETED').length
  const activeJob = jobs.find((j) => ['QUEUED', 'RUNNING'].includes(j.status))

  return (
    <div className="page-stack">
      <section className="hero-card dashboard-hero">
        <div>
          <span className="eyebrow">Spatial analysis workspace</span>
          <h1>Ready for your next multiscale model.</h1>
          <p>Configure an MGWR analysis, submit it to the CloudMGWR queue, and track the result in My jobs.</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/new-job"><Plus size={18} /> New MGWR analysis</Link>
            <Link className="secondary-button" to="/jobs">View all jobs <ArrowRight size={17} /></Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="contour contour-a" />
          <div className="contour contour-b" />
          <div className="contour contour-c" />
          <div className="hero-node node-1" />
          <div className="hero-node node-2" />
          <div className="hero-node node-3" />
          <div className="hero-node node-4" />
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><Clock3 size={20} /></div>
          <span>Compute credit</span>
          <strong>{profile?.is_vip ? 'Unlimited' : `${profile?.remaining_minutes ?? '—'} min`}</strong>
          <small>{profile?.is_vip ? 'VIP quota exempt' : 'Normal-user balance'}</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle2 size={20} /></div>
          <span>Completed jobs</span>
          <strong>{completed}</strong>
          <small>{jobs.length} visible in your history</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Cpu size={20} /></div>
          <span>Current job</span>
          <strong>{activeJob ? activeJob.status : 'Idle'}</strong>
          <small>{activeJob ? activeJob.client_filename : 'No active analysis'}</small>
        </div>
        <div className="stat-card">
          <div className="stat-icon violet"><Cloud size={20} /></div>
          <span>Backend</span>
          <strong>{health?.ok ? 'Online' : loading ? 'Checking' : 'Unavailable'}</strong>
          <small>{health?.region || 'us-east-1'}</small>
        </div>
      </section>

      <section className="content-grid dashboard-grid">
        <div className="panel-card span-2">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Activity</span>
              <h2>Recent jobs</h2>
            </div>
            <Link className="text-link" to="/jobs">All jobs <ArrowRight size={16} /></Link>
          </div>
          {loading ? <div className="skeleton-block" /> : <JobTable jobs={jobs.slice(0, 5)} compact />}
        </div>

        <div className="panel-card quick-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Account</span>
              <h2>Access summary</h2>
            </div>
          </div>
          <div className="summary-list">
            <div><span>Plan</span><strong>{profile?.is_vip ? 'VIP' : 'Normal'}</strong></div>
            <div><span>Account</span><strong>{profile?.account_status || '—'}</strong></div>
            <div><span>Jobs submitted</span><strong>{profile?.jobs_run ?? '—'}</strong></div>
            <div><span>Runtime charged</span><strong>{profile?.is_vip ? 'Quota exempt' : `${profile?.total_runtime_minutes ?? 0} min`}</strong></div>
          </div>
          {profile?.current_job_id && (
            <Link className="active-job-banner" to={`/jobs/${profile.current_job_id}`}>
              <FileClock size={18} />
              <span><strong>Active job</strong><small>Open current analysis</small></span>
              <StatusBadge status="RUNNING" />
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}
