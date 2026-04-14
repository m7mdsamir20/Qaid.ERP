import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const [voucher, company] = await Promise.all([
            prisma.voucher.findFirst({
                where: { id, companyId },
                include: { customer: true, supplier: true, treasury: true },
            }),
            prisma.company.findUnique({
                where: { id: companyId },
                select: {
                    name: true, nameEn: true, phone: true, email: true,
                    taxNumber: true, commercialRegister: true,
                    addressRegion: true, addressCity: true, addressDistrict: true, addressStreet: true,
                    logo: true, currency: true, countryCode: true, businessType: true,
                },
            }),
        ]);

        if (!voucher) return NextResponse.json({ error: 'السند غير موجود' }, { status: 404 });

        return NextResponse.json({ voucher, company });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل جلب البيانات', details: error.message }, { status: 500 });
    }
});
