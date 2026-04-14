'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Printer, Download, X, Loader2 } from 'lucide-react';

export default function PrintReportPage() {
    const [html, setHtml] = useState('');
    const [title, setTitle] = useState('تقرير');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    useEffect(() => {
        const stored = sessionStorage.getItem('print_report_html');
        const storedTitle = sessionStorage.getItem('print_report_title');
        if (stored) {
            setHtml(stored);
            if (storedTitle) setTitle(storedTitle);
        }
        setLoading(false);
    }, []);

    const handleIframeLoad = useCallback(() => {
        if (autoPrinted.current) return;
        autoPrinted.current = true;
        setTimeout(() => iframeRef.current?.contentWindow?.print(), 500);
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
            // نحسب العرض الفعلي للمحتوى (بدون الفراغ الزايد)
            const pageEl = iframeDoc.querySelector('.page') as HTMLElement || iframeDoc.body;
            const canvas = await html2canvas(pageEl, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                windowWidth: pageEl.scrollWidth,
                width: pageEl.scrollWidth,
                height: pageEl.scrollHeight,
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
                while (remaining > 0) {
                    pos -= ph;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, pos, pw, imgH);
                    remaining -= ph;
                }
            }
            const safeName = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-');
            pdf.save(`${safeName}.pdf`);
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
            <span>جاري تحميل التقرير...</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    if (!html) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fb7185', fontFamily: 'Cairo, sans-serif', fontSize: '16px' }}>
            لا يوجد تقرير للعرض
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', fontWeight: 700, fontSize: '14px', marginLeft: 'auto' }}>
                    {title}
                </span>
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
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
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title="report-print"
            />
        </div>
    );
}
