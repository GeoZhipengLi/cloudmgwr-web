import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react'

export default function Toast({ toast, onClose }) {
  if (!toast) return null
  const Icon = toast.type === 'error' ? CircleAlert : toast.type === 'success' ? CheckCircle2 : Info
  return (
    <div className={`toast toast-${toast.type || 'info'}`} role="status">
      <Icon size={19} />
      <div className="toast-content">
        <strong>{toast.title || (toast.type === 'error' ? 'Something went wrong' : 'CloudMGWR')}</strong>
        {toast.message && <span>{toast.message}</span>}
      </div>
      <button className="icon-button" type="button" onClick={onClose} aria-label="Close notification">
        <X size={17} />
      </button>
    </div>
  )
}
