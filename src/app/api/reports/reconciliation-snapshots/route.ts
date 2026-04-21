import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const snapshots = await (prisma as any).reconciliationSnapshot.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return NextResponse.json(snapshots);
    } catch (error) {
        console.error('GET reconciliation snapshots error:', error);
        return NextResponse.json([], { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const snapshot = await (prisma as any).reconciliationSnapshot.create({
            data: {
                companyId,
                notes: body.notes || null,
                items: body.items,
                totalSystem: body.totalSystem || 0,
                totalPhysical: body.totalPhysical || 0,
                totalShortage: body.totalShortage || 0,
                totalSurplus: body.totalSurplus || 0,
            },
        });
        return NextResponse.json(snapshot, { status: 201 });
    } catch (error) {
        console.error('POST reconciliation snapshot error:', error);
        return NextResponse.json({ error: 'فشل في حفظ نتيجة الجرد' }, { status: 500 });
    }
});
