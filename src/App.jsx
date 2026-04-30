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

// ── Similarity engine — Jaccard coefficient on word sets ──
// Strips stopwords, punctuation, numbers then computes
// |intersection| / |union| — returns 0.0 to 1.0

const STOP_WORDS = new Set([
  'about','their','which','would','could','should','through','across',
  'between','within','while','where','those','these','there','have',
  'with','from','that','this','will','been','being','india','indian',
  'company','firms','using','based','after','human','resource','resources',
  'management','global','report','study','survey','shows','reveals','finds',
  'found','according','percent','annual','latest','sector','market',
  'talent','hiring','employee','workforce','workplace','organization',
  'business','leader','people','teams','skills','work','roles','data',
  'strategy','growth','change','digital','learning','performance',
  'new','year','says','more','than','into','also','over','when',
  'what','your','they','were','does','make','just','know','take',
])

function tokenise(text) {
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')   // strip punctuation/numbers
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  )
}

function jaccardSimilarity(textA, textB) {
  const a = tokenise(textA)
  const b = tokenise(textB)
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter(w => b.has(w)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

// DUPLICATE_THRESHOLD — 0.30 = 30% word overlap triggers duplicate flag
const DUPLICATE_THRESHOLD = 0.30

// Loads titles from last N days for cross-day dedup
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

// Returns articles with a `dupScore` field added (0.0–1.0)
// Articles >= DUPLICATE_THRESHOLD are filtered out
// This runs on the COMBINED output of all 3 batches
function deduplicateArticles(articles) {
  const accepted = []   // titles that passed
  const result   = []

  for (const article of articles) {
    let maxSimilarity = 0

    // Check against every already-accepted article
    for (const seenTitle of accepted) {
      const sim = jaccardSimilarity(article.title, seenTitle)
      if (sim > maxSimilarity) maxSimilarity = sim
      if (sim >= DUPLICATE_THRESHOLD) break  // early exit
    }

    const isDup = maxSimilarity >= DUPLICATE_THRESHOLD

    // Always include article in result — flag duplicates visually
    // instead of silently dropping them (helps debugging)
    result.push({
      ...article,
      dupScore: Math.round(maxSimilarity * 100),  // e.g. 45 = 45% similar
      isDuplicate: isDup,
    })

    if (!isDup) accepted.push(article.title)
  }

  // Filter out duplicates — they're logged but not shown
  const unique = result.filter(a => !a.isDuplicate)
  const dupsRemoved = result.length - unique.length
  if (dupsRemoved > 0) {
    console.info(
      '[HR Intel] Dedup removed ' + dupsRemoved + ' duplicate(s) at ' +
      (DUPLICATE_THRESHOLD * 100) + '% similarity threshold'
    )
  }
  return unique
}

// Cross-day dedup — checks new articles against last 5 days
// Returns articles that are NOT similar to any recent one
function crossDayDedup(articles, recentTitles) {
  if (recentTitles.length === 0) return articles
  return articles.filter(article => {
    for (const recentTitle of recentTitles) {
      const sim = jaccardSimilarity(article.title, recentTitle)
      if (sim >= DUPLICATE_THRESHOLD) {
        console.info(
          '[HR Intel] Cross-day dup removed: "' + article.title +
          '" (' + Math.round(sim*100) + '% similar to "' + recentTitle + '")'
        )
        return false
      }
    }
    return true
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

// Single batch call — asks for exactly the categories given
async function fetchBatch(apiKey, dateStr, signal, categories, batchNum, forbiddenBlock) {
  const displayDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  })

  const catList = categories.join(', ')
  const count   = categories.length * 4  // 4 per category

  const prompt = `You are an HR journalist. Generate ${count} HR news articles for ${displayDate}.
${forbiddenBlock}
STRICT RULES:
- Return RAW JSON array only. No markdown. No backticks. Start with [ end with ]
- Exactly 4 articles per category for these categories: ${catList}
- Each summary: 3 paragraphs, 150 words total: (1) key stat + company + report name+year (2) business context + second data point (3) actionable recommendation
- Each article must name a DIFFERENT company — no repeats within this batch
- URL must be a realistic full path for the source domain

JSON per article:
{"id":"art_${dateStr}_${batchNum}_001","title":"Specific headline max 14 words","summary":"150 word summary here","source":"SHRM or Harvard Business Review or People Matters or HR Dive or McKinsey & Company or Deloitte Insights or LinkedIn Talent Solutions or Gartner HR or MIT Sloan Management Review or Economic Times HR or Business Today or Workforce Magazine or NASSCOM or Josh Bersin Academy","url":"https://source-domain.com/realistic/path","date":"${dateStr}","category":"${categories[0]}","readTime":5,"keyInsight":"Key stat under 15 words"}

Categories and 4 unique topics each (cover all 4):
TA: skill-based hiring, AI candidate screening, employer branding ROI, campus hiring strategy
HRBP: strategic HRBP evolution, workforce planning, org design post-merger, HR OKRs
MIS: attrition prediction models, HR dashboards, people data governance, workforce cost analytics
LD: GenAI upskilling, 70-20-10 model, LXP vs LMS, manager capability programs
RR: pay transparency laws, total rewards redesign, ESOP for startups, recognition program ROI
DEI: gender pay audit, disability inclusion hiring, allyship programs, DEI accountability metrics
COMP: India Labour Codes 2025, POSH Act compliance, gig worker classification, EPF automation
WELL: burnout early warning, EAP utilisation rates, 4-day workweek pilots, financial wellness ROI
TECH: AI HRMS copilot, legacy SAP migration, HR chatbot deflection, ethical AI in hiring
LEAD: toxic manager detection, CEO succession failures, hybrid team leadership, psychological safety
GLOB: digital nomad visa policies, India GCC talent war, cross-border payroll, global DEI benchmarks
CAREER: SHRM-CP vs PHRi decision, HR case interview framework, HR salary benchmarks 2025, HR portfolio

Companies (use each only once across batch): Infosys TCS Wipro HCL Accenture Microsoft Google Amazon Tata Reliance HDFC Zomato Flipkart PhonePe Mahindra Bajaj HUL ITC Deloitte KPMG PwC EY Aon Mercer Nestle L&T Byju's Swiggy`

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
  const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!raw) throw new Error('Gemini returned empty response')

  const parsed = safeParseJSON(raw)
  if (!Array.isArray(parsed) || parsed.length === 0)
    throw new Error('Gemini returned no articles')

  return parsed
    .filter(a => a && a.title && a.summary && categories.includes(a.category))
    .map((a, i) => ({
      ...a,
      id: `art_${dateStr}_b${batchNum}_${String(i+1).padStart(3,'0')}`,
      category: a.category || categories[0],
      date:     a.date     || dateStr,
      url: (a.url && a.url !== '#' && a.url.startsWith('http'))
        ? a.url
        : (SOURCE_URLS[a.source] || 'https://www.shrm.org/topics-tools/news'),
    }))
}

// Main fetch — 3 parallel calls × 4 categories × 4 articles = 48 total
async function fetchNewsFromGemini(apiKey, dateStr, signal) {
  // Step 1: get last 5 days titles for cross-day dedup + prompt injection
  const recentTitles = getRecentTitles(5)
  const forbiddenBlock = recentTitles.length > 0
    ? 'FORBIDDEN topics (covered last 5 days, do NOT repeat):\n' +
      recentTitles.slice(0, 25).map((t, i) => (i+1) + '. ' + t).join('\n') + '\n'
    : ''

  const batch1Cats = ['TA','HRBP','MIS','LD']
  const batch2Cats = ['RR','DEI','COMP','WELL']
  const batch3Cats = ['TECH','LEAD','GLOB','CAREER']

  // Step 2: fire all 3 batches in parallel
  const [b1, b2, b3] = await Promise.allSettled([
    fetchBatch(apiKey, dateStr, signal, batch1Cats, 1, forbiddenBlock),
    fetchBatch(apiKey, dateStr, signal, batch2Cats, 2, forbiddenBlock),
    fetchBatch(apiKey, dateStr, signal, batch3Cats, 3, forbiddenBlock),
  ])

  const a1 = b1.status === 'fulfilled' ? b1.value : []
  const a2 = b2.status === 'fulfilled' ? b2.value : []
  const a3 = b3.status === 'fulfilled' ? b3.value : []

  if (a1.length === 0 && a2.length === 0 && a3.length === 0) {
    const e1 = b1.status === 'rejected' ? b1.reason?.message : ''
    const e2 = b2.status === 'rejected' ? b2.reason?.message : ''
    const e3 = b3.status === 'rejected' ? b3.reason?.message : ''
    throw new Error('All 3 batches failed. ' + [e1,e2,e3].filter(Boolean).join(' | '))
  }

  // Step 3: combine all batches
  const combined = [...a1, ...a2, ...a3]

  // Step 4: cross-day dedup — remove anything too similar to last 5 days
  const afterCrossDay = crossDayDedup(combined, recentTitles)

  // Step 5: same-day dedup — remove duplicates within today's articles
  const final = deduplicateArticles(afterCrossDay)

  console.info(
    '[HR Intel] Fetch complete —',
    'raw:', combined.length,
    '| after cross-day dedup:', afterCrossDay.length,
    '| after same-day dedup:', final.length
  )

  return final
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
