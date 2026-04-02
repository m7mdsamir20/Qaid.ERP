'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    UsersIcon, 
    Plus, 
    Search, 
    Filter, 
    ShieldAlert,
    Loader2, 
    X,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    Trash2
} from 'lucide-react';
import { C, CAIRO, INTER, TABLE_STYLE, SEARCH_STYLE, KPI_STYLE, KPI_ICON, focusIn, focusOut, PAGE_BASE, IS, LS, BTN_PRIMARY } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';

interface Employee {
    id: string;
    name: string;
    code: string;
}

interface Deduction {
    id: string;
    date: string;
    amount: number;
    reason: string | null;
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

export default function DeductionsPage() {
    const router = useRouter();
    const [deductions, setDeductions] = useState<Deduction[]>([]);
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
        reason: ''
    });

    const [deleteItem, setDeleteItem] = useState<Deduction | null>(null);

    const [company, setCompany] = useState<any>(null);

    const fetchAll = async () => {
        try {
            const [dedRes, empRes, compRes] = await Promise.all([
                fetch('/api/deductions'),
                fetch('/api/employees'),
                fetch('/api/company')
            ]);
            if (dedRes.ok) setDeductions(await dedRes.json());
            if (empRes.ok) setEmployees(await empRes.json());
            if (compRes.ok) setCompany(await compRes.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employeeId) {
            alert('يرجى اختيار الموظف أولاً');
            return;
        }
        setIsSaving(true);
        try {
            const res = await fetch('/api/deductions', {
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
                    reason: ''
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
            const res = await fetch(`/api/deductions/${id}`, {
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

    const handleDelete = (ded: Deduction) => {
        setDeleteItem(ded);
    };

    const handleConfirmDelete = async () => {
        if (!deleteItem) return;
        setIsActionLoading(deleteItem.id);
        try {
            const res = await fetch(`/api/deductions/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchAll();
            } else alert('فشل في حذف الخصم');
        } finally {
            setIsActionLoading(null);
        }
    };

    const filteredDeductions = deductions.filter(ded => 
        ded.employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ded.employee.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ded.reason?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalDeductions = deductions.reduce((sum, ded) => sum + ded.amount, 0);
    const pendingDeductions = deductions.filter(a => a.status === 'pending').reduce((sum, ded) => sum + ded.amount, 0);

    return (
        <DashboardLayout>
            <div dir="rtl" style={PAGE_BASE}>
                
                {/* Header Section */}
                <PageHeader
                    title="جزاءات وخصومات الموظفين"
                    subtitle="تسجيل الخصومات المباشرة والجزاءات الإدارية لخصمها من الراتب"
                    icon={ShieldAlert}
                    primaryButton={{
                        label: "إضافة خصم جديد",
                        onClick: () => setIsModalOpen(true),
                        icon: Plus
                    }}
                />

                {/* KPI Stats Summary - Standardized */}
                {!loading && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '20px' }}>
                        {[
                            { label: 'إجمالي الخصومات المطبقة', val: totalDeductions, color: C.danger, icon: TrendingUp },
                            { label: 'خصومات لم ترحل للرواتب', val: pendingDeductions, color: C.warning, icon: Clock },
                            { label: 'عدد العمليات', val: deductions.length, color: C.primary, icon: UsersIcon, suffix: 'عملية' }
                        ].map((s, i) => (
                            <div key={i} style={{
                                background: `${s.color}08`, border: `1px solid ${s.color}33`, borderRadius: '10px',
                                padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                transition: 'all 0.2s', position: 'relative'
                            }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                            >
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontWeight: 800, color: s.color, fontFamily: INTER }} dir="ltr">
                                        {!s.suffix && <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>}
                                        <span>{s.val.toLocaleString('en-US')}</span>
                                        {s.suffix && <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO, marginLeft: '4px' }}>{s.suffix}</span>}
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
                            placeholder="ابحث باسم الموظف أو الكود أو السبب..."
                            style={{ ...SEARCH_STYLE.input, height: '40px', borderRadius: '12px' }}
                            onFocus={focusIn}
                            onBlur={focusOut}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table Section */}
                <div style={TABLE_STYLE.container}>
                    {loading ? (
                        <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 16px', display: 'block' }} />
                            جاري التحميل...
                        </div>
                    ) : filteredDeductions.length === 0 ? (
                        <div style={{ padding: '100px 20px', textAlign: 'center', color: '#475569' }}>
                            <ShieldAlert size={64} style={{ opacity: 0.1, display: 'block', margin: '0 auto 20px' }} />
                            <h3 style={{ fontSize: '18px', color: '#94a3b8', margin: '0 0 10px' }}>لا توجد خصومات مسجلة</h3>
                            <p style={{ fontSize: '14px', margin: 0 }}>ابدأ بإضافة أول خصم من زر "إضافة خصم جديد"</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={TABLE_STYLE.table}>
                                <thead>
                                    <tr style={TABLE_STYLE.thead}>
                                        <th style={TABLE_STYLE.th(false)}>تاريخ الخصم</th>
                                        <th style={TABLE_STYLE.th(false)}>الموظف</th>
                                        <th style={TABLE_STYLE.th(false)}>المبلغ</th>
                                        <th style={TABLE_STYLE.th(false)}>سبب الخصم</th>
                                        <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                        <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDeductions.map((ded, idx) => (
                                        <tr key={ded.id} style={TABLE_STYLE.row(idx === filteredDeductions.length - 1)}>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, fontFamily: INTER }} dir="ltr">
                                                    {new Date(ded.date).toLocaleDateString('en-GB')}
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '14px' }}>{ded.employee.name}</div>
                                                    <div style={{ fontSize: '11px', color: C.primary, fontWeight: 700, marginTop: '2px' }}>{ded.employee.code}</div>
                                                </div>
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontWeight: 800, color: '#f1f5f9', fontSize: '14px', fontFamily: INTER }} dir="ltr">
                                                    <span style={{ fontSize: '10px', opacity: 0.7, fontFamily: CAIRO }}>{formatCurrency(company?.currency)}</span>
                                                    <span>{ded.amount.toLocaleString('en-US')}</span>
                                                </div>
                                            </td>
                                            <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>{ded.reason || '—'}</td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                {ded.status === 'pending' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                        <Clock size={12} /> قيد المراجعة
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '20px', fontSize: '11px', fontWeight: 800 }}>
                                                        تم الاعتماد <CheckCircle2 size={12} />
                                                    </span>
                                                )}
                                            </td>
                                            <td style={TABLE_STYLE.td(false)}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    {ded.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(ded.id, 'deducted')}
                                                            disabled={isActionLoading === ded.id}
                                                            style={TABLE_STYLE.actionBtn('#10b981')}
                                                        >
                                                            {isActionLoading === ded.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <CheckCircle2 size={13} />}
                                                        </button>
                                                    )}
                                                    {ded.status === 'pending' && (
                                                        <button 
                                                            onClick={() => handleDelete(ded)}
                                                            disabled={isActionLoading === ded.id}
                                                            style={TABLE_STYLE.actionBtn(C.danger)}
                                                        >
                                                            {isActionLoading === ded.id ? <Loader2 size={13} style={{ animation: 'spin 1.5s linear infinite' }} /> : <Trash2 size={13} />}
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

                {/* MODAL: New Deduction */}
                <AppModal
                    show={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title="تسجيل خصم / جزاء على موظف"
                    icon={ShieldAlert}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={LS}>الموظف <span style={{ color: C.danger }}>*</span></label>
                            <CustomSelect
                                value={formData.employeeId}
                                onChange={v => setFormData({ ...formData, employeeId: v })}
                                icon={UsersIcon}
                                style={{ background: C.inputBg }}
                                placeholder="اختر الموظف..."
                                options={employees.map(emp => ({ value: emp.id, label: `${emp.code} - ${emp.name}` }))}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={LS}>تاريخ الخصم</label>
                                <input type="date" style={IS} required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                            <div>
                                <label style={LS}>المبلغ</label>
                                <input type="number" step="0.01" style={IS} required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={LS}>ملاحظات</label>
                            <textarea placeholder="اذكر سبب الخصم (تأخير، غياب، مخالفة...)" style={{ ...IS, height: '60px', padding: '12px', resize: 'none' }} value={formData.reason} onChange={e => setFormData({ ...formData, reason: e.target.value })} onFocus={focusIn} onBlur={focusOut} />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="submit" disabled={isSaving} style={{ ...BTN_PRIMARY(false, isSaving), flex: 1, height: '46px' }}>
                                {isSaving ? <Loader2 size={18} style={{ animation: 'spin 1.5s linear infinite' }} /> : 'تسجيل الخصم والاعتماد'}
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
                    title="تأكيد حذف الخصم"
                    itemName={`خصم بقيمة ${deleteItem?.amount.toLocaleString()} للموظف ${deleteItem?.employee.name}`}
                    isDelete={true}
                    isSubmitting={isActionLoading === deleteItem?.id}
                />
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}} />
        </DashboardLayout>
    );
}
