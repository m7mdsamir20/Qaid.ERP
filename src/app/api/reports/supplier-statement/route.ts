import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const supplierId = searchParams.get('supplierId');
        const dateFrom = searchParams.get('from');
        const dateTo = searchParams.get('to');

        if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        if (!supplierId) {
            const suppliers = await prisma.supplier.findMany({
                where: { companyId },
                select: { id: true, name: true, balance: true, createdAt: true },
                orderBy: { name: 'asc' },
            });
            return NextResponse.json({ suppliers });
        }

        const supplier = await prisma.supplier.findFirst({
            where: { id: supplierId, companyId },
        });
        if (!supplier) {
            return NextResponse.json({ error: "المورد غير موجود" }, { status: 404 });
        }

        // Fetch all transactions to calculate the real opening balance if filtered
        const [allInvoices, allVouchers] = await Promise.all([
            prisma.invoice.findMany({
                where: { supplierId, companyId, type: { in: ['purchase', 'purchase_return'] } },
                orderBy: { date: 'asc' },
            }),
            prisma.voucher.findMany({
                where: { supplierId, companyId, type: { in: ['receipt', 'payment'] } },
                orderBy: { date: 'asc' },
            }),
        ]);

        // Calculate System Opening Balance
        let totalNetTransacted = 0;
        allInvoices.forEach(inv => {
            if (inv.type === 'purchase') totalNetTransacted += (inv.total - inv.paidAmount);
            if (inv.type === 'purchase_return') totalNetTransacted -= (inv.total - inv.paidAmount);
        });
        allVouchers.forEach(v => {
            if (v.type === 'receipt') totalNetTransacted += v.amount;
            if (v.type === 'payment') totalNetTransacted -= v.amount;
        });

        const initialSystemOpeningBalance = supplier.balance - totalNetTransacted;

        // Calculate balance before dateFrom
        let balanceAtStartOfPeriod = initialSystemOpeningBalance;
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            allInvoices.filter(inv => new Date(inv.date) < fromDate).forEach(inv => {
                if (inv.type === 'purchase') balanceAtStartOfPeriod += (inv.total - inv.paidAmount);
                if (inv.type === 'purchase_return') balanceAtStartOfPeriod -= (inv.total - inv.paidAmount);
            });
            allVouchers.filter(v => new Date(v.date) < fromDate).forEach(v => {
                if (v.type === 'receipt') balanceAtStartOfPeriod += v.amount;
                if (v.type === 'payment') balanceAtStartOfPeriod -= v.amount;
            });
        }

        // Filter period transactions
        const periodEntries = [
            ...allInvoices.filter(inv => {
                const d = new Date(inv.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
                return true;
            }).map(inv => ({
                id: inv.id,
                date: inv.date,
                type: inv.type === 'purchase' ? 'فاتورة مشتريات' : 'مرتجع مشتريات',
                ref: inv.type === 'purchase' ? `PUR-${String(inv.invoiceNumber).padStart(5, '0')}` : `PRET-${String(inv.invoiceNumber).padStart(5, '0')}`,
                description: inv.type === 'purchase' ? 'شراء بضاعة فاتورة' : 'مرتجع بضاعة فاتورة',
                debit: inv.type === 'purchase_return' ? inv.total : 0,
                credit: inv.type === 'purchase' ? inv.total : 0,
                paid: inv.paidAmount
            })),
            ...allVouchers.filter(v => {
                const d = new Date(v.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
                return true;
            }).map(v => ({
                id: v.id,
                date: v.date,
                type: v.type === 'payment' ? 'سند صرف' : 'سند قبض',
                ref: v.type === 'payment' ? `PMT-${String(v.voucherNumber).padStart(5, '0')}` : `RCP-${String(v.voucherNumber).padStart(5, '0')}`,
                description: (v.type === 'payment' ? 'سند صرف' : 'سند قبض') + (v.description ? ` - ${v.description}` : ''),
                debit: v.type === 'payment' ? v.amount : 0,
                credit: v.type === 'receipt' ? v.amount : 0,
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = balanceAtStartOfPeriod;
        const statement = periodEntries.map(e => {
            runningBalance += (e.credit - e.debit);
            return { ...e, balance: runningBalance };
        });

        return NextResponse.json({ 
            supplier, 
            statement, 
            initialBalance: balanceAtStartOfPeriod,
            finalBalance: runningBalance 
        });
    } catch (error) {
        console.error("Supplier Statement API Error:", error);
        return NextResponse.json({ error: "فشل في جلب كشف الحساب" }, { status: 500 });
    }
});
