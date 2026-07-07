import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session!.user as any).companyId;

        // Validate entry belongs to company
        const existing = await prisma.journalEntry.findUnique({
            where: { id, companyId },
            select: { id: true, isPosted: true },
        });

        if (!existing) {
            return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        }

        // Only draft entries can be edited
        if (existing.isPosted) {
            return NextResponse.json({ error: 'لا يمكن تعديل قيد مؤرشف' }, { status: 400 });
        }

        // Validate lines array
        if (!body.lines || !Array.isArray(body.lines) || body.lines.length < 2) {
            return NextResponse.json(
                { error: 'البيانات غير مكتملة أو عدد أطراف القيد أقل من 2' },
                { status: 400 }
            );
        }

        // Validate balance
        const totalDebit = body.lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
        const totalCredit = body.lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            return NextResponse.json({ error: 'القيد غير متزن' }, { status: 400 });
        }

        // Validate all accountIds belong to this company
        const accountIds = body.lines.map((line: any) => line.accountId).filter(Boolean);
        const validAccounts = await prisma.account.findMany({
            where: { id: { in: accountIds }, companyId },
            select: { id: true },
        });

        if (validAccounts.length !== accountIds.length) {
            return NextResponse.json(
                { error: 'بعض الحسابات غير صالحة أو لا تنتمي للشركة' },
                { status: 400 }
            );
        }

        // Delete existing lines and recreate — done in a transaction
        const updated = await prisma.$transaction(async (tx) => {
            // Delete all existing lines (cascade would also work, but explicit is safer)
            await tx.journalEntryLine.deleteMany({ where: { journalEntryId: id } });

            // Update entry + create new lines
            return tx.journalEntry.update({
                where: { id, companyId },
                data: {
                    ...(body.date !== undefined && { date: new Date(body.date) }),
                    ...(body.description !== undefined && { description: body.description }),
                    ...(body.branchId !== undefined && { branchId: body.branchId }),
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
                include: {
                    lines: { include: { account: true, costCenter: true } },
                    financialYear: true,
                },
            });
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('PUT /api/journal-entries/[id] Error:', error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في تعديل القيد اليومي') }, { status: 500 });
    }
});
