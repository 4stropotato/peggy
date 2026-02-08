function normalizedText(value) {
  return String(value || '').trim()
}

function normalizeLine(line, fallbackSpeaker = 'you') {
  const speaker = line?.speaker === 'staff' ? 'staff' : fallbackSpeaker
  const ja = normalizedText(line?.ja)
  const romaji = normalizedText(line?.romaji)
  const en = normalizedText(line?.en)

  if (!ja && !romaji && !en) {
    return {
      speaker,
      ja: 'すみません、もう一度ゆっくりお願いします。',
      romaji: 'Sumimasen, mou ichido yukkuri onegai shimasu.',
      en: 'Sorry, could you please say that again slowly?',
    }
  }

  return {
    speaker,
    ja: ja || '（この内容を日本語で伝えたいです）',
    romaji: romaji || '(Kono naiyou wo nihongo de tsutaetai desu)',
    en: en || 'I want to say this in Japanese.',
  }
}

const you = (ja, romaji, en) => ({ speaker: 'you', ja, romaji, en })
const staff = (ja, romaji, en) => ({ speaker: 'staff', ja, romaji, en })

function normalizeNode(node, nodeId, nodeIds) {
  const lines = Array.isArray(node?.lines)
    ? node.lines.map(line => normalizeLine(line)).filter(Boolean)
    : []
  const options = Array.isArray(node?.options)
    ? node.options
      .map(opt => ({
        id: normalizedText(opt?.id) || `${nodeId}-opt`,
        label: normalizedText(opt?.label) || 'Continue',
        next: normalizedText(opt?.next) || '',
      }))
      .filter(opt => opt.next && nodeIds.has(opt.next))
    : []

  return {
    id: nodeId,
    prompt: normalizedText(node?.prompt),
    lines,
    options,
  }
}

function cloneFlow(flow) {
  if (!flow?.nodes || typeof flow.nodes !== 'object') return null
  const nodes = {}
  Object.entries(flow.nodes).forEach(([id, node]) => {
    nodes[id] = {
      prompt: normalizedText(node?.prompt),
      lines: Array.isArray(node?.lines) ? node.lines.map(line => ({ ...line })) : [],
      options: Array.isArray(node?.options) ? node.options.map(opt => ({ ...opt })) : [],
    }
  })
  return {
    title: normalizedText(flow?.title),
    nodes,
  }
}

