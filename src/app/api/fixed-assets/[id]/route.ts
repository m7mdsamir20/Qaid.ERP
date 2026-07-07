import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection, safeErrorMsg } from '@/lib/apiHandler';

export const PUT = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session!.user as any).companyId;

        // Validate asset belongs to company
        const existing = await prisma.fixedAsset.findUnique({
            where: { id, companyId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        }

        const purchaseCost =
            body.purchaseCost !== undefined
                ? parseFloat(body.purchaseCost)
                : existing.purchaseCost;

        // Recalculate netBookValue if purchaseCost changes
        const netBookValue = purchaseCost - existing.accumulatedDepreciation;

        const updated = await prisma.fixedAsset.update({
            where: { id, companyId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.category !== undefined && { category: body.category }),
                ...(body.purchaseDate !== undefined && { purchaseDate: new Date(body.purchaseDate) }),
                ...(body.purchaseCost !== undefined && { purchaseCost, netBookValue }),
                ...(body.salvageValue !== undefined && { salvageValue: parseFloat(body.salvageValue) }),
                ...(body.depreciationRate !== undefined && { depreciationRate: parseFloat(body.depreciationRate) }),
                ...(body.depreciationMethod !== undefined && { depreciationMethod: body.depreciationMethod }),
                ...(body.usefulLife !== undefined && { usefulLife: parseInt(body.usefulLife) }),
                ...(body.notes !== undefined && { notes: body.notes }),
                ...(body.status !== undefined && { status: body.status }),
                ...(body.assetAccountId !== undefined && { assetAccountId: body.assetAccountId }),
                ...(body.depAccountId !== undefined && { depAccountId: body.depAccountId }),
                ...(body.accumAccountId !== undefined && { accumAccountId: body.accumAccountId }),
                ...(body.branchId !== undefined && { branchId: body.branchId }),
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('PUT /api/fixed-assets/[id] Error:', error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في تعديل الأصل الثابت') }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const { id } = await params;
        const companyId = (session!.user as any).companyId;

        // Validate asset belongs to company
        const existing = await prisma.fixedAsset.findUnique({
            where: { id, companyId },
        });

        if (!existing) {
            return NextResponse.json({ error: 'غير موجود' }, { status: 404 });
        }

        // Check if asset has depreciation journal entries
        const depreciationEntry = await prisma.journalEntry.findFirst({
            where: {
                companyId,
                referenceType: 'depreciation',
                referenceId: id,
            },
            select: { id: true },
        });

        if (depreciationEntry) {
            return NextResponse.json(
                { error: 'لا يمكن حذف أصل له قيود إهلاك' },
                { status: 400 }
            );
        }

        await prisma.fixedAsset.delete({ where: { id, companyId } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('DELETE /api/fixed-assets/[id] Error:', error);
        return NextResponse.json({ error: safeErrorMsg(error, 'فشل في حذف الأصل الثابت') }, { status: 500 });
    }
});
