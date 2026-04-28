import { Sun, Moon, RefreshCw, Search, BookMarked } from 'lucide-react'

export default function Header({ theme, setTheme, searchQuery, setSearchQuery, onRefresh, loading, lastRefresh }) {
  const refreshLabel = lastRefresh
    ? lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : 'Never'

  return (
    <header className="header">
      <div className="header-logo">
        <span className="logo-dot" />
        <span>HR Intel</span>
      </div>

      <div className="header-search">
        <Search size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Search news & notes…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="header-actions">
        <div className="header-meta">
          <RefreshCw size={10} />
          <span>{refreshLabel}</span>
        </div>

        <button
          className={`icon-btn ${loading ? 'spinning' : ''}`}
          onClick={onRefresh}
          title="Refresh news"
          disabled={loading}
        >
          <RefreshCw size={15} />
        </button>

        <button
          className="icon-btn"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  )
}
