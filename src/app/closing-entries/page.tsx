'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState } from 'react';
import { 
    BookMarked, 
    Loader2, 
    CheckCircle2, 
    AlertTriangle, 
    ArrowUpRight, 
    ArrowDownRight, 
    Play, 
    History as HistoryIcon, 
    Calendar, 
    FileCheck, 
    ArrowLeftRight,
    Info,
    X,
    RotateCcw,
    Printer,
    Search,
    ChevronDown,
    Settings,
    TrendingUp,
    ShieldCheck
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { THEME, C, CAIRO, INTER, TABLE_STYLE, PAGE_BASE } from '@/constants/theme';

/* ── Types ── */
interface FinancialYear { id: string; name: string; isOpen: boolean; startDate: string; endDate: string; }
interface ClosingAccount {
    id: string;
    code: string;
    name: string;
    type: 'revenue' | 'expense';
    balance: number;
}
interface ClosingResult {
    revenueTotal: number;
    expenseTotal: number;
    netIncome: number;
    isProfit: boolean;
}

const fmt = (n: number) => {
    if (n === undefined || n === null) return '0.00';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/* ══════════════════════════════════════════ */
export default function ClosingEntriesPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';

    const [years, setYears] = useState<FinancialYear[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('');
    const [accounts, setAccounts] = useState<ClosingAccount[]>([]);
    const [loading, setLoading] = useState(false);
    const [executing, setExecuting] = useState(false);
    const [result, setResult] = useState<ClosingResult | null>(null);
    const [alreadyClosed, setAlreadyClosed] = useState(false);
    const [step, setStep] = useState<'preview' | 'done'>('preview');
    const [draftCount, setDraftCount] = useState(0);
    const [closingInfo, setClosingInfo] = useState<{ date?: string, entryId?: string } | null>(null);
    
    const [allAccounts, setAllAccounts] = useState<any[]>([]);
    const [targetAccountId, setTargetAccountId] = useState<string>(''); 

    // Custom Confirmation State
    const [showConfirm, setShowConfirm] = useState(false);
    const [showUndoConfirm, setShowUndoConfirm] = useState(false);
    const [showDraftWarning, setShowDraftWarning] = useState(false);

    const loadData = async () => {
        try {
            const [sRes, aRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/accounts')
            ]);
            const sData = await sRes.json();
            const aData = await aRes.json();
            setYears(Array.isArray(sData.financialYears) ? sData.financialYears : []);
            setAllAccounts(Array.isArray(aData) ? aData : []);
            
            // Auto-select 3500 if exists
            if (Array.isArray(aData)) {
                const plAcc = aData.find((a: any) => a.code === '3500');
                if (plAcc) setTargetAccountId(plAcc.id);
            }
        } catch (e) { console.error('Error loading data', e); }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (!selectedYear) {
            setAccounts([]);
            setResult(null);
            setAlreadyClosed(false);
            setDraftCount(0);
            return;
        }

        const fetchPreview = async () => {
            setLoading(true);
            try {
                const r = await fetch(`/api/closing-entries/preview?financialYearId=${selectedYear}`);
                const data = await r.json();
                if (r.ok) {
                    setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
                    setAlreadyClosed(data.alreadyClosed || false);
                    setDraftCount(data.draftCount || 0);
                    if (data.alreadyClosed) setClosingInfo({ date: data.closingDate, entryId: data.entryId });
                }
            } finally {
                setLoading(false);
            }
        };

        fetchPreview();
    }, [selectedYear]);

    const handleExecuteStart = () => {
        if (draftCount > 0) {
            setShowDraftWarning(true);
            return;
        }
        setShowConfirm(true);
    };

    const handleExecuteFinal = async () => {
        setShowConfirm(false);
        setExecuting(true);
        try {
            const res = await fetch('/api/closing-entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ financialYearId: selectedYear, targetAccountId }),
            });
            const data = await res.json();
            if (res.ok) {
                setResult(data);
                setStep('done');
                await loadData();
            } else {
                alert(data.error || t('حدث خطأ أثناء التنفيذ'));
            }
        } catch (error) {
            alert(t('فشل الاتصال بالخادم'));
        } finally {
            setExecuting(false);
        }
    };

    const handleUndoFinal = async () => {
        setShowUndoConfirm(false);
        setExecuting(true);
        try {
            const res = await fetch(`/api/closing-entries?financialYearId=${selectedYear}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setAlreadyClosed(false);
                setStep('preview');
                setResult(null);
                await loadData();
            } else {
                const data = await res.json();
                alert(data.error || 'فشل إلغاء الإقفال');
            }
        } finally {
            setExecuting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const revenues = accounts.filter(a => a.type === 'revenue');
    const expenses = accounts.filter(a => a.type === 'expense');
    const totalRev = revenues.reduce((s, a) => s + (a.balance || 0), 0);
    const totalExp = expenses.reduce((s, a) => s + (a.balance || 0), 0);
    const netIncomeValue = totalRev - totalExp;
    const isProfitValue = netIncomeValue >= 0;

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, fontFamily: CAIRO }}>
                
                {/* Custom Confirmation Modal */}
                {showConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: '#0e172a', border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', maxWidth: '460px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' }}>
                            <button onClick={() => setShowConfirm(false)} style={{ position: 'absolute', top: '16px', insetInlineStart: '16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', width: '32px', height: '32px', color: C.textSecondary, cursor: 'pointer' }}><X size={18} /></button>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <ShieldCheck size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px', color: '#fff' }}>{t('تأكيد تنفيذ الإقفال المحاسبي')}</h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
                                {t('هل أنت متأكد من تصفير حسابات السنة الحالية وترحيل الأرصدة الختامية؟ لا يمكن التراجع عن هذه العملية بمجرد البدء.')}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button onClick={handleExecuteFinal} style={{ height: '52px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}>{t('تأكيد التنفيذ')}</button>
                                <button onClick={() => setShowConfirm(false)} style={{ height: '52px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('إلغاء')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Undo Confirmation Modal */}
                {showUndoConfirm && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
                        <div style={{ background: '#0e172a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '24px', padding: '32px', maxWidth: '460px', width: '90%', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <RotateCcw size={32} />
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 900, marginBottom: '12px', color: '#fff' }}>{t('إلغاء الإقفال المحاسبي')}</h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
                                {t('هل أنت متأكد من رغبتك في التراجع عن الإقفال؟ سيتم حذف قيد الإقفال وإعادة فتح السنة المالية للتعديل.')}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button onClick={handleUndoFinal} style={{ height: '52px', background: '#ef4444', border: 'none', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}>{t('تأكيد الإلغاء')}</button>
                                <button onClick={() => setShowUndoConfirm(false)} style={{ height: '52px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('تراجع')}</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Draft Warning Modal */}
                {showDraftWarning && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div style={{ background: '#0e172a', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '24px', padding: '32px', maxWidth: '450px', width: '90%', textAlign: 'center' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(239,68,68,0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <AlertTriangle size={32} style={{ color: '#ef4444' }} />
                            </div>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '12px', color: '#ef4444' }}>{t('تنبيه: قيود غير مرحلة')}</h2>
                            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '24px' }}>
                                {t('يوجد عدد')} <strong style={{ color: '#fff' }}>{draftCount}</strong> {t('قيود في حالة "مسودة". يرجى ترحيل كافة القيود قبل إقفال السنة المالية لضمان دقة النتائج.')}
                            </p>
                            <button onClick={() => setShowDraftWarning(false)} style={{ width: '100%', height: '48px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>{t('حسناً')}</button>
                        </div>
                    </div>
                )}

                <PageHeader 
                    title={t("قيود الإقفال")} 
                    subtitle={t("مرحلة تدوير الأرصدة وإثبات الأرباح الختامية")}
                    icon={BookMarked}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Selector Box */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '20px', alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, fontWeight: 800, marginBottom: '8px' }}>{t('السنة المالية المراد إقفالها')}</label>
                                    <CustomSelect
                                        value={selectedYear}
                                        onChange={v => setSelectedYear(v)}
                                        icon={Calendar}
                                        placeholder={t("اختر السنة المالية")}
                                        options={years.filter(y => y.isOpen).map(y => ({ value: y.id, label: y.name }))}
                                    />
                                </div>

                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: C.textMuted, fontWeight: 800, marginBottom: '8px' }}>{t('حساب تجميع الأرباح/الخسائر')}</label>
                                    <CustomSelect
                                        value={targetAccountId}
                                        onChange={v => setTargetAccountId(v)}
                                        icon={Settings}
                                        placeholder={t("اختر حساب الإقفال")}
                                        options={allAccounts.filter(a => a.accountCategory === 'detail').map(a => ({ value: a.id, label: `${a.code} - ${a.name}` }))}
                                    />
                                </div>
                                
                                {selectedYear && !loading && !alreadyClosed && step !== 'done' && (
                                    <button 
                                        type="button" 
                                        onClick={handleExecuteStart}
                                        disabled={executing}
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '8px', height: '48px', padding: '0 28px', borderRadius: '14px', border: 'none', 
                                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                                            boxShadow: '0 8px 16px rgba(37,99,235,0.25)', transition: '0.2s', opacity: executing ? 0.7 : 1
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        {executing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Play size={18} />}
                                        {executing ? t('جاري التنفيذ...') : t('بدء عملية الإقفال')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Rendering Areas */}
                        {!selectedYear ? (
                            <div style={{ textAlign: 'center', padding: '100px 20px', background: 'rgba(255,255,255,0.01)', border: `1px dashed ${C.border}`, borderRadius: '20px', color: C.textMuted }}>
                                <Info size={48} style={{ opacity: 0.1, margin: '0 auto 20px' }} />
                                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t('يرجى اختيار السنة المالية للمعاينة')}</h3>
                                <p style={{ fontSize: '13px', marginTop: '4px' }}>{t('سيتم سحب كافة حسابات الإيرادات والمصروفات لموسم المختارة')}</p>
                            </div>
                        ) : loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', flexDirection: 'column', gap: '16px', background: C.card, borderRadius: '20px', border: `1px solid ${C.border}` }}>
                                <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: C.primary }} />
                                <span style={{ fontSize: '14px', color: C.textMuted, fontWeight: 700 }}>{t('جاري تحليل البيانات المحاسبية...')}</span>
                            </div>
                        ) : alreadyClosed ? (
                            <div style={{ padding: '60px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', textAlign: 'center' }}>
                                <div style={{ width: '96px', height: '96px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                    <CheckCircle2 size={48} />
                                </div>
                                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', marginBottom: '12px' }}>{t('السنة المالية مقفلة محاسبياً')}</h2>
                                <p style={{ fontSize: '15px', color: C.textMuted, marginBottom: '40px' }}>
                                    {t('تم تدوير الأرصدة وإصدار قيد الإقفال بنجاح')} 
                                    {closingInfo?.date && <span style={{ color: '#5286ed', fontWeight: 800, marginInlineEnd: '8px' }}>#{new Date(closingInfo.date).toLocaleDateString('en-GB')}</span>}
                                </p>
                                
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
                                    <button 
                                        onClick={handlePrint}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 32px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: '#fff', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    >
                                        <Printer size={20} /> {t('طباعة التقرير الختامي')}
                                    </button>
                                    <button 
                                        onClick={() => setShowUndoConfirm(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '52px', padding: '0 32px', borderRadius: '16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontWeight: 800, cursor: 'pointer', transition: '0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                    >
                                        <RotateCcw size={20} /> {t('إلغاء إقفال السنة')}
                                    </button>
                                </div>
                            </div>
                        ) : step === 'done' && result ? (
                            <div style={{ padding: '40px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                                    <div style={{ background: 'rgba(16,185,129,0.15)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <FileCheck size={32} style={{ color: '#10b981' }} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#10b981', margin: 0 }}>{t('اكتمل الإقفال بنجاح')}</h2>
                                        <p style={{ fontSize: '13px', color: C.textMuted, margin: '4px 0 0' }}>{t('تم توليد قيد التصفير وترحيل الأرباح إلى الحساب الختامي.')}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <StatCard label={t("إجمالي الإيرادات")} value={result.revenueTotal} color="#3b82f6" compact />
                                    <StatCard label={t("إجمالي المصروفات")} value={result.expenseTotal} color="#ef4444" compact />
                                    <StatCard label={result.isProfit ? t("صافي أرباح العام") : t("صافي خسائر العام")} value={Math.abs(result.netIncome)} color={result.isProfit ? '#10b981' : '#f59e0b'} compact />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                                    <StatCard label={t("رصيد الإيرادات")} value={totalRev} color="#3b82f6" icon={ArrowUpRight} />
                                    <StatCard label={t("رصيد المصروفات")} value={totalExp} color="#ef4444" icon={ArrowDownRight} />
                                    <StatCard label={isProfitValue ? t("الأرباح المتوقعة") : t("الخسائر المتوقعة")} value={Math.abs(netIncomeValue)} color={isProfitValue ? '#10b981' : '#f87171'} icon={TrendingUp} />
                                </div>

                                {draftCount > 0 && (
                                    <div style={{ padding: '16px 20px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                                        <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 800 }}>{t('تنبيه: يوجد')} {draftCount} {t('قيود "مسودة" غير مرحلة تمنع إتمام الإقفال.')}</span>
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <DetailTable title={t("حسابات الإيرادات")} accounts={revenues} color="#3b82f6" t={t} />
                                    <DetailTable title={t("حسابات المصروفات")} accounts={expenses} color="#ef4444" t={t} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: `1px solid ${C.border}`, paddingBottom: '14px' }}>
                                <HistoryIcon size={18} style={{ color: C.textMuted }} />
                                <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>{t('أرشيف السنوات المرحلة')}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {years.filter(y => !y.isOpen).length > 0 ? (
                                    years.filter(y => !y.isOpen).map(y => (
                                        <div key={y.id} style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 800 }}>{y.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '11px', fontWeight: 700 }}>
                                                {t('مقفلة')} <CheckCircle2 size={13} />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5 }}>
                                        <HistoryIcon size={32} style={{ marginBottom: '8px', opacity: 0.2 }} />
                                        <p style={{ color: C.textMuted, fontSize: '12px' }}>{t('لا توجد سنوات مقفلة بعد')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: '16px', padding: '20px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#3b82f6', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Info size={16}/> {t('ملاحظات محاسبية')}</h4>
                            <p style={{ fontSize: '12px', color: C.textMuted, margin: 0, lineHeight: 1.6 }}>
                                {t('عملية الإقفال تقوم بتصفير حسابات (الإيرادات والمصروفات) ونقل صافي النتيجة إلى حساب الأرباح والخسائر. يرجى مراجعة كافة القيود قبل البدء.')}
                            </p>
                        </div>
                    </aside>
                </div>
            </div>
            
            <style jsx global>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
            `}</style>
        </DashboardLayout>
    );
}

