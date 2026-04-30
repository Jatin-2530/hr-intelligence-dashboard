import { useState, useEffect, useCallback, useRef } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import NewsFeed from './components/NewsFeed.jsx'
import NotesPanel from './components/NotesPanel.jsx'
import SavedPanel from './components/SavedPanel.jsx'
import Toast from './components/Toast.jsx'

const NOTES_KEY  = 'hrid_notes'
const SAVED_KEY  = 'hrid_saved'
const THEME_KEY  = 'hrid_theme'
const APIKEY_KEY = 'hrid_gemini_key'
const TIME_KEY   = 'hrid_time'

function todayStr() { return new Date().toISOString().split('T')[0] }
function newsKey(d) { return `hrid_news_${d}` }

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

// ── Dedup helpers ─────────────────────────────────────
const STOP_WORDS = new Set([
  'about','their','which','would','could','should','through','across',
  'between','within','while','where','those','these','there','have',
  'with','from','that','this','will','been','being','india','indian',
  'company','firms','using','based','after','human','resource','resources',
  'management','global','report','study','survey','shows','reveals','finds',
  'found','according','percent','annual','latest','sector','market',
])

function getRecentTitles(daysBack = 5) {
  const titles = []
  for (let i = 1; i <= daysBack; i++) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = newsKey(d.toISOString().split('T')[0])
    try {
      const cached = JSON.parse(localStorage.getItem(key) || 'null')
      if (cached) cached.forEach(a => titles.push(a.title))
    } catch {}
  }
  return titles
}

function deduplicateArticles(articles) {
  const seen = []
  return articles.filter(article => {
    const words = new Set(
      article.title.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4 && !STOP_WORDS.has(w))
    )
    const isDup = seen.some(prev => {
      const prevWords = new Set(
        prev.toLowerCase().split(/\s+/)
          .filter(w => w.length > 4 && !STOP_WORDS.has(w))
      )
      const overlap = [...words].filter(w => prevWords.has(w))
      return overlap.length >= 3
    })
    if (!isDup) { seen.push(article.title); return true }
    return false
  })
}

// ── JSON repair — salvages truncated Gemini responses ─
function safeParseJSON(raw) {
  // Clean markdown
  const clean = raw.replace(/```json|```/g, '').trim()
  const jsonStart = clean.indexOf('[')
  if (jsonStart === -1) throw new Error('No JSON array found in Gemini response')
  const jsonEnd = clean.lastIndexOf(']')

  // Try full parse first
  if (jsonEnd !== -1) {
    try { return JSON.parse(clean.slice(jsonStart, jsonEnd + 1)) } catch {}
  }

  // Truncated — find last complete object
  const partial = jsonEnd !== -1
    ? clean.slice(jsonStart, jsonEnd + 1)
    : clean.slice(jsonStart)

  const lastComma = partial.lastIndexOf('},')
  if (lastComma > 50) {
    try {
      const repaired = partial.slice(0, lastComma + 1) + ']'
      const result = JSON.parse(repaired)
      console.info(`JSON repaired — recovered ${result.length} articles from truncated response`)
      return result
    } catch {}
  }

  throw new Error(
    'Gemini response was cut off and could not be repaired. ' +
    'This usually resolves on retry. Click the refresh button to try again.'
  )
}

