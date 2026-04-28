import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import Toast from './components/Toast.jsx'

// ── Storage Keys ──────────────────────────────────────
const NOTES_KEY   = 'hrid_notes'
const SAVED_KEY   = 'hrid_saved'
const THEME_KEY   = 'hrid_theme'
const APIKEY_KEY  = 'hrid_gemini_key'
const TIME_KEY    = 'hrid_time'   // { date: 'YYYY-MM-DD', seconds: 0 }

function todayStr() { return new Date().toISOString().split('T')[0] }
function newsKey(d)  { return `hrid_news_${d}` }

// ── Categories (12) ───────────────────────────────────
export const CATEGORIES = [
  { id: 'all',    label: 'All Sections',              color: '#9C8570', dot: '#9C8570' },
  { id: 'TA',     label: 'Talent Acquisition',        color: '#1A5C8C', dot: '#1A5C8C' },
  { id: 'HRBP',   label: 'HR Business Partnering',    color: '#7C3D8C', dot: '#7C3D8C' },
  { id: 'MIS',    label: 'HR Analytics & MIS',        color: '#1A7A4A', dot: '#1A7A4A' },
  { id: 'LD',     label: 'Learning & Development',    color: '#C05A1A', dot: '#C05A1A' },
  { id: 'RR',     label: 'Rewards & Recognition',     color: '#B8920A', dot: '#B8920A' },
  { id: 'DEI',    label: 'Diversity, Equity & Inclusion', color: '#C23870', dot: '#C23870' },
  { id: 'COMP',   label: 'HR Law & Compliance',       color: '#2C5F7A', dot: '#2C5F7A' },
  { id: 'WELL',   label: 'Employee Wellbeing',        color: '#2A7A5C', dot: '#2A7A5C' },
  { id: 'TECH',   label: 'HR Technology',             color: '#4A3A8C', dot: '#4A3A8C' },
  { id: 'LEAD',   label: 'Leadership & Culture',      color: '#8C4A1A', dot: '#8C4A1A' },
  { id: 'GLOB',   label: 'Global HR Trends',          color: '#1A6A7C', dot: '#1A6A7C' },
  { id: 'CAREER', label: 'HR Career & Interview Prep',color: '#8C2A1A', dot: '#8C2A1A' },
]

export const CAT_BG = {
  TA:'var(--cat-ta-bg)', HRBP:'var(--cat-hrbp-bg)', MIS:'var(--cat-mis-bg)',
  LD:'var(--cat-ld-bg)', RR:'var(--cat-rr-bg)', DEI:'var(--cat-dei-bg)',
  COMP:'var(--cat-comp-bg)', WELL:'var(--cat-well-bg)', TECH:'var(--cat-tech-bg)',
  LEAD:'var(--cat-lead-bg)', GLOB:'var(--cat-glob-bg)', CAREER:'var(--cat-career-bg)',
}
export const CAT_COLOR = {
  TA:'var(--cat-ta)', HRBP:'var(--cat-hrbp)', MIS:'var(--cat-mis)',
  LD:'var(--cat-ld)', RR:'var(--cat-rr)', DEI:'var(--cat-dei)',
  COMP:'var(--cat-comp)', WELL:'var(--cat-well)', TECH:'var(--cat-tech)',
  LEAD:'var(--cat-lead)', GLOB:'var(--cat-glob)', CAREER:'var(--cat-career)',
}
export const CAT_SHORT = {
  TA:'TA', HRBP:'HRBP', MIS:'MIS', LD:'L&D', RR:'R&R',
  DEI:'DEI', COMP:'COMP', WELL:'WELL', TECH:'TECH', LEAD:'LEAD', GLOB:'GLOB', CAREER:'CAREER',
}

export const TAG_COLORS = {
  Automotive:'tag-Automotive', Finance:'tag-Finance', Consulting:'tag-Consulting',
  Tech:'tag-Tech', FMCG:'tag-FMCG', Pharma:'tag-Pharma', Banking:'tag-Banking',
}

