import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateA4HTML } from '@/lib/printInvoices';

async function getBrowser() {
    if (process.env.NODE_ENV === 'production') {
        // Vercel serverless — use @sparticuz/chromium
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteer = (await import('puppeteer-core')).default;
        return puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true,
        });
    } else {
        // Local development — use installed system Chrome
        const puppeteer = (await import('puppeteer-core')).default;
        const executablePath =
            process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : process.platform === 'darwin'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : '/usr/bin/google-chrome';
        return puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath,
            headless: true,
        });
    }
}

export const GET = withProtection(async (request: NextRequest, session: any, _body: any, context: any) => {
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

    const type = invoice.type || 'sale';
    const html = generateA4HTML(invoice as any, type, company as any, {
        partyBalance: (invoice as any).customer?.balance ?? (invoice as any).supplier?.balance,
        noAutoPrint: true,
    });

    let browser;
    try {
        browser = await getBrowser();
        const page = await browser.newPage();

        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });

        // Wait for Arabic fonts to render
        await page.evaluateHandle('document.fonts.ready');

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: true,
        });

        const prefix =
            type === 'sale' ? 'SAL' :
            type === 'sale_return' ? 'SRET' :
            type === 'purchase' ? 'PUR' :
            type === 'purchase_return' ? 'PRET' : 'INV';
        const invNum = String((invoice as any).invoiceNumber || '').padStart(5, '0');

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${prefix}-${invNum}.pdf"`,
                'Cache-Control': 'no-store',
            },
        });
    } finally {
        if (browser) await browser.close();
    }
});
