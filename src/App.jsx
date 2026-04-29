import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import SavedPanel from './components/SavedPanel.jsx'
import Toast from './components/Toast.jsx'

// ── Storage Keys ──────────────────────────────────────
const NOTES_KEY  = 'hrid_notes'
const SAVED_KEY  = 'hrid_saved'       // array of { id, articleData, savedAt }
const THEME_KEY  = 'hrid_theme'
const APIKEY_KEY = 'hrid_gemini_key'
const TIME_KEY   = 'hrid_time'

function todayStr() { return new Date().toISOString().split('T')[0] }
function newsKey(d) { return `hrid_news_${d}` }

// ── Source URL map ─────────────────────────────────────
const SOURCE_URLS = {
  'SHRM':                      'https://www.shrm.org/topics-tools/news',
  'Harvard Business Review':   'https://hbr.org/topic/subject/human-resource-management',
  'People Matters':            'https://www.peoplematters.in/news',
  'HR Dive':                   'https://www.hrdive.com/news',
  'McKinsey & Company':        'https://www.mckinsey.com/capabilities/people-and-organizational-performance/our-insights',
  'Deloitte Insights':         'https://www2.deloitte.com/us/en/insights/topics/talent/human-capital-trends.html',
  'LinkedIn Talent Solutions': 'https://business.linkedin.com/talent-solutions/resources',
  'Gartner HR':                'https://www.gartner.com/en/human-resources',
  'MIT Sloan Management Review':'https://sloanreview.mit.edu/topic/talent-management',
  'Economic Times HR':         'https://economictimes.indiatimes.com/jobs',
  'Business Today':            'https://www.businesstoday.in/jobs',
  'Workforce Magazine':        'https://www.workforce.com/news',
  'NASSCOM':                   'https://nasscom.in/knowledge-center/publications',
  'Josh Bersin Academy':       'https://joshbersin.com/blog',
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

// ── Anti-duplication helpers ──────────────────────────

// Get titles from last N days to inject into prompt
function getRecentTitles(daysBack = 5) {
  const titles = []
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    try {
      const cached = JSON.parse(localStorage.getItem(newsKey(dateStr)) || 'null')
      if (cached) cached.forEach(a => titles.push(a.title))
    } catch {}
  }
  return titles
}

// Post-generation dedup: remove articles that share 3+ meaningful words with any prior article
function deduplicateArticles(articles) {
  const seen = []
  return articles.filter(article => {
    const words = new Set(
      article.title.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4 && !STOP_WORDS.has(w))
    )
    const isDup = seen.some(prev => {
      const prevWords = new Set(
        prev.toLowerCase().split(/\s+/).filter(w => w.length > 4 && !STOP_WORDS.has(w))
      )
      const overlap = [...words].filter(w => prevWords.has(w))
      return overlap.length >= 3
    })
    if (!isDup) { seen.push(article.title); return true }
    return false
  })
}

const STOP_WORDS = new Set([
  'about','their','which','would','could','should','through','across',
  'between','within','while','where','those','these','there','have',
  'with','from','that','this','will','been','being','india','indian',
  'company','firms','firms','using','based','after','human','resource',
  'resources','management','global','report','study','survey','shows',
  'reveals','finds','found','according','percent','annual','latest',
])

