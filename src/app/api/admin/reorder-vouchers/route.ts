import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        // Re-order receipts
        const receipts = await prisma.voucher.findMany({
            where: { companyId, type: 'receipt' },
            orderBy: { createdAt: 'asc' }
        });

        for (let i = 0; i < receipts.length; i++) {
            await prisma.voucher.update({
                where: { id: receipts[i].id },
                data: { voucherNumber: i + 1 }
            });
        }

        return NextResponse.json({
            success: true,
            message: `تم إعادة ترتيب ${receipts.length} سند قبض بنجاح.`,
            count: receipts.length
        });
    } catch (error: any) {
        console.error('Reorder error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireAdmin: true });
