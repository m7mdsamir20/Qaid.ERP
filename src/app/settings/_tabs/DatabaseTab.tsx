'use client';

import { C, CAIRO, INTER } from '@/constants/theme';
import {
    Database, Download, FileSpreadsheet, UploadCloud, Users, Truck, Package,
    Plus, Save, Loader2, Check, X, Layers, MapPin
} from 'lucide-react';
import CustomSelect from '@/components/CustomSelect';
import { TabHeader } from './shared';

interface DatabaseTabProps {
    company: any;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    showImportModal: boolean;
    setShowImportModal: (v: boolean) => void;
    importType: 'customers' | 'suppliers' | 'items' | null;
    setImportType: (v: 'customers' | 'suppliers' | 'items' | null) => void;
    importStep: number;
    setImportStep: (v: number) => void;
    importData: any[];
    setImportData: (v: any[]) => void;
    importLoading: boolean;
    currentImportIndex: number;
    warehouses: { id: string; name: string; code: string }[];
    selectedWarehouseId: string;
    setSelectedWarehouseId: (v: string) => void;
    handleImportFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    processImport: () => void;
}

export default function DatabaseTab({
    company, showToast, showImportModal, setShowImportModal, importType, setImportType,
    importStep, setImportStep, importData, setImportData, importLoading, currentImportIndex,
    warehouses, selectedWarehouseId, setSelectedWarehouseId,
    handleImportFileChange, processImport
}: DatabaseTabProps) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title="قاعدة البيانات والنسخ الاحتياطي"
                sub="إدارة بياناتك، تحميل نسخ احتياطية، أو استعادة النظام"
                hideEditBtn
            />

            <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <Database size={14} /> النسخ الاحتياطي اليدوي
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                {/* JSON Backup */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ color: C.primary }}><Download size={15} /></div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>نسخة كاملة (JSON)</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>مثالي للاستعادة الكاملة</div>
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                            تصدير كامل قابل للاستعادة — ينصح به كنسخ احتياطي دوري آمن
                        </span>
                        <button className="action-btn"
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/settings/backup?format=json');
                                    if (!res.ok) { alert('فشل التحميل'); return; }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    const cd = res.headers.get('Content-Disposition') || '';
                                    a.download = cd.split('filename="')[1]?.replace('"', '') || 'backup.json';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                } catch { alert('فشل التحميل'); }
                            }}
                            style={{ height: '38px', padding: '0 20px', borderRadius: '10px', border: 'none', background: `linear-gradient(135deg, ${C.primary}, #2563eb)`, color: '#fff', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: `0 4px 12px ${C.primary}30`, flexShrink: 0, fontFamily: CAIRO }}>
                            <Download size={14} /> تحميل JSON
                        </button>
                    </div>
                </div>

                {/* Excel */}
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ color: '#10b981' }}><FileSpreadsheet size={15} /></div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>نسخة Excel</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>للمراجعة والطباعة</div>
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                            تصدير العملاء، الموردين، الأصناف، والفواتير بصيغة جدولية للمراجعة
                        </span>
                        <button className="action-btn"
                            onClick={async () => {
                                try {
                                    const res = await fetch('/api/settings/backup?format=excel');
                                    if (!res.ok) { alert('فشل التحميل'); return; }
                                    const blob = await res.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    const cd = res.headers.get('Content-Disposition') || '';
                                    a.download = cd.split('filename="')[1]?.replace('"', '') || 'backup.xls';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                } catch { alert('فشل التحميل'); }
                            }}
                            style={{ height: '38px', padding: '0 20px', borderRadius: '10px', border: `1px solid rgba(16,185,129,0.3)`, background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontFamily: CAIRO }}>
                            <Download size={14} /> تحميل Excel
                        </button>
                    </div>
                </div>


                {/* استعادة JSON */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                        <div style={{ color: '#f59e0b' }}><UploadCloud size={15} /></div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>استعادة نسخة</div>
                            <div style={{ fontSize: '10px', color: C.textMuted, marginTop: '2px', fontFamily: CAIRO }}>من ملف JSON فقط</div>
                        </div>
                    </div>
                    <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                            استعادة كافة بيانات النظام من نسخة احتياطية سابقة محملة مسبقاً
                        </span>
                        <label className="action-btn" style={{ height: '38px', padding: '0 20px', borderRadius: '10px', border: `1px solid rgba(245,158,11,0.3)`, background: 'rgba(245,158,11,0.08)', color: '#f59e0b', fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontFamily: CAIRO }}>
                            <UploadCloud size={14} /> اختر ملف JSON
                            <input type="file" accept=".json" style={{ display: 'none' }}
                                onChange={async e => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                        const text = await file.text();
                                        const backup = JSON.parse(text);
                                        const res = await fetch('/api/settings/backup', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(backup),
                                        });
                                        const d = await res.json();
                                        if (res.ok) {
                                            alert(
                                                `✅ تم التحقق من النسخة\n\n` +
                                                `الشركة: ${d.companyName}\n` +
                                                `التصدير: ${new Date(d.exportedAt).toLocaleDateString('ar-EG')}\n\n` +
                                                `عملاء: ${d.stats.customers}\n` +
                                                `موردين: ${d.stats.suppliers}\n` +
                                                `أصناف: ${d.stats.items}\n` +
                                                `فواتير: ${d.stats.invoices}\n` +
                                                `موظفين: ${d.stats.employees}`
                                            );
                                        } else {
                                            alert('❌ ' + d.error);
                                        }
                                    } catch { alert('❌ ملف غير صالح'); }
                                    e.target.value = '';
                                }} />
                        </label>
                    </div>
                </div>
            </div>



            {/* ── استيراد Excel ── */}
            <div style={{ fontSize: '12px', fontWeight: 900, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '24px' }}>
                <FileSpreadsheet size={14} /> استيراد البيانات من Excel
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                {[
                    { id: 'customers', label: 'العملاء', icon: <Users size={15} />, color: C.primary, desc: 'استيراد قائمة العملاء وأرصدتهم الافتتاحية' },
                    { id: 'suppliers', label: 'الموردين', icon: <Truck size={15} />, color: '#10b981', desc: 'استيراد قائمة الموردين والمستحقات السابقة' },
                    { id: 'items', label: 'الأصناف', icon: <Package size={15} />, color: '#a78bfa', desc: 'استيراد الأصناف والأسعار والمخزون الأولي' },
                ].map((item, i, arr) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ width: '220px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                            <div style={{ color: item.color }}>{item.icon}</div>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: C.textSecondary, fontFamily: CAIRO }}>{item.label}</span>
                        </div>
                        <div style={{ flex: 1, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>{item.desc}</span>
                            <button className="action-btn"
                                onClick={() => { setImportType(item.id as any); setShowImportModal(true); setImportStep(1); }}
                                style={{ height: '36px', padding: '0 18px', borderRadius: '10px', border: `1px solid ${item.color}30`, background: `${item.color}10`, color: item.color, fontSize: '12px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, fontFamily: CAIRO }}>
                                <FileSpreadsheet size={13} /> فتح معالج الاستيراد
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* --- Import Modal --- */}
            {showImportModal && (
                <div onClick={() => !importLoading && setShowImportModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,23,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div onClick={e => e.stopPropagation()} dir="rtl" style={{ width: '100%', maxWidth: importStep === 2 && importType !== 'items' ? '820px' : importStep === 2 && importType === 'items' ? '780px' : '620px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transition: 'max-width 0.3s ease' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                    <FileSpreadsheet size={20} />
                                </div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>
                                    استيراد {importType === 'customers' ? 'العملاء' : importType === 'suppliers' ? 'الموردين' : 'الأصناف'}
                                </h2>
                            </div>
                            <button
                                onClick={() => setShowImportModal(false)}
                                disabled={importLoading}
                                style={{
                                    width: '30px', height: '30px', borderRadius: '6px',
                                    border: `1px solid ${C.border}`, background: 'transparent',
                                    color: C.textMuted, cursor: importLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => {
                                    if (!importLoading) {
                                        e.currentTarget.style.color = C.danger;
                                        e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.color = C.textMuted;
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.borderColor = C.border;
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div style={{ padding: '24px' }}>
                            {importStep === 1 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', border: '2px dashed rgba(59,130,246,0.2)', borderRadius: '16px', background: 'rgba(59,130,246,0.02)' }}>
                                    <FileSpreadsheet size={48} style={{ color: '#3b82f6', marginBottom: '16px', opacity: 0.5 }} />
                                    <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700 }}>اختر ملف Excel</h3>
                                    <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>
                                        {importType === 'items'
                                            ? 'الأعمدة المطلوبة: اسم الصنف، التصنيف، وحدة القياس، سعر التكلفة، سعر البيع، الكمية الافتتاحية'
                                            : 'الأعمدة المطلوبة: الاسم، الهاتف، العنوان، الرصيد الافتتاحي، نوع الرصيد'}
                                    </p>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '10px', background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(59,130,246,0.3)' }}>
                                        <Plus size={18} /> اختيار الملف
                                        <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} />
                                    </label>
                                </div>
                            )}

                            {importStep === 2 && (
                                <div>
                                    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '14px 18px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <Check size={18} />
                                        <span style={{ fontWeight: 700, fontFamily: CAIRO, fontSize: '13px' }}>تم العثور على {importData.length} سجل — راجع البيانات قبل الحفظ</span>
                                    </div>

                                    {/* ── Warehouse Selector (items only) ── */}
                                    {importType === 'items' && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px 18px', background: 'rgba(59,130,246,0.05)', border: `1px solid ${C.primary}20`, borderRadius: '12px' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, flexShrink: 0 }}>
                                                <Layers size={16} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, fontFamily: CAIRO, marginBottom: '6px' }}>المخزن المستهدف</div>
                                                {warehouses.length === 0 ? (
                                                    <div style={{ fontSize: '12px', color: '#f59e0b', fontFamily: CAIRO, fontWeight: 700 }}>⚠️ لا يوجد مخازن — أضف مخزناً أولاً من صفحة المخازن</div>
                                                ) : (
                                                    <CustomSelect
                                                        value={selectedWarehouseId}
                                                        onChange={(v: string) => setSelectedWarehouseId(v)}
                                                        hideSearch={true}
                                                        placeholder="اختر المخزن..."
                                                        icon={Layers}
                                                        style={{ width: '100%' }}
                                                        options={warehouses.map(w => ({
                                                            value: w.id,
                                                            label: w.name,
                                                            sub: w.code,
                                                            icon: MapPin
                                                        }))}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ maxHeight: '320px', overflowY: 'auto', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'rgba(0,0,0,0.2)' }} className="custom-scrollbar">
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead style={{ background: 'rgba(255,255,255,0.04)', position: 'sticky', top: 0, zIndex: 5 }}>
                                                <tr>
                                                    <th style={{ padding: '12px 14px', textAlign: 'start', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: C.textSecondary, fontWeight: 900, fontSize: '12px' }}>الاسم</th>
                                                    <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: C.textSecondary, fontWeight: 900, fontSize: '12px' }}>
                                                        {importType === 'items' ? 'الوحدة' : 'الهاتف'}
                                                    </th>
                                                    {importType === 'items' ? (
                                                        <>
                                                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: C.textSecondary, fontWeight: 900, fontSize: '12px' }}>الكمية</th>
                                                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: C.primary, fontWeight: 900, fontSize: '12px' }}>سعر التكلفة</th>
                                                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: '#f59e0b', fontWeight: 900, fontSize: '12px', background: 'rgba(245,158,11,0.04)' }}>إجمالي التكلفة</th>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: '#ef4444', fontWeight: 900, fontSize: '12px', background: 'rgba(239,68,68,0.04)' }}>مدين (عليه)</th>
                                                            <th style={{ padding: '12px 14px', textAlign: 'center', borderBottom: `1px solid ${C.border}`, fontFamily: CAIRO, color: '#10b981', fontWeight: 900, fontSize: '12px', background: 'rgba(16,185,129,0.04)' }}>دائن (له)</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importData.slice(0, 20).map((row: any, i: number) => {
                                                    // Smart helpers for preview
                                                    const findT = (keys: string[]) => {
                                                        const k = Object.keys(row).find(c => keys.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                                                        return k ? String(row[k] || '').trim() : '';
                                                    };
                                                    const findV = (keys: string[]) => {
                                                        const k = Object.keys(row).find(c => keys.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                                                        return k ? (parseFloat(String(row[k]).replace(/,/g, '')) || 0) : 0;
                                                    };

                                                    const name = importType === 'items'
                                                        ? findT([
                                                            'اسم الصنف', 'اسماء الصنف', 'الصنف', 'الصنف / الخدمة',
                                                            'البضاعة', 'البضائع', 'السلعة', 'السلع',
                                                            'المادة', 'الخامة', 'المنتج', 'الخدمة',
                                                            'الوصف', 'البيان', 'البند', 'المقال',
                                                            'اسم', 'الاسم',
                                                            'item', 'item name', 'product', 'article', 'goods', 'material', 'description', 'name'
                                                        ])
                                                        : findT([
                                                            'اسم', 'الاسم', 'اسماء', 'الاسماء', 'الأسماء', 'بيان', 'البيان',
                                                            'عميل', 'العميل', 'عملاء', 'العملاء',
                                                            'مورد', 'المورد', 'موردين', 'الموردين',
                                                            'شركة', 'الشركة', 'جهة', 'الجهة',
                                                            'name', 'client', 'supplier', 'customer', 'party'
                                                        ]);

                                                    // Calculate preview debit / credit
                                                    let previewDebit = 0;
                                                    let previewCredit = 0;

                                                    if (importType !== 'items') {
                                                        const dVal = findV(['مدين', 'عليه', 'علية', 'debit', ' dr']);
                                                        const cVal = findV(['دائن', 'له', 'لة', 'credit', ' cr']);
                                                        const gBal = findV(['رصيد', 'balance', 'bal', 'افتتاحي', 'opening']);
                                                        const typeStr = findT(['نوع', 'type', 'حالة', 'status']);

                                                        if (dVal > 0 || cVal > 0) {
                                                            previewDebit = dVal;
                                                            previewCredit = cVal;
                                                        } else if (gBal !== 0) {
                                                            const absVal = Math.abs(gBal);
                                                            let isCredit = importType === 'suppliers';
                                                            if (typeStr) isCredit = ['دائن', 'له', 'لة', 'credit', 'cr'].some(kw => typeStr.toLowerCase().includes(kw));
                                                            else if (gBal < 0) isCredit = importType === 'customers';
                                                            if (isCredit) previewCredit = absVal; else previewDebit = absVal;
                                                        }
                                                    }

                                                    return (
                                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                            <td style={{ padding: '11px 14px', fontFamily: CAIRO, fontWeight: 700, color: C.textPrimary }}>{String(name || String(Object.values(row)[0] || ''))}</td>
                                                            <td style={{ padding: '11px 14px', textAlign: 'center', color: C.textMuted, fontSize: '12px' }}>
                                                                {importType === 'items'
                                                                    ? findT(['وحدة القياس', 'الوحدة', 'وحده', 'القياس', 'unit', 'measure', 'uom'])
                                                                    : findT(['هاتف', 'جوال', 'موبايل', 'phone', 'mobile'])}
                                                            </td>
                                                            {importType === 'items' ? (
                                                                <>
                                                                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 800, color: C.textSecondary, fontFamily: 'monospace' }}>
                                                                        {findV(['كمية افتتاحية', 'كمية حالية', 'الكمية', 'كمية', 'stock', 'qty', 'quantity']).toLocaleString('en-US')}
                                                                    </td>
                                                                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 800, color: C.primary, fontFamily: 'monospace' }}>
                                                                        {findV(['تكلفة', 'cost']).toLocaleString('en-US')}
                                                                    </td>
                                                                    <td style={{ padding: '11px 14px', textAlign: 'center', fontWeight: 900, color: '#f59e0b', fontFamily: 'monospace', background: 'rgba(245,158,11,0.03)' }}>
                                                                        {(findV(['كمية افتتاحية', 'كمية حالية', 'الكمية', 'كمية', 'stock', 'qty', 'quantity']) * findV(['تكلفة', 'cost'])).toLocaleString('en-US')}
                                                                    </td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td style={{ padding: '11px 14px', textAlign: 'center', background: 'rgba(239,68,68,0.03)' }}>
                                                                        {previewDebit > 0
                                                                            ? <span style={{ fontWeight: 900, color: '#ef4444', fontFamily: 'monospace' }}>{previewDebit.toLocaleString('en-US')}</span>
                                                                            : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '16px' }}>—</span>}
                                                                    </td>
                                                                    <td style={{ padding: '11px 14px', textAlign: 'center', background: 'rgba(16,185,129,0.03)' }}>
                                                                        {previewCredit > 0
                                                                            ? <span style={{ fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>{previewCredit.toLocaleString('en-US')}</span>
                                                                            : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '16px' }}>—</span>}
                                                                    </td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {importData.length > 20 && (
                                            <div style={{ padding: '12px 14px', textAlign: 'center', color: C.textMuted, fontSize: '12px', fontFamily: CAIRO, borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                                و {importData.length - 20} سجل إضافي سيتم استيرادهم بالكامل
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                        <button onClick={processImport} style={{ flex: 1, height: '46px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(16,185,129,0.4)', fontFamily: CAIRO, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Save size={16} /> تأكيد وحفظ البيانات
                                        </button>
                                        <button onClick={() => { setImportStep(1); setImportData([]); }} style={{ height: '46px', padding: '0 24px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textMuted, fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                                    </div>
                                </div>
                            )}

                            {importStep === 3 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                    <Loader2 size={48} style={{ animation: 'spin 1s linear infinite', color: C.primary, marginBottom: '24px' }} />
                                    <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 900, fontFamily: CAIRO }}>جاري معالجة البيانات...</h3>
                                    <p style={{ margin: '0 0 24px', color: C.textMuted, fontFamily: CAIRO }}>
                                        جاري استيراد السجل {currentImportIndex + 1} من {importData.length}
                                    </p>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${((currentImportIndex + 1) / importData.length) * 100}%`, height: '100%', background: C.primary, transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
