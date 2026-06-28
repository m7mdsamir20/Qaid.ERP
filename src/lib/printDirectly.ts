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

export function printVoucherDirectly(id: string) {
    window.open(`/api/print/voucher/${id}?html=1`, '_blank');
}

export function printQuotationDirectly(id: string) {
    window.open(`/api/print/quotation/${id}?html=1`, '_blank');
}

export function printInstallmentDirectly(id: string) {
    window.open(`/api/print/installment/${id}?html=1`, '_blank');
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

export async function generatePdfFromHtmlText(
    htmlText: string,
    filename: string,
    options: { width?: number; height?: number; pw?: number; ph?: number; orientation?: 'p' | 'l' } = {}
) {
    const res = await fetch('/api/pdf/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            html: htmlText,
            filename,
            options
        })
    });

    if (!res.ok) {
        let errorMsg = 'Failed to generate PDF';
        try {
            const errData = await res.json();
            if (errData.error) errorMsg = errData.error;
        } catch {}
        throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function imgH_fit(canvasHeight: number, pw: number, canvasWidth: number): number {
    return (canvasHeight * pw) / canvasWidth;
}

export async function downloadInvoicePDF(id: string, _filename?: string): Promise<void> {
    if (_downloading.has(id)) return;
    _downloading.add(id);
    try {
        const res = await fetch(`/api/pdf/invoice/${id}`);
        if (!res.ok) {
            let errorText = `HTTP ${res.status}`;
            try {
                const errData = await res.json();
                if (errData.error) errorText = errData.error;
            } catch { }
            throw new Error(errorText);
        }
        const blob = await res.blob();

        let filename = _filename;
        if (!filename) {
            const disposition = res.headers.get('content-disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
        }
        if (!filename) {
            filename = `INV-${id.substring(0, 8)}.pdf`;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
        _downloading.delete(id);
    }
}

export function printSalesOrderDirectly(id: string) {
    window.open(`/api/print/sales-order/${id}?html=1`, '_blank');
}

export function printPurchaseOrderDirectly(id: string) {
    window.open(`/api/print/purchase-order/${id}?html=1`, '_blank');
}

export async function downloadSalesOrderPDF(id: string): Promise<void> {
    try {
        const [soRes, coRes] = await Promise.all([
            fetch(`/api/sales-orders/${id}`),
            fetch('/api/company')
        ]);
        const order = await soRes.json();
        const company = await coRes.json();
        if (order.error) throw new Error(order.error);
        const { generateA4HTML } = await import('@/lib/printInvoices');
        const html = generateA4HTML(order, 'sales-order' as any, company, { noAutoPrint: true });
        const num = String(order.orderNumber || 1).padStart(5, '0');
        await generatePdfFromHtmlText(html, `SO-${num}.pdf`);
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message || 'فشل تحميل PDF');
    }
}

export async function downloadPurchaseOrderPDF(id: string): Promise<void> {
    try {
        const [poRes, coRes] = await Promise.all([
            fetch(`/api/purchase-orders/${id}`),
            fetch('/api/company')
        ]);
        const order = await poRes.json();
        const company = await coRes.json();
        if (order.error) throw new Error(order.error);
        const { generateA4HTML } = await import('@/lib/printInvoices');
        const html = generateA4HTML(order, 'purchase-order' as any, company, { noAutoPrint: true });
        const num = String(order.orderNumber || 1).padStart(5, '0');
        await generatePdfFromHtmlText(html, `PO-${num}.pdf`);
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message || 'فشل تحميل PDF');
    }
}

export async function downloadVoucherPDF(id: string): Promise<void> {
    try {
        const res = await fetch(`/api/print/voucher/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateThermalVoucherHTML } = await import('@/lib/printInvoices');
        const type = data.voucher?.type || 'receipt';
        const html = generateThermalVoucherHTML(data.voucher, type, data.company, { noAutoPrint: true });
        const num = String(data.voucher?.voucherNumber || id).padStart(5, '0');
        await generatePdfFromHtmlText(html, `voucher-${num}.pdf`, { pw: 80 });
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message || 'فشل تحميل PDF');
    }
}

export async function downloadQuotationPDF(id: string): Promise<void> {
    try {
        const res = await fetch(`/api/print/quotation/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateQuotationHTML } = await import('@/lib/printInvoices');
        const html = generateQuotationHTML(data.quotation, data.company, { noAutoPrint: true });
        const num = String(data.quotation?.quotationNumber || id).padStart(5, '0');
        await generatePdfFromHtmlText(html, `quotation-${num}.pdf`);
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message || 'فشل تحميل PDF');
    }
}

