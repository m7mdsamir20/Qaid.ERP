import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const DELETE = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await params;

        const stocktaking = await prisma.stocktaking.findUnique({
            where: { id: id }
        });

        if (!stocktaking) {
            return NextResponse.json({ error: "غير موجود" }, { status: 404 });
        }
        if (stocktaking.companyId !== companyId) {
            return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
        }
        if (stocktaking.status !== 'draft') {
            return NextResponse.json({ error: "لا يمكن إزالة جرد معتمد" }, { status: 400 });
        }

        await prisma.stocktaking.delete({
            where: { id: id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: "فشل الحذف" }, { status: 500 });
    }
});
