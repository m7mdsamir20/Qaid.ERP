import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const activeBranchId = (session.user as any).activeBranchId;
        const { searchParams } = new URL(request.url);
        const branchId = searchParams.get('branchId') || activeBranchId;

        // Find the main branch of this company to include null branchIds
        const mainBranch = await prisma.branch.findFirst({
            where: { companyId, isMain: true },
            select: { id: true }
        });

        const where: any = { companyId };
        if (branchId && branchId !== 'all') {
            if (mainBranch && branchId === mainBranch.id) {
                where.OR = [
                    { branchId },
                    { branchId: null }
                ];
            } else {
                where.branchId = branchId;
            }
        } else if (branchId === 'all') {
            const allowedBranches: string[] | null = (session.user as any)?.allowedBranches || null;
            if (allowedBranches && allowedBranches.length > 0) {
                where.branchId = { in: allowedBranches };
            }
        }

        // ✅ جلب السنة المالية المفتوحة لتحديد نطاق الرصيد
        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });

        const treasuries = await prisma.treasury.findMany({
            where,
            include: {
                // نربط بحسابات الأستاذ للحصول على الرصيد الفعلي
                account: {
                    include: {
                        journalEntryLines: {
                            where: {
                                journalEntry: {
                                    isPosted: true,
                                    financialYearId: currentYear?.id
                                }
                            },
                            select: { debit: true, credit: true }
                        },
                        openingBalances: {
                            where: { financialYearId: currentYear?.id },
                            select: { debit: true, credit: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        });

        // ✅ حساب الرصيد الديناميكي لكل خزينة بدلاً من الاعتماد على الحقل الاستاتيكي
        const enhancedTreasuries = treasuries.map(t => {
            let dynamicBalance = t.balance; // القيمة الافتراضية لو مفيش حساب مربوط

            if (t.account) {
                const linesDebit = t.account.journalEntryLines.reduce((s, l) => s + l.debit, 0);
                const linesCredit = t.account.journalEntryLines.reduce((s, l) => s + l.credit, 0);
                const openingDebit = t.account.openingBalances.reduce((s, b) => s + b.debit, 0);
                const openingCredit = t.account.openingBalances.reduce((s, b) => s + b.credit, 0);

                // الرصيد = (الافتتاحي مدين + حركات مدين) - (الافتتاحي دائن + حركات دائن)
                dynamicBalance = (openingDebit + linesDebit) - (openingCredit + linesCredit);
            }

            return {
                ...t,
                balance: dynamicBalance,
                account: undefined // لا نرسل بيانات الحساب كاملة لتوفير الحجم
            };
        });

        return NextResponse.json(enhancedTreasuries);
    } catch (error) {
        console.error("GET Treasuries Error:", error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { name, type, openingBalance, bankName, accountNumber } = body;

        if (!name) return NextResponse.json({ error: 'اسم الخزينة مطلوب' }, { status: 400 });

        const result = await prisma.$transaction(async (tx) => {

            // ① إنشاء حساب أستاذ فرعي مخصص لهذه الخزينة / الحساب البنكي
            const parentAccount = await tx.account.findFirst({
                where: { companyId, code: '1110' }
            });

            let nextCode = '1114';
            if (parentAccount) {
                const siblings = await tx.account.findMany({
                    where: { companyId, parentId: parentAccount.id },
                    orderBy: { code: 'desc' },
                    take: 1
                });
                if (siblings.length > 0) {
                    const lastVal = parseInt(siblings[0].code);
                    nextCode = (lastVal + 1).toString();
                }
            }

            const linkedAccount = await tx.account.create({
                data: {
                    code: nextCode,
                    name: name,
                    nature: 'debit',
                    type: 'asset',
                    accountCategory: 'detail',
                    level: parentAccount ? parentAccount.level + 1 : 2,
                    parentId: parentAccount?.id || null,
                    companyId
                }
            });

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

            // ③ لو في رصيد افتتاحي — سجّله في OpeningBalance للحساب المربوط
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