// ── Gemini API ────────────────────────────────────────
async function fetchNewsFromGemini(apiKey, dateStr, signal) {
  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  const recentTitles = getRecentTitles(5)
  const forbiddenBlock = recentTitles.length > 0
    ? `\nFORBIDDEN — already covered in last 5 days, do NOT repeat these topics or companies:\n${recentTitles.slice(0,30).map((t,i) => `${i+1}. ${t}`).join('\n')}\n`
    : ''

  const prompt = `You are a senior HR intelligence journalist. Generate 36 unique HR news articles for ${displayDate}.
${forbiddenBlock}
RULES — follow strictly:
- Return a raw JSON array only. Zero markdown. Zero backticks. Start with [ end with ]
- Exactly 3 articles per category: TA, HRBP, MIS, LD, RR, DEI, COMP, WELL, TECH, LEAD, GLOB, CAREER
- Each summary must be 150-200 words — write 3 full paragraphs
- Every article must name a different company (no repeats across 36 articles)
- Every article must cite a specific named research report with year
- URL must be a realistic full path for that source

JSON per article:
{
  "id": "art_${dateStr}_001",
  "title": "Specific headline with company or stat, max 14 words",
  "summary": "Paragraph 1 (50-70 words): Core finding with exact stat and company name and report citation. Paragraph 2 (60-80 words): Business context, why it matters, second data point from different source, challenge for HR teams. Paragraph 3 (30-50 words): One specific actionable recommendation for an HR practitioner or student.",
  "source": "SHRM or Harvard Business Review or People Matters or HR Dive or McKinsey & Company or Deloitte Insights or LinkedIn Talent Solutions or Gartner HR or MIT Sloan Management Review or Economic Times HR or Business Today or Workforce Magazine or NASSCOM or Josh Bersin Academy",
  "url": "https://realistic-source-domain.com/realistic/path/matching/article/topic",
  "date": "${dateStr}",
  "category": "TA",
  "readTime": 5,
  "keyInsight": "Single most important stat or takeaway under 15 words"
}

3 distinct topics per category:
TA: skill-based hiring, AI screening tools, employer branding
HRBP: strategic HRBP role, workforce planning, change management
MIS: attrition prediction, HR dashboards, people data governance
LD: GenAI upskilling, 70-20-10 model, LXP adoption
RR: pay transparency, total rewards redesign, ESOP trends
DEI: gender pay audit, disability inclusion, DEI metrics
COMP: India Labour Codes, POSH compliance, gig worker rights
WELL: burnout indicators, EAP utilisation, 4-day workweek
TECH: AI HRMS copilot, legacy system migration, HR chatbots
LEAD: toxic manager detection, CEO succession, psychological safety
GLOB: digital nomad visas, India GCC talent, cross-border payroll
CAREER: SHRM-CP vs PHRi, HR case interview, HR salary benchmarks

Use each company only once across all 36: Infosys TCS Wipro HCL Accenture Microsoft Google Amazon Tata Reliance HDFC Zomato Flipkart PhonePe Mahindra Bajaj HUL ITC Deloitte KPMG PwC EY Aon Mercer Nestle Asian-Paints L&T Byju's Swiggy Ola`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 16384 }
      })
    }
  )

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e?.error?.message || `Gemini API error ${res.status}`)
  }

  const data = await res.json()
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!raw) throw new Error('Gemini returned an empty response — please retry')

  const parsed = safeParseJSON(raw)

  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error('Gemini returned no articles — please retry')

  const normalised = parsed
    .filter(a => a && a.title && a.summary)
    .map((a, i) => ({
      ...a,
      id:       a.id       || `art_${dateStr}_${String(i+1).padStart(3,'0')}`,
      category: a.category || 'TA',
      date:     a.date     || dateStr,
      url: (a.url && a.url !== '#' && a.url.startsWith('http'))
        ? a.url
        : (SOURCE_URLS[a.source] || 'https://www.shrm.org/topics-tools/news'),
    }))

  return deduplicateArticles(normalised)
}

// ── Storage helpers ───────────────────────────────────
function loadNewsForDate(d)      { try { return JSON.parse(localStorage.getItem(newsKey(d)) || 'null') } catch { return null } }
function saveNewsForDate(d, arr) {
  try { localStorage.setItem(newsKey(d), JSON.stringify(arr)) } catch {}
  for (let i = 8; i < 15; i++) {
    const old = new Date(); old.setDate(old.getDate() - i)
    localStorage.removeItem(newsKey(old.toISOString().split('T')[0]))
  }
}
function loadNotes()     { try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] } }
function saveNotes(n)    { try { localStorage.setItem(NOTES_KEY, JSON.stringify(n)) } catch {} }
function loadSaved()     { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') } catch { return [] } }
function saveSaved(a)    { try { localStorage.setItem(SAVED_KEY, JSON.stringify(a)) } catch {} }
function loadTodayTime() {
  try { const r = JSON.parse(localStorage.getItem(TIME_KEY)||'null'); return r?.date===todayStr() ? r.seconds||0 : 0 } catch { return 0 }
}
function saveTodayTime(s) { try { localStorage.setItem(TIME_KEY, JSON.stringify({ date:todayStr(), seconds:s })) } catch {} }

function getPastDays(n=7) {
  return Array.from({length:n},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-i); return d.toISOString().split('T')[0] })
}

