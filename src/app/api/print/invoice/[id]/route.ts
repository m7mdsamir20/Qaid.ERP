import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const [invoice, company] = await Promise.all([
            prisma.invoice.findFirst({
                where: { id, companyId },
                include: {
                    customer: true,
                    supplier: true,
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
                    website: true,
                } as any,
            }),
        ]);

        if (!invoice) return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });

        const branchName = (session.user as any).branchName || '';
        return NextResponse.json({ invoice, company: { ...company, branchName } });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل جلب البيانات', details: error.message }, { status: 500 });
    }
});
