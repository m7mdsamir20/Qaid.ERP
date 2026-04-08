'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
    Banknote, 
    CheckCircle2, 
    Clock, 
    UsersIcon, 
    Plus, 
    Search, 
    Loader2, 
    X,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    Trash2,
    Filter,
    AlertTriangle
} from 'lucide-react';
import { C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

const formatWithCommas = (val: any) => {
    if (val === undefined || val === null || val === '') return '';
    const s = String(val).replace(/,/g, '');
    if (isNaN(Number(s))) return s;
    return Number(s).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

interface Employee {
    id: string;
    name: string;
    code: string;
}

interface Advance {
    id: string;
    date: string;
    amount: number;
    installmentCount: number;
    monthlyAmount: number;
    notes: string | null;
    status: string;
    employeeId: string;
    employee: Employee;
}

const formatCurrency = (code: string) => {
    if (!code) return 'ج.م';
    const mapping: {[key: string]: string} = {
        'EGP': 'ج.م', 'SAR': 'ر.س', 'USD': 'دولار', 'EUR': 'يورو',
        'AED': 'د.إ', 'KWD': 'د.ك', 'QAR': 'ر.ق', 'BHD': 'د.ب',
        'OMR': 'ر.ع', 'LYD': 'د.ل', 'JOD': 'د.أ', 'SYP': 'ل.س', 'YER': 'ر.ي'
    };
    return mapping[code.toUpperCase()] || code;
};

export default function AdvancesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const router = useRouter();
    const [advances, setAdvances] = useState<Advance[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        installmentCount: '1',
        monthlyAmount: '',
        notes: '',
        treasuryId: '',
    });

    const [deleteItem, setDeleteItem] = useState<Advance | null>(null);

    const [company, setCompany] = useState<any>(null);
    const [treasuries, setTreasuries] = useState<any[]>([]);

    const fetchAll = async () => {
        try {
            const [advRes, empRes, compRes, trRes] = await Promise.all([
                fetch('/api/advances'),
                fetch('/api/employees'),
                fetch('/api/company'),
                fetch('/api/treasuries')
            ]);
            if (advRes.ok) setAdvances(await advRes.json());
            if (empRes.ok) setEmployees(await empRes.json());
            if (compRes.ok) setCompany(await compRes.json());
            if (trRes.ok) setTreasuries(await trRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId) {
            alert('يرجى اختيار الموظف المستفيد أولاً');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/advances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({
                    employeeId: '',
                    date: new Date().toISOString().split('T')[0],
                    amount: '',
                    installmentCount: '1',
                    monthlyAmount: '',
                    notes: '',
                    treasuryId: '',
                });
                fetchAll();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل في الحفظ');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setIsActionLoading(id);
        try {
            const res = await fetch(`/api/advances/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) fetchAll();
            else alert('فشل في تحديث الحالة');
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleDelete = (adv: Advance) => {
        setDeleteItem(adv);
    };

    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        setIsActionLoading(deleteItem.id);
        try {
            const res = await fetch(`/api/advances/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchAll();
            } else alert('فشل في حذف السلفة');
        } finally {
            setIsActionLoading(null);
        }
    };

    const filteredAdvances = advances.filter(adv => 
        adv.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.employee.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adv.notes?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAdvances = advances.reduce((sum, adv) => sum + adv.amount, 0);
    const pendingAdvances = advances.filter(a => a.status === 'pending').reduce((sum, adv) => sum + adv.amount, 0);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title="سلف الموظفين"
                    subtitle="تسجيل وإدارة السلف العهدية للموظفين لخصمها لاحقاً من مسير الرواتب"
                    icon={Banknote}
                    primaryButton={{
                        label: "صرف سلفة جديدة",
                        onClick: () => setIsModalOpen(true),
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary - Standardized */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي السلف الممنوحة', val: totalAdvances, color: C.primary, icon: Banknote },
                            { label: 'سلف قيد الانتظار', val: pendingAdvances, color: C.danger, icon: Clock },
                            { label: 'عدد طلبات السلف', val: advances.length, color: C.success, icon: TrendingUp, suffix: 'طلب' }
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'start' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 800, color: s.color, fontFamily: INTER }} dir="ltr">
                                        {!s.suffix && <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>}
                                        <span>{s.val.toLocaleString('en-US')}</span>
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
                <div style={SEARCH_STYLE.container}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                        <input
                            placeholder="ابحث باسم الموظف أو الكود أو البيان..."
                            style={{ ...SEARCH_STYLE.input, height: '40px', borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Main Table Section */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                            جاري التحميل...
                        </div>
                    ) : filteredAdvances.length === 0 ? (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#475569' }}>
                            <Banknote size={64} style={{ opacity: 0.1, display: 'block', margin: '0 auto 20px' }} />
                            <h3 style={{ fontSize: '18px', color: '#94a3b8', margin: '0 0 10px' }}>{searchTerm ? 'لا توجد نتائج مطابقة' : 'لا توجد سلف مسجلة'}</h3>
                            <p style={{ fontSize: '14px', margin: 0 }}>{searchTerm ? 'جرب البحث بكلمات أخرى' : 'ابدأ بصرف أول سلفة من زر "صرف سلفة جديدة"'}</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(false)}>تاريخ الصرف</th>
                                        <th style={TABLE_STYLE.th(false)}>الموظف</th>
                                        <th style={TABLE_STYLE.th(false)}>إجمالي السلفة</th>
                                        <th style={TABLE_STYLE.th(false)}>الأقساط</th>
                                        <th style={TABLE_STYLE.th(false)}>القسط الشهري</th>
                                        <th style={TABLE_STYLE.th(false)}>البيان</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAdvances.map((adv, idx) => (
                                        <tr key={adv.id} style={TABLE_STYLE.row(idx === filteredAdvances.length - 1)}>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, fontFamily: INTER }} dir="ltr">
                                                    {new Date(adv.date).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '14px' }}>{adv.employee.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.primary, fontWeight: 700, marginTop: '2px' }}>{adv.employee.code}</div>
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 800, color: '#f1f5f9', fontSize: '14px', fontFamily: INTER }} dir="ltr">
                                                    <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>
                                                    <span>{adv.amount.toLocaleString('en-US')}</span>
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{adv.installmentCount}</span>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 800, color: C.danger, fontSize: '14px', fontFamily: INTER }} dir="ltr">
                                                    <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>
                                                    <span>{(adv.monthlyAmount || 0).toLocaleString('en-US')}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{adv.notes || '—'}</td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                {adv.status === 'pending' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                        <Clock size={12} /> قيد الانتظار
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                        تم الاعتماد <CheckCircle2 size={12} />
                                                    </span>
                                                )}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    {adv.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(adv.id, 'deducted')}
                                                            disabled={isActionLoading === adv.id}
                                                            style={TABLE_STYLE.actionBtn('#10b981')}
                                                        >
                                                            {isActionLoading === adv.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={13} />}
                                                        </button>
                                                    )}
                                                    {adv.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleDelete(adv)}
                                                            disabled={isActionLoading === adv.id}
                                                            style={TABLE_STYLE.actionBtn(C.danger)}
                                                        >
                                                            {isActionLoading === adv.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Trash2 size={13} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: New Advance Standardized */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="صرف سلفة لموظف"
                    icon={Plus}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>الموظف المستفيد <span style={{ color: C.danger }}>*</span></label>
                            <CustomSelect
                                value={formData.employeeId}
                                onChange={v => setFormData({ ...formData, employeeId: v })}
                                style={{ background: C.inputBg }}
                                icon={UsersIcon}
                                placeholder="اختر الموظف..."
                                options={employees.map(emp => ({ value: emp.id, label: `${emp.code} - ${emp.name}` }))}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>الخزينة المصرفة <span style={{ color: C.danger }}>*</span></label>
                            <CustomSelect
                                value={formData.treasuryId}
                                onChange={v => setFormData({ ...formData, treasuryId: v })}
                                style={{ background: C.inputBg }}
                                icon={Banknote}
                                placeholder="اختر الخزينة..."
                                options={treasuries.map(t => ({ 
                                    value: t.id, 
                                    label: `${t.name} — ${t.balance?.toLocaleString()} ${formatCurrency(company?.currency)}` 
                                }))}
                            />
                        </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                <div>
                                    <label style={LS}>تاريخ الصرف</label>
                                    <input type="date" style={IS} required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>إجمالي مبلغ السلفة</label>
                                    <div style={{ position: 'relative', background: C.inputBg, borderRadius: '10px', border: `1px solid ${C.border}`, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {!formData.amount && (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none', fontFamily: INTER }}>
                                                0.00
                                            </div>
                                        )}
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            required
                                            value={formatWithCommas(formData.amount)}
                                            onChange={e => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                const inst = Number(formData.installmentCount);
                                                setFormData({
                                                    ...formData,
                                                    amount: val,
                                                    monthlyAmount: inst > 0 ? (Number(val) / inst).toString() : '0'
                                                });
                                            }}
                                            style={{ ...IS, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: INTER, fontWeight: 800, color: C.textPrimary }}
                                            onFocus={focusIn}
                                            onBlur={focusOut}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={LS}>عدد الأقساط</label>
                                    <input type="number" min="1" style={{ ...IS, textAlign: 'center' }} required value={formData.installmentCount} onChange={e => {
                                        const inst = e.target.value;
                                        const amt = formData.amount;
                                        setFormData({ 
                                            ...formData, 
                                            installmentCount: inst,
                                            monthlyAmount: Number(inst) > 0 ? (Number(amt) / Number(inst)).toString() : '0'
                                        });
                                    }} onFocus={focusIn} onBlur={focusOut} />
                                </div>
                                <div>
                                    <label style={LS}>مبلغ القسط الشهري</label>
                                    <div style={{ position: 'relative', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${C.border}`, height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {!formData.monthlyAmount && (
                                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none', fontFamily: INTER }}>
                                                0.00
                                            </div>
                                        )}
                                        <input 
                                            type="text" 
                                            readOnly
                                            value={formatWithCommas(formData.monthlyAmount)}
                                            style={{ ...IS, border: 'none', background: 'transparent', textAlign: 'center', fontFamily: INTER, fontWeight: 800, color: C.success }}
                                        />
                                    </div>
                                </div>
                            </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>ملاحظات</label>
                            <textarea placeholder="سبب صرف السلفة أو أي تفاصيل أخرى..." style={{ ...IS, height: '60px', padding: '12px', resize: 'none' }} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '46px' }}>
                                {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'اعتماد وصرف السلفة'}
                            </button>
                            <button type="button" onClick={() => setIsModalOpen(false)} style={{ height: '46px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>
                                إلغاء
                            </button>
                        </div>
                    </form>
                </AppModal>

                <AppModal
                    show={!!deleteItem}
                    onClose={() => setDeleteItem(null)}
                    onConfirm={handleConfirmDelete}
                    title="تأكيد حذف السلفة"
                    itemName={`سلفة بقيمة ${deleteItem?.amount.toLocaleString()} للموظف ${deleteItem?.employee.name}`}
                    isDelete={true}
                    isSubmitting={isActionLoading === deleteItem?.id}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </DashboardLayout>
    );
}
