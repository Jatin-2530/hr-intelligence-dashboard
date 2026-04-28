# HR Intel — Daily HR Intelligence Dashboard

A personal HR command center for students and professionals preparing for HR roles. Powered by Claude AI for daily news curation across **TA, HRBP, MIS/Analytics, L&D, and R&R** domains.

![Dashboard Preview](https://img.shields.io/badge/React-18-61DAFB?logo=react) ![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite) ![GitHub Pages](https://img.shields.io/badge/Deployed-GitHub_Pages-222?logo=github)

---

## Features

| Feature | Details |
|---|---|
| **AI-Powered News** | Claude AI generates 20 curated HR articles daily across 5 domains |
| **Auto-refresh** | 24-hour cache — news refreshes every day automatically |
| **5 HR Domains** | TA · HRBP · MIS/Analytics · L&D · Rewards & Recognition |
| **Personal Notes** | Create, edit, delete notes with tags and category labels |
| **Smart Tagging** | Assign industry tags: Automotive, Finance, Consulting, Tech, FMCG, Pharma |
| **Save Articles** | Bookmark articles with cross-session persistence |
| **Search & Filter** | Search across news and notes; filter by domain, date, or tag |
| **Dark / Light Mode** | Persistent theme toggle |
| **Mobile Responsive** | Works on phones, tablets, and desktops |
| **LocalStorage** | All notes and saved articles persist in browser storage |

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/hr-intelligence-dashboard.git
cd hr-intelligence-dashboard
npm install
```

### 2. Run Locally

```bash
npm run dev
```

Open `http://localhost:5173` — the app will load and call the Claude API to generate your first news brief.

### 3. Build for Production

```bash
npm run build
```

The `dist/` folder is ready to serve from any static host.

---

## Deploy to GitHub Pages

### Automatic (Recommended)

1. **Fork or push** this repo to your GitHub account
2. Go to **Settings → Pages → Source** → set to **GitHub Actions**
3. Push to `main` — the workflow in `.github/workflows/deploy.yml` automatically builds and deploys
4. Your dashboard is live at `https://YOUR_USERNAME.github.io/hr-intelligence-dashboard/`

### Manual

```bash
npm run build
# Upload the dist/ folder contents to your GitHub Pages branch
```

---

## Architecture

```
src/
├── main.jsx              # React entry point
├── App.jsx               # Root component — state, API calls, data flow
├── index.css             # Design system: tokens, layout, all styles
└── components/
    ├── Header.jsx         # Top bar: search, theme toggle, refresh
    ├── Sidebar.jsx        # Category navigation with article counts
    ├── NewsFeed.jsx       # News display with grouping and filters
    ├── NewsCard.jsx       # Individual article card
    ├── NotesPanel.jsx     # Full notes system: list + editor
    └── Toast.jsx          # Notification toasts
```

### Data Flow

```
App renders → checkLocalStorage cache
  ├── Cache valid (< 24h)  → render cached articles
  └── Cache stale / empty  → call Claude API
                              ↓
                           Claude generates 20 articles (JSON)
                              ↓
                           saveToLocalStorage → render articles
```

### News Classification

Claude AI classifies each article into one of 5 categories:
- **TA** — Talent Acquisition, hiring, recruitment, sourcing
- **HRBP** — HR Business Partnering, org design, employee relations
- **MIS** — HR Analytics, workforce data, HR tech, dashboards
- **LD** — Learning & Development, training, upskilling, LMS
- **RR** — Rewards & Recognition, compensation, benefits, engagement

### Storage Schema

**News Cache** (`hrid_news_cache`):
```json
{
  "articles": [...],
  "ts": 1714204800000
}
```

**Notes** (`hrid_notes`):
```json
[{
  "id": "note_1714204800000",
  "title": "...",
  "content": "...",
  "category": "TA",
  "tags": ["Tech", "Finance"],
  "createdAt": "2026-04-28T06:00:00.000Z",
  "updatedAt": "2026-04-28T06:00:00.000Z"
}]
```

**Saved Articles** (`hrid_saved`): `["art_001", "art_003", ...]`

---

## Customisation

### Change refresh interval
In `App.jsx`, update:
```js
const CACHE_TTL_MS = 24 * 60 * 60 * 1000  // 24 hours
```

### Add more news sources
Edit the prompt in `fetchNewsFromClaude()` in `App.jsx` to specify additional sources.

### Add more industry tags
Edit `TAG_PRESETS` in `NotesPanel.jsx` and `TAG_COLORS` in `App.jsx`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| AI / News | Anthropic Claude API |
| Icons | Lucide React |
| Fonts | Syne + DM Sans + DM Mono (Google Fonts) |
| Storage | LocalStorage |
| Deployment | GitHub Actions → GitHub Pages |

---

## License

MIT — built for HR learning and placement preparation.
