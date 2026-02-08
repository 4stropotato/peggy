import { useMemo } from 'react'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function pad(n) { return String(n).padStart(2, '0') }

export function toISO(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}

// Convert YYYY-MM-DD to Date.toDateString() format for supp lookups
export function isoToDateString(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toDateString()
}

export default function Calendar({ year, month, onMonthChange, renderDay, selectedDate, onDayClick }) {
  const today = new Date()
  const todayISO = toISO(today.getFullYear(), today.getMonth() + 1, today.getDate())

  const { days, label } = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const last = new Date(year, month, 0)
    // Monday = 0 ... Sunday = 6
    let startDay = first.getDay() - 1
    if (startDay < 0) startDay = 6

    const cells = []
    // Previous month overflow
    const prevLast = new Date(year, month - 1, 0)
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevLast.getDate() - i
      const pm = month - 1 <= 0 ? 12 : month - 1
      const py = month - 1 <= 0 ? year - 1 : year
      cells.push({ date: toISO(py, pm, d), day: d, overflow: true })
    }
    // Current month
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push({ date: toISO(year, month, d), day: d, overflow: false })
    }
    // Next month overflow
    const rem = cells.length % 7
    if (rem > 0) {
      const fill = 7 - rem
      for (let d = 1; d <= fill; d++) {
        const nm = month + 1 > 12 ? 1 : month + 1
        const ny = month + 1 > 12 ? year + 1 : year
        cells.push({ date: toISO(ny, nm, d), day: d, overflow: true })
      }
    }

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    return { days: cells, label: `${monthNames[month - 1]} ${year}` }
  }, [year, month])

  const prevMonth = () => {
    const m = month - 1 <= 0 ? 12 : month - 1
    const y = month - 1 <= 0 ? year - 1 : year
    onMonthChange(y, m)
  }
  const nextMonth = () => {
    const m = month + 1 > 12 ? 1 : month + 1
    const y = month + 1 > 12 ? year + 1 : year
    onMonthChange(y, m)
  }

  return (
    <div className="cal">
      <div className="cal-header">
        <button className="cal-nav glass-inner" onClick={prevMonth}>&#9664;</button>
        <span className="cal-label">{label}</span>
        <button className="cal-nav glass-inner" onClick={nextMonth}>&#9654;</button>
      </div>
      <div className="cal-grid">
        {DAY_LABELS.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {days.map((cell, i) => {
          const isToday = cell.date === todayISO
          const isSelected = cell.date === selectedDate
          return (
            <div
              key={i}
              className={`cal-day ${cell.overflow ? 'overflow' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => !cell.overflow && onDayClick?.(cell.date)}
            >
              <span className="cal-day-num">{cell.day}</span>
              {!cell.overflow && renderDay?.(cell.date)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
