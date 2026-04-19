'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { generateInstallmentPlanHTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2, CreditCard } from 'lucide-react';

export default function PrintInstallmentPage() {
    const { id } = useParams<{ id: string }>();
    const [html, setHtml]           = useState('');
    const [planCode, setPlanCode]   = useState('');
    const [loading, setLoading]     = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError]         = useState('');
    const iframeRef   = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    useEffect(() => {
        Promise.all([
            fetch(`/api/installments/${id}`).then(r => r.json()),
            fetch('/api/settings').then(r => r.json()),
        ])
            .then(([plan, settings]) => {
                if (plan?.error) { setError(plan.error); setLoading(false); return; }
                const generated = generateInstallmentPlanHTML(plan, settings.company || {}, { noAutoPrint: true });
                setPlanCode(`PLAN-${String(plan.planNumber || 1).padStart(4, '0')}`);
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => { setError('فشل تحميل جدول الأقساط'); setLoading(false); });
    }, [id]);

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
            pdf.save(`installment-${planCode}.pdf`);
        } catch (e) { console.error(e); alert('فشل تحميل PDF'); }
        finally { setDownloading(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري تحميل جدول الأقساط...</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fb7185', fontFamily: 'Cairo, sans-serif', fontSize: '16px' }}>{error}</div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(37,106,244,0.2)', border: '1px solid rgba(37,106,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5286ed' }}>
                        <CreditCard size={16} />
                    </div>
                    <span style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                        جدول الأقساط — <span style={{ color: '#5286ed' }}>{planCode}</span>
                    </span>
                </div>

                {/* Action Buttons */}
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
            {/* Document Preview */}
            <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title="installment-plan-print"
            />
        </div>
    );
}
