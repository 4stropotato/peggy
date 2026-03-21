export const phases = [
  {
    id: 'pregnancy',
    title: 'Pregnancy (ASAP)',
    icon: '🤰',
    color: '#e91e8b',
    items: [
      {
        id: 'p1', text: 'Visit OB-GYN to confirm pregnancy', priority: 'urgent',
        howTo: [
          'Find an OB-GYN clinic (産婦人科 / sanfujinka) near Kawasaki-ku',
          'Call to make an appointment',
          'Bring: Health insurance card (保険証), residence card (在留カード)',
          'First visit usually includes: urine test, ultrasound, blood test',
          'Cost: ¥5,000-15,000 (before vouchers - keep the receipt!)',
          'Ask for a pregnancy confirmation letter (妊娠確認書) for ward office'
        ],
        phones: [
          { label: 'Kawasaki Health Center', number: '044-201-3212' }
        ],
        scripts: [
          {
            situation: 'Calling to make an appointment',
            lines: [
              { speaker: 'you', ja: 'すみません、妊娠の検査をしたいのですが、予約できますか？', romaji: 'Sumimasen, ninshin no kensa wo shitai no desu ga, yoyaku dekimasu ka?', en: 'Excuse me, I\'d like to get a pregnancy test. Can I make an appointment?' },
              { speaker: 'staff', ja: '保険証はお持ちですか？', romaji: 'Hokenshou wa omochi desu ka?', en: 'Do you have your health insurance card?' },
              { speaker: 'you', ja: 'はい、持っています。', romaji: 'Hai, motteimasu.', en: 'Yes, I have it.' },
              { speaker: 'staff', ja: 'いつが都合がよろしいですか？', romaji: 'Itsu ga tsugou ga yoroshii desu ka?', en: 'When would be convenient for you?' },
              { speaker: 'you', ja: '○月○日は空いていますか？', romaji: '[Month] gatsu [day] nichi wa aiteimasu ka?', en: 'Is [date] available?' },
            ]
          },
          {
            situation: 'At the reception desk',
            lines: [
              { speaker: 'you', ja: '予約した○○です。妊娠の確認でお願いします。', romaji: 'Yoyaku shita [name] desu. Ninshin no kakunin de onegai shimasu.', en: 'I\'m [name], I have an appointment. I\'m here for pregnancy confirmation.' },
              { speaker: 'you', ja: '保険証と在留カードです。', romaji: 'Hokenshou to zairyuu kaado desu.', en: 'Here\'s my insurance card and residence card.' },
            ]
          }
        ]
      },
      {
        id: 'p2', text: 'Go to Kawasaki Ward Office - get Boshi Techo (母子健康手帳 / boshi kenkou techou) + 14 checkup vouchers', priority: 'urgent',
        moneyIds: ['m2'],
        howTo: [
          'Go to Kawasaki Ward Office (川崎区役所), Child & Family section (こども家庭課)',
          'Address: 川崎市川崎区東田町8, near Kawasaki Station',
          'Hours: Mon-Fri 8:30-17:00',
          'Bring: Pregnancy confirmation from clinic, residence card, health insurance card, My Number card',
          'You will receive: Boshi Techo (handbook), 14 prenatal checkup vouchers, information packets',
          'This also triggers eligibility for the ¥50,000 pregnancy grant (do at same visit!)',
          'Ask about ANY other programs available'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'At the ward office reception',
            lines: [
              { speaker: 'you', ja: 'すみません、母子健康手帳の交付をお願いしたいのですが。', romaji: 'Sumimasen, boshi kenkou techou no koufu wo onegai shitai no desu ga.', en: 'Excuse me, I\'d like to get the Mother-Child Health Handbook.' },
              { speaker: 'staff', ja: '妊娠確認書はお持ちですか？', romaji: 'Ninshin kakuninsho wa omochi desu ka?', en: 'Do you have pregnancy confirmation?' },
              { speaker: 'you', ja: 'はい、産婦人科からのものです。これです。', romaji: 'Hai, sanfujinka kara no mono desu. Kore desu.', en: 'Yes, from my OB-GYN. Here it is.' },
              { speaker: 'you', ja: '出産・子育て応援給付金の面談もお願いできますか？', romaji: 'Shussan kosodate ouen kyuufukin no mendan mo onegai dekimasu ka?', en: 'Can I also do the consultation for the birth/child-rearing support grant?' },
              { speaker: 'you', ja: '他に新しい家族向けのプログラムはありますか？', romaji: 'Hoka ni atarashii kazoku muke no puroguramu wa arimasu ka?', en: 'Are there any other programs for new families?' },
            ]
          }
        ]
      },
      {
        id: 'p3', text: 'Complete consultation for Shussan Kosodate Ouen Kyuufukin (出産・子育て応援給付金 / shussan kosodate ouen kyuufukin) → receive ¥50,000', priority: 'urgent',
        moneyIds: ['m1'],
        howTo: [
          'This is part of the boshi techo pickup process - do it at the SAME VISIT',
          'You need a consultation (面談 / mendan) with a support worker',
          'They will ask about your situation, health, support network',
          'After the consultation, you receive ¥50,000 (cash or voucher depending on municipality)',
          'A SECOND ¥50,000 comes after birth (total: ¥100,000)',
          'DO NOT SKIP THIS - no consultation = no money!'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Asking about the grant',
            lines: [
              { speaker: 'you', ja: '出産・子育て応援給付金の面談をお願いします。', romaji: 'Shussan kosodate ouen kyuufukin no mendan wo onegai shimasu.', en: 'I\'d like to do the consultation for the childbirth support grant.' },
              { speaker: 'staff', ja: '母子手帳は受け取りましたか？', romaji: 'Boshi techou wa uketori mashita ka?', en: 'Have you received the mother-child handbook?' },
              { speaker: 'you', ja: 'はい、今日受け取りました。', romaji: 'Hai, kyou uketorimashita.', en: 'Yes, I received it today.' },
              { speaker: 'you', ja: '給付金はいつもらえますか？', romaji: 'Kyuufukin wa itsu moraemasu ka?', en: 'When can I receive the grant money?' },
            ]
          }
        ]
      },
      {
        id: 'p4', text: 'Ask Kawasaki Ward Office about municipal baby gift programs', priority: 'high',
        moneyIds: ['m10', 'm15'],
        howTo: [
          'While at the ward office for boshi techo, ask about ALL available programs',
          'Some programs are not advertised publicly',
          'Ask at: こども家庭課, 子育て支援課, and welfare counter',
          'Programs may include: cash gifts, shopping vouchers, baby supplies'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Asking about programs',
            lines: [
              { speaker: 'you', ja: '出産に関して、川崎市で他にもらえる給付金やサービスはありますか？', romaji: 'Shussan ni kanshite, Kawasaki-shi de hoka ni moraeru kyuufukin ya saabisu wa arimasu ka?', en: 'Regarding childbirth, are there other grants or services available in Kawasaki?' },
              { speaker: 'you', ja: '新生児向けのお祝い金や物品提供はありますか？', romaji: 'Shinseiji muke no oiwaikin ya buppin teikyou wa arimasu ka?', en: 'Are there celebratory gifts or supplies for newborns?' },
            ]
          }
        ]
      },
      {
        id: 'p5', text: 'Ask about Kokuho Ryou Genmen (国保料減免 / kokuho ryou genmen) - insurance premium reduction', priority: 'high',
        moneyIds: ['m16'],
        howTo: [
          'If your household income is low, you may qualify for insurance premium reduction',
          '7-wari (70% off), 5-wari (50% off), or 2-wari (20% off)',
          'Applied automatically ONLY IF you file a tax return',
          'Even if income is zero, you MUST file a tax return!',
          'Ask at the insurance/pension counter (保険年金課)',
        ],
        phones: [
          { label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' }
        ],
        scripts: [
          {
            situation: 'Asking about insurance reduction',
            lines: [
              { speaker: 'you', ja: '国民健康保険料の減免について教えてください。', romaji: 'Kokumin kenkou hokenryou no genmen ni tsuite oshiete kudasai.', en: 'Please tell me about health insurance premium reductions.' },
              { speaker: 'you', ja: '確定申告はしています。世帯の収入は少ないです。', romaji: 'Kakutei shinkoku wa shiteimasu. Setai no shuunyuu wa sukunai desu.', en: 'I have filed my tax return. Our household income is low.' },
              { speaker: 'staff', ja: '減額の対象になるか確認しますね。', romaji: 'Gengaku no taishou ni naru ka kakunin shimasu ne.', en: 'Let me check if you qualify for a reduction.' },
            ]
          }
        ]
      },
      {
        id: 'p6', text: 'Apply for Sanzen Sango pension exemption (産前産後 / sanzen sango) ~¥66,000 saved', priority: 'high',
        moneyIds: ['m3'],
        howTo: [
          'Exemption from National Pension (国民年金) for 4 months around due date',
          'Saves ~¥16,500/month × 4 = ~¥66,000',
          'These months STILL COUNT as paid toward pension record!',
          'Apply at ward office pension counter OR Kawasaki Pension Office',
          'Bring: Boshi Techo (for due date proof), My Number card',
          'If Naomi is on employer pension (厚生年金), her company handles this'
        ],
        phones: [
          { label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' },
          { label: 'Kawasaki Pension Office', number: '044-233-0181' }
        ],
        scripts: [
          {
            situation: 'Applying for pension exemption',
            lines: [
              { speaker: 'you', ja: '産前産後の国民年金保険料免除を申請したいです。', romaji: 'Sanzen sango no kokumin nenkin hokenryou menjo wo shinsei shitai desu.', en: 'I\'d like to apply for the maternity pension premium exemption.' },
              { speaker: 'you', ja: '出産予定日は10月4日です。母子手帳を持っています。', romaji: 'Shussan yoteibi wa juu-gatsu yokka desu. Boshi techou wo motteimasu.', en: 'The due date is October 4th. I have the mother-child handbook.' },
              { speaker: 'staff', ja: 'マイナンバーカードはお持ちですか？', romaji: 'Mainanbaa kaado wa omochi desu ka?', en: 'Do you have your My Number card?' },
              { speaker: 'you', ja: 'はい、これです。', romaji: 'Hai, kore desu.', en: 'Yes, here it is.' },
            ]
          }
        ]
      },
      {
        id: 'p7', text: 'Ask about free dental checkup (妊婦歯科健診 / ninpu shika kenshin)', priority: 'medium',
        howTo: [
          'Kawasaki offers free dental checkup for pregnant women',
          'Important: Gum disease during pregnancy is linked to premature birth!',
          'Best time: 2nd trimester (安定期 / anteiki)',
          'Ask ward office for the voucher, then visit a participating dentist',
          'Any dental TREATMENT costs still count toward tax deduction'
        ],
        phones: [
          { label: 'Kawasaki Health Center', number: '044-201-3212' }
        ],
        scripts: [
          {
            situation: 'Asking about dental checkup',
            lines: [
              { speaker: 'you', ja: '妊婦歯科健診の受診票をいただけますか？', romaji: 'Ninpu shika kenshin no jushinpyou wo itadakemasu ka?', en: 'May I have the maternity dental checkup voucher?' },
              { speaker: 'you', ja: '対象の歯科医院のリストはありますか？', romaji: 'Taishou no shika iin no risuto wa arimasu ka?', en: 'Is there a list of participating dental clinics?' },
            ]
          }
        ]
      },
      {
        id: 'p8', text: 'Ask about postpartum care (産後ケア事業 / sango kea jigyou)', priority: 'medium',
        howTo: [
          'Kawasaki offers subsidized postpartum care programs',
          'Options: Facility stay (¥1,000-3,000/night), Day visits (free-cheap), Midwife home visits',
          'Covers: Mom recovery, breastfeeding support, baby care guidance',
          'Register early since spots may be limited',
          'Ask at ward office health center counter'
        ],
        phones: [
          { label: 'Kawasaki Health Center', number: '044-201-3212' }
        ],
        scripts: [
          {
            situation: 'Asking about postpartum care',
            lines: [
              { speaker: 'you', ja: '産後ケア事業について教えてください。', romaji: 'Sango kea jigyou ni tsuite oshiete kudasai.', en: 'Please tell me about the postpartum care program.' },
              { speaker: 'you', ja: '産後のショートステイやデイサービスはありますか？', romaji: 'Sango no shooto sutei ya dei saabisu wa arimasu ka?', en: 'Are there postpartum short-stay or day-care services?' },
              { speaker: 'you', ja: '予約はいつからできますか？', romaji: 'Yoyaku wa itsu kara dekimasu ka?', en: 'When can I start making reservations?' },
            ]
          }
        ]
      },
      {
        id: 'p9', text: 'Get info on public housing / danchi (公営住宅 / kouei juutaku) - you plan to move in June!', priority: 'high',
        howTo: [
          'You plan to move to danchi in June - start applying NOW!',
          'Three systems to check: City housing (市営), Prefectural (県営), UR housing',
          'Families with children get priority in some lotteries',
          'Income-based rent (lower income = lower rent)',
          'Apply 2-3 months before desired move-in',
          'Bring: Proof of income, residence cards, family register'
        ],
        phones: [
          { label: 'Kawasaki Housing', number: '044-200-2994' },
          { label: 'UR Housing', number: '0120-411-363' },
          { label: 'Kanagawa Prefecture Housing', number: '045-651-1854' }
        ],
        scripts: [
          {
            situation: 'Calling UR Housing',
            lines: [
              { speaker: 'you', ja: '川崎市内のUR住宅の空き状況を教えてください。', romaji: 'Kawasaki-shi nai no UR juutaku no aki joukyou wo oshiete kudasai.', en: 'Please tell me about available UR housing in Kawasaki City.' },
              { speaker: 'you', ja: '家族4人で入居したいです。6月頃に引っ越したいのですが。', romaji: 'Kazoku yonin de nyuukyo shitai desu. Roku-gatsu goro ni hikkoshi shitai no desu ga.', en: 'I\'d like housing for a family of 4. We want to move around June.' },
              { speaker: 'you', ja: '子供がいる場合の優先枠はありますか？', romaji: 'Kodomo ga iru baai no yuusen waku wa arimasu ka?', en: 'Is there a priority slot for families with children?' },
              { speaker: 'you', ja: '必要な書類を教えてください。', romaji: 'Hitsuyou na shorui wo oshiete kudasai.', en: 'What documents do I need?' },
            ]
          }
        ]
      },
      {
        id: 'p10', text: 'Check employer: birth bonus, Fuka Kyuufu (付加給付 / fuka kyuufu), company benefits', priority: 'high',
        moneyIds: ['m7', 'm11', 'm12', 'm13'],
        howTo: [
          'Lock Naomi route first: confirm she is 本人 (insured person) and list all childbirth/maternity forms with deadlines',
          'Then ask BOTH Shinji\'s and Naomi\'s HR departments for extra company-side benefits',
          'Things to ask about: Birth bonus (出産祝い金), Additional insurance benefit (付加給付)',
          'Also ask about: Maternity leave procedures, Childcare leave benefits',
          'Some companies have mutual aid programs with extra benefits',
          'The 付加給付 alone can be ¥10,000-90,000 extra - many people miss this!'
        ],
        phones: [],
        scripts: [
          {
            situation: 'Asking HR about birth benefits',
            lines: [
              { speaker: 'you', ja: '出産に関する会社の福利厚生について教えてください。', romaji: 'Shussan ni kansuru kaisha no fukuri kousei ni tsuite oshiete kudasai.', en: 'Please tell me about company benefits related to childbirth.' },
              { speaker: 'you', ja: '出産祝い金はありますか？', romaji: 'Shussan iwaikin wa arimasu ka?', en: 'Is there a birth celebration bonus?' },
              { speaker: 'you', ja: '健康保険組合に付加給付はありますか？', romaji: 'Kenkou hoken kumiai ni fuka kyuufu wa arimasu ka?', en: 'Does our health insurance association have additional benefits?' },
              { speaker: 'you', ja: '育児休業の手続きについても教えてください。', romaji: 'Ikuji kyuugyou no tetsuzuki ni tsuite mo oshiete kudasai.', en: 'Also, please tell me about childcare leave procedures.' },
            ]
          }
        ]
      },
      {
        id: 'p11', text: 'Start saving ALL medical receipts (including transport log)', priority: 'urgent',
        howTo: [
          'Get a folder or envelope specifically for medical receipts',
          'Save EVERYTHING: clinic co-pays, pharmacy receipts, hospital bills, dental receipts',
          'Start a transportation log in a notebook or on your phone:',
          'Format: Date | From → To | Amount | Purpose',
          'Example: 2026/03/15 | Home → Clinic | ¥480 | Prenatal checkup #2',
          'Even bus/train fares count! Taxi fare during labor counts too!',
          'Combine all family expenses (Shinji + Naomi + Ryzen + baby) for maximum deduction',
          'These are needed for 医療費控除 (iryouhi koujo) tax refund in Feb-March next year'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'p12', text: 'File tax return even if income is low (triggers auto reductions)', priority: 'high',
        howTo: [
          'Go to Kawasaki-Minami Tax Office during Feb-March filing period',
          'Or file online via e-Tax (www.e-tax.nta.go.jp)',
          'Even if income is ZERO, you MUST file!',
          'Filing triggers: Insurance premium reductions, Pension reductions, Welfare eligibility',
          'Without filing, the system doesn\'t know your income is low',
          'Bring: My Number card, income records, receipts, bank info for refund'
        ],
        phones: [
          { label: 'Kawasaki-Minami Tax Office', number: '044-222-7531' }
        ],
        scripts: [
          {
            situation: 'At the tax office',
            lines: [
              { speaker: 'you', ja: '確定申告をしたいのですが。', romaji: 'Kakutei shinkoku wo shitai no desu ga.', en: 'I\'d like to file a tax return.' },
              { speaker: 'you', ja: '医療費控除を申請したいです。', romaji: 'Iryouhi koujo wo shinsei shitai desu.', en: 'I\'d like to claim the medical expense deduction.' },
              { speaker: 'you', ja: '配偶者控除も申請できますか？', romaji: 'Haiguusha koujo mo shinsei dekimasu ka?', en: 'Can I also claim the spouse deduction?' },
            ]
          }
        ]
      },
      {
        id: 'p13', text: 'Register with Kawasaki International Association (044-435-7000)', priority: 'medium',
        howTo: [
          'Free services for foreign residents',
          'Offers: Free Japanese classes, translation help, tax filing support',
          'Location: Kawasaki Frontier Building 2F, near Kawasaki Station',
          'Helpful for navigating government paperwork'
        ],
        phones: [
          { label: 'Kawasaki International Association', number: '044-435-7000' }
        ],
        scripts: [
          {
            situation: 'Calling to register',
            lines: [
              { speaker: 'you', ja: '外国人向けのサービスについて教えてください。', romaji: 'Gaikokujin muke no saabisu ni tsuite oshiete kudasai.', en: 'Please tell me about services for foreign residents.' },
              { speaker: 'you', ja: '日本語教室はありますか？', romaji: 'Nihongo kyoushitsu wa arimasu ka?', en: 'Are there Japanese language classes?' },
            ]
          }
        ]
      },
      {
        id: 'p14', text: 'Apply for Gendogaku Tekiyou Ninteishou (限度額適用認定証 / gendogaku tekiyou ninteishou) - Limit Certificate', priority: 'high',
        howTo: [
          'This limits your out-of-pocket for hospital bills',
          'If delivery has complications (C-section, etc.), this is CRITICAL',
          'Get it BEFORE delivery day - present it at the hospital',
          'Apply at ward office insurance counter',
          'Bring: Health insurance card, My Number card'
        ],
        phones: [
          { label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' }
        ],
        scripts: [
          {
            situation: 'Applying for the certificate',
            lines: [
              { speaker: 'you', ja: '限度額適用認定証を申請したいのですが。', romaji: 'Gendogaku tekiyou ninteishou wo shinsei shitai no desu ga.', en: 'I\'d like to apply for the High-Cost Medical Care Limit Certificate.' },
              { speaker: 'you', ja: '出産の予定があるので、事前に取得しておきたいです。', romaji: 'Shussan no yotei ga aru node, jizen ni shutoku shite okitai desu.', en: 'I have a delivery coming up, so I\'d like to get it in advance.' },
            ]
          }
        ]
      },
      {
        id: 'p15', text: 'Order prenatal supplements from iHerb', priority: 'urgent',
        howTo: [
          'Go to iHerb.com - ships directly to Japan (5-10 day delivery)',
          'Recommended current 4-item order (see Health tab > Supplements for details):',
          '1. Thorne Basic Prenatal, 90 Capsules',
          '2. Nordic Naturals Prenatal DHA, 90 Soft Gels',
          '3. 21st Century Calcium Citrate + D3, 120 Tablets',
          '4. NOW Foods Choline & Inositol, 100 Capsules',
          'Optional later only if OB-GYN says yes: chlorella or extra Vitamin D3',
          'Current first order ~JPY 10,500-11,500 before shipping/tax fluctuations',
          'Search for promo codes before ordering!'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'p16', text: 'Show supplement list to OB-GYN for approval', priority: 'high',
        howTo: [
          'Bring the current 4-item supplement list to your next OB-GYN visit',
          'Ask the doctor to confirm the supplements and dosages are safe',
          'Ask whether the high-iron prenatal is okay for Naomi, or if timing/dose should change',
          'Some doctors may recommend adjustments based on blood test results',
          'Especially important: iron levels, vitamin D levels, calcium intake, and whether anything optional should stay off'
        ],
        phones: [],
        scripts: [
          {
            situation: 'Asking the doctor about supplements',
            lines: [
              { speaker: 'you', ja: 'このサプリメントリストを見てもらえますか？妊娠中に飲んでも大丈夫ですか？', romaji: 'Kono sapurimento risuto wo mite moraemasu ka? Ninshin-chuu ni nonde mo daijoubu desu ka?', en: 'Could you look at this supplement list? Is it safe to take during pregnancy?' },
              { speaker: 'you', ja: '量を変えた方がいいものはありますか？', romaji: 'Ryou wo kaeta hou ga ii mono wa arimasu ka?', en: 'Should I change the dosage of any of these?' },
            ]
          }
        ]
      },
    ]
  },
  {
    id: 'delivery',
    title: 'Before Delivery',
    icon: '🏥',
    color: '#6c5ce7',
    items: [
      {
        id: 'd1', text: 'Confirm hospital uses Chokusetsu Shiharai Seido (直接支払制度 / chokusetsu shiharai seido) for ¥500,000', priority: 'urgent',
        moneyIds: ['m4'],
        howTo: [
          'Ask at your delivery hospital during a prenatal visit',
          'The ¥500,000 childbirth allowance goes directly from insurance to hospital',
          'You only pay the difference (if any)',
          'If delivery costs LESS than ¥500,000, you get the refund!',
          'Sign the agreement form during pregnancy (not on delivery day)',
        ],
        phones: [],
        scripts: [
          {
            situation: 'Asking the hospital about direct payment',
            lines: [
              { speaker: 'you', ja: '出産育児一時金の直接支払制度は利用できますか？', romaji: 'Shussan ikuji ichijikin no chokusetsu shiharai seido wa riyou dekimasu ka?', en: 'Can I use the direct payment system for the childbirth lump-sum?' },
              { speaker: 'you', ja: '手続きの書類をいただけますか？', romaji: 'Tetsuzuki no shorui wo itadakemasu ka?', en: 'May I have the paperwork for this?' },
              { speaker: 'you', ja: 'この病院での出産費用はだいたいいくらですか？', romaji: 'Kono byouin de no shussan hiyou wa daitai ikura desu ka?', en: 'Approximately how much does delivery cost at this hospital?' },
            ]
          }
        ]
      },
      {
        id: 'd2', text: 'Prepare hospital bag', priority: 'high',
        howTo: [
          'Pack by Week 36 (be ready early!)',
          'For Naomi: Boshi Techo, insurance card, birth plan, comfortable clothes, nursing bra, toiletries, slippers, phone charger, snacks',
          'For baby: 1 outfit to go home in, blanket, diapers (hospital usually provides some)',
          'For Dada Shinji: Snacks, change of clothes, camera/phone, coins for vending machine',
          'Documents: Pre-filled birth registration form, seal (印鑑 / inkan), My Number cards',
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'd3', text: 'Pre-fill Shussei Todoke (出生届 / shussei todoke) - Birth Registration form', priority: 'medium',
        howTo: [
          'Get the form from ward office or hospital in advance',
          'Fill in everything you can before delivery (parents info, address)',
          'Baby name and birth details filled in after birth',
          'DEADLINE: 14 days after birth!',
          'Having it ready saves precious time after delivery'
        ],
        phones: [
          { label: 'Kawasaki Ward Office', number: '044-201-3113' }
        ],
        scripts: [
          {
            situation: 'Getting the form',
            lines: [
              { speaker: 'you', ja: '出生届の用紙を事前にいただけますか？', romaji: 'Shussei todoke no youshi wo jizen ni itadakemasu ka?', en: 'Can I get the birth registration form in advance?' },
            ]
          }
        ]
      },
      {
        id: 'd4', text: 'Decide on baby name', priority: 'high',
        howTo: [
          'Check the More tab > Baby Names for suggestions following the Ryzen formula',
          'Verify kanji are in the approved list (人名用漢字 or 常用漢字)',
          'Test the name in Filipino, Japanese, AND English',
          'Consider how it pairs with Ryzen (雷禅)',
          'You can check approved kanji at the ward office before submitting'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'd5', text: 'Prepare Jidou Teate (児童手当 / jidou teate) - Child Allowance application form', priority: 'high',
        howTo: [
          'Get the form from ward office in advance',
          '¥15,000/month (age 0-3) - this is the BIGGEST ongoing benefit',
          'MUST apply within 15 days of birth!',
          'Bring: Birth certificate, both parents\' My Number cards, bank account info, insurance card',
          'Best strategy: Submit on the SAME DAY as birth registration'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Getting the form in advance',
            lines: [
              { speaker: 'you', ja: '児童手当の申請書を事前にいただけますか？', romaji: 'Jidou teate no shinseisho wo jizen ni itadakemasu ka?', en: 'Can I get the child allowance application form in advance?' },
              { speaker: 'you', ja: '必要な書類のリストもお願いします。', romaji: 'Hitsuyou na shorui no risuto mo onegai shimasu.', en: 'Also, could I have a list of required documents?' },
            ]
          }
        ]
      },
      {
        id: 'd6', text: 'If employed: arrange maternity leave with employer', priority: 'high',
        moneyIds: ['m11', 'm12', 'm13'],
        howTo: [
          'For Naomi: Talk to HR at least 1 month before leave starts',
          'Maternity leave (産前産後休暇): 6 weeks before + 8 weeks after birth',
          'Childcare leave (育児休業): up to 2 years',
          'During leave: 67% salary (first 6 months), 50% after',
          'Social insurance premiums are EXEMPT during leave'
        ],
        phones: [],
        scripts: [
          {
            situation: 'Talking to HR about maternity leave',
            lines: [
              { speaker: 'you', ja: '産前産後休暇と育児休業について相談したいのですが。', romaji: 'Sanzen sango kyuuka to ikuji kyuugyou ni tsuite soudan shitai no desu ga.', en: 'I\'d like to discuss maternity leave and childcare leave.' },
              { speaker: 'you', ja: '出産予定日は10月4日です。', romaji: 'Shussan yoteibi wa juu-gatsu yokka desu.', en: 'My due date is October 4th.' },
              { speaker: 'you', ja: '育児休業給付金の手続きも教えてください。', romaji: 'Ikuji kyuugyou kyuufukin no tetsuzuki mo oshiete kudasai.', en: 'Please also tell me about childcare leave benefits procedures.' },
            ]
          }
        ]
      },
    ]
  },
  {
    id: 'birth',
    title: 'After Birth (14-Day Deadline!)',
    icon: '👶',
    color: '#e17055',
    items: [
      {
        id: 'b1', text: 'Submit Shussei Todoke (出生届 / shussei todoke) at Kawasaki Ward Office - WITHIN 14 DAYS', priority: 'urgent',
        howTo: [
          'DEADLINE: 14 days after birth! Do this FIRST',
          'Go to Kawasaki Ward Office こども家庭課',
          'Bring: Pre-filled birth registration form, birth certificate from hospital, Boshi Techo, seal (印鑑)',
          'While there, also apply for: Child Allowance, 2nd grant consultation, baby insurance',
          'Save time by doing everything at the same visit'
        ],
        phones: [
          { label: 'Kawasaki Ward Office', number: '044-201-3113' },
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Submitting birth registration',
            lines: [
              { speaker: 'you', ja: '出生届を提出したいのですが。', romaji: 'Shussei todoke wo teishutsu shitai no desu ga.', en: 'I\'d like to submit the birth registration.' },
              { speaker: 'you', ja: '合わせて児童手当の申請もしたいです。', romaji: 'Awasete jidou teate no shinsei mo shitai desu.', en: 'I\'d also like to apply for child allowance at the same time.' },
              { speaker: 'you', ja: '出産・子育て応援給付金の2回目の面談もお願いします。', romaji: 'Shussan kosodate ouen kyuufukin no nikai-me no mendan mo onegai shimasu.', en: 'Also, the 2nd consultation for the childbirth support grant, please.' },
              { speaker: 'you', ja: '赤ちゃんの健康保険の手続きもここでできますか？', romaji: 'Akachan no kenkou hoken no tetsuzuki mo koko de dekimasu ka?', en: 'Can I also do the baby\'s health insurance here?' },
            ]
          }
        ]
      },
      {
        id: 'b2', text: 'Complete 2nd consultation for Ouen Kyuufukin (応援給付金 / ouen kyuufukin) → receive ¥50,000', priority: 'urgent',
        moneyIds: ['m5'],
        howTo: [
          'This is the 2nd half of the ¥100,000 total grant',
          'Do at the SAME VISIT as birth registration',
          'Requires another brief consultation (面談) with support worker',
          'Bring: Boshi Techo, birth certificate, My Number card'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: []
      },
      {
        id: 'b3', text: 'Apply for Jidou Teate (児童手当 / jidou teate) - WITHIN 15 DAYS (¥15,000/month!)', priority: 'urgent',
        moneyIds: ['m8'],
        howTo: [
          'DEADLINE: Within 15 days of birth! Late = lost months!',
          'Apply at ward office こども家庭課',
          'Bring: Birth certificate, both parents\' My Number, bank account info, insurance card',
          '¥15,000/month for ages 0-3, ¥10,000/month for ages 3-18',
          'For 2 kids (Ryzen + Baby): ¥25,000-30,000/month!',
          'Payment: Every 2 months into your bank account'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Applying for child allowance',
            lines: [
              { speaker: 'you', ja: '児童手当の認定請求書を提出したいです。', romaji: 'Jidou teate no nintei seikyuusho wo teishutsu shitai desu.', en: 'I\'d like to submit the child allowance application.' },
              { speaker: 'you', ja: '上の子も受給していますが、変更届は必要ですか？', romaji: 'Ue no ko mo jukyuu shiteimasu ga, henkou todoke wa hitsuyou desu ka?', en: 'My older child is also receiving it. Do I need to file a change notice?' },
            ]
          }
        ]
      },
      {
        id: 'b4', text: "Get baby's health insurance card", priority: 'urgent',
        howTo: [
          'Add baby to either National Health Insurance (国保) or employer insurance (社保)',
          'For 国保: Apply at ward office insurance counter',
          'For 社保: Through employer HR',
          'Bring: Birth certificate, parent\'s insurance card, My Number',
          'Baby needs insurance card before getting medical subsidy'
        ],
        phones: [
          { label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' }
        ],
        scripts: [
          {
            situation: 'Adding baby to insurance',
            lines: [
              { speaker: 'you', ja: '新生児を国民健康保険に加入させたいのですが。', romaji: 'Shinseiji wo kokumin kenkou hoken ni kanyuu sasetai no desu ga.', en: 'I\'d like to enroll my newborn in the national health insurance.' },
              { speaker: 'you', ja: '出生届は提出済みです。', romaji: 'Shussei todoke wa teishutsu-zumi desu.', en: 'I\'ve already submitted the birth registration.' },
            ]
          }
        ]
      },
      {
        id: 'b5', text: 'Apply for Nyuuyouji Iryouhi Josei (乳幼児医療費助成 / nyuuyouji iryouhi josei) - Child Medical Subsidy', priority: 'urgent',
        moneyIds: ['m14'],
        howTo: [
          'Free medical care for children until age 15 in Kawasaki!',
          'Apply AFTER getting baby\'s health insurance card',
          'Apply at ward office こども家庭課',
          'Covers: Doctor visits, hospitalization, prescriptions',
          'Babies get sick A LOT - this saves massive amounts'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: [
          {
            situation: 'Applying for medical subsidy',
            lines: [
              { speaker: 'you', ja: '乳幼児医療費助成の申請をしたいのですが。', romaji: 'Nyuuyouji iryouhi josei no shinsei wo shitai no desu ga.', en: 'I\'d like to apply for the child medical expense subsidy.' },
              { speaker: 'you', ja: '赤ちゃんの保険証は持っています。', romaji: 'Akachan no hokenshou wa motteimasu.', en: 'I have the baby\'s insurance card.' },
            ]
          }
        ]
      },
      {
        id: 'b6', text: 'If delivery < ¥500,000 → apply for refund of difference', priority: 'high',
        moneyIds: ['m6'],
        howTo: [
          'Check your hospital invoice after delivery',
          'If total cost was LESS than ¥500,000, get the difference refunded',
          'Example: Delivery cost ¥400,000 → Refund ¥100,000!',
          'For 国保: Apply at ward office',
          'For 社保: Apply through employer insurance',
          'Bring: Hospital invoice, Direct Payment agreement copy'
        ],
        phones: [
          { label: 'Kawasaki Ward 保険年金課 (for 国保)', number: '044-201-3151' }
        ],
        scripts: [
          {
            situation: 'Applying for delivery refund',
            lines: [
              { speaker: 'you', ja: '出産育児一時金の差額を申請したいです。', romaji: 'Shussan ikuji ichijikin no sagaku wo shinsei shitai desu.', en: 'I\'d like to apply for the childbirth allowance difference refund.' },
              { speaker: 'you', ja: '出産費用は○○円でした。', romaji: 'Shussan hiyou wa [amount] en deshita.', en: 'The delivery cost was [amount] yen.' },
            ]
          }
        ]
      },
      {
        id: 'b7', text: 'Check Fuka Kyuufu (付加給付 / fuka kyuufu) with employer insurance', priority: 'high',
        moneyIds: ['m7'],
        howTo: [
          'Some health insurance associations pay EXTRA on top of ¥500,000',
          'Amount varies: ¥10,000-90,000',
          'Check BOTH Shinji\'s and Naomi\'s employers',
          'Just ask HR - this is free money many people miss!'
        ],
        phones: [],
        scripts: [
          {
            situation: 'Asking HR about additional benefits',
            lines: [
              { speaker: 'you', ja: '出産育児一時金の付加給付はありますか？', romaji: 'Shussan ikuji ichijikin no fuka kyuufu wa arimasu ka?', en: 'Is there an additional birth benefit from our health insurance?' },
            ]
          }
        ]
      },
      {
        id: 'b8', text: 'Register baby at Philippine Consulate Yokohama (045-681-5006) for dual citizenship', priority: 'medium',
        howTo: [
          'Register baby\'s birth at the Philippine Consulate for dual citizenship',
          'Yokohama consulate is closer than Tokyo embassy',
          'Bring: Birth certificate (Japanese), parents\' passports, marriage certificate',
          'Baby can hold both Filipino and Japanese citizenship',
          'Japan technically requires choosing at 22 but rarely enforced'
        ],
        phones: [
          { label: 'Phil. Consulate Yokohama', number: '045-681-5006' },
          { label: 'Phil. Embassy Tokyo', number: '03-5562-1600' }
        ],
        scripts: [
          {
            situation: 'Calling the consulate',
            lines: [
              { speaker: 'you', ja: '', romaji: '', en: 'Hello, I\'d like to register my baby\'s birth for Philippine citizenship. What documents do I need to bring?' },
            ]
          }
        ]
      },
    ]
  },
  {
    id: 'ongoing',
    title: 'Ongoing / Annual',
    icon: '📋',
    color: '#00b894',
    items: [
      {
        id: 'o1', text: 'Keep all medical receipts throughout the year', priority: 'high',
        howTo: [
          'Collect ALL receipts: doctor visits, pharmacy, dental, hospital',
          'Include transportation costs to medical facilities',
          'Save receipts for: Shinji, Naomi, Ryzen, AND baby',
          'Organize by month for easy filing later',
          'Goal: Total over ¥100,000 for tax deduction (pregnancy year will easily exceed this!)'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'o2', text: 'Maintain transportation log to medical appointments', priority: 'medium',
        howTo: [
          'Keep a simple log: Date | Route | Fare | Purpose',
          'Bus, train, even taxi fares count',
          'Taxi during labor counts!',
          'Keep it in a notebook or phone notes app',
          'This goes into your tax return for 医療費控除'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'o3', text: 'Do Furusato Nouzei (ふるさと納税 / furusato nouzei) before year end (free food/goods!)', priority: 'medium',
        howTo: [
          'Donate to rural municipalities, get return gifts (rice, meat, fruit!)',
          'You pay ¥2,000 out of pocket, rest is a tax credit',
          'Example: Donate ¥30,000 = ~¥9,000 worth of goods for ¥2,000',
          'Use online calculator to find optimal donation amount based on income',
          'Popular sites: Furusato Choice, Rakuten Furusato, SatoFull',
          'Strategy: Get rice and baby supplies to save on groceries!'
        ],
        phones: [],
        scripts: []
      },
      {
        id: 'o4', text: 'File Kakutei Shinkoku (確定申告 / kakutei shinkoku) in Feb-March with Iryouhi Koujo (医療費控除 / iryouhi koujo)', priority: 'high',
        moneyIds: ['m9'],
        howTo: [
          'Filing period: February 16 - March 15 each year',
          'File at Kawasaki-Minami Tax Office or online via e-Tax',
          'Bring: All medical receipts, transport log, My Number card, bank info',
          'Combine ALL family medical expenses in one return',
          'Formula: (Total medical - ¥100,000) × tax rate = refund',
          'Pregnancy year will likely have ¥300,000-500,000+ in medical costs'
        ],
        phones: [
          { label: 'Kawasaki-Minami Tax Office', number: '044-222-7531' }
        ],
        scripts: [
          {
            situation: 'At the tax office',
            lines: [
              { speaker: 'you', ja: '医療費控除の確定申告をしたいのですが。', romaji: 'Iryouhi koujo no kakutei shinkoku wo shitai no desu ga.', en: 'I\'d like to file a tax return for medical expense deduction.' },
              { speaker: 'you', ja: '領収書と交通費の記録を持ってきました。', romaji: 'Ryoushuusho to koutsuuhi no kiroku wo motte kimashita.', en: 'I\'ve brought my receipts and transportation records.' },
            ]
          }
        ]
      },
      {
        id: 'o5', text: 'When child turns 3 → enroll in free preschool/kindergarten', priority: 'high',
        howTo: [
          'Age 3-5: ALL preschool/kindergarten is FREE (2019 reform)',
          'Age 0-2: Free for tax-exempt households, half-price for 2nd child',
          'Start looking at options 6-12 months before enrollment',
          'Types: Hoikuen (保育園) for working parents, Youchien (幼稚園) for everyone',
          'Apply through ward office child support section'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }
        ],
        scripts: []
      },
      {
        id: 'o6', text: 'When Ryzen enters school → apply for Shuugaku Enjo (就学援助 / shuugaku enjo) if eligible', priority: 'high',
        howTo: [
          'Income-based assistance for school expenses',
          'Covers: Supplies, lunch, field trips, PE uniform, swimming gear, dental/eye treatment',
          'Income threshold is relatively generous - check if you qualify',
          'Apply through the school or Kawasaki education department',
          'Many qualifying families MISS this because they don\'t know about it!'
        ],
        phones: [],
        scripts: [
          {
            situation: 'Asking at school',
            lines: [
              { speaker: 'you', ja: '就学援助の申請について教えてください。', romaji: 'Shuugaku enjo no shinsei ni tsuite oshiete kudasai.', en: 'Please tell me about the school expense assistance application.' },
              { speaker: 'you', ja: '対象になるか確認したいのですが。', romaji: 'Taishou ni naru ka kakunin shitai no desu ga.', en: 'I\'d like to check if we qualify.' },
            ]
          }
        ]
      },
      {
        id: 'o7', text: 'Check Kawasaki Ward Office annually for new programs', priority: 'medium',
        moneyIds: ['m10', 'm15'],
        howTo: [
          'Visit or call the ward office once a year to check for new programs',
          'Japan frequently adds new family support programs',
          'Recent addition (2023): ¥100,000 birth support grant',
          'Recent addition (2024): Child allowance expanded to age 18, income limits removed',
          'Some programs are not advertised - you have to ASK!'
        ],
        phones: [
          { label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' },
          { label: 'Kawasaki Ward General', number: '044-201-3113' }
        ],
        scripts: [
          {
            situation: 'Annual check-in call',
            lines: [
              { speaker: 'you', ja: '子育て家庭向けの新しい制度やサービスはありますか？', romaji: 'Kosodate katei muke no atarashii seido ya saabisu wa arimasu ka?', en: 'Are there any new programs or services for families with children?' },
              { speaker: 'you', ja: '今年度変わった点があれば教えてください。', romaji: 'Konnendo kawatta ten ga areba oshiete kudasai.', en: 'Please tell me if anything has changed this year.' },
            ]
          }
        ]
      },
    ]
  }
]

export const supplements = [
  {
    id: 'prenatal',
    name: 'Prenatal Multivitamin',
    product: 'Thorne, Basic Prenatal, 90 Capsules',
    when: 'Split across breakfast, dinner, and bedtime snack',
    why: 'Folate + iron + iodine + B-vitamin foundation',
    icon: '💊',
    timesPerDay: 3,
    defaultTimes: ['08:00', '20:30', '22:00'],
    bottleSize: 90,
    perDose: 1,
    price: 4149,
    note: 'Take 1 capsule at a time with real food or a light snack until all 3 capsules are finished for the day. Keep each prenatal dose 2+ hours away from calcium.',
    dosageInfo: '3 capsules daily total = 1 capsule at breakfast + 1 capsule with dinner + 1 capsule before bed. One bottle still lasts about 30 days.',
    warnings: 'Contains high iron. Keep each prenatal capsule 2+ hours away from calcium and do not add extra iron unless advised by OB-GYN.',
    explanation: 'Ang prenatal multivitamin ang base ng lahat. Ang Thorne version ay may methylated folate (L-5-MTHF) na mas mabilis ma-absorb kumpara sa regular folic acid. May iron din para sa blood production (dadami ang blood mo ng 50% during pregnancy!). Since 3 capsules per day siya, puwedeng split into 3 smaller doses para mas gentle sa tiyan ni Naomi.',
    budgetAlt: 'Nature Made Prenatal Multi + DHA (¥1,500, 90 days supply, 1/day) — same core nutrients, 8x cheaper per day!'
  },
  {
    id: 'dha',
    name: 'DHA (Omega-3)',
    product: 'Nordic Naturals, Prenatal DHA, 90 Soft Gels',
    when: 'Dinner with food (needs fat)',
    why: '#1 brain-building nutrient for baby',
    icon: '🧠',
    timesPerDay: 1,
    defaultTimes: ['20:30'],
    bottleSize: 90,
    perDose: 2,
    price: 3256,
    note: 'Take 2 softgels with food containing fat for best absorption. Naomi can move the dinner time in Peggy if needed.',
    dosageInfo: '2 softgels daily with dinner or another fatty meal. This gives about 480mg DHA + 205mg EPA total.',
    warnings: 'Safe to take with prenatal. Best absorbed with fatty food. Some people get fishy burps - take with food or freeze the capsule.',
    explanation: 'DHA ang pinaka-importante para sa brain ng baby! 60% ng brain ay fat, at DHA ang primary building block. Studies show na mga baby ng mga nanay na nag-supplement ng DHA may higher IQ, better attention span, at better vision. Nordic Naturals ang gold standard for fish oil quality.',
    budgetAlt: null
  },
  {
    id: 'calcium',
    name: 'Calcium Citrate + D3 (No Zinc)',
    product: '21st Century, Calcium Citrate + D3, 120 Tablets',
    when: 'Lunch AND mid-afternoon (split dose, 2+ hours away from prenatal)',
    why: 'Bone support without stacking extra zinc',
    icon: '🦴',
    timesPerDay: 2,
    defaultTimes: ['12:00', '15:00'],
    bottleSize: 120,
    perDose: 1,
    price: 1599,
    note: 'Prefer calcium-only or calcium + D3 formula without added zinc. Keep 2+ hours away from prenatal iron.',
    dosageInfo: '1 tablet at LUNCH + 1 tablet at MID-AFTERNOON. Adjust total amount based on dietary calcium and OB-GYN advice.',
    warnings: 'HUWAG sabayan ng Prenatal vitamin! Calcium and iron compete for absorption. Keep at least 2 hours apart.',
    explanation: 'Goal is to close the calcium gap from food, not mega-dose. If food calcium is already high, lower supplemental dose may be enough.',
    budgetAlt: null
  },
  {
    id: 'chlorella',
    name: 'Chlorella',
    product: 'Sun Chlorella, 500 mg, 120 Tablets',
    when: 'Morning with breakfast',
    why: 'Optional add-on only, not part of the core stack',
    icon: '🌿',
    timesPerDay: 1,
    defaultTimes: ['08:00'],
    bottleSize: 120,
    perDose: 3,
    price: 4872,
    note: 'Optional only. Core stack first: prenatal, DHA, calcium, choline. If ever used later, start with 1 tablet and increase slowly.',
    dosageInfo: 'Week 1: Start with 1 tablet. Week 2: Increase to 2. Week 3+: Full dose of 3 tablets/day. 120 tabs = 40 days.',
    warnings: 'Optional only. Start SLOWLY and stop if may stomach upset. Use trusted brands and clear with OB-GYN.',
    explanation: 'Optional add-on ito, hindi core requirement. If okay ang tiyan and approved by OB-GYN, puwedeng ituloy. 120 tablets ÷ 3/day = 40 days supply.',
    budgetAlt: 'NOW Foods Organic Chlorella 200 Tablets (¥1,500-2,000, 66 days supply) — mas maraming tablets, mas mura, mas matagal!'
  },
  {
    id: 'choline',
    name: 'Choline (Bitartrate)',
    product: 'NOW Foods, Choline & Inositol, 500 mg, 100 Capsules',
    when: 'Morning with breakfast',
    why: 'Brain-development support to help reach daily choline target',
    icon: '⚡',
    timesPerDay: 1,
    defaultTimes: ['08:00'],
    bottleSize: 100,
    perDose: 1,
    price: 1450,
    note: 'Use plain choline form. Aim total intake (food + supplement) near pregnancy target, not megadoses.',
    dosageInfo: '1 capsule daily with food. Count egg/food intake first, then top up only what is missing.',
    warnings: 'Food-first approach is best. No need to stack multiple choline products.',
    explanation: 'Most practical approach: food + simple choline top-up. Eggs, fish, meat, and dairy already contribute a lot.',
    budgetAlt: 'Phosphatidylcholine (lecithin) capsules are another plain option if better tolerated.'
  },
  {
    id: 'vitd',
    name: 'Vitamin D3 (Optional - Lab Guided)',
    product: 'Solgar, Vitamin D3, 55 mcg (2,200 IU), 100 Vegetable Capsules',
    when: 'Lunch with food (only if advised)',
    why: 'Use when deficiency risk is confirmed',
    icon: '☀️',
    timesPerDay: 1,
    defaultTimes: ['12:00'],
    bottleSize: 100,
    perDose: 1,
    price: 1453,
    note: 'Many prenatals already include vitamin D. Add extra only if OB-GYN/labs say needed.',
    dosageInfo: 'Default: OFF. If advised, take 1 capsule with a fatty meal.',
    warnings: 'Do not stack blindly with other vitamin D products. Keep total intake within OB-guided target.',
    explanation: 'Vitamin D matters, but routine extra high-dose D3 is not required for everyone. Lab-guided use is safer.',
    budgetAlt: 'NOW Foods Vitamin D-3 2,000 IU, 120 Softgels (¥800-1,000, 120 days) — 20 more days supply at mas mura!'
  }
]

export const moneyTracker = [
  {
    id: 'm1',
    label: 'Pregnancy Support Benefit (妊婦のための支援給付 / first payment)',
    amount: 50000,
    phase: 'pregnancy',
    howTo: 'Complete a consultation (面談 / mendan) with a support worker at Kawasaki Ward Office when you register the pregnancy. The current framework transitioned from 出産・子育て応援給付金 to 妊婦のための支援給付 in 2025. First payment is ¥50,000 at pregnancy registration, with a second payment after birth under the same support framework.',
    where: 'Kawasaki Ward Office (川崎区役所 / kawasaki kuyakusho)\n〒210-8570 川崎市川崎区東田町8\nPhone: 044-201-3214 (こども家庭課 / kodomo katei ka)',
    bring: 'Pregnancy confirmation from clinic, residence card (在留カード / zairyuu kaado), health insurance card (保険証 / hokenshou), My Number card',
    deadline: 'When registering pregnancy - do it at the SAME VISIT as getting boshi techo',
    tip: 'DO NOT SKIP THE CONSULTATION. No consultation = no money. Kawasaki gives this as cash or vouchers - ask which one. Get this at the same visit as your boshi techo pickup to save a trip.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: 妊婦のための支援給付', url: 'https://www.city.kawasaki.jp/450/page/0000146038.html' }
    ],
    phones: [{ label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }]
  },
  {
    id: 'm2',
    label: 'Prenatal Checkup Vouchers (妊婦健診受診票 / ninpu kenshin jushinpyou)',
    amount: 135000,
    phase: 'pregnancy',
    howTo: 'You receive 14 checkup vouchers when you get the Boshi Techo (母子健康手帳). Each voucher covers ¥5,000-10,000+ per OB-GYN visit. Just present the voucher at each prenatal checkup and it reduces the bill.',
    where: 'Kawasaki Ward Office - received together with boshi techo\n川崎区役所 こども家庭課: 044-201-3214',
    bring: 'Same visit as boshi techo pickup',
    deadline: 'Get early in pregnancy to use all 14 vouchers. The earlier you register, the more vouchers you use.',
    tip: 'KEEP ALL RECEIPTS for amounts NOT covered by vouchers - these count toward 医療費控除 (iryouhi koujo) tax deduction at year end! Kawasaki increased support to around ¥135,000 total subsidy for eligible checkup tickets, and some visits still have co-pay depending on clinic. Ask at ward office for current ticket set details.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: 妊婦健康診査費助成 (up to ¥135,000)', url: 'https://www.city.kawasaki.jp/450/page/0000145999.html' }
    ],
    phones: [{ label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }]
  },
  {
    id: 'm3',
    label: 'Pension Exemption (産前産後免除 / sanzen sango menjo)',
    amount: 66000,
    phase: 'pregnancy',
    howTo: 'Apply for exemption from National Pension (国民年金 / kokumin nenkin) premiums for 4 months around the due date. Save ~¥16,500/month x 4 = ~¥66,000. These months STILL COUNT as paid toward pension record - free money basically.',
    where: 'Kawasaki Ward Office pension counter (年金課 / nenkin ka)\nPhone: 044-201-3151\nOr Kawasaki Pension Office (川崎年金事務所): 044-233-0181\n〒210-0005 川崎市川崎区宮前町12-17',
    bring: 'Boshi Techo (for due date proof), My Number card, residence card',
    deadline: 'Apply during pregnancy, before due date month. Don\'t wait!',
    tip: 'They say "automatic" pero kailangan mag-apply! If Naomi is on employer pension (厚生年金 / kousei nenkin), different rules - ask her HR department.',
    phones: [
      { label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' },
      { label: 'Kawasaki Pension Office', number: '044-233-0181' }
    ]
  },
  {
    id: 'm4',
    label: 'Childbirth Allowance (出産育児一時金 / shussan ikuji ichijikin)',
    amount: 500000,
    phase: 'birth',
    howTo: 'Use the Direct Payment System (直接支払制度 / chokusetsu shiharai seido) through the hospital. The ¥500,000 goes straight from insurance to the hospital. You only pay the difference (if any). If delivery costs LESS than ¥500,000, you get the difference BACK!',
    where: 'Arranged at your delivery hospital/clinic. For refund: Health insurance office.\nIf Naomi is on Employer Insurance (社保 / shaho): ask Naomi employer HR + insurer first.\nIf National Health Insurance (国保 / kokuho): Kawasaki Ward Office 044-201-3151',
    bring: 'Health insurance card. Sign the Direct Payment agreement form at the hospital during pregnancy.',
    deadline: 'Arrange BEFORE delivery day. Ask hospital about it at your first or second visit.',
    tip: 'Budget hospitals in Kawasaki area: ¥350,000-450,000 = potential refund of ¥50,000-150,000! Weekday daytime delivery is cheapest. Ask multiple hospitals for price lists - they vary a LOT. Midwife birth centers (助産院 / josanin) are often cheapest.',
    phones: [{ label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' }]
  },
  {
    id: 'm5',
    label: 'Birth Support Benefit (妊婦のための支援給付 / second payment)',
    amount: 50000,
    phase: 'birth',
    howTo: 'Complete the post-birth consultation (面談 / mendan) with a support worker AFTER the baby is born. This is the second payment in the 妊婦のための支援給付 framework (transitioned from the older 出産・子育て応援給付金 naming).',
    where: 'Kawasaki Ward Office (川崎区役所)\nこども家庭課: 044-201-3214',
    bring: 'Boshi Techo, birth certificate, My Number card',
    deadline: 'After submitting birth registration (出生届 / shussei todoke)',
    tip: 'Do this at the SAME TIME as registering the birth to save a trip. Same rules as pregnancy grant - requires consultation.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: 妊婦のための支援給付', url: 'https://www.city.kawasaki.jp/450/page/0000146038.html' }
    ],
    phones: [{ label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }]
  },
  {
    id: 'm6',
    label: 'Delivery Refund (if cost < ¥500k)',
    amount: 100000,
    phase: 'birth',
    howTo: 'If your delivery cost less than ¥500,000, apply to get the difference refunded. Example: delivery cost ¥400,000 → get ¥100,000 back. This is separate from the lump-sum - it\'s the leftovers.',
    where: 'Health insurance office:\n社保 (Employer): Naomi employer HR or insurance association (健保組合 / kenpokumiai)\n国保 (National): Kawasaki Ward Office 044-201-3151',
    bring: 'Hospital invoice/receipt showing actual delivery cost, copy of Direct Payment agreement form',
    deadline: '2 years from delivery date, pero do it within 1 month for fastest payment',
    tip: 'Amount shown (¥100,000) is estimate. Actual refund depends on your hospital\'s pricing. Weekday daytime = cheapest. Ask hospitals in Kawasaki for their price list before deciding where to deliver!',
    phones: [{ label: 'Kawasaki Ward 保険年金課', number: '044-201-3151' }]
  },
  {
    id: 'm7',
    label: 'Employer Additional Benefit (付加給付 / fuka kyuufu)',
    amount: 50000,
    phase: 'birth',
    howTo: 'Some employer health insurance associations (健康保険組合 / kenkou hoken kumiai) pay EXTRA money on top of the standard ¥500,000. Amount varies: ¥10,000-90,000. For childbirth-claim-linked add-ons, confirm Naomi insurer route first. Also ask Shinji side for separate company birth bonus/family allowance.',
    where: 'Naomi employer HR + Naomi health insurance association (健保組合 / kenpokumiai)\nShinji employer HR (for separate company-side bonus checks)',
    bring: 'Just ask them! They will tell you the process.',
    deadline: 'Ask early during pregnancy so you know what to expect',
    tip: 'Only for employer insurance (社会保険 / shakai hoken), NOT National Health Insurance (国保 / kokuho). If coverage route is unclear, mark as needs HR/insurer confirmation before filing.',
    phones: []
  },
  {
    id: 'm8',
    label: 'Child Allowance Year 1 (児童手当 / jidou teate)',
    amount: 180000,
    phase: 'ongoing',
    howTo: 'Apply for ¥15,000/month (age 0-3). Since 2024 reform: NO income limits - everyone gets it! Extended to age 18. Payment every 2 months. Over 18 years per child: ¥2,340,000. For 2 kids (Ryzen + Baby): ¥25,000-30,000/month!',
    where: 'Kawasaki Ward Office (川崎区役所)\nこども家庭課: 044-201-3214',
    bring: 'Birth certificate, both parents\' My Number cards, bank account info (for deposits), health insurance card',
    deadline: 'WITHIN 15 DAYS of birth! Late = lost months forever. Huwag mag-late! Apply the SAME DAY or day after birth registration.',
    tip: 'This is the BIGGEST ongoing benefit. ¥15,000/month for 3 years + ¥10,000/month until 18. For 2 kids that\'s ¥4,680,000 total over 18 years. If you have a 3rd child: ¥30,000/month = ¥6,480,000! Amount shown is Year 1 only (¥15,000 x 12).',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Children and Families Agency: Child Allowance Guide', url: 'https://www.cfa.go.jp/seisaku/teate-seido/annai' },
      { label: 'Children and Families Agency: Child Allowance Reform Summary', url: 'https://www.cfa.go.jp/seisaku/teate-seido/mottoouen' },
      { label: 'Kawasaki: 児童手当制度改正', url: 'https://www.city.kawasaki.jp/450/page/0000169414.html' }
    ],
    phones: [{ label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }]
  },
  {
    id: 'm9',
    label: 'Tax Refund (医療費控除 / iryouhi koujo)',
    amount: 40000,
    phase: 'ongoing',
    howTo: 'File Kakutei Shinkoku (確定申告 / kakutei shinkoku) tax return in Feb-March. Claim ALL medical expenses: checkup co-pays, delivery costs, hospital meals, dental, prescriptions, bus/train fare to hospitals. Formula: (total medical - ¥100,000) x tax rate = refund.',
    where: 'Kawasaki-Minami Tax Office (川崎南税務署 / kawasaki minami zeimusho)\n〒210-0006 川崎市川崎区榎町3-18\nPhone: 044-222-7531\nOr online via e-Tax (www.e-tax.nta.go.jp)',
    bring: 'ALL medical receipts, transportation log, My Number card, bank account info for refund deposit',
    deadline: 'February-March filing period (for previous year\'s expenses)',
    tip: 'I-save LAHAT ng resibo! Keep a transport log: date, route, fare, purpose. Even taxi fare during labor counts! Combine all family expenses (Shinji + Naomi + Ryzen + baby) in one return for bigger deduction. Even with low income, FILE - it triggers automatic insurance premium reductions!',
    phones: [{ label: 'Kawasaki-Minami Tax Office', number: '044-222-7531' }]
  },
  {
    id: 'm10',
    label: 'Municipal Baby Gift (自治体お祝い / jichitai oiwai)',
    amount: 50000,
    phase: 'birth',
    howTo: 'Many cities give cash gifts (出産祝い金 / shussan iwaikin), shopping vouchers, baby goods packages, rice, or point card credits. Kawasaki has various programs - the only way to know the current offerings is to ASK.',
    where: 'Kawasaki Ward Office - child/family support counter\nこども家庭課: 044-201-3214\nAlso check: 子育て支援課 (kosodate shien ka)',
    bring: 'Boshi Techo, birth certificate',
    deadline: 'Usually within a few months of birth - ask for specific deadlines',
    tip: 'Wag mahiya! Some programs are not advertised. Go through EVERY counter at Kawasaki Ward Office and ask what\'s available for families with a new baby. Amount varies wildly: ¥0 to ¥100,000+. The amount shown (¥50,000) is an estimate.',
    phones: [{ label: 'Kawasaki Ward こども家庭課', number: '044-201-3214' }]
  },
  {
    id: 'm11',
    label: 'Maternity Leave Allowance (shussan teatekin)',
    amount: 430000,
    phase: 'birth',
    howTo: 'If enrolled in employee health insurance, apply for maternity leave allowance through employer and insurer. Coverage is generally 42 days before birth to 56 days after birth (98 days total for single birth), and payment is about 2/3 of standard salary.',
    where: 'Your employer HR and health insurance association. Not paid under National Health Insurance.',
    bring: 'Doctor certificate form, leave dates, bank account details, employer paperwork.',
    deadline: 'Apply after leave starts; submit as soon as HR gives forms.',
    tip: 'One of the biggest pregnancy-period cash supports for employed moms. Amount shown is an estimate and varies by salary and leave dates.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kyokai Kenpo: 出産手当金', url: 'https://www.kyoukaikenpo.or.jp/g3/sb3270/r148/' }
    ],
    phones: []
  },
  {
    id: 'm12',
    label: 'Childcare Leave Benefit (ikuji kyuugyou kyuufu)',
    amount: 1200000,
    phase: 'ongoing',
    howTo: 'If covered by employment insurance and eligible for childcare leave, apply through employer plus Hello Work. Standard payout is 67% of wage for the first 180 days, then 50% after that. New add-on support (around 13%) can apply for specific postpartum leave periods if conditions are met.',
    where: 'Employer HR and Hello Work',
    bring: 'Employment insurance details, leave schedule, wage records, and HR application forms.',
    deadline: 'Start paperwork before childcare leave begins to avoid payout delays.',
    tip: 'For many families, this is the largest first-year childcare cash support after childbirth.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'MHLW: 育児休業給付', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000135090_00001.html' },
      { label: 'MHLW Leaflet (R7)', url: 'https://www.mhlw.go.jp/content/11600000/001421353.pdf' }
    ],
    phones: []
  },
  {
    id: 'm13',
    label: 'Social Insurance Exemption During Childcare Leave',
    amount: 200000,
    phase: 'ongoing',
    howTo: 'During approved childcare leave, employee social insurance premiums can be exempted (health insurance plus pension). This is handled via employer payroll and insurance procedures.',
    where: 'Employer HR or payroll team',
    bring: 'Childcare leave approval records and HR forms.',
    deadline: 'Confirm exemption setup before first leave month payroll closes.',
    tip: 'This is savings (money not paid), not a separate cash transfer. Amount shown is an estimate.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'MHLW Leaflet (R7)', url: 'https://www.mhlw.go.jp/content/11600000/001421353.pdf' }
    ],
    phones: []
  },
  {
    id: 'm14',
    label: 'Kawasaki Child Medical Subsidy',
    amount: 80000,
    phase: 'ongoing',
    howTo: 'After birth registration and baby insurance enrollment, apply for child medical subsidy at the ward office. This reduces out-of-pocket medical costs for pediatric visits, prescriptions, and treatment.',
    where: 'Kawasaki Ward Office child and family counter',
    bring: 'Baby health insurance card, parent ID, residence details, and account info if requested.',
    deadline: 'Apply soon after baby insurance card is issued.',
    tip: 'Kawasaki announced phased expansion toward high-school-age support. Check current age range and co-pay rules at application time.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: こども医療費助成拡充', url: 'https://www.city.kawasaki.jp/450/page/0000181307.html' }
    ],
    phones: [{ label: 'Kawasaki Ward child and family section', number: '044-201-3214' }]
  },
  {
    id: 'm15',
    label: 'Kawasaki Cost-of-Living Child Support',
    amount: 20000,
    phase: 'ongoing',
    howTo: 'Kawasaki implemented a one-time support payment for child-raising households at JPY 20,000 per eligible child under the published 2025 program.',
    where: 'Kawasaki City official child policy program page and ward guidance',
    bring: 'Application or confirmation documents based on Kawasaki rules (if required).',
    deadline: 'Time-limited program. Example: the 2025 program had a specific filing deadline as published by Kawasaki.',
    tip: 'Treat this as campaign-style support: check each fiscal year if a new one-time child payment is available.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: 物価高対応子育て応援手当 (¥20,000 per eligible child)', url: 'https://www.city.kawasaki.jp/450/page/0000182550.html' }
    ],
    phones: []
  },
  {
    id: 'm16',
    label: 'National Health Insurance Premium Reduction (pregnancy/postpartum)',
    amount: 40000,
    phase: 'birth',
    howTo: 'If enrolled in National Health Insurance (kokuho), apply for pregnancy/postpartum premium reduction at the ward office after pregnancy registration and childbirth filing. Reduction amount depends on your premium bracket and period.',
    where: 'Kawasaki Ward Office insurance and pension counter',
    bring: 'Boshi techo, insurance card, parent ID, and required ward forms.',
    deadline: 'Apply as early as possible once eligible periods are open.',
    tip: 'This is often missed because families assume it is automatic. Ask specifically about maternal premium reduction and under-school-age child premium reduction.',
    verifiedAt: '2026-02-11',
    sourceLinks: [
      { label: 'Kawasaki: 国保の産前産後保険料軽減', url: 'https://www.city.kawasaki.jp/350/page/0000178815.html' }
    ],
    phones: [{ label: 'Kawasaki Ward insurance and pension section', number: '044-201-3151' }]
  },
]

