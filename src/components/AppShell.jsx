import { Activity, BookOpen, CloudCog, Gauge, LogOut, PlusCircle, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Brand from './Brand'

export default function AppShell() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/auth')
  }

  const initials = (profile?.email || 'C').slice(0, 1).toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand compact />
        <nav className="sidebar-nav">
          <NavLink to="/" end><Gauge size={19} /> <span>Dashboard</span></NavLink>
          <NavLink to="/new-job"><PlusCircle size={19} /> <span>New analysis</span></NavLink>
          <NavLink to="/jobs"><Activity size={19} /> <span>My jobs</span></NavLink>
          <NavLink to="/help"><BookOpen size={19} /> <span>Help</span></NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="compute-card">
            <div className="compute-card-title"><CloudCog size={17} /> Compute access</div>
            {profile?.is_vip ? (
              <>
                <strong>VIP</strong>
                <span>Quota exempt</span>
              </>
            ) : (
              <>
                <strong>{profile?.remaining_minutes ?? '—'} min</strong>
                <span>remaining</span>
              </>
            )}
          </div>
          <button className="profile-button" type="button" onClick={handleLogout}>
            <span className="avatar">{initials}</span>
            <span className="profile-copy">
              <strong>{profile?.is_vip ? 'VIP account' : 'CloudMGWR user'}</strong>
              <small>{profile?.email || 'Signed in'}</small>
            </span>
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">Cloud compute workspace</span>
          </div>
          <div className="topbar-actions">
            <div className="live-indicator"><span /> Backend connected</div>
            <div className="topbar-user"><UserRound size={17} /> {profile?.email || 'Account'}</div>
          </div>
        </header>
        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
