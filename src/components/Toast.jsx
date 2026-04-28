import { CheckCircle, Info, XCircle } from 'lucide-react'
const ICONS = { success:<CheckCircle size={14}/>, info:<Info size={14}/>, error:<XCircle size={14}/> }
export default function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t=>(
        <div key={t.id} className={`toast ${t.type}`}>
          {ICONS[t.type]||ICONS.info}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}
