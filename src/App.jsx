import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import Toast from './components/Toast.jsx'

// ── Storage Keys ──────────────────────────────────────
const NOTES_KEY  = 'hrid_notes'
const SAVED_KEY  = 'hrid_saved'
const THEME_KEY  = 'hrid_theme'
const APIKEY_KEY = 'hrid_gemini_key'
const TIME_KEY   = 'hrid_time'

function todayStr() { return new Date().toISOString().split('T')[0] }
function newsKey(d) { return `hrid_news_${d}` }

// ── Source URL map (module-level, always available) ───
const SOURCE_URLS = {
  'SHRM':                     'https://www.shrm.org/topics-tools/news',
  'Harvard Business Review':  'https://hbr.org/topic/subject/human-resource-management',
  'People Matters':           'https://www.peoplematters.in/news',
  'HR Dive':                  'https://www.hrdive.com/news',
  'McKinsey & Company':       'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights',
  'Deloitte Insights':        'https://www2.deloitte.com/us/en/insights/topics/talent/human-capital-trends.html',
  'LinkedIn Talent Solutions':'https://business.linkedin.com/talent-solutions/resources',
  'Gartner HR':               'https://www.gartner.com/en/human-resources',
  'MIT Sloan Management Review':'https://sloanreview.mit.edu/topic/talent-management',
  'Economic Times HR':        'https://economictimes.indiatimes.com/jobs',
  'Business Today':           'https://www.businesstoday.in/jobs',
  'Workforce Magazine':       'https://www.workforce.com/news',
  'NASSCOM':                  'https://nasscom.in/knowledge-center/publications',
  'Josh Bersin Academy':      'https://joshbersin.com/blog',
}

// ── Categories ────────────────────────────────────────
export const CATEGORIES = [
  { id: 'all',    label: 'All Sections',                  color: '#9C8570' },
  { id: 'TA',     label: 'Talent Acquisition',            color: '#1A5C8C' },
  { id: 'HRBP',   label: 'HR Business Partnering',        color: '#7C3D8C' },
  { id: 'MIS',    label: 'HR Analytics & MIS',            color: '#1A7A4A' },
  { id: 'LD',     label: 'Learning & Development',        color: '#C05A1A' },
  { id: 'RR',     label: 'Rewards & Recognition',         color: '#B8920A' },
  { id: 'DEI',    label: 'Diversity, Equity & Inclusion', color: '#C23870' },
  { id: 'COMP',   label: 'HR Law & Compliance',           color: '#2C5F7A' },
  { id: 'WELL',   label: 'Employee Wellbeing',            color: '#2A7A5C' },
  { id: 'TECH',   label: 'HR Technology',                 color: '#4A3A8C' },
  { id: 'LEAD',   label: 'Leadership & Culture',          color: '#8C4A1A' },
  { id: 'GLOB',   label: 'Global HR Trends',              color: '#1A6A7C' },
  { id: 'CAREER', label: 'Career & Interview Prep',       color: '#8C2A1A' },
]

export const CAT_BG = {
  TA:'rgba(26,92,140,0.1)', HRBP:'rgba(124,61,140,0.1)', MIS:'rgba(26,122,74,0.1)',
  LD:'rgba(192,90,26,0.1)', RR:'rgba(184,146,10,0.1)',   DEI:'rgba(194,56,112,0.1)',
  COMP:'rgba(44,95,122,0.1)', WELL:'rgba(42,122,92,0.1)', TECH:'rgba(74,58,140,0.1)',
  LEAD:'rgba(140,74,26,0.1)', GLOB:'rgba(26,106,124,0.1)', CAREER:'rgba(140,42,26,0.1)',
}
export const CAT_COLOR = {
  TA:'#1A5C8C', HRBP:'#7C3D8C', MIS:'#1A7A4A', LD:'#C05A1A', RR:'#B8920A',
  DEI:'#C23870', COMP:'#2C5F7A', WELL:'#2A7A5C', TECH:'#4A3A8C',
  LEAD:'#8C4A1A', GLOB:'#1A6A7C', CAREER:'#8C2A1A',
}
export const CAT_SHORT = {
  TA:'TA', HRBP:'HRBP', MIS:'MIS', LD:'L&D', RR:'R&R',
  DEI:'DEI', COMP:'COMP', WELL:'WELL', TECH:'TECH',
  LEAD:'LEAD', GLOB:'GLOB', CAREER:'CAREER',
}