// ── Gemini API Call ───────────────────────────────────
async function fetchNewsFromGemini(apiKey, dateStr, signal) {
  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  // Pull last 5 days of titles to block duplication
  const recentTitles = getRecentTitles(5)
  const recentBlock = recentTitles.length > 0
    ? `\n\nCRITICAL — FORBIDDEN TOPICS (these were covered in the last 5 days — DO NOT repeat these subjects, angles, companies, or data points):\n${recentTitles.map((t,i) => `${i+1}. ${t}`).join('\n')}\n`
    : ''

  const prompt = `You are a senior HR intelligence journalist writing for a premium HR publication. Generate 48 COMPLETELY UNIQUE HR news articles for ${displayDate}.
${recentBlock}
STRICT OUTPUT RULES:
1. Return a RAW JSON array only — zero markdown, zero backticks, zero preamble
2. Exactly 4 articles per category (12 categories × 4 = 48 total)
3. Categories: TA, HRBP, MIS, LD, RR, DEI, COMP, WELL, TECH, LEAD, GLOB, CAREER
4. Every summary MUST be 200 words minimum — write full journalistic paragraphs
5. Every article must feature a DIFFERENT company — no company repeated twice across all 48
6. Every article must cite a specific named research report with year
7. URLs must be realistic full paths, not just homepages

JSON structure (one object per article):
{
  "id": "art_${dateStr}_001",
  "title": "Specific headline with a number or company name, max 14 words",
  "summary": "PARAGRAPH 1 (60-70 words): Lead with the core finding and exact statistic. Name the company or organisation. Cite the full report name and year. Example: 'Infosys has restructured its campus recruitment model for FY2026, replacing GPA-based screening with AI-driven competency assessments across 48 partner universities. According to the LinkedIn Global Talent Trends 2025 report, 73 percent of hiring managers in technology sector now rank demonstrated skills above academic credentials, a sharp reversal from pre-pandemic norms.'\n\nPARAGAPH 2 (70-80 words): Provide business context — why is this happening now? What market pressure, regulation, or workforce shift is driving this change? Name a second data point from a different source. Describe the specific challenge or opportunity for CHRO/HR teams.\n\nPARAGRAPH 3 (40-50 words): End with one concrete, specific, actionable recommendation that an HR professional or MBA student preparing for HR interviews can apply or mention in interviews. Make it practical and specific, not generic.",
  "source": "One of: SHRM | Harvard Business Review | People Matters | HR Dive | McKinsey & Company | Deloitte Insights | LinkedIn Talent Solutions | Gartner HR | MIT Sloan Management Review | Economic Times HR | Business Today | Workforce Magazine | NASSCOM | Josh Bersin Academy",
  "url": "Full realistic URL path — e.g. https://www.shrm.org/topics-tools/news/talent-acquisition/skill-based-hiring-technology-2025 or https://hbr.org/2025/04/rethinking-employee-recognition-india or https://www.peoplematters.in/article/talent-management/infosys-campus-ai-hiring-2025",
  "date": "${dateStr}",
  "category": "TA",
  "readTime": 5,
  "keyInsight": "One stat or takeaway that would impress in an HR interview — under 15 words"
}

4 distinct topics per category — each from a completely different angle:
TA: [skill-based hiring methodology] [AI candidate screening ROI] [employer branding on social media] [structured vs unstructured interviews]
HRBP: [HRBP to strategic partner transition] [org design in post-merger integration] [HR OKRs and business KPIs] [workforce planning with finance]
MIS: [predictive attrition modelling] [real-time HR dashboard design] [workforce cost per hire analytics] [people data privacy governance]
LD: [GenAI upskilling at enterprise scale] [70-20-10 learning model ROI] [LXP vs LMS platform decision] [first-time manager capability programs]
RR: [pay transparency law compliance] [total rewards redesign 2025] [ESOP for Series B startups] [peer recognition program effectiveness]
DEI: [gender pay audit step-by-step] [disability-inclusive hiring process] [allyship training effectiveness data] [DEI scorecard & accountability metrics]
COMP: [India Labour Code 4-in-1 update] [POSH Act internal committee compliance] [gig worker misclassification risk] [EPF automation with HRMS]
WELL: [burnout early warning indicators] [EAP utilisation benchmarks] [4-day workweek productivity data] [financial wellness program ROI]
TECH: [AI HRMS copilot adoption] [migrating from legacy SAP HR] [HR chatbot deflection rates] [bias in algorithmic hiring tools]
LEAD: [toxic manager early detection] [CEO succession planning failure causes] [managing psychological safety in hybrid] [culture due diligence in M&A]
GLOB: [digital nomad visa HR implications] [India GCC talent competition 2025] [multi-country payroll compliance] [global DEI benchmark gaps]
CAREER: [SHRM-CP vs PHRi — which to pursue] [HR case interview 3-step framework] [HR business partner salary benchmarks India 2025] [building an HR portfolio for placements]

Companies to use (each used only ONCE across all 48 articles): Infosys, TCS, Wipro, HCL Technologies, Accenture India, Microsoft India, Google India, Amazon India, Tata Consultancy, Reliance Industries, HDFC Bank, ICICI Bank, Zomato, Swiggy, Flipkart, PhonePe, Paytm, Byju's, Ola Electric, Mahindra Group, L&T, Bajaj Auto, Asian Paints, Nestle India, HUL, ITC, Deloitte India, KPMG India, PwC India, EY India, Aon India, Mercer India, Spencer Stuart India, Korn Ferry India`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 32768 }
      })
    }
  )

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!raw) throw new Error('Gemini returned an empty response — please retry')

  // ── Layer 1: Clean markdown wrappers ──────────────
  const clean = raw.replace(/```json|```/g, '').trim()

  // ── Layer 2: Extract JSON array boundaries ─────────
  const jsonStart = clean.indexOf('[')
  const jsonEnd   = clean.lastIndexOf(']')
  if (jsonStart === -1) throw new Error('Gemini did not return a JSON array. Raw response: ' + clean.slice(0, 200))

  let jsonStr = jsonStart !== -1 && jsonEnd !== -1
    ? clean.slice(jsonStart, jsonEnd + 1)
    : clean.slice(jsonStart)

  // ── Layer 3: Smart JSON repair for truncated responses ──
  let parsed = null
  try {
    parsed = JSON.parse(jsonStr)
  } catch (firstErr) {
    // Try to salvage partial JSON — find last complete object
    console.warn('Full JSON parse failed, attempting repair…', firstErr.message)
    try {
      // Find last complete }, before truncation
      const lastComplete = jsonStr.lastIndexOf('},')
      if (lastComplete > 100) {
        const repaired = jsonStr.slice(0, lastComplete + 1) + ']'
        parsed = JSON.parse(repaired)
        console.info(`Repaired truncated JSON — recovered ${parsed.length} articles`)
      }
    } catch {}

    // If repair also failed, try extracting individual objects
    if (!parsed) {
      try {
        const objects = []
        const objRegex = /\{[^{}]*"title"[^{}]*"summary"[^{}]*\}/gs
        const matches = jsonStr.match(objRegex) || []
        for (const m of matches) {
          try { objects.push(JSON.parse(m)) } catch {}
        }
        if (objects.length > 0) {
          parsed = objects
          console.info(`Extracted ${objects.length} articles via regex fallback`)
        }
      } catch {}
    }

    if (!parsed || parsed.length === 0) {
      throw new Error(
        `Gemini response was too long and got cut off (${raw.length} chars). ` +
        `This happens with 48-article requests. Click Retry — it usually works on the second attempt. ` +
        `Parse error: ${firstErr.message}`
      )
    }
  }

  if (!Array.isArray(parsed)) throw new Error('Gemini returned non-array JSON — please retry')
  if (parsed.length === 0)   throw new Error('Gemini returned empty array — please retry')

  // ── Layer 4: Normalise each article ───────────────
  const withIds = parsed
    .filter(a => a && typeof a === 'object' && a.title && a.summary)
    .map((a, i) => ({
      ...a,
      id:  a.id  || `art_${dateStr}_${String(i+1).padStart(3,'0')}`,
      url: (a.url && a.url !== '#' && a.url.startsWith('http'))
        ? a.url
        : (SOURCE_URLS[a.source] || 'https://www.shrm.org/topics-tools/news'),
      summary: a.summary || '',
      source:  a.source  || 'People Matters',
      date:    a.date    || dateStr,
      category: a.category || 'TA',
    }))

  if (withIds.length === 0) throw new Error('All articles were malformed — please retry')

  // ── Layer 5: Post-generation dedup ────────────────
  return deduplicateArticles(withIds)
}

