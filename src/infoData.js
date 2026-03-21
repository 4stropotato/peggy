// Knowledge base - ALL content from markdown docs accessible in the app
// Kawasaki-shi specific info included where relevant

export const kawasakiInfo = {
  address: 'Kawasaki-shi Kawasaki-ku Oda 5-28-9',
  wardOffice: {
    name: 'Kawasaki Ward Office (川崎区役所)',
    address: '川崎市川崎区東田町8',
    mainPhone: '044-201-3113',
    departments: {
      childFamily: { name: 'Child & Family Support (こども家庭課)', phone: '044-201-3214' },
      insurance: { name: 'Insurance & Pension (保険年金課)', phone: '044-201-3151' },
      welfare: { name: 'Welfare (福祉事務所)', phone: '044-201-3216' },
      housing: { name: 'Housing (まちづくり局住宅整備課)', phone: '044-200-2994' },
      tax: { name: 'Tax (市民税課)', phone: '044-200-2205' },
    },
    hours: 'Mon-Fri 8:30-17:00',
    note: 'Near Kawasaki Station, walking distance from your area'
  },
  taxOffice: {
    name: 'Kawasaki-Minami Tax Office (川崎南税務署)',
    address: '川崎市川崎区榎町3-18',
    phone: '044-222-7531',
    note: 'For 確定申告 (tax return filing)'
  },
  pensionOffice: {
    name: 'Kawasaki Pension Office (川崎年金事務所)',
    address: '川崎市川崎区宮前町12-17',
    phone: '044-233-0181',
    note: 'For pension exemption questions'
  },
  healthCenter: {
    name: 'Kawasaki Health & Welfare Center (川崎区保健福祉センター)',
    address: '川崎市川崎区東田町8 (same building as ward office)',
    phone: '044-201-3212',
    note: 'For maternity classes, postpartum care, newborn visits'
  },
  urHousing: {
    name: 'UR Kawasaki (UR都市機構 川崎)',
    phone: '0120-411-363',
    note: 'For danchi/UR housing - you plan to move in June. Apply early!'
  },
  kanagawaHousing: {
    name: 'Kanagawa Prefecture Housing (神奈川県住宅供給公社)',
    phone: '045-651-1854',
    note: 'For 県営住宅 (prefectural housing)'
  },
  philEmbassy: {
    name: 'Philippine Embassy Tokyo',
    address: '5-15-5 Roppongi, Minato-ku, Tokyo',
    phone: '03-5562-1600',
    note: 'For baby birth registration (dual citizenship). Also has consulate in Yokohama.'
  },
  philConsulateYokohama: {
    name: 'Philippine Consulate Yokohama',
    address: 'Yokohama, closer than Tokyo embassy',
    phone: '045-681-5006',
    note: 'Closer to Kawasaki than Tokyo embassy'
  },
  internationalExchange: {
    name: 'Kawasaki International Association (川崎市国際交流協会)',
    address: '川崎市川崎区駅前本町11-2 (Kawasaki Frontier Building 2F)',
    phone: '044-435-7000',
    note: 'Free Japanese classes, translation help, tax filing support'
  },
  danchiInfo: {
    note: 'You plan to move to danchi in June. Key info:',
    tips: [
      'Apply through UR (0120-411-363) or City Hall housing department (044-200-2994)',
      'Kawasaki-ku has several danchi options near your area',
      'Families with children get priority in some lotteries',
      'Rent is income-based - lower income = lower rent',
      'Bring proof of income, residence cards, family register',
      'Check 川崎市営住宅 and 県営住宅 AND UR - all different systems',
      'UR danchi does not require income limits but city/prefectural housing does',
      'Apply 2-3 months before desired move-in date'
    ]
  }
}