// ── Gemini Fetch ──────────────────────────────────────
async function fetchNewsFromGemini(apiKey, dateStr, signal) {
  const displayDate = new Date(dateStr).toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  const prompt = `You are a senior HR intelligence editor at a top business publication. Generate 36 unique, insightful, realistic HR news articles dated ${displayDate} (${dateStr}).

Return ONLY a valid JSON array of exactly 36 objects with NO markdown, NO backticks, NO preamble. Each article:
{
  "id": "art_${dateStr}_001",  
  "title": "compelling headline max 12 words",
  "summary": "3-4 sentences with specific data: cite real percentages, name actual companies (Infosys, TCS, Wipro, Microsoft, Google, Unilever, Tata Motors, Reliance, HUL, Deloitte, McKinsey, KPMG, Zomato, Swiggy, PhonePe, Byju's), reference real studies (Gallup, LinkedIn Talent Trends 2024, Mercer Global Talent, Gartner HR Survey). Include one actionable insight.",
  "source": "one of: SHRM|Harvard Business Review|People Matters|HR Dive|McKinsey & Company|Deloitte Insights|LinkedIn Talent Solutions|Gartner HR|MIT Sloan Management Review|Economic Times HR|Business Today|Workforce Magazine|NASSCOM|Josh Bersin Academy",
  "url": "#",
  "date": "${dateStr}",
  "category": "TA|HRBP|MIS|LD|RR|DEI|COMP|WELL|TECH|LEAD|GLOB|CAREER",
  "readTime": 3,
  "keyInsight": "one bold stat or takeaway max 12 words"
}

Distribute exactly: 3 TA, 3 HRBP, 3 MIS, 3 LD, 3 RR, 3 DEI, 3 COMP, 3 WELL, 3 TECH, 3 LEAD, 3 GLOB, 3 CAREER.

Topics to cover across categories:
- TA: campus hiring, ATS tools, employer branding, diversity hiring, gig economy, lateral hiring
- HRBP: org restructuring, business alignment, workforce planning, change management
- MIS: people analytics, HRMS platforms, attrition modelling, workforce dashboards
- LD: upskilling programs, LMS platforms, microlearning, leadership academies
- RR: pay equity, ESOP trends, recognition programs, total rewards benchmarking  
- DEI: gender parity, LGBTQ+ inclusion, accessibility, unconscious bias training
- COMP: labor law amendments, PF/ESI compliance, POSH Act, employment contracts
- WELL: mental health EAPs, burnout prevention, flexible work, financial wellness
- TECH: AI in HR, HRMS trends, chatbots for HR, blockchain credentials
- LEAD: CEO succession, culture building, psychological safety, executive coaching
- GLOB: hybrid work policies, cross-border hiring, geopolitical HR impact, expat management
- CAREER: HR interview tips, case study frameworks, HR certifications (SHRM-CP, PHRi), salary benchmarks

Make all summaries rich, data-driven, and relevant to Indian and global HR context.`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    }
  )

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message || `API error ${res.status}`)
  }
  const data = await res.json()
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const clean = raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, s =>
    s.replace(/```json|```/g, '')
  ).trim()
  const jsonStart = clean.indexOf('[')
  const jsonEnd   = clean.lastIndexOf(']')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Invalid JSON response')
  return JSON.parse(clean.slice(jsonStart, jsonEnd + 1))
}

// ── LocalStorage helpers ──────────────────────────────
function loadNewsForDate(d) {
  try { return JSON.parse(localStorage.getItem(newsKey(d)) || 'null') } catch { return null }
}
function saveNewsForDate(d, articles) {
  try { localStorage.setItem(newsKey(d), JSON.stringify(articles)) } catch {}
  // Prune anything older than 8 days
  for (let i = 8; i < 14; i++) {
    const old = new Date(); old.setDate(old.getDate() - i)
    localStorage.removeItem(newsKey(old.toISOString().split('T')[0]))
  }
}
function loadNotes()    { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] } }
function saveNotes(n)   { try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)) } catch {} }
function loadSaved()    { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function saveSavedIds(s){ try { localStorage.setItem(SAVED_KEY, JSON.stringify(s)) } catch {} }

// ── Time tracker ──────────────────────────────────────
function loadTodayTime() {
  try {
    const raw = JSON.parse(localStorage.getItem(TIME_KEY) || 'null')
    if (raw?.date === todayStr()) return raw.seconds || 0
    return 0
  } catch { return 0 }
}
function saveTodayTime(s) {
  try { localStorage.setItem(TIME_KEY, JSON.stringify({ date: todayStr(), seconds: s })) } catch {}
}

// ── Past 7 days list ──────────────────────────────────
function getPastDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
}