export const checkupSchedule = [
  { id: 'v1', visit: 1, weekRange: '8-11', label: 'Initial checkup - confirm pregnancy, heartbeat' },
  { id: 'v2', visit: 2, weekRange: '12-15', label: 'Nuchal translucency screening, blood tests' },
  { id: 'v3', visit: 3, weekRange: '16-19', label: 'Gender check (maybe!), growth measurement' },
  { id: 'v4', visit: 4, weekRange: '20-23', label: 'Detailed anatomy scan, halfway point!' },
  { id: 'v5', visit: 5, weekRange: '24', label: 'Glucose tolerance test, growth check' },
  { id: 'v6', visit: 6, weekRange: '26', label: 'Blood pressure, weight, baby position' },
  { id: 'v7', visit: 7, weekRange: '28', label: 'Start biweekly visits, Rh antibody check' },
  { id: 'v8', visit: 8, weekRange: '30', label: 'Growth scan, amniotic fluid check' },
  { id: 'v9', visit: 9, weekRange: '32', label: 'Baby position check, birth plan discussion' },
  { id: 'v10', visit: 10, weekRange: '34', label: 'GBS test, cervix check' },
  { id: 'v11', visit: 11, weekRange: '36', label: 'Weekly visits start, NST monitoring' },
  { id: 'v12', visit: 12, weekRange: '37', label: 'Full term! Ready check, pelvic exam' },
  { id: 'v13', visit: 13, weekRange: '38-39', label: 'Cervix dilation check, baby engagement' },
  { id: 'v14', visit: 14, weekRange: '40', label: 'Due date visit, induction discussion if needed' }
]