export const governmentSupportInfo = [
  {
    phase: 'Pregnancy (ASAP)',
    icon: '🤰',
    items: [
      {
        title: 'Mother-Child Health Handbook (母子健康手帳)',
        value: 'Priceless - unlocks everything else',
        details: [
          'Go to Kawasaki Ward Office (川崎区役所) immediately',
          'Bring: Pregnancy confirmation from clinic, residence card, health insurance card, My Number card',
          'You receive: The handbook (used at every checkup and at birth), 14 prenatal checkup vouchers, information about local programs',
          'Some cities give additional gifts at this point - ASK at Kawasaki Ward Office',
          'Kawasaki Ward Office: 044-201-3214 (こども家庭課)'
        ]
      },
      {
        title: 'Pregnancy/Childbirth Support Grant (出産・子育て応援給付金)',
        value: '¥100,000 CASH (or equivalent vouchers)',
        details: [
          'NATIONAL program started 2023 - this is new!',
          'When you register pregnancy (妊娠届出時): ¥50,000',
          'When you register birth (出生届出後): ¥50,000',
          'Total: ¥100,000',
          'Requires brief consultation with support worker (面談) at each stage',
          'DO NOT SKIP THE CONSULTATION - no consultation = no money',
          'Applied for at Kawasaki Ward Office',
          'Some municipalities give cash, others give shopping vouchers or point cards - ask what Kawasaki gives',
          'Kawasaki contact: 044-201-3214'
        ]
      },
      {
        title: 'Prenatal Checkup Vouchers (妊婦健康診査受診票)',
        value: '¥70,000-120,000',
        details: [
          '14 checkup vouchers, each covering ¥5,000-10,000+ per visit',
          'Received when getting Mother-Child Handbook',
          'Present at each OB-GYN visit',
          'Some municipalities offer additional ultrasound vouchers',
          'KEEP ALL RECEIPTS for amounts not covered - counts toward 医療費控除 tax deduction!'
        ]
      },
      {
        title: 'Free Dental Checkup (妊婦歯科健診)',
        value: '¥5,000-10,000',
        details: [
          'Kawasaki offers free dental checkup for pregnant women',
          'Usually 1 free checkup during pregnancy',
          'Ask at Ward Office when getting the handbook',
          'Additional dental treatment costs count toward medical expense tax deduction',
          'Dental problems during pregnancy can cause premature birth - this is important!'
        ]
      },
      {
        title: 'Pension Exemption (産前産後期間の国民年金保険料免除)',
        value: '~¥65,000 saved (4 months)',
        details: [
          'AUTOMATIC exemption from pension premiums for 4 months around due date',
          '1 month before due date month through 2 months after',
          'Saves ~¥16,500/month x 4 = ~¥66,000',
          'These months STILL COUNT as paid toward pension record',
          'Apply at Kawasaki Ward Office pension counter (年金課): 044-201-3151',
          'They say "automatic" pero kailangan mag-apply!',
          'If on employer pension (厚生年金): Different rules through employer',
          'Kawasaki Pension Office: 044-233-0181'
        ]
      },
      {
        title: 'Health Insurance Premium Reduction (国民健康保険料の軽減)',
        value: 'Potentially ¥100,000+/year',
        details: [
          'If household income is low, you may qualify for:',
          '7-wari reduction (70% off): Very low income',
          '5-wari reduction (50% off): Low income',
          '2-wari reduction (20% off): Moderate-low income',
          'Applied automatically based on tax filing',
          'IMPORTANT: You MUST file a tax return even if income is zero!',
          'Many foreigners miss this because they don\'t file returns when income is low',
          'Kawasaki insurance counter: 044-201-3151'
        ]
      },
      {
        title: 'Maternity Mark Badge (マタニティマーク)',
        value: 'Free',
        details: [
          'Free badge from Ward Office or train stations',
          'Priority seating on trains/buses',
          'Helpful in early months when not showing yet'
        ]
      },
      {
        title: 'Free Maternity Classes (母親学級/両親学級)',
        value: 'Free',
        details: [
          'Kawasaki Health Center offers free prenatal classes',
          'Topics: Birth prep, breastfeeding, newborn care, nutrition',
          'Good networking with other parents',
          'Kawasaki Health Center: 044-201-3212'
        ]
      },
      {
        title: 'Pregnancy Sickness Leave Benefit (傷病手当金)',
        value: '2/3 of daily salary (if applicable)',
        details: [
          'If Naomi has severe morning sickness requiring time off work',
          'Must be enrolled in employer health insurance (社会保険)',
          'Doctor must certify the condition',
          'Covers 2/3 of daily salary for the sick leave period'
        ]
      }
    ]
  },
  {
    phase: 'Delivery',
    icon: '🏥',
    items: [
      {
        title: 'Childbirth Lump-Sum Allowance (出産育児一時金)',
        value: '¥500,000',
        details: [
          'Use Direct Payment System (直接支払制度) through hospital',
          'If delivery costs less than ¥500,000: GET THE DIFFERENCE BACK',
          'Normal delivery at budget hospital: ¥350,000-450,000 = potential refund ¥50,000-150,000!',
          'Kawasaki area hospital prices vary widely - ask multiple hospitals',
          'Apply refund at health insurance office (国保: Ward Office / 社保: employer)'
        ]
      },
      {
        title: 'Additional Insurance Benefit (付加給付)',
        value: '¥0-90,000 extra',
        details: [
          'MANY PEOPLE DON\'T KNOW THIS EXISTS',
          'Some employer health insurance associations pay EXTRA on top of ¥500,000',
          'Amount varies: ¥10,000-90,000',
          'Ask Shinji\'s and Naomi\'s employer HR departments',
          'Only for employer insurance (社会保険), not National Health Insurance (国保)',
          'This is FREE EXTRA MONEY just for asking'
        ]
      },
      {
        title: 'High-Cost Medical Care (高額療養費)',
        value: 'Potentially ¥100,000-300,000 back',
        details: [
          'If monthly medical costs exceed ~¥80,000-90,000',
          'GET THE LIMIT CERTIFICATE (限度額適用認定証) BEFORE DELIVERY',
          'Applies to: C-section, complications, NICU stays',
          'Normal delivery NOT covered (not classified as medical treatment)',
          'But if anything goes wrong, it kicks in automatically',
          'Apply at: Kawasaki Ward Office insurance counter (044-201-3151)'
        ]
      },
      {
        title: 'Premature Baby Medical Care (未熟児養育医療)',
        value: 'Full coverage (if needed)',
        details: [
          'If baby is born premature or low birth weight',
          'Government covers ALL medical costs for the baby',
          'Includes NICU hospitalization',
          'Apply at Ward Office with doctor\'s documentation',
          'Hopefully not needed, but important to know about'
        ]
      }
    ]
  },
  {
    phase: 'Maternity/Paternity Leave',
    icon: '👪',
    items: [
      {
        title: 'Maternity Leave Allowance (出産手当金)',
        value: '~2/3 of salary x 98 days',
        details: [
          'For women on employer health insurance (社会保険)',
          '42 days before due date + 56 days after birth',
          'Example: Monthly salary ¥200,000 → ~¥430,000 total',
          'Apply through employer'
        ]
      },
      {
        title: 'Childcare Leave Benefits (育児休業給付金)',
        value: '67%→50% of salary for up to 2 years',
        details: [
          'First 180 days: 67% of salary',
          'After 180 days: 50% of salary',
          'Can extend until child is 2 years old',
          'BOTH PARENTS can take this - Shinji too!',
          'Papa/Mama Plus: if both parents take leave, extends to 14 months',
          'Apply through Hello Work via employer',
          'Example: ¥200,000/month salary → ¥134,000/month first 6 months, then ¥100,000/month'
        ]
      },
      {
        title: 'Social Insurance Premium Exemption (育児休業期間の社会保険料免除)',
        value: 'Potentially ¥200,000+ saved/year',
        details: [
          'During childcare leave: NO social insurance premiums',
          'Both employee AND employer portions exempted',
          'Pension record still maintained as if paid',
          'Applies to health insurance AND pension',
          'Automatic through employer - confirm with HR'
        ]
      }
    ]
  },
  {
    phase: 'After Birth',
    icon: '👶',
    items: [
      {
        title: 'Birth Registration (出生届)',
        value: 'Required',
        details: [
          'DEADLINE: 14 days after birth!',
          'Kawasaki Ward Office, bring birth certificate from hospital + boshi techo',
          'Must complete before applying for anything else',
          'Pre-fill the form before delivery to save time'
        ]
      },
      {
        title: 'Child Allowance (児童手当) - REFORMED 2024',
        value: '¥2,340,000 per child over 18 years',
        details: [
          '2024 reform: Income limits REMOVED - everyone gets it!',
          'Extended to age 18 (was 15)',
          'Age 0-3: ¥15,000/month',
          'Age 3-18 (1st/2nd child): ¥10,000/month',
          'Total per child over 18 years: ¥2,340,000',
          'Total for 2 children (Ryzen + Baby): ~¥4,680,000',
          'Payment: Every 2 months',
          'APPLY WITHIN 15 DAYS OF BIRTH at Kawasaki Ward Office',
          'LATE APPLICATION = LOST MONTHS. Huwag mag-late!',
          'For 3rd child: ¥30,000/month = ¥6,480,000 over 18 years!',
          'Kawasaki contact: 044-201-3214'
        ]
      },
      {
        title: 'Child Medical Expense Subsidy (子ども医療費助成)',
        value: '¥50,000-100,000+/year in savings',
        details: [
          'Kawasaki: Free medical care for children until age 15',
          'Some cities expanding to age 18 - check Kawasaki updates',
          'Co-pay varies by municipality',
          'Covers: Doctor visits, hospitalization, prescriptions',
          'Babies get sick A LOT - this saves massive amounts',
          'Apply at Ward Office after getting baby\'s health insurance card'
        ]
      },
      {
        title: 'Newborn Home Visit (新生児訪問)',
        value: 'Free',
        details: [
          'Public health nurse visits your home within 4 months of birth',
          'Free health check for baby and mom',
          'They provide info about local support services',
          'USE THIS VISIT to ask about every local benefit',
          'Kawasaki Health Center: 044-201-3212'
        ]
      },
      {
        title: 'Postpartum Care Program (産後ケア事業)',
        value: 'Free to heavily subsidized',
        details: [
          'Kawasaki offers postpartum care programs',
          'Stay at postpartum care facility: Subsidized to ¥1,000-3,000/night',
          'Day visits: Free to very cheap',
          'Home visits by midwife: Free to very cheap',
          'Covers: Mom\'s recovery, breastfeeding support, baby care',
          'Apply at Ward Office or Health Center: 044-201-3212'
        ]
      },
      {
        title: 'Philippine Embassy Birth Registration',
        value: 'Preserves Filipino citizenship',
        details: [
          'Register baby at Philippine Embassy/Consulate',
          'Baby can hold dual citizenship (Filipino + Japanese)',
          'Phil. Embassy Tokyo: 03-5562-1600 (5-15-5 Roppongi)',
          'Phil. Consulate Yokohama: 045-681-5006 (closer to Kawasaki)',
          'Bring: Birth certificate, parents\' passports, marriage certificate',
          'Japan technically requires choosing at age 22, but rarely enforced'
        ]
      }
    ]
  },
  {
    phase: 'Childcare & Education (0-18)',
    icon: '🎓',
    items: [
      {
        title: 'Free Preschool/Daycare (幼児教育・保育の無償化)',
        value: '¥444,000-924,000/year per child (age 3-5)',
        details: [
          'Age 3-5: FREE for ALL children regardless of income',
          'Age 0-2: FREE for tax-exempt households',
          '2nd child discount (age 0-2): Half price',
          'Some municipalities making 2nd child FREE from 2025 - check Kawasaki!',
          'Kindergarten: Up to ¥25,700/month saved',
          'Licensed daycare: Up to ¥37,000/month saved',
          'For 2 children = potentially ¥900,000-1,800,000 total saved'
        ]
      },
      {
        title: 'School Expense Assistance (就学援助)',
        value: '¥50,000-100,000+/year',
        details: [
          'For when Ryzen enters elementary school (and later Baby #2)',
          'Families with income near welfare level qualify (threshold is generous)',
          'Covers: School supplies, lunch fees, field trips, PE uniform, swimming gear',
          'Also covers: Eye/dental treatment, commute costs, class materials',
          'You have to APPLY - not automatic. Many qualifying families miss this.',
          'Apply through school or Kawasaki education department'
        ]
      },
      {
        title: 'Free School Lunch (給食費無償化)',
        value: '~¥50,000/year per child',
        details: [
          'Increasing number of municipalities making lunch FREE',
          'Check if Kawasaki offers this',
          'If not, 就学援助 covers it for qualifying families'
        ]
      },
      {
        title: 'Free High School (高校授業料無償化)',
        value: 'Up to ¥396,000/year',
        details: [
          'Public high school: Tuition is FREE for all',
          'Private high school: Subsidy up to ¥396,000/year for lower-income families',
          'Applies to both Ryzen and Baby #2'
        ]
      },
      {
        title: 'University Support (高等教育の修学支援新制度)',
        value: 'Up to ¥910,000/year',
        details: [
          'Income-based tuition reduction',
          'Up to full tuition waiver at national universities',
          'Living expense grant up to ¥910,000/year (non-repayable!)',
          'Multi-child families get expanded support from 2025'
        ]
      },
      {
        title: 'Children\'s Centers (児童館)',
        value: 'Free daily',
        details: [
          'Every city has free children\'s centers',
          'Indoor play, activities, events',
          'Staff available for parenting advice',
          '子育て支援センター specifically for 0-3 year olds'
        ]
      },
      {
        title: 'Family Support Center (ファミリーサポートセンター)',
        value: '¥500-800/hour (vs ¥1,500+ private)',
        details: [
          'City-organized mutual aid network for childcare',
          'Other parents watch your kids for cheap',
          'Good for school pickup, emergencies',
          'Register at Kawasaki Ward Office'
        ]
      }
    ]
  },
  {
    phase: 'Tax Strategies',
    icon: '📊',
    items: [
      {
        title: 'Medical Expense Tax Deduction (医療費控除)',
        value: '¥20,000-80,000 refund/year',
        details: [
          'Formula: (Total medical - ¥100,000) x tax rate = refund',
          'Example: ¥300,000 expenses, 10% rate = ¥20,000 back',
          'Example: ¥500,000 expenses, 20% rate = ¥80,000 back',
          'WHAT COUNTS: Prenatal co-pays, delivery costs, hospital meals, baby doctor visits, Ryzen\'s visits, dental, prescriptions, eye doctor',
          'TRANSPORTATION: Bus/train to ANY medical facility, taxi during labor, taxi when needed due to pregnancy',
          'LESS KNOWN: Midwife fees, breast milk management fee, blood tests, genetic testing, medical devices if prescribed',
          'Strategy: Combine all family medical expenses in ONE person\'s return',
          'File at: Kawasaki-Minami Tax Office (044-222-7531) or online via e-Tax',
          'Keep a transport log: date, route, fare, purpose'
        ]
      },
      {
        title: 'Spouse Tax Deduction (配偶者控除/特別控除)',
        value: '¥50,000-100,000+/year savings',
        details: [
          'If Naomi earns less than ~¥1,500,000/year',
          '配偶者控除: Up to ¥380,000 deduction (if spouse earns under ~¥1,030,000)',
          '配偶者特別控除: Sliding scale above that',
          'Directly reduces income tax and resident tax',
          'Check if you\'re already claiming this'
        ]
      },
      {
        title: 'Dependent Tax Deduction (扶養控除)',
        value: 'Starts when child turns 16',
        details: [
          'Ages 16-18: ¥380,000 deduction',
          'Ages 19-22: ¥630,000 deduction (higher for university age!)',
          'Not available for children under 16 (児童手当 covers that period)'
        ]
      },
      {
        title: 'Furusato Nouzei (ふるさと納税)',
        value: 'Free goods worth 30% of donation',
        details: [
          'Donate to municipalities, receive return gifts',
          'Pay ¥2,000 out of pocket, rest comes back as tax credit',
          'Get: Rice, meat, fish, diapers, baby goods!',
          'Example: Donate ¥30,000 = ~¥9,000 worth of gifts for ¥2,000',
          'Strategy: Use this to get free food and baby supplies',
          'Use online calculator to find your optimal donation amount'
        ]
      },
      {
        title: 'Resident Tax Exemption (住民税非課税)',
        value: 'Unlocks multiple other benefits',
        details: [
          'If household income below threshold (varies by family size)',
          'Family of 4: Roughly under ¥2,500,000-3,000,000 annual',
          'Being tax-exempt unlocks: Free daycare 0-2, higher NHI reductions, public housing priority, welfare support, NHK exemption',
          'CRITICAL: Even if income is zero, FILE A TAX RETURN showing zero income',
          'Without a tax return, the system doesn\'t know you\'re low-income'
        ]
      }
    ]
  },
  {
    phase: 'Housing & Utilities',
    icon: '🏠',
    items: [
      {
        title: 'Public Housing / Danchi (公営住宅/UR住宅)',
        value: '¥20,000-50,000+/month in rent savings',
        details: [
          'YOU PLAN TO MOVE TO DANCHI IN JUNE - start applying NOW!',
          '市営住宅/県営住宅/UR住宅: Government-subsidized housing',
          'Families with children get priority in lottery',
          'Rent is income-based (lower income = lower rent)',
          'UR Housing: 0120-411-363',
          'Kawasaki Housing: 044-200-2994',
          'Kanagawa Prefecture Housing: 045-651-1854',
          'Apply 2-3 months before desired move-in',
          'Bring: Proof of income, residence cards, family register'
        ]
      },
      {
        title: 'Housing Security Benefit (住居確保給付金)',
        value: 'Up to 3 months rent',
        details: [
          'If main earner lost job or significant income drop',
          'Covers actual rent for 3 months (can extend to 9)',
          'Must be actively looking for work',
          'Apply at Ward Office welfare counter: 044-201-3216'
        ]
      },
      {
        title: 'Water Bill Reduction (水道料金の減免)',
        value: '¥1,000-3,000/month',
        details: [
          'Some municipalities offer reduced rates for large families or low-income',
          'Ask at Ward Office or contact Kawasaki water company'
        ]
      },
      {
        title: 'NHK Fee Exemption (NHK受信料の免除)',
        value: '~¥14,000/year',
        details: [
          'Full exemption for tax-exempt households (住民税非課税世帯)',
          'Apply through Ward Office if you qualify'
        ]
      }
    ]
  },
  {
    phase: 'Emergency & Low-Income Support',
    icon: '🆘',
    items: [
      {
        title: 'Emergency Small Loan (緊急小口資金)',
        value: 'Up to ¥100,000, interest-free',
        details: [
          'For temporary living difficulties',
          'Interest-free loan',
          'Repayment: 2 months grace, up to 12 months',
          'Apply at 社会福祉協議会 in Kawasaki'
        ]
      },
      {
        title: 'General Support Fund (総合支援資金)',
        value: 'Up to ¥200,000/month for 3 months',
        details: [
          'For ongoing financial difficulties',
          'Very low or zero interest',
          'Up to 10 years to repay',
          'Apply at 社会福祉協議会'
        ]
      },
      {
        title: 'Food Bank / Children\'s Cafeteria (フードバンク/こども食堂)',
        value: 'Free food',
        details: [
          'フードバンク: Free food distribution events',
          'こども食堂: Free or very cheap meals for families',
          'No income verification usually required',
          'Search online for locations near Kawasaki-ku'
        ]
      }
    ]
  },
  {
    phase: 'Employer Benefits',
    icon: '🏢',
    items: [
      {
        title: 'Company Birth Bonus (出産祝い金)',
        value: '¥10,000-100,000+',
        details: [
          'Many companies give cash gift for new baby',
          'Check with both Shinji\'s and Naomi\'s HR departments',
          'Some companies also give childcare-related benefits'
        ]
      },
      {
        title: 'Company Mutual Aid (共済組合/福利厚生)',
        value: 'Varies',
        details: [
          'Many employers have mutual aid programs',
          'May offer: Additional childbirth allowance, baby goods, discount coupons',
          'Check employee handbook or ask HR',
          'Also check if company uses cafeteria plan (選択型福利厚生)'
        ]
      }
    ]
  }
]