function ensureDeepIterations(flow) {
  const cloned = cloneFlow(flow)
  if (!cloned?.nodes?.start) return flow

  const baseNodeIds = Object.keys(cloned.nodes).filter(id => id !== 'start' && !id.includes('__deep_'))
  baseNodeIds.forEach(nodeId => {
    const node = cloned.nodes[nodeId] || {}
    const clarifyId = `${nodeId}__deep_clarify_1`
    const clarify2Id = `${nodeId}__deep_clarify_2`
    const actionId = `${nodeId}__deep_action_1`
    const action2Id = `${nodeId}__deep_action_2`

    if (!cloned.nodes[clarifyId]) {
      cloned.nodes[clarifyId] = {
        prompt: 'Need a clearer explanation in simpler Japanese?',
        lines: [
          you('もう少し具体的に、ゆっくり説明していただけますか？', 'Mou sukoshi gutaiteki ni, yukkuri setsumei shite itadakemasu ka?', 'Could you explain more specifically and slowly?'),
          staff('必要な内容を順番に説明します。', 'Hitsuyou na naiyou wo junban ni setsumei shimasu.', 'I will explain the necessary points in order.'),
        ],
        options: [
          { id: `${nodeId}-dc1`, label: 'Still unclear, ask one more time', next: clarify2Id },
          { id: `${nodeId}-dc2`, label: 'Back to main branch', next: 'start' },
        ],
      }
    }

    if (!cloned.nodes[clarify2Id]) {
      cloned.nodes[clarify2Id] = {
        prompt: 'Final clarification step',
        lines: [
          you('今の説明を私のケースで確認したいです。', 'Ima no setsumei wo watashi no keesu de kakunin shitai desu.', 'I want to confirm this for my case specifically.'),
          you('次にやることを1つずつ教えてください。', 'Tsugi ni yaru koto wo hitotsu-zutsu oshiete kudasai.', 'Please tell me next actions one by one.'),
        ],
        options: [
          { id: `${nodeId}-dc3`, label: 'Back to main branch', next: 'start' },
        ],
      }
    }

    if (!cloned.nodes[actionId]) {
      cloned.nodes[actionId] = {
        prompt: 'Need exact docs/deadlines?',
        lines: [
          you('提出期限と必要書類を正確に確認したいです。', 'Teishutsu kigen to hitsuyou shorui wo seikaku ni kakunin shitai desu.', 'I want to confirm exact deadline and required documents.'),
          staff('期限と書類の一覧を案内します。', 'Kigen to shorui no ichiran wo annai shimasu.', 'I will guide you through deadline and document list.'),
        ],
        options: [
          { id: `${nodeId}-da1`, label: 'Need follow-up contact details', next: action2Id },
          { id: `${nodeId}-da2`, label: 'Back to main branch', next: 'start' },
        ],
      }
    }

    if (!cloned.nodes[action2Id]) {
      cloned.nodes[action2Id] = {
        prompt: 'Follow-up contact iteration',
        lines: [
          you('問い合わせ先の部署名と電話番号を教えてください。', 'Toiawase-saki no busho-mei to denwa bangou wo oshiete kudasai.', 'Please tell me the department name and contact number.'),
          you('不足があった場合の再提出期限も確認したいです。', 'Fusoku ga atta baai no sai-teishutsu kigen mo kakunin shitai desu.', 'I also want to confirm resubmission deadline if anything is missing.'),
        ],
        options: [
          { id: `${nodeId}-da3`, label: 'Back to main branch', next: 'start' },
        ],
      }
    }

    const existingOptions = Array.isArray(node.options) ? node.options : []
    const nonStartOptions = existingOptions
      .map(opt => ({
        id: normalizedText(opt?.id),
        label: normalizedText(opt?.label),
        next: normalizedText(opt?.next),
      }))
      .filter(opt => opt.next && opt.next !== 'start')

    const merged = [...nonStartOptions]
    if (!merged.some(opt => opt.next === clarifyId)) {
      merged.push({ id: `${nodeId}-deep-clarify`, label: 'Need clearer explanation', next: clarifyId })
    }
    if (!merged.some(opt => opt.next === actionId)) {
      merged.push({ id: `${nodeId}-deep-action`, label: 'Ask exact next step/docs', next: actionId })
    }
    if (!merged.some(opt => opt.next === 'start')) {
      merged.push({ id: `${nodeId}-deep-back`, label: 'Back to main branch', next: 'start' })
    }

    cloned.nodes[nodeId] = {
      ...node,
      options: merged,
    }
  })

  return cloned
}

function normalizeFlow(flow, fallbackTitle = 'Scenario Branch') {
  const safeInput = flow && typeof flow === 'object' ? flow : null
  const safe = safeInput ? ensureDeepIterations(safeInput) : null
  if (!safe?.nodes || typeof safe.nodes !== 'object') return null
  if (!safe.nodes.start) return null

  const nodeIds = new Set(Object.keys(safe.nodes))
  const nodes = {}
  nodeIds.forEach(nodeId => {
    nodes[nodeId] = normalizeNode(safe.nodes[nodeId], nodeId, nodeIds)
  })

  return {
    title: normalizedText(safe.title) || fallbackTitle,
    startNodeId: 'start',
    nodes,
  }
}

