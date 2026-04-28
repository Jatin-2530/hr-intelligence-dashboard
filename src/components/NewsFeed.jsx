import { useState } from 'react'
import { AlertCircle, RefreshCw, BookOpen, CalendarDays, Clock } from 'lucide-react'
import NewsCard from './NewsCard.jsx'
import ArticleModal from './ArticleModal.jsx'
import { CATEGORIES } from '../App.jsx'

function fmtDay(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yest)  return 'Yesterday'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })
}

export default function NewsFeed({
  articles, activeTab, savedIds, onToggleSave,
  loading, loadPhase, error, onRetry,
  searchQuery, viewDate, setViewDate, pastDays
}) {
  const [openArticle, setOpenArticle] = useState(null)

  const cat = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0]

  // Title
  let title = activeTab === 'all' ? 'Daily Intelligence Brief'
    : activeTab === 'saved' ? 'Saved Articles'
    : cat.label
  let subtitle = viewDate === new Date().toISOString().split('T')[0]
    ? `${articles.length} articles · ${fmtDay(viewDate)}`
    : `${articles.length} articles · Archive — ${fmtDay(viewDate)}`

  if (loading) return (
    <div className="state-screen">
      <div className="loading-spinner" />
      <div className="loading-bar-wrap"><div className="loading-bar" /></div>
      <div className="state-title">Building Your Daily Brief</div>
      <div className="state-subtitle">{loadPhase}</div>
    </div>
  )

  if (error) return (
    <div className="state-screen">
      <AlertCircle size={44} color="var(--accent)" />
      <div className="state-title">Couldn't load articles</div>
      <div className="state-subtitle">{error}</div>
      <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={13} /> Retry</button>
    </div>
  )

  if (articles.length === 0 && !loading) return (
    <div className="state-screen">
      <BookOpen size={44} color="var(--border-strong)" />
      <div className="state-title">{searchQuery ? `No results for "${searchQuery}"` : 'No articles here'}</div>
      <div className="state-subtitle">
        {searchQuery ? 'Try a different keyword.' : 'Click refresh to load your daily brief.'}
      </div>
      {!searchQuery && <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={13} /> Load News</button>}
    </div>
  )

  // Group by category when showing all
  const catGroups = activeTab === 'all' || activeTab === 'saved'
    ? CATEGORIES.filter(c => c.id !== 'all').map(c => ({
        ...c,
        articles: articles.filter(a => a.category === c.id)
      })).filter(c => c.articles.length > 0)
    : [{ ...cat, articles }]

  return (
    <>
      {/* Archive bar */}
      <div className="archive-bar">
        {pastDays.map((d, i) => (
          <button
            key={d}
            className={`archive-day-btn ${viewDate === d ? 'active' : ''}`}
            onClick={() => setViewDate(d)}
          >
            {i === 0 ? 'Today' : i === 1 ? 'Yesterday' : new Date(d).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
          </button>
        ))}
      </div>

      {/* Page masthead */}
      <div className="page-masthead">
        <div className="page-masthead-left">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {/* News sections */}
      <div className="news-wrapper">
        {catGroups.map(group => (
          <section key={group.id} className="news-section">
            <div className="section-masthead">
              <span className="sec-badge" style={{
                background: `${group.color}18`,
                color: group.color,
              }}>
                {group.id === 'LD' ? 'L&D' : group.id}
              </span>
              <span className="sec-label">{group.label}</span>
              <span className="sec-count">{group.articles.length} articles</span>
            </div>

            <div className="newspaper-grid">
              {group.articles.map((a, i) => (
                <NewsCard
                  key={a.id}
                  article={a}
                  isSaved={savedIds.includes(a.id)}
                  onToggleSave={onToggleSave}
                  onOpen={setOpenArticle}
                  searchQuery={searchQuery}
                  featured={i === 0}
                  idx={i}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Article modal */}
      {openArticle && (
        <ArticleModal
          article={openArticle}
          isSaved={savedIds.includes(openArticle.id)}
          onToggleSave={onToggleSave}
          onClose={() => setOpenArticle(null)}
        />
      )}
    </>
  )
}
