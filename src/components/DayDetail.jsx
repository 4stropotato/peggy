import { useMemo } from 'react'
import { supplements, checkupSchedule } from '../data'
import { isoToDateString } from './Calendar'

export default function DayDetail({ dateISO, onClose, dailySupp, suppSchedule, attendance, checkups, moods }) {
  if (!dateISO) return null

  const dayLabel = new Date(dateISO + 'T00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  const ds = isoToDateString(dateISO)

  // Supplement status
  const suppStatus = useMemo(() => {
    return supplements.map(s => {
      const sched = suppSchedule[s.id]
      const times = sched?.times || s.defaultTimes
      const doses = times.map((t, i) => {
        const key = `${s.id}-${i}-${ds}`
        return { time: t, taken: !!dailySupp[key] }
      })
      return { ...s, doses }
    })
  }, [dateISO, dailySupp, suppSchedule])

  const suppTaken = suppStatus.reduce((acc, s) => acc + s.doses.filter(d => d.taken).length, 0)
  const suppTotal = suppStatus.reduce((acc, s) => acc + s.doses.length, 0)

  // Work
  const att = attendance[dateISO]

  // Checkup
  const checkup = useMemo(() => {
    for (const v of checkupSchedule) {
      const data = checkups[v.id]
      if (data?.date === dateISO) return { visit: v, data }
    }
    return null
  }, [dateISO, checkups])

  // Mood
  const mood = useMemo(() => {
    const found = moods.find(m => {
      const d = new Date(m.date)
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
      return iso === dateISO
    })
    return found || null
  }, [dateISO, moods])

  return (
    <div className="day-detail-backdrop" onClick={onClose}>
      <div className="day-detail-sheet glass-section" onClick={e => e.stopPropagation()}>
        <div className="day-detail-handle" />
        <h3 className="day-detail-title">{dayLabel}</h3>

        {/* Supplements */}
        <div className="day-detail-group">
          <div className="day-detail-group-header">
            <span>💊</span>
            <span>Supplements ({suppTaken}/{suppTotal})</span>
          </div>
          <div className="day-detail-supp-list">
            {suppStatus.map(s => (
              <div key={s.id} className="day-detail-supp">
                <span className="day-detail-supp-icon">{s.icon}</span>
                <span className="day-detail-supp-name">{s.name}</span>
                <span className="day-detail-supp-doses">
                  {s.doses.map((d, i) => (
                    <span key={i} className={`day-detail-dose ${d.taken ? 'taken' : 'missed'}`}>
                      {d.time} {d.taken ? '✓' : '✗'}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Work */}
        <div className="day-detail-group">
          <div className="day-detail-group-header">
            <span>💼</span>
            <span>Work</span>
          </div>
          {att ? (
            <div className={`day-detail-work ${att.worked ? 'worked' : 'absent'}`}>
              {att.worked ? `Worked ${att.hours}h` : 'Absent'}
              {att.note && <span className="day-detail-work-note"> — {att.note}</span>}
            </div>
          ) : (
            <div className="day-detail-empty">No log</div>
          )}
        </div>

        {/* Checkup */}
        {checkup && (
          <div className="day-detail-group">
            <div className="day-detail-group-header">
              <span>🏥</span>
              <span>Checkup Visit {checkup.visit.visit}</span>
            </div>
            <div className="day-detail-checkup">
              <div>{checkup.visit.label}</div>
              {checkup.data.weight && <div>Weight: {checkup.data.weight}kg</div>}
              {checkup.data.bp && <div>BP: {checkup.data.bp}</div>}
              {checkup.data.babySize && <div>Baby: {checkup.data.babySize}</div>}
              {checkup.data.notes && <div className="day-detail-notes">{checkup.data.notes}</div>}
            </div>
          </div>
        )}

        {/* Mood */}
        {mood && (
          <div className="day-detail-group">
            <div className="day-detail-group-header">
              <span>😊</span>
              <span>Mood</span>
            </div>
            <div className="day-detail-mood">
              <span className="day-detail-mood-emoji">{mood.mood}</span>
              <span>Energy: {mood.energy}/5</span>
              {mood.cravings && <div className="day-detail-craving">Craving: {mood.cravings}</div>}
              {mood.notes && <div className="day-detail-notes">{mood.notes}</div>}
            </div>
          </div>
        )}

        <button className="btn-glass-secondary day-detail-close" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
