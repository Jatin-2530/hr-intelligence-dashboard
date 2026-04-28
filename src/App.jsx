import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import Toast from './components/Toast.jsx'

// ── Constants ─────────────────────────────────────────
const CACHE_KEY    = 'hrid_news_cache'
const NOTES_KEY    = 'hrid_notes'
const SAVED_KEY    = 'hrid_saved'
const THEME_KEY    = 'hrid_theme'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours

export const CATEGORIES = [
  { id: 'all',  label: 'All News',                 color: '#8B949E', dot: '#8B949E'  },
  { id: 'TA',   label: 'Talent Acquisition',       color: '#58A6FF', dot: '#58A6FF'  },
  { id: 'HRBP', label: 'HR Business Partnering',   color: '#BC8CFF', dot: '#BC8CFF'  },
  { id: 'MIS',  label: 'HR Analytics & MIS',       color: '#3FB950', dot: '#3FB950'  },
  { id: 'LD',   label: 'Learning & Development',   color: '#FF7B72', dot: '#FF7B72'  },
  { id: 'RR',   label: 'Rewards & Recognition',    color: '#F0A500', dot: '#F0A500'  },
]

export const TAG_COLORS = {
  Automotive: 'tag-automotive', Finance: 'tag-finance',
  Consulting: 'tag-consulting', Tech: 'tag-tech',
  FMCG: 'tag-fmcg', Pharma: 'tag-pharma',
  Banking: 'tag-banking',
}

const SUGGESTED_TAGS = ['Automotive','Finance','Consulting','Tech','FMCG','Pharma','Banking']

// ── Claude API news prompt ────────────────────────────
async function fetchNewsFromClaude(signal) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })
  
  const prompt = `You are an HR intelligence curator. Generate 20 realistic, insightful HR news articles for ${today}.

Return ONLY a valid JSON array (no markdown, no preamble) with exactly 20 objects. Each object must have:
- id: unique string like "art_001"
- title: compelling news headline (max 12 words)  
- summary: 2-sentence summary with concrete data points (percentages, company names, study references)
- source: one of ["SHRM", "Harvard Business Review", "People Matters", "HR Dive", "Workforce Magazine", "McKinsey & Company", "Deloitte Insights", "LinkedIn Talent Solutions", "Gartner HR", "MIT Sloan Management Review", "Economic Times HR", "Business Today"]
- url: "#"
- date: "${new Date().toISOString().split('T')[0]}"
- category: one of exactly ["TA","HRBP","MIS","LD","RR"]
- readTime: number (2-6)

Distribute categories: 4 TA, 4 HRBP, 4 MIS, 4 LD, 4 RR. 
Topics should cover: hiring trends, workforce analytics, DEI, skills gaps, pay equity, engagement, AI in HR, remote work, leadership development, compensation benchmarking, succession planning, learning tech, performance management, talent marketplace. Use realistic company names (Infosys, Wipro, Microsoft, Google, Tata, Reliance, Unilever, etc.) and cite plausible research statistics.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  const raw  = data.content?.[0]?.text || ''
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Load/Save helpers ────────────────────────────────
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { articles, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return articles
  } catch { return null }
}
function saveCache(articles) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ articles, ts: Date.now() })) } catch {}
}
function loadNotes() {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] }
}
function saveNotes(notes) {
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)) } catch {}
}
function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] }
}
function saveSaved(ids) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)) } catch {}
}

// ── App ──────────────────────────────────────────────
export default function App() {
  const [theme,        setTheme]        = useState(() => localStorage.getItem(THEME_KEY) || 'dark')
  const [activeTab,    setActiveTab]    = useState('all')
  const [searchQuery,  setSearchQuery]  = useState('')
  const [dateFilter,   setDateFilter]   = useState('today')
  const [articles,     setArticles]     = useState([])
  const [savedIds,     setSavedIds]     = useState(loadSaved)
  const [notes,        setNotes]        = useState(loadNotes)
  const [loading,      setLoading]      = useState(false)
  const [loadPhase,    setLoadPhase]    = useState('')
  const [error,        setError]        = useState(null)
  const [lastRefresh,  setLastRefresh]  = useState(null)
  const [toasts,       setToasts]       = useState([])
  const abortRef = useRef(null)

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Persist saved
  useEffect(() => { saveSaved(savedIds) }, [savedIds])

  // Persist notes
  useEffect(() => { saveNotes(notes) }, [notes])

  // Toast helper
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  // Fetch news
  const fetchNews = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadCache()
      if (cached) {
        setArticles(cached)
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) setLastRefresh(new Date(JSON.parse(raw).ts))
        return
      }
    }

    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    setLoadPhase('Connecting to intelligence sources…')

    setTimeout(() => setLoadPhase('Curating HR articles across domains…'), 1200)
    setTimeout(() => setLoadPhase('Classifying by TA, HRBP, MIS, L&D, R&R…'), 2600)
    setTimeout(() => setLoadPhase('Finalising your daily brief…'), 4200)

    try {
      const data = await fetchNewsFromClaude(abortRef.current.signal)
      setArticles(data)
      saveCache(data)
      const now = new Date()
      setLastRefresh(now)
      toast('News refreshed — ' + data.length + ' articles loaded', 'success')
    } catch (e) {
      if (e.name !== 'AbortError') {
        setError(e.message)
        toast('Failed to load news', 'error')
      }
    } finally {
      setLoading(false)
      setLoadPhase('')
    }
  }, [toast])

  useEffect(() => { fetchNews(false) }, [fetchNews])

  // Computed: filtered articles
  const filteredArticles = articles.filter(a => {
    if (activeTab === 'saved')  return savedIds.includes(a.id)
    if (activeTab !== 'all')    return a.category === activeTab
    return true
  }).filter(a => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return a.title.toLowerCase().includes(q) ||
           a.summary.toLowerCase().includes(q) ||
           a.source.toLowerCase().includes(q)
  })

  // Category counts
  const counts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.id] = cat.id === 'all'
      ? articles.length
      : articles.filter(a => a.category === cat.id).length
    return acc
  }, { saved: savedIds.length })

  // Toggle save
  const toggleSave = useCallback((id) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      return next
    })
  }, [])

  // Notes CRUD
  const createNote = useCallback((note) => {
    const n = { ...note, id: 'note_' + Date.now(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setNotes(p => [n, ...p])
    toast('Note saved', 'success')
    return n
  }, [toast])

  const updateNote = useCallback((id, updates) => {
    setNotes(p => p.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
    toast('Note updated', 'success')
  }, [toast])

  const deleteNote = useCallback((id) => {
    setNotes(p => p.filter(n => n.id !== id))
    toast('Note deleted', 'error')
  }, [toast])

  return (
    <div className="app-wrapper">
      <Header
        theme={theme}
        setTheme={setTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onRefresh={() => fetchNews(true)}
        loading={loading}
        lastRefresh={lastRefresh}
      />

      <div className="app-body">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          counts={counts}
        />

        <main className="main-content">
          {activeTab === 'notes' ? (
            <NotesPanel
              notes={notes}
              onCreate={createNote}
              onUpdate={updateNote}
              onDelete={deleteNote}
              searchQuery={searchQuery}
              suggestedTags={SUGGESTED_TAGS}
            />
          ) : (
            <NewsFeed
              articles={filteredArticles}
              activeTab={activeTab}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              loading={loading}
              loadPhase={loadPhase}
              error={error}
              onRetry={() => fetchNews(true)}
              searchQuery={searchQuery}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              counts={counts}
            />
          )}
        </main>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