// ── Gemini API Call ───────────────────────────────────
async function fetchNewsFromGemini(apiKey, dateStr, signal) {
  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  const prompt = `You are a senior HR intelligence journalist. Generate 48 completely unique HR news articles for ${displayDate}.

OUTPUT RULES — STRICTLY FOLLOW:
- Return RAW JSON array only. Zero markdown. Zero backticks. Zero explanation.
- Exactly 4 articles per category: TA, HRBP, MIS, LD, RR, DEI, COMP, WELL, TECH, LEAD, GLOB, CAREER (48 total)
- Each summary MUST be 150-200 words minimum. Count them. Do not submit short summaries.
- Every article must name a real company AND cite a real research report with year
- Every article URL must be a plausible real link (not just the homepage)

JSON format for each object:
{
  "id": "art_${dateStr}_001",
  "title": "Specific data-driven headline, max 14 words",
  "summary": "WRITE 150-200 WORDS HERE. Open with the core finding and a specific statistic. Name the company or organisation involved (use Indian and global companies: Infosys, TCS, Wipro, HCL, Accenture India, Microsoft India, Google India, Tata Group, Reliance, HDFC Bank, Unilever India, Zomato, Mahindra, Deloitte India, KPMG India). Cite the research source by full name and year (e.g. LinkedIn Global Talent Trends 2025, Mercer Total Remuneration Survey 2024, Gartner HR Leaders Survey Q1 2025, Gallup State of the Global Workplace 2024, Deloitte Global Human Capital Trends 2024). Explain the business context and why this matters for HR professionals. Add a second supporting data point from a different source. Describe the challenge or opportunity this creates for CHROs and HR teams. End with one concrete, specific, actionable recommendation for an HR practitioner or student preparing for an HR interview.",
  "source": "SHRM or Harvard Business Review or People Matters or HR Dive or McKinsey & Company or Deloitte Insights or LinkedIn Talent Solutions or Gartner HR or MIT Sloan Management Review or Economic Times HR or Business Today or Workforce Magazine or NASSCOM or Josh Bersin Academy",
  "url": "https://[domain-of-source]/[realistic-path-matching-article-topic-and-title]",
  "date": "${dateStr}",
  "category": "TA",
  "readTime": 5,
  "keyInsight": "Single most important stat or takeaway, under 15 words"
}

URL examples by source:
- SHRM: https://www.shrm.org/topics-tools/news/talent-acquisition/skill-based-hiring-india-2025
- Harvard Business Review: https://hbr.org/2025/04/rethinking-performance-management-hybrid-teams
- People Matters: https://www.peoplematters.in/article/talent-management/ai-campus-hiring-infosys-2025
- HR Dive: https://www.hrdive.com/news/pay-transparency-laws-india-2025/
- McKinsey: https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights/future-of-work-india
- Economic Times HR: https://economictimes.indiatimes.com/jobs/hr-policies-trends/posh-act-enforcement-2025
- Gartner HR: https://www.gartner.com/en/human-resources/insights/talent-acquisition-trends-2025

4 unique topics per category:
TA: skill-based hiring vs degree, AI screening tools ROI, employer brand on LinkedIn, structured interviewing
HRBP: HRBP transitioning to strategic role, org design post-merger, HR OKRs, people strategy alignment
MIS: predictive attrition models, HR dashboard design, workforce cost analytics, people data governance
LD: GenAI skills training at scale, 70-20-10 learning model revival, LXP adoption, manager capability building
RR: pay transparency legislation, total rewards post-inflation, ESOP for startups, spot recognition ROI
DEI: gender pay audit methodology, disability inclusion in hiring, allyship programs, DEI metrics framework
COMP: India new labour codes 2025 update, POSH Act internal committee, gig worker rights, PF automation
WELL: burnout measurement tools, EAP utilisation data, 4-day workweek pilot results, financial wellness ROI
TECH: AI copilots in HR, legacy HRMS migration, HR chatbot adoption, ethical AI in hiring
LEAD: toxic manager identification, CEO succession rate, hybrid team leadership, psychological safety ROI
GLOB: remote work visa policies, India GCC talent war, cross-border payroll compliance, DEI global benchmarks
CAREER: SHRM-CP vs PHRi comparison, HR case interview structure, HR analyst salary 2025, building HR portfolio`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 32768 }
      })
    }
  )

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const clean = raw.replace(/```json|```/g, '').trim()
  const jsonStart = clean.indexOf('[')
  const jsonEnd   = clean.lastIndexOf(']')
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Gemini returned invalid JSON')

  const articles = JSON.parse(clean.slice(jsonStart, jsonEnd + 1))

  // Guarantee every article has a usable URL — use source homepage if Gemini skips it
  return articles.map((a, i) => ({
    ...a,
    id: a.id || `art_${dateStr}_${String(i + 1).padStart(3, '0')}`,
    url: (a.url && a.url !== '#' && a.url.startsWith('http'))
      ? a.url
      : (SOURCE_URLS[a.source] || 'https://www.shrm.org/topics-tools/news'),
  }))
}

