/**
 * Shared invoice reference code generator.
 * Matches the logic in printInvoices.ts so codes are always consistent
 * across print, display, and reports.
 */

const SALE_PREFIXES: Record<string, string> = {
    SERVICES: 'SRV',
};

const TYPE_PREFIXES: Record<string, string> = {
    sale: 'SAL',
    sale_return: 'SLR',
    purchase: 'PUR',
    purchase_return: 'PRR',
};

/**
 * Returns the formatted invoice reference code.
 * @param invoiceNumber - The raw invoice number from the DB
 * @param type         - Prisma invoice type: 'sale' | 'sale_return' | 'purchase' | 'purchase_return'
 * @param businessType - Company business type (SERVICES, TRADING, etc.)
 */
export function getInvoiceRef(
    invoiceNumber: number | string,
    type: string,
    businessType?: string | null,
): string {
    const num = String(invoiceNumber).padStart(5, '0');
    const biz = businessType?.toUpperCase() ?? '';

    let prefix: string;
    if ((type === 'sale' || type === 'sale_return') && SALE_PREFIXES[biz]) {
        prefix = SALE_PREFIXES[biz];
    } else {
        prefix = TYPE_PREFIXES[type] ?? 'INV';
    }

    return `${prefix}-${num}`;
}

/**
 * Returns the formatted voucher reference code.
 * @param voucherNumber - The raw voucher number from the DB
 * @param type          - 'receipt' | 'payment'
 */
export function getVoucherRef(voucherNumber: number | string, type: string): string {
    const num = String(voucherNumber).padStart(5, '0');
    const prefix = type === 'receipt' ? 'RCP' : 'PMT';
    return `${prefix}-${num}`;
}
