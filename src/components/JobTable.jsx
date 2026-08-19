import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { formatDate, formatDuration, shortId } from '../utils/format'

export default function JobTable({ jobs = [], compact = false }) {
  if (!jobs.length) {
    return (
      <div className="empty-state small-empty">
        <div className="empty-orb" />
        <strong>No jobs yet</strong>
        <span>Your analyses will appear here.</span>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="jobs-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Status</th>
            {!compact && <th>File</th>}
            <th>Runtime</th>
            <th>Created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.job_id}>
              <td><code title={job.job_id}>{shortId(job.job_id)}</code></td>
              <td><StatusBadge status={job.status} /></td>
              {!compact && <td className="muted-cell">{job.client_filename || 'input.csv'}</td>}
              <td>{formatDuration(job.runtime_seconds)}</td>
              <td className="muted-cell">{formatDate(job.created_at)}</td>
              <td>
                <Link className="table-link" to={`/jobs/${job.job_id}`} aria-label={`Open ${job.job_id}`}>
                  <ArrowRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
