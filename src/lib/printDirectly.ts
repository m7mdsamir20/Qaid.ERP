function showPrintLoader(message = 'جاري تحضير الطباعة...') {
    if (document.getElementById('print-loader-overlay')) return;

    const loader = document.createElement('div');
    loader.id = 'print-loader-overlay';
    Object.assign(loader.style, {
        position: 'fixed',
        inset: '0',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: '999999',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: 'Cairo, sans-serif',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out',
        gap: '0',
    });

    loader.innerHTML = `
        <style>
            @keyframes print-spin { 100% { transform: rotate(360deg); } }
            @keyframes print-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        </style>
        <div id="print-loader-spinner" style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.15); border-top-color: #3b82f6; border-radius: 50%; margin-bottom: 20px; animation: print-spin 0.8s linear infinite; flex-shrink:0;"></div>
        <div id="print-loader-text" style="font-size: 19px; font-weight: 700; margin-bottom: 8px; animation: print-pulse 1.5s ease-in-out infinite;">${message}</div>
        <div id="print-loader-sub" style="font-size: 13.5px; color: rgba(255,255,255,0.7); font-weight: 500;">يرجى الانتظار لحظات لجمع البيانات والتنسيق</div>
    `;

    document.body.appendChild(loader);
    requestAnimationFrame(() => { loader.style.opacity = '1'; });
}

function hidePrintLoader() {
    const loader = document.getElementById('print-loader-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 200);
    }
}

function injectPrintIframe(html: string) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
        doc.open(); doc.write(html); doc.close();
        
        // Hide loader after a reliable delay (covers the 550ms print timeout + render time)
        setTimeout(() => hidePrintLoader(), 1200);
        
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 120000);
    } else {
        hidePrintLoader();
    }
}

export function printInvoiceDirectly(id: string) {
    window.open(`/api/print/invoice/${id}?html=1`, '_blank');
}

export async function printVoucherDirectly(id: string) {
    try {
        showPrintLoader();
        const res = await fetch(`/api/print/voucher/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateThermalVoucherHTML } = await import('@/lib/printInvoices');
        const type = data.voucher?.type || 'receipt';
        const html = generateThermalVoucherHTML(data.voucher, type, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); hidePrintLoader(); }
}

export async function printQuotationDirectly(id: string) {
    try {
        showPrintLoader();
        const res = await fetch(`/api/print/quotation/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateQuotationHTML } = await import('@/lib/printInvoices');
        const html = generateQuotationHTML(data.quotation, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); hidePrintLoader(); }
}

export async function printInstallmentDirectly(id: string) {
    try {
        showPrintLoader();
        const res = await fetch(`/api/print/installment/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateInstallmentPlanHTML } = await import('@/lib/printInvoices');
        const html = generateInstallmentPlanHTML(data.plan, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); hidePrintLoader(); }
}

export async function printInstallmentReceiptDirectly(id: string) {
    try {
        showPrintLoader();
        const res = await fetch(`/api/print/installment-receipt/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateThermalVoucherHTML } = await import('@/lib/printInvoices');
        const html = generateThermalVoucherHTML(data.receipt, 'receipt', data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); hidePrintLoader(); }
}

const _downloading = new Set<string>();

export async function downloadInvoicePDF(id: string, _filename?: string): Promise<void> {
    if (_downloading.has(id)) return;
    _downloading.add(id);

    let iframe: HTMLIFrameElement | null = null;
    try {
        // Fetch the exact same HTML used for printing (no auto-print)
        const res = await fetch(`/api/print/invoice/${id}?html=1&noPrint=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        // Render HTML in hidden off-screen iframe at A4 width
        iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'fixed', left: '-9999px', top: '0',
            width: '794px', height: '3000px', border: 'none', visibility: 'hidden',
        });
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument!;
        doc.open(); doc.write(html); doc.close();

        // Wait for Google Fonts + images to load
        await new Promise(resolve => {
            const win = iframe!.contentWindow!;
            if (win.document.readyState === 'complete') { resolve(null); return; }
            win.addEventListener('load', () => resolve(null));
            setTimeout(resolve, 4000);
        });
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Capture with html2canvas
        const html2canvas = (await import('html2canvas')).default;
        const pageEl = doc.querySelector('.page') as HTMLElement || doc.body;
        const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794,
        });

        // Create PDF — handle multi-page if content is taller than A4
        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/jpeg', 0.97);
        const pageHeightPx = canvas.width * (297 / 210); // maintain A4 ratio
        const totalPages = Math.ceil(canvas.height / pageHeightPx);
        for (let page = 0; page < totalPages; page++) {
            if (page > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, -(page * 297), 210, (canvas.height / canvas.width) * 210);
        }

        // Extract filename from HTML <title> tag (e.g. "SAL-00030")
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const titleText = titleMatch?.[1]?.trim() || `invoice-${id}`;
        const filename = _filename || `${titleText}.pdf`;

        pdf.save(filename);
    } finally {
        _downloading.delete(id);
        if (iframe && document.body.contains(iframe)) document.body.removeChild(iframe);
    }
}
