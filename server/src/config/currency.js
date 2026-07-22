const SUPPORTED_CURRENCY_CODES = ['USD', 'EUR', 'INR', 'GBP', 'JPY', 'AUD', 'CAD', 'SGD'];
const DEFAULT_CURRENCY_CODE = 'USD';

function normalizeCurrencyCode(raw) {
  const code = String(raw || '')
    .trim()
    .toUpperCase();
  if (!SUPPORTED_CURRENCY_CODES.includes(code)) {
    return null;
  }
  return code;
}

module.exports = {
  SUPPORTED_CURRENCY_CODES,
  DEFAULT_CURRENCY_CODE,
  normalizeCurrencyCode,
};
