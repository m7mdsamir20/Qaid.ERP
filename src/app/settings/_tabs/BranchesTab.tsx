'use client';
 
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, BTN_PRIMARY } from '@/constants/theme';
import { Store, Plus, Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import AppModal from '@/components/AppModal';
import { TabHeader } from './shared';

interface BranchesTabProps {
    branches: any[];
    branchForm: { name: string; code: string; address: string; phone: string };
    setBranchForm: (updater: any) => void;
    editingBranchId: string | null;
    setEditingBranchId: (v: string | null) => void;
    showBranchModal: boolean;
    setShowBranchModal: (v: boolean) => void;
    isSavingBranch: boolean;
    setIsSavingBranch: (v: boolean) => void;
    fetchBranches: () => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    session: any;
    setConfirmDelete: (v: any) => void;
}

export default function BranchesTab({
    branches, branchForm, setBranchForm, editingBranchId, setEditingBranchId,
    showBranchModal, setShowBranchModal, isSavingBranch, setIsSavingBranch,
    fetchBranches, showToast, session, setConfirmDelete
}: BranchesTabProps) {
    const { t } = useTranslation();

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '400px' }}>
            <TabHeader
                title={t("إدارة الفروع")}
                sub={t("أضف وعدّل فروع شركتك - كل فرع له مخازن وخزائن وموظفين مستقلين")}
                hideEditBtn={true}
                t={t}
            >
                {/* زر إضافة فرع */}
                {(session?.user as any)?.role === 'admin' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {(() => {
                            const sub = (session?.user as any)?.subscription;
                            const max = sub?.maxBranches ?? 1;
                            return (
                                <span style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO }}>
                                    {branches.length} / {max === 999 ? '∞' : max} {t('فرع')}
                                </span>
                            );
                        })()}
                        <button
                            onClick={() => { setBranchForm({ name: '', code: '', address: '', phone: '' }); setEditingBranchId(null); setShowBranchModal(true); }}
                            style={{ ...BTN_PRIMARY(false, false), width: 'auto', height: '36px', padding: '0 16px', fontSize: '12.5px' }}
                        >
                            <Plus size={14} /> {t('إضافة فرع جديد')}
                        </button>
                    </div>
                )}
            </TabHeader>

            {/* قائمة الفروع */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {branches.map((b: any) => (
                    <div key={b.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 20px', borderRadius: '14px',
                        border: `1px solid ${b.isMain ? C.primary + '40' : C.border}`,
                        background: b.isMain ? C.primary + '08' : 'rgba(255,255,255,0.01)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px',
                                background: b.isMain ? C.primary + '20' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: b.isMain ? C.primary : C.textMuted
                            }}>
                                <Store size={18} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: C.textPrimary, fontFamily: CAIRO }}>
                                    {b.name} {b.isMain && <span style={{ fontSize: '11px', background: C.primary + '20', color: C.primary, padding: '2px 8px', borderRadius: '20px', marginInlineEnd: '6px' }}>{t('رئيسي')}</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, marginTop: '2px' }}>
                                    {b.code && <span style={{ marginInlineStart: '12px' }}>{t('كود')}: {b.code}</span>}
                                    {b.address && <span style={{ marginInlineStart: '12px' }}>{b.address}</span>}
                                    {b.phone && <span>{b.phone}</span>}
                                    <span style={{ marginInlineEnd: '12px' }}>
                                        {b._count?.warehouses || 0} {t('مخزن')} · {b._count?.treasuries || 0} {t('خزينة')} · {b._count?.employees || 0} {t('موظف')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {!b.isMain && (session?.user as any)?.role === 'admin' && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => { setBranchForm({ name: b.name, code: b.code || '', address: b.address || '', phone: b.phone || '' }); setEditingBranchId(b.id); setShowBranchModal(true); }}
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: `1px solid ${C.border}`, background: 'none', color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                ><Pencil size={14} /></button>
                                <button
                                    onClick={() => setConfirmDelete({ type: 'branch', id: b.id, name: b.name })}
                                    style={{ width: '34px', height: '34px', borderRadius: '8px', border: `1px solid rgba(239,68,68,0.2)`, background: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                ><Trash2 size={14} /></button>
                            </div>
                        )}
                    </div>
                ))}
                {branches.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', color: C.textMuted, fontFamily: CAIRO }}>{t('لا توجد فروع بعد')}</div>
                )}
            </div>

            {/* Modal إضافة/تعديل فرع */}
            {showBranchModal && (
                <AppModal show={showBranchModal} title={editingBranchId ? t('تعديل الفرع') : t('إضافة فرع جديد')} onClose={() => setShowBranchModal(false)}>
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!branchForm.name.trim()) return;
                        setIsSavingBranch(true);
                        try {
                            const res = await fetch('/api/branches', {
                                method: editingBranchId ? 'PUT' : 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(editingBranchId ? { id: editingBranchId, ...branchForm } : branchForm)
                            });
                            if (res.ok) {
                                showToast(editingBranchId ? t('تم تعديل الفرع ✓') : t('تم إضافة الفرع ✓'));
                                setShowBranchModal(false);
                                fetchBranches();
                            } else {
                                const d = await res.json();
                                showToast(d.error || t('حدث خطأ'), 'error');
                            }
                        } finally {
                            setIsSavingBranch(false);
                        }
                    }} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            { key: 'name', label: t('اسم الفرع *'), placeholder: t('مثال: فرع المعادي') },
                            { key: 'code', label: t('كود الفرع'), placeholder: t('مثال: BR-001') },
                            { key: 'address', label: t('العنوان'), placeholder: t('عنوان الفرع') },
                            { key: 'phone', label: t('الهاتف'), placeholder: t('رقم هاتف الفرع') },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ fontSize: '12px', color: C.textMuted, fontFamily: CAIRO, display: 'block', marginBottom: '6px' }}>{f.label}</label>
                                <input
                                    value={(branchForm as any)[f.key]}
                                    onChange={e => setBranchForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                    placeholder={f.placeholder}
                                    required={f.key === 'name'}
                                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: `1px solid ${C.border}`, background: C.inputBg, color: C.textPrimary, padding: '0 12px', fontSize: '13px', fontFamily: CAIRO, outline: 'none', boxSizing: 'border-box' }}
                                />
                            </div>
                        ))}
                        <button type="submit" disabled={isSavingBranch}
                            style={{ ...BTN_PRIMARY(false, isSavingBranch), marginTop: '8px' }}>
                            {isSavingBranch ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                            {editingBranchId ? t('حفظ التعديلات') : t('إضافة الفرع')}
                        </button>
                    </form>
                </AppModal>
            )}
        </div>
    );
}
