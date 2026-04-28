import { X, ExternalLink, Bookmark, BookmarkCheck, Clock, Calendar } from 'lucide-react'
import { CAT_BG, CAT_COLOR, CAT_SHORT, CATEGORIES } from '../App.jsx'

export default function ArticleModal({ article, isSaved, onToggleSave, onClose }) {
  if (!article) return null

  const { id, title, summary, source, url, date, category, readTime, keyInsight } = article
  const cat   = CATEGORIES.find(c => c.id === category)
  const color = CAT_COLOR[category] || 'var(--text-secondary)'
  const bg    = CAT_BG[category]    || 'var(--bg-elevated)'
  const short = CAT_SHORT[category] || category

  const displayDate = new Date(date).toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  // Close on Escape
  function handleKey(e) {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleBackdrop} onKeyDown={handleKey} tabIndex={-1}>
      <div className="modal-box" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-cat-row">
              <span className="cat-badge" style={{ background: bg, color }}>
                {short}
              </span>
              {cat && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  {cat.label}
                </span>
              )}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>
                <Calendar size={10} />{displayDate}
              </span>
              {readTime && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>
                  <Clock size={10} />{readTime} min read
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Title */}
        <h2 className="modal-title">{title}</h2>

        {/* Body */}
        <div className="modal-body">
          {/* Key insight callout */}
          {keyInsight && (
            <div style={{
              background: bg, border: `1px solid ${color}30`,
              borderLeft: `3px solid ${color}`, borderRadius:'var(--radius-sm)',
              padding:'12px 16px'
            }}>
              <div style={{ fontSize:9, fontFamily:'var(--font-ui)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color, marginBottom:4 }}>
                Key Insight
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4 }}>
                "{keyInsight}"
              </div>
            </div>
          )}

          {/* Full summary */}
          <p className="modal-summary">{summary}</p>

          <div className="modal-divider" />

          {/* Footer */}
          <div className="modal-meta-row">
            <div className="modal-source-block">
              <span className="modal-source-label">Published by</span>
              <span className="modal-source-name">{source}</span>
            </div>
            <div className="modal-actions">
              <button
                className={`btn btn-secondary`}
                onClick={() => onToggleSave(id)}
                style={isSaved ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}}
              >
                {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                {isSaved ? 'Saved' : 'Save'}
              </button>
              {url && url !== '#' ? (
                <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} /> Read Original
                </a>
              ) : (
                <span className="btn btn-primary" style={{ opacity:0.6, cursor:'default' }}>
                  <ExternalLink size={13} /> Source Link Coming
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
