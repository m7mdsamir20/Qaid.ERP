import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id: treasuryId } = await context.params;

        const from = request.nextUrl.searchParams.get('from');
        const to = request.nextUrl.searchParams.get('to');

        const vouchers = await prisma.voucher.findMany({
            where: {
                companyId,
                treasuryId,
                date: {
                    ...(from ? { gte: new Date(from) } : {}),
                    ...(to ? { lte: new Date(to) } : {}),
                }
            },
            orderBy: { date: 'desc' },
        });

        const transactions = vouchers.map(v => ({
            id: v.id,
            date: v.date.toISOString(),
            description: v.description || (v.type === 'receipt' ? 'سند قبض' : 'سند صرف'),
            type: v.type === 'receipt' ? 'credit' : 'debit',
            amount: v.amount,
            reference: v.voucherNumber ? String(v.voucherNumber) : '',
            isReconciled: (v as any).isReconciled || false,
        }));

        return NextResponse.json(transactions);
    } catch (e: any) {
        console.error("Treasury Transactions Error:", e);
        return NextResponse.json({ error: "فشل في تحميل الحركات" }, { status: 500 });
    }
});
