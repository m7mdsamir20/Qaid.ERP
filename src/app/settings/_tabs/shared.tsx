'use client';
import { C, CAIRO, BTN_PRIMARY } from '@/constants/theme';
import { Pencil, Save, Loader2, X } from 'lucide-react';

export function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
    return (
        <div onClick={() => !disabled && onChange(!checked)}
            style={{ width: '46px', height: '24px', background: checked ? '#10b981' : 'rgba(255,255,255,0.05)', borderRadius: '24px', position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.3s', border: `1px solid ${checked ? 'transparent' : C.border}`, flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '2px', left: checked ? '24px' : '2px', width: '18px', height: '18px', background: '#fff', borderRadius: '50%', transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
        </div>
    );
}

export function TabHeader({ title, sub, isEdit, onEdit, onCancel, onSave, isSaving, hideEditBtn, form, children, t }: any) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                    <h2 style={{ margin: '0 0 1px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{title}</h2>
                    <p style={{ margin: 0, fontSize: '11px', color: C.textSecondary, fontFamily: CAIRO }}>{sub}</p>
                </div>
            </div>
            {!hideEditBtn && (
                !isEdit ? (
                    <button onClick={onEdit}
                        style={{ ...BTN_PRIMARY(false, false), width: 'auto', height: '36px', padding: '0 18px', fontSize: '12.5px' }}>
                        <Pencil size={14} /> <span style={{ marginInlineEnd: '6px' }}>{t ? t('تعديل البيانات') : 'تعديل البيانات'}</span>
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={onSave} disabled={isSaving} form={form} type={form ? 'submit' : 'button'}
                            style={{ ...BTN_PRIMARY(false, isSaving), width: 'auto', height: '36px', padding: '0 18px', fontSize: '12.5px' }}>
                            {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                            <span style={{ marginInlineEnd: '6px' }}>{t ? t('حفظ التغييرات') : 'حفظ التغييرات'}</span>
                        </button>
                        <button type="button" onClick={onCancel}
                            style={{
                                height: '36px', padding: '0 16px', borderRadius: '10px',
                                border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)',
                                color: C.textSecondary, fontSize: '12.5px', fontWeight: 700,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                fontFamily: CAIRO, transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = C.textPrimary; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = C.textSecondary; }}
                        >
                            <X size={14} /> {t ? t('إلغاء') : 'إلغاء'}
                        </button>
                    </div>
                )
            )}
            {children}
        </div>
    );
}
