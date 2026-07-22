const analyticsService = require('./analyticsService');
const User = require('../models/User');
const { DEFAULT_CURRENCY_CODE } = require('../config/currency');

const RISK_LEVELS = ['low', 'medium', 'high'];

const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: 'EUR ',
  INR: '₹',
  GBP: 'GBP ',
  JPY: 'JPY ',
  AUD: 'AUD ',
  CAD: 'CAD ',
  SGD: 'SGD ',
};

const PLAN_BY_RISK = {
  low: {
    sip: { allocationPct: 30, annualReturnPct: 9.5, label: 'SIP (index-oriented)' },
    fd: { allocationPct: 50, annualReturnPct: 6.5, label: 'Fixed Deposit (FD)' },
    mutual_funds: { allocationPct: 20, annualReturnPct: 8.5, label: 'Mutual Funds (balanced)' },
  },
  medium: {
    sip: { allocationPct: 45, annualReturnPct: 11.5, label: 'SIP (growth)' },
    fd: { allocationPct: 25, annualReturnPct: 6.5, label: 'Fixed Deposit (FD)' },
    mutual_funds: { allocationPct: 30, annualReturnPct: 11, label: 'Mutual Funds (hybrid/equity)' },
  },
  high: {
    sip: { allocationPct: 55, annualReturnPct: 13, label: 'SIP (aggressive)' },
    fd: { allocationPct: 15, annualReturnPct: 6.5, label: 'Fixed Deposit (FD)' },
    mutual_funds: { allocationPct: 30, annualReturnPct: 14.5, label: 'Mutual Funds (equity-focused)' },
  },
};

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function formatMoney(amount, currencySymbol) {
  return `${currencySymbol}${Math.round(amount)}`;
}

function normalizeRiskLevel(raw) {
  const level = String(raw || '')
    .trim()
    .toLowerCase();
  return RISK_LEVELS.includes(level) ? level : null;
}

function simulateMonthlyInvestment(monthlyAmount, annualReturnPct, months) {
  const P = Number(monthlyAmount) || 0;
  const annualRate = (Number(annualReturnPct) || 0) / 100;
  const monthlyRate = annualRate / 12;
  if (P <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return P * months;
  return P * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
}

function buildSuggestion(type, cfg, monthlySurplus, currencySymbol, months1Y = 12, months3Y = 36) {
  const monthlyInvestment = round2((monthlySurplus * cfg.allocationPct) / 100);
  const projected1Y = round2(simulateMonthlyInvestment(monthlyInvestment, cfg.annualReturnPct, months1Y));
  const projected3Y = round2(simulateMonthlyInvestment(monthlyInvestment, cfg.annualReturnPct, months3Y));
  const message = `You can invest ${formatMoney(
    monthlyInvestment,
    currencySymbol
  )}/month in ${cfg.label} (${cfg.annualReturnPct}% assumed annual return) to potentially reach ${formatMoney(
    projected3Y,
    currencySymbol
  )} in ~3 years.`;

  return {
    type,
    label: cfg.label,
    allocationPercent: cfg.allocationPct,
    assumedAnnualReturnPercent: cfg.annualReturnPct,
    recommendedMonthlyInvestment: monthlyInvestment,
    projectedValue1Y: projected1Y,
    projectedValue3Y: projected3Y,
    message,
  };
}

async function getRecommendations({ userId, riskLevel, monthlySurplus }) {
  const normalizedRisk = normalizeRiskLevel(riskLevel);
  if (!normalizedRisk) {
    return { error: `riskLevel must be one of: ${RISK_LEVELS.join(', ')}` };
  }

  let computedMonthlySurplus = monthlySurplus;
  if (computedMonthlySurplus === undefined || computedMonthlySurplus === null || Number.isNaN(Number(computedMonthlySurplus))) {
    computedMonthlySurplus = await analyticsService.getAverageMonthlyNetSavings(userId, 3);
  }
  computedMonthlySurplus = round2(Number(computedMonthlySurplus) || 0);
  if (computedMonthlySurplus <= 0) {
    return {
      error: 'Monthly surplus must be positive to generate investment recommendations',
      monthlySurplus: computedMonthlySurplus,
    };
  }

  const user = await User.findById(userId).select('currencyCode').lean();
  const currencyCode = user?.currencyCode || DEFAULT_CURRENCY_CODE;
  const currencySymbol = CURRENCY_SYMBOLS[currencyCode] || '$';

  const plan = PLAN_BY_RISK[normalizedRisk];
  const suggestions = [
    buildSuggestion('sip', plan.sip, computedMonthlySurplus, currencySymbol),
    buildSuggestion('fd', plan.fd, computedMonthlySurplus, currencySymbol),
    buildSuggestion('mutual_funds', plan.mutual_funds, computedMonthlySurplus, currencySymbol),
  ];

  const primary = suggestions.reduce((best, s) => (!best || s.recommendedMonthlyInvestment > best.recommendedMonthlyInvestment ? s : best), null);

  return {
    riskLevel: normalizedRisk,
    currencyCode,
    currencySymbol,
    monthlySurplus: computedMonthlySurplus,
    primaryRecommendation: primary
      ? `You can invest ${formatMoney(primary.recommendedMonthlyInvestment, currencySymbol)}/month in ${primary.label} to reach your goal faster.`
      : '',
    suggestions,
  };
}

module.exports = { getRecommendations, normalizeRiskLevel, RISK_LEVELS };
