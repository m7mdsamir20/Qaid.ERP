import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const vouchers = await prisma.voucher.findMany({
            where: { companyId },
            include: {
                treasury: { select: { name: true } },
                customer: { select: { name: true } },
                supplier: { select: { name: true } }
            },
            orderBy: { date: 'desc' },
        });

        const flowByDate: Record<string, { income: number; expense: number; label: string }> = {};
        vouchers.forEach(v => {
            const dateStr = new Date(v.date).toISOString().split('T')[0];
            if (!flowByDate[dateStr]) {
                flowByDate[dateStr] = { income: 0, expense: 0, label: dateStr };
            }
            if (v.type === 'receipt') {
                flowByDate[dateStr].income += v.amount;
            } else {
                flowByDate[dateStr].expense += v.amount;
            }
        });
        const totalIncome = vouchers.filter((v: any) => v.type === 'receipt').reduce((s: number, v: any) => s + v.amount, 0);
        const totalExpense = vouchers.filter((v: any) => v.type === 'payment').reduce((s: number, v: any) => s + v.amount, 0);

        return NextResponse.json({
            vouchers: vouchers.map((v: any) => ({
                id: v.id,
                voucherNumber: v.voucherNumber,
                type: v.type,
                date: v.date,
                party: v.customer?.name || v.supplier?.name || '—',
                treasury: v.treasury.name,
                amount: v.amount,
                paymentType: v.paymentType,
                description: v.description,
            })),
            totalIncome,
            totalExpense,
            netFlow: totalIncome - totalExpense,
            flowByDate: Object.values(flowByDate).sort((a: any, b: any) => a.label.localeCompare(b.label)).slice(-30),
        });
    } catch (error: any) {
        console.error("Cash Flow API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير التدفق النقدي" }, { status: 500 });
    }
});
