'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { generateA4HTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2 } from 'lucide-react';

type PageSize = 'A4' | 'A5';

export default function PrintInvoicePage() {
    const { id } = useParams<{ id: string }>();
    const [html, setHtml] = useState('');
    const [invoiceNum, setInvoiceNum] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const [pageSize, setPageSize] = useState<PageSize>('A4');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);
    const rawData = useRef<any>(null);

    useEffect(() => {
        fetch(`/api/print/invoice/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                rawData.current = data;
                const type = data.invoice?.type || 'sale';
                const generated = generateA4HTML(data.invoice, type, data.company, {
                    partyBalance: data.invoice?.customer?.balance ?? data.invoice?.supplier?.balance,
                    noAutoPrint: true,
                });
                const num = String(data.invoice?.invoiceNumber || id).padStart(5, '0');
                setInvoiceNum(num);
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => { setError('فشل تحميل الفاتورة'); setLoading(false); });
    }, [id]);

    // When page size changes, regenerate HTML with new @page size
    useEffect(() => {
        if (!html) return;
        const sized = html
            .replace(/@page\{[^}]*\}/g, '')
            .replace(/@media print\{@page\{[^}]*\}\}/g, '')
            .replace('</style>', `@media print{@page{size:${pageSize} portrait;margin:10mm}}</style>`);
        // Re-inject into iframe
        if (iframeRef.current) {
            iframeRef.current.srcdoc = sized;
        }
    }, [pageSize]); // eslint-disable-line

    const handleIframeLoad = useCallback(() => {
        if (autoPrinted.current) return;
        autoPrinted.current = true;
        setTimeout(() => iframeRef.current?.contentWindow?.print(), 400);
    }, []);

    const handlePrint = () => iframeRef.current?.contentWindow?.print();

    const handleDownloadPdf = async () => {
        const iframeDoc = iframeRef.current?.contentDocument;
        if (!iframeDoc) return;
        setDownloading(true);
        try {
            const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
                import('html2canvas'),
                import('jspdf'),
            ]);
            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
            });
            // A4: 210×297mm  |  A5: 148×210mm
            const dims: Record<PageSize, [number, number]> = { A4: [210, 297], A5: [148, 210] };
            const [pw, ph] = dims[pageSize];
            const pdf = new jsPDF('p', 'mm', [pw, ph]);
            const imgW = pw;
            const imgH = (canvas.height * pw) / canvas.width;
            let remaining = imgH;
            let pos = 0;
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
            remaining -= ph;
            while (remaining > 0) {
                pos -= ph;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, pos, imgW, imgH);
                remaining -= ph;
            }
            pdf.save(`invoice-${invoiceNum}-${pageSize}.pdf`);
        } catch (e) {
            console.error(e);
            alert('فشل تحميل PDF');
        } finally {
            setDownloading(false);
        }
    };

    const switchSize = (size: PageSize) => {
        if (size === pageSize) return;
        autoPrinted.current = true; // prevent re-auto-print on size switch
        setPageSize(size);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري تحميل الفاتورة...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fb7185', fontFamily: 'Cairo, sans-serif', fontSize: '16px' }}>
            {error}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', fontWeight: 700, fontSize: '14px', marginLeft: 'auto' }}>
                    عارض الفاتورة
                </span>
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Page size toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', gap: '2px' }}>
                        {(['A4', 'A5'] as PageSize[]).map(s => (
                            <button
                                key={s}
                                onClick={() => switchSize(s)}
                                style={{
                                    padding: '4px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                                    fontFamily: 'Cairo, sans-serif', fontSize: '12px', fontWeight: 700,
                                    background: pageSize === s ? '#4f46e5' : 'transparent',
                                    color: pageSize === s ? '#fff' : '#aaa',
                                    transition: 'all 0.15s',
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700 }}>
                        <Printer size={15} /> طباعة
                    </button>
                    <button onClick={handleDownloadPdf} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', cursor: downloading ? 'wait' : 'pointer', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700, opacity: downloading ? 0.7 : 1 }}>
                        {downloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
                        {downloading ? 'جاري التحميل...' : 'تنزيل PDF'}
                    </button>
                    <button onClick={() => window.close()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#aaa', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700 }}>
                        <X size={15} /> إغلاق
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title="invoice-print"
            />
        </div>
    );
}
