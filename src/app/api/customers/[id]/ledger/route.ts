import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id: customerId } = await context.params;

        const dateFrom = request.nextUrl.searchParams.get('from');
        const dateTo = request.nextUrl.searchParams.get('to');

        let dateFilter = {};
        if (dateFrom && dateTo) {
            dateFilter = {
                date: {
                    gte: new Date(dateFrom),
                    lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999))
                }
            };
        }

        const customer = await prisma.customer.findFirst({
            where: { id: customerId, companyId }
        });

        if (!customer) {
            return NextResponse.json({ error: "العميل غير موجود أو غير تابع للشركة" }, { status: 404 });
        }

        const [invoices, vouchers] = await Promise.all([
            prisma.invoice.findMany({
                where: { customerId, companyId, ...dateFilter },
                orderBy: { date: 'asc' }
            }),
            prisma.voucher.findMany({
                where: { customerId, companyId, ...dateFilter },
                orderBy: { date: 'asc' }
            })
        ]);

        // Calculate opening balance for the period
        let priorInvoices: any[] = [];
        let priorVouchers: any[] = [];

        if (dateFrom) {
            [priorInvoices, priorVouchers] = await Promise.all([
                prisma.invoice.findMany({
                    where: { customerId, companyId, date: { lt: new Date(dateFrom) } }
                }),
                prisma.voucher.findMany({
                    where: { customerId, companyId, date: { lt: new Date(dateFrom) } }
                })
            ]);
        }

        const transactions: any[] = [];

        // Map invoices to transactions
        invoices.forEach(inv => {
            if (inv.type === 'sale') {
                transactions.push({
                    id: inv.id,
                    date: inv.date,
                    type: 'invoice',
                    ref: inv.invoiceNumber,
                    description: `فاتورة مبيعات رقم ${inv.invoiceNumber}`,
                    debit: inv.total,
                    credit: 0,
                });
                if (inv.paidAmount > 0) {
                    transactions.push({
                        id: inv.id + '_paid',
                        date: inv.date,
                        type: 'payment',
                        ref: inv.invoiceNumber,
                        description: `دفعة نقدية مع فاتورة ${inv.invoiceNumber}`,
                        debit: 0,
                        credit: inv.paidAmount,
                    });
                }
            } else if (inv.type === 'sale_return') {
                transactions.push({
                    id: inv.id,
                    date: inv.date,
                    type: 'return',
                    ref: inv.invoiceNumber,
                    description: `مرتجع مبيعات رقم ${inv.invoiceNumber}`,
                    debit: 0,
                    credit: inv.total,
                });
                if (inv.paidAmount > 0) {
                    transactions.push({
                        id: inv.id + '_paid_return',
                        date: inv.date,
                        type: 'refund',
                        ref: inv.invoiceNumber,
                        description: `دفعة مستردة لمعاملة مرتجع ${inv.invoiceNumber}`,
                        debit: inv.paidAmount,
                        credit: 0,
                    });
                }
            }
        });

        // Map vouchers to transactions
        vouchers.forEach(v => {
            if (v.type === 'receipt') {
                transactions.push({
                    id: v.id,
                    date: v.date,
                    type: 'receipt',
                    ref: v.voucherNumber,
                    description: `سند قبض رقم ${v.voucherNumber} ${v.description ? '- ' + v.description : ''}`,
                    debit: 0,
                    credit: v.amount,
                });
            } else if (v.type === 'payment') {
                transactions.push({
                    id: v.id,
                    date: v.date,
                    type: 'payment',
                    ref: v.voucherNumber,
                    description: `سند صرف رقم ${v.voucherNumber} ${v.description ? '- ' + v.description : ''}`,
                    debit: v.amount,
                    credit: 0,
                });
            }
        });

        // Work backwards from current balance to find initial opening balance
        const [allInvoices, allVouchers] = await Promise.all([
            prisma.invoice.findMany({ where: { customerId, companyId } }),
            prisma.voucher.findMany({ where: { customerId, companyId } })
        ]);

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

        // Calculate balance at start of requested period
        let balanceAtStartOfPeriod = initialSystemOpeningBalance;
        priorInvoices.forEach(inv => {
            if (inv.type === 'sale') balanceAtStartOfPeriod += (inv.total - inv.paidAmount);
            if (inv.type === 'sale_return') balanceAtStartOfPeriod -= (inv.total - inv.paidAmount);
        });
        priorVouchers.forEach(v => {
            if (v.type === 'receipt') balanceAtStartOfPeriod -= v.amount;
            if (v.type === 'payment') balanceAtStartOfPeriod += v.amount;
        });

        // Sort and calculate running balances
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = balanceAtStartOfPeriod;
        const ledger = transactions.map(t => {
            runningBalance += (t.debit - t.credit);
            return {
                ...t,
                balance: runningBalance
            };
        });

        return NextResponse.json({
            customer,
            initialBalance: balanceAtStartOfPeriod,
            ledger,
            finalBalance: runningBalance,
        });

    } catch (error: any) {
        console.error("Customer Ledger API Error:", error);
        return NextResponse.json({ error: "حدث خطأ أثناء جلب كشف الحساب" }, { status: 500 });
    }
});