function StatCard({ label, value, color, icon: Icon, compact }: any) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: compact ? '20px' : '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: C.textMuted, fontWeight: 800 }}>{label}</span>
                {Icon && <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}><Icon size={16} style={{ color, opacity: 0.8 }} /></div>}
            </div>
            <div style={{ fontSize: compact ? '22px' : '26px', fontWeight: 900, color, fontFamily: INTER, direction: 'ltr', textAlign: 'start' }}>{fmt(value)}</div>
            <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.03 }}>
                {Icon && <Icon size={80} />}
            </div>
        </div>
    );
}

function DetailTable({ title, accounts, color, t }: any) {
    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color }}>{title}</span>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', color: C.textMuted }}>{accounts.length} {t('حساب')}</span>
            </div>
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        {accounts.length > 0 ? accounts.map((acc: any, i: number) => (
                            <tr key={i} style={{ borderBottom: i < accounts.length - 1 ? `1px solid ${C.border}` : 'none', transition: '0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <td style={{ padding: '14px 20px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#f1f5f9' }}>{acc.name}</div>
                                    <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: INTER, fontWeight: 600 }}>{acc.code}</div>
                                </td>
                                <td style={{ padding: '14px 20px', textAlign: 'end', fontSize: '14px', fontWeight: 900, color, direction: 'ltr', fontFamily: INTER }}>
                                    {fmt(acc.balance)}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={2} style={{ padding: '40px', textAlign: 'center', color: C.textMuted, fontSize: '12px' }}>{t('لا توجد أرصدة حالياً')}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
