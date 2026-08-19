import { useMemo, useState } from 'react'
import { ArrowRight, Check, KeyRound, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import Brand from '../components/Brand'
import Toast from '../components/Toast'
import { useAuth } from '../contexts/AuthContext'
import {
  confirmAccount,
  createAccount,
  finishPasswordReset,
  resendConfirmation,
  signInWithEmail,
  startPasswordReset,
} from '../services/auth'

export default function AuthPage() {
  const { signedIn, refresh } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)

  const titles = useMemo(
    () => ({
      signin: ['Welcome back', 'Sign in to launch and manage MGWR analyses.'],
      signup: ['Create your account', 'Email verification is required before first use.'],
      confirm: ['Verify your email', `Enter the confirmation code sent to ${email || 'your inbox'}.`],
      forgot: ['Reset your password', 'We will send a verification code to your email.'],
      reset: ['Choose a new password', `Enter the code sent to ${email || 'your inbox'}.`],
    }),
    [email],
  )

  if (signedIn) return <Navigate to="/" replace />

  async function run(task) {
    setBusy(true)
    setToast(null)
    try {
      await task()
    } catch (error) {
      setToast({ type: 'error', title: 'Request failed', message: error.message || String(error) })
    } finally {
      setBusy(false)
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (!email.trim()) return setToast({ type: 'error', message: 'Enter your email address.' })

    if (mode === 'signin') {
      return run(async () => {
        await signInWithEmail(email, password)
        await refresh()
        navigate('/')
      })
    }

    if (mode === 'signup') {
      return run(async () => {
        const result = await createAccount(email, password)
        if (result.isSignUpComplete) {
          setMode('signin')
          setToast({ type: 'success', message: 'Account created. You can sign in now.' })
        } else {
          setMode('confirm')
          setToast({ type: 'success', message: 'Confirmation code sent.' })
        }
      })
    }

    if (mode === 'confirm') {
      return run(async () => {
        await confirmAccount(email, code)
        setMode('signin')
        setPassword('')
        setCode('')
        setToast({ type: 'success', message: 'Email verified. Sign in to continue.' })
      })
    }

    if (mode === 'forgot') {
      return run(async () => {
        await startPasswordReset(email)
        setMode('reset')
        setToast({ type: 'success', message: 'Password reset code sent.' })
      })
    }

    if (mode === 'reset') {
      return run(async () => {
        await finishPasswordReset(email, code, newPassword)
        setMode('signin')
        setNewPassword('')
        setCode('')
        setToast({ type: 'success', message: 'Password updated. You can sign in now.' })
      })
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-gradient" />
        <Brand />
        <div className="auth-copy">
          <span className="hero-kicker">Multiscale geographically weighted regression in the cloud</span>
          <h1>Run MGWR without moving your workflow to a workstation.</h1>
          <p>
            Upload a CSV, map coordinates and variables, configure bandwidth search and inference,
            then let CloudMGWR run the model on managed AWS compute.
          </p>
        </div>
        <div className="auth-points">
          <div><ShieldCheck size={19} /><span>Data privacy protection</span></div>
          <div><RefreshCw size={19} /><span>Queued compute with automatic worker startup</span></div>
          <div><Check size={19} /><span>Two clear result files: local results and model summary</span></div>
        </div>
        <div className="spatial-grid" aria-hidden="true">
          {Array.from({ length: 48 }).map((_, i) => <span key={i} style={{ '--i': i }} />)}
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-icon">{mode === 'confirm' || mode === 'reset' ? <KeyRound /> : <Mail />}</div>
          <h2>{titles[mode][0]}</h2>
          <p>{titles[mode][1]}</p>

          <form onSubmit={submit}>
            <label className="field">
              <span className="field-label">Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>

            {(mode === 'signin' || mode === 'signup') && (
              <label className="field">
                <span className="field-label">Password</span>
                <input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                {mode === 'signup' && <span className="field-hint">Use the password rules configured in your Cognito user pool.</span>}
              </label>
            )}

            {(mode === 'confirm' || mode === 'reset') && (
              <label className="field">
                <span className="field-label">Verification code</span>
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  required
                />
              </label>
            )}

            {mode === 'reset' && (
              <label className="field">
                <span className="field-label">New password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Choose a new password"
                  required
                />
              </label>
            )}

            <button className="primary-button auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="mini-spinner" /> : null}
              {mode === 'signin' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'confirm' && 'Verify email'}
              {mode === 'forgot' && 'Send reset code'}
              {mode === 'reset' && 'Update password'}
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-links">
            {mode === 'signin' && (
              <>
                <button type="button" onClick={() => setMode('forgot')}>Forgot password?</button>
                <span />
                <button type="button" onClick={() => setMode('signup')}>Create account</button>
              </>
            )}
            {mode === 'signup' && <button type="button" onClick={() => setMode('signin')}>Already have an account? Sign in</button>}
            {mode === 'confirm' && (
              <>
                <button type="button" onClick={() => run(() => resendConfirmation(email))}>Resend code</button>
                <span />
                <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>
              </>
            )}
            {(mode === 'forgot' || mode === 'reset') && <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
          </div>
        </div>
        <p className="auth-footer">CloudMGWR · Secure Cognito authentication · AWS-hosted compute</p>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
