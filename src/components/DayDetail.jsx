import { useMemo, useState } from 'react'
import { supplements, checkupSchedule } from '../data'
import { isoToDateString } from './Calendar'
import { APP_ICONS, TokenIcon, UiIcon } from '../uiIcons'

const QUICK_PLAN_TEMPLATES = [
  {
    id: 'boshi-techo',
    label: 'Kuyakusho - Boshi Techo',
    form: {
      title: 'Kuyakusho - Boshi Techo + vouchers',
      location: 'Kawasaki Ward Office',
      notes: 'Bring: pregnancy confirmation, residence card, insurance card, My Number. Ask about all programs.',
      taskIds: ['p2', 'p3', 'p4'],
    },
  },
  {
    id: 'obgyn',
    label: 'OB-GYN Visit',
    form: {
      title: 'OB-GYN visit',
      location: '',
      notes: '',
      taskIds: ['p1'],
    },
  },
  {
    id: 'ryzen-pedia',
    label: 'Ryzen Pediatrician',
    form: {
      title: 'Ryzen - Pediatrician visit',
      location: '',
      notes: 'Skin allergy follow-up.',
      taskIds: [],
    },
  },
  {
    id: 'ryzen-school',
    label: 'Ryzen School',
    form: {
      title: 'Ryzen - school',
      location: '',
      notes: '',
      taskIds: [],
    },
  },
  {
    id: 'groceries',
    label: 'Groceries',
    form: {
      title: 'Grocery run',
      location: '',
      notes: '',
      taskIds: [],
    },
  },
]

function getTodayISO() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function normalizeTimeLabel(value) {
  const raw = String(value || '').trim()
  return raw ? raw : 'All day'
}

function sortPlans(plans) {
  return [...plans].sort((a, b) => {
    const at = String(a?.time || '').trim()
    const bt = String(b?.time || '').trim()
    if (at && bt && at !== bt) return at.localeCompare(bt)
    if (at && !bt) return -1
    if (!at && bt) return 1
    const atitle = String(a?.title || '').toLowerCase()
    const btitle = String(b?.title || '').toLowerCase()
    return atitle.localeCompare(btitle)
  })
}

