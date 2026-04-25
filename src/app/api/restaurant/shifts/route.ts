import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// GET: list shifts (with optional status filter)
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const status = new URL(request.url).searchParams.get('status');
        const shifts = await prisma.shift.findMany({
            where: { companyId, ...(status ? { status } : {}) },
            include: { _count: { select: { orders: true } } },
            orderBy: { openedAt: 'desc' },
            take: 30,
        });
        return NextResponse.json(shifts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// POST: open a new shift
export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const userId = (session.user as any).id;

        // Close any open shifts first
        await prisma.shift.updateMany({
            where: { companyId, status: 'open' },
            data: { status: 'closed', closedAt: new Date() },
        });

        // Get next shift number
        const last = await prisma.shift.findFirst({ where: { companyId }, orderBy: { shiftNumber: 'desc' } });
        const shiftNumber = (last?.shiftNumber ?? 0) + 1;

        const shift = await prisma.shift.create({
            data: {
                shiftNumber,
                openingBalance: body.openingBalance ?? 0,
                notes: body.notes,
                userId,
                companyId,
            },
        });
        return NextResponse.json(shift, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});

// PUT: close a shift
export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        // Calculate total sales from orders in this shift
        const agg = await prisma.posOrder.aggregate({
            where: { shiftId: body.id, companyId, status: { not: 'cancelled' } },
            _sum: { total: true, taxAmount: true },
            _count: { id: true },
        });

        const totalSales = agg._sum.total ?? 0;
        const totalOrders = agg._count.id;
        const closingBalance = (body.closingBalance ?? 0);
        const expectedBalance = (body.openingBalance ?? 0) + totalSales;
        const difference = closingBalance - expectedBalance;

        await prisma.shift.updateMany({
            where: { id: body.id, companyId },
            data: {
                status: 'closed',
                closedAt: new Date(),
                closingBalance,
                expectedBalance,
                difference,
                totalSales,
                totalOrders,
                notes: body.notes,
            },
        });

        // ----------------------------------------------------
        // ACCOUNTING INTEGRATION: Create Journal Entry for Shift
        // ----------------------------------------------------
        if (totalSales > 0) {
            const financialYear = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
            if (financialYear) {
                const salesAccount = await prisma.account.findFirst({
                    where: { companyId, accountCategory: 'detail', OR: [{ code: '4100' }, { type: 'revenue', name: { contains: 'مبيعات' } }] }
                });
                const cashAccount = await prisma.account.findFirst({
                    where: { companyId, accountCategory: 'detail', OR: [{ code: '1111' }, { type: 'asset', name: { contains: 'صندوق' } }, { type: 'asset', name: { contains: 'نقدية' } }] }
                });
                const taxAccount = await prisma.account.findFirst({
                    where: { companyId, accountCategory: 'detail', OR: [{ code: '2114' }, { type: 'liability', name: { contains: 'ضريبة' } }] }
                });

                if (salesAccount && cashAccount) {
                    const lastEntry = await prisma.journalEntry.findFirst({
                        where: { companyId, financialYearId: financialYear.id },
                        orderBy: { entryNumber: 'desc' },
                    });
                    const entryNumber = (lastEntry?.entryNumber || 0) + 1;

                    const taxAmount = agg._sum.taxAmount ?? 0;
                    const netSales = totalSales - taxAmount;

                    const journalLines: any[] = [];
                    // Debit Cash/Treasury
                    journalLines.push({ accountId: cashAccount.id, debit: totalSales, credit: 0, description: `إيرادات وردية رقم ${body.id.slice(-5)}` });
                    // Credit Sales
                    journalLines.push({ accountId: salesAccount.id, debit: 0, credit: netSales, description: `مبيعات وردية رقم ${body.id.slice(-5)}` });
                    // Credit Tax
                    if (taxAmount > 0 && taxAccount) {
                        journalLines.push({ accountId: taxAccount.id, debit: 0, credit: taxAmount, description: `ضريبة وردية رقم ${body.id.slice(-5)}` });
                    }

                    await prisma.journalEntry.create({
                        data: {
                            entryNumber,
                            date: new Date(),
                            description: `قيد مبيعات وردية رقم ${body.id.slice(-5)}`,
                            reference: `SHIFT-${body.id.slice(-5)}`,
                            referenceType: 'shift',
                            referenceId: body.id,
                            financialYearId: financialYear.id,
                            companyId,
                            isPosted: true,
                            lines: { create: journalLines },
                        }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, totalSales, totalOrders, difference });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
