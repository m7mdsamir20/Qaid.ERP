'use client';
import { useTranslation } from '@/lib/i18n';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateA4HTML } from '@/lib/printInvoices';
import { Printer, Download, X, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { CAIRO } from '@/constants/theme';
import { generatePdfFromHtmlText } from '@/lib/printDirectly';

export default function PrintInvoicePage() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const { status } = useSession();
    const router = useRouter();
    const [html, setHtml] = useState('');
    const [invoiceNum, setInvoiceNum] = useState('');
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState('');
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const autoPrinted = useRef(false);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push(`/login?callbackUrl=/print/invoice/${id}`);
            return;
        }
        if (status === 'loading') return;

        fetch(`/api/print/invoice/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) { setError(data.error); setLoading(false); return; }
                const type = data.invoice?.type || 'sale';
                const generated = generateA4HTML(data.invoice, type, data.company, {
                    partyBalance: data.invoice?.customer?.balance ?? data.invoice?.supplier?.balance,
                    noAutoPrint: true
                });
                setInvoiceNum(String(data.invoice?.invoiceNumber || id).padStart(5, '0'));
                setHtml(generated);
                setLoading(false);
            })
            .catch(() => { setError(t("فشل تحميل الفاتورة")); setLoading(false); });
    }, [id, status, router]);

    const handleIframeLoad = useCallback(() => {
        if (autoPrinted.current) return;
        autoPrinted.current = true;
        setTimeout(() => iframeRef.current?.contentWindow?.print(), 400);
    }, []);

    const handlePrint = () => iframeRef.current?.contentWindow?.print();

    const handleDownloadPdf = async () => {
        if (!html) return;
        setDownloading(true);
        try {
            await generatePdfFromHtmlText(html, `invoice-${invoiceNum}.pdf`);
        } catch (e) { console.error(e); alert(t("فشل تحميل PDF")); }
        finally { setDownloading(false); }
    };

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', gap: '12px', color: '#fff', fontFamily: CAIRO }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            <span>{t("جاري تحميل الفاتورة...")}</span>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );
    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a1a2e', color: '#fb7185', fontFamily: CAIRO, fontSize: '13px' }}>{error}</div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a2e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', background: '#16213e', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', flexShrink: 0 }}>
                <span style={{ fontFamily: CAIRO, color: '#fff', fontWeight: 700, fontSize: '13px' }}>{t("عارض الفاتورة")}</span>
                <div style={{ marginInlineStart: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontFamily: CAIRO, fontSize: '13px', fontWeight: 700 }}>
                        <Printer size={15} /> {t("طباعة")}
                    </button>
                    <button onClick={handleDownloadPdf} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', cursor: downloading ? 'wait' : 'pointer', background: 'rgba(16,185,129,0.15)', color: '#10b981', fontFamily: CAIRO, fontSize: '13px', fontWeight: 700, opacity: downloading ? 0.7 : 1 }}>
                        {downloading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={15} />}
                        {downloading ? t("جاري التحميل...") : t("تنزيل PDF")}
                    </button>

                    <button onClick={() => window.close()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.08)', color: '#aaa', fontFamily: CAIRO, fontSize: '13px', fontWeight: 700 }}>
                        <X size={15} /> {t("إغلاق")}
                    </button>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <iframe ref={iframeRef} srcDoc={html} onLoad={handleIframeLoad} style={{ flex: 1, border: 'none', background: '#fff' }} title="invoice-print" />
        </div>
    );
}