export const taglishTips = [
  "Uuy mommy! Wag kalimutan mag-calcium ha, pero 2 hours away from iron! Nag-aagawan sila sa absorption.",
  "Tip: I-save lahat ng resibo ng hospital - need yan for Iryouhi Koujo (医療費控除)! Kahit taxi fare papuntang checkup, isama mo.",
  "Alam mo ba? Pag nag-file ka ng tax return, kahit maliit income mo, automatic reduction sa insurance premiums!",
  "Hydrate, hydrate, hydrate! 2-3 liters a day minimum. Tubig lang ha, hindi milk tea! (Okay fine, minsan okay lang.)",
  "Reminder: Ang Jidou Teate (児童手当) application ay WITHIN 15 DAYS after birth. May retroactive pay pero wag na risk!",
  "DHA is baby's brain food! Best time to take is with breakfast kasi may fat na for absorption.",
  "I-check kung covered ng Gendogaku Tekiyou Ninteishou (限度額適用認定証) ang hospital bills - baka may refund pa!",
  "Leg cramps at night? Try hydration + gentle stretching, then ask OB if magnesium support is needed.",
  "Hospital bag checklist: boshi techo, insurance card, birth plan, comfortable clothes, snacks for Dada Shinji!",
  "Choline is the secret weapon - studies show it boosts baby's memory and brain development. Ryzen approved!",
  "Wag mahiyang mag-tanong sa Kawasaki Ward Office - minsan may programs na di nila ina-advertise. Ask ask ask!",
  "Transportation log tip: Record EVERY trip to the hospital/clinic. Date, from-to, fare. Kahit train fare!",
  "Chlorella is not required. Core stack first: prenatal, DHA, choline, calcium. Optional lang siya later if OB-GYN agrees.",
  "Before delivery: confirm na Direct Payment System (Chokusetsu Shiharai) ang gamit ng hospital for ¥500,000.",
  "Feeling tired? Normal! First trimester exhaustion is real. Pahinga ka mommy, growing a human is hard work!",
  "Extra Vitamin D3 is not automatic. Check prenatal label and ask OB-GYN/labs bago magdagdag.",
  "Alam mo ba na libre ang dental checkup for pregnant women? Ninpu Shika Kenshin (妊婦歯科健診) - ask sa Ward Office!",
  "Tax tip: Furusato Nouzei (ふるさと納税) = free rice, meat, fruits! Bayad ng tax mo, babalik sa'yo as goods.",
  "Reminder: Shussei Todoke (出生届) - Birth Registration ay WITHIN 14 DAYS. I-prepare na ang form bago pa mag-deliver!",
  "Mommy's mental health matters too! If feeling overwhelmed, it's okay to rest. Dada Shinji's got this. 💪",
  "Danchi tip: Mag-apply na for public housing ASAP! Kawasaki Housing: 044-200-2994, UR: 0120-411-363",
  "Kawasaki International Association (044-435-7000) has free Japanese classes and translation help!",
  "Eggs are choline-rich. Count food first, then supplement only kung kulang pa sa daily target.",
  "Phil. Consulate Yokohama (045-681-5006) - closer than Tokyo embassy for baby's dual citizenship registration!",
  "Morning sunlight for 15-20 minutes = free Vitamin D! Plus better sleep and mood for mommy."
]

