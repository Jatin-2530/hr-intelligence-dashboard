import { Newspaper, Users, Briefcase, BarChart3, GraduationCap, Gift, Bookmark, StickyNote } from 'lucide-react'
import { CATEGORIES } from '../App.jsx'

const CAT_ICONS = {
  all:  <Newspaper size={15} />,
  TA:   <Users size={15} />,
  HRBP: <Briefcase size={15} />,
  MIS:  <BarChart3 size={15} />,
  LD:   <GraduationCap size={15} />,
  RR:   <Gift size={15} />,
}

export default function Sidebar({ activeTab, setActiveTab, counts }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-label">Feed</div>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`nav-item ${activeTab === cat.id ? 'active' : ''}`}
            onClick={() => setActiveTab(cat.id)}
          >
            <span style={{ color: activeTab === cat.id ? cat.color : undefined }}>
              {CAT_ICONS[cat.id]}
            </span>
            <span>{cat.label}</span>
            <span className="nav-count">{counts[cat.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="divider" />

      <div className="sidebar-section">
        <div className="sidebar-label">Library</div>
        <button
          className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <Bookmark size={15} />
          <span>Saved Articles</span>
          <span className="nav-count">{counts.saved ?? 0}</span>
        </button>

        <button
          className={`nav-item ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          <StickyNote size={15} />
          <span>My Notes</span>
        </button>
      </div>

      <div className="sidebar-footer">
        <p>Daily refresh at 6:00 AM</p>
      </div>
    </nav>
  )
}