export async function downloadInstallmentPDF(id: string): Promise<void> {
    try {
        const [planRes, coRes] = await Promise.all([
            fetch(`/api/installments/${id}`),
            fetch('/api/company')
        ]);
        const plan = await planRes.json();
        const company = await coRes.json();
        if (plan.error) throw new Error(plan.error);
        const { generateInstallmentPlanHTML } = await import('@/lib/printInvoices');
        const html = generateInstallmentPlanHTML(plan, company, { noAutoPrint: true });
        const planNum = String(plan.planNumber || 1).padStart(5, '0');
        await generatePdfFromHtmlText(html, `installment-plan-${planNum}.pdf`);
    } catch (e: any) {
        console.error(e);
        throw new Error(e.message || 'فشل تحميل PDF');
    }
}

/* ── Iframe print (no popup, works after async) ───────────────── */

export function printHtmlViaIframe(html: string, onAfterPrint?: () => void): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;width:0;height:0;left:-9999px;top:-9999px;border:none;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { onAfterPrint?.(); return; }

    // Strip any auto-print scripts so the iframe doesn't fire a second print dialog
    const cleanHtml = html.replace(/<script[^>]*>[\s\S]*?window\.print[\s\S]*?<\/script>/gi, '');

    doc.open(); doc.write(cleanHtml); doc.close();

    setTimeout(() => {
        iframe.contentWindow?.focus();
        if (onAfterPrint) {
            iframe.contentWindow!.onafterprint = () => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
                onAfterPrint();
            };
        } else {
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 60000);
        }
        iframe.contentWindow?.print();
    }, 500);
}

export async function printInvoiceViaIframe(id: string, onAfterPrint?: () => void): Promise<void> {
    const res = await fetch(`/api/print/invoice/${id}?html=1`);
    const html = await res.text();
    printHtmlViaIframe(html, onAfterPrint);
}

export async function printVoucherViaIframe(id: string, onAfterPrint?: () => void): Promise<void> {
    const res = await fetch(`/api/print/voucher/${id}?html=1`);
    const html = await res.text();
    printHtmlViaIframe(html, onAfterPrint);
}

export async function printQuotationViaIframe(id: string, onAfterPrint?: () => void): Promise<void> {
    const res = await fetch(`/api/print/quotation/${id}?html=1`);
    const html = await res.text();
    printHtmlViaIframe(html, onAfterPrint);
}

/* ── Reports ──────────────────────────────────────────────────── */

export function printReportDirectly(html: string, _title?: string) {
    const printHtml = html.replace('</body>', `<script>window.onload=()=>setTimeout(()=>window.print(),800);</script></body>`);
    const blob = new Blob([printHtml], { type: 'text/html; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function downloadReportPDF(
    html: string,
    title: string = 'تقرير',
    options: { silent?: boolean } = {}
): Promise<void> {
    if (!options.silent) showPrintLoader('جاري تحضير ملف PDF...');
    try {
        await generatePdfFromHtmlText(html, `${title}.pdf`, {
            width: 1123,
            height: 794,
            pw: 297,
            ph: 210,
            orientation: 'l'
        });
    } catch (e: any) {
        console.error(e);
        alert('فشل تحميل PDF');
    } finally {
        if (!options.silent) hidePrintLoader();
    }
}

