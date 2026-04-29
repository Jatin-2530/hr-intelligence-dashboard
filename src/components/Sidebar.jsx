import {
  Newspaper, Users, Briefcase, BarChart3, GraduationCap, Gift,
  Heart, Scale, Smile, Cpu, Globe, Star, StickyNote, Bookmark, Trophy
} from 'lucide-react'
import { CATEGORIES } from '../App.jsx'

const ICONS = {
  all:    <Newspaper size={14} />,
  TA:     <Users size={14} />,
  HRBP:   <Briefcase size={14} />,
  MIS:    <BarChart3 size={14} />,
  LD:     <GraduationCap size={14} />,
  RR:     <Gift size={14} />,
  DEI:    <Heart size={14} />,
  COMP:   <Scale size={14} />,
  WELL:   <Smile size={14} />,
  TECH:   <Cpu size={14} />,
  LEAD:   <Star size={14} />,
  GLOB:   <Globe size={14} />,
  CAREER: <Trophy size={14} />,
}

// Short display names that fit sidebar without truncation
const SIDEBAR_LABELS = {
  TA:     'Talent Acquisition',
  HRBP:   'HR Business Partner',
  MIS:    'HR Analytics & MIS',
  LD:     'Learning & Dev (L&D)',
  RR:     'Rewards & Recog.',
  DEI:    'Diversity & Inclusion',
  COMP:   'HR Law & Compliance',
  WELL:   'Employee Wellbeing',
  TECH:   'HR Technology',
  LEAD:   'Leadership & Culture',
  GLOB:   'Global HR Trends',
  CAREER: 'Career & Interview Prep',
}

export default function Sidebar({ activeTab, setActiveTab, counts }) {
  const main = CATEGORIES.filter(c => c.id !== 'all')
  const special = [
    { id: 'saved', label: 'Saved Articles', icon: <Bookmark size={14} />, color: '#C05A1A' },
    { id: 'notes', label: 'My Notes',       icon: <StickyNote size={14} />, color: '#7C3D8C' },
  ]

  return (
    <nav className="sidebar">
      <div className="sidebar-masthead">
        <h2>Sections</h2>
      </div>

      <div className="sidebar-section">
        <button
          className={`nav-item ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <span style={{ color: activeTab === 'all' ? '#9C8570' : undefined }}>{ICONS.all}</span>
          <span>All Sections</span>
          <span className="nav-count">{counts.all || 0}</span>
        </button>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">HR Domains</div>
        {main.map(cat => (
          <button
            key={cat.id}
            className={`nav-item ${activeTab === cat.id ? 'active' : ''}`}
            onClick={() => setActiveTab(cat.id)}
          >
            <span className="cat-dot" style={{ background: cat.color }} />
            <span>{SIDEBAR_LABELS[cat.id] || cat.label}</span>
            <span className="nav-count">{counts[cat.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Library</div>
        {special.map(s => (
          <button
            key={s.id}
            className={`nav-item ${activeTab === s.id ? 'active' : ''}`}
            onClick={() => setActiveTab(s.id)}
          >
            <span style={{ color: activeTab === s.id ? s.color : undefined }}>{s.icon}</span>
            <span>{s.label}</span>
            {s.id === 'saved' && <span className="nav-count">{counts.saved || 0}</span>}
          </button>
        ))}
      </div>

      <div className="sidebar-footer">
        Fresh daily brief · 12 domains<br />
        Last 7 days archived
      </div>
    </nav>
  )
}
