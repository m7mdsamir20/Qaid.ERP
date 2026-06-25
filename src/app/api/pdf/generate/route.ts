import { NextResponse } from 'next/server';
import { withProtection } from '@/lib/apiHandler';

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

export const POST = withProtection(async (request, session) => {
    try {
        const body = await request.json();
        const { html, filename, options } = body;

        if (!html) {
            return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
        }

        const browser = await getBrowser();
        const page = await browser.newPage();
        
        // Use a reasonable viewport to ensure proper scaling
        await page.setViewport({ width: 1200, height: 800 });
        
        await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
        await page.evaluateHandle('document.fonts.ready');

        const pdfOptions: any = {
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
            preferCSSPageSize: true,
        };

        const isThermal = options?.pw === 80;
        if (isThermal) {
            pdfOptions.width = '80mm';
            // Use standard height or custom if provided, otherwise default to a long height for receipts
            pdfOptions.height = options?.height ? `${options.height}mm` : '350mm';
            pdfOptions.preferCSSPageSize = false;
        } else {
            pdfOptions.format = 'A4';
            pdfOptions.landscape = options?.orientation === 'l';
        }

        const pdfBuffer = await page.pdf(pdfOptions);
        await page.close();

        const fileDisplayName = filename || 'document.pdf';

        return new NextResponse(pdfBuffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(fileDisplayName)}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err: any) {
        console.error('[PDF GENERATE] Error:', err?.message);
        return NextResponse.json({ error: err?.message || 'فشل توليد PDF' }, { status: 500 });
    }
}, { sanitize: false });