export const budgetTipsInfo = {
  title: 'Budget-Saving Tips',
  sections: [
    {
      title: 'Choosing Where to Deliver',
      icon: '🏥',
      content: [
        { label: 'Public hospital', detail: '¥350,000-450,000 → Possible REFUND after ¥500k allowance' },
        { label: 'Private clinic (weekday)', detail: '¥400,000-500,000 → ¥0 or small cost' },
        { label: 'Private clinic (night/weekend)', detail: '¥500,000-600,000 → ¥0-100,000' },
        { label: 'Large private hospital', detail: '¥600,000-800,000 → ¥100,000-300,000 out of pocket' },
        { label: 'Tip', detail: 'Weekday daytime delivery is cheapest. Ask multiple hospitals for price lists. Midwife birth centers (josanin) are often cheapest.' },
      ]
    },
    {
      title: 'Baby Items - Free or Cheap',
      icon: '👶',
      content: [
        { label: 'Hand-me-downs from Ryzen', detail: 'If same gender or neutral colors' },
        { label: 'Mercari app', detail: 'Secondhand baby clothes in excellent condition, very cheap' },
        { label: 'Recycle shops', detail: 'Baby sections have barely-worn clothes' },
        { label: 'Hard Off / Off House', detail: 'Secondhand stores with baby sections' },
        { label: 'Jimoty', detail: 'Local classifieds, sometimes free items' },
        { label: 'City Hall events', detail: 'Kawasaki organizes baby goods exchange events' },
      ]
    },
    {
      title: 'Buy New vs Used',
      icon: '🛒',
      content: [
        { label: 'ALWAYS buy new', detail: 'Car seat (safety), bottles/nipples (hygiene), mattress (safety), breast pump parts' },
        { label: 'Safe to buy used', detail: 'Clothes, stroller, crib (check recalls), toys, books, baby bath, blankets, bouncer, baby carrier' },
      ]
    },
    {
      title: 'Diaper Savings',
      icon: '🧷',
      content: [
        { label: 'Costco (bulk)', detail: 'Cheapest per diaper' },
        { label: 'Amazon Subscribe & Save', detail: 'Convenient + discount' },
        { label: 'Drug store sale days', detail: 'Watch for weekly specials' },
        { label: 'Nishimatsuya PB brand', detail: 'Good quality, lower price' },
        { label: 'Tip', detail: 'Newborn size is used briefly - don\'t overbuy!' },
      ]
    },
    {
      title: 'Monthly Budget During Pregnancy',
      icon: '💴',
      content: [
        { label: 'Supplements (iHerb)', detail: '¥5,000-7,000/month' },
        { label: 'Extra nutrition food', detail: '¥3,000-5,000/month' },
        { label: 'Medical co-pays', detail: '¥0-3,000/month (mostly covered by vouchers)' },
        { label: 'TOTAL EXTRA', detail: '¥8,000-15,000/month' },
        { label: 'Government support', detail: '¥25,000-30,000/month (児童手当 for 2 kids)' },
        { label: 'NET RESULT', detail: 'Government support MORE than covers extra costs!' },
      ]
    },
    {
      title: 'Best Stores for Budget Families',
      icon: '🏪',
      content: [
        { label: '1. Nishimatsuya (西松屋)', detail: 'CHEAPEST baby store chain in Japan' },
        { label: '2. Akachan Honpo (赤ちゃん本舗)', detail: 'Good variety, regular member sales' },
        { label: '3. Daiso/Seria/Can Do', detail: 'Baby bibs, toys, storage, basics' },
        { label: '4. Costco', detail: 'Best for bulk diapers and wipes' },
        { label: '5. Amazon Japan', detail: 'Subscribe & Save for recurring purchases' },
        { label: '6. Mercari', detail: 'Best secondhand app - search for baby items' },
        { label: '7. Hard Off', detail: 'Physical secondhand store chain' },
        { label: '8. Book Off', detail: 'Secondhand children\'s books (super cheap)' },
      ]
    },
    {
      title: 'Receipt Strategy (Saves Money!)',
      icon: '🧾',
      content: [
        { label: 'Start a receipt folder NOW', detail: 'Keep EVERY medical receipt' },
        { label: 'What to save', detail: 'Medical co-pays, prescriptions, hospital meals, dental, bus/train fare to appointments' },
        { label: 'Transport log', detail: 'Date | Route | Amount | Purpose (accepted by tax office)' },
        { label: 'Example', detail: '2026/04/15 | Home to Clinic | ¥480 | Prenatal checkup #3' },
      ]
    }
  ]
}

