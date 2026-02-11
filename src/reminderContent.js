import { supplements } from './data'

function hashString(value) {
  let hash = 0
  const text = String(value || '')
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function pickBySeed(list, seed) {
  if (!Array.isArray(list) || list.length === 0) return ''
  const idx = hashString(seed) % list.length
  return list[idx]
}

function weightedPick(options, seed) {
  const safe = Array.isArray(options) ? options.filter(o => o && o.weight > 0) : []
  if (safe.length === 0) return null
  const total = safe.reduce((acc, o) => acc + o.weight, 0)
  const roll = hashString(seed) % total
  let cursor = 0
  for (const option of safe) {
    cursor += option.weight
    if (roll < cursor) return option.id
  }
  return safe[0].id
}

function minutesSinceMidnight(now) {
  return now.getHours() * 60 + now.getMinutes()
}

function parseClockMinutes(value) {
  const [h, m] = String(value || '00:00').split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return (h * 60) + m
}

function parseOptionalClockMinutes(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const [h, m] = raw.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return (h * 60) + m
}

function toIsoDate(now) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toDoseDateKey(now) {
  return now.toDateString()
}

function ensureSentence(text) {
  const safe = String(text || '').trim()
  if (!safe) return ''
  return /[.!?]$/.test(safe) ? safe : `${safe}.`
}

function expandStringArrayByFour(list, variantTails) {
  const source = Array.isArray(list) ? list.filter(Boolean) : []
  if (source.length === 0) return []
  const tails = Array.isArray(variantTails) && variantTails.length >= 3
    ? variantTails.slice(0, 3)
    : ['Rotation variant A.', 'Rotation variant B.', 'Rotation variant C.']

  return source.flatMap(item => {
    const base = String(item).trim()
    if (!base) return []
    const sentence = ensureSentence(base)
    return [
      base,
      `${sentence} ${tails[0]}`,
      `${sentence} ${tails[1]}`,
      `${sentence} ${tails[2]}`,
    ]
  })
}

function expandLevelMapByFour(levelMap, variantTails) {
  const out = {}
  for (const [level, list] of Object.entries(levelMap || {})) {
    out[level] = expandStringArrayByFour(list, variantTails)
  }
  return out
}

function expandNestedLevelMapByFour(styleMap, variantTails) {
  const out = {}
  for (const [style, levelMap] of Object.entries(styleMap || {})) {
    out[style] = expandLevelMapByFour(levelMap, variantTails)
  }
  return out
}

function expandTipArrayByFour(list, variantTails) {
  const source = Array.isArray(list) ? list.filter(Boolean) : []
  if (source.length === 0) return []
  const tails = Array.isArray(variantTails) && variantTails.length >= 3
    ? variantTails.slice(0, 3)
    : ['Keep this in your notes.', 'Action step: do one tiny step now.', 'Review this in your next checkup.']

  return source.flatMap(item => {
    const category = String(item?.category || 'General').trim() || 'General'
    const text = String(item?.text || '').trim()
    if (!text) return []
    const sentence = ensureSentence(text)
    return [
      { category, text },
      { category, text: `${sentence} ${tails[0]}` },
      { category, text: `${sentence} ${tails[1]}` },
      { category, text: `${sentence} ${tails[2]}` },
    ]
  })
}

const LANGUAGE_STYLE_WEIGHTS = [
  { id: 'taglish', weight: 40 },
  { id: 'english_tagalog', weight: 16 },
  { id: 'nihongo_tagalog', weight: 13 },
  { id: 'english', weight: 16 },
  { id: 'bisaya_tagalog', weight: 5 },
  { id: 'bisaya_english', weight: 3 },
  { id: 'nihongo_tagalog_english_bisaya', weight: 2 },
]

const SUPP_TITLE_DATABASE = {
  gentle: [
    'Love check-in: supplement time audit.',
    'Friendly nudge from Peggy.',
    'Health mission update, mommy.',
    'Quick body-and-baby check.',
    'Tiny reminder, big impact.',
    'Brain-and-bones shift incoming.',
    'Micro habit, macro benefit.',
    'Just checking your dose streak.',
  ],
  nudge: [
    'Nudge mode: may pending doses pa.',
    'Midday ping: supplements still waiting.',
    'Gentle pressure activated.',
    'Status red-ish: unfinished doses today.',
    'Checklist says we still have work.',
    'Recharge ping: baby fuel not complete.',
    'Kaya pa habulin ang streak.',
    'Reminder wave #2 just landed.',
  ],
  urgent: [
    'Escalation: may overdue doses na.',
    'Alert mode: supplement window is slipping.',
    'Mission critical: tapusin natin today.',
    'Red alert-ish but still fixable.',
    'Overdue detected. We can still recover.',
    'Final stretch reminder activated.',
    'Clock is loud today. Dose now.',
    'Priority ping: overdue stack growing.',
  ],
}

const SUPP_STYLE_LINES = {
  taglish: {
    gentle: [
      'Konting consistency lang, malaking tulong sa baby development.',
      'Slow and steady lang tayo, mommy.',
      'Daily wins beat perfect plans.',
      'Small repeat actions build a safer pregnancy.',
    ],
    nudge: [
      'Pwede pa habulin before evening.',
      'Hindi pa late, pero wag na patagalin.',
      'Let us convert this into a quick win.',
      'One round now, less stress mamaya.',
    ],
    urgent: [
      'Overdue na, so best move is take next dose now.',
      'Kung kaya now, gawin na natin agad.',
      'Quick action now saves next-hours stress.',
      'Habol na tayo before bedtime.',
    ],
  },
  english_tagalog: {
    gentle: [
      'One clean dose at a time, then tuloy ang day.',
      'Progress over perfection, tuloy lang.',
      'Today still has room for a clean finish.',
      'Your future self will thank you mamaya.',
    ],
    nudge: [
      'You still have runway today, pero move na.',
      'Short task now, calmer night later.',
      'Do one now, then we reassess.',
      'Lock one dose first, then momentum follows.',
    ],
    urgent: [
      'Clock is tight. Best move: execute now.',
      'Overdue already, kaya immediate action na.',
      'One tap now clears the highest risk.',
      'Do not negotiate with this timer.',
    ],
  },
  nihongo_tagalog: {
    gentle: [
      'Daijoubu, konti konti lang pero tuloy tuloy.',
      'Yoshi, one dose muna then continue ka na.',
      'Genki track tayo kapag consistent ang doses.',
      'Muri shinaide, pero wag kalimot.',
    ],
    nudge: [
      'Mou sukoshi, kaya mo pa habulin today.',
      'Ima nara safe pa, inom na muna.',
      'Ganbatte, one set now then pahinga.',
      'Ato de ja delikado, ngayon na.',
    ],
    urgent: [
      'Ima sugu dose na. Overdue na tayo.',
      'Hayaku one round now, then breathe.',
      'Daiji na timing ito, act now.',
      'Osoku naru mae ni tapusin na.',
    ],
  },
  english: {
    gentle: [
      'Steady rhythm keeps the day smooth.',
      'A quick dose now protects the whole plan.',
      'Tiny action, high return for mom and baby.',
      'Consistency wins more than intensity.',
    ],
    nudge: [
      'You are still on time if you move now.',
      'This is the perfect moment to recover pace.',
      'Do one now and the rest gets easier.',
      'Pending doses are manageable right now.',
    ],
    urgent: [
      'Overdue marker is up. Act now.',
      'Delay costs more energy later.',
      'Run the next dose immediately.',
      'Critical reminder: clear one dose now.',
    ],
  },
  bisaya_tagalog: {
    gentle: [
      'Hinay hinay lang, basta padayon ta.',
      'Ayaw kalimot ha, konti na effort lang.',
      'Sakto ra ni, one step then okay na.',
      'Kaya ra nimo, tuloy tuloy lang.',
    ],
    nudge: [
      'Naay pending pa, lihok na gamay.',
      'Pwede pa maapas, inom na karon.',
      'Dali ra ni tapuson, go na.',
      'Ayaw paabti ug gabii, karon na.',
    ],
    urgent: [
      'Overdue na ni, inom dayon.',
      'Dili na ni pa-urong, action na.',
      'Karon jud dapat, para dili maipon.',
      'Lihok dayon, mommy, kaya pa ni.',
    ],
  },
  bisaya_english: {
    gentle: [
      'Padayon lang, one dose and keep rolling.',
      'Small move now, better night later.',
      'Ayaw skip, this one matters.',
      'You are doing great, keep the rhythm.',
    ],
    nudge: [
      'Pending ni, best time is now.',
      'Catch up run starts with one tap.',
      'Dali lang ni, then back to chill.',
      'Go now before this turns stressful.',
    ],
    urgent: [
      'Overdue na, execute now.',
      'This is the must-do item right now.',
      'Do not delay this one anymore.',
      'One action now solves a lot.',
    ],
  },
  nihongo_tagalog_english_bisaya: {
    gentle: [
      'Ganbatte mommy, kaya ra ni, one dose now.',
      'Daijoubu pa, inom gamay then continue.',
      'Yoshi, small step lang then relax.',
      'Mou ippai not coffee, supplement muna.',
    ],
    nudge: [
      'Hayaku gamay, pending pa ni today.',
      'Ima now na, para smooth ang gabi.',
      'One quick run now then chill ta.',
      'Ganbatte, one dose then done na half.',
    ],
    urgent: [
      'Ima sugu na, overdue jud.',
      'Hayaku please, this is urgent na.',
      'Action now, para dili ma-stack.',
      'Karon na, no delay mode.',
    ],
  },
}

const SUPP_PUSH_LINES = {
  gentle: [
    'Baby brain, blood, and bones love routine.',
    'Consistency helps reduce decision fatigue later.',
    'One dose now is easier than three later.',
    'Future-you sends thanks in advance.',
  ],
  nudge: [
    'Catch-up is still easy at this point.',
    'Take one now to avoid night-time backlog.',
    'A 30-second action clears mental load.',
    'Momentum starts with one tap.',
  ],
  urgent: [
    'Overdue stacks become stressful, so clear one now.',
    'Prioritize this before any low-value task.',
    'Fast action now protects your evening rest.',
    'Execute first, then celebrate with a snack.',
  ],
}

const SUPP_JOKE_LINES = {
  gentle: [
    'Peggy payroll says: supplement compliance bonus unlocked.',
    'Ryzen quality control approves this reminder.',
    'Your vitamins are waiting like loyal side quests.',
    'This is your tiny boss fight. Easy clear.',
  ],
  nudge: [
    'The supplements are filing a polite complaint.',
    'Reminder team brought snacks if you tap now. Imaginary snacks, but still.',
    'Pending doses are louder than notifications today.',
    'No pressure, just strategic panic with love.',
  ],
  urgent: [
    'Emergency joke: this is the good kind of panic.',
    'Supplements are now knocking at the front door.',
    'Last call before the guilt DLC unlocks.',
    'Critical meme status: do it now, then breathe.',
  ],
}

const WORK_TITLE_DATABASE = {
  gentle: [
    'Work log check-in.',
    'Attendance ping from Peggy.',
    'Quick shift-status reminder.',
    'Small admin nudge.',
    'Paperwork whisper: log today.',
  ],
  nudge: [
    'Attendance still not logged.',
    'Midday reminder: mark work status.',
    'Shift tracker needs one tap.',
    'Log today before it gets forgotten.',
    'Daily work record still pending.',
  ],
  urgent: [
    'Late-day alert: attendance still empty.',
    'End-of-day push: log work now.',
    'Final call for today attendance.',
    'Overtime for memory starts now. Log it.',
    'Urgent admin ping: complete work log.',
  ],
}

const WORK_STYLE_LINES = {
  taglish: {
    gentle: [
      'Isang tap lang para walang backtracking bukas.',
      'Quick log now para clean ang records.',
      'Mas madali pag real-time nilalagay.',
      'Admin now, peace later.',
    ],
    nudge: [
      'Nasa gitna na tayo ng day, mark na natin.',
      'Para hindi hulaan later, log now.',
      'One minute task lang ito.',
      'Iwas memory tax tonight.',
    ],
    urgent: [
      'Gabi mode na, kaya log na agad.',
      'Bago matapos ang araw, close this loop.',
      'Habol na natin habang fresh pa details.',
      'Do not carry this to tomorrow.',
    ],
  },
  english_tagalog: {
    gentle: [
      'Keep records clean, then move on.',
      'One tap now para zero guesswork later.',
      'Fast log, long-term clarity.',
      'Simple admin, big peace of mind.',
    ],
    nudge: [
      'Still pending, better lock it now.',
      'Leave no loose ends today.',
      'Quick status entry then done ka na.',
      'Past-you will thank current-you.',
    ],
    urgent: [
      'High chance makalimutan pag inantay pa.',
      'Close this now before day rollover.',
      'Do the log first, then chill.',
      'This is the highest ROI tap right now.',
    ],
  },
  nihongo_tagalog: {
    gentle: [
      'Kintai log check, onegaishimasu.',
      'Ima one tap lang then okay.',
      'Yoshi, attendance muna before next task.',
      'Mou 1 minute lang ito.',
    ],
    nudge: [
      'Mada mitourokku, log na natin.',
      'Ima yareba easy, later mas hassle.',
      'Ganbatte, attendance first.',
      'Ato de ja risky, now na.',
    ],
    urgent: [
      'Kyou no kintai, ima sugu.',
      'Hayaku log now bago matapos ang araw.',
      'Overtime sa memory wag na, tap now.',
      'Shimekiri vibe na, close this item.',
    ],
  },
  english: {
    gentle: [
      'A fast work log keeps data reliable.',
      'Capture now while details are fresh.',
      'This takes under a minute.',
      'Clean tracking reduces future stress.',
    ],
    nudge: [
      'Still pending. Best time is now.',
      'Log now before context disappears.',
      'One quick update prevents backfill pain.',
      'Do the simple thing now.',
    ],
    urgent: [
      'Day is closing. Log attendance now.',
      'Final reminder before date rollover.',
      'Do this now or tomorrow gets messier.',
      'Immediate action recommended.',
    ],
  },
  bisaya_tagalog: {
    gentle: [
      'Gamaya ra ni, log na dayon.',
      'Ayaw kalimot sa attendance ha.',
      'One tap lang, human dayon.',
      'Padayon ta, clear ang record.',
    ],
    nudge: [
      'Pending pa gihapon, lihok na.',
      'Karon na para dili makalimtan.',
      'Dali ra kaayo ni buhaton.',
      'Tap na, then balik sa pahulay.',
    ],
    urgent: [
      'Last na ni, log dayon.',
      'Gabii na, ayaw na i-delay.',
      'Karon jud para clean ang adlaw.',
      'Dili na ni pwede later pa.',
    ],
  },
  bisaya_english: {
    gentle: [
      'Quick log now, no stress later.',
      'Simple admin task, kaya ra.',
      'Capture while fresh pa details.',
      'One minute check and done.',
    ],
    nudge: [
      'Pending pa, finish this now.',
      'No need overthink, just log it.',
      'Dali ra ni, then done.',
      'Do this first then relax.',
    ],
    urgent: [
      'Late na, attendance now.',
      'Immediate tap needed here.',
      'Close this before midnight.',
      'Critical admin item, run now.',
    ],
  },
  nihongo_tagalog_english_bisaya: {
    gentle: [
      'Kintai check, one tap lang ni.',
      'Daijoubu, quick log then chill ta.',
      'Ima now, para smooth ang later.',
      'Yoshi, admin quest clear ta.',
    ],
    nudge: [
      'Mada pending, do it karon.',
      'Hayaku one tap, then done na.',
      'Now na, ayaw pa-late.',
      'Ganbatte, attendance first.',
    ],
    urgent: [
      'Ima sugu log dayon.',
      'Karon na gyud, close this.',
      'Hayaku, day rollover incoming.',
      'No delay mode, execute now.',
    ],
  },
}

const WORK_JOKE_LINES = {
  gentle: [
    'Spreadsheet spirits are calmer when logs are complete.',
    'Admin goblins dislike missing attendance.',
    'One tiny tap defeats tomorrow confusion.',
    'Boring task, heroic impact.',
  ],
  nudge: [
    'The calendar is asking for closure.',
    'Your future brain requested less detective work.',
    'Pending admin quests are multiplying.',
    'Log first, memes after.',
  ],
  urgent: [
    'This is the boss fight of tiny tasks.',
    'Final warning from the kingdom of paperwork.',
    'Do not let midnight win this round.',
    'Emergency admin mode: one tap now.',
  ],
}

const SERIOUS_TIP_DATABASE = [
  { category: 'Supplements', text: 'Iron from prenatal vitamins absorbs better away from high-dose calcium. Keep at least a 2-hour gap when possible.' },
  { category: 'Supplements', text: 'DHA is fat-soluble. Taking it with a meal that has healthy fat usually improves absorption and reduces fishy burps.' },
  { category: 'Supplements', text: 'If nausea is strong, splitting supplements across meals can improve tolerance better than forcing everything in one sitting.' },
  { category: 'Supplements', text: 'Choline supports fetal brain and neural tube development. Eggs are one of the easiest food boosts on top of supplements.' },
  { category: 'Supplements', text: 'Magnesium and calcium can support leg cramps, but persistent severe cramps should still be discussed with your OB.' },
  { category: 'Hydration', text: 'Hydration target is usually spread through the day, not one-time chugging. Pale yellow urine is a practical hydration check.' },
  { category: 'Hydration', text: 'Frequent small sips can work better than big glasses if reflux or nausea is active.' },
  { category: 'Blood Pressure', text: 'Home BP checks become useful when done at similar times daily. Trend changes matter more than one random reading.' },
  { category: 'Blood Pressure', text: 'Call your provider urgently for severe headache, vision changes, right upper abdominal pain, or sudden swelling.' },
  { category: 'Nutrition', text: 'Protein spacing across meals helps energy stability. A protein-rich breakfast often reduces afternoon crashes.' },
  { category: 'Nutrition', text: 'If appetite is low, use dense small meals: yogurt, eggs, tofu, nut butter toast, banana, soup with protein.' },
  { category: 'Nutrition', text: 'Food safety matters more in pregnancy: avoid undercooked meat/eggs and unpasteurized dairy.' },
  { category: 'Food Safety', text: 'Heat deli meats until steaming when possible. It is a practical step for reducing listeria risk.' },
  { category: 'Food Safety', text: 'Wash produce well and separate raw meat cutting boards from ready-to-eat foods to reduce contamination risk.' },
  { category: 'Dental', text: 'Pregnancy hormones can increase gum bleeding. Gentle brushing plus flossing lowers inflammation and supports overall health.' },
  { category: 'Dental', text: 'Schedule dental cleaning/check early. Oral infections during pregnancy are linked with worse outcomes when ignored.' },
  { category: 'Sleep', text: 'Left-side sleeping can improve comfort and circulation in later pregnancy, but the best sleep position is the one you can sustain.' },
  { category: 'Sleep', text: 'A wind-down routine beats random bedtime: low light, warm shower, no heavy meals right before sleep.' },
  { category: 'Exercise', text: 'Regular low-intensity movement improves glucose control and mood. Consistency matters more than workout intensity.' },
  { category: 'Exercise', text: 'If a workout causes dizziness, pain, bleeding, or contractions, stop and contact your provider.' },
  { category: 'Checkups', text: 'Bring a short question list to each checkup. Anxiety drops when concerns are documented and answered in order.' },
  { category: 'Checkups', text: 'Track fetal movement pattern in late pregnancy. Sudden reduced movement is a same-day call to your provider.' },
  { category: 'Logistics', text: 'Pre-pack document pouch: insurance card, Boshi Techo, IDs, and key phone numbers. This removes panic during labor start.' },
  { category: 'Logistics', text: 'Hospital route rehearsal helps: best route, night route, taxi fallback, and estimated travel time.' },
  { category: 'Finance', text: 'Keep every medical receipt and transport note. Small expenses become significant when combined for tax deduction.' },
  { category: 'Finance', text: 'Set a monthly admin day for applications and forms. Batch processing reduces missed deadlines.' },
  { category: 'Finance', text: 'Benefits often require consultation or formal application. Automatic payout is rare without completing forms.' },
  { category: 'Mental Health', text: 'Daily 5-minute emotional check-ins can catch burnout early. Naming stress lowers its intensity.' },
  { category: 'Mental Health', text: 'Support requests work best when concrete: task, time, and expected outcome.' },
  { category: 'Postpartum', text: 'Plan postpartum logistics now: meals, sleep shifts, and emergency contacts. Early planning protects recovery.' },
  { category: 'Postpartum', text: 'Breastfeeding support contacts should be pre-saved before delivery, not searched while exhausted.' },
  { category: 'Work', text: 'Log attendance daily while memory is fresh. Late backfilling usually creates errors and stress.' },
  { category: 'Work', text: 'If work symptoms worsen, document time and trigger. Specific patterns help doctors and managers respond faster.' },
  { category: 'Communication', text: 'When calling offices, prepare: your ID details, purpose, and exact question. Short scripts save time.' },
  { category: 'Communication', text: 'If language barrier appears, ask for simpler Japanese, written notes, or interpreter services early.' },
  { category: 'Planning', text: 'Use a two-layer system: today actions and this-week actions. It keeps urgent tasks from hiding inside long lists.' },
  { category: 'Planning', text: 'Link reminders to real anchors: breakfast, lunch, bedtime. Context-based cues outperform random-time alarms.' },
  { category: 'Medical', text: 'Do not add herbs or new supplements without provider review. "Natural" does not always mean pregnancy-safe.' },
  { category: 'Medical', text: 'Bring current supplement list to appointments so drug-supplement interactions can be checked.' },
  { category: 'Medical', text: 'Persistent vomiting, dehydration signs, bleeding, fever, or severe pain are direct call triggers, not wait-and-see items.' },
  { category: 'Japan Admin', text: 'For Japan paperwork, deadlines are strict. Completing forms early is often worth more than finding perfect wording.' },
  { category: 'Japan Admin', text: 'Save agency phone numbers with labels. In urgent moments, navigation speed matters more than memory.' },
  { category: 'Family', text: 'Define backup caregivers and transport options now. Contingency plans reduce delivery-day chaos.' },
  { category: 'Family', text: 'Short daily updates between parents keep expectations aligned and reduce silent stress buildup.' },
]

const WITTY_TIP_DATABASE = [
  { category: 'Witty', text: 'Hydration check: if your water bottle has not moved in 2 hours, it is now decorative furniture.' },
  { category: 'Witty', text: 'Supplements are tiny, but their attitude is huge when ignored.' },
  { category: 'Witty', text: 'Admin forms are like laundry. Fold them early or they become emotional support piles.' },
  { category: 'Witty', text: 'Sleep strategy: less doom scroll, more pillow diplomacy.' },
  { category: 'Witty', text: 'If today feels heavy: one dose, one form, one glass of water. Three wins beats drama.' },
  { category: 'Witty', text: 'Your baby is running a premium growth subscription. Consistent inputs keep the service smooth.' },
  { category: 'Witty', text: 'Reminder: "later" is a scammer when paperwork is involved.' },
  { category: 'Witty', text: 'Ganbatte mode: small actions now so future-you can flex less panic, more peace.' },
  { category: 'Witty', text: 'Bisaya mini-mode: hinay lang pero padayon. Slow is still forward.' },
  { category: 'Witty', text: 'Nurse-level trick: write the question before appointment, because memory turns shy inside clinics.' },
  { category: 'Witty', text: 'Healthy routine is not glamorous. It is mostly repeating boring good decisions like a champion.' },
  { category: 'Witty', text: 'If you forgot a dose, no guilt spiral. Reset quickly and continue the mission.' },
]

const SUPP_TITLE_POOL = expandLevelMapByFour(SUPP_TITLE_DATABASE, [
  'Quick-win edition.',
  'Streak-protect mode.',
  'Consistency compounding mode.',
])

const SUPP_STYLE_POOL = expandNestedLevelMapByFour(SUPP_STYLE_LINES, [
  'One step now, less stress later.',
  'Momentum beats overthinking.',
  'Small action, strong outcome.',
])

const SUPP_PUSH_POOL = expandLevelMapByFour(SUPP_PUSH_LINES, [
  'You only need one tap to restart momentum.',
  'Protect the evening by acting now.',
  'Future-you gets calmer with this done.',
])

const SUPP_JOKE_POOL = expandLevelMapByFour(SUPP_JOKE_LINES, [
  'Comedy bonus unlocked for doing it now.',
  'Tiny quest, big victory screen.',
  'Mission control says this is worth it.',
])

const WORK_TITLE_POOL = expandLevelMapByFour(WORK_TITLE_DATABASE, [
  'Fast-log edition.',
  'No-backfill mode.',
  'Memory-friendly pass.',
])

const WORK_STYLE_POOL = expandNestedLevelMapByFour(WORK_STYLE_LINES, [
  'Fast tap, clean timeline.',
  'Close this loop before it grows.',
  'Tiny admin now saves future effort.',
])

const WORK_JOKE_POOL = expandLevelMapByFour(WORK_JOKE_LINES, [
  'Paperwork goblins lose this round.',
  'Admin quest XP +1.',
  'Tomorrow-you sends thanks.',
])

const SERIOUS_TIP_POOL = expandTipArrayByFour(SERIOUS_TIP_DATABASE, [
  'Clinical mindset: consistency matters.',
  'Action step: set one concrete reminder today.',
  'Note this for your next provider conversation.',
])

const WITTY_TIP_POOL = expandTipArrayByFour(WITTY_TIP_DATABASE, [
  'Comedy aside, this one really helps.',
  'Tiny move now beats panic later.',
  'Make it easy: one action right now.',
])

export function getSupplementReminderContext({ dailySupp, suppSchedule, now = new Date() }) {
  const dateKey = toIsoDate(now)
  const doseDateKey = toDoseDateKey(now)
  const nowMinutes = minutesSinceMidnight(now)

  let totalDoses = 0
  let takenDoses = 0
  let remainingDoses = 0
  let overdueDoses = 0
  let nextDoseMinutes = Number.POSITIVE_INFINITY

  supplements.forEach(supp => {
    const schedule = suppSchedule?.[supp.id]
    const times = schedule?.times?.length ? schedule.times : supp.defaultTimes
    times.forEach((clock, idx) => {
      totalDoses += 1
      const doseKey = `${supp.id}-${idx}-${doseDateKey}`
      const taken = Boolean(dailySupp?.[doseKey])
      if (taken) {
        takenDoses += 1
        return
      }

      remainingDoses += 1
      const dueMinutes = parseClockMinutes(clock)
      if (dueMinutes <= nowMinutes) {
        overdueDoses += 1
      } else {
        nextDoseMinutes = Math.min(nextDoseMinutes, dueMinutes - nowMinutes)
      }
    })
  })

  return {
    dateKey,
    totalDoses,
    takenDoses,
    remainingDoses,
    overdueDoses,
    nextDoseMinutes: Number.isFinite(nextDoseMinutes) ? nextDoseMinutes : null,
  }
}

export function getWorkReminderContext({ attendance, now = new Date() }) {
  const dateKey = toIsoDate(now)
  const day = now.getDay()
  const isWeekday = day >= 1 && day <= 5
  const hasAttendance = Boolean(attendance?.[dateKey])
  const hour = now.getHours()
  return {
    dateKey,
    hour,
    isWeekday,
    hasAttendance,
    needsReminder: isWeekday && !hasAttendance,
  }
}

export const QUICK_MOOD_ACTIONS = Object.freeze([
  { code: 'happy', emoji: '😊', label: '😊 Great' },
  { code: 'okay', emoji: '😐', label: '😐 Okay' },
  { code: 'sad', emoji: '😢', label: '😢 Low' },
  { code: 'nauseous', emoji: '🤢', label: '🤢 Nauseous' },
  { code: 'sleepy', emoji: '😴', label: '😴 Sleepy' },
  { code: 'stressed', emoji: '😤', label: '😤 Stressed' },
  { code: 'loved', emoji: '🥰', label: '🥰 Loved' },
  { code: 'anxious', emoji: '😰', label: '😰 Anxious' },
])

const MOOD_REMINDER_WINDOWS = Object.freeze([
  { id: 'noon', minuteOfDay: 12 * 60, label: '12:00' },
  { id: 'late_afternoon', minuteOfDay: 17 * 60, label: '17:00' },
  { id: 'night', minuteOfDay: 20 * 60, label: '20:00' },
])

const MOOD_TITLES = {
  gentle: [
    'Mood check-in time.',
    'How are you feeling today?',
    'Quick mood log before lunch reset.',
  ],
  nudge: [
    'Still no mood log today.',
    'Late-afternoon mood check.',
    'Quick check-in before evening.',
  ],
  urgent: [
    'Final mood check for today.',
    'Before bedtime: log your mood.',
    'End-of-day mood check-in.',
  ],
}

const MOOD_SUBTITLES = {
  gentle: [
    'One tap is enough. Keep today emotionally tracked.',
    'No long notes needed. Just choose one mood.',
    'Quick snapshot now helps spot stress trends later.',
  ],
  nudge: [
    'If busy kanina, one quick mood tap now is enough.',
    'Simple check-in now, cleaner records tonight.',
    'Track now while your day still feels fresh.',
  ],
  urgent: [
    'No mood logged yet today. Last check-in window is open.',
    'Close the day with one mood tap.',
    'A quick mood log now keeps the daily streak complete.',
  ],
}

export function resolveQuickMoodEmoji(code) {
  const key = String(code || '').trim().toLowerCase()
  const found = QUICK_MOOD_ACTIONS.find(item => item.code === key)
  return found?.emoji || ''
}

function hasMoodLoggedForDate(moods, dateKey) {
  const list = Array.isArray(moods) ? moods : []
  return list.some(entry => {
    const ts = entry?.date
    if (!ts) return false
    const parsed = new Date(ts)
    if (!Number.isFinite(parsed.getTime())) return false
    return toIsoDate(parsed) === dateKey
  })
}

export function getMoodReminderContext({ moods, now = new Date() }) {
  const dateKey = toIsoDate(now)
  const nowMinutes = minutesSinceMidnight(now)
  const hasMoodToday = hasMoodLoggedForDate(moods, dateKey)
  const activeWindow = [...MOOD_REMINDER_WINDOWS]
    .reverse()
    .find(windowDef => nowMinutes >= windowDef.minuteOfDay) || null

  return {
    dateKey,
    nowMinutes,
    hasMoodToday,
    needsReminder: !hasMoodToday && Boolean(activeWindow),
    activeWindow,
  }
}

function sortPlannerItems(items) {
  const safe = Array.isArray(items) ? items.filter(Boolean) : []
  return [...safe].sort((a, b) => {
    const at = parseOptionalClockMinutes(a?.time)
    const bt = parseOptionalClockMinutes(b?.time)
    if (at !== null && bt !== null && at !== bt) return at - bt
    if (at !== null && bt === null) return -1
    if (at === null && bt !== null) return 1
    const atitle = String(a?.title || '').toLowerCase()
    const btitle = String(b?.title || '').toLowerCase()
    return atitle.localeCompare(btitle)
  })
}

function isoDayDiff(fromISO, toISO) {
  try {
    const from = new Date(`${fromISO}T00:00`)
    const to = new Date(`${toISO}T00:00`)
    return Math.round((to - from) / (1000 * 60 * 60 * 24))
  } catch {
    return 0
  }
}

export function getPlannerReminderContext({ planner, now = new Date() }) {
  const dateKey = toIsoDate(now)
  const nowMinutes = minutesSinceMidnight(now)
  const safePlanner = planner && typeof planner === 'object' ? planner : {}

  const todayPlans = Array.isArray(safePlanner[dateKey]) ? safePlanner[dateKey] : []
  const pendingToday = todayPlans.filter(p => p && !p.done)
  const pendingTodaySorted = sortPlannerItems(pendingToday)

  // Past dates: pick the most recent day with any pending plan.
  const overdueBuckets = []
  for (const [iso, plans] of Object.entries(safePlanner)) {
    if (!iso || iso >= dateKey) continue
    if (!Array.isArray(plans) || plans.length === 0) continue
    const pending = plans.filter(p => p && !p.done)
    if (pending.length === 0) continue
    overdueBuckets.push({ dateISO: iso, plans: sortPlannerItems(pending) })
  }
  overdueBuckets.sort((a, b) => b.dateISO.localeCompare(a.dateISO))

  const overdueCandidate = overdueBuckets.length > 0 ? overdueBuckets[0] : null
  const candidateDateISO = overdueCandidate ? overdueCandidate.dateISO : dateKey
  const candidatePlan = overdueCandidate
    ? overdueCandidate.plans[0]
    : (pendingTodaySorted[0] || null)

  if (!candidatePlan) {
    return {
      dateKey,
      nowMinutes,
      pendingTodayCount: pendingToday.length,
      pendingOverdueCount: overdueBuckets.reduce((acc, b) => acc + b.plans.length, 0),
      candidate: null,
    }
  }

  const timeMinutes = parseOptionalClockMinutes(candidatePlan.time)
  const minutesUntil = timeMinutes === null ? null : (timeMinutes - nowMinutes)
  const isOverdueDay = candidateDateISO < dateKey
  const overdueDays = isOverdueDay ? isoDayDiff(candidateDateISO, dateKey) : 0

  return {
    dateKey,
    nowMinutes,
    pendingTodayCount: pendingToday.length,
    pendingOverdueCount: overdueBuckets.reduce((acc, b) => acc + b.plans.length, 0),
    candidate: {
      dateISO: candidateDateISO,
      planId: String(candidatePlan.id || '').trim(),
      title: String(candidatePlan.title || '').trim(),
      time: String(candidatePlan.time || '').trim(),
      minutesUntil,
      isOverdueDay,
      overdueDays,
    },
  }
}

function resolveSuppLevel(ctx, now) {
  if (ctx.overdueDoses >= 2) return 'urgent'
  if (ctx.overdueDoses >= 1 && now.getHours() >= 16) return 'urgent'
  if (ctx.overdueDoses >= 1) return 'nudge'
  if (ctx.remainingDoses >= 3 && now.getHours() >= 14) return 'nudge'
  if (ctx.remainingDoses >= 1 && now.getHours() >= 20) return 'urgent'
  return 'gentle'
}

function resolveWorkLevel(ctx) {
  if (ctx.hour >= 17) return 'urgent'
  if (ctx.hour >= 11) return 'nudge'
  return 'gentle'
}

function resolvePlannerLevel(ctx, now) {
  const candidate = ctx?.candidate
  if (!candidate) return 'gentle'
  if (candidate.isOverdueDay) return 'urgent'

  const minutesUntil = candidate.minutesUntil
  if (minutesUntil !== null && minutesUntil <= 0) {
    if (now.getHours() >= 18) return 'urgent'
    return 'nudge'
  }

  if (ctx.pendingTodayCount >= 3 && now.getHours() >= 12) return 'nudge'
  if (ctx.pendingTodayCount >= 1 && now.getHours() >= 17) return 'nudge'
  return 'gentle'
}

function resolvePlannerIntervalMinutes(level) {
  if (level === 'urgent') return 18
  if (level === 'nudge') return 30
  return 45
}

function resolveSuppIntervalMinutes(ctx, now, level) {
  if (level === 'urgent') {
    if (ctx.overdueDoses >= 3) return 6
    if (ctx.overdueDoses >= 2) return 8
    return 10
  }
  if (level === 'nudge') {
    if (ctx.overdueDoses >= 1) return 12
    if (ctx.remainingDoses >= 4) return 14
    return 18
  }
  if (now.getHours() >= 18 && ctx.remainingDoses >= 1) return 20
  return 28
}

function resolveWorkIntervalMinutes(ctx, level) {
  if (level === 'urgent') return ctx.hour >= 20 ? 8 : 12
  if (level === 'nudge') return ctx.hour >= 15 ? 18 : 24
  return 40
}

function buildReminderSubtitle({
  taken,
  total,
  remaining,
  overdue,
  styleLine,
  pushLine,
  jokeLine,
  nextDoseMinutes,
}) {
  const pieces = [
    `${taken}/${total} doses done.`,
    `${remaining} left today.`,
    overdue > 0 ? `${overdue} overdue.` : 'Still recoverable.',
    nextDoseMinutes && overdue === 0 ? `Next window in ~${nextDoseMinutes} min.` : '',
    styleLine,
    pushLine,
    jokeLine,
  ].filter(Boolean)
  return pieces.join(' ')
}

export function buildSupplementReminder(ctx, now = new Date(), seedSalt = 'home') {
  const level = resolveSuppLevel(ctx, now)
  const intervalMinutes = resolveSuppIntervalMinutes(ctx, now, level)
  const slot = Math.floor(minutesSinceMidnight(now) / intervalMinutes)
  const seedRoot = `${seedSalt}|supp|${ctx.dateKey}|${ctx.remainingDoses}|${ctx.overdueDoses}|${slot}|${level}`
  const style = weightedPick(LANGUAGE_STYLE_WEIGHTS, `${seedRoot}|style`) || 'taglish'
  const styleMap = SUPP_STYLE_POOL[style] || SUPP_STYLE_POOL.taglish
  const title = pickBySeed(SUPP_TITLE_POOL[level], `${seedRoot}|title`)
  const styleLine = pickBySeed(styleMap[level], `${seedRoot}|line`)
  const pushLine = pickBySeed(SUPP_PUSH_POOL[level], `${seedRoot}|push`)
  const jokeLine = pickBySeed(SUPP_JOKE_POOL[level], `${seedRoot}|joke`)
  const subtitle = buildReminderSubtitle({
    taken: ctx.takenDoses,
    total: ctx.totalDoses,
    remaining: ctx.remainingDoses,
    overdue: ctx.overdueDoses,
    styleLine,
    pushLine,
    jokeLine,
    nextDoseMinutes: ctx.nextDoseMinutes,
  })

  return {
    type: 'supp',
    level,
    intervalMinutes,
    slotKey: `${ctx.dateKey}|supp|${intervalMinutes}|${slot}`,
    priorityScore: level === 'urgent' ? 5 : level === 'nudge' ? 3.6 : 2.4,
    title,
    subtitle,
    notificationTitle: 'Peggy reminder: Supplements',
    notificationBody: `${ctx.remainingDoses} doses left today${ctx.overdueDoses ? `, ${ctx.overdueDoses} overdue` : ''}.`,
  }
}

export function buildWorkReminder(ctx, now = new Date(), seedSalt = 'home') {
  const level = resolveWorkLevel(ctx)
  const intervalMinutes = resolveWorkIntervalMinutes(ctx, level)
  const slot = Math.floor(minutesSinceMidnight(now) / intervalMinutes)
  const seedRoot = `${seedSalt}|work|${ctx.dateKey}|${ctx.hour}|${slot}|${level}`
  const style = weightedPick(LANGUAGE_STYLE_WEIGHTS, `${seedRoot}|style`) || 'taglish'
  const styleMap = WORK_STYLE_POOL[style] || WORK_STYLE_POOL.taglish
  const title = pickBySeed(WORK_TITLE_POOL[level], `${seedRoot}|title`)
  const styleLine = pickBySeed(styleMap[level], `${seedRoot}|line`)
  const jokeLine = pickBySeed(WORK_JOKE_POOL[level], `${seedRoot}|joke`)
  const subtitle = `${styleLine} ${jokeLine}`.trim()

  return {
    type: 'work',
    level,
    intervalMinutes,
    slotKey: `${ctx.dateKey}|work|${intervalMinutes}|${slot}`,
    priorityScore: level === 'urgent' ? 4.4 : level === 'nudge' ? 3.1 : 1.9,
    title,
    subtitle,
    notificationTitle: 'Peggy reminder: Attendance',
    notificationBody: 'Please log today attendance before day rollover.',
  }
}

function resolveMoodLevel(ctx) {
  const slotId = ctx?.activeWindow?.id
  if (slotId === 'night') return 'urgent'
  if (slotId === 'late_afternoon') return 'nudge'
  return 'gentle'
}

export function buildMoodReminder(ctx, now = new Date(), seedSalt = 'home') {
  if (!ctx?.needsReminder || !ctx?.activeWindow?.id) return null
  const level = resolveMoodLevel(ctx)
  const slotId = ctx.activeWindow.id
  const seedRoot = `${seedSalt}|mood|${ctx.dateKey}|${slotId}|${level}`
  const title = pickBySeed(MOOD_TITLES[level] || MOOD_TITLES.gentle, `${seedRoot}|title`)
  const subtitle = pickBySeed(MOOD_SUBTITLES[level] || MOOD_SUBTITLES.gentle, `${seedRoot}|subtitle`)

  return {
    type: 'mood',
    level,
    intervalMinutes: 1,
    slotKey: `${ctx.dateKey}|mood|${slotId}`,
    priorityScore: level === 'urgent' ? 4.6 : level === 'nudge' ? 3.7 : 2.7,
    title,
    subtitle,
    notificationTitle: 'Peggy check-in: Mood',
    notificationBody: `No mood log yet for today. Quick check-in window: ${ctx.activeWindow.label}.`,
    moodQuickActions: QUICK_MOOD_ACTIONS,
  }
}

export function buildPlannerReminder(ctx, now = new Date(), seedSalt = 'home') {
  const candidate = ctx?.candidate
  if (!candidate?.planId || !candidate?.title) return null

  const level = resolvePlannerLevel(ctx, now)
  const intervalMinutes = resolvePlannerIntervalMinutes(level)
  const slot = Math.floor(minutesSinceMidnight(now) / intervalMinutes)
  const seedRoot = `${seedSalt}|plan|${ctx.dateKey}|${candidate.dateISO}|${candidate.planId}|${slot}|${level}`

  const safeTitle = String(candidate.title || '').trim() || 'Planner item'
  const time = String(candidate.time || '').trim()
  const minutesUntil = candidate.minutesUntil

  const shortDate = (() => {
    try {
      return new Date(`${candidate.dateISO}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return candidate.dateISO
    }
  })()

  const statusLine = candidate.isOverdueDay
    ? `Missed from ${shortDate}${candidate.overdueDays ? ` (${candidate.overdueDays}d ago)` : ''}.`
    : (minutesUntil === null
      ? 'All day.'
      : (minutesUntil <= 0
        ? `Due now${time ? ` (${time})` : ''}.`
        : `Today${time ? ` at ${time}` : ''}${minutesUntil <= 180 ? ` (~${minutesUntil}m)` : ''}.`))

  const extraLinePool = {
    gentle: [
      'Small plan, less stress later.',
      'One tap to stay organized.',
      'Keep it light and simple.',
      'Plan check-in, then continue.',
    ],
    nudge: [
      'Quick confirm so it does not slip.',
      'Tiny admin now saves tomorrow.',
      'Close the loop while it is easy.',
      'One quick step, then back to rest.',
    ],
    urgent: [
      'Overdue loop detected. Close it now.',
      'Confirm status, then move on.',
      'Do not let this pile up.',
      'Fast check, clean timeline.',
    ],
  }
  const extraLine = pickBySeed(extraLinePool[level] || extraLinePool.gentle, `${seedRoot}|line`)
  const subtitle = `${statusLine} ${extraLine}`.trim()

  return {
    type: 'plan',
    level,
    intervalMinutes,
    slotKey: `${ctx.dateKey}|plan|${intervalMinutes}|${slot}|${candidate.dateISO}|${candidate.planId}`,
    priorityScore: level === 'urgent' ? 3.9 : level === 'nudge' ? 2.8 : 1.6,
    title: safeTitle,
    subtitle,
    notificationTitle: 'Peggy reminder: Planner',
    notificationBody: `${safeTitle} ${statusLine}`.trim(),
    planDateISO: candidate.dateISO,
    planId: candidate.planId,
  }
}

export function buildDailyTipReminder({ now = new Date(), dailyTip, seedSalt = 'notify' }) {
  const intervalMinutes = 180
  const slot = Math.floor(minutesSinceMidnight(now) / intervalMinutes)
  const text = String(dailyTip?.text || '').trim()
  const tone = dailyTip?.tone === 'serious' ? 'serious' : 'witty'
  const category = String(dailyTip?.category || 'General')

  return {
    type: 'tip',
    level: tone === 'serious' ? 'nudge' : 'gentle',
    intervalMinutes,
    slotKey: `${toIsoDate(now)}|tip|${intervalMinutes}|${slot}|${seedSalt}`,
    priorityScore: tone === 'serious' ? 1.6 : 1.2,
    title: tone === 'serious' ? 'Daily Tip: Deep info' : 'Daily Tip: Light break',
    subtitle: text,
    notificationTitle: `Peggy tip: ${category}`,
    notificationBody: text || 'One small healthy action now beats perfect plans later.',
  }
}

export function buildDailyTip({ now = new Date(), weeksPregnant = null, completedCheckups = 0, suppCtx = null }) {
  const dateKey = toIsoDate(now)
  const slot = Math.floor(minutesSinceMidnight(now) / 240) // rotate every 4 hours
  const seedRoot = `${dateKey}|${slot}|${weeksPregnant ?? 'na'}|${completedCheckups}|${suppCtx?.remainingDoses ?? 0}|${suppCtx?.overdueDoses ?? 0}`
  const roll = hashString(`${seedRoot}|tone`) % 100
  const useWitty = roll < 18
  const pool = useWitty ? WITTY_TIP_POOL : SERIOUS_TIP_POOL
  const tip = pickBySeed(pool, `${seedRoot}|tip`)

  return {
    category: tip?.category || 'General',
    tone: useWitty ? 'witty' : 'serious',
    modeLabel: useWitty ? 'Witty break' : 'Deep info mode',
    text: tip?.text || 'One small healthy action now beats perfect plans later.',
  }
}

function pickUniqueBySeed(list, seed, count = 1) {
  const safe = Array.isArray(list) ? [...list] : []
  const out = []
  if (safe.length === 0 || count <= 0) return out
  let cursorSeed = String(seed)

  while (safe.length > 0 && out.length < count) {
    const idx = hashString(cursorSeed) % safe.length
    out.push(safe.splice(idx, 1)[0])
    cursorSeed = `${cursorSeed}|${out.length}`
  }
  return out
}

const NAME_STYLE_LINES = [
  'Top picks stay visible. Rotating pick keeps it fresh.',
  'Core choices remain stable, spotlight changes by time.',
  'Priority names are pinned, wildcards rotate for variety.',
  'Main picks stay. Discovery picks rotate all day.',
]

const NAME_JOKE_LINES = [
  'Baby naming committee is now in session.',
  'Kanji + vibes + future nickname test: approved.',
  'One more strong candidate entered the chat.',
  'Portfolio-level name drop detected.',
  'This name passed the playground shout test.',
]

const NAME_STYLE_POOL = expandStringArrayByFour(NAME_STYLE_LINES, [
  'Rotating mode keeps discovery active.',
  'Same quality picks, fresher rhythm.',
  'Variety pass enabled for today.',
])

const NAME_JOKE_POOL = expandStringArrayByFour(NAME_JOKE_LINES, [
  'Name lab status: productive.',
  'Another contender just got promoted.',
  'Shortlist energy remains elite.',
])

const COMPANION_SUBTITLE_TEMPLATES = [
  'Pregnancy Planning, Made Simple for @placeholder',
  'Daily Pregnancy Guide for @placeholder',
  'Track Pregnancy, Stay Prepared for @placeholder',
  'Pregnancy Clarity, Every Day for @placeholder',
  'A Simple Pregnancy Plan for @placeholder',
]

function extractBabyName(entry) {
  if (!entry) return ''
  if (typeof entry === 'string') return entry.trim()
  return String(entry?.name || '').trim()
}

export function buildCompanionSubtitleRotation({ now = new Date(), babyNamesInfo, seedSalt = 'home' }) {
  const phraseSlot = Math.floor(now.getTime() / 18000) // phrase rotates every 18 seconds
  const nameSlot = Math.floor(now.getTime() / 6000) // placeholder name rotates every 6 seconds
  const dateKey = toIsoDate(now)
  const boy = Array.isArray(babyNamesInfo?.boyNames) ? babyNamesInfo.boyNames : []
  const girl = Array.isArray(babyNamesInfo?.girlNames) ? babyNamesInfo.girlNames : []
  const allNames = [...boy, ...girl].filter(name => extractBabyName(name))

  const phrase = pickBySeed(COMPANION_SUBTITLE_TEMPLATES, `${seedSalt}|subtitle|${phraseSlot}|phrase`)
    || 'Pregnancy Planning, Made Simple for @placeholder'
  const nameEntry = pickBySeed(allNames, `${seedSalt}|subtitle|${nameSlot}|name`)
  const babyName = extractBabyName(nameEntry) || 'Baby'

  return {
    text: phrase.replace('@placeholder', babyName),
    babyName,
    slotKey: `${dateKey}|subtitle|${phraseSlot}|${nameSlot}`,
  }
}

export function buildNameSpotlight({ now = new Date(), babyNamesInfo, seedSalt = 'home' }) {
  const dateKey = toIsoDate(now)
  const nameSlot = Math.floor(minutesSinceMidnight(now) / 240)
  const gender = (hashString(`${seedSalt}|${dateKey}|gender`) % 2 === 0) ? 'boy' : 'girl'
  const list = gender === 'boy' ? (babyNamesInfo?.boyNames || []) : (babyNamesInfo?.girlNames || [])
  const topPicks = list.filter(n => n?.tier === 1)
  const allNames = list.filter(Boolean)

  const pinned = pickUniqueBySeed(
    topPicks.length >= 3 ? topPicks : allNames,
    `${seedSalt}|${dateKey}|${nameSlot}|pinned`,
    Math.min(3, allNames.length),
  )
  const rotating = pickUniqueBySeed(
    allNames,
    `${seedSalt}|${dateKey}|${nameSlot}|rotating`,
    1,
  )[0] || pinned[0] || null

  const fallback = {
    name: 'Kaizen',
    kanji: '魁禅',
    meaning: 'Pioneer with calm strength',
    tier: 1,
  }
  const companion = rotating || pinned[0] || fallback
  const styleLine = pickBySeed(NAME_STYLE_POOL, `${seedSalt}|${dateKey}|${nameSlot}|style`)
  const jokeLine = pickBySeed(NAME_JOKE_POOL, `${seedSalt}|${dateKey}|${nameSlot}|joke`)

  return {
    dateKey,
    gender,
    companionName: companion.name,
    companionKanji: companion.kanji,
    companionLabel: `${companion.name}${companion.kanji ? ` (${companion.kanji})` : ''}`,
    spotlight: rotating || companion,
    pinnedTopPicks: pinned,
    spotlightLine: styleLine,
    jokeLine,
    slotKey: `${dateKey}|name|${nameSlot}|${gender}`,
    notificationTitle: `New name spotlight: ${rotating?.name || companion.name}`,
    notificationBody: `${(rotating?.kanji || companion.kanji || '').trim()} ${rotating?.meaning || companion.meaning || ''}`.trim(),
  }
}

export const SMART_NOTIF_PREF_KEY = 'peggy-smart-notifs-enabled'
const DEPRECATED_SMART_NOTIF_PREF_KEY = 'baby-prep-smart-notifs-enabled'
export const SMART_NOTIF_PREF_EVENT = 'peggy-smart-notif-pref-changed'
export const SMART_NOTIF_LOG_KEY = 'peggy-smart-notifs-log-v1'
export const SMART_NOTIF_QUIET_HOURS_KEY = 'peggy-smart-notif-quiet-hours'
const DEPRECATED_SMART_NOTIF_QUIET_HOURS_KEY = 'baby-prep-smart-notif-quiet-hours'
export const SMART_NOTIF_QUIET_HOURS_EVENT = 'peggy-smart-notif-quiet-hours-changed'
export const SMART_NOTIF_CHANNEL_PREF_KEY = 'peggy-smart-notif-channels'
const DEPRECATED_SMART_NOTIF_CHANNEL_PREF_KEY = 'baby-prep-smart-notif-channels'
export const SMART_NOTIF_CHANNEL_EVENT = 'peggy-smart-notif-channels-changed'
export const SMART_NOTIF_CHANNEL_KEYS = Object.freeze(['reminders', 'calendar', 'dailyTip', 'names'])

const DEFAULT_SMART_QUIET_HOURS = Object.freeze({
  enabled: true,
  start: '22:00',
  end: '07:00',
})

const DEFAULT_SMART_NOTIF_CHANNELS = Object.freeze({
  reminders: true,
  calendar: true,
  dailyTip: true,
  names: true,
})

function sanitizeSmartNotifChannels(value) {
  const source = value && typeof value === 'object' ? value : {}
  const out = {}
  for (const key of SMART_NOTIF_CHANNEL_KEYS) {
    out[key] = source[key] !== false
  }
  return out
}

function normalizeClockValue(value, fallback = '00:00') {
  const raw = String(value || '').trim()
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(raw)
  if (!match) return fallback
  const hh = Number(match[1])
  const mm = Number(match[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return fallback
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return fallback
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function sanitizeQuietHours(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    enabled: source.enabled !== false,
    start: normalizeClockValue(source.start, DEFAULT_SMART_QUIET_HOURS.start),
    end: normalizeClockValue(source.end, DEFAULT_SMART_QUIET_HOURS.end),
  }
}

export function readSmartNotifQuietHours() {
  if (typeof window === 'undefined') return { ...DEFAULT_SMART_QUIET_HOURS }
  try {
    if (window.localStorage.getItem(DEPRECATED_SMART_NOTIF_QUIET_HOURS_KEY) !== null) {
      window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_QUIET_HOURS_KEY)
    }
    const raw = window.localStorage.getItem(SMART_NOTIF_QUIET_HOURS_KEY)
    if (!raw) return { ...DEFAULT_SMART_QUIET_HOURS }
    return sanitizeQuietHours(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SMART_QUIET_HOURS }
  }
}

export function writeSmartNotifQuietHours(nextValue) {
  if (typeof window === 'undefined') return
  const safe = sanitizeQuietHours(nextValue)
  window.localStorage.setItem(SMART_NOTIF_QUIET_HOURS_KEY, JSON.stringify(safe))
  window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_QUIET_HOURS_KEY)
  window.dispatchEvent(new CustomEvent(SMART_NOTIF_QUIET_HOURS_EVENT, { detail: safe }))
  window.dispatchEvent(new CustomEvent('peggy-local-changed', { detail: { key: SMART_NOTIF_QUIET_HOURS_KEY } }))
}

export function isNowInSmartNotifQuietHours(now = new Date(), quietHours = null) {
  const safe = sanitizeQuietHours(quietHours || readSmartNotifQuietHours())
  if (!safe.enabled) return false

  const start = parseClockMinutes(safe.start)
  const end = parseClockMinutes(safe.end)
  const current = minutesSinceMidnight(now)
  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

export function formatSmartNotifQuietHoursLabel(quietHours = null) {
  const safe = sanitizeQuietHours(quietHours || readSmartNotifQuietHours())
  return safe.enabled ? `${safe.start} - ${safe.end}` : 'Off'
}

export function readSmartNotifEnabled() {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(DEPRECATED_SMART_NOTIF_PREF_KEY) !== null) {
    window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_PREF_KEY)
  }
  const value = window.localStorage.getItem(SMART_NOTIF_PREF_KEY)
  if (value === '1' || value === '0') return value === '1'

  // Force manual opt-in on newly installed devices.
  // If only deprecated cloud-synced key exists, ignore it.
  return false
}

export function readSmartNotifChannels() {
  if (typeof window === 'undefined') return { ...DEFAULT_SMART_NOTIF_CHANNELS }
  try {
    if (window.localStorage.getItem(DEPRECATED_SMART_NOTIF_CHANNEL_PREF_KEY) !== null) {
      window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_CHANNEL_PREF_KEY)
    }
    const raw = window.localStorage.getItem(SMART_NOTIF_CHANNEL_PREF_KEY)
    if (!raw) return { ...DEFAULT_SMART_NOTIF_CHANNELS }
    return sanitizeSmartNotifChannels(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SMART_NOTIF_CHANNELS }
  }
}

export function writeSmartNotifChannels(nextValue) {
  if (typeof window === 'undefined') return
  const safe = sanitizeSmartNotifChannels(nextValue)
  window.localStorage.setItem(SMART_NOTIF_CHANNEL_PREF_KEY, JSON.stringify(safe))
  window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_CHANNEL_PREF_KEY)
  window.dispatchEvent(new CustomEvent(SMART_NOTIF_CHANNEL_EVENT, { detail: safe }))
  window.dispatchEvent(new CustomEvent('peggy-local-changed', { detail: { key: SMART_NOTIF_CHANNEL_PREF_KEY } }))
}

export function isSmartNotifChannelEnabled(channelKey, channels = null) {
  const safeChannels = channels ? sanitizeSmartNotifChannels(channels) : readSmartNotifChannels()
  const key = String(channelKey || '').trim()
  if (!key || !Object.prototype.hasOwnProperty.call(safeChannels, key)) return false
  return Boolean(safeChannels[key])
}

export function writeSmartNotifEnabled(enabled) {
  if (typeof window === 'undefined') return
  const value = enabled ? '1' : '0'
  window.localStorage.setItem(SMART_NOTIF_PREF_KEY, value)
  window.localStorage.removeItem(DEPRECATED_SMART_NOTIF_PREF_KEY)
  window.dispatchEvent(new CustomEvent(SMART_NOTIF_PREF_EVENT, { detail: { enabled: Boolean(enabled) } }))
  window.dispatchEvent(new CustomEvent('peggy-local-changed', { detail: { key: SMART_NOTIF_PREF_KEY } }))
}

function readNotifLog() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(SMART_NOTIF_LOG_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeNotifLog(map) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SMART_NOTIF_LOG_KEY, JSON.stringify(map))
  } catch {
    // Ignore storage write failures.
  }
}

function pruneNotifLog(map, now = new Date()) {
  const keepSince = now.getTime() - (5 * 24 * 60 * 60 * 1000)
  const out = {}
  for (const [k, ts] of Object.entries(map || {})) {
    const n = Number(ts)
    if (Number.isFinite(n) && n >= keepSince) out[k] = n
  }
  return out
}

export function hasSentNotificationSlot(slotKey, now = new Date()) {
  if (!slotKey) return false
  const pruned = pruneNotifLog(readNotifLog(), now)
  return Boolean(pruned[slotKey])
}

export function markNotificationSlotSent(slotKey, now = new Date()) {
  if (!slotKey) return
  const pruned = pruneNotifLog(readNotifLog(), now)
  pruned[slotKey] = now.getTime()
  writeNotifLog(pruned)
}
