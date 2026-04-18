'use client';
import { useEffect, useState, useRef } from 'react';
import { C, CAIRO, BTN_PRIMARY, BTN_DANGER, SEARCH_STYLE, BTN_SUCCESS } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';
import { FileText, Plus, Trash2, Edit, Copy, Check, Settings2, Palette } from 'lucide-react';
import { InvoiceTemplateConfig, defaultTemplateConfig, getDefaultTemplateConfig } from '@/lib/invoiceTemplateDefaults';
import { generateA4HTML } from '@/lib/printInvoices';
import { Toggle } from './shared';

export default function InvoiceTemplatesTab({ showToast, company }: { showToast: (msg: string, type?: 'success' | 'error') => void; company: any }) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTemplate, setActiveTemplate] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const invoiceTypes = [
        { id: 'sale', label: t('مبيعات') },
        { id: 'purchase', label: t('مشتريات') },
        { id: 'sale-return', label: t('مرتجع مبيعات') },
        { id: 'purchase-return', label: t('مرتجع مشتريات') }
    ];

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/invoice-templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
                if (data.length > 0 && !activeTemplate) {
                    setActiveTemplate(data[0]);
                }
            }
        } catch (error) {
            showToast(t('فشل تحميل النماذج'), 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleCreate = (type: string, invoiceType: string) => {
        const newTemplate = {
            name: t('نموذج جديد'),
            invoiceType,
            taxInvoiceType: type,
            layoutConfig: getDefaultTemplateConfig(type as 'standard' | 'simplified'),
            isDefault: false
        };
        setActiveTemplate(newTemplate);
        setIsEditing(true);
    };

    const handleDuplicate = (template: any) => {
        const copy = {
            ...template,
            id: undefined,
            name: template.name + ' (' + t('نسخة') + ')',
            isDefault: false
        };
        setActiveTemplate(copy);
        setIsEditing(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا النموذج؟'))) return;
        try {
            const res = await fetch(`/api/invoice-templates?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast(t('تم الحذف بنجاح'));
                if (activeTemplate?.id === id) setActiveTemplate(null);
                fetchTemplates();
            } else {
                showToast(t('فشل الحذف'), 'error');
            }
        } catch (e) {
            showToast(t('فشل الحذف'), 'error');
        }
    };

    const handleSetDefault = async (id: string, invoiceType: string) => {
        try {
            const res = await fetch('/api/invoice-templates', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isDefault: true, invoiceType })
            });
            if (res.ok) {
                showToast(t('تم التعيين كافتراضي'));
                fetchTemplates();
            }
        } catch (e) {
            showToast(t('فشل التحديث'), 'error');
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const method = activeTemplate.id ? 'PUT' : 'POST';
            const res = await fetch('/api/invoice-templates', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeTemplate)
            });
            if (res.ok) {
                const saved = await res.json();
                showToast(t('تم الحفظ بنجاح'));
                setActiveTemplate(saved);
                setIsEditing(false);
                fetchTemplates();
            } else {
                showToast(t('فشل الحفظ'), 'error');
            }
        } catch (e) {
            showToast(t('حدث خطأ أثناء الحفظ'), 'error');
        }
        setIsSaving(false);
    };

    const updateConfig = (key: string, value: any, section?: string) => {
        setActiveTemplate((prev: any) => {
            const newConfig = { ...prev.layoutConfig };
            if (section) {
                newConfig[section] = { ...newConfig[section], [key]: value };
            } else {
                newConfig[key] = value;
            }
            return { ...prev, layoutConfig: newConfig };
        });
    };

    // Dummy data for preview
    const dummyInvoice = {
        invoiceNumber: 12345,
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        customer: {
            name: 'شركة العميل التجريبية',
            phone: '0501234567',
            addressRegion: 'الرياض',
            addressCity: 'الرياض',
            addressDistrict: 'الملز',
            taxNumber: '310000000000003',
        },
        lines: [
            { item: { name: 'منتج تجريبي 1' }, quantity: 2, price: 100, taxRate: 15, taxAmount: 30, total: 230 },
            { item: { name: 'منتج تجريبي 2 (خدمة)' }, description: 'وصف إضافي', quantity: 1, price: 500, taxRate: 15, taxAmount: 75, total: 575 },
        ],
        subtotal: 700,
        discount: 50,
        taxAmount: 97.5,
        total: 747.5,
        paidAmount: 200,
        notes: 'هذه ملاحظة تجريبية تظهر أسفل الفاتورة.',
        taxRate: 15,
        taxInclusive: false
    };

    // Replace the generateA4HTML with a customized one that listens to layoutConfig
    // For MVP we will just pass config into generateA4HTML and modify printInvoices.ts to accept it
    // Wait, the easiest way is to let generateA4HTML accept a \`templateConfig\` parameter.
    // I will adjust generateA4HTML in printInvoices.ts.
    
    useEffect(() => {
        if (activeTemplate?.layoutConfig && iframeRef.current) {
            const html = generateA4HTML(dummyInvoice, activeTemplate.invoiceType as any, company, {
                noAutoPrint: true,
                templateConfig: activeTemplate.layoutConfig
            });
            iframeRef.current.srcDoc = html;
        }
    }, [activeTemplate, company]);

    return (
        <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
            {/* Left Panel: Templates List OR Editor */}
            <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', gap: '16px', background: C.card, borderRadius: '16px', border: `1px solid ${C.border}`, padding: '16px', overflowY: 'auto' }}>
                {!isEditing ? (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: CAIRO }}>{t('قوالب الطباعة')}</h3>
                            <button onClick={() => handleCreate('simplified', 'sale')} style={{ background: 'transparent', border: 'none', color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 700 }}>
                                <Plus size={16} /> {t('جديد')}
                            </button>
                        </div>
                        {loading ? <div style={{ color: C.textMuted }}>{t('جاري التحميل...')}</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {invoiceTypes.map(type => {
                                    const typeTemplates = templates.filter((t: any) => t.invoiceType === type.id);
                                    if (typeTemplates.length === 0) return null;
                                    return (
                                        <div key={type.id}>
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: C.textMuted, marginBottom: '8px' }}>{type.label}</div>
                                            {typeTemplates.map((tpl: any) => (
                                                <div
                                                    key={tpl.id}
                                                    onClick={() => { setActiveTemplate(tpl); }}
                                                    style={{ display: 'flex', flexDirection: 'column', padding: '12px', borderRadius: '12px', border: `1px solid ${activeTemplate?.id === tpl.id ? C.primary : C.border}`, background: activeTemplate?.id === tpl.id ? 'rgba(37, 106, 244, 0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.2s' }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{tpl.name}</span>
                                                        {tpl.isDefault && <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>{t('افتراضي')}</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '11px', color: C.textMuted }}>{tpl.taxInvoiceType === 'standard' ? t('فاتورة ضريبية') : t('فاتورة ضريبية مبسطة')}</span>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setActiveTemplate(tpl); }} style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><Edit size={14} /></button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl); }} style={{ background: 'transparent', border: 'none', color: '#10b981', cursor: 'pointer' }}><Copy size={14} /></button>
                                                            {!tpl.isDefault && <button onClick={(e) => { e.stopPropagation(); handleSetDefault(tpl.id, tpl.invoiceType); }} style={{ background: 'transparent', border: 'none', color: '#f59e0b', cursor: 'pointer' }}><Check size={14} /></button>}
                                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontFamily: CAIRO }}>{t('تعديل القالب')}</h3>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setIsEditing(false); if (!activeTemplate.id) setActiveTemplate(templates[0] || null); }} style={{ background: 'transparent', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: '12px' }}>{t('إلغاء')}</button>
                                <button onClick={handleSave} disabled={isSaving} style={{ background: C.primary, border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>{t('حفظ')}</button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('اسم القالب')}</label>
                                <input type="text" value={activeTemplate.name} onChange={e => setActiveTemplate({ ...activeTemplate, name: e.target.value })} style={{ width: '100%', padding: '8px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textPrimary }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('نوع الفاتورة')}</label>
                                <select value={activeTemplate.invoiceType} onChange={e => setActiveTemplate({ ...activeTemplate, invoiceType: e.target.value })} style={{ width: '100%', padding: '8px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textPrimary }}>
                                    {invoiceTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>

                            <hr style={{ borderColor: C.border, margin: '8px 0' }} />
                            
                            {/* Editor Options */}
                            <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}><Settings2 size={16}/> {t('التخطيط والعناصر')}</div>
                            
                            <ToggleRow label={t('إظهار الشعار')} checked={activeTemplate.layoutConfig.showLogo} onChange={v => updateConfig('showLogo', v)} />
                            <ToggleRow label={t('إظهار بيانات الشركة')} checked={activeTemplate.layoutConfig.showCompanyDetails} onChange={v => updateConfig('showCompanyDetails', v)} />
                            <ToggleRow label={t('تضمين رمز QR (ZATCA)')} checked={activeTemplate.layoutConfig.showQRCode} onChange={v => updateConfig('showQRCode', v)} />
                            <ToggleRow label={t('رقم ضريبي للعميل')} checked={activeTemplate.layoutConfig.showCustomerVat} onChange={v => updateConfig('showCustomerVat', v)} />
                            <ToggleRow label={t('عنوان العميل')} checked={activeTemplate.layoutConfig.showCustomerAddress} onChange={v => updateConfig('showCustomerAddress', v)} />

                            <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '8px', marginBottom: '4px' }}>{t('أعمدة الجدول')}</div>
                            <ToggleRow label={t('الكمية')} checked={activeTemplate.layoutConfig.columns.quantity} onChange={v => updateConfig('quantity', v, 'columns')} />
                            <ToggleRow label={t('السعر')} checked={activeTemplate.layoutConfig.columns.price} onChange={v => updateConfig('price', v, 'columns')} />
                            <ToggleRow label={t('نسبة الضريبة')} checked={activeTemplate.layoutConfig.columns.taxRate} onChange={v => updateConfig('taxRate', v, 'columns')} />

                            <hr style={{ borderColor: C.border, margin: '8px 0' }} />
                            
                            <div style={{ fontSize: '14px', fontWeight: 700, color: C.textPrimary, display: 'flex', alignItems: 'center', gap: '6px' }}><Palette size={16}/> {t('المظهر')}</div>
                            
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('اللون الأساسي')}</label>
                                <input type="color" value={activeTemplate.layoutConfig.primaryColor} onChange={e => updateConfig('primaryColor', e.target.value)} style={{ width: '100%', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer', background: 'transparent' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('نمط الجدول')}</label>
                                <select value={activeTemplate.layoutConfig.tableStyle} onChange={e => updateConfig('tableStyle', e.target.value)} style={{ width: '100%', padding: '8px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textPrimary }}>
                                    <option value="bordered">{t('إطارات كاملة')}</option>
                                    <option value="striped">{t('مخطط (صفوف)')}</option>
                                    <option value="minimal">{t('بسيط')}</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, marginBottom: '4px' }}>{t('لغة العناوين')}</label>
                                <select value={activeTemplate.layoutConfig.columnHeaderLang} onChange={e => updateConfig('columnHeaderLang', e.target.value)} style={{ width: '100%', padding: '8px', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: '8px', color: C.textPrimary }}>
                                    <option value="both">{t('عربي + إنجليزي')}</option>
                                    <option value="ar">{t('عربي فقط')}</option>
                                    <option value="en">{t('إنجليزي فقط')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel: Live Preview */}
            <div style={{ flex: 1, background: '#fff', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${C.border}`, position: 'relative' }}>
                {!activeTemplate ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999', flexDirection: 'column', gap: '12px' }}>
                        <FileText size={48} opacity={0.5} />
                        <span>{t('اختر نموذجاً للمعاينة')}</span>
                    </div>
                ) : (
                    <iframe ref={iframeRef} style={{ width: '100%', height: '100%', border: 'none' }} title="Preview"></iframe>
                )}
            </div>
        </div>
    );
}

function ToggleRow({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
            <span style={{ fontSize: '13px', color: C.textSecondary }}>{label}</span>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}
