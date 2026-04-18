export interface InvoiceTemplateConfig {
    // Company Header
    showLogo: boolean;
    logoPosition: 'left' | 'center' | 'right';
    logoSize: number; // width in px
    showCompanyDetails: boolean;
    showVatNumber: boolean;
    showCrNumber: boolean;

    // Invoice Info Block
    showQRCode: boolean; // ZATCA QR
    showInvoiceType: boolean;
    invoiceTypeLabel: string; // 'فاتورة ضريبية مبسطة', etc.

    // Customer Info Block
    showCustomerVat: boolean;
    showCustomerAddress: boolean;
    showCustomerPhone: boolean;

    // Items Table
    columns: {
        index: boolean;
        item: boolean;
        unit: boolean;
        quantity: boolean;
        price: boolean;
        discount: boolean;
        taxRate: boolean;
        taxAmount: boolean;
        total: boolean;
    };
    tableStyle: 'bordered' | 'striped' | 'minimal';
    columnHeaderLang: 'ar' | 'en' | 'both';

    // Totals Section
    showSubtotal: boolean;
    showDiscountTotal: boolean;
    showTaxableAmount: boolean;
    showVatTotal: boolean;
    showPaidAmount: boolean;
    showRemainingAmount: boolean;

    // Footer
    showCustomerSignature: boolean;
    showAuthSignature: boolean;
    notes: string;
    thankYouMessage: string;

    // Design Controls
    primaryColor: string;
    fontFamily: string; // 'Cairo', 'Tajawal', etc.
    fontSize: 'small' | 'medium' | 'large';
    paperSize: 'A4' | 'A5' | 'Letter';
    languageMode: 'ar' | 'en' | 'bilingual';
}

export const defaultTemplateConfig: InvoiceTemplateConfig = {
    showLogo: true,
    logoPosition: 'left',
    logoSize: 150,
    showCompanyDetails: true,
    showVatNumber: true,
    showCrNumber: true,

    showQRCode: true,
    showInvoiceType: true,
    invoiceTypeLabel: 'فاتورة ضريبية',

    showCustomerVat: true,
    showCustomerAddress: true,
    showCustomerPhone: true,

    columns: {
        index: true,
        item: true,
        unit: true,
        quantity: true,
        price: true,
        discount: false,
        taxRate: true,
        taxAmount: true,
        total: true,
    },
    tableStyle: 'bordered',
    columnHeaderLang: 'both',

    showSubtotal: true,
    showDiscountTotal: true,
    showTaxableAmount: true,
    showVatTotal: true,
    showPaidAmount: true,
    showRemainingAmount: true,

    showCustomerSignature: true,
    showAuthSignature: true,
    notes: '',
    thankYouMessage: 'شكراً لتعاملكم معنا',

    primaryColor: '#111111',
    fontFamily: 'Cairo',
    fontSize: 'medium',
    paperSize: 'A4',
    languageMode: 'bilingual',
};

export function getDefaultTemplateConfig(taxInvoiceType: 'standard' | 'simplified' = 'standard'): InvoiceTemplateConfig {
    const config = { ...defaultTemplateConfig };
    if (taxInvoiceType === 'simplified') {
        config.invoiceTypeLabel = 'فاتورة ضريبية مبسطة';
        config.showCustomerVat = false;
        config.showCustomerAddress = false;
    }
    return config;
}