// ── App ───────────────────────────────────────────────
export default function App() {
  const [theme,          setTheme]          = useState(()=>localStorage.getItem(THEME_KEY)||'light')
  const [apiKey,         setApiKey]         = useState(()=>localStorage.getItem(APIKEY_KEY)||'')
  const [keyInput,       setKeyInput]       = useState('')
  const [activeTab,      setActiveTab]      = useState('all')
  const [viewDate,       setViewDate]       = useState(todayStr())
  const [searchQuery,    setSearchQuery]    = useState('')
  const [articlesByDate, setArticlesByDate] = useState({})
  const [loadingDate,    setLoadingDate]    = useState(null)
  const [errorByDate,    setErrorByDate]    = useState({})
  const [savedArticles,  setSavedArticles]  = useState(loadSaved)
  const [notes,          setNotes]          = useState(loadNotes)
  const [lastRefresh,    setLastRefresh]    = useState(null)
  const [toasts,         setToasts]         = useState([])
  const [sessionSec,     setSessionSec]     = useState(loadTodayTime)
  const abortRef = useRef(null)

  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); localStorage.setItem(THEME_KEY,theme) },[theme])
  useEffect(()=>{ saveSaved(savedArticles) },[savedArticles])
  useEffect(()=>{ saveNotes(notes) },[notes])
  useEffect(()=>{
    const t=setInterval(()=>setSessionSec(s=>{ const n=s+1; saveTodayTime(n); return n }),1000)
    return ()=>clearInterval(t)
  },[])

  const toast = useCallback((msg,type='info')=>{
    const id=Date.now()
    setToasts(p=>[...p,{id,msg,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3200)
  },[])

  const fetchNews = useCallback(async (date, force=false)=>{
    if (!apiKey) return
    if (!force && articlesByDate[date]?.length>0) return
    if (!force) {
      const cached = loadNewsForDate(date)
      if (cached?.length>0) { setArticlesByDate(p=>({...p,[date]:cached})); return }
    }
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoadingDate(date)
    setErrorByDate(p=>({...p,[date]:null}))

    // Auto-retry up to 2 times
    for (let attempt=1; attempt<=2; attempt++) {
      try {
        if (attempt>1) {
          await new Promise(r=>setTimeout(r,1500))
          toast(`Retry ${attempt}/2 — Gemini response was incomplete…`,'info')
        }
        const data = await fetchNewsFromGemini(apiKey, date, abortRef.current.signal)
        setArticlesByDate(p=>({...p,[date]:data}))
        saveNewsForDate(date,data)
        setLastRefresh(new Date())
        toast(`${data.length} articles loaded`,'success')
        setLoadingDate(null)
        return
      } catch(e) {
        if (e.name==='AbortError') { setLoadingDate(null); return }
        if (attempt===2) {
          setErrorByDate(p=>({...p,[date]:e.message}))
          toast('Failed after 2 attempts','error')
        }
      }
    }
    setLoadingDate(null)
  },[apiKey, articlesByDate, toast])

  useEffect(()=>{ if(apiKey&&viewDate) fetchNews(viewDate,false) },[apiKey,viewDate]) // eslint-disable-line

  const currentArticles = articlesByDate[viewDate]||[]
  const isLoading       = loadingDate===viewDate
  const currentError    = errorByDate[viewDate]||null
  const savedIds        = new Set(savedArticles.map(a=>a.id))

  const filteredArticles = currentArticles.filter(a=>{
    if (activeTab!=='all' && a.category!==activeTab) return false
    if (searchQuery.trim()) {
      const q=searchQuery.toLowerCase()
      return a.title.toLowerCase().includes(q)||a.summary.toLowerCase().includes(q)||a.source.toLowerCase().includes(q)
    }
    return true
  })

  const counts = CATEGORIES.reduce((acc,c)=>{
    acc[c.id]=c.id==='all'?currentArticles.length:currentArticles.filter(a=>a.category===c.id).length
    return acc
  },{saved:savedArticles.length})

  const toggleSave = useCallback((articleOrId)=>{
    if (typeof articleOrId==='string') { setSavedArticles(p=>p.filter(a=>a.id!==articleOrId)); return }
    setSavedArticles(prev=>{
      const exists=prev.find(a=>a.id===articleOrId.id)
      if (exists) return prev.filter(a=>a.id!==articleOrId.id)
      return [{...articleOrId,savedAt:new Date().toISOString()},...prev]
    })
  },[])

  const createNote = useCallback(n=>{
    const note={...n,id:'note_'+Date.now(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}
    setNotes(p=>[note,...p]); toast('Note saved','success'); return note
  },[toast])
  const updateNote = useCallback((id,u)=>{
    setNotes(p=>p.map(n=>n.id===id?{...n,...u,updatedAt:new Date().toISOString()}:n)); toast('Note updated','success')
  },[toast])
  const deleteNote = useCallback(id=>{ setNotes(p=>p.filter(n=>n.id!==id)); toast('Note deleted','error') },[toast])

  function saveKey()  { const k=keyInput.trim(); if(!k)return; localStorage.setItem(APIKEY_KEY,k); setApiKey(k) }
  function clearKey() { localStorage.removeItem(APIKEY_KEY); setApiKey(''); setArticlesByDate({}); setKeyInput('') }

  if (!apiKey) return (
    <div className="setup-screen">
      <div className="setup-box">
        <div className="setup-logo">HR <span>Intel</span></div>
        <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.7,fontFamily:'var(--font-body)'}}>
          36 curated HR articles daily across 12 domains. Notes, saved library, 7-day archive, time tracking.
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
        onRefresh={()=>fetchNews(viewDate,true)}
        loading={isLoading} lastRefresh={lastRefresh}
        onClearKey={clearKey} sessionSec={sessionSec}
      />
      <div className="app-body">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} counts={counts}/>
        <main className="main-content">
          {activeTab==='notes' ? (
            <NotesPanel notes={notes} onCreate={createNote} onUpdate={updateNote} onDelete={deleteNote} searchQuery={searchQuery}/>
          ) : activeTab==='saved' ? (
            <SavedPanel savedArticles={savedArticles} onToggleSave={toggleSave} searchQuery={searchQuery}/>
          ) : (
            <NewsFeed
              articles={filteredArticles} activeTab={activeTab}
              savedIds={savedIds} onToggleSave={toggleSave}
              loading={isLoading} error={currentError}
              onRetry={()=>fetchNews(viewDate,true)}
              searchQuery={searchQuery}
              viewDate={viewDate} setViewDate={d=>{setViewDate(d);setActiveTab('all')}}
              pastDays={getPastDays(7)}
            />
          )}
        </main>
      </div>
      <Toast toasts={toasts}/>
    </div>
  )
}