const FLOW_LIBRARY = {
  clinic_appointment: {
    title: 'Branch: Clinic Appointment',
    nodes: {
      start: {
        prompt: 'What happened at clinic call/reception?',
        options: [
          { id: 'a1', label: 'No same-day slot', next: 'no-slot' },
          { id: 'a2', label: 'Asked for documents', next: 'docs' },
          { id: 'a3', label: 'Need fee details', next: 'fees' },
        ],
      },
      'no-slot': {
        lines: [
          staff('本日は予約がいっぱいです。', 'Honjitsu wa yoyaku ga ippai desu.', 'Today is fully booked.'),
          you('最短で受診できる日時をお願いします。', 'Saitan de jushin dekiru nichiji wo onegai shimasu.', 'Please give me the earliest possible appointment.'),
          you('キャンセル待ちはできますか？', 'Kyanseru-machi wa dekimasu ka?', 'Can I join the cancellation waitlist?'),
        ],
        options: [{ id: 'a4', label: 'Back to start', next: 'start' }],
      },
      docs: {
        lines: [
          staff('保険証と在留カードはお持ちですか？', 'Hokenshou to zairyuu kaado wa omochi desu ka?', 'Do you have insurance and residence card?'),
          you('不足書類があれば具体的に教えてください。', 'Fusoku shorui ga areba gutaiteki ni oshiete kudasai.', 'Please tell me exactly what is missing.'),
        ],
        options: [{ id: 'a5', label: 'Back to start', next: 'start' }],
      },
      fees: {
        lines: [
          you('初診費用はだいたいいくらですか？', 'Shoshin hiyou wa daitai ikura desu ka?', 'How much is the first visit roughly?'),
          you('領収書をお願いします。', 'Ryoushuusho wo onegai shimasu.', 'Please issue a receipt.'),
        ],
        options: [{ id: 'a6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  ward_handbook: {
    title: 'Branch: Ward Office / Boshi Techo',
    nodes: {
      start: {
        prompt: 'Ward office situation branch:',
        options: [
          { id: 'b1', label: 'Sent to another counter', next: 'counter' },
          { id: 'b2', label: 'Missing ID/My Number', next: 'missing-id' },
          { id: 'b3', label: 'Voucher usage question', next: 'voucher' },
        ],
      },
      counter: {
        lines: [
          staff('こちらではなく、こども家庭課へお願いします。', 'Kochira de wa naku, kodomo katei-ka e onegai shimasu.', 'Please go to Child & Family section.'),
          you('ありがとうございます。場所を教えてください。', 'Arigatou gozaimasu. Basho wo oshiete kudasai.', 'Thank you. Please tell me where it is.'),
        ],
        options: [{ id: 'b4', label: 'Back to start', next: 'start' }],
      },
      'missing-id': {
        lines: [
          you('マイナンバーがない場合、代替書類で申請できますか？', 'Mainanbaa ga nai baai, daitai shorui de shinsei dekimasu ka?', 'If My Number is missing, can I apply with alternative docs?'),
          staff('代替可能な書類を確認します。', 'Daitai kanou na shorui wo kakunin shimasu.', 'We will confirm acceptable alternatives.'),
        ],
        options: [{ id: 'b5', label: 'Back to start', next: 'start' }],
      },
      voucher: {
        lines: [
          you('妊婦健診券の使い方を教えてください。', 'Ninpu kenshin-ken no tsukaikata wo oshiete kudasai.', 'Please explain how to use prenatal checkup vouchers.'),
          you('使える病院の一覧はありますか？', 'Tsukaeru byouin no ichiran wa arimasu ka?', 'Is there a list of participating hospitals?'),
        ],
        options: [{ id: 'b6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  grant_consult: {
    title: 'Branch: Grant Consultation',
    nodes: {
      start: {
        prompt: 'Grant consultation branch:',
        options: [
          { id: 'c1', label: 'Payout timing', next: 'payout' },
          { id: 'c2', label: 'Second consultation after birth', next: 'second' },
          { id: 'c3', label: 'Bank account registration', next: 'bank' },
        ],
      },
      payout: {
        lines: [
          you('面談後どれくらいで振り込まれますか？', 'Mendan-go dorekurai de furikomaremasu ka?', 'How long after consultation will it be deposited?'),
          staff('審査後に順次振り込みます。', 'Shinsa-go ni junji furikomi shimasu.', 'It is deposited after screening.'),
        ],
        options: [{ id: 'c4', label: 'Back to start', next: 'start' }],
      },
      second: {
        lines: [
          you('出産後の2回目面談はいつ申請すればいいですか？', 'Shussan-go no nikai-me mendan wa itsu shinsei sureba ii desu ka?', 'When should I apply for second consultation after birth?'),
          you('必要書類を先に教えてください。', 'Hitsuyou shorui wo saki ni oshiete kudasai.', 'Please tell required documents in advance.'),
        ],
        options: [{ id: 'c5', label: 'Back to start', next: 'start' }],
      },
      bank: {
        lines: [
          you('振込口座情報はどこで登録しますか？', 'Furikomi kouza jouhou wa doko de touroku shimasu ka?', 'Where do I register bank details?'),
          staff('申請書の口座欄で登録します。', 'Shinseisho no kouza-ran de touroku shimasu.', 'Register in the account section of application form.'),
        ],
        options: [{ id: 'c6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  insurance_reduction: {
    title: 'Branch: Insurance Reduction',
    nodes: {
      start: {
        prompt: 'Insurance counter branch:',
        options: [
          { id: 'd1', label: 'Tax filing required?', next: 'tax-required' },
          { id: 'd2', label: 'Retroactive adjustment', next: 'retro' },
          { id: 'd3', label: 'Required documents', next: 'docs' },
        ],
      },
      'tax-required': {
        lines: [
          staff('減免判定には住民税情報が必要です。', 'Genmen hantei ni wa juuminzei jouhou ga hitsuyou desu.', 'Resident-tax info is needed for screening.'),
          you('申告後、反映時期はいつですか？', 'Shinkoku-go, han-ei jiki wa itsu desu ka?', 'After filing, when does it reflect?'),
        ],
        options: [{ id: 'd4', label: 'Back to start', next: 'start' }],
      },
      retro: {
        lines: [
          you('すでに支払った分は後で調整されますか？', 'Sude ni shiharatta bun wa ato de chousei saremasu ka?', 'Will already-paid amounts be adjusted later?'),
          staff('条件を満たせば還付または相殺されます。', 'Jouken wo mitaseba kanpu matawa sousai saremasu.', 'If eligible, it is refunded/offset.'),
        ],
        options: [{ id: 'd5', label: 'Back to start', next: 'start' }],
      },
      docs: {
        lines: [
          you('必要書類を一覧で教えてください。', 'Hitsuyou shorui wo ichiran de oshiete kudasai.', 'Please provide a full required document list.'),
          you('不足分は後日提出できますか？', 'Fusoku-bun wa gojitsu teishutsu dekimasu ka?', 'Can missing docs be submitted later?'),
        ],
        options: [{ id: 'd6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  hr_benefits: {
    title: 'Branch: Company / HR',
    nodes: {
      start: {
        prompt: 'HR branch:',
        options: [
          { id: 'e1', label: 'Request complete benefit list', next: 'list' },
          { id: 'e2', label: 'Leave procedure and deadlines', next: 'leave' },
          { id: 'e3', label: 'Follow-up HR meeting', next: 'meeting' },
        ],
      },
      list: {
        lines: [
          you('出産関連の会社給付を一覧でお願いします。', 'Shussan kanren no kaisha kyuufu wo ichiran de onegai shimasu.', 'Please provide a full list of childbirth-related company benefits.'),
          staff('社内ポータルと申請書を案内します。', 'Shanai poorutaru to shinseisho wo annai shimasu.', 'We will guide portal and forms.'),
        ],
        options: [{ id: 'e4', label: 'Back to start', next: 'start' }],
      },
      leave: {
        lines: [
          you('産前産後休暇と育児休業の提出期限を確認したいです。', 'Sanzen sango kyuuka to ikuji kyuugyou no teishutsu kigen wo kakunin shitai desu.', 'I want to confirm deadlines for maternity and childcare leave.'),
          you('必要書類も合わせて教えてください。', 'Hitsuyou shorui mo awasete oshiete kudasai.', 'Please include required documents.'),
        ],
        options: [{ id: 'e5', label: 'Back to start', next: 'start' }],
      },
      meeting: {
        lines: [
          you('人事担当との面談を予約したいです。', 'Jinji tantou to no mendan wo yoyaku shitai desu.', 'I want to book a meeting with HR.'),
          you('事前に必要書類をメール送付できますか？', 'Jizen ni hitsuyou shorui wo meeru soufu dekimasu ka?', 'Can required documents be sent by email in advance?'),
        ],
        options: [{ id: 'e6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  hospital_payment: {
    title: 'Branch: Hospital Payment System',
    nodes: {
      start: {
        prompt: 'Delivery payment branch:',
        options: [
          { id: 'f1', label: 'Hospital does not support direct payment', next: 'unsupported' },
          { id: 'f2', label: 'Cost above 500,000 yen', next: 'above' },
          { id: 'f3', label: 'Cost below 500,000 yen', next: 'below' },
        ],
      },
      unsupported: {
        lines: [
          you('直接支払制度が使えない場合の手続きを教えてください。', 'Chokusetsu shiharai seido ga tsukaenai baai no tetsuzuki wo oshiete kudasai.', 'Please explain process if direct payment is unavailable.'),
          staff('出産後に申請して払い戻しになります。', 'Shussan-go ni shinsei shite harai-modoshi ni narimasu.', 'It becomes a post-delivery reimbursement process.'),
        ],
        options: [{ id: 'f4', label: 'Back to start', next: 'start' }],
      },
      above: {
        lines: [
          you('50万円を超える自己負担額を確認したいです。', 'Gojuu-man en wo koeru jikofutan-gaku wo kakunin shitai desu.', 'I want to confirm out-of-pocket amount above 500,000 yen.'),
        ],
        options: [{ id: 'f5', label: 'Back to start', next: 'start' }],
      },
      below: {
        lines: [
          you('50万円未満の場合の差額申請方法を教えてください。', 'Gojuu-man en miman no baai no sagaku shinsei houhou wo oshiete kudasai.', 'Please explain how to claim the difference if below 500,000 yen.'),
        ],
        options: [{ id: 'f6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  tax_deduction: {
    title: 'Branch: Medical Tax Deduction',
    nodes: {
      start: {
        prompt: 'Tax filing branch:',
        options: [
          { id: 'g1', label: 'Which receipts are eligible', next: 'receipts' },
          { id: 'g2', label: 'Transport log format', next: 'transport' },
          { id: 'g3', label: 'Family expenses combined', next: 'family' },
        ],
      },
      receipts: {
        lines: [
          you('医療費控除で対象となる領収書の範囲を確認したいです。', 'Iryouhi koujo de taishou to naru ryoushuusho no hani wo kakunin shitai desu.', 'I want to confirm receipt scope for deduction.'),
        ],
        options: [{ id: 'g4', label: 'Back to start', next: 'start' }],
      },
      transport: {
        lines: [
          you('通院交通費はどの形式で提出しますか？', 'Tsuin koutsuuhi wa dono keishiki de teishutsu shimasu ka?', 'What format should I use for transport logs?'),
          staff('日付・区間・金額の一覧を準備してください。', 'Hiduke, kukan, kingaku no ichiran wo junbi shite kudasai.', 'Prepare list with date, route, and amount.'),
        ],
        options: [{ id: 'g5', label: 'Back to start', next: 'start' }],
      },
      family: {
        lines: [
          you('配偶者や子どもの医療費も合算できますか？', 'Haiguusha ya kodomo no iryouhi mo gassan dekimasu ka?', 'Can spouse/child medical costs be combined?'),
          staff('生計を一にしていれば可能です。', 'Seikei wo itsu ni shiteireba kanou desu.', 'Yes, if part of the same household finances.'),
        ],
        options: [{ id: 'g6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  consulate_birth: {
    title: 'Branch: Consulate Registration',
    nodes: {
      start: {
        prompt: 'Consulate branch:',
        options: [
          { id: 'h1', label: 'Order: birth report vs passport', next: 'order' },
          { id: 'h2', label: 'Only one parent can attend', next: 'one-parent' },
          { id: 'h3', label: 'Original/copy/translation counts', next: 'copies' },
        ],
      },
      order: {
        lines: [
          you('出生報告と旅券申請はどちらを先に行いますか？', 'Shussei houkoku to ryoken shinsei wa dochira wo saki ni okonaimasu ka?', 'Which comes first: birth report or passport application?'),
          staff('通常は出生報告後に旅券申請です。', 'Tsuujou wa shussei houkoku-go ni ryoken shinsei desu.', 'Usually passport comes after birth report.'),
        ],
        options: [{ id: 'h4', label: 'Back to start', next: 'start' }],
      },
      'one-parent': {
        lines: [
          you('片方の親が来館できない場合、委任状で対応できますか？', 'Katahou no oya ga raikan dekinai baai, ininjou de taiou dekimasu ka?', 'If one parent cannot attend, can authorization letter be used?'),
          you('必要な同意書フォーマットを教えてください。', 'Hitsuyou na douisho foomatto wo oshiete kudasai.', 'Please tell required consent form format.'),
        ],
        options: [{ id: 'h5', label: 'Back to start', next: 'start' }],
      },
      copies: {
        lines: [
          you('原本・コピー・翻訳書類の必要部数を教えてください。', 'Genpon, kopii, hon-yaku shorui no hitsuyou busuu wo oshiete kudasai.', 'Please tell required counts for originals/copies/translations.'),
        ],
        options: [{ id: 'h6', label: 'Back to start', next: 'start' }],
      },
    },
  },
  general_office: {
    title: 'Branch: General Office Follow-up',
    nodes: {
      start: {
        prompt: 'Pick the exact situation now:',
        options: [
          { id: 'i1', label: 'Did not understand response', next: 'repeat' },
          { id: 'i2', label: 'Need exact docs list', next: 'docs' },
          { id: 'i3', label: 'Need deadline and next step', next: 'deadline' },
        ],
      },
      repeat: {
        lines: [
          you('すみません、もう一度ゆっくりお願いします。', 'Sumimasen, mou ichido yukkuri onegai shimasu.', 'Sorry, please repeat slowly.'),
          you('簡単な日本語で説明していただけますか？', 'Kantan na nihongo de setsumei shite itadakemasu ka?', 'Could you explain in simpler Japanese?'),
        ],
        options: [{ id: 'i4', label: 'Back to start', next: 'start' }],
      },
      docs: {
        lines: [
          you('必要書類を紙に書いていただけますか？', 'Hitsuyou shorui wo kami ni kaite itadakemasu ka?', 'Could you write down the required documents?'),
        ],
        options: [{ id: 'i5', label: 'Back to start', next: 'start' }],
      },
      deadline: {
        lines: [
          you('申請期限はいつですか？', 'Shinsei kigen wa itsu desu ka?', 'When is the deadline?'),
          you('次に何をすればいいですか？', 'Tsugi ni nani wo sureba ii desu ka?', 'What should I do next?'),
        ],
        options: [{ id: 'i6', label: 'Back to start', next: 'start' }],
      },
    },
  },
}

const TASK_FLOW_OVERRIDES = {
  p1: 'clinic_appointment',
  p2: 'ward_handbook',
  p3: 'grant_consult',
  p5: 'insurance_reduction',
  p10: 'hr_benefits',
  d1: 'hospital_payment',
  o4: 'tax_deduction',
  b8: 'consulate_birth',
}

const CONTEXT_DEFAULT_FLOW = {
  clinic: 'clinic_appointment',
  ward: 'ward_handbook',
  insurance: 'insurance_reduction',
  tax: 'tax_deduction',
  work: 'hr_benefits',
  consulate: 'consulate_birth',
  housing: 'general_office',
  general: 'general_office',
}

const FLOW_KEYWORD_RULES = [
  { key: 'grant_consult', keywords: ['grant', 'kyuufukin'] },
  { key: 'hospital_payment', keywords: ['direct payment', 'chokusetsu', '500,000'] },
  { key: 'tax_deduction', keywords: ['tax', 'kakutei', 'deduction', 'zeimusho'] },
  { key: 'consulate_birth', keywords: ['consulate', 'citizenship', 'passport', 'philippine'] },
  { key: 'hr_benefits', keywords: ['employer', 'company', 'leave', 'hr', 'fuka'] },
]

const CONTEXT_STARTERS = {
  clinic: {
    situation: 'Starter: clinic reception',
    lines: [
      you('妊娠関連の受診について相談したいです。', 'Ninshin kanren no jushin ni tsuite soudan shitai desu.', 'I want to ask about pregnancy consultation.'),
      staff('ご予約はありますか？', 'Goyoyaku wa arimasu ka?', 'Do you have an appointment?'),
      you('最短で取れる日時を教えてください。', 'Saitan de toreru nichiji wo oshiete kudasai.', 'Please tell the earliest available date/time.'),
    ],
  },
  ward: {
    situation: 'Starter: ward office counter',
    lines: [
      you('妊娠・出産関連の手続きをしたいです。', 'Ninshin shussan kanren no tetsuzuki wo shitai desu.', 'I want to process pregnancy/childbirth paperwork.'),
      staff('本日はどの申請ですか？', 'Honjitsu wa dono shinsei desu ka?', 'Which application today?'),
      you('必要な申請をまとめて案内してください。', 'Hitsuyou na shinsei wo matomete annai shite kudasai.', 'Please guide all required applications together.'),
    ],
  },
  insurance: {
    situation: 'Starter: insurance counter',
    lines: [
      you('保険関連の手続きを確認したいです。', 'Hoken kanren no tetsuzuki wo kakunin shitai desu.', 'I want to confirm insurance procedures.'),
      you('減免と限度額認定について相談です。', 'Genmen to gendogaku nintei ni tsuite soudan desu.', 'I need help with premium reduction and limit certificate.'),
    ],
  },
  tax: {
    situation: 'Starter: tax office inquiry',
    lines: [
      you('医療費控除の申告について確認したいです。', 'Iryouhi koujo no shinkoku ni tsuite kakunin shitai desu.', 'I want to confirm medical deduction filing.'),
      you('必要書類と期限を教えてください。', 'Hitsuyou shorui to kigen wo oshiete kudasai.', 'Please tell required docs and deadline.'),
    ],
  },
  work: {
    situation: 'Starter: HR inquiry',
    lines: [
      you('出産に関する社内手続きを確認したいです。', 'Shussan ni kansuru shanai tetsuzuki wo kakunin shitai desu.', 'I want to confirm company procedures for childbirth.'),
      you('提出期限も合わせて教えてください。', 'Teishutsu kigen mo awasete oshiete kudasai.', 'Please include submission deadlines.'),
    ],
  },
  consulate: {
    situation: 'Starter: consulate inquiry',
    lines: [
      you('赤ちゃんの出生登録について相談したいです。', 'Akachan no shussei touroku ni tsuite soudan shitai desu.', 'I want to ask about baby birth registration.'),
      you('必要書類と予約方法を教えてください。', 'Hitsuyou shorui to yoyaku houhou wo oshiete kudasai.', 'Please tell required documents and booking steps.'),
    ],
  },
  general: {
    situation: 'Starter: office request',
    lines: [
      you('この手続きについて教えてください。', 'Kono tetsuzuki ni tsuite oshiete kudasai.', 'Please explain this process.'),
      you('必要書類と期限を確認したいです。', 'Hitsuyou shorui to kigen wo kakunin shitai desu.', 'I want to confirm required documents and deadline.'),
    ],
  },
}

const CONTEXT_RULES = [
  { id: 'consulate', keywords: ['consulate', 'citizenship', 'passport', 'philippine'] },
  { id: 'clinic', keywords: ['ob-gyn', 'clinic', 'hospital', 'checkup', 'sanfujinka'] },
  { id: 'ward', keywords: ['ward office', 'kuyakusho', 'boshi', 'grant', 'child allowance', 'birth registration', 'city office'] },
  { id: 'insurance', keywords: ['insurance', 'hoken', 'kokuho', 'limit certificate', 'medical subsidy', 'genmen'] },
  { id: 'tax', keywords: ['tax', 'kakutei', 'deduction', 'zeimusho'] },
  { id: 'work', keywords: ['employer', 'company', 'work', 'leave', 'hr'] },
]

function detectContexts(item) {
  const source = [
    normalizedText(item?.text),
    ...(Array.isArray(item?.howTo) ? item.howTo.map(step => normalizedText(step)) : []),
    ...(Array.isArray(item?.phones) ? item.phones.map(phone => `${normalizedText(phone?.label)} ${normalizedText(phone?.number)}`) : []),
  ].join(' ').toLowerCase()

  const hits = CONTEXT_RULES
    .filter(rule => rule.keywords.some(keyword => source.includes(keyword)))
    .map(rule => rule.id)

  return hits.length > 0 ? hits : ['general']
}

function shouldOfferFallbackScripts(item, contexts) {
  if (Array.isArray(item?.phones) && item.phones.length > 0) return true
  if (contexts.some(ctx => ctx !== 'general')) return true

  const text = normalizedText(item?.text).toLowerCase()
  const keywords = ['ask', 'apply', 'submit', 'register', 'visit', 'call', 'consultation', 'counter', 'office', 'order', 'buy']
  return keywords.some(keyword => text.includes(keyword))
}

function buildFallbackStarter(item, contexts) {
  const primary = contexts[0] || 'general'
  const starter = CONTEXT_STARTERS[primary] || CONTEXT_STARTERS.general
  return {
    id: `${normalizedText(item?.id) || 'task'}-starter`,
    situation: starter.situation,
    lines: starter.lines,
  }
}

function resolveFlowKey(item, script, contexts) {
  const itemId = normalizedText(item?.id)
  if (itemId && TASK_FLOW_OVERRIDES[itemId]) return TASK_FLOW_OVERRIDES[itemId]

  const text = `${normalizedText(item?.text)} ${normalizedText(script?.situation)}`.toLowerCase()
  const keywordRule = FLOW_KEYWORD_RULES.find(rule => rule.keywords.some(k => text.includes(k)))
  if (keywordRule) return keywordRule.key

  for (const ctx of contexts) {
    if (CONTEXT_DEFAULT_FLOW[ctx]) return CONTEXT_DEFAULT_FLOW[ctx]
  }
  return 'general_office'
}

function normalizeScript(script, fallbackId, flow) {
  const id = normalizedText(script?.id) || fallbackId
  const situation = normalizedText(script?.situation) || 'Conversation starter'
  const lines = Array.isArray(script?.lines)
    ? script.lines.map(line => normalizeLine(line)).filter(Boolean)
    : []
  return { id, situation, lines, branchFlow: flow || null }
}

export function buildTaskScripts(item) {
  const contexts = detectContexts(item)
  const existingScripts = Array.isArray(item?.scripts)
    ? item.scripts.filter(script => Array.isArray(script?.lines) && script.lines.length > 0)
    : []

  const withFlow = (script, idx) => {
    const flowKey = resolveFlowKey(item, script, contexts)
    const flow = normalizeFlow(FLOW_LIBRARY[flowKey], 'Scenario Branch')
    return normalizeScript(script, `${item.id}-script-${idx + 1}`, flow)
  }

  if (existingScripts.length > 0) {
    return existingScripts.map((script, idx) => withFlow(script, idx))
  }

  if (!shouldOfferFallbackScripts(item, contexts)) return []

  const fallback = buildFallbackStarter(item, contexts)
  return [withFlow(fallback, 0)]
}
