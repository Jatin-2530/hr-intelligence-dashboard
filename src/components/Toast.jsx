import { CheckCircle, Info, XCircle } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={15} color="#3FB950" />,
  info:    <Info size={15} color="var(--accent)" />,
  error:   <XCircle size={15} color="#FF7B72" />,
}

export default function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {ICONS[t.type] || ICONS.info}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
