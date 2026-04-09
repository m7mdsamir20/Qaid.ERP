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
        if (!customer) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

        // 1. Fetch all financial components
        const [invoices, vouchers] = await Promise.all([
            prisma.invoice.findMany({
                where: { customerId, companyId, type: { in: ['sale', 'sale_return'] } },
                orderBy: { date: 'asc' },
            }),
            prisma.voucher.findMany({
                where: { customerId, companyId, type: { in: ['receipt', 'payment'] } },
                orderBy: { date: 'asc' },
            }),
        ]);

        // 2. Build entries with clarity on payments
        const allEntries: any[] = [];

        invoices.forEach(inv => {
            // Entry for the invoice value
            allEntries.push({
                id: inv.id + '_inv',
                date: inv.date,
                realDate: inv.createdAt, // For precise sorting
                type: inv.type === 'sale' ? 'فاتورة مبيعات' : 'مرتجع مبيعات',
                ref: inv.type === 'sale' ? `SAL-${String(inv.invoiceNumber).padStart(5, '0')}` : `SRET-${String(inv.invoiceNumber).padStart(5, '0')}`,
                description: inv.type === 'sale' ? `بيع بضاعة (إجمالي الفاتورة)` : `مرتجع بضاعة (إجمالي الفاتورة)`,
                debit: inv.type === 'sale' ? inv.total : 0,
                credit: inv.type === 'sale_return' ? inv.total : 0,
            });

            // Entry for any immediate payment made on the invoice
            if (inv.paidAmount > 0) {
                allEntries.push({
                    id: inv.id + '_payment',
                    date: inv.date,
                    realDate: inv.createdAt, 
                    type: 'سداد فوري',
                    ref: inv.type === 'sale' ? `SAL-${String(inv.invoiceNumber).padStart(5, '0')}` : `SRET-${String(inv.invoiceNumber).padStart(5, '0')}`,
                    description: `دفعة نقدية مسددة مع الفاتورة`,
                    debit: 0,
                    credit: inv.paidAmount,
                });
            }
        });

        vouchers.forEach(v => {
            allEntries.push({
                id: v.id,
                date: v.date,
                realDate: v.createdAt,
                type: v.type === 'receipt' ? 'سند قبض' : 'سند صرف',
                ref: v.type === 'receipt' ? `RCP-${String(v.voucherNumber).padStart(5, '0')}` : `PMT-${String(v.voucherNumber).padStart(5, '0')}`,
                description: (v.type === 'receipt' ? 'قبض نقدي بموجب سند' : 'صرف نقدي بموجب سند') + (v.description ? ` - ${v.description}` : ''),
                debit: v.type === 'payment' ? v.amount : 0,
                credit: v.type === 'receipt' ? v.amount : 0,
            });
        });

        // Sort everything chronologically by date and then by creation time
        allEntries.sort((a, b) => {
            const dDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dDiff !== 0) return dDiff;
            return new Date(a.realDate).getTime() - new Date(b.realDate).getTime();
        });

        // 3. Calculate Opening Balance and Period Filtering
        let runningBalance = 0;
        const df = dateFrom ? new Date(dateFrom) : null;
        const dt = dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : null;

        // Calculate Balance Before Period
        let initialBalance = 0;
        const periodEntries: any[] = [];

        allEntries.forEach(e => {
            const entryDate = new Date(e.date);
            const isBefore = df && entryDate < df;
            const isInside = (!df || entryDate >= df) && (!dt || entryDate <= dt);

            if (isBefore) {
                initialBalance += (e.debit - e.credit);
            } else if (isInside) {
                periodEntries.push(e);
            }
        });

        // Construct final statement with running balance
        let currentRB = initialBalance;
        const statement = periodEntries.map(e => {
            currentRB += (e.debit - e.credit);
            return { ...e, balance: currentRB };
        });

        return NextResponse.json({
            customer,
            statement,
            initialBalance,
            finalBalance: currentRB,
            // To verify calculations match the live balance
            liveBalance: customer.balance
        });

    } catch (error) {
        console.error("Customer Statement API Error:", error);
        return NextResponse.json({ error: "فشل في جلب كشف الحساب" }, { status: 500 });
    }
});
