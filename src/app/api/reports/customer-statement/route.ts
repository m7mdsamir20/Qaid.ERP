import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getInvoiceRef, getVoucherRef } from '@/lib/invoiceRef';
import { getActivity } from '@/modules';
import { roundMoney } from '@/lib/currency';
import { getPaidAtCreation } from '@/lib/invoicePayments';
import { getInstallmentPlanEntries, getPlanInvoiceIds } from '@/lib/installmentEntries';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const customerId = searchParams.get('customerId');

        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        if (!customerId) {
            const customers = await prisma.customer.findMany({
                where: { companyId },
                select: { id: true, name: true, balance: true, createdAt: true },
                orderBy: { name: 'asc' },
            });
            return NextResponse.json({ customers });
        }

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId },
        });
        if (!customer) {
            return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });
        }

        const isServices = getActivity((session.user as any).businessType).key === 'SERVICES';

        const branchId = searchParams.get('branchId');
        // الفواتير المعلّقة (قيد الاعتماد) مالهاش أثر على رصيد العميل لحد ما تتعتمد
        const invoiceWhere: any = { customerId, companyId, type: { in: ['sale', 'sale_return'] }, status: { not: 'pending' } };
        const voucherWhere: any = { customerId, companyId, type: { in: ['receipt', 'payment'] } };
        // خطط التقسيط مالهاش فرع (InstallmentPlan مفيهوش branchId)
        const planWhere: any = { customerId, companyId };

        if (branchId && branchId !== 'all') {
            invoiceWhere.branchId = branchId;
            voucherWhere.branchId = branchId;
        }

        const [rawInvoices, allVouchers, allPlans] = await Promise.all([
            prisma.invoice.findMany({
                where: invoiceWhere,
                orderBy: { date: 'asc' },
            }),
            prisma.voucher.findMany({
                where: voucherWhere,
                orderBy: { date: 'asc' },
            }),
            prisma.installmentPlan.findMany({
                where: planWhere,
                orderBy: { startDate: 'asc' },
                include: { installments: true },
            })
        ]);

        // فاتورة خطة التقسيط المخفية مابتتعرضش — الخطة نفسها بتظهر بقيمة العقد (وإلا تتحسب مرتين)
        const planInvoiceIds = getPlanInvoiceIds(allPlans);
        const allInvoices = rawInvoices.filter(inv => !planInvoiceIds.has(inv.id) && inv.paymentMethod !== 'installment_plan');
        const planEntries = getInstallmentPlanEntries(allPlans);

        // المدفوع/المسترد مع الفاتورة وقت إنشائها — رصيد العميل اتغيّر بالفاتورة ناقصه
        const paidAtCreation = await getPaidAtCreation(prisma, companyId, allInvoices);
        const paidOf = (id: string) => paidAtCreation.get(id) || 0;

        // Calculate System Opening Balance (Current Balance - Net Transactions)
        let totalNetTransacted = 0;
        allInvoices.forEach(inv => {
            if (inv.type === 'sale') totalNetTransacted += inv.total - paidOf(inv.id);
            if (inv.type === 'sale_return') totalNetTransacted -= inv.total - paidOf(inv.id);
        });
        allVouchers.forEach(v => {
            if (v.type === 'receipt') totalNetTransacted -= v.amount;
            if (v.type === 'payment') totalNetTransacted += v.amount;
        });
        planEntries.forEach(e => { totalNetTransacted += e.debit - e.credit; });
        // تقريب لأقرب هللة — الفواتير القديمة متخزنة بكسور أكتر من خانتين (زي 14190.765)
        // فبنقرّب مبلغ كل حركة قبل التجميع عشان الرصيد الجاري يطابق المبالغ المطبوعة
        const r2 = roundMoney;
        // الرصيد الافتتاحي للنظام بيتحسب بالمبالغ الخام لأن customer.balance اتجمّع بيها
        const initialSystemOpeningBalance = r2(customer.balance - totalNetTransacted);

        // Balance at Start of Period
        let balanceAtStartOfPeriod = initialSystemOpeningBalance;
        if (dateFrom) {
            const df = new Date(dateFrom);
            allInvoices.filter(i => new Date(i.date) < df).forEach(inv => {
                if (inv.type === 'sale') balanceAtStartOfPeriod += r2(inv.total) - paidOf(inv.id);
                if (inv.type === 'sale_return') balanceAtStartOfPeriod -= r2(inv.total) - paidOf(inv.id);
            });
            allVouchers.filter(v => new Date(v.date) < df).forEach(v => {
                if (v.type === 'receipt') balanceAtStartOfPeriod -= r2(v.amount);
                if (v.type === 'payment') balanceAtStartOfPeriod += r2(v.amount);
            });
            planEntries.filter(e => new Date(e.date) < df).forEach(e => {
                balanceAtStartOfPeriod += r2(e.debit) - r2(e.credit);
            });
        }
        balanceAtStartOfPeriod = r2(balanceAtStartOfPeriod);

        const periodEntries = [
            ...allInvoices.filter(inv => {
                const d = new Date(inv.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
                return true;
            }).flatMap(inv => [{
                id: inv.id,
                date: inv.date,
                type: inv.type === 'sale'
                    ? (isServices ? 'فاتورة خدمات' : 'فاتورة مبيعات')
                    : (isServices ? 'مرتجع خدمات' : 'مرتجع مبيعات'),
                ref: getInvoiceRef(inv.invoiceNumber, inv.type, (session.user as any).businessType),
                description: (inv.type === 'sale'
                    ? (isServices ? 'تقديم خدمات' : 'بيع بضاعة')
                    : (isServices ? 'مرتجع خدمات' : 'مرتجع بضاعة'))
                    + (inv.customerPONumber ? ` - PO: ${inv.customerPONumber}` : ''),
                debit: inv.type === 'sale' ? inv.total : 0,
                credit: inv.type === 'sale_return' ? inv.total : 0,
            },
            // سطر الدفعة اللي اتدفعت مع الفاتورة (أو المبلغ اللي اترد مع المرتجع)
            ...(paidOf(inv.id) > 0 ? [{
                id: `${inv.id}-paid`,
                date: inv.date,
                type: inv.type === 'sale' ? 'دفعة مع الفاتورة' : 'مبلغ مسترد',
                ref: getInvoiceRef(inv.invoiceNumber, inv.type, (session.user as any).businessType),
                description: inv.type === 'sale' ? 'سداد مع الفاتورة' : 'رد مبلغ للعميل مع المرتجع',
                debit: inv.type === 'sale_return' ? paidOf(inv.id) : 0,
                credit: inv.type === 'sale' ? paidOf(inv.id) : 0,
            }] : []),
            ]),
            ...allVouchers.filter(v => {
                const d = new Date(v.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
                return true;
            }).map(v => ({
                id: v.id,
                date: v.date,
                type: v.type === 'receipt' ? 'سند قبض' : 'سند صرف',
                ref: getVoucherRef(v.voucherNumber, v.type),
                description: v.description || (v.type === 'receipt' ? 'تحصيل دفعة من العميل' : 'صرف مبلغ للعميل'),
                debit: v.type === 'payment' ? v.amount : 0,
                credit: v.type === 'receipt' ? v.amount : 0,
            })),
            ...planEntries.filter(e => {
                const d = new Date(e.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
                return true;
            }),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let rb = balanceAtStartOfPeriod;
        const statement = periodEntries.map(e => {
            const debit = r2(e.debit), credit = r2(e.credit);
            rb = r2(rb + debit - credit);
            return { ...e, debit, credit, balance: rb };
        });

        return NextResponse.json({
            customer,
            statement,
            initialBalance: balanceAtStartOfPeriod,
            finalBalance: rb
        });
    } catch (error) {
        console.error("Customer Statement API Error:", error);
        return NextResponse.json({ error: "فشل في جلب كشف الحساب" }, { status: 500 });
    }
});

