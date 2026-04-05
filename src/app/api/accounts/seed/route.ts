import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const DEFAULT_ACCOUNTS = [
    // ── 1000 الأصول
    { code: '1000', name: 'الأصول', nameEn: 'Assets', type: 'asset', category: 'summary', level: 1, parentCode: null },
    { code: '1100', name: 'الأصول المتداولة', nameEn: 'Current Assets', type: 'asset', category: 'summary', level: 2, parentCode: '1000' },
    { code: '1110', name: 'النقدية والبنوك', nameEn: 'Cash & Banks', type: 'asset', category: 'summary', level: 3, parentCode: '1100' },
    { code: '1111', name: 'الصندوق الرئيسي', nameEn: 'Main Cash', type: 'asset', category: 'detail', level: 4, parentCode: '1110' },
    { code: '1112', name: 'صندوق العمليات', nameEn: 'Operations Cash', type: 'asset', category: 'detail', level: 4, parentCode: '1110' },
    { code: '1113', name: 'الحسابات البنكية', nameEn: 'Bank Accounts', type: 'asset', category: 'detail', level: 4, parentCode: '1110' },
    { code: '1120', name: 'الذمم المدينة', nameEn: 'Accounts Receivable', type: 'asset', category: 'summary', level: 3, parentCode: '1100' },
    { code: '1121', name: 'العملاء', nameEn: 'Customers', type: 'asset', category: 'detail', level: 4, parentCode: '1120' },
    { code: '1122', name: 'أوراق القبض', nameEn: 'Notes Receivable', type: 'asset', category: 'detail', level: 4, parentCode: '1120' },
    { code: '1123', name: 'مدينون متنوعون', nameEn: 'Sundry Debtors', type: 'asset', category: 'detail', level: 4, parentCode: '1120' },
    { code: '1124', name: 'ضريبة القيمة المضافة المدفوعة', nameEn: 'Paid VAT', type: 'asset', category: 'detail', level: 4, parentCode: '1120' },
    { code: '1130', name: 'المخزون', nameEn: 'Inventory', type: 'asset', category: 'summary', level: 3, parentCode: '1100' },
    { code: '1131', name: 'مخزون البضائع', nameEn: 'Goods Inventory', type: 'asset', category: 'detail', level: 4, parentCode: '1130' },
    { code: '1132', name: 'مخزون المواد الخام', nameEn: 'Raw Materials', type: 'asset', category: 'detail', level: 4, parentCode: '1130' },
    { code: '1133', name: 'مخزون المنتجات تامة الصنع', nameEn: 'Finished Goods', type: 'asset', category: 'detail', level: 4, parentCode: '1130' },
    { code: '1140', name: 'أصول متداولة أخرى', nameEn: 'Other Current Assets', type: 'asset', category: 'summary', level: 3, parentCode: '1100' },
    { code: '1141', name: 'المصروفات المدفوعة مقدماً', nameEn: 'Prepaid Expenses', type: 'asset', category: 'detail', level: 4, parentCode: '1140' },
    { code: '1142', name: 'الضرائب المدفوعة مقدماً', nameEn: 'Prepaid Taxes', type: 'asset', category: 'detail', level: 4, parentCode: '1140' },
    { code: '1143', name: 'سلف الموظفين', nameEn: 'Employee Advances', type: 'asset', category: 'detail', level: 4, parentCode: '1140' },
    { code: '1200', name: 'الأصول الثابتة', nameEn: 'Fixed Assets', type: 'asset', category: 'summary', level: 2, parentCode: '1000' },
    { code: '1210', name: 'الأراضي والمباني', nameEn: 'Land & Buildings', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1220', name: 'السيارات والمركبات', nameEn: 'Vehicles', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1230', name: 'الأجهزة والمعدات', nameEn: 'Equipment', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1240', name: 'الحاسبات والبرمجيات', nameEn: 'Computers & Software', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1250', name: 'الأثاث والمفروشات', nameEn: 'Furniture & Fixtures', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1260', name: 'مجمع إهلاك الأصول الثابتة', nameEn: 'Accumulated Depreciation', type: 'asset', category: 'detail', level: 3, parentCode: '1200' },
    { code: '1300', name: 'الأصول غير الملموسة', nameEn: 'Intangible Assets', type: 'asset', category: 'summary', level: 2, parentCode: '1000' },
    { code: '1310', name: 'الشهرة', nameEn: 'Goodwill', type: 'asset', category: 'detail', level: 3, parentCode: '1300' },
    { code: '1320', name: 'براءات الاختراع والعلامات', nameEn: 'Patents & Trademarks', type: 'asset', category: 'detail', level: 3, parentCode: '1300' },

    // ── 2000 الخصوم
    { code: '2000', name: 'الخصوم', nameEn: 'Liabilities', type: 'liability', category: 'summary', level: 1, parentCode: null },
    { code: '2100', name: 'الخصوم المتداولة', nameEn: 'Current Liabilities', type: 'liability', category: 'summary', level: 2, parentCode: '2000' },
    { code: '2110', name: 'الذمم الدائنة', nameEn: 'Accounts Payable', type: 'liability', category: 'summary', level: 3, parentCode: '2100' },
    { code: '2111', name: 'الموردون', nameEn: 'Suppliers', type: 'liability', category: 'detail', level: 4, parentCode: '2110' },
    { code: '2112', name: 'أوراق الدفع', nameEn: 'Notes Payable', type: 'liability', category: 'detail', level: 4, parentCode: '2110' },
    { code: '2113', name: 'دائنون متنوعون', nameEn: 'Sundry Creditors', type: 'liability', category: 'detail', level: 4, parentCode: '2110' },
    { code: '2114', name: 'ضريبة القيمة المضافة المحصلة', nameEn: 'Collected VAT', type: 'liability', category: 'detail', level: 4, parentCode: '2110' },
    { code: '2120', name: 'خصوم متداولة أخرى', nameEn: 'Other Current Liabilities', type: 'liability', category: 'summary', level: 3, parentCode: '2100' },
    { code: '2121', name: 'المصروفات المستحقة', nameEn: 'Accrued Expenses', type: 'liability', category: 'detail', level: 4, parentCode: '2120' },
    { code: '2122', name: 'الإيرادات المقدمة', nameEn: 'Deferred Revenue', type: 'liability', category: 'detail', level: 4, parentCode: '2120' },
    { code: '2123', name: 'الضرائب المستحقة', nameEn: 'Taxes Payable', type: 'liability', category: 'detail', level: 4, parentCode: '2120' },
    { code: '2124', name: 'رواتب مستحقة', nameEn: 'Salaries Payable', type: 'liability', category: 'detail', level: 4, parentCode: '2120' },
    { code: '2125', name: 'القروض قصيرة الأجل', nameEn: 'Short-term Loans', type: 'liability', category: 'detail', level: 4, parentCode: '2120' },
    { code: '2200', name: 'الخصوم طويلة الأجل', nameEn: 'Long-term Liabilities', type: 'liability', category: 'summary', level: 2, parentCode: '2000' },
    { code: '2210', name: 'القروض طويلة الأجل', nameEn: 'Long-term Loans', type: 'liability', category: 'detail', level: 3, parentCode: '2200' },
    { code: '2220', name: 'السندات', nameEn: 'Bonds Payable', type: 'liability', category: 'detail', level: 3, parentCode: '2200' },

    // ── 3000 حقوق الملكية
    { code: '3000', name: 'حقوق الملكية', nameEn: 'Equity', type: 'equity', category: 'summary', level: 1, parentCode: null },
    { code: '3100', name: 'رأس المال', nameEn: 'Capital', type: 'equity', category: 'detail', level: 2, parentCode: '3000' },
    { code: '3200', name: 'حسابات الشركاء', nameEn: 'Partners Accounts', type: 'equity', category: 'detail', level: 2, parentCode: '3000' },
    { code: '3300', name: 'الاحتياطيات', nameEn: 'Reserves', type: 'equity', category: 'summary', level: 2, parentCode: '3000' },
    { code: '3310', name: 'احتياطي قانوني', nameEn: 'Legal Reserve', type: 'equity', category: 'detail', level: 3, parentCode: '3300' },
    { code: '3320', name: 'احتياطي اختياري', nameEn: 'Optional Reserve', type: 'equity', category: 'detail', level: 3, parentCode: '3300' },
    { code: '3400', name: 'الأرباح المرحلة', nameEn: 'Retained Earnings', type: 'equity', category: 'detail', level: 2, parentCode: '3000' },
    { code: '3500', name: 'أرباح وخسائر العام الحالي', nameEn: 'Current Year P&L', type: 'equity', category: 'detail', level: 2, parentCode: '3000' },
    { code: '3600', name: 'توزيعات الأرباح', nameEn: 'Dividends', type: 'equity', category: 'detail', level: 2, parentCode: '3000' },

    // ── 4000 الإيرادات
    { code: '4000', name: 'الإيرادات', nameEn: 'Revenue', type: 'revenue', category: 'summary', level: 1, parentCode: null },
    { code: '4100', name: 'إيرادات المبيعات', nameEn: 'Sales Revenue', type: 'revenue', category: 'detail', level: 2, parentCode: '4000' },
    { code: '4200', name: 'إيرادات الخدمات', nameEn: 'Service Revenue', type: 'revenue', category: 'detail', level: 2, parentCode: '4000' },
    { code: '4300', name: 'إيرادات أخرى', nameEn: 'Other Revenue', type: 'revenue', category: 'summary', level: 2, parentCode: '4000' },
    { code: '4310', name: 'إيرادات فوائد', nameEn: 'Interest Income', type: 'revenue', category: 'detail', level: 3, parentCode: '4300' },
    { code: '4320', name: 'أرباح بيع أصول', nameEn: 'Gain on Asset Disposal', type: 'revenue', category: 'detail', level: 3, parentCode: '4300' },
    { code: '4330', name: 'إيرادات متنوعة', nameEn: 'Miscellaneous Income', type: 'revenue', category: 'detail', level: 3, parentCode: '4300' },

    // ── 5000 المصروفات
    { code: '5000', name: 'المصروفات', nameEn: 'Expenses', type: 'expense', category: 'summary', level: 1, parentCode: null },
    { code: '5100', name: 'تكلفة المبيعات', nameEn: 'Cost of Goods Sold', type: 'expense', category: 'detail', level: 2, parentCode: '5000' },
    { code: '5200', name: 'المصروفات الإدارية والعمومية', nameEn: 'General & Admin Expenses', type: 'expense', category: 'summary', level: 2, parentCode: '5000' },
    { code: '5210', name: 'الرواتب والأجور', nameEn: 'Salaries & Wages', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5220', name: 'مكافآت وحوافز', nameEn: 'Bonuses & Incentives', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5230', name: 'الإيجارات', nameEn: 'Rent', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5240', name: 'الكهرباء والمياه', nameEn: 'Utilities', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5250', name: 'الاتصالات والإنترنت', nameEn: 'Communications & Internet', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5260', name: 'مصروفات المكتب والقرطاسية', nameEn: 'Office & Stationery', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5270', name: 'التأمينات', nameEn: 'Insurance', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5280', name: 'الرسوم والاشتراكات', nameEn: 'Fees & Subscriptions', type: 'expense', category: 'detail', level: 3, parentCode: '5200' },
    { code: '5300', name: 'مصروفات التشغيل والمبيعات', nameEn: 'Operating & Sales Expenses', type: 'expense', category: 'summary', level: 2, parentCode: '5000' },
    { code: '5310', name: 'مصروفات النقل والتوصيل', nameEn: 'Delivery & Transport', type: 'expense', category: 'detail', level: 3, parentCode: '5300' },
    { code: '5320', name: 'مصروفات الصيانة والإصلاح', nameEn: 'Maintenance & Repairs', type: 'expense', category: 'detail', level: 3, parentCode: '5300' },
    { code: '5330', name: 'مصروفات التسويق والإعلان', nameEn: 'Marketing & Advertising', type: 'expense', category: 'detail', level: 3, parentCode: '5300' },
    { code: '5340', name: 'عمولات المبيعات', nameEn: 'Sales Commissions', type: 'expense', category: 'detail', level: 3, parentCode: '5300' },
    { code: '5400', name: 'المصروفات المالية', nameEn: 'Financial Expenses', type: 'expense', category: 'summary', level: 2, parentCode: '5000' },
    { code: '5410', name: 'فوائد القروض', nameEn: 'Loan Interest', type: 'expense', category: 'detail', level: 3, parentCode: '5400' },
    { code: '5420', name: 'مصروفات بنكية', nameEn: 'Bank Charges', type: 'expense', category: 'detail', level: 3, parentCode: '5400' },
    { code: '5430', name: 'خسائر فروق العملة', nameEn: 'Currency Exchange Loss', type: 'expense', category: 'detail', level: 3, parentCode: '5400' },
    { code: '5500', name: 'مصروفات الإهلاك', nameEn: 'Depreciation Expense', type: 'expense', category: 'detail', level: 2, parentCode: '5000' },
    { code: '5600', name: 'مصروفات أخرى', nameEn: 'Other Expenses', type: 'expense', category: 'summary', level: 2, parentCode: '5000' },
    { code: '5610', name: 'خسائر بيع أصول', nameEn: 'Loss on Asset Disposal', type: 'expense', category: 'detail', level: 3, parentCode: '5600' },
    { code: '5620', name: 'مصروفات متنوعة', nameEn: 'Miscellaneous Expenses', type: 'expense', category: 'detail', level: 3, parentCode: '5600' },
];

const natureMap: Record<string, string> = {
    asset: 'debit', 
    expense: 'debit',
    liability: 'credit', 
    equity: 'credit', 
    revenue: 'credit',
};

export async function seedDefaultAccounts(companyId: string) {
    const current = await prisma.account.findMany({ 
        where: { companyId },
        select: { code: true, id: true }
    });
    
    const existingCodes = new Set(current.map(a => a.code));
    const missing = DEFAULT_ACCOUNTS.filter(a => !existingCodes.has(a.code));

    if (missing.length === 0) return { skipped: true, count: current.length, added: 0 };

    const codeToId = new Map<string, string>();
    current.forEach(a => codeToId.set(a.code, a.id));

    // إنشاء كل الحسابات في batch واحد بدل loop
    await prisma.account.createMany({
        data: missing.map(acc => ({
            code: acc.code,
            name: acc.name,
            nameEn: acc.nameEn,
            nature: natureMap[acc.type],
            type: acc.type,
            accountCategory: acc.category,
            level: acc.level,
            isParent: acc.category === 'summary',
            parentId: null,
            companyId,
        })),
        skipDuplicates: true,
    });

    // جيب الـ IDs الجديدة في query واحد
    const newAccounts = await prisma.account.findMany({
        where: { companyId, code: { in: missing.map(a => a.code) } },
        select: { code: true, id: true }
    });
    newAccounts.forEach(a => codeToId.set(a.code, a.id));

    // تحديث الـ parentId في batch بدل loop
    const parentUpdates = missing
        .filter(acc => acc.parentCode && codeToId.get(acc.code) && codeToId.get(acc.parentCode))
        .map(acc => prisma.account.update({
            where: { id: codeToId.get(acc.code)! },
            data: { parentId: codeToId.get(acc.parentCode!)! }
        }));
    await Promise.all(parentUpdates);

    return { skipped: false, count: current.length + missing.length, added: missing.length, missingNames: missing.map(m => m.name) };
}

export const POST = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const searchParams = new URL(request.url).searchParams;
        const force = searchParams.get('force') === 'true';
        const checkOnly = searchParams.get('check') === 'true';

        const currentAccounts = await prisma.account.findMany({ 
            where: { companyId }, 
            select: { code: true, name: true } 
        });
        const existingCodes = new Set(currentAccounts.map(a => a.code));
        const missing = DEFAULT_ACCOUNTS.filter(a => !existingCodes.has(a.code));

        if (checkOnly) {
            return NextResponse.json({
                totalDefault: DEFAULT_ACCOUNTS.length,
                existing: currentAccounts.length,
                missingCount: missing.length,
                missingList: missing.map(m => m.name),
                isComplete: missing.length === 0
            });
        }

        if (force && currentAccounts.length > 0) {
            const hasEntries = await prisma.journalEntryLine.findFirst({
                where: { account: { companyId } }
            });
            if (hasEntries) {
                return NextResponse.json({ error: 'لا يمكن مسح الشجرة بالكامل نظراً لوجود قيود محاسبية مسجلة. يرجى مسح القيود أولاً.' }, { status: 400 });
            }
            await prisma.account.deleteMany({ where: { companyId } });
            const result = await seedDefaultAccounts(companyId);
            return NextResponse.json({
                message: `تم حذف الشجرة القديمة وتهيئة ${result.added} حساب جديد بنجاح`,
                count: result.added
            });
        }

        const result = await seedDefaultAccounts(companyId);
        
        if (result.added === 0) {
            return NextResponse.json({ 
                message: 'شجرة الحسابات موجودة بالفعل وكاملة. لا حاجة لإضافة حسابات جديدة.',
                isComplete: true
            });
        }

        return NextResponse.json({
            message: `تم إضافة ${result.added} حساب مفقود إلى الشجرة بنجاح.`,
            count: result.count,
            added: result.added,
            missingNames: result.missingNames
        });

    } catch (e: any) {
        console.error('SEED ERROR:', e);
        return NextResponse.json({ error: 'فشل في تحديث الحسابات' }, { status: 500 });
    }
});
