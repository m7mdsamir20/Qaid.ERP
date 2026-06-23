import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { generateA4HTML } from '@/lib/printInvoices';

export const maxDuration = 60;

let cachedBrowser: any = null;

async function getBrowser() {
    if (cachedBrowser && cachedBrowser.connected) {
        return cachedBrowser;
    }

    if (process.env.NODE_ENV === 'production') {
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteer = (await import('puppeteer-core')).default;
        cachedBrowser = await puppeteer.launch({
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            defaultViewport: { width: 1280, height: 900 },
            executablePath: await chromium.executablePath(),
            headless: 'shell' as any,
        });
    } else {
        const puppeteer = (await import('puppeteer-core')).default;
        const executablePath =
            process.platform === 'win32'
                ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
                : process.platform === 'darwin'
                ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
                : '/usr/bin/google-chrome';
        cachedBrowser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath,
            headless: true,
        });
    }
    return cachedBrowser;
}

export const GET = withProtection(async (_request, session, _body, context) => {
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

    const type = (invoice.type || 'sale') as any;
    const html = generateA4HTML(invoice as any, type, company as any, {
        partyBalance: (invoice as any).customer?.balance ?? (invoice as any).supplier?.balance,
        noAutoPrint: true,
    });

    let page: any = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
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
    } catch (err: any) {
        console.error('[PDF] Error:', err?.message);
        return NextResponse.json({ error: err?.message || 'فشل توليد PDF' }, { status: 500 });
    } finally {
        if (page) {
            try {
                await page.close();
            } catch (e) {
                console.error('[PDF] Error closing page:', e);
            }
        }
    }
});
