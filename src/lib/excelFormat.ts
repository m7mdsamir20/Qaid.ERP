import * as XLSX from 'xlsx';
import { CURRENCY_DATA } from './currency';

const MONEY_KEYWORDS = [
    'رصيد', 'مبلغ', 'مدين', 'دائن', 'إيداع', 'سحب',
    'وارد', 'صادر', 'متبقي', 'فارق', 'إجمالي', 'خدمات',
    'مبيعات', 'مشتريات', 'راتب', 'سلفة', 'خصم', 'استحق',
    'دفع', 'تكلفة', 'أرباح', 'عمولة', 'مسدد', 'مستحق',
];

function isMoneyCellHeader(header: string): boolean {
    return MONEY_KEYWORDS.some(kw => header.includes(kw));
}

function buildNumFmt(currencyCode: string, lang: 'ar' | 'en'): string {
    const data = CURRENCY_DATA[currencyCode];
    const symbol = data ? (lang === 'en' ? data.en : data.ar) : currencyCode;
    return lang === 'ar'
        ? `#,##0.00 "${symbol}"`
        : `"${symbol}" #,##0.00`;
}

/** Returns true if any header cell in the worksheet contains Arabic characters. */
function hasArabicHeaders(ws: XLSX.WorkSheet): boolean {
    if (!ws['!ref']) return false;
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
        if (cell && typeof cell.v === 'string' && /[؀-ۿ]/.test(cell.v)) return true;
    }
    return false;
}

/**
 * Applies Excel currency number format to all numeric cells in monetary columns.
 * Also sets sheet direction to RTL automatically when Arabic headers are detected.
 * Call this after XLSX.utils.json_to_sheet() and before book_append_sheet().
 */
export function applyExcelMoneyFormat(
    ws: XLSX.WorkSheet,
    currencyCode: string,
    lang: 'ar' | 'en' = 'ar',
): void {
    // Auto-set RTL when content is Arabic (regardless of UI language)
    if (hasArabicHeaders(ws)) {
        (ws as any)['!rightToLeft'] = true;
    }
    if (!ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    const numFmt = buildNumFmt(currencyCode, lang);

    // Find monetary column indices from header row
    const moneyColSet = new Set<number>();
    for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'string' && isMoneyCellHeader(cell.v)) {
            moneyColSet.add(C);
        }
    }

    if (moneyColSet.size === 0) return;

    // Apply numFmt to every numeric cell in those columns (skip header row)
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
        for (const C of moneyColSet) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[addr];
            if (cell && cell.t === 'n') {
                cell.z = numFmt;
            }
        }
    }
}
