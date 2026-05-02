'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/PageHeader';
import { C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY } from '@/constants/theme';
import { QrCode, Printer, Download, RefreshCw, Loader2, Table2 } from 'lucide-react';

import { useSession } from 'next-auth/react';

export default function BarcodePage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const { data: session, status } = useSession();

    const [tables,  setTables]  = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [baseUrl, setBaseUrl] = useState('');
    const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isRestaurants = businessType === 'RESTAURANTS';

    useEffect(() => {
        if (typeof window !== 'undefined') setBaseUrl(window.location.origin);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/restaurant/tables');
            const data = await r.json();
            setTables(Array.isArray(data) ? data : []);
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { 
        if (status === 'authenticated' && isRestaurants) {
            load(); 
        }
    }, [load, status, isRestaurants]);

    if (status === 'loading') {
        return <DashboardLayout><div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div></DashboardLayout>;
    }

    if (status === 'unauthenticated' || !isRestaurants) {
        return (
            <DashboardLayout>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px', fontFamily: CAIRO }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <QrCode size={40} />
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: C.textPrimary, margin: 0 }}>{t('غير مصرح لك بالدخول')}</h2>
                    <p style={{ fontSize: '15px', color: C.textSecondary, margin: 0 }}>{t('هذه الصفحة مخصصة لقطاع المطاعم والكافيهات فقط.')}</p>
                </div>
            </DashboardLayout>
        );
    }

    // Draw QR on canvas using simple QR-like pattern (using data URL)
    const getQrUrl = (tableId: string, companyId: string) => {
        const url = `${baseUrl}/menu/${companyId}?table=${tableId}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&bgcolor=ffffff&color=000000&qzone=2&format=png`;
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(tables.map(t => t.id)));
    const clearAll  = () => setSelected(new Set());

    const handlePrint = () => {
        const selectedTables = tables.filter(t => selected.has(t.id));
        if (selectedTables.length === 0) return;

        const printContent = selectedTables.map(table => `
            <div style="display:inline-block; text-align:center; margin:20px; padding:20px; border:2px solid #e2e8f0; border-radius:16px; font-family:Arial,sans-serif; page-break-inside:avoid;">
                <div style="font-size:14px; color:#64748b; margin-bottom:8px;">طاولة</div>
                <div style="font-size:28px; font-weight:900; color:#1e293b; margin-bottom:12px;">${table.name}</div>
                <img src="${getQrUrl(table.id, table.companyId)}" width="160" height="160" alt="QR" style="border-radius:8px;" />
                <div style="font-size:11px; color:#94a3b8; margin-top:10px;">امسح للطلب</div>
            </div>
        `).join('');

        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
            <html dir="rtl">
            <head><title>QR الطاولات</title>
            <style>@media print { body { margin: 0; } }</style>
            </head>
            <body style="background:#fff; padding:20px; text-align:center;">
                ${printContent}
                <script>window.onload = () => { setTimeout(() => window.print(), 500); }</script>
            </body></html>
        `);
        win.document.close();
    };

    const handleDownload = async (table: any) => {
        const url = getQrUrl(table.id, table.companyId);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${table.name}.png`;
        a.target = '_blank';
        a.click();
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ paddingBottom: '60px', background: C.bg, minHeight: '100%', fontFamily: CAIRO }}>

                <PageHeader
                    title={t('باركود وQR الطاولات')}
                    subtitle={t('توليد QR لكل طاولة — يمكن العميل من الطلب مباشرة عبر هاتفه')}
                    icon={QrCode}
                    actions={[
                        <button key="refresh" onClick={load} style={{ height: '42px', padding: '0 16px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, fontWeight: 600, transition: 'all 0.2s' }}>
                            <RefreshCw size={16} /> تحديث
                        </button>,
                        selected.size > 0 ? (
                            <button key="print" onClick={handlePrint} style={{ ...BTN_PRIMARY(false, false), height: '42px', padding: '0 20px', borderRadius: '10px', gap: '8px', fontSize: '14px', width: 'auto' }}>
                                <Printer size={16} /> {t('طباعة المحددة')} ({selected.size})
                            </button>
                        ) : null
                    ].filter(Boolean)}
                />

                {/* Select controls */}
                {tables.length > 0 && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: C.textSecondary }}>{selected.size} محدد من {tables.length}</span>
                        <button onClick={selectAll} style={{ fontSize: '12px', color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: CAIRO }}>تحديد الكل</button>
                        {selected.size > 0 && <button onClick={clearAll} style={{ fontSize: '12px', color: C.textMuted, background: 'none', border: 'none', cursor: 'pointer', fontFamily: CAIRO }}>إلغاء التحديد</button>}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: C.textMuted }}><Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : tables.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px', color: C.textMuted }}>
                        <QrCode size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 16px' }} />
                        <p style={{ margin: 0, fontSize: '15px' }}>لا توجد طاولات — أضف طاولات أولاً من صفحة خريطة الطاولات</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                        {tables.map(table => {
                            const isSelected = selected.has(table.id);
                            return (
                                <div key={table.id} onClick={() => toggleSelect(table.id)}
                                    style={{ background: C.card, border: `2px solid ${isSelected ? C.primary : C.border}`, borderRadius: '20px', padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', userSelect: 'none' }}>

                                    {/* Checkbox */}
                                    <div style={{ position: 'absolute', top: '12px', insetInlineStart: '12px', width: '20px', height: '20px', borderRadius: '6px', border: `2px solid ${isSelected ? C.primary : C.border}`, background: isSelected ? C.primary : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                        {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 900 }}>✓</span>}
                                    </div>

                                    {/* Table name */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
                                        <Table2 size={14} color={C.primary} />
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{table.name}</span>
                                    </div>

                                    {/* QR Code */}
                                    {baseUrl && (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img
                                                src={getQrUrl(table.id, table.companyId)}
                                                alt={`QR ${table.name}`}
                                                width={140}
                                                height={140}
                                                style={{ borderRadius: '12px', border: `1px solid ${C.border}` }}
                                                loading="lazy"
                                            />
                                        </div>
                                    )}

                                    {/* URL preview */}
                                    <p style={{ margin: '10px 0 0', fontSize: '10px', color: C.textMuted, wordBreak: 'break-all', direction: 'ltr', textAlign: 'center' }}>
                                        /menu/{table.companyId?.slice(0,8)}...?table={table.id.slice(0, 8)}...
                                    </p>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => handleDownload(table)}
                                            style={{ flex: 1, height: '32px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: CAIRO }}>
                                            <Download size={12} /> تنزيل
                                        </button>
                                        <button onClick={() => { setSelected(new Set([table.id])); setTimeout(handlePrint, 50); }}
                                            style={{ flex: 1, height: '32px', borderRadius: '8px', border: `1px solid ${C.primary}40`, background: `${C.primary}10`, color: C.primary, fontSize: '11.5px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontFamily: CAIRO }}>
                                            <Printer size={12} /> طباعة
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info box */}
                <div style={{ marginTop: '32px', background: `${C.primary}08`, border: `1px solid ${C.primary}20`, borderRadius: '16px', padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <QrCode size={18} color={C.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: C.textPrimary, marginBottom: '4px' }}>كيف يعمل QR الطاولة؟</p>
                        <p style={{ margin: 0, fontSize: '12px', color: C.textSecondary, lineHeight: 1.7 }}>
                            عند مسح الكود، يفتح العميل صفحة الطلب الذاتي على <strong>{baseUrl}/menu/[رقم_المطعم]?table=...</strong><br />
                            يمكنه تصفح المنيو واختيار الأصناف وإرسال الطلب مباشرة للمطبخ بدون تدخل النادل.
                        </p>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
