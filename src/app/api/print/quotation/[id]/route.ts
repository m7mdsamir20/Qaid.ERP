import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        // @ts-ignore
        const [quotation, company] = await Promise.all([
            (prisma as any).quotation.findFirst({
                where: { id, companyId },
                include: {
                    customer: true,
                    lines: { include: { item: { include: { unit: true } } } },
                },
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

        if (!quotation) return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });

        return NextResponse.json({ quotation, company });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل جلب البيانات', details: error.message }, { status: 500 });
    }
});