// Peggy recommended supplement schedule (used by AppContext as default)
export const OPTIMAL_SUPP_SCHEDULE = {
  prenatal:  { enabled: true, times: ['08:00', '20:30', '22:00'], timesPerDay: 3 },
  dha:       { enabled: true, times: ['20:30'], timesPerDay: 1 },
  calcium:   { enabled: true, times: ['12:00', '15:00'], timesPerDay: 2 },
  chlorella: { enabled: false, times: ['08:00'], timesPerDay: 1 },
  choline:   { enabled: true, times: ['08:00'], timesPerDay: 1 },
  vitd:      { enabled: false, times: ['12:00'], timesPerDay: 1 },
}

// Recommended supplement schedule - displayed prominently
export const optimalSchedule = [
  {
    time: '08:00 - BREAKFAST',
    icon: '??',
    supps: ['Choline', 'Prenatal capsule #1'],
    note: 'Start with the smallest useful pair. Choline is flexible, and one prenatal capsule is easier than all 3 at once.',
    tagNote: 'Breakfast: choline + prenatal #1 muna.'
  },
  {
    time: '12:00 - LUNCH',
    icon: '??',
    supps: ['Calcium (1st tablet)'],
    note: 'First calcium dose goes here so it stays clear of the prenatal iron.',
    tagNote: 'Lunch: calcium #1.'
  },
  {
    time: '15:00 - MID-AFTERNOON',
    icon: '??',
    supps: ['Calcium (2nd tablet)'],
    note: 'Second calcium dose. Gives another clean gap before dinner prenatal.',
    tagNote: 'Afternoon: calcium #2.'
  },
  {
    time: '20:30 - DINNER',
    icon: '??',
    supps: ['Prenatal capsule #2', 'DHA (2 softgels)'],
    note: 'Main meal stack for Naomi. DHA needs food/fat, and only one prenatal capsule is paired here.',
    tagNote: 'Dinner: DHA + prenatal #2. Change the time if Naomi gets home later.'
  },
  {
    time: '22:00 - BEDTIME SNACK',
    icon: '??',
    supps: ['Prenatal capsule #3'],
    note: 'Last prenatal capsule with a light snack before sleep.',
    tagNote: 'Bedtime: prenatal #3 with snack.'
  }
]

