import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request: NextRequest, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;
        const wantsHtml = new URL(request.url).searchParams.get('html') === '1';

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

        if (!invoice) {
            if (wantsHtml) return new NextResponse('<h2>الفاتورة غير موجودة</h2>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            return NextResponse.json({ error: 'الفاتورة غير موجودة' }, { status: 404 });
        }

        const branchName = (session.user as any).branchName || '';
        const companyWithBranch = { ...company, branchName };

        if (wantsHtml) {
            const { generateA4HTML } = await import('@/lib/printInvoices');
            const type = (invoice as any).type || 'sale';
            const html = generateA4HTML(invoice as any, type, companyWithBranch as any, {
                partyBalance: (invoice as any).customer?.balance ?? (invoice as any).supplier?.balance,
                noAutoPrint: false,
            });
            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        return NextResponse.json({ invoice, company: companyWithBranch });
    } catch (error: any) {
        return NextResponse.json({ error: 'فشل جلب البيانات', details: error.message }, { status: 500 });
    }
});
