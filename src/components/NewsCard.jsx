import { Bookmark, BookmarkCheck, Clock, ExternalLink } from 'lucide-react'
import { CATEGORIES } from '../App.jsx'

const CAT_BG = {
  TA:   'var(--cat-ta-bg)',
  HRBP: 'var(--cat-hrbp-bg)',
  MIS:  'var(--cat-mis-bg)',
  LD:   'var(--cat-ld-bg)',
  RR:   'var(--cat-rr-bg)',
}
const CAT_COLOR = {
  TA:   'var(--cat-ta)',
  HRBP: 'var(--cat-hrbp)',
  MIS:  'var(--cat-mis)',
  LD:   'var(--cat-ld)',
  RR:   'var(--cat-rr)',
}
const CAT_LABEL = { TA:'TA', HRBP:'HRBP', MIS:'MIS', LD:'L&D', RR:'R&R' }

function hl(text, q) {
  if (!q || !q.trim()) return text
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${esc})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NewsCard({ article, isSaved, onToggleSave, searchQuery, style }) {
  const { id, title, summary, source, url, date, category, readTime } = article
  const color = CAT_COLOR[category] || 'var(--text-secondary)'
  const bg    = CAT_BG[category]    || 'var(--bg-active)'
  const label = CAT_LABEL[category] || category

  return (
    <article
      className={`news-card ${isSaved ? 'saved' : ''}`}
      style={style}
    >
      <div className="news-card-top">
        <span
          className="cat-badge"
          style={{ background: bg, color }}
        >
          {label}
        </span>
        <div className="news-card-actions">
          {url !== '#' && (
            <button
              className="icon-btn"
              style={{ width: 28, height: 28 }}
              onClick={() => window.open(url, '_blank')}
              title="Open source"
            >
              <ExternalLink size={12} />
            </button>
          )}
          <button
            className={`icon-btn ${isSaved ? 'active' : ''}`}
            style={{ width: 28, height: 28 }}
            onClick={() => onToggleSave(id)}
            title={isSaved ? 'Remove from saved' : 'Save article'}
          >
            {isSaved ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          </button>
        </div>
      </div>

      <h3 className="news-card-title">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {hl(title, searchQuery)}
        </a>
      </h3>

      <p className="news-card-summary">{hl(summary, searchQuery)}</p>

      <div className="news-card-footer">
        <div className="news-source">
          <span className="source-dot" />
          {hl(source, searchQuery)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {readTime && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              <Clock size={10} />
              {readTime}m
            </span>
          )}
          <span className="news-date">{formatDate(date)}</span>
        </div>
      </div>
    </article>
  )
}
