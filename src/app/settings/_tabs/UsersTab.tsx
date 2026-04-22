'use client';
 
import { useTranslation } from '@/lib/i18n';
import { useState } from 'react';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Shield, Users, User, Loader2, Eye, Check, X, ChevronDown, Plus, Trash2, Pencil, RefreshCw, UserPlus, Store } from 'lucide-react';
import { TabHeader } from './shared';

interface UsersTabProps {
    users: any[];
    branches: any[];
    isSaving: boolean;
    saveSettings: (action: string, data: any) => void;
    showToast: (msg: string, type?: 'success' | 'error') => void;
    fetchData: () => void;
    session: any;
    newUserForm: any;
    setNewUserForm: (updater: any) => void;
    editingUserId: string | null;
    setEditingUserId: (v: string | null) => void;
    userSearchTerm: string;
    setUserSearchTerm: (v: string) => void;
    expandedModules: Record<string, boolean>;
    setExpandedModules: (updater: any) => void;
    permissionHierarchy: any[];
    handleRoleChange: (roleId: string) => void;
    handleCreateUser: (e: React.FormEvent) => void;
    editUser: (u: any) => void;
    deleteUser: (userId: string) => void;
    toggleUserStatus: (userId: string, currentStatus: string) => void;
    setConfirmDelete: (v: any) => void;
    getRoleDefaults: (role: string) => any;
}

