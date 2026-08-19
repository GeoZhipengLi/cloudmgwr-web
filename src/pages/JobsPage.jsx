import { useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw, Search } from 'lucide-react'
import JobTable from '../components/JobTable'
import { backend } from '../services/api'

export default function JobsPage() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')

  async function load() {
    setLoading(true)
    try {
      const data = await backend.jobs()
      setJobs(data.jobs || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => jobs.filter((job) => {
    const statusOk = filter === 'ALL' || job.status === filter
    const q = query.trim().toLowerCase()
    const searchOk = !q || [job.job_id, job.client_filename, job.status].some((v) => String(v || '').toLowerCase().includes(q))
    return statusOk && searchOk
  }), [jobs, query, filter])

  return (
    <div className="page-stack">
      <div className="page-heading-row">
        <div>
          <span className="eyebrow">Analysis history</span>
          <h1>My jobs</h1>
        </div>
        <button className="secondary-button" type="button" onClick={load} disabled={loading}>
          <RefreshCw size={17} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="panel-card">
        <div className="toolbar">
          <label className="search-box"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search job ID or filename" /></label>
          <label className="select-inline"><Filter size={16} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="ALL">All statuses</option><option>QUEUED</option><option>RUNNING</option><option>COMPLETED</option><option>FAILED</option><option>TIMEOUT</option><option>CANCELLED</option></select></label>
        </div>
        {loading ? <div className="skeleton-block tall" /> : <JobTable jobs={filtered} />}
      </div>
    </div>
  )
}
