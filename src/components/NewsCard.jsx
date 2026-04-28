import { Bookmark, BookmarkCheck } from 'lucide-react'
import { CAT_BG, CAT_COLOR, CAT_SHORT } from '../App.jsx'

function hl(text, q) {
  if (!q || !q.trim() || typeof text !== 'string') return text
  const esc   = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${esc})`, 'gi'))
  return parts.map((p, i) =>
    p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p
  )
}

export default function NewsCard({ article, isSaved, onToggleSave, onOpen, searchQuery, featured, idx }) {
  const { id, title, summary, source, date, category, readTime } = article
  const color = CAT_COLOR[category] || 'var(--text-secondary)'
  const bg    = CAT_BG[category]    || 'var(--bg-elevated)'
  const short = CAT_SHORT[category] || category

  const d = new Date(date)
  const dateStr = d.toLocaleDateString('en-US', { month:'short', day:'numeric' })

  return (
    <article
      className={`news-card ${featured ? 'featured' : ''} ${isSaved ? 'saved' : ''}`}
      style={{ animationDelay: `${(idx||0) * 30}ms` }}
      onClick={() => onOpen(article)}
    >
      <div className="nc-top">
        <span className="cat-badge" style={{ background: bg, color }}>
          {short}
        </span>
        <div className="nc-actions" onClick={e => e.stopPropagation()}>
          <button
            className={`icon-btn ${isSaved ? 'active' : ''}`}
            onClick={() => onToggleSave(id)}
            title={isSaved ? 'Unsave' : 'Save'}
          >
            {isSaved ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
          </button>
        </div>
      </div>

      <h3 className="nc-title">{hl(title, searchQuery)}</h3>
      <p className="nc-summary">{hl(summary, searchQuery)}</p>

      <div className="nc-footer">
        <span className="nc-source">{hl(source, searchQuery)}</span>
        <div className="nc-meta">
          {readTime && <span>{readTime}m</span>}
          <span>{dateStr}</span>
        </div>
      </div>
      <span className="read-more-hint">Read full article →</span>
    </article>
  )
}
