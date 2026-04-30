import { useState } from 'react'
import { AlertCircle, RefreshCw, BookOpen, Loader } from 'lucide-react'
import LoadingBar from './LoadingBar.jsx'
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
      {loading && <LoadingBar dateLabel={fmtDay(viewDate)} />}

      {/* ── Error state ── */}
      {!loading && error && (
        <div className="state-screen" style={{ maxWidth: 580, margin: '0 auto' }}>
          <AlertCircle size={44} color="var(--accent)" />
          <div className="state-title">Couldn't load articles</div>

          {/* Human-readable reason */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            width: '100%',
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
              What went wrong
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
              lineHeight: 1.7, wordBreak: 'break-word' }}>
              {error}
            </div>
          </div>

          {/* What to do */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.7 }}>
            This is almost always a temporary Gemini response issue.<br/>
            Your notes and saved articles are completely safe.<br/>
            Clicking Retry triggers 2 automatic attempts.
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={onRetry}>
              <RefreshCw size={13}/> Retry (auto x2)
            </button>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Hard Reload
            </button>
          </div>
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
