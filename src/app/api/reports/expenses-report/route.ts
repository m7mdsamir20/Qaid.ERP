import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }, { status: 400 });
        }

        const where: {
            companyId: string;
            referenceType: string;
            date?: { gte?: Date; lte?: Date };
        } = {
            companyId,
            referenceType: 'other_expense',
        };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from!);
            if (to) {
                const end = new Date(to!);
                end.setHours(23, 59, 59, 999);
                where.date.lte = end;
            }
        }

        const entries = await prisma.journalEntry.findMany({
            where,
            include: {
                lines: { include: { account: true } },
            },
            orderBy: { date: 'asc' },
        });

        const treasuries = await prisma.treasury.findMany({
            where: { companyId },
            select: { id: true, name: true, type: true },
        });

        const rows = entries.map(entry => {
            const debitLine = entry.lines.find(l => l.debit > 0);
            const amount = debitLine ? Number(debitLine.debit) : 0;
            const expenseAccountName = debitLine?.account?.name || '—';

            let sourceName = '—';
            let sourceType = 'cash';
            if (entry.referenceId) {
                const t = treasuries.find(t => t.id === entry.referenceId);
                if (t) { sourceName = t.name; sourceType = t.type; }
            }

            return {
                id: entry.id,
                entryNumber: entry.entryNumber,
                date: entry.date,
                description: entry.description,
                expenseAccountName,
                sourceName,
                sourceType,
                amount,
            };
        });

        const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

        return NextResponse.json({ rows, totalAmount });
    } catch (error) {
        console.error('Expenses Report Error:', error);
        return NextResponse.json({ error: 'فشل في استخراج تقرير المصروفات' }, { status: 500 });
    }
});

