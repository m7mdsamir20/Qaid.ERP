import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const { searchParams } = new URL(request.url);
        const financialYearId = searchParams.get('financialYearId');

        const entries = await prisma.journalEntry.findMany({
            where: { 
                companyId,
                ...(financialYearId ? { financialYearId } : {}),
            },
            include: {
                lines: { include: { account: true, costCenter: true } },
                financialYear: true,
            },
            orderBy: { date: 'desc' },
        });
        return NextResponse.json(entries);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // 1. Basic validation
        if (!body.date || !body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
            return NextResponse.json({ error: 'البيانات غير مكتملة أو عدد أطراف القيد أقل من 2' }, { status: 400 });
        }

        // 2. Balance validation
        const totalDebit = body.lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
        const totalCredit = body.lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            return NextResponse.json({ error: 'القيد غير متزن' }, { status: 400 });
        }

        // 3. Find open financial year for this company
        const financialYear = await prisma.financialYear.findFirst({
            where: {
                companyId: companyId,
                isOpen: true,
                startDate: { lte: new Date(body.date) },
                endDate: { gte: new Date(body.date) },
            },
        });

        if (!financialYear) {
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة لهذا التاريخ' }, { status: 400 });
        }

        // 4. Create transaction (entry number generated inside to prevent race conditions)
        const entry = await prisma.$transaction(async (tx) => {
            const lastEntry = await tx.journalEntry.findFirst({
                where: { financialYearId: financialYear.id },
                orderBy: { entryNumber: 'desc' },
            });
            const nextEntryNumber = lastEntry ? lastEntry.entryNumber + 1 : 1;

            const newEntry = await tx.journalEntry.create({
                data: {
                    entryNumber: nextEntryNumber,
                    date: new Date(body.date),
                    description: body.description || null,
                    reference: body.reference || null,
                    financialYearId: financialYear.id,
                    companyId: companyId,
                    lines: {
                        create: body.lines.map((line: any) => ({
                            accountId: line.accountId,
                            costCenterId: line.costCenterId || null,
                            debit: Number(line.debit) || 0,
                            credit: Number(line.credit) || 0,
                            description: line.description || null,
                        })),
                    },
                },
                include: { lines: { include: { account: true, costCenter: true } } },
            });
            return newEntry;
        });

        return NextResponse.json(entry, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'فشل في إنشاء القيد اليومي' }, { status: 500 });
    }
});
