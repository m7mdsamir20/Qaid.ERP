export const CURRENCY_SYMBOLS: Record<string, string> = {
    'EGP': 'ج.م',
    'SAR': 'ر.س',
    'USD': '$',
    'AED': 'د.إ',
    'KWD': 'د.ك',
    'QAR': 'ر.ق',
    'BHD': 'د.ب',
    'OMR': 'ر.ع',
    'JOD': 'د.أ',
    'LYD': 'د.ل',
};

export function getCurrencySymbol(code: string = 'EGP'): string {
    return CURRENCY_SYMBOLS[code] || code;
}

export function formatCurrency(amount: number, code: string = 'EGP'): string {
    const symbol = getCurrencySymbol(code);
    const formatted = amount.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
    });
    return `${formatted} ${symbol}`;
}
