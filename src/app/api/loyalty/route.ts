import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { logActivity, extractLogContext } from '@/lib/activityLog';

export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    const program = await prisma.loyaltyProgram.findUnique({
        where: { companyId },
    });
    return NextResponse.json(program);
});

export const PUT = withProtection(async (request, session, body) => {
    const companyId = (session.user as any).companyId;
    const ctx = extractLogContext(session, request);

    const data = {
        name: body.name || 'برنامج الولاء',
        pointsPerCurrency: parseFloat(body.pointsPerCurrency) || 1,
        pointsValue: parseFloat(body.pointsValue) || 0.01,
        minRedeemPoints: parseInt(body.minRedeemPoints) || 100,
        expiryMonths: body.expiryMonths ? parseInt(body.expiryMonths) : null,
        isActive: body.isActive ?? true,
    };

    const existing = await prisma.loyaltyProgram.findUnique({ where: { companyId } });

    let program;
    if (existing) {
        program = await prisma.loyaltyProgram.update({
            where: { companyId },
            data,
        });
        await logActivity({
            ...ctx,
            action: 'update',
            module: 'loyalty',
            entityType: 'LoyaltyProgram',
            entityId: program.id,
            description: 'تعديل إعدادات برنامج الولاء',
            newData: data,
        });
    } else {
        program = await prisma.loyaltyProgram.create({
            data: { ...data, companyId },
        });
        await logActivity({
            ...ctx,
            action: 'create',
            module: 'loyalty',
            entityType: 'LoyaltyProgram',
            entityId: program.id,
            description: 'إنشاء برنامج الولاء',
            newData: data,
        });
    }

    return NextResponse.json(program);
});
