// Japan Income Tax Calculator
// Progressive brackets + 住民税 + social insurance + 医療費控除 + 配偶者控除

const INCOME_TAX_BRACKETS = [
  { limit: 1950000, rate: 0.05, deduction: 0 },
  { limit: 3300000, rate: 0.10, deduction: 97500 },
  { limit: 6950000, rate: 0.20, deduction: 427500 },
  { limit: 9000000, rate: 0.23, deduction: 636000 },
  { limit: 18000000, rate: 0.33, deduction: 1536000 },
  { limit: 40000000, rate: 0.40, deduction: 2796000 },
  { limit: Infinity, rate: 0.45, deduction: 4796000 }
];

const RESIDENT_TAX_RATE = 0.10;
const SOCIAL_INSURANCE_RATE = 0.15;
const BASIC_DEDUCTION = 480000;

function getEmploymentIncomeDeduction(income) {
  if (income <= 1625000) return 550000;
  if (income <= 1800000) return income * 0.4 - 100000;
  if (income <= 3600000) return income * 0.3 + 80000;
  if (income <= 6600000) return income * 0.2 + 440000;
  if (income <= 8500000) return income * 0.1 + 1100000;
  return 1950000;
}

function getSpouseDeduction(taxpayerIncome, spouseIncome) {
  const taxableIncome = taxpayerIncome - getEmploymentIncomeDeduction(taxpayerIncome);
  if (taxableIncome > 10000000) return 0;

  const spouseTaxable = spouseIncome - Math.min(getEmploymentIncomeDeduction(spouseIncome), spouseIncome);

  if (spouseTaxable <= 480000) {
    // 配偶者控除
    if (taxableIncome <= 9000000) return 380000;
    if (taxableIncome <= 9500000) return 260000;
    return 130000;
  }

  if (spouseTaxable <= 1330000) {
    // 配偶者特別控除 (graduated)
    const brackets = [
      { limit: 500000, amounts: [380000, 260000, 130000] },
      { limit: 550000, amounts: [360000, 240000, 120000] },
      { limit: 600000, amounts: [310000, 210000, 110000] },
      { limit: 650000, amounts: [260000, 180000, 90000] },
      { limit: 700000, amounts: [210000, 140000, 70000] },
      { limit: 750000, amounts: [160000, 110000, 60000] },
      { limit: 800000, amounts: [110000, 80000, 40000] },
      { limit: 850000, amounts: [60000, 40000, 20000] },
      { limit: 1330000, amounts: [30000, 20000, 10000] }
    ];
    const tierIndex = taxableIncome <= 9000000 ? 0 : taxableIncome <= 9500000 ? 1 : 2;
    for (const b of brackets) {
      if (spouseTaxable <= b.limit) return b.amounts[tierIndex];
    }
  }

  return 0;
}

function getMedicalDeduction(totalMedical, totalIncome) {
  if (totalMedical <= 0) return 0;
  const threshold = Math.min(100000, totalIncome * 0.05);
  return Math.max(0, Math.min(totalMedical - threshold, 2000000));
}

export function calculateTax({
  annualIncome = 0,
  spouseIncome = 0,
  medicalExpenses = 0,
  socialInsurance = 0
}) {
  // Step 1: Employment income deduction
  const employmentDeduction = getEmploymentIncomeDeduction(annualIncome);
  const employmentIncome = Math.max(0, annualIncome - employmentDeduction);

  // Step 2: Social insurance (estimate if not provided)
  const socialIns = socialInsurance || Math.round(annualIncome * SOCIAL_INSURANCE_RATE);

  // Step 3: Deductions
  const spouseDeduction = getSpouseDeduction(annualIncome, spouseIncome);
  const medicalDeduction = getMedicalDeduction(medicalExpenses, employmentIncome);

  const totalDeductions = BASIC_DEDUCTION + socialIns + spouseDeduction + medicalDeduction;

  // Step 4: Taxable income
  const taxableIncome = Math.max(0, employmentIncome - totalDeductions);

  // Step 5: Income tax
  let incomeTax = 0;
  for (const bracket of INCOME_TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      incomeTax = Math.round(taxableIncome * bracket.rate - bracket.deduction);
      break;
    }
  }
  // Reconstruction special tax (2.1%)
  const reconstructionTax = Math.round(incomeTax * 0.021);
  const totalIncomeTax = incomeTax + reconstructionTax;

  // Step 6: Resident tax (simplified)
  const residentTax = Math.round(taxableIncome * RESIDENT_TAX_RATE + 5000);

  // Step 7: Summary
  const totalTax = totalIncomeTax + residentTax;
  const effectiveRate = annualIncome > 0 ? ((totalTax / annualIncome) * 100).toFixed(1) : '0.0';
  const monthlyTakeHome = Math.round((annualIncome - totalTax - socialIns) / 12);

  // Estimate refund: compare with/without medical deduction
  let estimatedRefund = 0;
  if (medicalDeduction > 0) {
    const taxableWithout = Math.max(0, employmentIncome - (totalDeductions - medicalDeduction));
    let taxWithout = 0;
    for (const bracket of INCOME_TAX_BRACKETS) {
      if (taxableWithout <= bracket.limit) {
        taxWithout = Math.round(taxableWithout * bracket.rate - bracket.deduction);
        break;
      }
    }
    const residentWithout = Math.round(taxableWithout * RESIDENT_TAX_RATE + 5000);
    estimatedRefund = (taxWithout + residentWithout) - (incomeTax + residentTax);
  }

  return {
    annualIncome,
    employmentIncome,
    socialInsurance: socialIns,
    deductions: {
      basic: BASIC_DEDUCTION,
      socialInsurance: socialIns,
      spouse: spouseDeduction,
      medical: medicalDeduction,
      total: totalDeductions
    },
    taxableIncome,
    incomeTax: totalIncomeTax,
    residentTax,
    totalTax,
    effectiveRate: parseFloat(effectiveRate),
    monthlyTakeHome,
    estimatedRefund
  };
}
