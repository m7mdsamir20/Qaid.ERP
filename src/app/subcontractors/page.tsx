'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { HardHat, Plus, Phone, Search, Loader2, Edit3, Trash2, ShieldCheck, Wallet } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { THEME, C, CAIRO, OUTFIT, IS, LS, focusIn, focusOut, TABLE_STYLE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';
import { useCurrency } from '@/hooks/useCurrency';

interface Subcontractor {
    id: string;
    name: string;
    phone: string | null;
    address: string | null;
    specialty: string | null;
    taxNumber: string | null;
    balance: number;
    notes: string | null;
    createdAt: string;
}

export default function SubcontractorsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const { symbol: cSymbol, fMoney } = useCurrency();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;
    
    // Modal controls
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [deleteItem, setDeleteItem] = useState<Subcontractor | null>(null);
    const [deleteError, setDeleteError] = useState('');

    const [form, setForm] = useState({
        name: '',
        phone: '',
        address: '',
        specialty: '',
        taxNumber: '',
        notes: ''
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/subcontractors');
            if (res.ok) setSubcontractors(await res.json());
        } catch (e) {
            console.error("Error loading subcontractors:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openNew = () => {
        setEditingId(null);
        setForm({ name: '', phone: '', address: '', specialty: '', taxNumber: '', notes: '' });
        setShowModal(true);
    };

    const openEdit = (sub: Subcontractor) => {
        setEditingId(sub.id);
        setForm({
            name: sub.name,
            phone: sub.phone || '',
            address: sub.address || '',
            specialty: sub.specialty || '',
            taxNumber: sub.taxNumber || '',
            notes: sub.notes || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setSubmitting(true);
        try {
            const method = editingId ? 'PUT' : 'POST';
            const url = editingId ? `/api/subcontractors/${editingId}` : '/api/subcontractors';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setShowModal(false);
                fetchData();
            }
        } catch (err) {
            console.error("Error submitting subcontractor:", err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/subcontractors/${deleteItem.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeleteItem(null);
                setDeleteError('');
                fetchData();
            } else {
                const errorData = await res.json();
                setDeleteError(errorData.error || t('فشل في حذف مقاول الباطن'));
            }
        } catch {
            setDeleteError(t('حدث خطأ في الاتصال بالخادم'));
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = subcontractors.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.phone && s.phone.includes(searchTerm)) ||
            (s.specialty && s.specialty.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ fontFamily: CAIRO, background: C.bg, minHeight: '100%', paddingBottom: '60px' }}>
                
                <PageHeader 
                    title={t("مقاولين الباطن")}
                    subtitle={t("إدارة بيانات وتخصصات ومستحقات مقاولي الباطن")}
                    icon={HardHat}
                    primaryButton={{
                        label: t("إضافة مقاول باطن"),
                        onClick: openNew,
                        icon: Plus
                    }}
                />

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', insetInlineStart: '14px', top: '50%', transform: 'translateY(-50%)', color: C.primary, pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder={t("ابحث باسم المقاول، الهاتف، التخصص...")}
                            style={{ ...IS, paddingInlineStart: '40px', height: '40px', fontSize: '13px', background: C.card, borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                            <Loader2 size={26} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ padding: '70px', textAlign: 'center' }}>
                            <HardHat size={36} style={{ color: C.textMuted, opacity: 0.3, margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '15px', fontWeight: 500, color: C.textSecondary, margin: 0 }}>{t('لا يوجد مقاولي باطن مسجلين')}</p>
                        </div>
                    ) : (
                        <div className="scroll-table" style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={{ ...TABLE_STYLE.th(true) }}>{t('اسم المقاول')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('رقم الهاتف')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('التخصص')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false) }}>{t('الرقم الضريبي')}</th>
                                        <th style={TABLE_STYLE.th(false, true)}>{t('المستحقات الحالية')}</th>
                                        <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>{t('إجراءات')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginated.map((s, idx) => (
                                        <tr key={s.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}>
                                            <td style={{ ...TABLE_STYLE.td(true) }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                                                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: C.primaryBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, fontSize: '12px', fontWeight: 700, fontFamily: OUTFIT }}>{s.name.charAt(0)}</div>
                                                    <span style={{ fontWeight: 600, color: C.textPrimary }}>{s.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, color: C.textSecondary }}>{s.phone || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), color: C.textSecondary }}>{s.specialty || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, color: C.textSecondary }}>{s.taxNumber || '—'}</td>
                                            <td style={{ ...TABLE_STYLE.td(false), fontFamily: OUTFIT, textAlign: 'center', fontWeight: 600, color: s.balance > 0 ? '#fb7185' : C.textMuted }}>
                                                {fMoney(s.balance)}
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button onClick={() => openEdit(s)} style={TABLE_STYLE.actionBtn()}><Edit3 size={TABLE_STYLE.actionIconSize} /></button>
                                                    <button onClick={() => setDeleteItem(s)} style={TABLE_STYLE.actionBtn(C.danger)}><Trash2 size={TABLE_STYLE.actionIconSize} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <Pagination
                                total={filtered.length}
                                pageSize={pageSize}
                                currentPage={currentPage}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </div>

                {/* MODAL: ADD/EDIT SUBCONTRACTOR */}
                <AppModal show={showModal} onClose={() => setShowModal(false)} icon={HardHat} title={editingId ? t('تعديل بيانات المقاول') : t('إضافة مقاول باطن جديد')} maxWidth="500px">
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={LS}>{t('اسم المقاول')} <span style={{ color: C.danger }}>*</span></label>
                                <input required type="text" placeholder={t('مثال: شركة النخبة للمقاولات الكهربائية')} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('رقم الهاتف')}</label>
                                    <input type="text" placeholder="05xxxxxxxx" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('التخصص الرئيسي')}</label>
                                    <input type="text" placeholder={t('مثال: أعمال صحية، خرسانة، تشطيب')} value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={LS}>{t('الرقم الضريبي')}</label>
                                    <input type="text" value={form.taxNumber} onChange={e => setForm({ ...form, taxNumber: e.target.value })} style={{ ...IS, fontFamily: OUTFIT }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>{t('العنوان')}</label>
                                    <input type="text" placeholder={t('العنوان...')} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} style={IS} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                            </div>
                            <div>
                                <label style={LS}>{t('ملاحظات')}</label>
                                <textarea rows={2} placeholder={t('تفاصيل إضافية...')} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ ...IS, height: 'auto', padding: '10px 14px' }} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', marginTop: '24px' }}>
                            <button disabled={submitting} type="submit" style={{
                                height: '42px', borderRadius: '10px', background: C.primary, color: '#fff', border: 'none',
                                fontWeight: 600, fontSize: '13px', fontFamily: CAIRO, cursor: submitting ? 'not-allowed' : 'pointer'
                            }}>
                                {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : (editingId ? t('حفظ التعديلات') : t('إضافة مقاول باطن'))}
                            </button>
                            <button type="button" onClick={() => setShowModal(false)} style={{ height: '42px', borderRadius: '10px', background: 'transparent', border: `1px solid ${C.border}`, color: C.textSecondary, fontWeight: 700, fontFamily: CAIRO }}>{t('إلغاء')}</button>
                        </div>
                    </form>
                </AppModal>

                {deleteItem && (
                    <AppModal
                        show={!!deleteItem}
                        onClose={() => { setDeleteItem(null); setDeleteError(''); }}
                        isDelete={true}
                        title={t("تأكيد حذف مقاول الباطن")}
                        itemName={deleteItem.name}
                        onConfirm={handleDelete}
                        isSubmitting={submitting}
                        error={deleteError}
                    />
                )}

                <style>{`
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}
