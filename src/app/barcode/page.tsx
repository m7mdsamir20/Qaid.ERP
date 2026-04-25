'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { C, CAIRO, OUTFIT, BTN_PRIMARY } from '@/constants/theme';
import { QrCode, Printer, Download, RefreshCw, Loader2, Table2 } from 'lucide-react';

export default function BarcodePage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';

    const [tables,  setTables]  = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [baseUrl, setBaseUrl] = useState('');
    const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

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

    useEffect(() => { load(); }, [load]);

    // Draw QR on canvas using simple QR-like pattern (using data URL)
    const getQrUrl = (tableId: string) => {
        const url = `${baseUrl}/menu?table=${tableId}`;
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
                <img src="${getQrUrl(table.id)}" width="160" height="160" alt="QR" style="border-radius:8px;" />
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
        const url = getQrUrl(table.id);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QR-${table.name}.png`;
        a.target = '_blank';
        a.click();
    };

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ padding: '32px', maxWidth: '1000px', margin: '0 auto', fontFamily: CAIRO }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <QrCode size={24} color={C.primary} /> {t('باركود وQR الطاولات')}
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: C.textMuted }}>{t('توليد QR لكل طاولة — يمكن العميل من الطلب مباشرة عبر هاتفه')}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button onClick={load} style={{ height: '40px', width: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.card, color: C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw size={15} /></button>
                        {selected.size > 0 && (
                            <button onClick={handlePrint} style={{ ...BTN_PRIMARY(false, false), height: '40px', padding: '0 20px', borderRadius: '10px', gap: '6px', fontSize: '13px' }}>
                                <Printer size={15} /> {t('طباعة')} ({selected.size})
                            </button>
                        )}
                    </div>
                </div>

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
                    <div style={{ textAlign: 'center', padding: '80px', color: C.textMuted }}>
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
                                                src={getQrUrl(table.id)}
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
                                        /menu?table={table.id.slice(0, 12)}...
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
                            عند مسح الكود، يفتح العميل صفحة الطلب الذاتي على <strong>{baseUrl}/menu?table=...</strong><br />
                            يمكنه تصفح المنيو واختيار الأصناف وإرسال الطلب مباشرة للمطبخ بدون تدخل النادل.
                        </p>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout>
    );
}
