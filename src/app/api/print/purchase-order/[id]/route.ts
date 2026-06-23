import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request: NextRequest, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;
        const params = new URL(request.url).searchParams;
        const wantsHtml = params.get('html') === '1';
        const noPrint = params.get('noPrint') === '1';

        // @ts-ignore
        const [order, company] = await Promise.all([
            (prisma as any).purchaseOrder.findFirst({
                where: { id, companyId },
                include: { supplier: true, lines: { include: { item: { include: { unit: true } } } } },
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

        if (!order) {
            if (wantsHtml) return new NextResponse('<h2>أمر الشراء غير موجود</h2>', { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            return NextResponse.json({ error: 'أمر الشراء غير موجود' }, { status: 404 });
        }

        if (wantsHtml) {
            const { generateA4HTML } = await import('@/lib/printInvoices');
            const html = generateA4HTML(order, 'purchase-order' as any, company as any, { noAutoPrint: noPrint });
            return new NextResponse(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            });
        }

        return NextResponse.json({ order, company });
    } catch (error: any) {
        if (request.url.includes('html=1')) return new NextResponse(`<h2>خطأ: ${error.message}</h2>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
        return NextResponse.json({ error: 'فشل جلب البيانات', details: error.message }, { status: 500 });
    }
});
