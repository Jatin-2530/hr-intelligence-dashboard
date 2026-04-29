import { useEffect, useState } from 'react'

const STAGES = [
  { pct: 5,  task: 'Connecting to intelligence sources…'         },
  { pct: 15, task: 'Initialising Gemini AI engine…'              },
  { pct: 28, task: 'Scanning Talent Acquisition signals…'        },
  { pct: 38, task: 'Pulling HR Business Partner insights…'       },
  { pct: 48, task: 'Compiling HR Analytics & MIS data…'         },
  { pct: 56, task: 'Gathering Learning & Development updates…'   },
  { pct: 63, task: 'Sourcing Rewards & Recognition trends…'      },
  { pct: 70, task: 'Aggregating DEI research…'                   },
  { pct: 76, task: 'Reviewing HR Law & Compliance news…'         },
  { pct: 81, task: 'Curating Employee Wellbeing articles…'       },
  { pct: 86, task: 'Fetching HR Technology updates…'             },
  { pct: 90, task: 'Sourcing Leadership & Culture stories…'      },
  { pct: 94, task: 'Compiling Global HR Trends…'                 },
  { pct: 97, task: 'Finalising Career & Interview Prep…'         },
  { pct: 99, task: 'Formatting your daily intelligence brief…'   },
]

export default function LoadingBar({ dateLabel }) {
  const [stageIdx, setStageIdx] = useState(0)
  const [displayPct, setDisplayPct] = useState(0)

  // Advance stages every ~600ms
  useEffect(() => {
    setStageIdx(0)
    setDisplayPct(0)
    const t = setInterval(() => {
      setStageIdx(i => {
        const next = Math.min(i + 1, STAGES.length - 1)
        return next
      })
    }, 620)
    return () => clearInterval(t)
  }, [dateLabel])

  // Smoothly animate percentage toward target
  const targetPct = STAGES[stageIdx].pct
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setDisplayPct(cur => {
        if (cur < targetPct) return Math.min(cur + 2, targetPct)
        return cur
      })
    })
    const t = setInterval(() => {
      setDisplayPct(cur => {
        if (cur < targetPct) return Math.min(cur + 1, targetPct)
        return cur
      })
    }, 30)
    return () => { cancelAnimationFrame(raf); clearInterval(t) }
  }, [targetPct])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '72px 32px',
      gap: 0,
      minHeight: 420,
    }}>
      {/* Masthead */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{
          display: 'inline-block',
          width: 7, height: 7,
          borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulseDot 1.4s ease-in-out infinite',
        }} />
        Building {dateLabel}'s Brief
      </div>

      {/* Percentage number */}
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 64,
        fontWeight: 800,
        lineHeight: 1,
        color: 'var(--text-primary)',
        letterSpacing: '-3px',
        marginBottom: 8,
        minWidth: 120,
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {displayPct}<span style={{ fontSize: 32, color: 'var(--accent)', letterSpacing: 0 }}>%</span>
      </div>

      {/* Progress track */}
      <div style={{
        width: '100%',
        maxWidth: 520,
        marginBottom: 18,
      }}>
        {/* Track */}
        <div style={{
          width: '100%',
          height: 6,
          background: 'var(--bg-elevated)',
          borderRadius: 99,
          border: '1px solid var(--border)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Fill */}
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${displayPct}%`,
            background: `linear-gradient(90deg, var(--accent-hover), var(--accent), #E8962A)`,
            borderRadius: 99,
            transition: 'width 0.3s ease',
            boxShadow: '0 0 8px rgba(192,90,26,0.4)',
          }} />
          {/* Shimmer */}
          <div style={{
            position: 'absolute',
            top: 0, bottom: 0,
            width: 60,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
            animation: 'shimmer 1.6s ease-in-out infinite',
            left: `${displayPct - 8}%`,
          }} />
        </div>

        {/* Tick marks for each section */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          padding: '0 2px',
        }}>
          {['TA','HRBP','MIS','L&D','R&R','DEI','COMP','WELL','TECH','LEAD','GLOB','CAR'].map((s, i) => {
            const sectionPct = ((i + 1) / 12) * 100
            const done = displayPct >= sectionPct - 2
            return (
              <span key={s} style={{
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: done ? 'var(--accent)' : 'var(--text-caption)',
                transition: 'color 0.4s ease',
              }}>{s}</span>
            )
          })}
        </div>
      </div>

      {/* Current task */}
      <div style={{
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)',
        letterSpacing: '0.02em',
        height: 20,
        textAlign: 'center',
        transition: 'opacity 0.3s ease',
      }}>
        {STAGES[stageIdx].task}
      </div>

      {/* Section pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        marginTop: 32,
        maxWidth: 480,
      }}>
        {[
          { id:'TA', color:'#1A5C8C' }, { id:'HRBP', color:'#7C3D8C' },
          { id:'MIS', color:'#1A7A4A' }, { id:'L&D', color:'#C05A1A' },
          { id:'R&R', color:'#B8920A' }, { id:'DEI', color:'#C23870' },
          { id:'COMP', color:'#2C5F7A' }, { id:'WELL', color:'#2A7A5C' },
          { id:'TECH', color:'#4A3A8C' }, { id:'LEAD', color:'#8C4A1A' },
          { id:'GLOB', color:'#1A6A7C' }, { id:'CAREER', color:'#8C2A1A' },
        ].map((cat, i) => {
          const sectionPct = ((i + 1) / 12) * 100
          const done = displayPct >= sectionPct - 2
          return (
            <span key={cat.id} style={{
              padding: '3px 9px',
              borderRadius: 2,
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              border: `1px solid ${done ? cat.color + '60' : 'var(--border)'}`,
              background: done ? cat.color + '18' : 'transparent',
              color: done ? cat.color : 'var(--text-caption)',
              transition: 'all 0.4s ease',
            }}>
              {done ? '✓ ' : ''}{cat.id}
            </span>
          )
        })}
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-60px); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(60px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
