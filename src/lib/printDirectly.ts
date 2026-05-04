import { generateA4HTML } from '@/lib/printInvoices';

function showPrintLoader() {
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
        transition: 'opacity 0.2s ease-in-out'
    });
    
    loader.innerHTML = `
        <style>
            @keyframes print-spin { 100% { transform: rotate(360deg); } }
            @keyframes print-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        </style>
        <div style="width: 50px; height: 50px; border: 4px solid rgba(255,255,255,0.15); border-top-color: #3b82f6; border-radius: 50%; margin-bottom: 20px; animation: print-spin 0.8s linear infinite;"></div>
        <div style="font-size: 19px; font-weight: 700; margin-bottom: 8px; animation: print-pulse 1.5s ease-in-out infinite;">جاري تحضير الطباعة...</div>
        <div style="font-size: 13.5px; color: rgba(255,255,255,0.7); font-weight: 500;">يرجى الانتظار لحظات لجمع البيانات والتنسيق</div>
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

export async function printInvoiceDirectly(id: string) {
    try {
        showPrintLoader();
        const res = await fetch(`/api/print/invoice/${id}`);
        const data = await res.json();
        
        if (data.error) {
            alert(data.error);
            hidePrintLoader();
            return;
        }
        
        const type = data.invoice?.type || 'sale';
        const html = generateA4HTML(data.invoice, type, data.company, {
            partyBalance: data.invoice?.customer?.balance ?? data.invoice?.supplier?.balance,
            noAutoPrint: false
        });

        injectPrintIframe(html);
    } catch (e) {
        console.error(e);
        alert('فشل تجهيز الفاتورة للطباعة');
        hidePrintLoader();
    }
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
