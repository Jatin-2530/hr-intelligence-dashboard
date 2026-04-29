import { useState } from 'react'
import { AlertCircle, RefreshCw, BookOpen, Loader } from 'lucide-react'
import NewsCard from './NewsCard.jsx'
import ArticleModal from './ArticleModal.jsx'
import { CATEGORIES } from '../App.jsx'

function fmtDay(dateStr) {
  const today = new Date().toISOString().split('T')[0]
  const yest  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yest)  return 'Yesterday'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', month:'short', day:'numeric'
  })
}

export default function NewsFeed({
  articles, activeTab, savedIds, onToggleSave,
  loading, error, onRetry,
  searchQuery, viewDate, setViewDate, pastDays
}) {
  const [openArticle, setOpenArticle] = useState(null)
  const cat = CATEGORIES.find(c => c.id === activeTab) || CATEGORIES[0]

  const title = activeTab === 'all' ? 'Daily Intelligence Brief'
    : activeTab === 'saved' ? 'Saved Articles'
    : cat.label

  const subtitle = `${articles.length} articles · ${fmtDay(viewDate)}`

  // Group articles by category
  const catGroups = (activeTab === 'all' || activeTab === 'saved')
    ? CATEGORIES.filter(c => c.id !== 'all').map(c => ({
        ...c, articles: articles.filter(a => a.category === c.id)
      })).filter(c => c.articles.length > 0)
    : [{ ...cat, articles }]

  return (
    <>
      {/* ── Archive date bar — always visible ── */}
      <div className="archive-bar">
        {pastDays.map((d, i) => (
          <button
            key={d}
            className={`archive-day-btn ${viewDate === d ? 'active' : ''}`}
            onClick={() => setViewDate(d)}
            disabled={loading && viewDate === d}
          >
            {i === 0 ? 'Today'
              : i === 1 ? 'Yesterday'
              : new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })}
            {loading && viewDate === d && (
              <span style={{ marginLeft:4, display:'inline-flex', verticalAlign:'middle' }}>
                <Loader size={9} style={{ animation:'spin 1s linear infinite' }} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Page masthead ── */}
      <div className="page-masthead">
        <div className="page-masthead-left">
          <h1>{title}</h1>
          <p>{loading ? 'Fetching articles from Gemini…' : subtitle}</p>
        </div>
      </div>

      {/* ── Loading state — inline, not full-screen ── */}
      {loading && (
        <div style={{ padding:'60px 28px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
          <div className="loading-spinner" />
          <div className="loading-bar-wrap"><div className="loading-bar" /></div>
          <div className="state-title">Building {fmtDay(viewDate)}'s Brief</div>
          <div className="state-subtitle">Curating 48 articles across 12 HR domains…</div>
        </div>
      )}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="state-screen">
          <AlertCircle size={44} color="var(--accent)" />
          <div className="state-title">Couldn't load articles</div>
          <div className="state-subtitle">{error}</div>
          <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={13}/> Retry</button>
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && articles.length === 0 && (
        <div className="state-screen">
          <BookOpen size={44} color="var(--border-strong)" />
          <div className="state-title">
            {searchQuery ? `No results for "${searchQuery}"` : `No articles for ${fmtDay(viewDate)}`}
          </div>
          <div className="state-subtitle">
            {searchQuery ? 'Try a different keyword.' : 'Click refresh to fetch this day\'s brief.'}
          </div>
          {!searchQuery && (
            <button className="btn btn-primary" onClick={onRetry}><RefreshCw size={13}/> Load Articles</button>
          )}
        </div>
      )}

      {/* ── News sections — shown even while loading if we have cached data ── */}
      {!loading && !error && articles.length > 0 && (
        <div className="news-wrapper">
          {catGroups.map(group => (
            <section key={group.id} className="news-section">
              <div className="section-masthead">
                <span className="sec-badge" style={{ background:`${group.color}18`, color:group.color }}>
                  {CAT_SHORT_MAP[group.id] || group.id}
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
      )}

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

const CAT_SHORT_MAP = {
  TA:'TA', HRBP:'HRBP', MIS:'MIS', LD:'L&D', RR:'R&R',
  DEI:'DEI', COMP:'COMP', WELL:'WELL', TECH:'TECH',
  LEAD:'LEAD', GLOB:'GLOB', CAREER:'CAREER',
}
