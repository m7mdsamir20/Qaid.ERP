import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const company = await prisma.company.findUnique({
            where: { id: (session.user as any).companyId },
            select: { name: true, nameEn: true, phone: true, email: true, taxNumber: true, commercialRegister: true, address: true, logo: true, currency: true },
        });
        return NextResponse.json(company || {});
    } catch {
        return NextResponse.json({}, { status: 500 });
    }
}, { cache: 30 });
