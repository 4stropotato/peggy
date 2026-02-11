import { useState, useEffect, useMemo, useRef } from 'react'
import { useApp } from '../AppContext'
import {
  savePhoto, getPhotos, deletePhoto, exportBackup, importBackup,
  buildBackupObject, restoreBackupObject
} from '../db'
import {
  kawasakiInfo, governmentSupportInfo, budgetTipsInfo,
  healthTipsInfo, supplementsDetailInfo, babyNamesInfo, financialSummary
} from '../infoData'
import {
  isCloudConfigured, getCloudSession, cloudSignUp, cloudSignIn, cloudSignOut,
  cloudValidateSession, cloudUploadBackup, cloudDownloadBackup, cloudSendPushTest
} from '../cloudSync'
import {
  buildMoodReminder,
  buildPlannerReminder,
  buildSupplementReminder,
  buildWorkReminder,
  appendSmartNotifInbox,
  clearSmartNotifInbox,
  formatSmartNotifQuietHoursLabel,
  getMoodReminderContext,
  getPlannerReminderContext,
  getSupplementReminderContext,
  getWorkReminderContext,
  isNowInSmartNotifQuietHours,
  isSmartNotifChannelEnabled,
  markAllSmartNotifInboxRead,
  markSmartNotifInboxRead,
  readSmartNotifInbox,
  readSmartNotifChannels,
  readSmartNotifEnabled,
  SMART_NOTIF_INBOX_EVENT,
  SMART_NOTIF_CHANNEL_EVENT,
  readSmartNotifQuietHours,
  writeSmartNotifChannels,
  SMART_NOTIF_PREF_EVENT,
  SMART_NOTIF_QUIET_HOURS_EVENT,
  writeSmartNotifEnabled,
  writeSmartNotifQuietHours,
} from '../reminderContent'
import {
  disableCurrentPushSubscription,
  isPushSupported,
  upsertCurrentPushSubscription,
} from '../pushSync'
import { APP_ICONS, ExpandIcon, ICON_STYLE_PRESETS, TokenIcon, UiIcon, resolveIconStyle } from '../uiIcons'

const PHOTO_CATEGORIES = ['Ultrasound', 'Documents', 'Receipts', 'Boshi Techo', 'Other']

const INFO_SECTIONS = [
  { id: 'gov', label: 'Gov Support', icon: '🏛️' },
  { id: 'budget', label: 'Budget Tips', icon: '💴' },
  { id: 'health', label: 'Health Tips', icon: '🧠' },
  { id: 'supps', label: 'Supplements', icon: '💊' },
  { id: 'names', label: 'Baby Names', icon: '👶' },
  { id: 'kawasaki', label: 'Kawasaki Info', icon: '🏢' },
  { id: 'money-summary', label: 'Total Benefits', icon: '💰' },
]

