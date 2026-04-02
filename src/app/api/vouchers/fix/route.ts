import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const types = ['payment', 'receipt'];
        
        for (const type of types) {
            const vs = await prisma.voucher.findMany({ 
                where: { companyId, type: type as any }, 
                orderBy: { createdAt: 'asc' } 
            });
            
            for (let i = 0; i < vs.length; i++) {
                await prisma.voucher.update({ 
                    where: { id: vs[i].id }, 
                    data: { voucherNumber: i + 1 } 
                });
            }
        }
        return NextResponse.json({ success: true, message: "تمت إعادة ترقيم السندات بنجاح" });
    } catch (e: any) {
        console.error("Voucher Fix API Error:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}, { requireAdmin: true });
