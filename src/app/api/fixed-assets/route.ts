import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const branchFilter = getBranchFilter(session);

        const assets = await prisma.fixedAsset.findMany({
            where: { companyId, ...branchFilter },
            orderBy: { code: 'asc' },
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error('Error fetching fixed assets:', error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;

        // Basic validation
        if (!body.code || !body.name || !body.category || !body.purchaseCost) {
            return NextResponse.json({ error: 'البيانات الأساسية مطلوبة' }, { status: 400 });
        }

        const asset = await prisma.fixedAsset.create({
            data: {
                code: body.code,
                name: body.name,
                category: body.category,
                purchaseDate: new Date(body.purchaseDate),
                purchaseCost: parseFloat(body.purchaseCost),
                salvageValue: parseFloat(body.salvageValue) || 0,
                depreciationRate: parseFloat(body.depreciationRate),
                depreciationMethod: body.depreciationMethod || 'straight',
                usefulLife: parseInt(body.usefulLife) || 0,
                accumulatedDepreciation: 0,
                netBookValue: parseFloat(body.purchaseCost),
                status: 'active',
                notes: body.notes || '',
                assetAccountId: body.assetAccountId,
                depAccountId: body.depAccountId,
                accumAccountId: body.accumAccountId,
                companyId,
            },
        });

        // ② OpeningBalance لحساب الأصل الثابت
        if (body.assetAccountId && body.purchaseCost > 0) {
            const currentYear = await prisma.financialYear.findFirst({
                where:   { companyId, isOpen: true },
                orderBy: { startDate: 'desc' },
            });

            if (currentYear) {
                const existing = await prisma.openingBalance.findUnique({
                    where: {
                        accountId_financialYearId: {
                            accountId:       body.assetAccountId,
                            financialYearId: currentYear.id,
                        },
                    },
                });

                const cost = parseFloat(body.purchaseCost) || 0;

                if (existing) {
                    await prisma.openingBalance.update({
                        where: { id: existing.id },
                        data:  { debit: existing.debit + cost },
                    });
                } else {
                    await prisma.openingBalance.create({
                        data: {
                            accountId:       body.assetAccountId,
                            financialYearId: currentYear.id,
                            debit:           cost,
                            credit:          0,
                            companyId,
                        },
                    });
                }
            }
        }

        return NextResponse.json(asset, { status: 201 });
    } catch (error) {
        console.error('Error creating fixed asset:', error);
        return NextResponse.json({ error: 'فشل في إضافة الأصل' }, { status: 500 });
    }
});
