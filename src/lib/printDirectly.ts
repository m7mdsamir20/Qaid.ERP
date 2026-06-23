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
        const res = await fetch(`/api/print/invoice/${id}?html=1&noPrint=1`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();

        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        const filename = _filename || `${titleMatch?.[1]?.trim() || `invoice-${id}`}.pdf`;

        // Use srcdoc so iframe loads cleanly (same-origin, no blob CSP issues)
        iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'fixed', left: '-9999px', top: '0',
            width: '794px', height: '1200px', border: 'none', visibility: 'hidden',
        });
        document.body.appendChild(iframe);
        (iframe as any).srcdoc = html;

        // Wait for iframe load event
        await new Promise<void>(resolve => {
            const tid = setTimeout(resolve, 5000);
            iframe!.addEventListener('load', () => { clearTimeout(tid); resolve(); }, { once: true });
        });

        // Wait for Google Fonts to finish loading
        try { await iframe.contentDocument!.fonts.ready; } catch {}
        await new Promise(resolve => setTimeout(resolve, 600));

        const iDoc = iframe.contentDocument!;
        const pageEl = iDoc.querySelector('.page') as HTMLElement;
        if (!pageEl) throw new Error('فشل إيجاد عنصر الصفحة');

        // Resize iframe to match actual content so flex-grow spacer doesn't over-expand
        const naturalH = pageEl.scrollHeight;
        iframe.style.height = `${naturalH + 20}px`;
        await new Promise(resolve => setTimeout(resolve, 150));

        const html2canvas = (await import('html2canvas')).default;
        const canvas = await html2canvas(pageEl, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            width: 794,
            height: naturalH,
            windowWidth: 794,
            windowHeight: naturalH,
            scrollX: 0,
            scrollY: 0,
        });

        const { jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Calculate total height in mm (width = 210mm)
        const totalHeightMM = (canvas.height / canvas.width) * 210;
        const pages = Math.ceil(totalHeightMM / 297);
        for (let i = 0; i < pages; i++) {
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, -(i * 297), 210, totalHeightMM);
        }

        pdf.save(filename);
    } finally {
        _downloading.delete(id);
        if (iframe && document.body.contains(iframe)) document.body.removeChild(iframe);
    }
}
