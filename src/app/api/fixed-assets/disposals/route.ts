import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const disposals = await prisma.fixedAssetDisposal.findMany({
            where: { companyId },
            include: { asset: { select: { code: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(disposals.map(d => ({
            ...d,
            assetCode: d.asset.code,
            assetName: d.asset.name,
        })));
    } catch (error) {
        console.error("GET Asset Disposals Error:", error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { assetId, reason, disposalDate, salePrice, gainLoss, notes } = body;

        if (!assetId || !disposalDate) {
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
        }

        // جلب بيانات الأصل
        const asset = await prisma.fixedAsset.findUnique({
            where: { id: assetId },
        });

        if (!asset || asset.companyId !== companyId) {
            return NextResponse.json({ error: 'الأصل غير موجود أو غير تابع للشركة' }, { status: 404 });
        }

        // السنة المالية المفتوحة
        const currentYear = await prisma.financialYear.findFirst({
            where: { companyId, isOpen: true },
            orderBy: { startDate: 'desc' },
        });

        if (!currentYear) {
            return NextResponse.json({ error: 'لا توجد سنة مالية مفتوحة' }, { status: 400 });
        }

        const sale = parseFloat(salePrice) || 0;
        const gl = parseFloat(gainLoss) || 0;
        const isGain = gl > 0;
        const isLoss = gl < 0;

        // التحقق المسبق من وجود حسابات الأرباح/الخسائر لو في فرق
        if (isGain) {
            const gainAccount = await prisma.account.findFirst({
                where: { companyId, OR: [{ name: { contains: 'أرباح استبعاد' } }, { name: { contains: 'ربح استبعاد' } }] },
            });
            if (!gainAccount) {
                return NextResponse.json({ error: 'لا يوجد حساب "أرباح استبعاد" في دليل الحسابات. يرجى إنشاؤه أولاً.' }, { status: 400 });
            }
        }

        if (isLoss) {
            const lossAccount = await prisma.account.findFirst({
                where: { companyId, OR: [{ name: { contains: 'خسارة استبعاد' } }, { name: { contains: 'خسائر استبعاد' } }] },
            });
            if (!lossAccount) {
                return NextResponse.json({ error: 'لا يوجد حساب "خسائر استبعاد" في دليل الحسابات. يرجى إنشاؤه أولاً.' }, { status: 400 });
            }
        }

        // إنشاء القيد المحاسبي وتسجيل الاستبعاد وتحديث حالة الأصل في معاملة واحدة
        const result = await prisma.$transaction(async (tx) => {
            // رقم القيد داخل الـ transaction لمنع التكرار
            const lastEntry = await tx.journalEntry.findFirst({
                where: { companyId, financialYearId: currentYear.id },
                orderBy: { entryNumber: 'desc' },
                select: { entryNumber: true },
            });
            const entryNumber = (lastEntry?.entryNumber || 0) + 1;

            // بناء سطور القيد
            const journalLines: any[] = [];

            // مدين: مجمع الإهلاك
            if (asset.accumulatedDepreciation > 0) {
                journalLines.push({
                    accountId: asset.accumAccountId,
                    debit: asset.accumulatedDepreciation,
                    credit: 0,
                    description: `مجمع إهلاك — استبعاد ${asset.name}`,
                });
            }

            // مدين: الخزينة / البنك لو في سعر بيع
            if (sale > 0) {
                const treasury = await tx.treasury.findFirst({
                    where: { companyId },
                    select: { accountId: true },
                });
                if (treasury?.accountId) {
                    journalLines.push({
                        accountId: treasury.accountId,
                        debit: sale,
                        credit: 0,
                        description: `حصيلة بيع أصل — ${asset.name}`,
                    });
                }
            }

            // مدين: خسارة استبعاد لو في خسارة
            if (isLoss) {
                const lossAccount = await tx.account.findFirst({
                    where: { companyId, OR: [{ name: { contains: 'خسارة استبعاد' } }, { name: { contains: 'خسائر استبعاد' } }] },
                });
                journalLines.push({
                    accountId: lossAccount!.id,
                    debit: Math.abs(gl),
                    credit: 0,
                    description: `خسارة استبعاد أصل — ${asset.name}`,
                });
            }

            // دائن: الأصل الثابت بالتكلفة الأصلية
            journalLines.push({
                accountId: asset.assetAccountId,
                debit: 0,
                credit: asset.purchaseCost,
                description: `استبعاد أصل — ${asset.name}`,
            });

            // دائن: أرباح استبعاد لو في ربح
            if (isGain) {
                const gainAccount = await tx.account.findFirst({
                    where: { companyId, OR: [{ name: { contains: 'أرباح استبعاد' } }, { name: { contains: 'ربح استبعاد' } }] },
                });
                journalLines.push({
                    accountId: gainAccount!.id,
                    debit: 0,
                    credit: gl,
                    description: `ربح استبعاد أصل — ${asset.name}`,
                });
            }

            const entry = await tx.journalEntry.create({
                data: {
                    entryNumber,
                    date: new Date(disposalDate),
                    description: `استبعاد أصل ثابت — ${asset.name} — ${reason}`,
                    referenceType: 'disposal',
                    referenceId: assetId,
                    financialYearId: currentYear.id,
                    companyId,
                    isPosted: true,
                    lines: { create: journalLines },
                },
            });

            const disposal = await tx.fixedAssetDisposal.create({
                data: {
                    assetId,
                    reason,
                    disposalDate: new Date(disposalDate),
                    salePrice: sale,
                    netBookValue: asset.netBookValue,
                    gainLoss: gl,
                    notes: notes || '',
                    financialYearId: currentYear.id,
                    companyId,
                },
            });

            await tx.fixedAsset.update({
                where: { id: assetId },
                data: { status: 'disposed' },
            });

            return { disposal, entry };
        });

        return NextResponse.json({ success: true, disposal: result.disposal });

    } catch (error: any) {
        console.error('Disposal error:', error);
        return NextResponse.json({ error: 'فشل تسجيل الاستبعاد: ' + error.message }, { status: 500 });
    }
});
