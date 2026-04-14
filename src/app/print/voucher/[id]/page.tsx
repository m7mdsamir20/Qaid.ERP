'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { generateThermalVoucherHTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2 } from 'lucide-react';

export default function PrintVoucherPage() {
    const { id } = useParams<{ id: string }>();
    const [html, setHtml] = useState('');
    const [voucherNum, setVoucherNum] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    useEffect(() => {
        fetch(`/api/print/voucher/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                const type = data.voucher?.type || 'receipt';
                const generated = generateThermalVoucherHTML(data.voucher, type, data.company, { noAutoPrint: true });
                const num = String(data.voucher?.voucherNumber || id).padStart(5, '0');
                setVoucherNum(num);
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => { setError('فشل تحميل السند'); setLoading(false); });
    }, [id]);

    const handleIframeLoad = useCallback(() => {
        if (autoPrinted.current) return;
        autoPrinted.current = true;
        setTimeout(() => iframeRef.current?.contentWindow?.print(), 300);
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
            const body = iframeDoc.body;
            const canvas = await html2canvas(body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: body.scrollWidth,
                height: body.scrollHeight,
            });
            // Thermal: 80mm wide, auto height
            const mmW = 80;
            const mmH = (canvas.height * mmW) / canvas.width;
            const pdf = new jsPDF('p', 'mm', [mmW, mmH]);
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, mmW, mmH);
            pdf.save(`voucher-${voucherNum}.pdf`);
        } catch (e) {
            console.error(e);
            alert('فشل تحميل PDF');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري تحميل السند...</span>
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
                    عارض السند
                </span>
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
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
            <div style={{ flex: 1, background: '#2d2d2d', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
                <iframe ref={iframeRef} srcDoc={html} onLoad={handleIframeLoad} style={{ border: 'none', background: '#fff', width: '80mm', minHeight: '200px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} title="voucher-print" />
            </div>
        </div>
    );
}
