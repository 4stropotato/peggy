import { useState } from 'react'
import { useApp } from '../AppContext'
import { phases } from '../data'
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
  const { checked, toggle } = useApp()
  const [expandedItem, setExpandedItem] = useState(null)
  const [expandedScript, setExpandedScript] = useState(null)
  const [flowState, setFlowState] = useState({})

  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0)
  const doneItems = phases.reduce((acc, p) => acc + p.items.filter(i => checked[i.id]).length, 0)

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
                      {hasDetails && (
                        <button className="info-btn glass-inner" onClick={(e) => toggleExpand(item.id, e)}>
                          {isExpanded ? '▲' : 'i'}
                        </button>
                      )}
                    </div>

                    {isExpanded && hasDetails && (
                      <div className="task-detail">
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