export default function UsersTab({
    users, branches, isSaving, saveSettings, showToast, fetchData,
    session, newUserForm, setNewUserForm, editingUserId, setEditingUserId,
    userSearchTerm, setUserSearchTerm, expandedModules, setExpandedModules,
    permissionHierarchy, handleRoleChange, handleCreateUser, editUser, deleteUser,
    toggleUserStatus, setConfirmDelete, getRoleDefaults
}: UsersTabProps) {
    const { t } = useTranslation();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    const roleLabels: Record<string, string> = {
        none: t('اختر الدور الوظيفي'),
        admin: t('مدير النظام'),
        manager: t('مدير فرع'),
        accountant: t('محاسب'),
        sales: t('مندوب مبيعات'),
        procurement: t('مسؤول مشتريات'),
        storekeeper: t('أمين مستودع'),
        hr: t('موارد بشرية'),
        cashier: t('كاشير'),
        custom: t('مخصص')
    };

    const roleDescriptions: Record<string, string> = {
        none: t('-- يرجى اختيار نوع الصلاحية --'),
        admin: t('كل الصلاحيات بدون قيود'),
        manager: t('كل شيء عدا الإعدادات والحسابات الختامية'),
        accountant: t('الحسابات والخزن والشركاء'),
        sales: t('المبيعات والأقساط والعملاء'),
        procurement: t('المشتريات والموردين'),
        storekeeper: t('إدارة المخزون والمخازن'),
        hr: t('الموظفين والرواتب والأقسام'),
        cashier: t('نقاط البيع وسندات القبض'),
        custom: t('تحديد الصلاحيات يدوياً')
    };

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("المستخدمين والصلاحيات")}
                sub={t("إضافة المستخدمين وضبط صلاحياتهم والتحكم الكامل في أدوار الوصول")}
                hideEditBtn={true}
                t={t}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>

                {/* ── فورم المستخدم الجديد ── */}
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <User size={12} /> {editingUserId ? t('تعديل مستخدم') : t('مستخدم جديد')}
                    </div>

                    {/* Honeypot */}
                    <div style={{ position: 'absolute', opacity: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                        <input type="text" name="username" tabIndex={-1} />
                        <input type="password" name="password" tabIndex={-1} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                        {[
                            { label: t('الاسم الكامل'), key: 'name', type: 'text', autoComplete: 'off', placeholder: t('محمد أحمد'), dir: 'rtl' },
                            { label: t('اسم المستخدم'), key: 'username', type: 'text', autoComplete: 'off', placeholder: 'mohamed123', dir: 'ltr' },
                            { label: t('البريد الإلكتروني'), key: 'email', type: 'email', autoComplete: 'off', placeholder: 'email@example.com', dir: 'ltr' },
                            { label: t('كلمة المرور'), key: 'password', type: 'password', autoComplete: 'new-password', placeholder: '••••••••', dir: 'ltr' },
                        ].map(f => (
                            <div key={f.key}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>{f.label}</label>
                                <input
                                    type={f.type}
                                    autoComplete={f.autoComplete}
                                    name={`user_${f.key}_field`}
                                    readOnly
                                    onFocus={e => (e.target as HTMLInputElement).removeAttribute('readonly')}
                                    onMouseDown={e => (e.target as HTMLInputElement).removeAttribute('readonly')}
                                    placeholder={f.placeholder}
                                    value={(newUserForm as any)[f.key]}
                                    onChange={e => setNewUserForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                                    style={{
                                        width: '100%', height: '40px', padding: '0 12px',
                                        borderRadius: '10px', border: `1px solid ${C.border}`,
                                        background: 'rgba(255,255,255,0.02)', color: C.textPrimary,
                                        fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                        fontFamily: f.key === 'username' || f.key === 'password' ? OUTFIT : CAIRO,
                                        direction: f.dir as any
                                    }}
                                />
                            </div>
                        ))}

                        {/* الدور ── آخر حاجة */}
                        <div className="custom-dropdown" style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>{t('الدور الوظيفي')}</label>
                            <button type="button"
                                onClick={() => setOpenDropdown(openDropdown === 'role' ? null : 'role')}
                                style={{
                                    width: '100%', height: '40px', padding: '0 12px',
                                    borderRadius: '10px', border: `1px solid ${openDropdown === 'role' ? C.primary : C.border}`,
                                    background: 'rgba(255,255,255,0.02)', color: C.textPrimary,
                                    fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontFamily: CAIRO, transition: 'border-color 0.2s'
                                }}>
                                <ChevronDown size={14} style={{ color: C.primary, transform: openDropdown === 'role' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                                <span style={{ flex: 1, textAlign: 'start', fontWeight: newUserForm.roleId === 'none' ? 600 : 800, color: newUserForm.roleId === 'none' ? C.textMuted : C.textPrimary }}>
                                    {roleLabels[newUserForm.roleId] || newUserForm.roleId}
                                </span>
                            </button>

                            {openDropdown === 'role' && (
                                <div style={{ position: 'absolute', top: '46px', insetInlineEnd: 0, insetInlineStart: 0, zIndex: 999, background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                                    {[
                                        { value: 'none' },
                                        { value: 'admin' },
                                        { value: 'manager' },
                                        { value: 'accountant' },
                                        { value: 'sales' },
                                        { value: 'procurement' },
                                        { value: 'storekeeper' },
                                        { value: 'hr' },
                                        { value: 'cashier' },
                                        { value: 'custom' },
                                    ].map((opt, i, arr) => (
                                        <button key={opt.value} type="button"
                                            onClick={() => {
                                                setNewUserForm((p: any) => ({
                                                    ...p,
                                                    roleId: opt.value,
                                                    customPermissions: opt.value === 'custom' ? p.customPermissions : getRoleDefaults(opt.value)
                                                }));
                                                setOpenDropdown(null);
                                            }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', border: 'none',
                                                borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                                                background: newUserForm.roleId === opt.value ? `${C.primary}15` : 'transparent',
                                                color: newUserForm.roleId === opt.value ? C.primary : C.textSecondary,
                                                fontSize: '12.5px', cursor: 'pointer', textAlign: 'start', fontFamily: CAIRO
                                            }}
                                            onMouseEnter={e => { if (newUserForm.roleId !== opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            onMouseLeave={e => { if (newUserForm.roleId !== opt.value) e.currentTarget.style.background = 'transparent'; }}>
                                            <span style={{ fontSize: '10px', color: C.textMuted }}>{roleDescriptions[opt.value]}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {newUserForm.roleId === opt.value && opt.value !== 'none' && <Check size={13} style={{ color: C.primary }} />}
                                                <span style={{ fontWeight: newUserForm.roleId === opt.value ? 900 : (opt.value === 'none' ? 600 : 700), opacity: opt.value === 'none' ? 0.7 : 1 }}>{roleLabels[opt.value]}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* تعيين الفروع المسموح بها */}
                    {branches.length > 1 && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, color: C.textMuted, marginBottom: '10px', fontFamily: CAIRO }}>
                                <Store size={13} style={{ color: C.primary }} />
                                {t('الفروع المسموح بها')} <span style={{ color: C.textMuted, fontSize: '10px', fontWeight: 500 }}>({t('بلا اختيار = يرى كل الفروع')})</span>
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {branches.map((b: any) => {
                                    const checked = newUserForm.allowedBranches.includes(b.id);
                                    return (
                                        <label key={b.id} 
                                            onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                                            onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                padding: '10px 14px', borderRadius: '12px', 
                                                border: `1px solid ${checked ? C.primary + '60' : C.border}`, 
                                                background: checked ? `${C.primary}12` : 'rgba(255,255,255,0.01)', 
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                boxShadow: checked ? `0 4px 12px ${C.primary}08` : 'none'
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: checked ? 900 : 700, color: checked ? C.textPrimary : C.textSecondary, fontFamily: CAIRO }}>
                                                    {b.name}
                                                </span>
                                            </div>
                                            <div style={{ 
                                                width: '20px', height: '20px', borderRadius: '6px', 
                                                border: `1.5px solid ${checked ? C.primary : 'rgba(255,255,255,0.15)'}`,
                                                background: checked ? C.primary : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}>
                                                <input type="checkbox" checked={checked}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        setNewUserForm((p: any) => ({
                                                            ...p,
                                                            allowedBranches: checked
                                                                ? p.allowedBranches.filter((id: string) => id !== b.id)
                                                                : [...p.allowedBranches, b.id]
                                                        }));
                                                    }}
                                                    style={{ 
                                                        position: 'absolute', inset: 0, opacity: 0, 
                                                        width: '100%', height: '100%', cursor: 'pointer',
                                                        zIndex: 2
                                                    }} />
                                                {checked && <Check size={14} color="#fff" strokeWidth={4} />}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* زرار الحفظ */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {editingUserId && (
                            <button onClick={() => {
                                setEditingUserId(null);
                                setNewUserForm({ name: '', username: '', email: '', phone: '', password: '', roleId: 'admin', status: 'active', avatar: 'm1', branchId: '', allowedBranches: [], customPermissions: {} });
                            }}
                                style={{ height: '42px', padding: '0 20px', borderRadius: '12px', border: `1px solid ${C.border}`, background: 'transparent', color: C.textSecondary, fontSize: '13px', fontWeight: 800, cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('إلغاء')}
                            </button>
                        )}
                        <button onClick={(e: any) => handleCreateUser(e)} disabled={isSaving}
                            style={{ flex: 1, height: '42px', borderRadius: '12px', border: 'none', background: isSaving ? `${C.primary}50` : `linear-gradient(135deg, ${C.primary}, #256af4)`, color: '#fff', fontSize: '13px', fontWeight: 900, cursor: isSaving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: `0 8px 20px -6px ${C.primary}40`, fontFamily: CAIRO }}>
                            {isSaving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري الحفظ...')}</> : <>{editingUserId ? <RefreshCw size={16} /> : <UserPlus size={16} />} {editingUserId ? t('تحديث البيانات') : t('إضافة المستخدم')}</>}
                        </button>
                    </div>
                </div>

                {/* ── مصفوفة الصلاحيات ── */}
                <div>
                    <div style={{ height: '26px', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            <Shield size={12} /> {t('الصلاحيات')}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button type="button"
                                onClick={() => {
                                    const all: Record<string, { view: boolean; create: boolean; editDelete: boolean }> = {};
                                    permissionHierarchy.forEach(s => {
                                        s.links.forEach((l: any) => { all[l.id] = { view: true, create: true, editDelete: true }; });
                                    });
                                    setNewUserForm((p: any) => ({ ...p, roleId: 'custom', customPermissions: all }));
                                }}
                                style={{ height: '26px', padding: '0 10px', borderRadius: '6px', border: '1px solid rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.06)', color: '#34d399', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                {t('تحديد الكل')}
                            </button>
                            <button type="button"
                                onClick={() => setNewUserForm((p: any) => ({ ...p, roleId: 'custom', customPermissions: {} }))}
                                style={{ height: '26px', padding: '0 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                {t('إلغاء الكل')}
                            </button>
                        </div>
                    </div>

                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: `2px solid ${C.border}`, fontSize: '11px', fontWeight: 900, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', position: 'sticky', top: 0, zIndex: 10, fontFamily: CAIRO }}>
                            <div>{t('القائمة / الصفحة')}</div>
                            <div style={{ }}></div>
                        </div>

                        <div style={{ maxHeight: '450px', overflowY: 'auto' }} className="custom-scrollbar">
                            {permissionHierarchy.map((section: any, idx: number) => {
                                const isExp = expandedModules[section.title] === true;
                                const sp = newUserForm.customPermissions;
                                const isAccessOnlySection = section.title === 'التقارير الإحصائية' || section.title === 'إعدادات النظام' || section.title === 'Statistical Reports' || section.title === 'System Settings';

                                const allSel = section.links.length > 0 && section.links.every((l: any) => sp[l.id]?.view && (isAccessOnlySection || (sp[l.id]?.create && sp[l.id]?.editDelete)));
                                const someSel = !allSel && section.links.some((l: any) => sp[l.id]?.view || sp[l.id]?.create || sp[l.id]?.editDelete);

                                const activeCount = section.links.filter((l: any) => sp[l.id]?.view).length;

                                const toggleSection = (val: boolean) => {
                                    setNewUserForm((prev: any) => {
                                        const up = { ...prev.customPermissions };
                                        section.links.forEach((l: any) => {
                                            up[l.id] = { view: val, create: val, editDelete: val };
                                        });
                                        return { ...prev, roleId: 'custom', customPermissions: up };
                                    });
                                };

                                return (
                                    <div key={idx} style={{ borderBottom: idx < permissionHierarchy.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                                        {/* Section Row */}
                                        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 20px', background: allSel ? `${C.primary}10` : 'transparent', cursor: 'pointer', transition: 'background 0.15s' }}
                                            onMouseEnter={e => { if (!allSel) e.currentTarget.style.background = C.hover; }}
                                            onMouseLeave={e => { if (!allSel) e.currentTarget.style.background = 'transparent'; }}>

                                            {/* Toggle + Title */}
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}
                                                onClick={() => setExpandedModules((p: any) => ({ ...p, [section.title]: !isExp }))}>
                                                <div style={{ color: isExp ? C.primary : C.textMuted, transition: 'transform 0.2s', transform: isExp ? 'rotate(0)' : 'rotate(-90deg)' }}>
                                                    <ChevronDown size={16} />
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 800, color: allSel ? C.textPrimary : C.textSecondary, fontFamily: CAIRO }}>
                                                    {t(section.title)}
                                                </span>
                                                <span style={{ fontSize: '10px', padding: '2px 10px', borderRadius: '20px', background: activeCount > 0 ? `${C.primary}15` : C.inputBg, color: activeCount > 0 ? C.primary : C.textMuted, border: `1px solid ${activeCount > 0 ? `${C.primary}25` : C.border}`, fontWeight: 900, marginInlineEnd: '8px', fontFamily: CAIRO }}>
                                                    {activeCount > 0 ? `${activeCount} / ${section.links.length}` : `${section.links.length} ${t('صفحة')}`}
                                                </span>
                                            </div>

                                            {/* Select all toggle */}
                                            <button type="button"
                                                onClick={e => { e.stopPropagation(); toggleSection(!allSel); }}
                                                style={{ height: '28px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${allSel || someSel ? `${C.primary}40` : C.border}`, background: allSel ? `${C.primary}15` : someSel ? `${C.primary}05` : 'transparent', color: allSel || someSel ? C.primary : C.textMuted, fontSize: '10px', fontWeight: 900, cursor: 'pointer', fontFamily: CAIRO }}>
                                                {allSel ? t('إلغاء الكل') : someSel ? t('جزئي') : t('تحديد الكل')}
                                            </button>
                                        </div>

                                        {/* Pages */}
                                        {isExp && section.links.map((page: any) => {
                                            const perms = sp[page.id] || { view: false, create: false, editDelete: false };
                                            const setP = (field: 'view' | 'create' | 'editDelete', val: boolean) => {
                                                setNewUserForm((prev: any) => {
                                                    const up = { ...prev.customPermissions };
                                                    const current = up[page.id] || { view: false, create: false, editDelete: false };
                                                    up[page.id] = { ...current, [field]: val };

                                                    if (val && (field === 'create' || field === 'editDelete')) {
                                                        up[page.id].view = true;
                                                    }
                                                    if (!val && field === 'view') {
                                                        up[page.id].create = false;
                                                        up[page.id].editDelete = false;
                                                    }
                                                    return { ...prev, roleId: 'custom', customPermissions: up };
                                                });
                                            };

                                            return (
                                                <div key={page.id} style={{ display: 'grid', gridTemplateColumns: isAccessOnlySection ? '1fr 280px' : '1fr 280px', padding: '10px 20px 10px 50px', borderTop: `1px solid ${C.border}`, alignItems: 'center', transition: 'background 0.1s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '12px', color: perms.view ? C.textSecondary : C.textMuted, fontWeight: 800, fontFamily: CAIRO }}>
                                                            {t(page.label)}
                                                        </span>
                                                        {isAccessOnlySection && <span style={{ fontSize: '10px', color: C.textMuted, fontWeight: 400, opacity: 0.6 }}>({t('وصول فقط')})</span>}
                                                    </div>

                                                    {isAccessOnlySection ? (
                                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                            <button type="button"
                                                                onClick={() => {
                                                                    const val = !perms.view;
                                                                    setNewUserForm((prev: any) => {
                                                                        const up = { ...prev.customPermissions };
                                                                        up[page.id] = { view: val, create: val, editDelete: val };
                                                                        return { ...prev, roleId: 'custom', customPermissions: up };
                                                                    });
                                                                }}
                                                                style={{ height: '32px', padding: '0 20px', borderRadius: '10px', border: `1px solid ${perms.view ? `${C.primary}40` : C.border}`, background: perms.view ? `${C.primary}15` : C.inputBg, color: perms.view ? C.primary : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s', fontFamily: CAIRO, fontSize: '11px', fontWeight: 900 }}>
                                                                {perms.view ? <><Check size={14} /> {t('مفعّل')}</> : <><Shield size={13} style={{ opacity: 0.5 }} /> {t('معطّل')}</>}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                                                            <button type="button" onClick={() => setP('view', !perms.view)}
                                                                style={{ height: '32px', padding: '0 8px', minWidth: '75px', borderRadius: '10px', border: `1px solid ${perms.view ? `${C.primary}40` : C.border}`, background: perms.view ? `${C.primary}15` : C.inputBg, color: perms.view ? C.primary : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.15s', fontFamily: CAIRO, fontSize: '10px', fontWeight: 800 }}>
                                                                {perms.view ? <Check size={12} /> : <Eye size={12} style={{ opacity: 0.5 }} />}
                                                                {t('مشاهدة')}
                                                            </button>
                                                            <button type="button" onClick={() => setP('create', !perms.create)}
                                                                style={{ height: '32px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${perms.create ? 'var(--c-success-border, rgba(16,185,129,0.4))' : C.border}`, background: perms.create ? 'var(--c-success-bg, rgba(16,185,129,0.15))' : C.inputBg, color: perms.create ? 'var(--c-success, #10b981)' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s', fontFamily: CAIRO, fontSize: '10px', fontWeight: 800 }}>
                                                                {perms.create ? <Check size={13} /> : <Plus size={12} style={{ opacity: 0.5 }} />}
                                                                {t('إضافة')}
                                                            </button>
                                                            <button type="button" onClick={() => setP('editDelete', !perms.editDelete)}
                                                                style={{ height: '32px', padding: '0 12px', borderRadius: '10px', border: `1px solid ${perms.editDelete ? 'var(--c-warning-border, rgba(245,158,11,0.4))' : C.border}`, background: perms.editDelete ? 'var(--c-warning-bg, rgba(245,158,11,0.15))' : C.inputBg, color: perms.editDelete ? 'var(--c-warning, #f59e0b)' : C.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s', fontFamily: CAIRO, fontSize: '10px', fontWeight: 800 }}>
                                                                {perms.editDelete ? <Check size={13} /> : <Trash2 size={12} style={{ opacity: 0.5 }} />}
                                                                {t('تعديل')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── جدول المستخدمين الحاليين ── */}
            <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <Users size={12} /> {t('المستخدمون الحاليون')} ({users.length})
                    </div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'inherit', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: `2px solid ${C.border}` }}>
                                {[t('المستخدم'), t('المعرف'), t('الدور'), t('الحالة'), ''].map((h, i) => (
                                    <th key={i} style={{ padding: '16px 20px', fontSize: '11px', fontWeight: 900, color: C.textMuted,  fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u, idx) => (
                                <tr key={u.id} style={{ borderBottom: idx < users.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background 0.2s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '14px 20px', }}>
                                        <div style={{ fontWeight: 900, color: C.textPrimary, fontFamily: CAIRO }}>{u.name}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>{u.email}</div>
                                    </td>
                                    <td style={{ padding: '14px 20px', fontFamily: OUTFIT, fontSize: '12px', color: C.textSecondary, }}>@{u.username}</td>
                                    <td style={{ padding: '14px 20px', }}>
                                        <span style={{ fontSize: '10px', padding: '4px 12px', borderRadius: '20px', background: `${C.primary}10`, color: C.primary, border: `1px solid ${C.primary}30`, fontWeight: 900, fontFamily: CAIRO }}>
                                            {roleLabels[u.role] || u.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '14px 20px', }}>
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button onClick={() => toggleUserStatus(u.id, u.status)}
                                                style={{ height: '26px', padding: '0 12px', borderRadius: '20px', border: `1px solid ${u.status === 'active' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, background: u.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: u.status === 'active' ? '#10b981' : C.danger, fontSize: '11px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO }}>
                                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                                                {u.status === 'active' ? t('نشط') : t('موقوف')}
                                            </button>
                                        </div>
                                    </td>
                                    <td style={{ padding: '14px 20px', }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                            {u.id !== session?.user?.id && (
                                                <button onClick={() => editUser(u)}
                                                    style={{ width: '32px', height: '32px', borderRadius: '10px', border: `1px solid ${C.primary}30`, background: `${C.primary}10`, color: C.primary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${C.primary}20`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${C.primary}10`}>
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            {u.id !== session?.user?.id && (
                                                <button onClick={() => setConfirmDelete({ type: 'user', id: u.id, name: u.name })}
                                                    style={{ width: '32px', height: '32px', borderRadius: '10px', border: `1px solid ${C.danger}30`, background: `${C.danger}10`, color: C.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = `${C.danger}20`}
                                                    onMouseLeave={e => e.currentTarget.style.background = `${C.danger}10`}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
