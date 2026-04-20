// ── Currency symbols: Arabic and English ──
export const CURRENCY_DATA: Record<string, { ar: string; en: string }> = {
    'EGP': { ar: 'ج.م', en: 'EGP' },
    'SAR': { ar: 'ر.س', en: 'SAR' },
    'USD': { ar: 'دولار', en: 'USD' },
    'AED': { ar: 'د.إ', en: 'AED' },
    'KWD': { ar: 'د.ك', en: 'KWD' },
    'QAR': { ar: 'ر.ق', en: 'QAR' },
    'BHD': { ar: 'د.ب', en: 'BHD' },
    'OMR': { ar: 'ر.ع', en: 'OMR' },
    'JOD': { ar: 'د.أ', en: 'JOD' },
    'LYD': { ar: 'د.ل', en: 'LYD' },
    'IQD': { ar: 'د.ع', en: 'IQD' },
    'TRY': { ar: 'ل.ت', en: 'TRY' },
    'EUR': { ar: 'يورو', en: 'EUR' },
    'GBP': { ar: 'جنيه', en: 'GBP' },
    'LBP': { ar: 'ل.ل', en: 'LBP' },
    'SYP': { ar: 'ل.س', en: 'SYP' },
    'YER': { ar: 'ر.ي', en: 'YER' },
    'TND': { ar: 'د.ت', en: 'TND' },
    'DZD': { ar: 'د.ج', en: 'DZD' },
    'MAD': { ar: 'د.م', en: 'MAD' },
    'SDG': { ar: 'ج.س', en: 'SDG' },
};

// Legacy map (Arabic only) for backward compatibility
export const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
    Object.entries(CURRENCY_DATA).map(([code, data]) => [code, data.ar])
);

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
 * Returns currency formatted as HTML string with separate spans for styling.
 * Used primarily in print templates and reports.
 */
export function formatMoneyHTML(amount: number, code: string = 'EGP', lang: 'ar' | 'en' = 'ar'): string {
    const symbol = getCurrencySymbol(code, lang);
    const absAmount = Math.abs(amount);
    const formattedNum = absAmount.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    const amountSpan = `<span class="amount">${formattedNum}</span>`;
    const symbolSpan = `<span class="currency">${symbol}</span>`;
    
    let result = "";
    if (lang === 'ar') {
        result = `${amountSpan} ${symbolSpan}`;
    } else {
        result = `${symbolSpan} ${amountSpan}`;
    }
    
    return amount < 0 ? `- ${result}` : result;
}

// Backward compatibility
export const formatCurrency = formatMoney;
