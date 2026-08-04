import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getActivity } from '@/modules';

/**
 * فحص صحة شجرة الحسابات.
 *
 * القيود التلقائية بتدوّر على حسابات بأكوادها. لو حساب ناقص، القيد
 * بيطلع ناقص طرف — ودلوقتي بقى بيترفض (شوف lib/journalGuard.ts).
 * النقطة دي بتقولك مقدماً إيه الناقص بدل ما تكتشفه لما فاتورة تفشل.
 *
 *   GET /api/accounts/health
 */

interface RequiredAccount {
    code: string;
    name: string;
    /** بيتستخدم في إيه */
    usedFor: string;
    /** للأنشطة دي بس — فاضي = كل الأنشطة */
    activities?: string[];
}

const REQUIRED: RequiredAccount[] = [
    { code: '1121', name: 'ذمم العملاء', usedFor: 'الطرف المدين في فاتورة البيع الآجلة' },
    { code: '1124', name: 'ذمم موردين مدينة', usedFor: 'مرتجع المشتريات' },
    { code: '2111', name: 'ذمم الموردين', usedFor: 'الطرف الدائن في فاتورة الشراء الآجلة' },
    { code: '2114', name: 'ضريبة القيمة المضافة', usedFor: 'الطرف الدائن للضريبة' },
    { code: '4100', name: 'إيرادات المبيعات', usedFor: 'إيراد فاتورة البيع', activities: ['TRADING', 'RETAIL', 'RESTAURANTS', 'CONTRACTING'] },
    { code: '4200', name: 'إيرادات الخدمات', usedFor: 'إيراد فاتورة الخدمة', activities: ['SERVICES'] },
    { code: '1131', name: 'المخزون', usedFor: 'الطرف الدائن لتكلفة البضاعة المباعة', activities: ['TRADING', 'RETAIL', 'RESTAURANTS', 'CONTRACTING'] },
    { code: '5100', name: 'تكلفة البضاعة المباعة', usedFor: 'الطرف المدين للتكلفة', activities: ['TRADING', 'RETAIL', 'RESTAURANTS', 'CONTRACTING'] },
];

export const GET = withProtection(async (_request, session) => {
    try {
        const user = session.user as any;
        const companyId = user.companyId;
        const activityKey = getActivity(user.businessType).key;

        const needed = REQUIRED.filter(r => !r.activities || r.activities.includes(activityKey));

        const existing = await prisma.account.findMany({
            where: { companyId, code: { in: needed.map(n => n.code) }, accountCategory: 'detail' },
            select: { code: true, name: true },
        });
        const haveCodes = new Set(existing.map(a => a.code));

        const missing = needed.filter(n => !haveCodes.has(n.code));

        // الخزن المربوطة بحسابات — الخزينة من غير حساب بتكسر القيد كمان
        const treasuries = await prisma.treasury.findMany({
            where: { companyId },
            select: { id: true, name: true, accountId: true },
        });
        const treasuriesWithoutAccount = treasuries
            .filter(t => !t.accountId)
            .map(t => ({ id: t.id, name: t.name }));

        // سنة مالية مفتوحة — من غيرها مفيش قيود أصلاً
        const openYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            select: { id: true, name: true },
        });

        const problems =
            missing.length + treasuriesWithoutAccount.length + (openYear ? 0 : 1);

        return NextResponse.json({
            activity: activityKey,
            healthy: problems === 0,
            problemCount: problems,
            missingAccounts: missing.map(m => ({
                code: m.code, name: m.name, usedFor: m.usedFor,
            })),
            treasuriesWithoutAccount,
            openFinancialYear: openYear?.name ?? null,
            hint: problems === 0
                ? 'شجرة الحسابات سليمة — القيود التلقائية هتشتغل صح.'
                : 'في نواقص هتخلي القيود التلقائية تترفض. أضف الحسابات الناقصة من شجرة الحسابات، واربط كل خزينة بحساب.',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || 'فشل الفحص' }, { status: 500 });
    }
});
