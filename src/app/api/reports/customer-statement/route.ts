import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
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

        const [allInvoices, allVouchers] = await Promise.all([
            prisma.invoice.findMany({
                where: { customerId, companyId, type: { in: ['sale', 'sale_return'] } },
                orderBy: { date: 'asc' },
            }),
            prisma.voucher.findMany({
                where: { customerId, companyId, type: { in: ['receipt', 'payment'] } },
                orderBy: { date: 'asc' },
            }),
        ]);

        // Calculate System Opening Balance (Current Balance - Net Transactions)
        let totalNetTransacted = 0;
        allInvoices.forEach(inv => {
            if (inv.type === 'sale') totalNetTransacted += (inv.total - inv.paidAmount);
            if (inv.type === 'sale_return') totalNetTransacted -= (inv.total - inv.paidAmount);
        });
        allVouchers.forEach(v => {
            if (v.type === 'receipt') totalNetTransacted -= v.amount;
            if (v.type === 'payment') totalNetTransacted += v.amount;
        });
        const initialSystemOpeningBalance = customer.balance - totalNetTransacted;

        // Balance at Start of Period
        let balanceAtStartOfPeriod = initialSystemOpeningBalance;
        if (dateFrom) {
            const df = new Date(dateFrom);
            allInvoices.filter(i => new Date(i.date) < df).forEach(inv => {
                if (inv.type === 'sale') balanceAtStartOfPeriod += (inv.total - inv.paidAmount);
                if (inv.type === 'sale_return') balanceAtStartOfPeriod -= (inv.total - inv.paidAmount);
            });
            allVouchers.filter(v => new Date(v.date) < df).forEach(v => {
                if (v.type === 'receipt') balanceAtStartOfPeriod -= v.amount;
                if (v.type === 'payment') balanceAtStartOfPeriod += v.amount;
            });
        }

        const periodEntries = [
            ...allInvoices.filter(inv => {
                const d = new Date(inv.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23,59,59,999))) return false;
                return true;
            }).map(inv => ({
                id: inv.id,
                date: inv.date,
                type: inv.type === 'sale' ? 'فاتورة مبيعات' : 'مرتجع مبيعات',
                ref: inv.type === 'sale' ? `SAL-${String(inv.invoiceNumber).padStart(5, '0')}` : `SRET-${String(inv.invoiceNumber).padStart(5, '0')}`,
                description: inv.type === 'sale' ? 'بيع بضاعة فاتورة' : 'مرتجع بضاعة فاتورة',
                debit: inv.type === 'sale' ? inv.total : 0,
                credit: inv.type === 'sale_return' ? inv.total : 0,
            })),
            ...allVouchers.filter(v => {
                const d = new Date(v.date);
                if (dateFrom && d < new Date(dateFrom)) return false;
                if (dateTo && d > new Date(new Date(dateTo).setHours(23,59,59,999))) return false;
                return true;
            }).map(v => ({
                id: v.id,
                date: v.date,
                type: v.type === 'receipt' ? 'سند قبض' : 'سند صرف',
                ref: v.type === 'receipt' ? `RCP-${String(v.voucherNumber).padStart(5, '0')}` : `PMT-${String(v.voucherNumber).padStart(5, '0')}`,
                description: (v.type === 'receipt' ? 'سند قبض' : 'سند صرف') + (v.description ? ` - ${v.description}` : ''),
                debit: v.type === 'payment' ? v.amount : 0,
                credit: v.type === 'receipt' ? v.amount : 0,
            })),
        ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let rb = balanceAtStartOfPeriod;
        const statement = periodEntries.map(e => {
            rb += (e.debit - e.credit);
            return { ...e, balance: rb };
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