export const healthTipsInfo = {
  title: 'Pregnancy Health Tips',
  sections: [
    {
      title: 'Top 5 Brain-Building Nutrients',
      icon: '🧠',
      content: [
        { label: '1. DHA (Omega-3)', detail: 'Makes up major portion of brain structural fat. Sources: Salmon, sardines, saba, walnuts' },
        { label: '2. Choline', detail: 'The "memory molecule." Best source: Eggs (aim for 2/day = 300mg). Also: soybeans, edamame, broccoli' },
        { label: '3. Iron', detail: 'Delivers oxygen to developing brain. Sources: Red meat, spinach, legumes. Take with Vitamin C, NOT with calcium.' },
        { label: '4. Iodine', detail: 'Directly impacts IQ. Easy in Japan: seaweed (wakame, nori). Don\'t overdo kombu.' },
        { label: '5. Folate', detail: 'Critical for neural tube (first 4-8 weeks). Sources: Leafy greens, natto, edamame. Your prenatal covers this.' },
      ]
    },
    {
      title: 'Daily Food Priorities',
      icon: '🥗',
      content: [
        { label: 'Eat more', detail: 'Fatty fish 2-3x/week, eggs daily (2 ideal), leafy greens (spinach, komatsuna), berries, sweet potatoes, nuts, natto, miso soup, tofu/edamame, brown rice' },
        { label: 'Limit/Avoid', detail: 'Raw fish (sashimi), high-mercury fish (tuna/swordfish: max 1x/week), caffeine (max 200mg/day), alcohol (avoid completely), processed foods, unpasteurized dairy' },
      ]
    },
    {
      title: 'The Ryzen Formula + Improvements',
      icon: '⭐',
      content: [
        { label: 'What worked with Ryzen', detail: 'Consistent meals, plant-heavy eating, and steady routine support.' },
        { label: 'Replicate', detail: 'Keep the food-first foundation: eggs, fish, greens, beans, hydration, and regular meals.' },
        { label: 'ADD this time', detail: 'Structured core stack: prenatal, DHA, choline, calcium. Extra Vitamin D3 only if OB/labs say needed.' },
      ]
    },
    {
      title: 'Brain Stimulation Techniques',
      icon: '🎵',
      content: [
        { label: 'Talk to baby (Week 18+)', detail: 'Baby hears sounds from week 18. Use multiple languages: Filipino, Japanese, English. Dad should talk too!' },
        { label: 'Read out loud', detail: 'Content doesn\'t matter - rhythm and patterns of speech stimulate brain development' },
        { label: 'Music', detail: 'Any music Naomi enjoys. Variety is good. Avoid prolonged very loud sounds.' },
        { label: 'Morning sunlight', detail: '15-20 min daily. Produces Vitamin D, regulates sleep, reduces depression risk. Free!' },
        { label: 'Exercise', detail: '30 min walking daily. Prenatal yoga. Swimming late pregnancy. Stop if pain/bleeding/dizziness.' },
        { label: 'Stress management', detail: '4-7-8 breathing (in 4, hold 7, out 8). Nature walks. Warm baths under 38C. Journaling.' },
        { label: 'Sleep', detail: '7-9 hours. Left side when possible (blood flow to baby). Extra pillows for comfort.' },
        { label: 'Hydration', detail: '2-2.5 liters water daily. Supports amniotic fluid, blood volume, nutrient delivery.' },
      ]
    },
    {
      title: 'Week-by-Week Brain Development',
      icon: '📅',
      content: [
        { label: 'Weeks 1-4', detail: 'Neural tube forming → Folic acid most critical' },
        { label: 'Weeks 5-8', detail: 'Brain regions forming → All supplements, clean diet' },
        { label: 'Weeks 9-12', detail: 'Neurons multiplying rapidly → Good nutrition, manage stress' },
        { label: 'Weeks 13-16', detail: 'Brain structure developing → Start talking to baby' },
        { label: 'Weeks 17-20', detail: 'Hearing developing → DHA especially important, music' },
        { label: 'Weeks 21-28', detail: 'Hearing well-developed, eyes respond to light → Talk, read, sing' },
        { label: 'Weeks 29-36', detail: 'Brain weight TRIPLES → Maximum nutrition + rest' },
        { label: 'Weeks 37-40', detail: 'Final brain development → Rest, prepare, stay calm' },
      ]
    },
    {
      title: 'Common Discomforts - Budget Solutions',
      icon: '💊',
      content: [
        { label: 'Morning sickness', detail: 'Ginger tea (fresh ginger in hot water), small frequent meals, plain crackers' },
        { label: 'Leg cramps', detail: 'Magnesium (in calcium supplement), stretching before bed' },
        { label: 'Constipation', detail: 'More water, fiber from vegetables/brown rice, walking, prunes' },
        { label: 'Back pain', detail: 'Good posture, gentle stretching, warm (not hot) bath' },
        { label: 'Heartburn', detail: 'Smaller meals, don\'t lie down after eating, elevate head' },
        { label: 'Fatigue', detail: 'Rest when possible, iron-rich foods, accept help' },
        { label: 'Insomnia', detail: 'Regular schedule, no screens before bed, warm milk, breathing exercises' },
      ]
    },
    {
      title: 'Dental Care',
      icon: '🦷',
      content: [
        { label: 'Why important', detail: 'Pregnancy hormones cause gum problems. Gum disease linked to premature birth!' },
        { label: 'When', detail: '2nd trimester is safest time for dental visit' },
        { label: 'Free checkup', detail: 'Kawasaki offers FREE dental checkup for pregnant women (妊婦歯科健診)' },
        { label: 'Tax benefit', detail: 'All dental costs count toward 医療費控除 tax deduction' },
      ]
    }
  ]
}

