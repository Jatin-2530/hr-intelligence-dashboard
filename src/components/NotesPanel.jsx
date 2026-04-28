import { useState, useCallback } from 'react'
import { Plus, Search, Tag, Trash2, PenLine, X, StickyNote, Filter } from 'lucide-react'
import { CATEGORIES, TAG_COLORS } from '../App.jsx'

const TAG_PRESETS = ['Automotive','Finance','Consulting','Tech','FMCG','Pharma','Banking']

function getTagClass(tag) {
  return TAG_COLORS[tag] || 'tag-other'
}

function formatTs(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })
}

function NoteEditor({ note, onSave, onClose, onDelete }) {
  const isEdit = !!note
  const [title,    setTitle]    = useState(note?.title    || '')
  const [content,  setContent]  = useState(note?.content  || '')
  const [category, setCategory] = useState(note?.category || '')
  const [tags,     setTags]     = useState(note?.tags     || [])
  const [tagInput, setTagInput] = useState('')

  function addTag(t) {
    const clean = t.trim()
    if (clean && !tags.includes(clean)) setTags(p => [...p, clean])
    setTagInput('')
  }

  function removeTag(t) { setTags(p => p.filter(x => x !== t)) }

  function handleTagKey(e) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
  }

  function handleSave() {
    if (!title.trim()) return
    onSave({ title: title.trim(), content: content.trim(), category, tags })
  }

  return (
    <div className="notes-editor-panel">
      <div className="editor-header">
        <h3>{isEdit ? 'Edit Note' : 'New Note'}</h3>
        <button className="icon-btn" onClick={onClose} style={{ width:28, height:28 }}>
          <X size={14} />
        </button>
      </div>

      <div className="editor-body">
        <div className="form-group">
          <label className="form-label">Title</label>
          <input
            className="form-input"
            placeholder="What's this note about?"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Notes / Insights</label>
          <textarea
            className="form-textarea"
            placeholder="Write your thoughts, highlights, or key takeaways…"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
          />
        </div>

        <div className="form-group">
          <label className="form-label">HR Category</label>
          <select
            className="form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">— Select category —</option>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Industry Tags</label>
          <div className="tag-input-wrap">
            {tags.map(t => (
              <span
                key={t}
                className={`tag-pill removable ${getTagClass(t)}`}
                onClick={() => removeTag(t)}
                title="Click to remove"
              >
                {t} ×
              </span>
            ))}
            <input
              className="tag-input"
              placeholder="Type tag + Enter"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
            />
          </div>
          <div className="tag-suggestions" style={{ marginTop: 6 }}>
            {TAG_PRESETS.filter(t => !tags.includes(t)).map(t => (
              <button key={t} className="tag-suggest-btn" onClick={() => addTag(t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="editor-footer">
        {isEdit && (
          <button className="btn btn-danger" onClick={() => { onDelete(note.id); onClose() }}>
            <Trash2 size={13} /> Delete
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={!title.trim()}>
          {isEdit ? 'Save changes' : 'Create note'}
        </button>
      </div>
    </div>
  )
}

function NoteCard({ note, isSelected, onClick }) {
  return (
    <div
      className={`note-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="note-card-title">{note.title}</div>
      {note.content && (
        <div className="note-card-preview">{note.content}</div>
      )}
      <div className="note-card-meta">
        <div className="note-tags">
          {note.tags?.slice(0,4).map(t => (
            <span key={t} className={`tag-pill ${getTagClass(t)}`} style={{ fontSize:10, padding:'1px 7px' }}>{t}</span>
          ))}
          {note.category && (
            <span className="cat-badge" style={{
              background: `var(--cat-${note.category.toLowerCase()}-bg, var(--bg-active))`,
              color: `var(--cat-${note.category.toLowerCase()}, var(--text-secondary))`,
              fontSize: 10, padding: '1px 7px',
            }}>
              {note.category === 'LD' ? 'L&D' : note.category}
            </span>
          )}
        </div>
        <span className="note-date">{formatTs(note.updatedAt || note.createdAt)}</span>
      </div>
    </div>
  )
}

export default function NotesPanel({ notes, onCreate, onUpdate, onDelete, searchQuery }) {
  const [editorOpen,   setEditorOpen]   = useState(false)
  const [editingNote,  setEditingNote]  = useState(null)
  const [filterTag,    setFilterTag]    = useState('')
  const [filterCat,    setFilterCat]    = useState('')
  const [localSearch,  setLocalSearch]  = useState(searchQuery || '')

  // Collect all tags used
  const allTags = [...new Set(notes.flatMap(n => n.tags || []))]

  function openCreate() { setEditingNote(null); setEditorOpen(true) }
  function openEdit(note) { setEditingNote(note); setEditorOpen(true) }
  function closeEditor() { setEditorOpen(false); setEditingNote(null) }

  function handleSave(data) {
    if (editingNote) onUpdate(editingNote.id, data)
    else onCreate(data)
    closeEditor()
  }

  const filtered = notes.filter(n => {
    const q = (localSearch || '').toLowerCase()
    if (q && !n.title.toLowerCase().includes(q) && !(n.content||'').toLowerCase().includes(q)) return false
    if (filterTag && !(n.tags||[]).includes(filterTag)) return false
    if (filterCat && n.category !== filterCat) return false
    return true
  })

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">My Notes</h1>
          <p className="page-subtitle">{notes.length} notes — your personal HR knowledge base</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={14} /> New Note
        </button>
      </div>

      {/* Toolbar */}
      <div className="notes-toolbar" style={{ marginBottom: 16 }}>
        <div className="header-search" style={{ maxWidth: 280, margin: 0 }}>
          <Search size={14} className="search-icon" />
          <input
            placeholder="Search notes…"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
          />
        </div>

        {allTags.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            <Filter size={12} color="var(--text-muted)" />
            <button
              className={`filter-chip ${!filterTag ? 'active' : ''}`}
              onClick={() => setFilterTag('')}
            >All tags</button>
            {allTags.map(t => (
              <button
                key={t}
                className={`filter-chip ${filterTag === t ? 'active' : ''}`}
                onClick={() => setFilterTag(p => p === t ? '' : t)}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <button
            className={`filter-chip ${!filterCat ? 'active' : ''}`}
            onClick={() => setFilterCat('')}
          >All domains</button>
          {CATEGORIES.filter(c=>c.id!=='all').map(c => (
            <button
              key={c.id}
              className={`filter-chip ${filterCat === c.id ? 'active' : ''}`}
              style={filterCat === c.id ? { borderColor: c.color, color: c.color, background: `${c.color}20` } : {}}
              onClick={() => setFilterCat(p => p === c.id ? '' : c.id)}
            >
              {c.id === 'LD' ? 'L&D' : c.id}
            </button>
          ))}
        </div>
      </div>

      <div className="notes-container">
        {/* Notes list */}
        <div className="notes-list-panel">
          {filtered.length === 0 ? (
            <div className="empty-notes">
              <div className="empty-icon">
                <StickyNote size={22} />
              </div>
              <h3>{notes.length === 0 ? 'No notes yet' : 'No matching notes'}</h3>
              <p>
                {notes.length === 0
                  ? 'Create your first note to start building your personal HR knowledge base.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {notes.length === 0 && (
                <button className="btn btn-primary" onClick={openCreate}>
                  <Plus size={14} /> Create first note
                </button>
              )}
            </div>
          ) : (
            <div className="notes-grid">
              {filtered.map(n => (
                <NoteCard
                  key={n.id}
                  note={n}
                  isSelected={editingNote?.id === n.id}
                  onClick={() => openEdit(n)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Editor panel */}
        {editorOpen && (
          <NoteEditor
            note={editingNote}
            onSave={handleSave}
            onClose={closeEditor}
            onDelete={onDelete}
          />
        )}
      </div>
    </div>
  )
}
