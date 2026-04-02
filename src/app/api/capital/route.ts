import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const partners = await prisma.partner.findMany({
            where: { companyId },
            include: {
                transactions: {
                    where: { type: { in: ['capital_increase', 'capital_decrease'] } },
                    orderBy: { date: 'desc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(partners.map(p => ({
            ...p,
            changes: p.transactions.map(t => ({
                id: t.id,
                type: t.type === 'capital_increase' ? 'increase' : 'decrease',
                amount: t.amount,
                date: t.date,
                notes: t.notes,
            })),
        })));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        const { partnerId, type, amount, date, notes } = body;
        if (!partnerId || !amount) return NextResponse.json({ error: 'البيانات ناقصة' }, { status: 400 });

        const amountNum = parseFloat(amount);
        const txType = type === 'increase' ? 'capital_increase' : 'capital_decrease';
        const capitalDelta = type === 'increase' ? amountNum : -amountNum;

        await prisma.$transaction([
            prisma.partnerTransaction.create({
                data: {
                    type: txType,
                    amount: amountNum,
                    date: new Date(date || new Date()),
                    notes: notes || null,
                    partnerId,
                    companyId,
                },
            }),
            prisma.partner.update({
                where: { id: partnerId },
                data: { capital: { increment: capitalDelta } },
            }),
        ]);

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
});
