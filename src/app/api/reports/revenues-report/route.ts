import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) return NextResponse.json({ error: 'Company context is required' }, { status: 400 });

        const { searchParams } = new URL(request.url);
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (from && to && new Date(from) > new Date(to))
            return NextResponse.json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' }, { status: 400 });

        const where: { companyId: string; referenceType: string; date?: { gte?: Date; lte?: Date } } = {
            companyId,
            referenceType: 'other_income',
        };

        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from!);
            if (to) { const end = new Date(to!); end.setHours(23, 59, 59, 999); where.date.lte = end; }
        }

        const urlBranchId = new URL(request.url).searchParams.get('branchId');
        const branchFilter = (() => {
            if (urlBranchId && urlBranchId !== 'all') return { branchId: urlBranchId };
            const bf = getBranchFilter(session);
            if (bf.branchId) return { branchId: bf.branchId };
            return {};
        })();

        const entries = await prisma.journalEntry.findMany({
            where: { ...where, ...branchFilter },
            include: { lines: { include: { account: true } } },
            orderBy: { date: 'asc' },
        });

        const treasuries = await prisma.treasury.findMany({
            where: { companyId },
            select: { id: true, name: true, type: true },
        });

        const rows = entries.map(entry => {
            const creditLine = entry.lines.find(l => l.credit > 0 && l.account?.type === 'revenue');
            const amount = creditLine ? Number(creditLine.credit) : entry.lines.reduce((s, l) => s + Number(l.credit), 0);
            const revenueAccountName = creditLine?.account?.name || '—';

            let sourceName = '—';
            let sourceType = 'cash';
            if (entry.referenceId) {
                const tr = treasuries.find(t => t.id === entry.referenceId);
                if (tr) { sourceName = tr.name; sourceType = tr.type; }
            }

            return {
                id: entry.id,
                entryNumber: entry.entryNumber,
                date: entry.date,
                description: entry.description,
                revenueAccountName,
                sourceName,
                sourceType,
                amount,
            };
        });

        const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
        return NextResponse.json({ rows, totalAmount });
    } catch (error) {
        console.error('Revenues Report Error:', error);
        return NextResponse.json({ error: 'فشل في استخراج تقرير الإيرادات' }, { status: 500 });
    }
});
