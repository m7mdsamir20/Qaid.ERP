/* ─── Currency Utilities ─── */

export const CURRENCY_DATA: Record<string, { ar: string, en: string }> = {
    'EGP': { ar: 'ج.م', en: 'EGP' },
    'SAR': { ar: 'ر.س', en: 'SAR' },
    'AED': { ar: 'د.إ', en: 'AED' },
    'KWD': { ar: 'د.ك', en: 'KWD' },
    'QAR': { ar: 'ر.ق', en: 'QAR' },
    'BHD': { ar: 'د.ب', en: 'BHD' },
    'OMR': { ar: 'ر.ع', en: 'OMR' },
    'JOD': { ar: 'د.أ', en: 'JOD' },
    'LYD': { ar: 'د.ل', en: 'LYD' },
    'IQD': { ar: 'د.ع', en: 'IQD' },
    'USD': { ar: '$', en: 'USD' },
    'EUR': { ar: '€', en: 'EUR' },
    'GBP': { ar: '£', en: 'GBP' },
    'TRY': { ar: '₺', en: 'TRY' },
    'SDG': { ar: 'ج.س', en: 'SDG' },
};

export function getCurrencySymbol(code: string = 'EGP', lang: 'ar' | 'en' = 'ar'): string {
    const data = CURRENCY_DATA[code];
    if (!data) return code;
    return lang === 'en' ? data.en : data.ar;
}

export function formatMoney(amount: number, code: string = 'EGP', lang: 'ar' | 'en' = 'ar'): string {
    const symbol = getCurrencySymbol(code, lang);
    const absAmount = Math.abs(amount);
    const formattedNum = absAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    let result = "";
    if (lang === 'ar') {
        result = `${formattedNum} ${symbol}`;
    } else {
        result = `${symbol} ${formattedNum}`;
    }
    return amount < 0 ? `-${result}` : result;
}

/**
 * Returns HTML string with strict font separation.
 * Currency symbol: 'Cairo'
 * Numeric value: 'inherit' (to use parent font like Outfit/Inter)
 */
export function formatMoneyHTML(amount: number, code: string = 'EGP', lang: 'ar' | 'en' = 'ar'): string {
    const symbol = getCurrencySymbol(code, lang);
    const absAmount = Math.abs(amount);
    const formattedNum = absAmount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    // CRITICAL: Strict separation as per user request
    const symbolHTML = `<span class="currency" style="font-family: 'Cairo', sans-serif !important; font-weight: 600;">${symbol}</span>`;
    const amountHTML = `<span class="amount" style="font-family: inherit; font-weight: 700;">${formattedNum}</span>`;

    const sign = amount < 0 ? '-' : '';
    let content = lang === 'ar' ? `${amountHTML} ${symbolHTML}` : `${symbolHTML} ${amountHTML}`;
    
    return `<span class="money-wrapper" style="white-space: nowrap; direction: ${lang === 'ar' ? 'rtl' : 'ltr'};">${sign}${content}</span>`;
}

/**
 * Formats a number with thousand separators.
 * Useful for inputs and plain numeric displays.
 */
export function formatNumber(value: number | string | undefined | null, decimals: number = 2): string {
    if (value === undefined || value === null || value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
    if (isNaN(num)) return '';
    
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(num);
}

/**
 * Strips all non-numeric characters except the decimal point and minus sign.
 * Useful for processing input values before saving to DB.
 */
export function parseNumber(value: string): number {
    const clean = value.replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
}

// Backward compatibility
export const formatCurrency = formatMoney;
