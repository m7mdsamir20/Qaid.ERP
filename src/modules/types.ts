/**
 * ═══════════════════════════════════════════════════════════════
 *  تعريف شكل "النشاط" (Activity Module)
 * ═══════════════════════════════════════════════════════════════
 *
 * كل نشاط في النظام (تجارة جملة / تجزئة / خدمات / مطاعم / مقاولات)
 * بيتوصف بملف واحد بيطبّق الواجهة دي. أي سلوك يخص نشاط معيّن
 * لازم يتحط هنا — مش شرط `if (businessType === '...')` متناثر في الصفحات.
 *
 * إزاي تضيف نشاط جديد:
 *   1. اعمل ملف جديد في src/modules/ يصدّر ActivityModule
 *   2. سجّله في src/modules/registry.ts
 *   خلاص. مفيش أي ملف تاني محتاج تعديل.
 */

export type ActivityKey =
    | 'TRADING'
    | 'RETAIL'
    | 'SERVICES'
    | 'RESTAURANTS'
    | 'CONTRACTING';

/**
 * المصطلحات اللي بتختلف من نشاط للتاني.
 * المقاولات بتقول "صاحب المشروع" مش "العميل"، والخدمات بتقول "خدمة" مش "صنف".
 * بدل ما كل صفحة تعمل الترجمة دي بنفسها، بتيجي من هنا.
 *
 * القيم نصوص خام — الصفحة هي اللي بتنادي t() عليها.
 */
export type TermKey =
    // العملاء
    | 'customer' | 'customers' | 'customerCash'
    // الأصناف
    | 'item' | 'items' | 'itemCategory' | 'itemCategories'
    // المخازن
    | 'warehouse' | 'warehouses'
    // الفواتير
    | 'invoice' | 'invoices' | 'invoiceNumber';

export interface ActivityModule {
    /** المفتاح المخزّن في Company.businessType (بحروف كابيتال) */
    key: ActivityKey;

    /** الاسم المعروض للعميل — نص خام، المستهلك هو اللي بينادي t() */
    label: string;

    /**
     * الـ featureKeys من navSections اللي النشاط ده بيشوفها.
     * أي قسم مش مذكور هنا → مخفي تماماً عن النشاط (سايدبار + راوت جارد).
     */
    sections: string[];

    /**
     * روابط (link.id) مخفية عن النشاط ده بالرغم إن قسمها ظاهر.
     * مثال: المقاولات بتشوف قسم "المبيعات" لكن من غير "مرتجع مبيعات".
     */
    hiddenPages: string[];

    /** إعادة تسمية عناوين الأقسام: featureKey → العنوان الجديد (نص خام) */
    sectionTitles: Record<string, string>;

    /** إعادة تسمية الروابط: link.id → الاسم الجديد (نص خام) */
    pageLabels: Record<string, string>;

    /**
     * الباقة الافتراضية اللي السوبر أدمن بيقترحها لما يختار النشاط ده.
     * دي طبقة *الاشتراك* — مستقلة عن `sections` (طبقة النشاط).
     * الصفحة بتظهر لما الاتنين يسمحوا بيها.
     */
    defaultModules: string[];

    /**
     * المصطلحات اللي النشاط بيغيّرها. أي مفتاح مش هنا بياخد القيمة
     * الافتراضية من DEFAULT_TERMS في shared.ts.
     */
    terms: Partial<Record<TermKey, string>>;

    /**
     * بادئات أكواد الفواتير للنشاط ده — 3 حروف لكل نوع فاتورة.
     * الكود النهائي = البادئة + شرطة + الرقم بـ 5 خانات: CON-00042
     *
     * ⚠️ الكود ده بيتكتب في مرجع القيود المحاسبية وبيتخزن في الداتابيز.
     * تغييره بيخلي الفواتير الجديدة بكود مختلف عن القديمة — عشان كده
     * أي كود بيقرا المراجع لازم يستخدم parseInvoiceRef اللي بيعرف
     * البادئات القديمة والجديدة مع بعض.
     */
    invoicePrefixes: InvoicePrefixes;

    /** فلاجز سلوكية خارج الـ navigation */
    flags: ActivityFlags;
}

export interface ActivityFlags {
    /** يظهر جرس الإشعارات في الهيدر؟ */
    notifications: boolean;
}

/** بادئة من 3 حروف لكل نوع فاتورة */
export interface InvoicePrefixes {
    /** فاتورة بيع */
    sale: string;
    /** مرتجع بيع */
    saleReturn: string;
    /** فاتورة شراء */
    purchase: string;
    /** مرتجع شراء */
    purchaseReturn: string;
}

/** أنواع الفواتير اللي ليها كود — الاسم بيختلف بين prisma والطباعة */
export type InvoiceRefType =
    | 'sale' | 'sale_return' | 'sale-return'
    | 'purchase' | 'purchase_return' | 'purchase-return';
