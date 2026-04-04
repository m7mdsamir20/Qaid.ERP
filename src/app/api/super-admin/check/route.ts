import { NextRequest, NextResponse } from 'next/server';
import { withProtection } from '@/lib/apiHandler';
import { prisma } from '@/lib/prisma';

export const GET = withProtection(async (request, session) => {
    try {
        const userId = (session.user as any).id;
        
        // جلب الصلاحية مباشرة من قاعدة البيانات لضمان المزامنة الفورية
        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            select: { isSuperAdmin: true }
        });

        return NextResponse.json({ authorized: !!user?.isSuperAdmin });
    } catch {
        return NextResponse.json({ authorized: false });
    }
});
