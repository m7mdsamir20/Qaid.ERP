'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { generateQuotationHTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2 } from 'lucide-react';

export default function PrintQuotationPage() {
    const { id } = useParams<{ id: string }>();
    const [html, setHtml] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    useEffect(() => {
        fetch(`/api/print/quotation/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                const generated = generateQuotationHTML(data.quotation, data.company, { noAutoPrint: true });
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => { setError('فشل تحميل عرض السعر'); setLoading(false); });
    }, [id]);

    const handleIframeLoad = useCallback(() => {
        if (autoPrinted.current) return;
        autoPrinted.current = true;
        setTimeout(() => {
            iframeRef.current?.contentWindow?.print();
        }, 300);
    }, []);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleDownloadPdf = () => {
        const printHtml = html.replace('</body>', `
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 200);
  };
</script>
</body>`);
        const blob = new Blob([printHtml], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>جاري تحميل عرض السعر...</span>
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
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 20px', background: '#16213e',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                flexShrink: 0,
            }}>
                <span style={{ fontFamily: 'Cairo, sans-serif', color: '#fff', fontWeight: 700, fontSize: '14px', marginLeft: 'auto' }}>
                    عارض عرض السعر
                </span>
                <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
                    <button
                        onClick={handlePrint}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: '#4f46e5', color: '#fff', fontFamily: 'Cairo, sans-serif',
                            fontSize: '13px', fontWeight: 700, transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                        onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
                    >
                        <Printer size={15} /> طباعة
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer',
                            background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: 'Cairo, sans-serif',
                            fontSize: '13px', fontWeight: 700, transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.25)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(16,185,129,0.15)'}
                    >
                        <Download size={15} /> تنزيل PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)', color: '#aaa', fontFamily: 'Cairo, sans-serif',
                            fontSize: '13px', fontWeight: 700, transition: 'background 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    >
                        <X size={15} /> إغلاق
                    </button>
                </div>
            </div>
            {/* Quotation iframe */}
            <iframe
                ref={iframeRef}
                srcDoc={html}
                onLoad={handleIframeLoad}
                style={{ flex: 1, border: 'none', background: '#fff' }}
                title="quotation-print"
            />
        </div>
    );
}
