import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const advances = await prisma.advance.findMany({
            where: { companyId },
            include: { employee: true },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json(advances);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { employeeId, date, amount, notes, installmentCount, monthlyAmount } = body;

        if (!employeeId || !date || !amount) {
            return NextResponse.json({ error: "اختر الموظف وحدد التاريخ والمبلغ" }, { status: 400 });
        }

        const employee = await prisma.employee.findUnique({
            where: { id: employeeId, companyId }
        });

        if (!employee) {
            return NextResponse.json({ error: "الموظف غير موجود" }, { status: 404 });
        }

        if (employee.status !== 'active') {
            return NextResponse.json({ error: "لا يمكن إضافة سلفة لموظف غير نشط" }, { status: 400 });
        }

        const numAmount = Number(amount);

        if (body.treasuryId) {
            const treasury = await prisma.treasury.findUnique({
                where: { id: body.treasuryId, companyId }
            });
            if (!treasury) {
                return NextResponse.json({ error: "الخزينة المختارة غير موجودة" }, { status: 400 });
            }
            if (treasury.balance < numAmount) {
                return NextResponse.json({ error: "رصيد الخزينة غير كافٍ لصرف السلفة" }, { status: 400 });
            }
        }

        const financialYear = body.treasuryId ? await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true }
        }) : null;

        const result = await prisma.$transaction(async (tx) => {
            const advance = await tx.advance.create({
                data: {
                    employeeId,
                    date: new Date(date),
                    amount: numAmount,
                    installmentCount: Number(installmentCount || 1),
                    monthlyAmount: Number(monthlyAmount || amount),
                    notes: notes || null,
                    treasuryId: body.treasuryId || null,
                    status: 'pending',
                    companyId,
                },
                include: { employee: true }
            });

            if (body.treasuryId && financialYear) {
                // خصم من الخزينة
                await tx.treasury.update({
                    where: { id: body.treasuryId },
                    data: { balance: { decrement: numAmount } }
                });

                // قيد: مدين حساب السلف / دائن حساب الخزينة
                const advancesAcc = await tx.account.findFirst({
                    where: {
                        companyId, accountCategory: 'detail',
                        OR: [
                            { type: 'asset', name: { contains: 'سلف' } },
                            { type: 'asset', name: { contains: 'مدفوعات مقدمة' } },
                        ]
                    }
                });

                const treasuryAcc = await tx.treasury.findUnique({
                    where: { id: body.treasuryId },
                    select: { accountId: true }
                });
                const cashAccount = treasuryAcc?.accountId
                    ? await tx.account.findUnique({ where: { id: treasuryAcc.accountId } })
                    : null;

                if (advancesAcc && cashAccount) {
                    const lastEntry = await tx.journalEntry.findFirst({
                        where: { companyId, financialYearId: financialYear.id },
                        orderBy: { entryNumber: 'desc' },
                        select: { entryNumber: true }
                    });
                    const entryNumber = (lastEntry?.entryNumber || 0) + 1;

                    await tx.journalEntry.create({
                        data: {
                            entryNumber,
                            date: new Date(date),
                            description: `سلفة موظف — ${employee.name}`,
                            referenceType: 'advance',
                            referenceId: advance.id,
                            financialYearId: financialYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    { accountId: advancesAcc.id, debit: numAmount, credit: 0, description: `سلفة لـ ${employee.name}` },
                                    { accountId: cashAccount.id, debit: 0, credit: numAmount, description: `صرف سلفة من الخزينة` },
                                ]
                            }
                        }
                    });
                }
            }

            return advance;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "فشل في تسجيل سلفة الموظف" }, { status: 500 });
    }
});