function formatNotificationTime(value) {
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return String(value || '')
  return dt.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatNotifReason(reason) {
  const value = String(reason || '').trim()
  if (!value) return ''
  if (value === 'quiet-hours') return 'Quiet hours'
  if (value === 'permission-not-granted') return 'Permission not granted'
  if (value === 'foreground-suppressed') return 'Foreground suppressed'
  return value
}

function InfoPanel({ section }) {
  const [expandedPhase, setExpandedPhase] = useState(null)
  const [expandedItem, setExpandedItem] = useState(null)
  const [nameGender, setNameGender] = useState('boy')

  if (section === 'gov') {
    return (
      <div className="info-panel">
        <h3>Government Support Guide</h3>
        <p className="section-note">Complete guide to ALL government benefits. Kawasaki-shi specific. Tap each phase to see details.</p>
        {governmentSupportInfo.map((phase, pi) => (
          <div key={pi} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === pi ? null : pi)}>
              <span className="info-phase-head-main">
                <TokenIcon token={phase.icon} />
                <span>{phase.phase}</span>
              </span>
              <span className="info-count info-phase-toggle">
                <span>{phase.items.length} items</span>
                <ExpandIcon expanded={expandedPhase === pi} />
              </span>
            </div>
            {expandedPhase === pi && (
              <div className="info-phase-body">
                {phase.items.map((item, ii) => (
                  <div key={ii} className="info-item glass-inner">
                    <div className="info-item-header" onClick={() => setExpandedItem(expandedItem === `${pi}-${ii}` ? null : `${pi}-${ii}`)}>
                      <div className="info-item-title">{item.title}</div>
                      <div className="info-item-value">{item.value}</div>
                    </div>
                    {expandedItem === `${pi}-${ii}` && (
                      <ul className="info-details">
                        {item.details.map((d, di) => (
                          <li key={di}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'budget') {
    return (
      <div className="info-panel">
        <h3>{budgetTipsInfo.title}</h3>
        {budgetTipsInfo.sections.map((sec, si) => (
          <div key={si} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === si ? null : si)}>
              <span className="info-phase-head-main">
                <TokenIcon token={sec.icon} />
                <span>{sec.title}</span>
              </span>
              <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === si} /></span>
            </div>
            {expandedPhase === si && (
              <div className="info-phase-body">
                {sec.content.map((c, ci) => (
                  <div key={ci} className="info-tip glass-inner">
                    <div className="info-tip-label">{c.label}</div>
                    <div className="info-tip-detail">{c.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'health') {
    return (
      <div className="info-panel">
        <h3>{healthTipsInfo.title}</h3>
        {healthTipsInfo.sections.map((sec, si) => (
          <div key={si} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === si ? null : si)}>
              <span className="info-phase-head-main">
                <TokenIcon token={sec.icon} />
                <span>{sec.title}</span>
              </span>
              <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === si} /></span>
            </div>
            {expandedPhase === si && (
              <div className="info-phase-body">
                {sec.content.map((c, ci) => (
                  <div key={ci} className="info-tip glass-inner">
                    <div className="info-tip-label">{c.label}</div>
                    <div className="info-tip-detail">{c.detail}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  if (section === 'supps') {
    return (
      <div className="info-panel">
        <h3>{supplementsDetailInfo.title}</h3>
        <p className="section-note disclaimer">{supplementsDetailInfo.disclaimer}</p>

        {supplementsDetailInfo.sections.map((sec, si) => (
          <div key={si} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === si ? null : si)}>
              <span className="info-phase-head-main">
                <TokenIcon token={sec.icon} />
                <span>{sec.name}</span>
              </span>
              <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === si} /></span>
            </div>
            {expandedPhase === si && (
              <div className="info-phase-body">
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Why essential</div>
                  <div className="info-tip-detail">{sec.why}</div>
                </div>
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">When to take</div>
                  <div className="info-tip-detail">{sec.when}</div>
                </div>
                {sec.target && (
                  <div className="info-tip glass-inner">
                    <div className="info-tip-label">Target dosage</div>
                    <div className="info-tip-detail">{sec.target}</div>
                  </div>
                )}
                <div className="info-tip-label" style={{padding:'8px 0 4px'}}>iHerb Options:</div>
                {sec.options.map((opt, oi) => (
                  <div key={oi} className="info-tip glass-inner">
                    <div className="info-tip-label">{opt.product}</div>
                    <div className="info-tip-detail">{opt.price} - {opt.note} (Lasts: {opt.lasts})</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="glass-card info-phase">
          <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === 'schedule' ? null : 'schedule')}>
            <span className="info-phase-head-main">
              <TokenIcon token="⏰" />
              <span>Daily Schedule</span>
            </span>
            <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === 'schedule'} /></span>
          </div>
          {expandedPhase === 'schedule' && (
            <div className="info-phase-body">
              {supplementsDetailInfo.schedule.map((s, si) => (
                <div key={si} className="info-tip glass-inner">
                  <div className="info-tip-label">{s.time}</div>
                  <div className="info-tip-detail">{s.supplements}</div>
                  <div className="info-tip-detail" style={{opacity:0.7, fontSize:'0.85em'}}>{s.note}</div>
                </div>
              ))}
              <div className="glass-inner warn-card" style={{marginTop:8}}>
                <p>{supplementsDetailInfo.importantRule}</p>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card info-phase">
          <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === 'tips' ? null : 'tips')}>
            <span className="info-phase-head-main">
              <TokenIcon token="💡" />
              <span>iHerb Tips & What NOT to Buy</span>
            </span>
            <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === 'tips'} /></span>
          </div>
          {expandedPhase === 'tips' && (
            <div className="info-phase-body">
              <div className="info-tip-label">iHerb Tips:</div>
              {supplementsDetailInfo.iherbTips.map((t, ti) => (
                <div key={ti} className="info-tip glass-inner">
                  <div className="info-tip-detail">{t}</div>
                </div>
              ))}
              <div className="info-tip-label" style={{marginTop:8}}>DON'T buy (waste of money):</div>
              {supplementsDetailInfo.whatNotToBuy.map((t, ti) => (
                <div key={ti} className="info-tip glass-inner">
                  <div className="info-tip-detail" style={{opacity:0.7}}>✗ {t}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (section === 'names') {
    const names = nameGender === 'boy' ? babyNamesInfo.boyNames : babyNamesInfo.girlNames
    return (
      <div className="info-panel">
        <h3>{babyNamesInfo.title}</h3>
        <p className="section-note">{babyNamesInfo.subtitle}</p>
        <div className="glass-card info-tip">
          <div className="info-tip-label">The Ryzen Formula: {babyNamesInfo.ryzenFormula.sound}</div>
          <div className="info-tip-detail">Kanji: {babyNamesInfo.ryzenFormula.kanji} - {babyNamesInfo.ryzenFormula.meaning}</div>
        </div>

        <div className="name-gender-toggle">
          <button className={`att-btn ${nameGender === 'boy' ? 'active worked' : ''}`} onClick={() => setNameGender('boy')}>Boy Names</button>
          <button className={`att-btn ${nameGender === 'girl' ? 'active worked' : ''}`} onClick={() => setNameGender('girl')}>Girl Names</button>
        </div>

        {names.map((n, ni) => (
          <div key={ni} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedItem(expandedItem === `name-${ni}` ? null : `name-${ni}`)}>
              <span className="name-header">
                <span className="name-main">{n.name}</span>
                <span className="name-kanji">{n.kanji}</span>
                {n.tier === 1 && <span className="tier-badge">Top Pick</span>}
              </span>
              <span className="info-phase-toggle"><ExpandIcon expanded={expandedItem === `name-${ni}`} /></span>
            </div>
            {expandedItem === `name-${ni}` && (
              <div className="info-phase-body">
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Meaning</div>
                  <div className="info-tip-detail">{n.meaning}</div>
                </div>
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Sibling Pair</div>
                  <div className="info-tip-detail">{n.pairing}</div>
                </div>
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Why this name</div>
                  <div className="info-tip-detail">{n.why}</div>
                </div>
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Readability</div>
                  <div className="info-tip-detail">{n.readability}</div>
                </div>
                <div className="info-tip glass-inner">
                  <div className="info-tip-label">Nicknames</div>
                  <div className="info-tip-detail">{n.nicknames}</div>
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="glass-card info-phase">
          <div className="info-phase-header" onClick={() => setExpandedItem(expandedItem === 'pnotes' ? null : 'pnotes')}>
            <span className="info-phase-head-main">
              <TokenIcon token="📝" />
              <span>Practical Notes</span>
            </span>
            <span className="info-phase-toggle"><ExpandIcon expanded={expandedItem === 'pnotes'} /></span>
          </div>
          {expandedItem === 'pnotes' && (
            <div className="info-phase-body">
              {babyNamesInfo.practicalNotes.map((n, ni) => (
                <div key={ni} className="info-tip glass-inner">
                  <div className="info-tip-detail">{n}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (section === 'kawasaki') {
    const ki = kawasakiInfo
    return (
      <div className="info-panel">
        <h3>Kawasaki-shi Info</h3>
        <p className="section-note">Your area: {ki.address}</p>

        {[
          { label: ki.wardOffice.name, detail: `${ki.wardOffice.address}\nPhone: ${ki.wardOffice.mainPhone}\nHours: ${ki.wardOffice.hours}\n${ki.wardOffice.note}` },
          ...Object.values(ki.wardOffice.departments).map(d => ({ label: `  ${d.name}`, detail: d.phone })),
          { label: ki.taxOffice.name, detail: `${ki.taxOffice.address}\nPhone: ${ki.taxOffice.phone}\n${ki.taxOffice.note}` },
          { label: ki.pensionOffice.name, detail: `${ki.pensionOffice.address}\nPhone: ${ki.pensionOffice.phone}\n${ki.pensionOffice.note}` },
          { label: ki.healthCenter.name, detail: `${ki.healthCenter.address}\nPhone: ${ki.healthCenter.phone}\n${ki.healthCenter.note}` },
          { label: ki.urHousing.name, detail: `Phone: ${ki.urHousing.phone}\n${ki.urHousing.note}` },
          { label: ki.kanagawaHousing.name, detail: `Phone: ${ki.kanagawaHousing.phone}\n${ki.kanagawaHousing.note}` },
          { label: ki.internationalExchange.name, detail: `${ki.internationalExchange.address}\nPhone: ${ki.internationalExchange.phone}\n${ki.internationalExchange.note}` },
          { label: ki.philConsulateYokohama.name, detail: `Phone: ${ki.philConsulateYokohama.phone}\n${ki.philConsulateYokohama.note}` },
          { label: ki.philEmbassy.name, detail: `${ki.philEmbassy.address}\nPhone: ${ki.philEmbassy.phone}\n${ki.philEmbassy.note}` },
        ].map((item, i) => (
          <div key={i} className="glass-card info-tip">
            <div className="info-tip-label">{item.label}</div>
            <div className="info-tip-detail" style={{whiteSpace:'pre-line'}}>{item.detail}</div>
          </div>
        ))}

        <div className="glass-card info-phase">
          <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === 'danchi' ? null : 'danchi')}>
            <span className="info-phase-head-main">
              <TokenIcon token="🏠" />
              <span>Danchi / Public Housing Tips</span>
            </span>
            <span className="info-phase-toggle"><ExpandIcon expanded={expandedPhase === 'danchi'} /></span>
          </div>
          {expandedPhase === 'danchi' && (
            <div className="info-phase-body">
              <p className="section-note">{ki.danchiInfo.note}</p>
              {ki.danchiInfo.tips.map((t, ti) => (
                <div key={ti} className="info-tip glass-inner">
                  <div className="info-tip-detail">{t}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (section === 'money-summary') {
    const fs = financialSummary
    return (
      <div className="info-panel">
        <h3>Total Government Support Summary</h3>
        <p className="section-note">Conservative to maximum estimates over 18 years for 2 children.</p>

        {[fs.directCash, fs.monthlyChild, fs.costSavings, fs.taxBenefits].map((cat, ci) => (
          <div key={ci} className="glass-card info-phase">
            <div className="info-phase-header" onClick={() => setExpandedPhase(expandedPhase === ci ? null : ci)}>
              <span>{cat.title}</span>
              <span className="info-item-value info-phase-toggle">
                <span>{cat.total}</span>
                <ExpandIcon expanded={expandedPhase === ci} />
              </span>
            </div>
            {expandedPhase === ci && (
              <div className="info-phase-body">
                {cat.items.map((item, ii) => (
                  <div key={ii} className="info-tip glass-inner">
                    <div className="info-tip-label">{item.label}</div>
                    <div className="info-tip-detail">{item.amount}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="glass-card grand-total">
          <div className="grand-total-label">GRAND TOTAL (18 years, 2 kids)</div>
          <div className="grand-total-range">
            <span>{fs.grandTotal.conservative}</span>
            <span> ~ </span>
            <span>{fs.grandTotal.maximum}</span>
          </div>
          <div className="grand-total-note">{fs.grandTotal.note}</div>
        </div>
      </div>
    )
  }

  return null
}

export default function MoreTab() {
  const {
    doctor, setDoctor, contacts, addContact, removeContact, updateContact,
    familyConfig, setFamilyConfig,
    iconStyle, setIconStyle,
    dailySupp, suppSchedule, attendance, planner, moods,
  } = useApp()
  const includeHusband = familyConfig?.includeHusband !== false
  const [subTab, setSubTab] = useState('info')
  const [infoSection, setInfoSection] = useState('gov')
  const [photoCategory, setPhotoCategory] = useState('Ultrasound')
  const [photos, setPhotos] = useState([])
  const [viewPhoto, setViewPhoto] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [editContact, setEditContact] = useState(null)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: '' })
  const [backupStatus, setBackupStatus] = useState('')
  const [cloudStatus, setCloudStatus] = useState('')
  const [pushStatus, setPushStatus] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)
  const [cloudEmail, setCloudEmail] = useState('')
  const [cloudPassword, setCloudPassword] = useState('')
  const [cloudSession, setCloudSession] = useState(() => getCloudSession())
  const fileRef = useRef()
  const restoreRef = useRef()
  const cloudEnabled = isCloudConfigured()
  const pushSupported = isPushSupported()
  const pushVapidReady = Boolean(String(import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY || '').trim())
  const activeIconStyle = resolveIconStyle(iconStyle)
  const [notifEnabled, setNotifEnabled] = useState(() => readSmartNotifEnabled())
  const [notifChannels, setNotifChannels] = useState(() => readSmartNotifChannels())
  const [quietHours, setQuietHours] = useState(() => readSmartNotifQuietHours())
  const [notifInbox, setNotifInbox] = useState(() => readSmartNotifInbox())
  const [notifNowTick, setNotifNowTick] = useState(() => Date.now())
  const [notifStatus, setNotifStatus] = useState('')
  const [notifPermission, setNotifPermission] = useState(() => (
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  ))
  const [notifLastTestAt, setNotifLastTestAt] = useState('')
  const quietHoursActiveNow = isNowInSmartNotifQuietHours(new Date(), quietHours)
  const notifNow = useMemo(() => new Date(notifNowTick), [notifNowTick])

  useEffect(() => {
    if (subTab === 'photos') loadPhotos()
  }, [photoCategory, subTab])

  useEffect(() => {
    if (!notifStatus) return undefined
    const id = setTimeout(() => setNotifStatus(''), 10000)
    return () => clearTimeout(id)
  }, [notifStatus])

  useEffect(() => {
    if (subTab !== 'notifications') return undefined
    const id = window.setInterval(() => setNotifNowTick(Date.now()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [subTab])

  const refreshNotifPermission = () => {
    if (typeof Notification === 'undefined') {
      setNotifPermission('unsupported')
      return
    }
    setNotifPermission(Notification.permission)
  }

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const syncNotifEnabled = () => setNotifEnabled(readSmartNotifEnabled())
    const syncNotifChannels = () => setNotifChannels(readSmartNotifChannels())
    const syncQuietHours = () => setQuietHours(readSmartNotifQuietHours())
    const syncNotifInbox = () => setNotifInbox(readSmartNotifInbox())
    const syncAll = () => {
      syncNotifEnabled()
      syncNotifChannels()
      syncQuietHours()
      syncNotifInbox()
      refreshNotifPermission()
    }

    window.addEventListener(SMART_NOTIF_PREF_EVENT, syncNotifEnabled)
    window.addEventListener(SMART_NOTIF_CHANNEL_EVENT, syncNotifChannels)
    window.addEventListener(SMART_NOTIF_QUIET_HOURS_EVENT, syncQuietHours)
    window.addEventListener(SMART_NOTIF_INBOX_EVENT, syncNotifInbox)
    window.addEventListener('peggy-backup-restored', syncAll)
    window.addEventListener('storage', syncAll)
    window.addEventListener('focus', refreshNotifPermission)
    window.addEventListener('peggy-local-test-ack', syncNotifInbox)
    document.addEventListener('visibilitychange', refreshNotifPermission)
    refreshNotifPermission()
    return () => {
      window.removeEventListener(SMART_NOTIF_PREF_EVENT, syncNotifEnabled)
      window.removeEventListener(SMART_NOTIF_CHANNEL_EVENT, syncNotifChannels)
      window.removeEventListener(SMART_NOTIF_QUIET_HOURS_EVENT, syncQuietHours)
      window.removeEventListener(SMART_NOTIF_INBOX_EVENT, syncNotifInbox)
      window.removeEventListener('peggy-backup-restored', syncAll)
      window.removeEventListener('storage', syncAll)
      window.removeEventListener('focus', refreshNotifPermission)
      window.removeEventListener('peggy-local-test-ack', syncNotifInbox)
      document.removeEventListener('visibilitychange', refreshNotifPermission)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onLocalTestAck = (event) => {
      const ok = Boolean(event?.detail?.ok)
      const err = String(event?.detail?.error || '').trim()
      setNotifStatus(ok
        ? 'Local test acknowledged by Service Worker.'
        : `Local test failed in Service Worker${err ? `: ${err}` : ''}`)
      setNotifInbox(readSmartNotifInbox())
      setNotifLastTestAt(String(event?.detail?.createdAt || new Date().toISOString()))
    }
    window.addEventListener('peggy-local-test-ack', onLocalTestAck)
    return () => window.removeEventListener('peggy-local-test-ack', onLocalTestAck)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onCloudSessionChanged = (event) => {
      setCloudSession(event?.detail?.session || null)
    }
    window.addEventListener('peggy-cloud-session-changed', onCloudSessionChanged)
    return () => window.removeEventListener('peggy-cloud-session-changed', onCloudSessionChanged)
  }, [])

  useEffect(() => {
    if (!cloudEnabled) return
    const session = getCloudSession()
    if (!session) return

    cloudValidateSession(session)
      .then(validated => setCloudSession(validated))
      .catch((err) => {
        const msg = String(err?.message || '').toLowerCase()
        const mustSignInAgain = (
          msg.includes('http 401') ||
          msg.includes('refresh token') ||
          msg.includes('invalid refresh') ||
          msg.includes('session expired')
        )
        if (mustSignInAgain) {
          setCloudSession(null)
          return
        }
        // Keep current session for transient network/deploy-time glitches.
        setCloudSession(session)
      })
  }, [cloudEnabled])

  const loadPhotos = async () => {
    try {
      const p = await getPhotos(photoCategory)
      setPhotos(p)
    } catch { setPhotos([]) }
  }

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        await savePhoto(photoCategory, file)
      }
      await loadPhotos()
    } catch (err) {
      console.error('Upload failed:', err)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDelete = async (id) => {
    await deletePhoto(id)
    await loadPhotos()
    setViewPhoto(null)
  }

  const handleAddContact = (e) => {
    e.preventDefault()
    if (!contactForm.name) return
    if (editContact) return
    addContact(contactForm)
    setContactForm({ name: '', phone: '', relationship: '' })
  }

  const startEditContact = (c) => {
    setEditContact(c.id)
    setContactForm({ name: c.name, phone: c.phone, relationship: c.relationship })
  }

  const saveEditContact = () => {
    updateContact(editContact, contactForm)
    setEditContact(null)
    setContactForm({ name: '', phone: '', relationship: '' })
  }

  const handleNotifToggle = async () => {
    if (typeof Notification === 'undefined') {
      setNotifStatus('Browser notifications are not supported on this device/browser.')
      return
    }

    if (notifEnabled) {
      writeSmartNotifEnabled(false)
      setNotifEnabled(false)
      setNotifStatus('Reminders paused on this device.')
      if (cloudSession && pushSupported) {
        try {
          await disableCurrentPushSubscription(cloudSession, { unsubscribeLocal: true })
        } catch {
          // Keep UX responsive even if network is down.
        }
      }
      return
    }

    if (Notification.permission === 'denied') {
      setNotifStatus('Notifications are blocked in browser settings.')
      return
    }

    let permission = Notification.permission
    if (permission !== 'granted') {
      permission = await Notification.requestPermission()
    }

    if (permission === 'granted') {
      writeSmartNotifEnabled(true)
      setNotifEnabled(true)
      if (cloudSession && pushSupported && pushVapidReady) {
        try {
          const sync = await upsertCurrentPushSubscription(cloudSession, { notifEnabled: true })
          if (sync?.status === 'ok') {
            setNotifStatus('Notifications enabled and push connected on this device.')
          } else {
            const reason = String(sync?.reason || 'subscription-sync-skipped')
            setNotifStatus(`Notifications enabled, but push sync skipped (${reason}).`)
          }
        } catch (err) {
          setNotifStatus(`Notifications enabled, but push sync failed (${err?.message || 'unknown error'}).`)
        }
      } else if (!cloudSession) {
        setNotifStatus('Notifications enabled locally. Sign in to cloud for lock-screen push.')
      } else {
        setNotifStatus('Notifications enabled on this device.')
      }
      return
    }

    setNotifStatus('Permission not granted.')
  }

  const handleQuietHoursToggle = () => {
    const next = { ...quietHours, enabled: !quietHours.enabled }
    setQuietHours(next)
    writeSmartNotifQuietHours(next)
    setNotifStatus(next.enabled ? `Quiet hours enabled (${formatSmartNotifQuietHoursLabel(next)}).` : 'Quiet hours disabled.')
  }

  const handleQuietHoursTimeChange = (field, value) => {
    const next = { ...quietHours, [field]: value }
    setQuietHours(next)
    writeSmartNotifQuietHours(next)
    if (next.enabled) {
      setNotifStatus(`Quiet hours updated (${formatSmartNotifQuietHoursLabel(next)}).`)
    }
  }

  const handleNotifChannelToggle = (channelKey) => {
    const next = {
      ...notifChannels,
      [channelKey]: !isSmartNotifChannelEnabled(channelKey, notifChannels),
    }
    setNotifChannels(next)
    writeSmartNotifChannels(next)
    const pretty = channelKey === 'dailyTip'
      ? 'Daily Tip'
      : channelKey === 'calendar'
        ? 'Calendar'
        : channelKey === 'names'
          ? 'Names'
          : 'Reminders'
    setNotifStatus(`${pretty} notifications ${next[channelKey] ? 'enabled' : 'paused'}.`)
  }

  const handleExport = async () => {
    try {
      setBackupStatus('Exporting...')
      await exportBackup()
      setBackupStatus('Backup downloaded! Keep it safe.')
      setTimeout(() => setBackupStatus(''), 5000)
    } catch (err) {
      setBackupStatus('Export failed: ' + err.message)
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setBackupStatus('Restoring...')
      const result = await importBackup(file)
      setBackupStatus(`Restored! ${result.items} data items + ${result.photos} photos.`)
    } catch (err) {
      setBackupStatus('Restore failed: ' + err.message)
    }
    if (restoreRef.current) restoreRef.current.value = ''
  }

  const handleCloudSignUp = async () => {
    if (!cloudEnabled) {
      setCloudStatus('Cloud not configured. Add Supabase env vars first.')
      return
    }
    if (!cloudEmail || !cloudPassword) {
      setCloudStatus('Enter email and password first.')
      return
    }

    try {
      setCloudBusy(true)
      setCloudStatus('Creating account...')
      const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      const result = await cloudSignUp(cloudEmail.trim(), cloudPassword, redirectTo)
      setCloudSession(result.session || null)
      setCloudStatus(result.message)
    } catch (err) {
      setCloudStatus('Signup failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleCloudSignIn = async () => {
    if (!cloudEnabled) {
      setCloudStatus('Cloud not configured. Add Supabase env vars first.')
      return
    }
    if (!cloudEmail || !cloudPassword) {
      setCloudStatus('Enter email and password first.')
      return
    }

    try {
      setCloudBusy(true)
      setCloudStatus('Signing in...')
      const session = await cloudSignIn(cloudEmail.trim(), cloudPassword)
      setCloudSession(session)
      setCloudStatus(`Signed in as ${session.user.email || session.user.id}. Syncing account data...`)
    } catch (err) {
      setCloudStatus('Sign in failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleCloudSignOut = async () => {
    try {
      setCloudBusy(true)
      setPushStatus('')
      if (cloudSession) {
        try {
          await disableCurrentPushSubscription(cloudSession, { unsubscribeLocal: true })
        } catch {
          // keep sign-out flow resilient
        }
      }
      await cloudSignOut()
      setCloudSession(null)
      setCloudStatus('Signed out.')
    } catch (err) {
      setCloudStatus('Sign out failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleCloudUpload = async () => {
    if (!cloudSession) {
      setCloudStatus('Sign in first.')
      return
    }

    try {
      setCloudBusy(true)
      setCloudStatus('Uploading cloud backup...')
      const backup = await buildBackupObject()
      await cloudUploadBackup(backup, cloudSession)
      setCloudStatus('Cloud backup uploaded successfully.')
    } catch (err) {
      setCloudStatus('Cloud upload failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleCloudDownload = async () => {
    if (!cloudSession) {
      setCloudStatus('Sign in first.')
      return
    }

    try {
      setCloudBusy(true)
      setCloudStatus('Downloading cloud backup...')
      const { backup } = await cloudDownloadBackup(cloudSession)
      const result = await restoreBackupObject(backup)
      setCloudStatus(`Cloud restore complete: ${result.items} items + ${result.photos} photos.`)
    } catch (err) {
      setCloudStatus('Cloud download failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handlePushTest = async () => {
    if (!cloudSession) {
      setPushStatus('Sign in first to test push notifications.')
      return
    }
    if (!pushSupported) {
      setPushStatus('Push notifications are not supported on this browser/device.')
      return
    }
    if (!pushVapidReady) {
      setPushStatus('Missing VITE_WEB_PUSH_PUBLIC_KEY in app env config.')
      return
    }
    if (Notification.permission !== 'granted') {
      setPushStatus('Enable notifications first in More tab, then retry test push.')
      return
    }

    try {
      setCloudBusy(true)
      setPushStatus('Registering this device and sending test push...')
      const sync = await upsertCurrentPushSubscription(cloudSession, { notifEnabled: readSmartNotifEnabled() })
      if (sync?.status !== 'ok') {
        const reason = String(sync?.reason || 'subscription-sync-skipped')
        setPushStatus(`Push registration skipped (${reason}).`)
        return
      }
      const result = await cloudSendPushTest(cloudSession)
      const sent = Number(result?.sent || 0)
      const total = Number(result?.total || sent)
      if (sent > 0) {
        setPushStatus(`Test push sent (${sent}/${total} device${total === 1 ? '' : 's'}).`)
      } else {
        setPushStatus('No active push device found yet. Open Peggy as installed PWA and allow notifications.')
      }
    } catch (err) {
      setPushStatus('Test push failed: ' + err.message)
    } finally {
      setCloudBusy(false)
    }
  }

  const handleLocalNotifTest = async () => {
    setNotifStatus('Running local notification test...')

    const isStandalone = (() => {
      if (typeof window === 'undefined') return false
      return window.matchMedia?.('(display-mode: standalone)')?.matches
        || window.navigator?.standalone === true
    })()

    if (typeof Notification === 'undefined') {
      setNotifStatus('Notifications are not supported on this browser/device.')
      return
    }

    let permission = Notification.permission
    if (permission === 'default') {
      try {
        permission = await Notification.requestPermission()
      } catch {
        permission = Notification.permission
      }
      setNotifPermission(permission)
    }

    if (permission !== 'granted') {
      setNotifStatus('Notification permission is not granted. Enable it first for this device.')
      appendSmartNotifInbox({
        title: 'Local notification test blocked',
        body: `Permission is ${permission}.`,
        type: 'test',
        level: 'nudge',
        status: 'missed',
        reason: `permission-${permission}`,
        source: 'local',
        slotKey: `local-test|permission|${permission}`,
        dedupeKey: `local-test|permission|${permission}`,
        createdAt: new Date().toISOString(),
        read: false,
      })
      setNotifInbox(readSmartNotifInbox())
      return
    }

    const title = 'Peggy local test'
    const body = isStandalone
      ? 'Notification pipeline is active on this installed app.'
      : 'Notification test from browser mode. For iPhone lock-screen push, use Home Screen app.'
    const options = {
      body,
      icon: `${import.meta.env.BASE_URL || '/'}icon-192.png`,
      badge: `${import.meta.env.BASE_URL || '/'}icon-192.png`,
      tag: `peggy-local-test-${Date.now()}`,
      renotify: false,
      requireInteraction: false,
      timestamp: Date.now(),
    }

    try {
      let route = 'notification-api'
      let sent = false
      let swMessageQueued = false
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready
        if (registration?.active) {
          registration.active.postMessage({
            type: 'peggy-local-test',
            payload: {
              title,
              body,
              icon: options.icon,
              badge: options.badge,
              tag: options.tag,
              url: import.meta.env.BASE_URL || '/',
            },
          })
          swMessageQueued = true
        }
        if (registration?.showNotification) {
          await registration.showNotification(title, options)
          route = swMessageQueued ? 'service-worker-message+showNotification' : 'service-worker-showNotification'
          sent = true
        }
      }
      if (!sent) {
        new Notification(title, options)
        route = swMessageQueued ? 'service-worker-message+notification-api' : 'notification-api'
        sent = true
      }
      if (!sent) {
        throw new Error('No available notification route')
      }
      const testAt = new Date().toISOString()
      setNotifLastTestAt(testAt)
      appendSmartNotifInbox({
        title: 'Local test sent',
        body: `Route: ${route}. Standalone: ${isStandalone ? 'yes' : 'no'}.`,
        type: 'test',
        level: 'gentle',
        status: 'sent',
        source: 'local',
        slotKey: `local-test|${route}|${testAt.slice(0, 16)}`,
        dedupeKey: `local-test|${route}|${testAt.slice(0, 16)}`,
        createdAt: testAt,
        read: false,
      })
      setNotifInbox(readSmartNotifInbox())
      setNotifStatus(
        `Local test sent via ${route}. ` +
        `${isStandalone ? '' : 'Open Peggy from Home Screen for iPhone lock-screen behavior. '}` +
        'If no banner appears, check iOS Notification settings + Focus mode.'
      )
    } catch (err) {
      setNotifStatus(`Local test failed: ${err.message}`)
      appendSmartNotifInbox({
        title: 'Local test failed',
        body: String(err?.message || 'unknown error'),
        type: 'test',
        level: 'nudge',
        status: 'missed',
        reason: 'local-test-failed',
        source: 'local',
        slotKey: 'local-test|failed',
        dedupeKey: `local-test|failed|${new Date().toISOString().slice(0, 16)}`,
        createdAt: new Date().toISOString(),
        read: false,
      })
      setNotifInbox(readSmartNotifInbox())
    }
  }

  const suppReminderCtx = useMemo(
    () => getSupplementReminderContext({ dailySupp, suppSchedule, now: notifNow }),
    [dailySupp, suppSchedule, notifNowTick],
  )
  const workReminderCtx = useMemo(
    () => getWorkReminderContext({ attendance, now: notifNow }),
    [attendance, notifNowTick],
  )
  const moodReminderCtx = useMemo(
    () => getMoodReminderContext({ moods, now: notifNow }),
    [moods, notifNowTick],
  )
  const plannerReminderCtx = useMemo(
    () => getPlannerReminderContext({ planner, now: notifNow }),
    [planner, notifNowTick],
  )
  const unreadNotifCount = useMemo(
    () => (Array.isArray(notifInbox) ? notifInbox.filter(item => !item?.read).length : 0),
    [notifInbox],
  )
  const livePendingNotifications = useMemo(() => {
    const out = []
    if (suppReminderCtx.remainingDoses > 0 && isSmartNotifChannelEnabled('reminders', notifChannels)) {
      const next = buildSupplementReminder(suppReminderCtx, notifNow, 'notifications-preview')
      if (next) out.push(next)
    }
    if (workReminderCtx.needsReminder && isSmartNotifChannelEnabled('reminders', notifChannels)) {
      const next = buildWorkReminder(workReminderCtx, notifNow, 'notifications-preview')
      if (next) out.push(next)
    }
    if (moodReminderCtx.needsReminder && isSmartNotifChannelEnabled('reminders', notifChannels)) {
      const next = buildMoodReminder(moodReminderCtx, notifNow, 'notifications-preview')
      if (next) out.push(next)
    }
    if (plannerReminderCtx?.candidate?.planId && isSmartNotifChannelEnabled('calendar', notifChannels)) {
      const next = buildPlannerReminder(plannerReminderCtx, notifNow, 'notifications-preview')
      if (next) out.push(next)
    }
    return out
  }, [
    suppReminderCtx.remainingDoses,
    suppReminderCtx.overdueDoses,
    workReminderCtx.needsReminder,
    moodReminderCtx.needsReminder,
    plannerReminderCtx?.candidate?.planId,
    plannerReminderCtx?.pendingOverdueCount,
    plannerReminderCtx?.pendingTodayCount,
    notifChannels,
    notifNowTick,
  ])

  const handleMarkNotifRead = (id) => {
    markSmartNotifInboxRead(id)
    setNotifInbox(readSmartNotifInbox())
  }

  const handleMarkAllNotifRead = () => {
    markAllSmartNotifInboxRead()
    setNotifInbox(readSmartNotifInbox())
  }

  const handleClearNotifInbox = () => {
    clearSmartNotifInbox()
    setNotifInbox([])
  }

  return (
    <div className="content">
      <div className="sub-tabs glass-tabs">
        {['info', 'notifications', 'photos', 'contacts', 'settings'].map(t => (
          <button key={t} className={`glass-tab ${subTab === t ? 'active' : ''}`} onClick={() => setSubTab(t)}>
            <span className="tab-icon-label">
              <UiIcon icon={t === 'info' ? APP_ICONS.info : t === 'notifications' ? APP_ICONS.reminders : t === 'photos' ? APP_ICONS.photos : t === 'contacts' ? APP_ICONS.contacts : APP_ICONS.backup} />
              <span>{t === 'info' ? 'Info' : t === 'notifications' ? 'Notifications' : t === 'photos' ? 'Photos' : t === 'contacts' ? 'Contacts' : 'Settings'}</span>
            </span>
          </button>
        ))}
      </div>

      {subTab === 'info' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.info} /></span>
            <div>
              <h2>Knowledge Base</h2>
              <span className="section-count">All info from all guides</span>
            </div>
          </div>
          <p className="section-note">Everything you need to know, organized by topic. All info from the original guides is here.</p>

          <div className="info-nav">
            {INFO_SECTIONS.map(s => (
              <button
                key={s.id}
                className={`info-nav-btn glass-inner ${infoSection === s.id ? 'active' : ''}`}
                onClick={() => setInfoSection(s.id)}
              >
                <span className="info-nav-icon"><TokenIcon token={s.icon} /></span>
                <span className="info-nav-label">{s.label}</span>
              </button>
            ))}
          </div>

          <InfoPanel section={infoSection} />
        </section>
      )}

      {subTab === 'notifications' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.reminders} /></span>
            <div>
              <h2>Notifications</h2>
              <span className="section-count">{unreadNotifCount} unread</span>
            </div>
          </div>
          <p className="section-note">
            Inbox of sent, missed, and opened notifications. Use this to review anything Naomi missed.
          </p>

          <div className="backup-cloud-actions">
            <button type="button" className="btn-glass-secondary" onClick={handleMarkAllNotifRead}>
              Mark all read
            </button>
            <button type="button" className="btn-glass-secondary" onClick={handleClearNotifInbox}>
              Clear history
            </button>
          </div>

          <div className="glass-card backup-card">
            <h3>Live Pending</h3>
            {livePendingNotifications.length ? (
              <ul className="notif-inbox-list">
                {livePendingNotifications.map((item) => (
                  <li key={`live-${item.slotKey}`} className="notif-inbox-item glass-inner unread">
                    <div className="notif-inbox-top">
                      <span className={`notif-chip ${item.level}`}>Pending</span>
                      <span className="notif-time">now</span>
                    </div>
                    <div className="notif-title">{item.notificationTitle}</div>
                    <div className="notif-body">{item.notificationBody}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">No pending notification candidates right now.</p>
            )}
          </div>

          <div className="glass-card backup-card">
            <h3>History</h3>
            {notifInbox.length ? (
              <ul className="notif-inbox-list">
                {notifInbox.map((item) => (
                  <li
                    key={item.id}
                    className={`notif-inbox-item glass-inner ${item.read ? '' : 'unread'}`}
                    onClick={() => handleMarkNotifRead(item.id)}
                  >
                    <div className="notif-inbox-top">
                      <span className={`notif-chip ${item.status || 'sent'}`}>{item.status || 'sent'}</span>
                      <span className="notif-time">{formatNotificationTime(item.createdAt)}</span>
                    </div>
                    <div className="notif-title">{item.title}</div>
                    <div className="notif-body">{item.body}</div>
                    <div className="notif-meta">
                      <span>{String(item.type || 'general')}</span>
                      {item.reason ? <span>{formatNotifReason(item.reason)}</span> : null}
                      <span>{String(item.source || 'local')}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="section-note">No notification history yet.</p>
            )}
          </div>
        </section>
      )}

      {subTab === 'photos' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.photos} /></span>
            <div>
              <h2>Photo Gallery</h2>
              <span className="section-count">{photos.length} photos</span>
            </div>
          </div>
          <p className="section-note">Upload ultrasounds, documents, receipts. All stored on your device only.</p>

          <div className="photo-categories">
            {PHOTO_CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`photo-cat-btn glass-inner ${photoCategory === cat ? 'active' : ''}`}
                onClick={() => setPhotoCategory(cat)}
              >{cat}</button>
            ))}
          </div>

          <div className="photo-upload">
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} id="photo-input" style={{ display: 'none' }} />
            <button className="btn-glass-primary upload-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading...' : `Upload to ${photoCategory}`}
            </button>
          </div>

          {photos.length > 0 ? (
            <div className="photo-grid">
              {photos.map(p => (
                <div key={p.id} className="photo-thumb" onClick={() => setViewPhoto(p)}>
                  <img src={p.data} alt={p.name} />
                  <div className="photo-date">{new Date(p.date).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No {photoCategory.toLowerCase()} photos yet.</p>
          )}

          {viewPhoto && (
            <div className="photo-modal" onClick={() => setViewPhoto(null)}>
              <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
                <img src={viewPhoto.data} alt={viewPhoto.name} />
                <div className="photo-modal-info">
                  <span>{viewPhoto.name}</span>
                  <span>{new Date(viewPhoto.date).toLocaleDateString()}</span>
                </div>
                <div className="photo-modal-actions">
                  <button className="btn-glass-secondary" onClick={() => setViewPhoto(null)}>Close</button>
                  <button className="btn-delete" onClick={() => handleDelete(viewPhoto.id)}>Delete</button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {subTab === 'contacts' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.contacts} /></span>
            <div>
              <h2>Emergency Contacts</h2>
              <span className="section-count">{contacts.length} contacts</span>
            </div>
          </div>
          <p className="section-note">Keep important contacts handy. Tap the phone button to call.</p>

          <ul className="contact-list">
            {contacts.map(c => (
              <li key={c.id} className="glass-card contact-item">
                {editContact === c.id ? (
                  <div className="contact-edit">
                    <input type="text" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" />
                    <input type="tel" value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" />
                    <input type="text" value={contactForm.relationship} onChange={e => setContactForm(p => ({ ...p, relationship: e.target.value }))} placeholder="Relationship" />
                    <div className="form-buttons">
                      <button className="btn-glass-primary" onClick={saveEditContact}>Save</button>
                      <button className="btn-glass-secondary" onClick={() => { setEditContact(null); setContactForm({ name: '', phone: '', relationship: '' }) }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="contact-display">
                    <div className="contact-info" onClick={() => startEditContact(c)}>
                      <div className="contact-name">{c.name}</div>
                      <div className="contact-role">{c.relationship}</div>
                      {c.phone && <div className="contact-phone">{c.phone}</div>}
                    </div>
                    <div className="contact-actions">
                      {c.phone && <a href={`tel:${c.phone}`} className="btn-call"><UiIcon icon={APP_ICONS.contacts} /></a>}
                      <button className="btn-delete-sm" onClick={() => removeContact(c.id)}>×</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form className="add-contact-form glass-card" onSubmit={handleAddContact}>
            <h3>Add Contact</h3>
            <input type="text" value={editContact ? '' : contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Name" required disabled={!!editContact} />
            <input type="tel" value={editContact ? '' : contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" disabled={!!editContact} />
            <input type="text" value={editContact ? '' : contactForm.relationship} onChange={e => setContactForm(p => ({ ...p, relationship: e.target.value }))} placeholder="Relationship" disabled={!!editContact} />
            <button type="submit" className="btn-glass-primary" disabled={!!editContact}>Add Contact</button>
          </form>

          <div className="glass-card backup-card">
            <div className="section-header">
              <span className="section-icon"><UiIcon icon={APP_ICONS.doctor} /></span>
              <div><h3>Doctor / Hospital Info</h3></div>
            </div>
            <p className="section-note">Save your OB-GYN and hospital details for quick access.</p>

            <div className="doctor-form">
              <div className="form-row"><label>OB-GYN Name</label>
                <input type="text" value={doctor.name} onChange={e => setDoctor(p => ({ ...p, name: e.target.value }))} placeholder="Dr. ..." />
              </div>
              <div className="form-row"><label>Hospital / Clinic</label>
                <input type="text" value={doctor.hospital} onChange={e => setDoctor(p => ({ ...p, hospital: e.target.value }))} placeholder="Hospital name" />
              </div>
              <div className="form-row"><label>Phone</label>
                <div className="input-with-action">
                  <input type="tel" value={doctor.phone} onChange={e => setDoctor(p => ({ ...p, phone: e.target.value }))} placeholder="0XX-XXXX-XXXX" />
                  {doctor.phone && <a href={`tel:${doctor.phone}`} className="btn-call">Call</a>}
                </div>
              </div>
              <div className="form-row"><label>Address</label>
                <input type="text" value={doctor.address} onChange={e => setDoctor(p => ({ ...p, address: e.target.value }))} placeholder="Hospital address" />
              </div>
              <div className="form-row"><label>Notes</label>
                <textarea value={doctor.notes} onChange={e => setDoctor(p => ({ ...p, notes: e.target.value }))} placeholder="Visiting hours, special instructions, etc." />
              </div>
            </div>
          </div>
        </section>
      )}

      {subTab === 'settings' && (
        <section className="glass-section">
          <div className="section-header">
            <span className="section-icon"><UiIcon icon={APP_ICONS.backup} /></span>
            <div><h2>Settings & Backup</h2></div>
          </div>

          <div className="backup-section">
            <p className="section-note">
              Your data is stored in localStorage + IndexedDB. Para safe talaga, mag-backup ka regularly!
            </p>

            <div className="glass-card backup-card notif-settings-card">
              <div className="section-header">
                <span className="section-icon"><UiIcon icon={APP_ICONS.reminders} /></span>
                <div>
                  <h3>Notification Settings</h3>
                  <span className="section-count">Per-device settings</span>
                </div>
                <button
                  type="button"
                  className={`notif-toggle-btn glass-inner ${notifEnabled ? 'on' : ''}`}
                  onClick={handleNotifToggle}
                >
                  {notifEnabled ? 'Notifications ON' : 'Enable Notifications'}
                </button>
              </div>
              <div className="notif-settings-grid">
                <div className="notif-channel-grid">
                  <button
                    type="button"
                    className={`notif-channel-btn glass-inner ${isSmartNotifChannelEnabled('reminders', notifChannels) ? 'on' : ''}`}
                    onClick={() => handleNotifChannelToggle('reminders')}
                  >
                    Reminders {isSmartNotifChannelEnabled('reminders', notifChannels) ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`notif-channel-btn glass-inner ${isSmartNotifChannelEnabled('calendar', notifChannels) ? 'on' : ''}`}
                    onClick={() => handleNotifChannelToggle('calendar')}
                  >
                    Calendar {isSmartNotifChannelEnabled('calendar', notifChannels) ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`notif-channel-btn glass-inner ${isSmartNotifChannelEnabled('dailyTip', notifChannels) ? 'on' : ''}`}
                    onClick={() => handleNotifChannelToggle('dailyTip')}
                  >
                    Daily Tip {isSmartNotifChannelEnabled('dailyTip', notifChannels) ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    className={`notif-channel-btn glass-inner ${isSmartNotifChannelEnabled('names', notifChannels) ? 'on' : ''}`}
                    onClick={() => handleNotifChannelToggle('names')}
                  >
                    Names {isSmartNotifChannelEnabled('names', notifChannels) ? 'ON' : 'OFF'}
                  </button>
                </div>
                <button
                  type="button"
                  className={`notif-pill-btn glass-inner ${quietHours.enabled ? 'on' : ''}`}
                  onClick={handleQuietHoursToggle}
                >
                  {quietHours.enabled ? 'Quiet Hours ON' : 'Quiet Hours OFF'}
                </button>
                <label className="notif-time-field">
                  <span>Start</span>
                  <input
                    type="time"
                    value={quietHours.start}
                    disabled={!quietHours.enabled}
                    onChange={e => handleQuietHoursTimeChange('start', e.target.value)}
                  />
                </label>
                <label className="notif-time-field">
                  <span>End</span>
                  <input
                    type="time"
                    value={quietHours.end}
                    disabled={!quietHours.enabled}
                    onChange={e => handleQuietHoursTimeChange('end', e.target.value)}
                  />
                </label>
              </div>
              <p className="section-note">
                Quiet hours: {formatSmartNotifQuietHoursLabel(quietHours)}. During quiet hours, reminders stay silent pero badge updates continue.
              </p>
              <p className="section-note">
                Permission: {notifPermission === 'unsupported' ? 'unsupported' : notifPermission}.
                {' '}Quiet hours active now: {quietHoursActiveNow ? 'yes' : 'no'}.
              </p>
              <p className="section-note">
                Mode: {(typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true))
                  ? 'Home Screen App'
                  : 'Browser tab'}.
                {notifLastTestAt ? ` Last local test: ${new Date(notifLastTestAt).toLocaleString()}.` : ''}
              </p>
              <p className="section-note">
                New installs start with Notifications OFF by default. Enable manually per device.
              </p>
              <p className="section-note">
                Mood reminder slots: 12:00, 17:00, 20:00 (only if today has no mood log yet).
              </p>
              <div className="backup-cloud-actions">
                <button
                  type="button"
                  className="btn-glass-secondary"
                  onClick={handleLocalNotifTest}
                >
                  Send Local Test
                </button>
              </div>
              {notifStatus && <p className="section-note">{notifStatus}</p>}
            </div>

            <div className="glass-card backup-card">
              <h3>Family Setup</h3>
              <p className="section-note">Control whether Shinji side appears in Work and Salary tabs.</p>
              <div className="household-toggle-row glass-inner">
                <div>
                  <div className="household-toggle-title">Show Shinji side</div>
                  <div className="household-toggle-note">Turn off for single-mother mode</div>
                </div>
                <button
                  type="button"
                  className={`notif-pill-btn glass-inner ${includeHusband ? 'on' : ''}`}
                  onClick={() => setFamilyConfig(prev => ({ ...(prev || {}), includeHusband: !includeHusband }))}
                >
                  {includeHusband ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>

            <div className="glass-card backup-card design-card">
              <h3>UI Icon Style (Local Preview)</h3>
              <p className="section-note">Choose the icon design you like. Saved on this device only.</p>
              <div className="design-picker">
                {ICON_STYLE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`design-choice glass-inner ${activeIconStyle === preset.id ? 'active' : ''}`}
                    onClick={() => setIconStyle(preset.id)}
                  >
                    <span className="design-choice-title">{preset.label}</span>
                    <span className="design-choice-desc">{preset.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="backup-actions">
              <div className="glass-card backup-card">
                <h3>Export Backup</h3>
                <p className="section-note">Downloads a JSON file with ALL your data + photos.</p>
                <button className="btn-glass-primary" onClick={handleExport}>Download Backup</button>
              </div>
              <div className="glass-card backup-card">
                <h3>Restore from Backup</h3>
                <p className="section-note">Upload a backup file. This overwrites current data.</p>
                <input ref={restoreRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                <button className="btn-glass-secondary" onClick={() => restoreRef.current?.click()}>Upload Backup File</button>
              </div>
              <div className="glass-card backup-card">
                <h3>Cloud Sync (Supabase)</h3>
                {!cloudEnabled ? (
                  <p className="section-note">Not configured yet. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `app/.env.local`.</p>
                ) : (
                  <>
                    <p className="section-note">Auto-sync is enabled per account. On sign in, your cloud data is applied automatically.</p>
                    {cloudSession ? (
                      <p className="cloud-user">Signed in: {cloudSession.user.email || cloudSession.user.id}</p>
                    ) : (
                      <>
                        <div className="form-row">
                          <label>Email</label>
                          <input
                            type="email"
                            value={cloudEmail}
                            onChange={e => setCloudEmail(e.target.value)}
                            placeholder="you@example.com"
                            disabled={cloudBusy}
                          />
                        </div>
                        <div className="form-row">
                          <label>Password</label>
                          <input
                            type="password"
                            value={cloudPassword}
                            onChange={e => setCloudPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            disabled={cloudBusy}
                          />
                        </div>
                        <div className="backup-cloud-actions">
                          <button className="btn-glass-primary" onClick={handleCloudSignIn} disabled={cloudBusy}>Sign In</button>
                          <button className="btn-glass-secondary" onClick={handleCloudSignUp} disabled={cloudBusy}>Sign Up</button>
                        </div>
                      </>
                    )}

                    {cloudSession && (
                      <div className="backup-cloud-actions">
                        <button className="btn-glass-primary" onClick={handleCloudUpload} disabled={cloudBusy}>Force Upload</button>
                        <button className="btn-glass-secondary" onClick={handleCloudDownload} disabled={cloudBusy}>Force Download</button>
                        <button className="btn-glass-secondary" onClick={handlePushTest} disabled={cloudBusy}>Send Test Push</button>
                        <button className="btn-glass-secondary" onClick={handleCloudSignOut} disabled={cloudBusy}>Sign Out</button>
                      </div>
                    )}
                    <p className="section-note">
                      Push status: {pushSupported ? (pushVapidReady ? 'Ready for Web Push setup.' : 'Missing VAPID key in frontend env.') : 'Not supported on this browser.'}
                    </p>
                    <p className="section-note">iPhone note: install Peggy to Home Screen, then allow notifications when prompted.</p>
                    {pushStatus && <p className="section-note">{pushStatus}</p>}
                  </>
                )}
              </div>
            </div>

            {backupStatus && <div className="backup-status glass-card">{backupStatus}</div>}
            {cloudStatus && <div className="backup-status cloud-status glass-card">{cloudStatus}</div>}

            <div className="glass-card">
              <h3>Data Safety Tips</h3>
              <ul className="safety-tips">
                <li>Backup after every checkup or important data entry</li>
                <li>Save backup to cloud (iCloud, Google Drive)</li>
                <li>Deleting browser history MIGHT delete localStorage</li>
                <li>IndexedDB is safer but not 100% guaranteed</li>
                <li>The backup file has EVERYTHING including photos</li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