// ── LocalStorage helpers ──────────────────────────────
function loadNewsForDate(d) {
  try { return JSON.parse(localStorage.getItem(newsKey(d)) || 'null') } catch { return null }
}
function saveNewsForDate(d, articles) {
  try { localStorage.setItem(newsKey(d), JSON.stringify(articles)) } catch {}
  // Prune older than 8 days
  for (let i = 8; i < 15; i++) {
    const old = new Date(); old.setDate(old.getDate() - i)
    localStorage.removeItem(newsKey(old.toISOString().split('T')[0]))
  }
}

function loadNotes()  { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] } }
function saveNotes(n) { try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)) } catch {} }

// Saved articles: store full article objects so they're available even without the day's cache
function loadSavedArticles()  { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function saveSavedArticles(a) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(a)) } catch {} }

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
  const [theme,         setTheme]         = useState(() => localStorage.getItem(THEME_KEY) || 'light')
  const [apiKey,        setApiKey]        = useState(() => localStorage.getItem(APIKEY_KEY) || '')
  const [keyInput,      setKeyInput]      = useState('')
  const [activeTab,     setActiveTab]     = useState('all')
  const [viewDate,      setViewDate]      = useState(todayStr())
  const [searchQuery,   setSearchQuery]   = useState('')
  const [articlesByDate,setArticlesByDate]= useState({})
  const [loadingDate,   setLoadingDate]   = useState(null)
  const [errorByDate,   setErrorByDate]   = useState({})
  // Saved: full article objects, persisted forever
  const [savedArticles, setSavedArticles] = useState(loadSavedArticles)
  const [notes,         setNotes]         = useState(loadNotes)
  const [lastRefresh,   setLastRefresh]   = useState(null)
  const [toasts,        setToasts]        = useState([])
  const [sessionSec,    setSessionSec]    = useState(loadTodayTime)
  const abortRef = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => { saveSavedArticles(savedArticles) }, [savedArticles])
  useEffect(() => { saveNotes(notes) }, [notes])
  useEffect(() => {
    const t = setInterval(() => setSessionSec(s => { const n=s+1; saveTodayTime(n); return n }), 1000)
    return () => clearInterval(t)
  }, [])

  const toast = useCallback((msg, type='info') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3200)
  }, [])

  const fetchNews = useCallback(async (date, force=false) => {
    if (!apiKey) return
    if (!force && articlesByDate[date]?.length > 0) return
    if (!force) {
      const cached = loadNewsForDate(date)
      if (cached?.length > 0) {
        setArticlesByDate(prev => ({ ...prev, [date]: cached }))
        return
      }
    }
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoadingDate(date)
    setErrorByDate(prev => ({ ...prev, [date]: null }))

    // Auto-retry up to 2 times on failure
    const MAX_RETRIES = 2
    let lastError = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          // Brief pause before retry
          await new Promise(r => setTimeout(r, 1500))
          toast(`Retry ${attempt}/${MAX_RETRIES} — Gemini response was incomplete…`, 'info')
        }
        const data = await fetchNewsFromGemini(apiKey, date, abortRef.current.signal)
        setArticlesByDate(prev => ({ ...prev, [date]: data }))
        saveNewsForDate(date, data)
        setLastRefresh(new Date())
        toast(`${data.length} articles loaded`, 'success')
        lastError = null
        break // success — stop retrying
      } catch(e) {
        if (e.name === 'AbortError') { setLoadingDate(null); return }
        lastError = e
        console.error(`Attempt ${attempt} failed:`, e.message)
        if (attempt === MAX_RETRIES) {
          // All retries exhausted — show clear error
          const errorMsg = e.message.length > 300 ? e.message.slice(0, 300) + '…' : e.message
          setErrorByDate(prev => ({ ...prev, [date]: errorMsg }))
          toast('Failed after ' + MAX_RETRIES + ' attempts — see error screen', 'error')
        }
      }
    }

    setLoadingDate(null)
  }, [apiKey, articlesByDate, toast])

  useEffect(() => { if (apiKey && viewDate) fetchNews(viewDate, false) }, [apiKey, viewDate]) // eslint-disable-line

  const currentArticles = articlesByDate[viewDate] || []
  const isLoading = loadingDate === viewDate
  const currentError = errorByDate[viewDate] || null

  // Saved article IDs set for quick lookup
  const savedIds = new Set(savedArticles.map(a => a.id))

  // Filtered articles for news feed
  const filteredArticles = currentArticles.filter(a => {
    if (activeTab !== 'all' && a.category !== activeTab) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return a.title.toLowerCase().includes(q) ||
             a.summary.toLowerCase().includes(q) ||
             a.source.toLowerCase().includes(q)
    }
    return true
  })

  const counts = CATEGORIES.reduce((acc, c) => {
    acc[c.id] = c.id==='all' ? currentArticles.length : currentArticles.filter(a=>a.category===c.id).length
    return acc
  }, { saved: savedArticles.length })

  // Toggle save — stores FULL article object so saved screen works forever
  const toggleSave = useCallback((articleOrId) => {
    if (typeof articleOrId === 'string') {
      // Called with just ID — remove from saved
      setSavedArticles(p => p.filter(a => a.id !== articleOrId))
      return
    }
    const article = articleOrId
    setSavedArticles(prev => {
      const exists = prev.find(a => a.id === article.id)
      if (exists) return prev.filter(a => a.id !== article.id)
      return [{ ...article, savedAt: new Date().toISOString() }, ...prev]
    })
  }, [])

  const createNote = useCallback(n => {
    const note = { ...n, id:'note_'+Date.now(), createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() }
    setNotes(p => [note,...p]); toast('Note saved','success'); return note
  }, [toast])
  const updateNote = useCallback((id,u) => {
    setNotes(p=>p.map(n=>n.id===id?{...n,...u,updatedAt:new Date().toISOString()}:n)); toast('Note updated','success')
  }, [toast])
  const deleteNote = useCallback(id => { setNotes(p=>p.filter(n=>n.id!==id)); toast('Note deleted','error') }, [toast])

  function saveKey() { const k=keyInput.trim(); if(!k)return; localStorage.setItem(APIKEY_KEY,k); setApiKey(k) }
  function clearKey() { localStorage.removeItem(APIKEY_KEY); setApiKey(''); setArticlesByDate({}); setKeyInput('') }

  if (!apiKey) return (
    <div className="setup-screen">
      <div className="setup-box">
        <div className="setup-logo">HR <span>Intel</span></div>
        <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,fontFamily:'var(--font-body)'}}>
          48 curated HR articles daily across 12 domains, personal notes, 7-day archive, time tracking and a permanent saved library.
          Enter your <strong>Gemini API key</strong> to begin.
        </p>
        <div className="form-group">
          <label className="form-label">Gemini API Key</label>
          <input className="form-input" type="password" placeholder="AIzaSy..."
            value={keyInput} onChange={e=>setKeyInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&saveKey()} autoFocus />
        </div>
        <button className="btn btn-primary" onClick={saveKey} disabled={!keyInput.trim()}
          style={{width:'100%',justifyContent:'center',padding:'12px'}}>
          Launch Dashboard
        </button>
        <p style={{fontSize:11,color:'var(--text-caption)',textAlign:'center',fontFamily:'var(--font-ui)'}}>
          Free key at{' '}
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
            style={{color:'var(--accent)'}}>aistudio.google.com</a>
          {' '}· Stored in your browser only
        </p>
      </div>
    </div>
  )

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
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts} />
        <main className="main-content">
          {activeTab === 'notes' ? (
            <NotesPanel notes={notes} onCreate={createNote} onUpdate={updateNote} onDelete={deleteNote} searchQuery={searchQuery} />
          ) : activeTab === 'saved' ? (
            <SavedPanel savedArticles={savedArticles} onToggleSave={toggleSave} searchQuery={searchQuery} />
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
              currentArticles={currentArticles}
            />
          )}
        </main>
      </div>
      <Toast toasts={toasts} />
    </div>
  )
}
