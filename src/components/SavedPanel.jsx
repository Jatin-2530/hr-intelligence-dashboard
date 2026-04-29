import { useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink, Search, Trash2, Filter } from 'lucide-react'
import ArticleModal from './ArticleModal.jsx'
import { CATEGORIES, CAT_BG, CAT_COLOR, CAT_SHORT } from '../App.jsx'

function fmtSavedDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

function hl(text, q) {
  if (!q?.trim() || typeof text !== 'string') return text
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${esc})`, 'gi'))
  return parts.map((p, i) => p.toLowerCase() === q.toLowerCase() ? <mark key={i}>{p}</mark> : p)
}

export default function SavedPanel({ savedArticles, onToggleSave, searchQuery }) {
  const [openArticle,  setOpenArticle]  = useState(null)
  const [localSearch,  setLocalSearch]  = useState(searchQuery || '')
  const [filterCat,    setFilterCat]    = useState('')
  const [sortBy,       setSortBy]       = useState('savedAt') // savedAt | date | source

  const filtered = savedArticles
    .filter(a => {
      const q = localSearch.toLowerCase()
      if (q && !a.title.toLowerCase().includes(q) && !a.summary.toLowerCase().includes(q) && !a.source.toLowerCase().includes(q)) return false
      if (filterCat && a.category !== filterCat) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'savedAt') return new Date(b.savedAt||0) - new Date(a.savedAt||0)
      if (sortBy === 'date')    return new Date(b.date||0)    - new Date(a.date||0)
      if (sortBy === 'source')  return (a.source||'').localeCompare(b.source||'')
      return 0
    })

  // Group by category for display
  const byCategory = CATEGORIES.filter(c => c.id !== 'all').map(c => ({
    ...c,
    articles: filtered.filter(a => a.category === c.id)
  })).filter(g => g.articles.length > 0)

  const savedIds = new Set(savedArticles.map(a => a.id))

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page masthead */}
      <div className="page-masthead">
        <div className="page-masthead-left">
          <h1>Saved Articles</h1>
          <p>
            {savedArticles.length} articles saved permanently · stored in your browser until you remove them
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '14px 28px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        background: 'var(--bg-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        {/* Search */}
        <div style={{ position:'relative', minWidth:220 }}>
          <Search size={12} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}/>
          <input
            style={{ width:'100%', height:32, background:'var(--bg-elevated)', border:'1px solid var(--border)',
              borderRadius:'var(--radius-sm)', padding:'0 12px 0 30px', fontFamily:'var(--font-ui)',
              fontSize:12, color:'var(--text-primary)', outline:'none' }}
            placeholder="Search saved…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Sort */}
        <select
          style={{ height:32, background:'var(--bg-elevated)', border:'1px solid var(--border)',
            borderRadius:'var(--radius-sm)', padding:'0 10px', fontFamily:'var(--font-ui)',
            fontSize:12, color:'var(--text-secondary)', outline:'none', cursor:'pointer' }}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="savedAt">Sort: Recently Saved</option>
          <option value="date">Sort: Article Date</option>
          <option value="source">Sort: Source</option>
        </select>

        {/* Category filter */}
        <div style={{ display:'flex', alignItems:'center', gap:5, flexWrap:'wrap' }}>
          <Filter size={11} color="var(--text-muted)" />
          <button className={`fchip ${!filterCat?'active':''}`} onClick={()=>setFilterCat('')}>All</button>
          {CATEGORIES.filter(c=>c.id!=='all').map(c=>(
            <button key={c.id}
              className={`fchip ${filterCat===c.id?'active':''}`}
              style={filterCat===c.id?{background:c.color,borderColor:c.color,color:'#fff'}:{}}
              onClick={()=>setFilterCat(p=>p===c.id?'':c.id)}
            >
              {CAT_SHORT[c.id]||c.id}
            </button>
          ))}
        </div>

        {savedArticles.length > 0 && (
          <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>
            {filtered.length} of {savedArticles.length}
          </span>
        )}
      </div>

      {/* Empty state */}
      {savedArticles.length === 0 && (
        <div className="state-screen">
          <Bookmark size={44} color="var(--border-strong)" />
          <div className="state-title">No saved articles yet</div>
          <div className="state-subtitle">
            Click the bookmark icon on any article card to save it here permanently.
            Saved articles stay until you remove them — they never expire.
          </div>
        </div>
      )}

      {filtered.length === 0 && savedArticles.length > 0 && (
        <div className="state-screen">
          <Search size={44} color="var(--border-strong)" />
          <div className="state-title">No matches</div>
          <div className="state-subtitle">Try a different search or clear the category filter.</div>
        </div>
      )}

      {/* Articles grouped by category */}
      {filtered.length > 0 && (
        <div className="news-wrapper">
          {(filterCat ? [{ ...CATEGORIES.find(c=>c.id===filterCat), articles: filtered }] : byCategory).map(group => (
            <section key={group.id} className="news-section">
              <div className="section-masthead">
                <span className="sec-badge" style={{ background:`${group.color}18`, color:group.color }}>
                  {CAT_SHORT[group.id]||group.id}
                </span>
                <span className="sec-label">{group.label}</span>
                <span className="sec-count">{group.articles.length} saved</span>
              </div>

              <div className="newspaper-grid">
                {group.articles.map((a, i) => (
                  <article
                    key={a.id}
                    className={`news-card ${i===0?'featured':''}`}
                    style={{ cursor:'pointer', animationDelay:`${i*30}ms` }}
                    onClick={() => setOpenArticle(a)}
                  >
                    <div className="nc-top">
                      <span className="cat-badge" style={{ background:CAT_BG[a.category], color:CAT_COLOR[a.category] }}>
                        {CAT_SHORT[a.category]||a.category}
                      </span>
                      <div className="nc-actions" onClick={e=>e.stopPropagation()}>
                        {a.url && a.url !== '#' && a.url.startsWith('http') && (
                          <a href={a.url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="Open source" onClick={e=>e.stopPropagation()}>
                            <ExternalLink size={11}/>
                          </a>
                        )}
                        <button className="icon-btn active" title="Remove from saved" onClick={()=>onToggleSave(a.id)}>
                          <BookmarkCheck size={11}/>
                        </button>
                      </div>
                    </div>

                    <h3 className="nc-title">{hl(a.title, localSearch)}</h3>
                    <p className="nc-summary">{hl(a.summary, localSearch)}</p>

                    <div className="nc-footer">
                      <span className="nc-source">{hl(a.source, localSearch)}</span>
                      <div className="nc-meta">
                        <span>Saved {fmtSavedDate(a.savedAt)}</span>
                      </div>
                    </div>
                    <span className="read-more-hint">Click to read full summary →</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {openArticle && (
        <ArticleModal
          article={openArticle}
          isSaved={savedIds.has(openArticle.id)}
          onToggleSave={() => onToggleSave(openArticle.id)}
          onClose={() => setOpenArticle(null)}
        />
      )}
    </div>
  )
}
