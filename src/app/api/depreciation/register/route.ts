import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { financialYearId, period, lines } = body;

        if (!financialYearId || !lines?.length)
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

        const financialYear = await prisma.financialYear.findUnique({
            where: { id: financialYearId },
        });
        if (!financialYear)
            return NextResponse.json({ error: 'السنة المالية غير موجودة' }, { status: 404 });

        const results = await prisma.$transaction(async (tx) => {
            // جيب آخر رقم قيد مرة واحدة جوه الـ transaction
            const lastEntry = await tx.journalEntry.findFirst({
                where:   { companyId, financialYearId },
                orderBy: { entryNumber: 'desc' },
                select:  { entryNumber: true },
            });
            let entryNumber = (lastEntry?.entryNumber || 0) + 1;

            const batchResults = [];

            for (const line of lines) {
                const { assetId, depAmount, depAccountId, accumAccountId } = line;

                if (!depAmount || depAmount <= 0) continue;
                if (!depAccountId || !accumAccountId) continue;

                // إنشاء القيد المحاسبي
                const entry = await tx.journalEntry.create({
                    data: {
                        entryNumber,
                        date:           new Date(),
                        description:    `إهلاك ${period} — ${financialYear.name}`,
                        referenceType:  'depreciation',
                        referenceId:    assetId,
                        financialYearId,
                        companyId,
                        isPosted:       true,
                        lines: {
                            create: [
                                {
                                    accountId:   depAccountId,
                                    debit:       depAmount,
                                    credit:      0,
                                    description: `مصروف إهلاك — ${period}`,
                                },
                                {
                                    accountId:   accumAccountId,
                                    debit:       0,
                                    credit:      depAmount,
                                    description: `مجمع إهلاك — ${period}`,
                                },
                            ],
                        },
                    },
                });

                // تحديث الأصل الثابت في نفس الـ transaction
                const asset = await tx.fixedAsset.findUnique({
                    where: { id: assetId, companyId },
                });

                if (asset) {
                    const newAccum  = asset.accumulatedDepreciation + depAmount;
                    const newNet    = Math.max(0, asset.purchaseCost - newAccum);
                    const newStatus = newNet <= (asset.salvageValue || 0)
                        ? 'fully_dep'
                        : asset.status;

                    await tx.fixedAsset.update({
                        where: { id: assetId },
                        data: {
                            accumulatedDepreciation: newAccum,
                            netBookValue:            newNet,
                            status:                  newStatus,
                        },
                    });
                }

                batchResults.push({ assetId, entryId: entry.id, depAmount });
                entryNumber++;
            }

            return batchResults;
        });

        return NextResponse.json({
            success: true,
            count:   results.length,
            results,
        });

    } catch (error) {
        console.error('Depreciation register error:', error);
        return NextResponse.json({ error: 'فشل تسجيل الإهلاك' }, { status: 500 });
    }
});