// ── LocalStorage helpers ──────────────────────────────
function loadNewsForDate(d) {
  try { return JSON.parse(localStorage.getItem(newsKey(d)) || 'null') } catch { return null }
}
function saveNewsForDate(d, articles) {
  try { localStorage.setItem(newsKey(d), JSON.stringify(articles)) } catch {}
  for (let i = 8; i < 15; i++) {
    const old = new Date(); old.setDate(old.getDate() - i)
    localStorage.removeItem(newsKey(old.toISOString().split('T')[0]))
  }
}
function loadNotes()     { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] } }
function saveNotes(n)    { try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)) } catch {} }
function loadSaved()     { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function saveSavedIds(s) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(s)) } catch {} }

function loadTodayTime() {
  try {
    const raw = JSON.parse(localStorage.getItem(TIME_KEY) || 'null')
    return (raw?.date === todayStr()) ? (raw.seconds || 0) : 0
  } catch { return 0 }
}
function saveTodayTime(s) {
  try { localStorage.setItem(TIME_KEY, JSON.stringify({ date: todayStr(), seconds: s })) } catch {}
}

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

  // Per-date article cache in state — key: dateStr, value: articles[]
  const [articlesByDate, setArticlesByDate] = useState({})
  const [loadingDate,    setLoadingDate]    = useState(null)  // which date is loading
  const [errorByDate,    setErrorByDate]    = useState({})

  const [savedIds,    setSavedIds]    = useState(loadSaved)
  const [notes,       setNotes]       = useState(loadNotes)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [toasts,      setToasts]      = useState([])
  const [sessionSec,  setSessionSec]  = useState(loadTodayTime)
  const abortRef = useRef(null)

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  // Persist
  useEffect(() => { saveSavedIds(savedIds) }, [savedIds])
  useEffect(() => { saveNotes(notes) }, [notes])

  // Timer
  useEffect(() => {
    const t = setInterval(() => setSessionSec(s => { const n = s+1; saveTodayTime(n); return n }), 1000)
    return () => clearInterval(t)
  }, [])

  // Toast
  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  // Fetch news for a specific date
  const fetchNews = useCallback(async (date, force = false) => {
    if (!apiKey) return

    // Already loading this date
    if (loadingDate === date && !force) return

    // Check in-memory cache first
    if (!force && articlesByDate[date]?.length > 0) return

    // Check localStorage
    if (!force) {
      const cached = loadNewsForDate(date)
      if (cached && cached.length > 0) {
        setArticlesByDate(prev => ({ ...prev, [date]: cached }))
        return
      }
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoadingDate(date)
    setErrorByDate(prev => ({ ...prev, [date]: null }))

    try {
      const data = await fetchNewsFromGemini(apiKey, date, abortRef.current.signal)
      setArticlesByDate(prev => ({ ...prev, [date]: data }))
      saveNewsForDate(date, data)
      setLastRefresh(new Date())
      toast(`${data.length} articles loaded`, 'success')
    } catch (e) {
      if (e.name !== 'AbortError') {
        setErrorByDate(prev => ({ ...prev, [date]: e.message }))
        toast('Failed to load — ' + e.message, 'error')
      }
    } finally {
      setLoadingDate(null)
    }
  }, [apiKey, articlesByDate, loadingDate, toast])

  // Auto-fetch when date changes or apiKey set
  useEffect(() => {
    if (apiKey && viewDate) fetchNews(viewDate, false)
  }, [apiKey, viewDate]) // eslint-disable-line

  // Current articles (for the viewed date)
  const currentArticles = articlesByDate[viewDate] || []
  const isLoading = loadingDate === viewDate
  const currentError = errorByDate[viewDate] || null

  // Filtered articles
  const filteredArticles = currentArticles.filter(a => {
    if (activeTab === 'saved' && !savedIds.includes(a.id)) return false
    if (activeTab !== 'all' && activeTab !== 'saved' && a.category !== activeTab) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return a.title.toLowerCase().includes(q) ||
             a.summary.toLowerCase().includes(q) ||
             a.source.toLowerCase().includes(q)
    }
    return true
  })

  // Counts always based on current articles — never blocked by loading
  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c.id === 'all'
      ? currentArticles.length
      : currentArticles.filter(a => a.category === c.id).length
    return acc
  }, { saved: savedIds.length })

  const toggleSave = useCallback(id =>
    setSavedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]), [])

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
    setNotes(p => p.filter(n => n.id !== id))
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
    setApiKey(''); setArticlesByDate({}); setKeyInput('')
  }

  // ── API Key setup screen ──────────────────────────
  if (!apiKey) {
    return (
      <div className="setup-screen">
        <div className="setup-box">
          <div className="setup-logo">HR <span>Intel</span></div>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.7, fontFamily:'var(--font-body)' }}>
            48 curated HR articles daily across 12 domains, personal notes, 7-day archive, and time tracking.
            Enter your <strong>Gemini API key</strong> to begin.
          </p>
          <div className="form-group">
            <label className="form-label">Gemini API Key</label>
            <input className="form-input" type="password" placeholder="AIzaSy..."
              value={keyInput} onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveKey()} autoFocus />
          </div>
          <button className="btn btn-primary" onClick={saveKey} disabled={!keyInput.trim()}
            style={{ width:'100%', justifyContent:'center', padding:'12px' }}>
            Launch Dashboard
          </button>
          <p style={{ fontSize:11, color:'var(--text-caption)', textAlign:'center', fontFamily:'var(--font-ui)' }}>
            Free key at{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
              style={{ color:'var(--accent)' }}>aistudio.google.com</a>
            {' '}· Stored in your browser only
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
        loading={isLoading} lastRefresh={lastRefresh}
        onClearKey={clearKey} sessionSec={sessionSec}
      />
      <div className="app-body">
        {/* Sidebar is ALWAYS rendered — never blocked by loading state */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />
        <main className="main-content">
          {activeTab === 'notes' ? (
            <NotesPanel
              notes={notes} onCreate={createNote}
              onUpdate={updateNote} onDelete={deleteNote}
              searchQuery={searchQuery}
            />
          ) : (
            <NewsFeed
              articles={filteredArticles}
              activeTab={activeTab}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              loading={isLoading}
              error={currentError}
              onRetry={() => fetchNews(viewDate, true)}
              searchQuery={searchQuery}
              viewDate={viewDate}
              setViewDate={d => { setViewDate(d); setActiveTab('all') }}
              pastDays={getPastDays(7)}
            />
          )}
        </main>
      </div>
      <Toast toasts={toasts} />
    </div>
  )
}
