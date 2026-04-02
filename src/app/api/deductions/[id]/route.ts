import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const deduction = await prisma.deduction.findUnique({
            where: { id: id, companyId },
            include: { employee: true },
        });

        if (!deduction) {
            return NextResponse.json({ error: "الخصم غير موجود" }, { status: 404 });
        }

        return NextResponse.json(deduction);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const PATCH = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;
        const { status } = body;

        const deduction = await prisma.deduction.findUnique({
            where: { id, companyId },
            include: { employee: true }
        });

        if (!deduction) {
            return NextResponse.json({ error: 'الخصم غير موجود' }, { status: 404 });
        }

        // ── عند اعتماد الخصم: أنشئ قيد محاسبي ──
        if (status === 'deducted' && deduction.status === 'pending') {
            const activeYear = await prisma.financialYear.findFirst({
                where: { companyId, isOpen: true },
                orderBy: { startDate: 'desc' }
            });

            let journalEntryId: string | undefined;

            if (activeYear) {
                // جيب حساب ذمم الموظفين (أصول) وحساب إيراد الخصومات (إيرادات)
                const [employeeReceivableAcc, deductionIncomeAcc] = await Promise.all([
                    // سلف الموظفين (1143) — يُستخدم كحساب مؤقت للخصم
                    prisma.account.findFirst({
                        where: {
                            companyId,
                            OR: [
                                { code: '1143' },
                                { type: 'asset', name: { contains: 'سلف الموظفين' } },
                                { type: 'asset', name: { contains: 'ذمم الموظفين' } },
                                { type: 'asset', name: { contains: 'مدينون متنوعون' } },
                            ]
                        }
                    }),
                    // إيرادات متنوعة (4330)
                    prisma.account.findFirst({
                        where: {
                            companyId,
                            OR: [
                                { code: '4330' },
                                { type: 'revenue', name: { contains: 'جزاءات' } },
                                { type: 'revenue', name: { contains: 'غرامات' } },
                                { type: 'revenue', name: { contains: 'إيرادات متنوعة' } },
                            ]
                        }
                    }),
                ]);

                if (employeeReceivableAcc && deductionIncomeAcc) {
                    const lastEntry = await prisma.journalEntry.findFirst({
                        where: { companyId, financialYearId: activeYear.id },
                        orderBy: { entryNumber: 'desc' },
                        select: { entryNumber: true }
                    });

                    const je = await prisma.journalEntry.create({
                        data: {
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: deduction.date,
                            description: `خصم موظف: ${deduction.employee.name} — ${deduction.reason || 'خصم'}`,
                            referenceType: 'deduction',
                            referenceId: deduction.id,
                            financialYearId: activeYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    {
                                        accountId: employeeReceivableAcc.id,
                                        debit: deduction.amount,
                                        credit: 0,
                                        description: `خصم من ${deduction.employee.name}`,
                                    },
                                    {
                                        accountId: deductionIncomeAcc.id,
                                        debit: 0,
                                        credit: deduction.amount,
                                        description: deduction.reason || 'إيراد خصم موظف',
                                    },
                                ]
                            }
                        }
                    });
                    journalEntryId = je.id;
                }
            }

            const updated = await prisma.deduction.update({
                where: { id, companyId },
                data: {
                    status: 'deducted',
                    ...(journalEntryId ? { journalEntryId } : {})
                },
                include: { employee: true }
            });
            return NextResponse.json(updated);
        }

        const updated = await prisma.deduction.update({
            where: { id, companyId },
            data: { status },
            include: { employee: true }
        });
        return NextResponse.json(updated);

    } catch (e: any) {
        return NextResponse.json({
            error: e.message || "فشل في تحديث الخصم"
        }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        const deduction = await prisma.deduction.findUnique({
            where: { id, companyId }
        });

        if (!deduction) {
            return NextResponse.json({ error: 'الخصم غير موجود' }, { status: 400 });
        }

        if (deduction.status === 'deducted') {
            return NextResponse.json({
                error: 'لا يمكن حذف خصم تم اعتماده وترحيله للرواتب'
            }, { status: 400 });
        }

        await prisma.deduction.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({
            error: e.message || 'فشل في حذف الخصم'
        }, { status: 500 });
    }
});
