'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Printer, Download, X, Loader2 } from 'lucide-react';
import { getStoredLang } from '@/lib/i18n';
import { CAIRO } from '@/constants/theme';

export default function PrintReportPage() {
    const [html, setHtml] = useState('');
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);
    const lang = getStoredLang();
    const isRtl = lang === 'ar';

    const ui = {
        loading: isRtl ? 'جاري تحميل التقرير...' : 'Loading report...',
        empty: isRtl ? 'لا يوجد تقرير للعرض' : 'No report to display',
        print: isRtl ? 'طباعة' : 'Print',
        download: isRtl ? 'تنزيل PDF' : 'Download PDF',
        downloading: isRtl ? 'جاري التحميل...' : 'Downloading...',
        close: isRtl ? 'إغلاق' : 'Close',
        pdfError: isRtl ? 'فشل تحميل PDF' : 'PDF download failed',
        defaultTitle: isRtl ? 'تقرير' : 'Report',
    };

    useEffect(() => {
        const stored = sessionStorage.getItem('print_report_html');
        const storedTitle = sessionStorage.getItem('print_report_title');
        setHtml(stored || '');
        setTitle(storedTitle || ui.defaultTitle);
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
            const body = iframeDoc.body;
            const iframeEl = iframeRef.current!;
            const renderW = iframeEl.clientWidth || body.scrollWidth;
            const canvas = await html2canvas(body, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                windowWidth: renderW,
                width: renderW,
                height: body.scrollHeight,
                x: 0, y: 0, scrollX: 0, scrollY: 0,
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
            pdf.save(`${title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '-')}.pdf`);
        } catch (e) {
            console.error(e);
            alert(ui.pdfError);
        } finally {
            setDownloading(false);
        }
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 20px', background: '#1e1e2e',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0, direction: isRtl ? 'rtl' : 'ltr',
    };
    const btnBase: React.CSSProperties = {
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
        fontFamily: CAIRO, fontSize: '13px', fontWeight: 700,
        border: 'none',
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e2e', gap: '12px', color: '#fff', fontFamily: CAIRO }}>
            <Loader2 size={24} className="animate-spin" />
            <span>{ui.loading}</span>
        </div>
    );

    if (!html) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1e1e2e', color: '#fb7185', fontFamily: CAIRO, fontSize: '13px' }}>
            {ui.empty}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1e1e2e' }}>
            <div style={toolbarStyle}>
                <span style={{ fontFamily: CAIRO, color: '#fff', fontWeight: 700, fontSize: '13px', flex: 1 }}>
                    {title}
                </span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handlePrint} style={{ ...btnBase, background: '#4f46e5', color: '#fff' }}>
                        <Printer size={15} /> {ui.print}
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloading}
                        style={{ ...btnBase, background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', opacity: downloading ? 0.7 : 1, cursor: downloading ? 'wait' : 'pointer' }}
                    >
                        {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {downloading ? ui.downloading : ui.download}
                    </button>
                    <button onClick={() => window.close()} style={{ ...btnBase, background: 'rgba(255,255,255,0.08)', color: '#aaa' }}>
                        <X size={15} /> {ui.close}
                    </button>
                </div>
            </div>
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
