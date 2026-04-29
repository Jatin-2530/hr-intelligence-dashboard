import { X, ExternalLink, Bookmark, BookmarkCheck, Clock, Calendar, ArrowUpRight } from 'lucide-react'
import { CAT_BG, CAT_COLOR, CAT_SHORT, CATEGORIES } from '../App.jsx'

export default function ArticleModal({ article, isSaved, onToggleSave, onClose }) {
  if (!article) return null
  const { id, title, summary, source, url, date, category, readTime, keyInsight } = article
  const cat   = CATEGORIES.find(c => c.id === category)
  const color = CAT_COLOR[category] || 'var(--text-secondary)'
  const bg    = CAT_BG[category]    || 'var(--bg-elevated)'
  const short = CAT_SHORT[category] || category
  const hasRealUrl = url && url !== '#' && url.startsWith('http')

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true">

        {/* ── Header ── */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-cat-row">
              <span className="cat-badge" style={{ background: bg, color }}>{short}</span>
              {cat && <span style={{ fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-ui)' }}>{cat.label}</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
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

        {/* ── Title ── */}
        <h2 className="modal-title">{title}</h2>

        {/* ── Source link banner — always visible ── */}
        <div style={{
          margin: '0 24px',
          background: hasRealUrl ? bg : 'var(--bg-elevated)',
          border: `1px solid ${hasRealUrl ? color+'40' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div>
            <div style={{ fontSize:9, fontFamily:'var(--font-ui)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:2 }}>
              Source Publication
            </div>
            <div style={{ fontFamily:'var(--font-ui)', fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>
              {source}
            </div>
          </div>
          {hasRealUrl ? (
            <a href={url} target="_blank" rel="noopener noreferrer"
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:color, color:'#FFF',
                borderRadius:'var(--radius-sm)', fontFamily:'var(--font-ui)', fontSize:12, fontWeight:700,
                textDecoration:'none', whiteSpace:'nowrap', flexShrink:0 }}>
              Read Full Article <ArrowUpRight size={13} />
            </a>
          ) : (
            <span style={{ fontSize:11, fontFamily:'var(--font-ui)', color:'var(--text-muted)', fontStyle:'italic' }}>
              Direct link unavailable
            </span>
          )}
        </div>

        {/* ── Body ── */}
        <div className="modal-body">
          {/* Key insight callout */}
          {keyInsight && (
            <div style={{
              background: bg, border:`1px solid ${color}30`,
              borderLeft:`3px solid ${color}`, borderRadius:'var(--radius-sm)', padding:'12px 16px'
            }}>
              <div style={{ fontSize:9, fontFamily:'var(--font-ui)', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color, marginBottom:4 }}>
                Key Insight
              </div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4 }}>
                "{keyInsight}"
              </div>
            </div>
          )}

          {/* Full summary */}
          <p className="modal-summary" style={{ fontSize:15, lineHeight:1.8 }}>{summary}</p>

          <div className="modal-divider" />

          {/* Footer actions */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' }}>
              {readTime && `${readTime} min · `}{displayDate}
            </span>
            <div style={{ display:'flex', gap:8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => isSaved ? onToggleSave(id) : onToggleSave(article)}
                style={isSaved ? { borderColor:'var(--accent)', color:'var(--accent)' } : {}}
              >
                {isSaved ? <><BookmarkCheck size={13}/> Saved</> : <><Bookmark size={13}/> Save Article</>}
              </button>
              {hasRealUrl && (
                <a className="btn btn-primary" href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} /> Open in {source.split(' ')[0]}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
