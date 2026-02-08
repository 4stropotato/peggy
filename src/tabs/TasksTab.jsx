import { useState } from 'react'
import { useApp } from '../AppContext'
import { phases } from '../data'

export default function TasksTab() {
  const { checked, toggle } = useApp()
  const [expandedItem, setExpandedItem] = useState(null)
  const [expandedScript, setExpandedScript] = useState(null)

  const totalItems = phases.reduce((acc, p) => acc + p.items.length, 0)
  const doneItems = phases.reduce((acc, p) => acc + p.items.filter(i => checked[i.id]).length, 0)

  const toggleExpand = (id, e) => {
    e.stopPropagation()
    setExpandedItem(prev => prev === id ? null : id)
    setExpandedScript(null)
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
              <span className="section-icon">{phase.icon}</span>
              <div>
                <h2>{phase.title}</h2>
                <span className="section-count">{done}/{total}</span>
              </div>
            </div>
            <ul>
              {phase.items.map(item => {
                const isExpanded = expandedItem === item.id
                const hasDetails = item.howTo || item.phones || item.scripts
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
                                  <span className="phone-icon">📞</span>
                                  <span className="phone-info">
                                    <span className="phone-label">{p.label}</span>
                                    <span className="phone-number">{p.number}</span>
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {item.scripts && item.scripts.length > 0 && (
                          <div className="task-detail-section">
                            <div className="task-detail-label">Japanese Scripts:</div>
                            <div className="script-scenarios">
                              {item.scripts.map((script, si) => (
                                <div key={si} className="script-scenario glass-inner">
                                  <div
                                    className="script-situation"
                                    onClick={() => setExpandedScript(prev => prev === `${item.id}-${si}` ? null : `${item.id}-${si}`)}
                                  >
                                    <span>💬 {script.situation}</span>
                                    <span className="script-toggle">{expandedScript === `${item.id}-${si}` ? '▲' : '▼'}</span>
                                  </div>
                                  {expandedScript === `${item.id}-${si}` && (
                                    <div className="script-lines">
                                      {script.lines.map((line, li) => (
                                        <div key={li} className={`script-line ${line.speaker === 'you' ? 'you' : 'them'}`}>
                                          <div className="script-speaker">{line.speaker === 'you' ? '🙋 You' : '👤 Staff'}</div>
                                          <div className="script-ja">{line.ja}</div>
                                          <div className="script-romaji">{line.romaji}</div>
                                          <div className="script-en">{line.en}</div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
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
