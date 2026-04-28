import { Sun, Moon, RefreshCw, Search, KeyRound, Clock } from 'lucide-react'

function fmtTime(s) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) return `${h}h ${m.toString().padStart(2,'0')}m`
  return `${m.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`
}

export default function Header({ theme, setTheme, searchQuery, setSearchQuery, onRefresh, loading, lastRefresh, onClearKey, sessionSec }) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })

  return (
    <header className="header">
      <div className="header-logo">
        <span className="logo-name">HR Intel</span>
        <span className="logo-tagline">Daily HR Intelligence</span>
      </div>

      <div className="header-divider" />
      <span className="header-date-strip">{today}</span>

      <div className="header-search">
        <Search size={13} className="search-icon" />
        <input
          type="text" placeholder="Search across all articles & notes…"
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="header-right">
        <div className="time-tracker">
          <Clock size={11} color="var(--accent-light)" />
          <span className="tt-label">Today</span>
          <span className="tt-value">{fmtTime(sessionSec)}</span>
        </div>

        <button className={`hdr-btn ${loading ? 'spinning' : ''}`} onClick={onRefresh} title="Refresh" disabled={loading}>
          <RefreshCw size={14} />
        </button>
        <button className="hdr-btn" onClick={() => setTheme(t => t==='dark'?'light':'dark')} title="Toggle theme">
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="hdr-btn" onClick={onClearKey} title="Change API key">
          <KeyRound size={14} />
        </button>
      </div>
    </header>
  )
}