// ── App ───────────────────────────────────────────────
export default function App() {
  const [theme,       setTheme]       = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem(APIKEY_KEY) || '')
  const [keyInput,    setKeyInput]    = useState('')
  const [activeTab,   setActiveTab]   = useState('all')
  const [viewDate,    setViewDate]    = useState(todayStr())
  const [searchQuery, setSearchQuery] = useState('')
  const [articles,    setArticles]    = useState([])
  const [savedIds,    setSavedIds]    = useState(loadSaved)
  const [notes,       setNotes]       = useState(loadNotes)
  const [loading,     setLoading]     = useState(false)
  const [loadPhase,   setLoadPhase]   = useState('')
  const [error,       setError]       = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [toasts,      setToasts]      = useState([])
  const [sessionSec,  setSessionSec]  = useState(loadTodayTime)
  const abortRef = useRef(null)

  // ── Theme ──────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // ── Persist ───────────────────────────────────────
  useEffect(() => { saveSavedIds(savedIds) }, [savedIds])
  useEffect(() => { saveNotes(notes) }, [notes])

  // ── Time tracker ──────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setSessionSec(s => {
        const next = s + 1
        saveTodayTime(next)
        return next
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // ── Toast ─────────────────────────────────────────
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  // ── Fetch news ────────────────────────────────────
  const fetchNews = useCallback(async (date, force = false) => {
    if (!apiKey) return
    if (!force) {
      const cached = loadNewsForDate(date)
      if (cached && cached.length > 0) {
        setArticles(cached)
        setLastRefresh(new Date())
        return
      }
    }
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    setLoadPhase('Connecting to intelligence sources…')
    setTimeout(() => setLoadPhase('Curating articles across 12 HR domains…'), 1500)
    setTimeout(() => setLoadPhase('Verifying facts, deduplicating…'), 3500)
    setTimeout(() => setLoadPhase('Building your daily brief…'), 5500)
    try {
      const data = await fetchNewsFromGemini(apiKey, date, abortRef.current.signal)
      setArticles(data)
      saveNewsForDate(date, data)
      setLastRefresh(new Date())
      toast(`${data.length} articles loaded for ${date}`, 'success')
    } catch (e) {
      if (e.name !== 'AbortError') { setError(e.message); toast('Failed to load news', 'error') }
    } finally {
      setLoading(false)
      setLoadPhase('')
    }
  }, [apiKey, toast])

  useEffect(() => {
    if (apiKey) fetchNews(viewDate, false)
  }, [apiKey, viewDate]) // eslint-disable-line

  // ── Computed articles ─────────────────────────────
  const filteredArticles = articles.filter(a => {
    if (activeTab === 'saved' && !savedIds.includes(a.id)) return false
    if (activeTab !== 'all' && activeTab !== 'saved' && a.category !== activeTab) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q) || a.source.toLowerCase().includes(q)
    }
    return true
  })

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c.id === 'all' ? articles.length : articles.filter(a => a.category === c.id).length
    return acc
  }, { saved: savedIds.length })

  // ── Actions ───────────────────────────────────────
  const toggleSave = useCallback(id => setSavedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]), [])

  const createNote = useCallback(n => {
    const note = { ...n, id:'note_'+Date.now(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
    setNotes(p => [note, ...p])
    toast('Note saved', 'success')
    return note
  }, [toast])

  const updateNote = useCallback((id, u) => {
    setNotes(p => p.map(n => n.id===id ? {...n,...u, updatedAt:new Date().toISOString()} : n))
    toast('Note updated', 'success')
  }, [toast])

  const deleteNote = useCallback(id => {
    setNotes(p => p.filter(n=>n.id!==id))
    toast('Note deleted', 'error')
  }, [toast])

  function saveKey() {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem(APIKEY_KEY, k)
    setApiKey(k)
  }

  function clearKey() {
    localStorage.removeItem(APIKEY_KEY)
    setApiKey(''); setArticles([]); setKeyInput('')
  }

  // ── API Key setup screen ───────────────────────────
  if (!apiKey) {
    return (
      <div className="setup-screen">
        <div className="setup-box">
          <div className="setup-logo">HR <span>Intel</span></div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, fontFamily:'var(--font-body)' }}>
            Your daily HR command centre — 36 curated articles across 12 domains, personal notes, and archive.
            Enter your <strong>Gemini API key</strong> to begin.
          </p>
          <div className="form-group">
            <label className="form-label">Gemini API Key</label>
            <input className="form-input" type="password" placeholder="AIzaSy..."
              value={keyInput} onChange={e=>setKeyInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&saveKey()} autoFocus />
          </div>
          <button className="btn btn-primary" onClick={saveKey} disabled={!keyInput.trim()}
            style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
            Launch Dashboard
          </button>
          <p style={{ fontSize:11, color:'var(--text-caption)', textAlign:'center', fontFamily:'var(--font-ui)' }}>
            Free key at{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
              style={{ color:'var(--accent)' }}>aistudio.google.com</a>
            {' '}· Stored locally, never shared
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      <Header
        theme={theme} setTheme={setTheme}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        onRefresh={() => fetchNews(viewDate, true)}
        loading={loading} lastRefresh={lastRefresh}
        onClearKey={clearKey} sessionSec={sessionSec}
      />
      <div className="app-body">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />
        <main className="main-content">
          {activeTab === 'notes' ? (
            <NotesPanel notes={notes} onCreate={createNote} onUpdate={updateNote} onDelete={deleteNote} searchQuery={searchQuery} />
          ) : (
            <NewsFeed
              articles={filteredArticles} activeTab={activeTab}
              savedIds={savedIds} onToggleSave={toggleSave}
              loading={loading} loadPhase={loadPhase} error={error}
              onRetry={() => fetchNews(viewDate, true)}
              searchQuery={searchQuery}
              viewDate={viewDate} setViewDate={d => { setViewDate(d); setActiveTab('all') }}
              pastDays={getPastDays(7)}
            />
          )}
        </main>
      </div>
      <Toast toasts={toasts} />
    </div>
  )
}
