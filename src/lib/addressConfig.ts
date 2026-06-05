export interface AddressFields {
    f1: string; // e.g. محافظة / منطقة / إمارة
    f2: string; // e.g. مدينة
    f3: string; // e.g. حي / شارع
    f4: string; // e.g. شارع / رقم مبنى
}

export interface AddressConfig {
    labels: [string, string, string, string];
    placeholders: [string, string, string, string];
    /** مصر = inline في الفاتورة، غيرها = stacked */
    inlineInvoice: boolean;
}

export const ADDRESS_CONFIG: Record<string, AddressConfig> = {
    EG: {
        labels: ['المحافظة', 'المدينة / الحي', 'الشارع', 'رقم المبنى'],
        placeholders: ['مثال: القاهرة', 'مثال: مصر الجديدة', 'مثال: شارع النزهة', 'مثال: 12'],
        inlineInvoice: true,
    },
    SA: {
        labels: ['المنطقة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: منطقة الرياض', 'مثال: الرياض', 'مثال: حي النزهة', 'مثال: شارع الملك فهد'],
        inlineInvoice: false,
    },
    AE: {
        labels: ['الإمارة', 'المدينة', 'المنطقة', 'الشارع'],
        placeholders: ['مثال: دبي', 'مثال: دبي', 'مثال: ديرة', 'مثال: شارع الشيخ زايد'],
        inlineInvoice: false,
    },
    KW: {
        labels: ['المحافظة', 'المنطقة', 'الشارع', 'القطعة'],
        placeholders: ['مثال: محافظة العاصمة', 'مثال: الصالحية', 'مثال: شارع الخليج', 'مثال: 5'],
        inlineInvoice: false,
    },
    QA: {
        labels: ['المنطقة', 'المدينة', 'الشارع', 'رقم المبنى'],
        placeholders: ['مثال: منطقة الدوحة', 'مثال: الدوحة', 'مثال: شارع كورنيش', 'مثال: 10'],
        inlineInvoice: false,
    },
    BH: {
        labels: ['المحافظة', 'المدينة', 'المنطقة', 'الشارع'],
        placeholders: ['مثال: محافظة العاصمة', 'مثال: المنامة', 'مثال: الجفير', 'مثال: شارع الملك فيصل'],
        inlineInvoice: false,
    },
    OM: {
        labels: ['المحافظة', 'الولاية', 'المدينة', 'الشارع'],
        placeholders: ['مثال: محافظة مسقط', 'مثال: مسقط', 'مثال: الخوير', 'مثال: شارع السلطان قابوس'],
        inlineInvoice: false,
    },
    JO: {
        labels: ['المحافظة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: محافظة عمان', 'مثال: عمان', 'مثال: الشميساني', 'مثال: شارع الملك الحسين'],
        inlineInvoice: false,
    },
    IQ: {
        labels: ['المحافظة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: بغداد', 'مثال: بغداد', 'مثال: المنصور', 'مثال: شارع 14 رمضان'],
        inlineInvoice: false,
    },
    LY: {
        labels: ['الشعبية', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: طرابلس', 'مثال: طرابلس', 'مثال: حي أندلس', 'مثال: شارع عمر المختار'],
        inlineInvoice: false,
    },
    TN: {
        labels: ['الولاية', 'المدينة', 'المنطقة', 'الشارع'],
        placeholders: ['مثال: ولاية تونس', 'مثال: تونس', 'مثال: باب البحر', 'مثال: شارع الحبيب بورقيبة'],
        inlineInvoice: false,
    },
    DZ: {
        labels: ['الولاية', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: ولاية الجزائر', 'مثال: الجزائر', 'مثال: باب الوادي', 'مثال: شارع العربي بن مهيدي'],
        inlineInvoice: false,
    },
    MA: {
        labels: ['الجهة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: جهة الدار البيضاء', 'مثال: الدار البيضاء', 'مثال: المعاريف', 'مثال: شارع محمد الخامس'],
        inlineInvoice: false,
    },
    SD: {
        labels: ['الولاية', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: ولاية الخرطوم', 'مثال: الخرطوم', 'مثال: الخرطوم 2', 'مثال: شارع النيل'],
        inlineInvoice: false,
    },
    YE: {
        labels: ['المحافظة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: محافظة أمانة العاصمة', 'مثال: صنعاء', 'مثال: حدة', 'مثال: شارع تعز'],
        inlineInvoice: false,
    },
    SY: {
        labels: ['المحافظة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: محافظة دمشق', 'مثال: دمشق', 'مثال: المزة', 'مثال: شارع بغداد'],
        inlineInvoice: false,
    },
    LB: {
        labels: ['المحافظة', 'القضاء', 'البلدة', 'الشارع'],
        placeholders: ['مثال: محافظة بيروت', 'مثال: بيروت', 'مثال: الحمرا', 'مثال: شارع الحمرا'],
        inlineInvoice: false,
    },
    PS: {
        labels: ['المحافظة', 'المدينة', 'الحي', 'الشارع'],
        placeholders: ['مثال: محافظة رام الله', 'مثال: رام الله', 'مثال: البيرة', 'مثال: شارع الارسال'],
        inlineInvoice: false,
    },
};

/** الإعداد الافتراضي لأي دولة غير مُعرَّفة */
export const DEFAULT_ADDRESS_CONFIG: AddressConfig = {
    labels: ['المنطقة', 'المدينة', 'الحي', 'الشارع'],
    placeholders: ['المنطقة', 'المدينة', 'الحي', 'الشارع'],
    inlineInvoice: false,
};

export function getAddressConfig(countryCode: string): AddressConfig {
    return ADDRESS_CONFIG[countryCode?.toUpperCase()] ?? DEFAULT_ADDRESS_CONFIG;
}

/** تحويل object → نص عرض مدموج (للجدول) */
export function formatAddressInline(addr: AddressFields | null | undefined): string {
    if (!addr) return '';
    return [addr.f1, addr.f2, addr.f3, addr.f4].filter(Boolean).join('، ');
}

/** فك ترميز HTML entities */
function decodeHtmlEntities(str: string): string {
    return str
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

/** تحليل حقل address من DB (string أو JSON) */
export function parseAddress(raw: string | null | undefined): AddressFields | null {
    if (!raw) return null;
    // فك أي HTML encoding قديم قبل التحليل
    const clean = decodeHtmlEntities(raw);
    try {
        const parsed = JSON.parse(clean);
        if (parsed && typeof parsed === 'object' && ('f1' in parsed || 'f2' in parsed)) {
            return parsed as AddressFields;
        }
    } catch {
        // نص قديم — نضعه في f1
    }
    // backward compat: نص قديم
    return { f1: clean, f2: '', f3: '', f4: '' };
}

/** تحويل AddressFields → JSON string للحفظ */
export function stringifyAddress(fields: AddressFields): string {
    return JSON.stringify(fields);
}

/** عرض العنوان في الفاتورة */
export function formatAddressForInvoice(
    raw: string | null | undefined,
    countryCode: string
): string[] {
    const addr = parseAddress(raw);
    if (!addr) return [];
    const cfg = getAddressConfig(countryCode);
    const parts = [addr.f1, addr.f2, addr.f3, addr.f4].filter(Boolean);
    if (cfg.inlineInvoice) {
        return [parts.join('، ')];
    }
    return parts;
}

// Dummy translation function so that extract-translations.js will pick up these static keys
function _dummyAddressTranslations() {
    const { t } = { t: (s: string) => s };
    // Labels
    t('المحافظة');
    t('المدينة / الحي');
    t('الشارع');
    t('رقم المبنى');
    t('المنطقة');
    t('المدينة');
    t('الحي');
    t('الإمارة');
    t('القطعة');
    t('الولاية');
    t('الشعبية');
    t('الجهة');
    t('القضاء');
    t('البلدة');

    // Placeholders
    t('مثال: القاهرة');
    t('مثال: مصر الجديدة');
    t('مثال: شارع النزهة');
    t('مثال: 12');
    t('مثال: منطقة الرياض');
    t('مثال: الرياض');
    t('مثال: حي النزهة');
    t('مثال: شارع الملك فهد');
    t('مثال: دبي');
    t('مثال: ديرة');
    t('مثال: شارع الشيخ زايد');
    t('مثال: محافظة العاصمة');
    t('مثال: الصالحية');
    t('مثال: شارع الخليج');
    t('مثال: 5');
    t('مثال: منطقة الدوحة');
    t('مثال: الدوحة');
    t('مثال: شارع كورنيش');
    t('مثال: 10');
    t('مثال: المنامة');
    t('مثال: الجفير');
    t('مثال: شارع الملك فيصل');
    t('مثال: محافظة مسقط');
    t('مثال: مسقط');
    t('مثال: الخوير');
    t('مثال: شارع السلطان قابوس');
    t('مثال: محافظة عمان');
    t('مثال: عمان');
    t('مثال: الشميساني');
    t('مثال: شارع الملك الحسين');
    t('مثال: بغداد');
    t('مثال: المنصور');
    t('مثال: شارع 14 رمضان');
    t('مثال: طرابلس');
    t('مثال: حي أندلس');
    t('مثال: شارع عمر المختار');
    t('مثال: ولاية تونس');
    t('مثال: تونس');
    t('مثال: باب البحر');
    t('مثال: شارع الحبيب بورقيبة');
    t('مثال: ولاية الجزائر');
    t('مثال: الجزائر');
    t('مثال: باب الوادي');
    t('مثال: شارع العربي بن مهيدي');
    t('مثال: جهة الدار البيضاء');
    t('مثال: الدار البيضاء');
    t('مثال: المعاريف');
    t('مثال: شارع محمد الخامس');
    t('مثال: ولاية الخرطوم');
    t('مثال: الخرطوم');
    t('مثال: الخرطوم 2');
    t('مثال: شارع النيل');
    t('مثال: محافظة أمانة العاصمة');
    t('مثال: صنعاء');
    t('مثال: حدة');
    t('مثال: شارع تعز');
    t('مثال: محافظة دمشق');
    t('مثال: دمشق');
    t('مثال: المزة');
    t('مثال: شارع بغداد');
    t('مثال: محافظة بيروت');
    t('مثال: بيروت');
    t('مثال: الحمرا');
    t('مثال: شارع الحمرا');
    t('مثال: محافظة رام الله');
    t('مثال: رام الله');
    t('مثال: البيرة');
    t('مثال: شارع الارسال');
}