export const supplementsDetailInfo = {
  title: 'Prenatal Supplements Guide',
  disclaimer: 'IMPORTANT: Show this list to your OB-GYN before starting. Prices are approximate estimates from iHerb - actual prices may vary. All prices in USD.',
  sections: [
    {
      name: 'Prenatal Multivitamin',
      icon: '💊',
      why: 'Foundation supplement. Covers folic acid (prevents neural tube defects), iron (prevents anemia, delivers oxygen to baby\'s brain), B vitamins, iodine, zinc.',
      when: 'Daily with dinner or the largest meal Naomi can keep down.',
      options: [
        { product: 'Nature Made, Prenatal Multi + DHA, 90 Softgels', price: '~$15-18 (usually ¥2,200-2,800)', note: 'Budget pick - includes some DHA too', lasts: '3 months' },
        { product: 'Thorne, Basic Prenatal, 90 Capsules', price: '~$28-35 (usually ¥4,200-5,200)', note: 'Methylated folate option. Contains high iron, so avoid adding extra iron unless OB says needed.', lasts: '1 month' },
        { product: 'Garden of Life Vitamin Code RAW Prenatal', price: '~$25-30 (usually ¥3,700-4,500)', note: 'Whole food-based option', lasts: '1 month' },
      ]
    },
    {
      name: 'DHA (Omega-3)',
      icon: '🧠',
      why: 'THE #1 brain-building nutrient. Makes up large portion of brain\'s structural fat. Studies show mothers who supplement have children with higher cognitive scores.',
      when: 'Best with dinner or another meal containing fat',
      target: 'At least 200-300mg DHA daily. Many experts recommend 500mg+.',
      options: [
        { product: 'Nordic Naturals, Prenatal DHA, 500 mg, 90 Soft Gels', price: '~$25-35 (usually ¥3,700-5,200)', note: 'Best overall - 480mg DHA + 205mg EPA, purity tested', lasts: '1.5-3 months' },
        { product: 'Carlson Labs, The Very Finest Fish Oil, 1,600mg, 120 Soft Gels', price: '~$20-25 (usually ¥3,000-3,700)', note: 'Budget alternative - high DHA content', lasts: '2 months' },
        { product: 'Nordic Naturals, Algae Omega, 715 mg, 60 Soft Gels', price: '~$28-35 (usually ¥4,200-5,200)', note: 'Vegan option - DHA from algae', lasts: '2 months' },
      ]
    },
    {
      name: 'Calcium (No Added Zinc Preferred)',
      icon: '🦴',
      why: 'Use supplements only to fill calcium gap from food. Keep a safe margin below zinc and magnesium upper limits.',
      when: 'Split into 2 later-day doses (lunch + dinner works well). TAKE 2+ HOURS AWAY FROM IRON/PRENATAL!',
      options: [
        { product: '21st Century, Calcium Citrate + D3, 120 Tablets', price: '~$8-12 (usually ¥1,200-1,800)', note: 'No added zinc. Citrate form is generally easier to absorb.', lasts: '1 month' },
        { product: 'Nature Made, Calcium 600mg + D3, 220 Tablets', price: '~$10-14 (usually ¥1,500-2,100)', note: 'No added zinc. Adjust tablet count based on food calcium intake.', lasts: '3+ months' },
        { product: 'Kirkland Calcium Citrate + D3, 500 Tablets', price: '~$12-18 (usually ¥1,800-2,700)', note: 'Large bottle, no added zinc, budget long-term option', lasts: '4-6 months' },
      ]
    },
    {
      name: 'Chlorella',
      icon: '🌿',
      why: 'Optional add-on only. Not a core prenatal requirement. Keep it off by default unless OB-GYN agrees and budget allows.',
      when: 'With meals. Start with lower dose, increase gradually over a week.',
      options: [
        { product: 'NOW Foods, Certified Organic Chlorella, 500 mg, 200 Tablets', price: '~$12-16 (usually ¥1,800-2,400)', note: 'Budget pick - organic, broken cell wall', lasts: '1-2 months' },
        { product: 'Sun Chlorella, Sun Chlorella A, 500 mg, 120 Tablets', price: '~$25-35 (usually ¥3,700-5,200)', note: 'Premium Japanese brand - DYNO-Mill process, best absorption', lasts: '1 month' },
        { product: 'NOW Foods, Organic Chlorella Powder, 4 oz', price: '~$12-15 (usually ¥1,800-2,200)', note: 'Powder - mix into smoothies, cheaper per serving', lasts: '1-2 months' },
      ]
    },
    {
      name: 'Choline',
      icon: '⚡',
      why: 'MOST PEOPLE MISS THIS. On par with DHA for brain development. Improves memory, attention, processing speed. Most prenatals have little to none. Target: 450mg/day during pregnancy.',
      when: 'With breakfast or another meal',
      options: [
        { product: 'NOW Foods, Choline & Inositol, 500 mg, 100 Capsules', price: '~$8-12 (usually ¥1,200-1,800)', note: 'Plain and practical top-up after checking choline from food (eggs, fish, meat).', lasts: '3+ months' },
        { product: 'NOW Foods, Sunflower Lecithin, 1200 mg, 100 Softgels', price: '~$10-14 (usually ¥1,500-2,100)', note: 'Alternative phosphatidylcholine source if better tolerated', lasts: '1-2 months' },
      ]
    },
    {
      name: 'Vitamin D3 (Optional / Lab-Guided)',
      icon: '☀️',
      why: 'Important nutrient, but extra high-dose D3 should be based on OB advice and 25-OH vitamin D labs.',
      when: 'With a meal containing fat, only if advised',
      options: [
        { product: 'NOW Foods, Vitamin D-3, 1,000 IU, 180 Softgels', price: '~$7-10 (usually ¥1,050-1,500)', note: 'Lower-dose option for conservative top-up if OB suggests supplementation.', lasts: '6 months' },
        { product: 'Solgar, Vitamin D3, 2,200 IU, 100 Vegetable Capsules', price: '~$10-14 (usually ¥1,500-2,100)', note: 'Use only when deficiency is confirmed or clinician recommends.', lasts: '3+ months' },
      ]
    }
  ],
  schedule: [
    { time: 'BREAKFAST', supplements: 'Choline + Prenatal capsule #1', note: 'Smaller breakfast pill load. Naomi can move the reminder time in Health > Supplements.' },
    { time: 'LUNCH', supplements: 'Calcium (1st tablet)', note: 'First calcium dose, kept away from the prenatal iron.' },
    { time: 'MID-AFTERNOON', supplements: 'Calcium (2nd tablet)', note: 'Second calcium dose. Keep dinner free for prenatal + DHA.' },
    { time: 'DINNER', supplements: 'Prenatal capsule #2 + DHA (2 softgels)', note: 'Main meal stack. DHA stays with food and only one prenatal capsule is paired here.' },
    { time: 'BEDTIME', supplements: 'Prenatal capsule #3', note: 'Last prenatal capsule with a light snack before sleep.' },
  ],
  importantRule: 'HUWAG sabayan ang calcium at prenatal (may iron). Keep 2+ hours apart. Naomi default now is breakfast choline + prenatal #1, lunch calcium, afternoon calcium, dinner DHA + prenatal #2, then prenatal #3 before bed. Actual times are editable in Health > Supplements. Extra Vitamin D3 should be lab-guided, not automatic.',
  budgetCart: {
    title: 'Budget iHerb Cart',
    total: '~$70-90 (usually JPY 10,500-13,000)',
    note: 'Current 4-item core stack. Chlorella and extra Vitamin D3 stay optional for now.',
    items: [
      'Thorne, Basic Prenatal, 90 Capsules',
      'Nordic Naturals, Prenatal DHA, 90 Soft Gels',
      '21st Century, Calcium Citrate + D3, 120 Tablets',
      'NOW Foods, Choline & Inositol, 100 Capsules',
      'Chlorella only if OB-GYN says yes later',
      'Extra Vitamin D3 only with OB/lab guidance',
    ]
  },
  iherbTips: [
    'First order discount: Automatic na discount pag bagong account',
    'Search "iHerb promo code" before ordering - laging may available',
    'Subscribe & Save: Extra 5% off sa items na ire-reorder mo',
    'Free shipping to Japan: Usually $20+ orders',
    'Check "Specials" and "Clearance" before every order',
    'Loyalty credits from past purchases apply to future orders',
    'Larger bottle = cheaper per tablet',
    'Order 2 weeks before maubusan para hindi magka-gap',
    'iHerb ships directly to Japan, delivery usually 5-10 days',
  ],
  whatNotToBuy: [
    'Separate folic acid (prenatal has it)',
    'Separate iron (prenatal has it, unless OB-GYN says otherwise)',
    'Biotin (prenatal covers it)',
    'Vitamin C supplements (eat fruits instead - free)',
    'Collagen supplements (no proven benefit for pregnancy)',
    '"Pregnancy tea" blends (overpriced, minimal benefit)',
    'Separate B-complex (prenatal covers it)',
    'Expensive "prenatal packs" (paying for marketing)',
    'High-dose extra Vitamin D without labs/OB',
  ]
}

