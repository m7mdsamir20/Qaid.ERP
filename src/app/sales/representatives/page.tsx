'use client';
import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import { Users, Plus, Trash2, Pencil, Briefcase, UserCheck, Percent, Loader2, Search, X, Save, Phone, Mail, Award, CheckCircle, ShieldAlert } from 'lucide-react';
import { C, CAIRO, OUTFIT, TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';

interface SalesRepresentative {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
    email: string | null;
    commissionRate: number;
    commissionType: 'invoice_total' | 'collected_amount';
    isActive: boolean;
    userId: string | null;
    employeeId: string | null;
    employee?: { id: string; name: string } | null;
    user?: { id: string; name: string; username: string } | null;
    _count: { invoices: number; customers: number };
}

export default function SalesRepresentativesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [salesReps, setSalesReps] = useState<SalesRepresentative[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editRep, setEditRep] = useState<SalesRepresentative | null>(null);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [commissionRate, setCommissionRate] = useState(0);
    const [commissionType, setCommissionType] = useState<'invoice_total' | 'collected_amount'>('invoice_total');
    const [selectedUser, setSelectedUser] = useState<string>('none');
    const [selectedEmployee, setSelectedEmployee] = useState<string>('none');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [repToDelete, setRepToDelete] = useState<SalesRepresentative | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sales-reps?includeLookups=true');
            if (res.ok) {
                const data = await res.json();
                setSalesReps(data.salesReps || []);
                setUsers(data.users || []);
                setEmployees(data.employees || []);
            }
        } catch (err) {
            console.error('Failed to fetch sales representatives:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            const url = editRep ? `/api/sales-reps/${editRep.id}` : '/api/sales-reps';
            const method = editRep ? 'PATCH' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    code: code.trim() || null,
                    phone: phone.trim() || null,
                    email: email.trim() || null,
                    commissionRate: Number(commissionRate) || 0,
                    commissionType,
                    userId: selectedUser === 'none' ? null : selectedUser,
                    employeeId: selectedEmployee === 'none' ? null : selectedEmployee,
                    isActive
                }),
            });
            
            if (res.ok) {
                setIsModalOpen(false);
                resetForm();
                fetchAll();
            } else {
                const data = await res.json();
                alert(data.error || t('فشل في الحفظ'));
            }
        } catch (err) {
            alert(t('حدث خطأ أثناء الحفظ'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = (rep: SalesRepresentative) => {
        if (rep._count.invoices > 0 || rep._count.customers > 0) {
            alert(t('لا يمكن حذف مندوب المبيعات لوجود فواتير أو عملاء مرتبطة به.'));
            return;
        }
        setRepToDelete(rep);
    };

    const confirmDelete = async () => {
        if (!repToDelete) return;
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/sales-reps/${repToDelete.id}`, { method: 'DELETE' });
            if (res.ok) {
                setRepToDelete(null);
                fetchAll();
            } else {
                const data = await res.json();
                alert(data.error || t('فشل الحذف'));
            }
        } catch {
            alert(t('حدث خطأ أثناء الحذف'));
        } finally {
            setIsDeleting(false);
        }
    };

    const resetForm = () => {
        setEditRep(null);
        setName('');
        setCode('');
        setPhone('');
        setEmail('');
        setCommissionRate(0);
        setCommissionType('invoice_total');
        setSelectedUser('none');
        setSelectedEmployee('none');
        setIsActive(true);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (rep: SalesRepresentative) => {
        setEditRep(rep);
        setName(rep.name);
        setCode(rep.code || '');
        setPhone(rep.phone || '');
        setEmail(rep.email || '');
        setCommissionRate(rep.commissionRate);
        setCommissionType(rep.commissionType);
        setSelectedUser(rep.userId || 'none');
        setSelectedEmployee(rep.employeeId || 'none');
        setIsActive(rep.isActive);
        setIsModalOpen(true);
    };

    const filteredReps = salesReps.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.code && r.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalReps = salesReps.length;
    const activeReps = salesReps.filter(r => r.isActive).length;
    const avgCommission = salesReps.length > 0 
        ? (salesReps.reduce((acc, r) => acc + r.commissionRate, 0) / salesReps.length).toFixed(1)
        : 0;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title={t("مناديب المبيعات")}
                    subtitle={t("إدارة مناديب المبيعات، عمالياتهم ونسب العمولات والربط مع الموظفين")}
                    icon={Users}
                    primaryButton={{
                        label: t("إضافة مندوب مبيعات"),
                        onClick: openCreateModal,
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: t('إجمالي المناديب'), val: totalReps, color: C.primary, icon: Users, suffix: t('مندوب') },
                            { label: t('المناديب النشطين'), val: activeReps, color: '#10b981', icon: UserCheck, suffix: t('نشط') },
                            { label: t('متوسط العمولات'), val: `${avgCommission}%`, color: '#f59e0b', icon: Percent, suffix: '' },
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: isRtl ? 'right' : 'left' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '4px', fontWeight: 600, color: s.color, fontFamily: OUTFIT }} dir="ltr">
                                        <span>{s.val}</span>
                                        {s.suffix && <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO, marginInlineStart: '4px' }}>{s.suffix}</span>}
                                    </div>
                                </div>
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                    <s.icon size={20} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Toolbar */}
                <div style={{ ...SEARCH_STYLE.container, alignItems: 'stretch', marginBottom: '20px' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder={t("ابحث عن مندوب بالاسم أو الرمز...")}
                            style={{ ...SEARCH_STYLE.input, height: '40px', borderRadius: '12px', background: C.card }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Sales Representatives Cards Grid */}
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', color: '#64748b' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                        <p style={{ fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('جاري تحميل البيانات...')}</p>
                    </div>
                ) : filteredReps.length === 0 ? (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Users size={40} style={{ color: '#475569', marginBottom: '12px', opacity: 0.3 }} />
                        <h3 style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 6px', fontWeight: 600, fontFamily: CAIRO }}>{t('لا يوجد مناديب مبيعات مضافين')}</h3>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {filteredReps.map(rep => (
                            <div key={rep.id} style={{ background: C.card, border: `1px solid ${rep.isActive ? C.border : 'rgba(239,68,68,0.15)'}`, borderRadius: '16px', padding: '20px', transition: 'all 0.23s' }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = rep.isActive ? `${C.primary}50` : 'rgba(239,68,68,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = rep.isActive ? C.border : 'rgba(239,68,68,0.15)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#f1f5f9', fontFamily: CAIRO }}>{rep.name}</h3>
                                            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: rep.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: rep.isActive ? '#10b981' : '#ef4444', fontWeight: 600, fontFamily: CAIRO }}>
                                                {rep.isActive ? t('نشط') : t('موقوف')}
                                            </span>
                                        </div>
                                        {rep.code && <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', fontFamily: OUTFIT }}>#{rep.code}</p>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => openEditModal(rep)} style={{ ...TABLE_STYLE.actionBtn(), width: '32px', height: '32px' }} title={t("تعديل")}>
                                            <Pencil size={14} />
                                        </button>
                                        <button onClick={() => handleDelete(rep)} style={{ ...TABLE_STYLE.actionBtn(C.danger), width: '32px', height: '32px' }} title={t("حذف")}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                                    {rep.phone && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                                            <Phone size={12} style={{ color: C.primary }} />
                                            <span style={{ fontFamily: OUTFIT }}>{rep.phone}</span>
                                        </div>
                                    )}
                                    {rep.email && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                                            <Mail size={12} style={{ color: C.primary }} />
                                            <span style={{ fontFamily: OUTFIT }}>{rep.email}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' }}>
                                        <Percent size={12} style={{ color: '#f59e0b' }} />
                                        <span>
                                            {t('العمولة')}: <strong style={{ color: '#fff', fontFamily: OUTFIT }}>{rep.commissionRate}%</strong>
                                            <span style={{ fontSize: '10px', color: '#64748b', marginInlineStart: '6px' }}>
                                                ({rep.commissionType === 'invoice_total' ? t('إجمالي الفاتورة') : t('المحصل الفعلي')})
                                            </span>
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)', fontSize: '11px', marginBottom: '12px' }}>
                                    <div>
                                        <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('الموظف المرتبط')}</span>
                                        <span style={{ color: rep.employee ? '#f1f5f9' : '#475569', fontWeight: 600 }}>{rep.employee?.name || t('غير مرتبط')}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>{t('المستخدم المرتبط')}</span>
                                        <span style={{ color: rep.user ? '#f1f5f9' : '#475569', fontWeight: 600 }}>{rep.user?.name || t('غير مرتبط')}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                                    <span>{t('العملاء المرتبطين')}: <strong style={{ color: '#fff', fontFamily: OUTFIT }}>{rep._count.customers}</strong></span>
                                    <span>{t('الفواتير المنسوبة')}: <strong style={{ color: '#fff', fontFamily: OUTFIT }}>{rep._count.invoices}</strong></span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL: Create/Edit Sales Representative */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={editRep ? t('تعديل مندوب المبيعات') : t('إضافة مندوب مبيعات')}
                    icon={Users}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('اسم المندوب')} *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder={t("مثال: أحمد محمد...")}
                                    style={IS}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={LS}>{t('رمز المندوب')}</label>
                                <input
                                    type="text"
                                    placeholder={t("رمز فريد (مثال: REP01)")}
                                    style={IS}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('رقم الهاتف')}</label>
                                <input
                                    type="text"
                                    placeholder="01xxxxxxxxx"
                                    style={IS}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={LS}>{t('البريد الإلكتروني')}</label>
                                <input
                                    type="email"
                                    placeholder="example@rep.com"
                                    style={IS}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={LS}>{t('نسبة العمولة (%)')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    style={IS}
                                    onFocus={focusIn}
                                    onBlur={focusOut}
                                    value={commissionRate}
                                    onChange={e => setCommissionRate(parseFloat(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label style={LS}>{t('نوع العمولة')}</label>
                                <CustomSelect
                                    value={commissionType}
                                    onChange={v => setCommissionType(v as any)}
                                    options={[
                                        { value: 'invoice_total', label: t('إجمالي الفاتورة') },
                                        { value: 'collected_amount', label: t('المحصل الفعلي') }
                                    ]}
                                    minWidth="100%"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>{t('الموظف المرتبط')}</label>
                                <CustomSelect
                                    value={selectedEmployee}
                                    onChange={setSelectedEmployee}
                                    placeholder={t('اختر موظفاً (اختياري)')}
                                    options={[
                                        { value: 'none', label: t('غير مرتبط') },
                                        ...employees.map(e => ({ value: e.id, label: `${e.name} (${e.code})` }))
                                    ]}
                                    minWidth="100%"
                                />
                            </div>
                            <div>
                                <label style={LS}>{t('المستخدم المرتبط')}</label>
                                <CustomSelect
                                    value={selectedUser}
                                    onChange={setSelectedUser}
                                    placeholder={t('اختر مستخدماً للدخول (اختياري)')}
                                    options={[
                                        { value: 'none', label: t('غير مرتبط') },
                                        ...users.map(u => ({ value: u.id, label: `${u.name} (@${u.username})` }))
                                    ]}
                                    minWidth="100%"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            <input
                                type="checkbox"
                                id="isActiveCheck"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                style={{ width: '16px', height: '16px', accentColor: C.primary, cursor: 'pointer' }}
                            />
                            <label htmlFor="isActiveCheck" style={{ fontSize: '13px', color: '#f1f5f9', cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('مندوب نشط وعامل')}
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '46px' }}>
                                {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Save size={18} />}
                                <span style={{ marginInlineEnd: '8px' }}>{isSaving ? t('جاري الحفظ...') : (editRep ? t('تحديث البيانات') : t('حفظ المندوب'))}</span>
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '46px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                {t('إلغاء')}
                            </button>
                        </div>
                    </form>
                </AppModal>

                {/* MODAL: Delete Confirmation */}
                <AppModal
                    show={!!repToDelete}
                    onClose={() => setRepToDelete(null)}
                    isDelete={true}
                    title={t("تأكيد حذف المندوب")}
                    itemName={repToDelete?.name}
                    onConfirm={confirmDelete}
                    isSubmitting={isDeleting}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </DashboardLayout>
    );
}
