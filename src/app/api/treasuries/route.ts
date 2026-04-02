import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || activeBranchId;

        const where: any = { companyId };
        if (branchId && branchId !== 'all') where.branchId = branchId;

        const treasuries = await prisma.treasury.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(treasuries);
    } catch {
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { name, type, openingBalance, bankName, accountNumber } = body;

        if (!name) return NextResponse.json({ error: 'اسم الخزينة مطلوب' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {

            // ① جيب الحساب المناسب تلقائياً
            const accountKeywords = type === 'bank'
                ? ['حسابات بنكية', 'الحسابات البنكية', 'بنك', 'بنوك']
                : ['الصندوق الرئيسي', 'صندوق', 'نقدية', 'نقد'];

            let linkedAccount = null;
            for (const keyword of accountKeywords) {
                linkedAccount = await tx.account.findFirst({
                    where: { companyId, name: { contains: keyword } },
                    orderBy: { code: 'asc' }
                });
                if (linkedAccount) break;
            }

            // ② أنشئ الخزينة
            const activeBranchId = (session.user as any).activeBranchId;
            const treasury = await (tx as any).treasury.create({
                data: {
                    name,
                    type: type || 'cash',
                    bankName,
                    accountNumber,
                    balance: parseFloat(openingBalance) || 0,
                    accountId: linkedAccount?.id || null,
                    companyId,
                    branchId: body.branchId || activeBranchId || null,
                }
            });

            // ③ لو في رصيد افتتاحي — سجّله في OpeningBalance
            const amount = parseFloat(openingBalance) || 0;
            if (amount > 0 && linkedAccount) {
                const currentYear = await tx.financialYear.findFirst({
                    where: { companyId, isOpen: true },
                    orderBy: { startDate: 'desc' }
                });

                if (currentYear) {
                    const existing = await tx.openingBalance.findUnique({
                        where: {
                            accountId_financialYearId: {
                                accountId: linkedAccount.id,
                                financialYearId: currentYear.id,
                            }
                        }
                    });

                    if (existing) {
                        await tx.openingBalance.update({
                            where: { id: existing.id },
                            data: { debit: existing.debit + amount }
                        });
                    } else {
                        await tx.openingBalance.create({
                            data: {
                                accountId: linkedAccount.id,
                                financialYearId: currentYear.id,
                                debit: amount,
                                credit: 0,
                                companyId,
                            }
                        });
                    }
                }
            }

            return treasury;
        });

        return NextResponse.json(result, { status: 201 });

    } catch (error: any) {
        console.error('POST /api/treasuries Error:', error);
        return NextResponse.json({ error: 'فشل في إنشاء الخزينة' }, { status: 500 });
    }
});