export const babyNamesInfo = {
  title: 'Baby Name Suggestions',
  subtitle: 'Every name follows the Ryzen Formula: cool modern sound hiding deeper kanji meaning.',
  ryzenFormula: {
    sound: 'Ryzen - modern, international, powerful',
    kanji: '雷禅 - Thunder (雷) + Zen (禅)',
    meaning: 'The balance of raw power and inner peace'
  },
  boyNames: [
    {
      name: 'Kaizen', kanji: '魁禅', tier: 1,
      meaning: 'Pioneer of Zen / The One Who Leads with Peace',
      pairing: '雷禅 + 魁禅 = Thunder Zen + Pioneer Zen',
      why: 'TRIPLE meaning: the kaizen philosophy + the kanji + 禅 connection with Ryzen. Your family keeps improving - that IS kaizen.',
      readability: 'Natural (魁 uncommon but reading is obvious)',
      nicknames: 'Kai, Zen'
    },
    {
      name: 'Raiden', kanji: '雷伝', tier: 1,
      meaning: 'Thunder\'s Legacy / The Legend of Thunder',
      pairing: '雷禅 + 雷伝 = Thunder Zen + Thunder Legend',
      why: 'Both share 雷. One finds peace in thunder, the other carries its legacy. 雷伝 = "passing down the thunder."',
      readability: 'Instant',
      nicknames: 'Rai, Den'
    },
    {
      name: 'Tenzen', kanji: '天禅', tier: 1,
      meaning: 'Heavenly Zen / Zen of the Heavens',
      pairing: '雷禅 + 天禅 = Thunder Zen + Heaven Zen',
      why: 'Thunder is born from the sky. One brother is the storm, the other is the sky itself.',
      readability: 'Instant',
      nicknames: 'Ten, Zen'
    },
    {
      name: 'Raion', kanji: '雷音', tier: 1,
      meaning: 'Sound of Thunder / Thunder\'s Roar',
      pairing: '雷禅 + 雷音 = Thunder Zen + Thunder Sound',
      why: 'SPECIAL: "Raion" = Japanese for LION. Kanji says "sound of thunder." A lion\'s roar IS thunder. Four layers deep.',
      readability: 'Instant',
      nicknames: 'Rai, on-chan'
    },
    {
      name: 'Raito', kanji: '雷斗', tier: 1,
      meaning: 'Thunder of the Big Dipper / Thunder Fighter',
      pairing: '雷禅 + 雷斗 = Thunder Zen + Thunder Fighter',
      why: 'Hidden English: "Light." Hidden Japanese: Big Dipper. Shares 雷.',
      readability: 'Instant',
      nicknames: 'Rai, Light'
    },
    {
      name: 'Raishin', kanji: '雷心', tier: 1,
      meaning: 'Thunder Heart / Heart of the Storm',
      pairing: '雷禅 + 雷心 = Thunder Zen + Thunder Heart',
      why: 'Ryzen found zen (peace), Raishin found the heart. Calm mind vs fierce heart.',
      readability: 'Instant',
      nicknames: 'Rai, Shin'
    },
    {
      name: 'Gaizen', kanji: '凱禅', tier: 2,
      meaning: 'Triumphant Zen / Victory in Peace',
      pairing: '雷禅 + 凱禅 = Thunder Zen + Triumph Zen',
      why: 'Power through storm, victory through peace. The family\'s story.',
      readability: 'Natural',
      nicknames: 'Gai, Zen'
    },
    {
      name: 'Guren', kanji: '紅蓮', tier: 2,
      meaning: 'Crimson Lotus - highest enlightenment from suffering',
      pairing: '雷禅 + 紅蓮 = Thunder Zen + Crimson Lotus',
      why: 'In Buddhism, crimson lotus = enlightenment born from suffering. Your family faces hard times - this lotus blooms precisely because of the struggle.',
      readability: 'Instant',
      nicknames: 'Gu, Ren'
    },
    {
      name: 'Hayate', kanji: '颯', tier: 2,
      meaning: 'Swift Wind / The Gust That Clears Everything',
      pairing: '雷禅 + 颯 = Thunder Zen + Swift Wind',
      why: 'One kanji, maximum impact. 颯 is the wind before thunder. He arrives first, clearing the way.',
      readability: 'Instant (popular name)',
      nicknames: 'Haya'
    },
    {
      name: 'Kohaku', kanji: '琥珀', tier: 2,
      meaning: 'Amber - the gem that preserves ancient life',
      pairing: '雷禅 + 琥珀 = Thunder Zen + Amber',
      why: 'Unisex. Greek "elektron" (amber) = origin of "electricity." Lightning frozen in time.',
      readability: 'Instant',
      nicknames: 'Ko, Haku'
    },
    {
      name: 'Reizen', kanji: '玲禅', tier: 1,
      meaning: 'Clear Bell Zen / Refined Calm',
      pairing: '雷禅 + 玲禅 = Thunder Zen + Clear Zen',
      why: 'Keeps the zen identity while sounding modern and international. Very close family signature without copying.',
      readability: 'Natural',
      nicknames: 'Rei, Zen'
    },
    {
      name: 'Raiku', kanji: '雷空', tier: 1,
      meaning: 'Thunder Sky / Sky that carries lightning',
      pairing: '雷禅 + 雷空 = Thunder Zen + Thunder Sky',
      why: 'One is thunder with peace, the other is the sky that holds the storm. Clean sibling symmetry.',
      readability: 'Instant',
      nicknames: 'Rai, Ku'
    },
    {
      name: 'Soren', kanji: '蒼蓮', tier: 1,
      meaning: 'Blue Lotus / Calm strength in deep waters',
      pairing: '雷禅 + 蒼蓮 = Thunder Zen + Blue Lotus',
      why: 'Balances power with serenity. Lotus motif links naturally with your existing spiritual naming direction.',
      readability: 'Natural',
      nicknames: 'So, Ren'
    },
    {
      name: 'Hibiki', kanji: '響', tier: 2,
      meaning: 'Resonance / Echo that stays',
      pairing: '雷禅 + 響 = Thunder Zen + Resonance',
      why: 'After thunder comes echo. The name implies lasting influence and presence.',
      readability: 'Instant',
      nicknames: 'Hibi'
    },
    {
      name: 'Tsubasa', kanji: '翼', tier: 2,
      meaning: 'Wings / Ability to fly far',
      pairing: '雷禅 + 翼 = Thunder Zen + Wings',
      why: 'Grounded kuya and soaring sibling. Great aspirational meaning with simple readability.',
      readability: 'Instant',
      nicknames: 'Tsuba'
    },
    {
      name: 'Akito', kanji: '暁斗', tier: 2,
      meaning: 'Dawn Star Fighter / Dawn strength',
      pairing: '雷禅 + 暁斗 = Thunder Zen + Dawn Fighter',
      why: 'Storm at night, dawn after. Symbolizes recovery and resilience.',
      readability: 'Natural',
      nicknames: 'Aki, To'
    },
    {
      name: 'Haruki', kanji: '陽輝', tier: 2,
      meaning: 'Sunlight Brilliance / Warm shining child',
      pairing: '雷禅 + 陽輝 = Thunder Zen + Sunlight Radiance',
      why: 'Thunder and sun create a complete sky story. Warm counterpart to Ryzen’s electric motif.',
      readability: 'Instant',
      nicknames: 'Haru'
    },
    {
      name: 'Souma', kanji: '蒼真', tier: 2,
      meaning: 'Blue Truth / True deep spirit',
      pairing: '雷禅 + 蒼真 = Thunder Zen + Blue Truth',
      why: 'Simple, modern, and grounded. Keeps strong Japanese identity while easy internationally.',
      readability: 'Instant',
      nicknames: 'Sou'
    },
  ],
  girlNames: [
    {
      name: 'Raika', kanji: '雷花', tier: 1,
      meaning: 'Thunder Flower / Flower Born from the Storm',
      pairing: '雷禅 + 雷花 = Thunder Zen + Thunder Flower',
      why: 'Shares 雷. He is the zen, she is the flower that blooms from it. The storm creates beauty.',
      readability: 'Instant',
      nicknames: 'Rai, Ka-chan'
    },
    {
      name: 'Seiren', kanji: '星蓮', tier: 1,
      meaning: 'Star Lotus - celestial beauty rooted in earth',
      pairing: '雷禅 + 星蓮 = Thunder Zen + Star Lotus',
      why: 'Sounds like "siren" (mythological beauty). Means star + lotus. Celestial and grounded.',
      readability: 'Instant',
      nicknames: 'Sei, Ren'
    },
    {
      name: 'Kazane', kanji: '風音', tier: 1,
      meaning: 'Sound of the Wind',
      pairing: '雷禅 + 風音 = Thunder Zen + Sound of Wind',
      why: 'Thunder and wind - storm siblings. Powerful contrast.',
      readability: 'Needs furigana (some may read "fuuon")',
      nicknames: 'Kaza-chan'
    },
    {
      name: 'Fuuka', kanji: '風花', tier: 1,
      meaning: 'Wind Flower / Snowflakes dancing in wind on a clear day',
      pairing: '雷禅 + 風花 = Thunder Zen + Wind Flower',
      why: 'TRIPLE: wind flower, seasonal word for dancing snowflakes, wind+thunder = storm. Most poetic combo.',
      readability: 'Instant',
      nicknames: 'Fuu-chan'
    },
    {
      name: 'Suiren', kanji: '水蓮', tier: 1,
      meaning: 'Water Lotus / Water lily on still water',
      pairing: '雷禅 + 水蓮 = Thunder Zen + Water Lotus',
      why: 'Sounds like "serene." Thunder crashes from sky, water lotus floats in stillness below.',
      readability: 'Instant',
      nicknames: 'Sui, Ren'
    },
    {
      name: 'Hotaru', kanji: '蛍', tier: 1,
      meaning: 'Firefly - tiny light in the darkness',
      pairing: '雷禅 + 蛍 = Thunder Zen + Firefly',
      why: 'Both produce LIGHT. Kuya = massive thunderbolt. Imouto = gentle firefly. Same element, different scale.',
      readability: 'Instant',
      nicknames: 'Hota-chan'
    },
    {
      name: 'Shizune', kanji: '静音', tier: 1,
      meaning: 'Quiet Sound / The Sound of Silence',
      pairing: '雷禅 + 静音 = Thunder Zen + Quiet Sound',
      why: 'ULTIMATE CONTRAST. He is THUNDER. She is SILENCE. Perfect opposites. After every storm comes stillness.',
      readability: 'Instant',
      nicknames: 'Shizu-chan'
    },
    {
      name: 'Mirai', kanji: '未来', tier: 2,
      meaning: 'Future - What Has Not Yet Come',
      pairing: '雷禅 + 未来 = Thunder Zen + Future',
      why: 'Ryzen = present power and peace. Mirai = everything still coming. The best is yet to come.',
      readability: 'Instant',
      nicknames: 'Mira-chan'
    },
    {
      name: 'Kaguya', kanji: '輝夜', tier: 2,
      meaning: 'Radiant Night / She Who Shines in Darkness',
      pairing: '雷禅 + 輝夜 = Thunder Zen + Radiant Night',
      why: 'Moon Princess from Japan\'s oldest story. For your family in hard times: she IS the light in darkness.',
      readability: 'Needs furigana (but cultural reference is famous)',
      nicknames: 'Kagu-chan'
    },
    {
      name: 'Rinka', kanji: '凛花', tier: 2,
      meaning: 'Dignified Flower / Flower that stands tall in cold',
      pairing: '雷禅 + 凛花 = Thunder Zen + Dignified Flower',
      why: '凛 = dignity from enduring hardship. For a family facing hard times, this flower doesn\'t wilt.',
      readability: 'Instant',
      nicknames: 'Rin-chan'
    },
    {
      name: 'Reina', kanji: '玲奈', tier: 1,
      meaning: 'Clear Bell Grace / Elegant resonance',
      pairing: '雷禅 + 玲奈 = Thunder Zen + Clear Grace',
      why: 'Soft, elegant, and international. Keeps the clear-bell motif without losing Japanese roots.',
      readability: 'Instant',
      nicknames: 'Rei, Reina-chan'
    },
    {
      name: 'Hoshika', kanji: '星花', tier: 1,
      meaning: 'Star Flower / Flower lit by stars',
      pairing: '雷禅 + 星花 = Thunder Zen + Star Flower',
      why: 'Pairs naturally with storm-sky imagery and keeps the poetic style of your current top picks.',
      readability: 'Natural',
      nicknames: 'Hoshi, Ka'
    },
    {
      name: 'Airi', kanji: '愛凛', tier: 1,
      meaning: 'Beloved Dignity / Loving strength',
      pairing: '雷禅 + 愛凛 = Thunder Zen + Loving Dignity',
      why: 'Warm emotional core with strong character. A gentle but powerful sibling contrast.',
      readability: 'Instant',
      nicknames: 'Ai, Riri'
    },
    {
      name: 'Akari', kanji: '灯里', tier: 2,
      meaning: 'Village Light / Guiding lamp',
      pairing: '雷禅 + 灯里 = Thunder Zen + Guiding Light',
      why: 'Ryzen as lightning and Akari as steady lamp. Same light theme, different personality.',
      readability: 'Instant',
      nicknames: 'Aka, Kari'
    },
    {
      name: 'Yuzuki', kanji: '柚月', tier: 2,
      meaning: 'Yuzu Moon / Bright gentle moon',
      pairing: '雷禅 + 柚月 = Thunder Zen + Yuzu Moon',
      why: 'Soft seasonal name with Japanese charm and modern feel.',
      readability: 'Instant',
      nicknames: 'Yuzu, Zuki'
    },
    {
      name: 'Rinon', kanji: '凛音', tier: 2,
      meaning: 'Dignified Sound / Strong clear voice',
      pairing: '雷禅 + 凛音 = Thunder Zen + Dignified Sound',
      why: 'Sound motif connects with thunder while keeping a graceful, feminine profile.',
      readability: 'Instant',
      nicknames: 'Rin, Non-chan'
    },
    {
      name: 'Kohana', kanji: '心花', tier: 2,
      meaning: 'Heart Flower / Heart that blooms',
      pairing: '雷禅 + 心花 = Thunder Zen + Heart Flower',
      why: 'Directly speaks to family warmth and emotional resilience.',
      readability: 'Natural',
      nicknames: 'Koha'
    },
    {
      name: 'Natsuki', kanji: '夏輝', tier: 2,
      meaning: 'Summer Radiance / Warm seasonal light',
      pairing: '雷禅 + 夏輝 = Thunder Zen + Summer Radiance',
      why: 'Bright and energetic with a clear hopeful vibe. Very easy to call in daily life.',
      readability: 'Instant',
      nicknames: 'Natsu, Tsuki'
    },
  ],
  practicalNotes: [
    'Verify chosen kanji are in jinmeiyou kanji (人名用漢字) or jouyou kanji (常用漢字) list',
    'Check at Kawasaki Ward Office before birth registration',
    'You have 14 days after birth to submit (出生届)',
    'Test the name: say it in Filipino, Japanese, and English',
    'Furigana is always recorded separately from kanji at registration'
  ]
}