export default function DayDetail({
  dateISO,
  onClose,
  dailySupp,
  suppSchedule,
  attendance,
  checkups,
  moods,
  planner,
  addPlan,
  updatePlan,
  removePlan,
  togglePlanDone,
}) {
  if (!dateISO) return null

  const todayISO = getTodayISO()
  const isFuture = dateISO > todayISO

  const dayLabel = new Date(dateISO + 'T00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  })

  const ds = isoToDateString(dateISO)

  const plans = Array.isArray(planner?.[dateISO]) ? planner[dateISO] : []
  const sortedPlans = useMemo(() => sortPlans(plans), [plans])
  const [editingId, setEditingId] = useState(null)
  const [planForm, setPlanForm] = useState({ time: '', title: '', location: '', notes: '', done: false, taskIds: [] })
  const isEditing = Boolean(editingId)

  const startAdd = () => {
    setEditingId('new')
    setPlanForm({ time: '', title: '', location: '', notes: '', done: false, taskIds: [] })
  }

  const startEdit = (plan) => {
    const id = String(plan?.id || '').trim()
    if (!id) return
    setEditingId(id)
    setPlanForm({
      time: String(plan?.time || '').trim(),
      title: String(plan?.title || '').trim(),
      location: String(plan?.location || '').trim(),
      notes: String(plan?.notes || '').trim(),
      done: Boolean(plan?.done),
      taskIds: Array.isArray(plan?.taskIds) ? plan.taskIds : [],
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setPlanForm({ time: '', title: '', location: '', notes: '', done: false, taskIds: [] })
  }

  const handleSavePlan = () => {
    const title = String(planForm.title || '').trim()
    if (!title) return

    const payload = {
      time: String(planForm.time || '').trim(),
      title,
      location: String(planForm.location || '').trim(),
      notes: String(planForm.notes || '').trim(),
      done: Boolean(planForm.done),
      taskIds: Array.isArray(planForm.taskIds) ? planForm.taskIds : [],
    }

    if (editingId === 'new') {
      addPlan?.(dateISO, payload)
    } else {
      updatePlan?.(dateISO, editingId, payload)
    }
    cancelEdit()
  }

  const applyTemplate = (template) => {
    const next = template?.form || null
    if (!next) return
    setPlanForm(prev => ({
      ...prev,
      title: String(next.title || '').trim(),
      location: String(next.location || '').trim(),
      notes: String(next.notes || '').trim(),
      taskIds: Array.isArray(next.taskIds) ? next.taskIds : [],
    }))
  }

  const quickAddTemplate = (template) => {
    const next = template?.form || null
    if (!next) return
    addPlan?.(dateISO, {
      time: String(next.time || '').trim(),
      title: String(next.title || '').trim(),
      location: String(next.location || '').trim(),
      notes: String(next.notes || '').trim(),
      done: Boolean(next.done),
      taskIds: Array.isArray(next.taskIds) ? next.taskIds : [],
    })
  }

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
    <div className="day-detail-backdrop" onClick={() => { if (!isEditing) onClose?.() }}>
      <div className="day-detail-sheet glass-section" onClick={e => e.stopPropagation()}>
        <div className="day-detail-handle" />
        <h3 className="day-detail-title">{dayLabel}</h3>

        {/* Plans / Organizer */}
        <div className="day-detail-group">
          <div className="day-detail-group-header">
            <UiIcon icon={APP_ICONS.activity} />
            <span>Plans ({plans.length})</span>
            {!isEditing && (
              <button type="button" className="btn-glass-mini" onClick={startAdd}>Add</button>
            )}
          </div>

          {!isEditing && (
            <div className="day-detail-quick-row">
              {QUICK_PLAN_TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="quick-chip glass-inner"
                  onClick={() => quickAddTemplate(t)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {sortedPlans.length > 0 ? (
            <div className="day-detail-plans">
              {sortedPlans.map(plan => (
                <div key={plan.id} className={`day-detail-plan glass-inner ${plan.done ? 'done' : ''}`}>
                  <div className="day-detail-plan-time">{normalizeTimeLabel(plan.time)}</div>
                  <div className="day-detail-plan-main">
                    <div className="day-detail-plan-title">{plan.title}</div>
                    {(plan.location || plan.notes) && (
                      <div className="day-detail-plan-meta">
                        {plan.location ? `Location: ${plan.location}` : ''}
                        {plan.location && plan.notes ? '\n' : ''}
                        {plan.notes ? plan.notes : ''}
                      </div>
                    )}
                  </div>
                  <div className="day-detail-plan-actions">
                    <button
                      type="button"
                      className={`btn-glass-mini ${plan.done ? '' : 'primary'}`}
                      onClick={() => togglePlanDone?.(dateISO, plan.id)}
                    >
                      {plan.done ? 'Undo' : 'Done'}
                    </button>
                    <button type="button" className="btn-glass-mini" onClick={() => startEdit(plan)}>Edit</button>
                    <button
                      type="button"
                      className="btn-glass-mini danger"
                      onClick={() => {
                        if (window.confirm('Delete this plan item?')) {
                          removePlan?.(dateISO, plan.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="day-detail-empty">No plans yet.</div>
          )}

          {isEditing && (
            <div className="day-detail-plan-form glass-inner">
              <div className="day-detail-quick-row">
                {QUICK_PLAN_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    className="quick-chip glass-inner"
                    onClick={() => applyTemplate(t)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="day-detail-form-row">
                <span>Title (required)</span>
                <input
                  type="text"
                  value={planForm.title}
                  onChange={e => setPlanForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Kuyakusho - Boshi Techo"
                />
              </label>
              <label className="day-detail-form-row">
                <span>Time (optional)</span>
                <input
                  type="time"
                  value={planForm.time}
                  onChange={e => setPlanForm(p => ({ ...p, time: e.target.value }))}
                />
              </label>
              <label className="day-detail-form-row">
                <span>Location (optional)</span>
                <input
                  type="text"
                  value={planForm.location}
                  onChange={e => setPlanForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. Kawasaki Ward Office"
                />
              </label>
              <label className="day-detail-form-row">
                <span>Notes (optional)</span>
                <textarea
                  value={planForm.notes}
                  onChange={e => setPlanForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Bring documents, ask about vouchers, etc."
                  rows={3}
                />
              </label>
              <label className="day-detail-form-check">
                <input
                  type="checkbox"
                  checked={planForm.done}
                  onChange={e => setPlanForm(p => ({ ...p, done: e.target.checked }))}
                />
                <span>Mark as done</span>
              </label>
              <div className="day-detail-form-actions">
                <button type="button" className="btn-glass-primary" onClick={handleSavePlan} disabled={!String(planForm.title || '').trim()}>
                  Save
                </button>
                <button type="button" className="btn-glass-secondary" onClick={cancelEdit}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Supplements */}
        <div className="day-detail-group">
          <div className="day-detail-group-header">
            <UiIcon icon={APP_ICONS.supplements} />
            <span>Supplements ({suppTaken}/{suppTotal})</span>
          </div>
          <div className="day-detail-supp-list">
            {suppStatus.map(s => (
              <div key={s.id} className="day-detail-supp">
                <span className="day-detail-supp-icon"><TokenIcon token={s.icon} /></span>
                <span className="day-detail-supp-name">{s.name}</span>
                <span className="day-detail-supp-doses">
                  {s.doses.map((d, i) => (
                    isFuture ? (
                      <span key={i} className="day-detail-dose future">
                        {d.time} -
                      </span>
                    ) : (
                      <span key={i} className={`day-detail-dose ${d.taken ? 'taken' : 'missed'}`}>
                        {d.time} {d.taken ? '✓' : '✗'}
                      </span>
                    )
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Work */}
        <div className="day-detail-group">
          <div className="day-detail-group-header">
            <UiIcon icon={APP_ICONS.work} />
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
              <UiIcon icon={APP_ICONS.checkup} />
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
              <UiIcon icon={APP_ICONS.tip} />
              <span>Mood</span>
            </div>
            <div className="day-detail-mood">
              <span className="day-detail-mood-emoji"><TokenIcon token={mood.mood} /></span>
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
