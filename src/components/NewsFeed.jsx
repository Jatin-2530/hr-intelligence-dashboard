import { AlertCircle, RefreshCw, Clock, BookOpen } from 'lucide-react'
import NewsCard from './NewsCard.jsx'
import { CATEGORIES } from '../App.jsx'

const DATE_FILTERS = [
  { id: 'today',  label: 'Today' },
  { id: '3days',  label: 'Last 3 days' },
  { id: '7days',  label: 'Last 7 days' },
]

function highlight(text, query) {
  if (!query || !query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === query.toLowerCase()
      ? <mark key={i}>{p}</mark>
      : p
  )
}

export default function NewsFeed({
  articles, activeTab, savedIds, onToggleSave,
  loading, loadPhase, error, onRetry,
  searchQuery, dateFilter, setDateFilter, counts
}) {
  const cat = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0]

  // Derive title and subtitle
  let title = cat.label
  let subtitle = ''
  if (activeTab === 'all') {
    subtitle = `${articles.length} articles across all domains`
  } else if (activeTab === 'saved') {
    title = 'Saved Articles'
    subtitle = `${articles.length} bookmarked articles`
  } else {
    subtitle = `${articles.length} articles in this domain`
  }

  if (loading) {
    return (
      <div className="state-screen">
        <div className="loading-spinner" />
        <div className="loading-bar-wrap">
          <div className="loading-bar" />
        </div>
        <h3>Building Your Daily Brief</h3>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{loadPhase}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="state-screen">
        <AlertCircle size={40} color="#FF7B72" />
        <h3>Couldn't load news</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={14} /> Try Again
        </button>
      </div>
    )
  }

  if (articles.length === 0 && searchQuery) {
    return (
      <div className="state-screen">
        <BookOpen size={40} color="var(--text-muted)" />
        <h3>No results for "{searchQuery}"</h3>
        <p>Try a different keyword or clear the search.</p>
      </div>
    )
  }

  if (articles.length === 0) {
    return (
      <div className="state-screen">
        <BookOpen size={40} color="var(--text-muted)" />
        <h3>No articles here yet</h3>
        <p>Click refresh to load today's HR intelligence brief.</p>
        <button className="btn btn-primary" onClick={onRetry}>
          <RefreshCw size={14} /> Load News
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="filter-bar">
          <Clock size={13} color="var(--text-muted)" />
          {DATE_FILTERS.map(f => (
            <button
              key={f.id}
              className={`filter-chip ${dateFilter === f.id ? 'active' : ''}`}
              onClick={() => setDateFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'all' ? (
        /* Group by category */
        CATEGORIES.filter(c => c.id !== 'all').map(cat => {
          const catArticles = articles.filter(a => a.category === cat.id)
          if (catArticles.length === 0) return null
          return (
            <section key={cat.id}>
              <div className="section-header">
                <h2 className="section-title">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                  {cat.label}
                  <span className="section-count">{catArticles.length}</span>
                </h2>
              </div>
              <div className="news-grid">
                {catArticles.map((a, i) => (
                  <NewsCard
                    key={a.id}
                    article={a}
                    isSaved={savedIds.includes(a.id)}
                    onToggleSave={onToggleSave}
                    searchQuery={searchQuery}
                    style={{ animationDelay: `${i * 40}ms` }}
                  />
                ))}
              </div>
            </section>
          )
        })
      ) : (
        <div className="news-grid">
          {articles.map((a, i) => (
            <NewsCard
              key={a.id}
              article={a}
              isSaved={savedIds.includes(a.id)}
              onToggleSave={onToggleSave}
              searchQuery={searchQuery}
              style={{ animationDelay: `${i * 40}ms` }}
            />
          ))}
        </div>
      )}
    </>
  )
}
