import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

// API خفيف جداً - يرجع فقط هل في سنة مالية مفتوحة أم لا
export const GET = withProtection(async (request, session) => {
    const companyId = (session.user as any).companyId;
    if (!companyId) return NextResponse.json({ hasOpen: true });

    const openYear = await prisma.financialYear.findFirst({
        where: { companyId, isOpen: true },
        select: { id: true },
    });

    return NextResponse.json(
        { hasOpen: !!openYear },
        { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
});
