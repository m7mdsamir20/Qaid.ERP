import { generateA4HTML } from '@/lib/printInvoices';

export async function printInvoiceDirectly(id: string) {
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`/api/print/invoice/${id}`);
        const data = await res.json();
        
        if (data.error) {
            alert(data.error);
            document.body.style.cursor = 'default';
            return;
        }
        
        const type = data.invoice?.type || 'sale';
        const html = generateA4HTML(data.invoice, type, data.company, {
            partyBalance: data.invoice?.customer?.balance ?? data.invoice?.supplier?.balance,
            noAutoPrint: false
        });

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '1px';
        iframe.style.height = '1px';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document || iframe.contentDocument;
        if (doc) {
            doc.open();
            doc.write(html);
            doc.close();
            
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
            }, 120000); // 2 minutes
        }
    } catch (e) {
        console.error(e);
        alert('فشل تجهيز الفاتورة للطباعة');
    } finally {
        document.body.style.cursor = 'default';
    }
}

export async function printVoucherDirectly(id: string) {
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`/api/print/voucher/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateThermalVoucherHTML } = await import('@/lib/printInvoices');
        const type = data.voucher?.type || 'receipt';
        const html = generateThermalVoucherHTML(data.voucher, type, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); } finally { document.body.style.cursor = 'default'; }
}

export async function printQuotationDirectly(id: string) {
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`/api/print/quotation/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateQuotationHTML } = await import('@/lib/printInvoices');
        const html = generateQuotationHTML(data.quotation, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); } finally { document.body.style.cursor = 'default'; }
}

export async function printInstallmentDirectly(id: string) {
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`/api/print/installment/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateInstallmentPlanHTML } = await import('@/lib/printInvoices');
        const html = generateInstallmentPlanHTML(data.plan, data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); } finally { document.body.style.cursor = 'default'; }
}

export async function printInstallmentReceiptDirectly(id: string) {
    try {
        document.body.style.cursor = 'wait';
        const res = await fetch(`/api/print/installment-receipt/${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        const { generateThermalVoucherHTML } = await import('@/lib/printInvoices');
        const html = generateThermalVoucherHTML(data.receipt, 'receipt', data.company, { noAutoPrint: false });
        injectPrintIframe(html);
    } catch (e) { console.error(e); alert('فشل الطباعة'); } finally { document.body.style.cursor = 'default'; }
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
        setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 120000);
    }
}
