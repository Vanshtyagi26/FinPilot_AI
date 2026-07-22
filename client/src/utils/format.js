const SUPPORTED_CURRENCY_CODES = ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];
const DEFAULT_CURRENCY_CODE = 'USD';

let activeCurrencyCode = DEFAULT_CURRENCY_CODE;

function normalizeCurrencyCode(code) {
  const normalized = String(code || '')
    .trim()
    .toUpperCase();
  return SUPPORTED_CURRENCY_CODES.includes(normalized) ? normalized : DEFAULT_CURRENCY_CODE;
}

export function setActiveCurrencyCode(code) {
  activeCurrencyCode = normalizeCurrencyCode(code);
}

export function getActiveCurrencyCode() {
  return activeCurrencyCode;
}

export function getSupportedCurrencyCodes() {
  return SUPPORTED_CURRENCY_CODES.slice();
}

export function formatMoney(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: activeCurrencyCode }).format(Number(n) || 0);
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatShortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
