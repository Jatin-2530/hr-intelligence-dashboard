import { useState } from 'react'
import { Plus, Search, Trash2, X, StickyNote, Filter } from 'lucide-react'
import { CATEGORIES } from '../App.jsx'

const TAG_PRESETS = ['Automotive','Finance','Consulting','Tech','FMCG','Pharma','Banking']

function tagClass(t) {
  const map = {
    Automotive:'tag-Automotive', Finance:'tag-Finance', Consulting:'tag-Consulting',
    Tech:'tag-Tech', FMCG:'tag-FMCG', Pharma:'tag-Pharma', Banking:'tag-Banking',
  }
  return map[t] || 'tag-default'
}

function fmt(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

function NoteEditor({ note, onSave, onClose, onDelete }) {
  const isEdit = !!note
  const [title,    setTitle]    = useState(note?.title    || '')
  const [content,  setContent]  = useState(note?.content  || '')
  const [category, setCategory] = useState(note?.category || '')
  const [tags,     setTags]     = useState(note?.tags     || [])
  const [tagInput, setTagInput] = useState('')

  const addTag = t => { const c=t.trim(); if(c&&!tags.includes(c)) setTags(p=>[...p,c]); setTagInput('') }
  const remTag = t => setTags(p=>p.filter(x=>x!==t))
  const onKey  = e => { if(e.key==='Enter'||e.key===','){e.preventDefault();addTag(tagInput)} }

  return (
    <div className="notes-editor">
      <div className="editor-hd">
        <h3>{isEdit ? 'Edit Note' : 'New Note'}</h3>
        <button className="icon-btn" onClick={onClose}><X size={13} /></button>
      </div>
      <div className="editor-body">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-input" placeholder="Note title…" value={title} onChange={e=>setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Notes & Insights</label>
          <textarea className="form-textarea" placeholder="Your thoughts, highlights, key takeaways…"
            value={content} onChange={e=>setContent(e.target.value)} rows={5} />
        </div>
        <div className="form-group">
          <label className="form-label">HR Domain</label>
          <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">— Select —</option>
            {CATEGORIES.filter(c=>c.id!=='all').map(c=>(
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Industry Tags</label>
          <div className="tag-wrap">
            {tags.map(t=>(
              <span key={t} className={`tag-pill ${tagClass(t)}`} onClick={()=>remTag(t)}
                style={{ cursor:'pointer' }} title="Click to remove">{t} ×</span>
            ))}
            <input className="tag-input" placeholder="Tag + Enter" value={tagInput}
              onChange={e=>setTagInput(e.target.value)} onKeyDown={onKey} />
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginTop:5 }}>
            {TAG_PRESETS.filter(t=>!tags.includes(t)).map(t=>(
              <button key={t} className="tag-suggest-btn" onClick={()=>addTag(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="editor-ft">
        {isEdit && <button className="btn btn-danger" onClick={()=>{onDelete(note.id);onClose()}}><Trash2 size={12}/>Delete</button>}
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={()=>{if(!title.trim())return;onSave({title:title.trim(),content:content.trim(),category,tags});onClose()}} disabled={!title.trim()}>
          {isEdit?'Save':'Create'}
        </button>
      </div>
    </div>
  )
}

export default function NotesPanel({ notes, onCreate, onUpdate, onDelete, searchQuery }) {
  const [editorOpen,  setEditorOpen]  = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [filterTag,   setFilterTag]   = useState('')
  const [filterCat,   setFilterCat]   = useState('')
  const [localQ,      setLocalQ]      = useState(searchQuery || '')

  const allTags = [...new Set(notes.flatMap(n=>n.tags||[]))]

  const filtered = notes.filter(n => {
    const q = localQ.toLowerCase()
    if (q && !n.title.toLowerCase().includes(q) && !(n.content||'').toLowerCase().includes(q)) return false
    if (filterTag && !(n.tags||[]).includes(filterTag)) return false
    if (filterCat && n.category !== filterCat) return false
    return true
  })

  function handleSave(data) {
    if (editingNote) onUpdate(editingNote.id, data)
    else onCreate(data)
    setEditorOpen(false); setEditingNote(null)
  }

  return (
    <div className="notes-page">
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap', marginBottom:16 }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700 }}>My Notes</h1>
          <p style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-ui)', marginTop:3 }}>
            {notes.length} notes — your personal HR knowledge base
          </p>
        </div>
        <button className="btn btn-primary" onClick={()=>{setEditingNote(null);setEditorOpen(true)}}>
          <Plus size={13} /> New Note
        </button>
      </div>

      {/* Filter toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:16 }}>
        <div className="header-search" style={{ maxWidth:260, margin:0, position:'relative' }}>
          <Search size={13} className="search-icon" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }} />
          <input style={{ width:'100%', height:34, background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'0 12px 0 32px', fontFamily:'var(--font-ui)', fontSize:12, color:'var(--text-primary)', outline:'none' }}
            placeholder="Search notes…" value={localQ} onChange={e=>setLocalQ(e.target.value)} />
        </div>

        <button className={`fchip ${!filterCat?'active':''}`} onClick={()=>setFilterCat('')}>All</button>
        {CATEGORIES.filter(c=>c.id!=='all').map(c=>(
          <button key={c.id} className={`fchip ${filterCat===c.id?'active':''}`}
            style={filterCat===c.id?{background:c.color,borderColor:c.color}:{}}
            onClick={()=>setFilterCat(p=>p===c.id?'':c.id)}>
            {c.id==='LD'?'L&D':c.id==='CAREER'?'Career':c.id}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          <Filter size={11} color="var(--text-muted)" style={{ marginTop:4 }} />
          {allTags.map(t=>(
            <span key={t} className={`tag-pill ${tagClass(t)}`} style={{ cursor:'pointer', opacity:filterTag===t?1:0.7 }}
              onClick={()=>setFilterTag(p=>p===t?'':t)}>{t}</span>
          ))}
        </div>
      )}

      <div className="notes-layout">
        <div className="notes-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><StickyNote size={24} /></div>
              <h3>{notes.length===0?'No notes yet':'No matching notes'}</h3>
              <p>{notes.length===0?'Create your first note to build your HR knowledge base.':'Try adjusting filters.'}</p>
              {notes.length===0&&<button className="btn btn-primary" onClick={()=>{setEditingNote(null);setEditorOpen(true)}}><Plus size={13}/>Create note</button>}
            </div>
          ) : filtered.map(n=>(
            <div key={n.id}
              className={`note-card ${editingNote?.id===n.id?'selected':''}`}
              onClick={()=>{setEditingNote(n);setEditorOpen(true)}}
            >
              <div className="note-title">{n.title}</div>
              {n.content && <div className="note-preview">{n.content}</div>}
              <div className="note-footer">
                <div className="note-tags">
                  {(n.tags||[]).slice(0,3).map(t=>(
                    <span key={t} className={`tag-pill ${tagClass(t)}`} style={{ fontSize:9, padding:'1px 6px' }}>{t}</span>
                  ))}
                  {n.category && (
                    <span style={{ fontSize:9, fontFamily:'var(--font-ui)', fontWeight:600, padding:'1px 6px', borderRadius:2,
                      background:`var(--cat-${n.category.toLowerCase()}-bg, var(--bg-elevated))`,
                      color:`var(--cat-${n.category.toLowerCase()}, var(--text-secondary))` }}>
                      {n.category==='LD'?'L&D':n.category}
                    </span>
                  )}
                </div>
                <span className="note-date">{fmt(n.updatedAt||n.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {editorOpen && (
          <NoteEditor
            note={editingNote}
            onSave={handleSave}
            onClose={()=>{setEditorOpen(false);setEditingNote(null)}}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}
