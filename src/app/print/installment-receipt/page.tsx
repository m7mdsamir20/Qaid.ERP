'use client';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateThermalVoucherHTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2, Receipt } from 'lucide-react';

function InstallmentReceiptContent() {
    const params        = useSearchParams();
    const [html, setHtml]           = useState('');
    const [loading, setLoading]     = useState(true);
    const [downloading, setDownloading] = useState(false);
    const iframeRef   = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    const customerName = params.get('customerName') || '—';
    const amount       = parseFloat(params.get('amount') || '0');
    const paymentType  = params.get('paymentType') || 'cash';
    const treasuryName = params.get('treasuryName') || '';
    const instNo       = params.get('instNo') || '1';
    const planCode     = params.get('planCode') || '';
    const notes        = params.get('notes') || '';

    useEffect(() => {
        fetch('/api/settings')
            .then(r => r.json())
            .then(data => {
                const company = data.company || {};
                const description = `تحصيل قسط رقم #${instNo} — ${planCode}${notes ? ' — ' + notes : ''}`;
                const generated = generateThermalVoucherHTML({
                    voucherNumber: instNo,
                    date: new Date().toISOString(),
                    amount,
                    paymentType,
                    customer: { name: customerName },
                    treasury: { name: treasuryName },
                    description,
                }, 'receipt', company, { noAutoPrint: true });
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

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
            const renderW = iframeRef.current!.clientWidth || 794;
            const canvas = await html2canvas(iframeDoc.body, {
                scale: 2, useCORS: true, allowTaint: true,
                backgroundColor: '#ffffff',
                windowWidth: renderW, width: renderW,
                height: iframeDoc.body.scrollHeight,
                scrollX: 0, scrollY: 0,
            });
            const pw = 210, ph = 297;
            const pdf = new jsPDF('p', 'mm', [pw, ph]);
            const imgData = canvas.toDataURL('image/png');
            const imgH = (canvas.height * pw) / canvas.width;
            if (imgH <= ph) {
                pdf.addImage(imgData, 'PNG', 0, 0, pw, imgH);
            } else {
                let pos = 0, remaining = imgH;
                pdf.addImage(imgData, 'PNG', 0, pos, pw, imgH);
                remaining -= ph;
                while (remaining > 0) { pos -= ph; pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, pos, pw, imgH); remaining -= ph; }
            }
            pdf.save(`receipt-${planCode}-inst${instNo}.pdf`);
        } catch (e) { console.error(e); alert('فشل تحميل PDF'); }
        finally { setDownloading(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري إعداد سند القبض...</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                        <Receipt size={16} />
                    </div>
                    <span style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', fontWeight: 700, fontSize: '13px' }}>
                        سند قبض — <span style={{ color: '#10b981' }}>{planCode}</span> — قسط #{instNo}
                    </span>
                </div>
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handlePrint}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700 }}>
                        <Printer size={15} /> طباعة
                    </button>
                    <button onClick={handleDownloadPdf} disabled={downloading}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', cursor: downloading ? 'wait' : 'pointer', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700, opacity: downloading ? 0.7 : 1 }}>
                        {downloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
                        {downloading ? 'جاري التحميل...' : 'تنزيل PDF'}
                    </button>
                    <button onClick={() => window.close()}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#aaa', fontFamily: 'Cairo, sans-serif', fontSize: '13px', fontWeight: 700 }}>
                        <X size={15} /> إغلاق
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title="installment-receipt-print"
            />
        </div>
    );
}

export default function InstallmentReceiptPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
        }>
            <InstallmentReceiptContent />
        </Suspense>
    );
}
