import { useMemo, useState } from 'react'
import { useApp } from '../AppContext'
import { phases, moneyTracker } from '../data'
import { buildTaskScripts } from '../scriptScenarios'
import { APP_ICONS, ExpandIcon, TokenIcon, UiIcon } from '../uiIcons'

function getFlowCursor(flow, saved) {
  const startNodeId = flow?.startNodeId || 'start'
  if (!saved || typeof saved !== 'object') return { nodeId: startNodeId, history: [] }
  return {
    nodeId: saved.nodeId || startNodeId,
    history: Array.isArray(saved.history) ? saved.history : [],
  }
}

export default function TasksTab() {
  const { checked, toggle, planner, addPlan } = useApp()
  const [expandedItem, setExpandedItem] = useState(null)
  const [expandedScript, setExpandedScript] = useState(null)
  const [flowState, setFlowState] = useState({})
  const [scheduleDraft, setScheduleDraft] = useState({})

  const moneyById = useMemo(() => {
    const out = {}
    moneyTracker.forEach(m => { out[m.id] = m })
    return out
  }, [])

  const todayISO = (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })()

  const taskScheduleMap = useMemo(() => {
    const map = {}
    const safePlanner = planner && typeof planner === 'object' ? planner : {}

    for (const [dateISO, plans] of Object.entries(safePlanner)) {
      if (!Array.isArray(plans) || plans.length === 0) continue
      for (const plan of plans) {
        if (!plan || plan.done) continue
        const taskIds = Array.isArray(plan.taskIds) ? plan.taskIds : []
        if (taskIds.length === 0) continue

        const time = String(plan.time || '').trim()
        for (const taskIdRaw of taskIds) {
          const taskId = String(taskIdRaw || '').trim()
          if (!taskId) continue
          const candidate = { dateISO, time, planId: plan.id }
          const existing = map[taskId]

          if (!existing) {
            map[taskId] = candidate
            continue
          }
          if (candidate.dateISO < existing.dateISO) {
            map[taskId] = candidate
            continue
          }
          if (candidate.dateISO === existing.dateISO) {
            if (candidate.time && !existing.time) map[taskId] = candidate
            else if (candidate.time && existing.time && candidate.time < existing.time) map[taskId] = candidate
          }
        }
      }
    }

    return map
  }, [planner])

  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0)
  const doneItems = phases.reduce((acc, p) => acc + p.items.filter(i => checked[i.id]).length, 0)

  const formatShortDate = (iso) => {
    try {
      return new Date(`${iso}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return iso
    }
  }

  const toCompactTitle = (text) => {
    const raw = String(text || '').trim()
    if (raw.length <= 96) return raw
    return `${raw.slice(0, 93)}...`
  }

  const upsertScheduleDraft = (taskId, patch) => {
    setScheduleDraft(prev => ({
      ...prev,
      [taskId]: {
        date: String(prev?.[taskId]?.date || ''),
        time: String(prev?.[taskId]?.time || ''),
        ...patch,
      },
    }))
  }

  const scheduleTaskToCalendar = (itemId, itemText, existingSchedule = null) => {
    const draft = scheduleDraft?.[itemId] || {}
    const dateISO = String(draft.date || existingSchedule?.dateISO || '').trim() || todayISO
    const time = String(draft.time || existingSchedule?.time || '').trim()
    addPlan?.(dateISO, {
      time,
      title: toCompactTitle(itemText),
      location: '',
      notes: '',
      done: false,
      taskIds: [itemId],
    })
  }

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedItem(prev => prev === id ? null : id)
    setExpandedScript(null)
  }

  const openScript = (scriptKey, flow) => {
    setExpandedScript(prev => prev === scriptKey ? null : scriptKey)
    if (!flow) return
    setFlowState(prev => ({
      ...prev,
      [scriptKey]: { nodeId: flow.startNodeId || 'start', history: [] },
    }))
  }

  const moveFlow = (scriptKey, flow, nextNodeId) => {
    if (!flow?.nodes?.[nextNodeId]) return
    setFlowState(prev => {
      const cursor = getFlowCursor(flow, prev[scriptKey])
      return {
        ...prev,
        [scriptKey]: {
          nodeId: nextNodeId,
          history: [...cursor.history, cursor.nodeId],
        },
      }
    })
  }

  const backFlow = (scriptKey, flow) => {
    setFlowState(prev => {
      const cursor = getFlowCursor(flow, prev[scriptKey])
      if (cursor.history.length === 0) return prev
      const history = [...cursor.history]
      const previousNodeId = history.pop()
      return {
        ...prev,
        [scriptKey]: {
          nodeId: previousNodeId || flow.startNodeId || 'start',
          history,
        },
      }
    })
  }

  const resetFlow = (scriptKey, flow) => {
    setFlowState(prev => ({
      ...prev,
      [scriptKey]: { nodeId: flow?.startNodeId || 'start', history: [] },
    }))
  }

  return (
    <div className="content">
      <div className="tab-header">
        <h2>Task Checklist</h2>
        <span className="tab-header-count">{doneItems}/{totalItems} done</span>
      </div>
      {phases.map(phase => {
        const done = phase.items.filter(i => checked[i.id]).length
        const total = phase.items.length
        return (
          <section key={phase.id} className="glass-section">
            <div className="section-header">
              <span className="section-icon"><TokenIcon token={phase.icon} /></span>
              <div>
                <h2>{phase.title}</h2>
                <span className="section-count">{done}/{total}</span>
              </div>
            </div>
            <ul>
              {phase.items.map(item => {
                const isExpanded = expandedItem === item.id
                const scriptScenarios = buildTaskScripts(item)
                const hasDetails = Boolean(
                  (Array.isArray(item.howTo) && item.howTo.length > 0)
                  || (Array.isArray(item.phones) && item.phones.length > 0)
                  || scriptScenarios.length > 0,
                )
                const moneyIds = Array.isArray(item.moneyIds) ? item.moneyIds : []
                const moneyTotal = moneyIds.reduce((acc, id) => acc + (moneyById[id]?.amount || 0), 0)
                const schedule = taskScheduleMap[item.id]
                const scheduleLabel = schedule ? formatShortDate(schedule.dateISO) : ''
                const scheduleIsOverdue = Boolean(schedule && schedule.dateISO < todayISO)
                return (
                  <li key={item.id} className={`task-item-wrap ${checked[item.id] ? 'done' : ''}`}>
                    <div
                      className={`item ${checked[item.id] ? 'done' : ''} ${item.priority}`}
                      onClick={() => toggle(item.id)}
                    >
                      <span className="checkbox glass-inner">{checked[item.id] ? '✓' : ''}</span>
                      <span className="item-text">{item.text}</span>
                      {item.priority === 'urgent' && !checked[item.id] && (
                        <span className="badge urgent-badge">URGENT</span>
                      )}
                      {moneyIds.length > 0 && !checked[item.id] && (
                        <span className="badge money-badge">
                          {moneyTotal > 0 ? `+¥${moneyTotal.toLocaleString()}` : 'BENEFIT'}
                        </span>
                      )}
                      {schedule && !checked[item.id] && (
                        <span className={`badge schedule-badge ${scheduleIsOverdue ? 'overdue' : ''}`}>
                          {scheduleLabel}{schedule.time ? ` ${schedule.time}` : ''}
                        </span>
                      )}
                      {hasDetails && (
                        <button className="info-btn glass-inner" onClick={(e) => toggleExpand(item.id, e)}>
                          {isExpanded ? '▲' : 'i'}
                        </button>
                      )}
                    </div>

                    {isExpanded && hasDetails && (
                      <div className="task-detail">
                        <div className="task-detail-section">
                          <div className="task-detail-label">Schedule (adds to Home → Calendar):</div>
                          <div className="task-schedule-row">
                            <input
                              type="date"
                              value={scheduleDraft?.[item.id]?.date || schedule?.dateISO || todayISO}
                              onChange={(e) => upsertScheduleDraft(item.id, { date: e.target.value })}
                            />
                            <input
                              type="time"
                              value={scheduleDraft?.[item.id]?.time || schedule?.time || ''}
                              onChange={(e) => upsertScheduleDraft(item.id, { time: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn-glass-mini primary"
                              onClick={() => scheduleTaskToCalendar(item.id, item.text, schedule)}
                            >
                              Add
                            </button>
                          </div>
                          {schedule ? (
                            <div className="task-schedule-note">
                              Scheduled: {scheduleLabel}{schedule.time ? ` ${schedule.time}` : ''}. Marking the plan as done will auto-check this task.
                            </div>
                          ) : (
                            <div className="task-schedule-note">
                              Tip: pick a date and tap Add. When you mark that plan as done, this task will auto-check.
                            </div>
                          )}
                        </div>

                        {item.howTo && item.howTo.length > 0 && (
                          <div className="task-detail-section">
                            <div className="task-detail-label">How to do this:</div>
                            <ol className="task-steps">
                              {item.howTo.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {item.phones && item.phones.length > 0 && (
                          <div className="task-detail-section">
                            <div className="task-detail-label">Phone Numbers:</div>
                            <div className="task-phones">
                              {item.phones.map((p, i) => (
                                <a key={i} href={`tel:${p.number.replace(/-/g, '')}`} className="task-phone-link">
                                  <span className="phone-icon"><UiIcon icon={APP_ICONS.phone} /></span>
                                  <span className="phone-info">
                                    <span className="phone-label">{p.label}</span>
                                    <span className="phone-number">{p.number}</span>
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {scriptScenarios.length > 0 && (
                          <div className="task-detail-section">
                            <div className="task-detail-label">Japanese Scripts (branch flow):</div>
                            <div className="script-scenarios">
                              {scriptScenarios.map((script, si) => {
                                const scriptKey = `${item.id}-${si}`
                                const scriptOpen = expandedScript === scriptKey
                                const flow = script.branchFlow
                                const cursor = flow ? getFlowCursor(flow, flowState[scriptKey]) : null
                                const currentNode = flow
                                  ? (flow.nodes[cursor.nodeId] || flow.nodes[flow.startNodeId || 'start'])
                                  : null

                                return (
                                  <div key={script.id || si} className="script-scenario glass-inner">
                                    <div
                                      className="script-situation"
                                      onClick={() => openScript(scriptKey, flow)}
                                    >
                                      <span className="script-situation-main">
                                        <UiIcon icon={APP_ICONS.script} />
                                        <span>{script.situation}</span>
                                      </span>
                                      <span className="script-toggle"><ExpandIcon expanded={scriptOpen} /></span>
                                    </div>
                                    {scriptOpen && (
                                      <>
                                        <div className="script-lines">
                                          {script.lines.map((line, li) => (
                                            <div key={li} className={`script-line ${line.speaker === 'you' ? 'you' : 'them'}`}>
                                              <div className="script-speaker">
                                                <UiIcon icon={line.speaker === 'you' ? APP_ICONS.you : APP_ICONS.staff} />
                                                <span>{line.speaker === 'you' ? 'You' : 'Staff'}</span>
                                              </div>
                                              <div className="script-ja">{line.ja}</div>
                                              <div className="script-romaji">{line.romaji}</div>
                                              <div className="script-en">{line.en}</div>
                                            </div>
                                          ))}
                                        </div>

                                        {flow && currentNode && (
                                          <div className="script-flow glass-inner">
                                            <div className="script-flow-title">{flow.title}</div>
                                            {currentNode.prompt ? (
                                              <div className="script-flow-prompt">{currentNode.prompt}</div>
                                            ) : null}

                                            {Array.isArray(currentNode.lines) && currentNode.lines.length > 0 && (
                                              <div className="script-flow-lines">
                                                {currentNode.lines.map((line, li) => (
                                                  <div key={li} className={`script-line ${line.speaker === 'you' ? 'you' : 'them'}`}>
                                                    <div className="script-speaker">
                                                      <UiIcon icon={line.speaker === 'you' ? APP_ICONS.you : APP_ICONS.staff} />
                                                      <span>{line.speaker === 'you' ? 'You' : 'Staff'}</span>
                                                    </div>
                                                    <div className="script-ja">{line.ja}</div>
                                                    <div className="script-romaji">{line.romaji}</div>
                                                    <div className="script-en">{line.en}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}

                                            {Array.isArray(currentNode.options) && currentNode.options.length > 0 && (
                                              <div className="script-flow-options">
                                                {currentNode.options.map((option) => (
                                                  <button
                                                    key={option.id}
                                                    type="button"
                                                    className="script-flow-option glass-inner"
                                                    onClick={() => moveFlow(scriptKey, flow, option.next)}
                                                  >
                                                    {option.label}
                                                  </button>
                                                ))}
                                              </div>
                                            )}

                                            <div className="script-flow-controls">
                                              <button
                                                type="button"
                                                className="script-flow-control glass-inner"
                                                disabled={!cursor || cursor.history.length === 0}
                                                onClick={() => backFlow(scriptKey, flow)}
                                              >
                                                Back one step
                                              </button>
                                              <button
                                                type="button"
                                                className="script-flow-control glass-inner"
                                                onClick={() => resetFlow(scriptKey, flow)}
                                              >
                                                Reset branch
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
