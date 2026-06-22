import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const advance = await prisma.advance.findUnique({
            where: { id: id, companyId },
            include: { employee: true },
        });

        if (!advance) {
            return NextResponse.json({ error: "السلفة غير موجودة" }, { status: 404 });
        }

        return NextResponse.json(advance);
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
});

export const PATCH = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;
        const userId = (session.user as any).id;
        const { status } = body;

        const advance = await prisma.advance.findUnique({
            where: { id, companyId },
            include: { employee: true }
        });

        if (!advance) {
            return NextResponse.json({ error: 'السلفة غير موجودة' }, { status: 404 });
        }

        // لو بيعتمد — اعمل القيد وانقص الخزينة
        if (status === 'deducted' && advance.status === 'pending') {
            // Permission check for approve
            if (!(session.user as any).isSuperAdmin && (session.user as any).role !== 'admin') {
                let hasApprove = false;
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: userId },
                        select: { customRole: { select: { permissions: true } } }
                    });
                    const perms = dbUser?.customRole?.permissions ? JSON.parse(dbUser.customRole.permissions) : {};
                    hasApprove = perms['/advances']?.approve === true;
                } catch { hasApprove = false; }
                if (!hasApprove) return NextResponse.json({ error: 'ليس لديك صلاحية الاعتماد' }, { status: 403 });
            }
            // Creator should not approve their own
            if ((advance as any).createdBy && (advance as any).createdBy === userId) {
                return NextResponse.json({ error: 'لا يمكنك اعتماد طلبك الخاص' }, { status: 403 });
            }
            await prisma.$transaction(async (tx) => {
                // جيب الخزينة
                const treasury = await tx.treasury.findFirst({
                    where: { 
                        companyId,
                        ...(advance.treasuryId ? { id: advance.treasuryId } : {})
                    },
                    select: { id: true, accountId: true, balance: true }
                });

                if (!treasury) throw new Error('الخزينة غير موجودة');
                if (treasury.balance < advance.amount) {
                    throw new Error('رصيد الخزينة غير كافٍ لصرف السلفة');
                }

                // جيب حساب السلف
                const advanceAccount = await tx.account.findFirst({
                    where: {
                        companyId,
                        OR: [
                            { name: { contains: 'سلف' } },
                            { name: { contains: 'سلفيات' } },
                        ],
                        type: 'asset',
                    }
                });

                if (!advanceAccount || !treasury.accountId) {
                    throw new Error('لم يتم العثور على الحسابات المطلوبة');
                }

                // سجل القيد
                const lastEntry = await tx.journalEntry.findFirst({
                    where: { companyId },
                    orderBy: { entryNumber: 'desc' },
                    select: { entryNumber: true }
                });

                const currentYear = await tx.financialYear.findFirst({
                    where: { companyId, isOpen: true },
                    orderBy: { startDate: 'desc' }
                });

                if (currentYear) {
                    await tx.journalEntry.create({
                        data: {
                                // @ts-ignore
                                branchId: typeof branchId !== 'undefined' ? branchId : (typeof body !== 'undefined' && body?.branchId ? body.branchId : undefined),
                            entryNumber: (lastEntry?.entryNumber || 0) + 1,
                            date: advance.date,
                            description: `سلفة موظف — ${advance.employee?.name}`,
                            referenceType: 'advance',
                            referenceId: advance.id,
                            financialYearId: currentYear.id,
                            companyId,
                            isPosted: true,
                            lines: {
                                create: [
                                    {
                                        accountId: advanceAccount.id,
                                        debit: advance.amount,
                                        credit: 0,
                                        description: `سلفة — ${advance.employee?.name}`,
                                    },
                                    {
                                        accountId: treasury.accountId,
                                        debit: 0,
                                        credit: advance.amount,
                                        description: 'صرف سلفة من الخزينة',
                                    },
                                ]
                            }
                        }
                    });
                }

                // انقص الخزينة
                await tx.treasury.update({
                    where: { id: treasury.id },
                    data: { balance: { decrement: advance.amount } }
                });

                // عدّل حالة السلفة
                await tx.advance.update({
                    where: { id },
                    data: { status: 'deducted' }
                });
            });

            const updated = await prisma.advance.findUnique({
                where: { id },
                include: { employee: true }
            });
            await logActivity({
                ...extractLogContext(session, request),
                action: 'approve',
                module: 'advances',
                entityType: 'Advance',
                entityId: id,
                description: `اعتمد سلفة الموظف ${advance.employee?.name}`,
                oldData: { status: 'pending' },
                newData: { status: 'deducted' },
            });
            return NextResponse.json(updated);
        }

        // تحديث الحالة عادي
        const updated = await prisma.advance.update({
            where: { id, companyId },
            data: { status },
            include: { employee: true }
        });

        return NextResponse.json(updated);

    } catch (e: any) {
        return NextResponse.json({ 
            error: e.message || "فشل في تحديث السلفة" 
        }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session.user as any).companyId;

        const advance = await prisma.advance.findUnique({
            where: { id, companyId },
            include: { employee: true }
        });

        if (!advance) {
            return NextResponse.json({ error: 'السلفة غير موجودة' }, { status: 404 });
        }

        if (advance.status === 'deducted') {
            return NextResponse.json({ 
                error: 'لا يمكن حذف سلفة معتمدة ومصروفة' 
            }, { status: 400 });
        }

        // لو pending → احذف مباشرة (لا يوجد قيد لعكسه حالياً)
        await prisma.advance.delete({ where: { id, companyId } });

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ error: e.message || 'فشل في حذف السلفة' }, { status: 500 });
    }
});