// Grand total financial summary
export const financialSummary = {
  directCash: {
    title: 'Direct Cash at Birth',
    total: '¥610,000 - ¥1,040,000',
    items: [
      { label: 'Pregnancy Support Grant (出産子育て応援給付金)', amount: '¥100,000' },
      { label: 'Childbirth Allowance (出産育児一時金)', amount: '¥500,000' },
      { label: 'Delivery refund (if hospital < ¥500k)', amount: '¥0-150,000' },
      { label: 'Additional Insurance Benefit (付加給付)', amount: '¥0-90,000' },
      { label: 'Company Birth Bonus', amount: '¥10,000-100,000' },
      { label: 'Municipal Baby Gift', amount: '¥0-100,000+' },
    ]
  },
  monthlyChild: {
    title: 'Child Allowance (18 years)',
    total: '¥3,540,000 - ¥4,680,000',
    items: [
      { label: 'Baby #2 (0-3: ¥15k/mo, 3-18: ¥10k/mo)', amount: '¥2,340,000' },
      { label: 'Ryzen (remaining years)', amount: '¥1,200,000 - ¥2,340,000' },
    ]
  },
  costSavings: {
    title: 'Cost Savings (money you DON\'T pay)',
    total: '¥3,000,000 - ¥5,000,000+',
    items: [
      { label: 'Prenatal checkup vouchers', amount: '¥120,000' },
      { label: 'Child medical subsidy (per child)', amount: '¥750,000 - ¥1,800,000' },
      { label: 'Free preschool 3-5 (per child)', amount: '¥900,000 - ¥1,350,000' },
      { label: '2nd child daycare discount', amount: '¥450,000 - ¥1,200,000' },
      { label: 'Free high school (per child)', amount: '¥360,000' },
      { label: 'Pension exemption', amount: '¥66,000' },
    ]
  },
  taxBenefits: {
    title: 'Tax Benefits Over Time',
    total: '¥500,000 - ¥1,500,000+',
    items: [
      { label: 'Medical expense deduction', amount: '¥20,000-80,000/year' },
      { label: 'Spouse deduction', amount: '¥50,000-100,000/year' },
      { label: 'Furusato nouzei gifts', amount: '¥10,000-30,000+/year' },
      { label: 'Dependent deduction (age 16+)', amount: '¥30,000-60,000/year' },
    ]
  },
  grandTotal: {
    conservative: '¥7,650,000',
    maximum: '¥15,720,000+',
    note: '7.6 to 15.7 MILLION yen in total government support over 18 years'
  }
}
