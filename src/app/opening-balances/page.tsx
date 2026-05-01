'use client';

import DashboardLayout from '@/components/DashboardLayout';
import CustomSelect from '@/components/CustomSelect';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Wallet, Save, Loader2, Search, CheckCircle2, XCircle, AlertTriangle, CalendarDays, Lock, Unlock, ArrowRightLeft, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT, PAGE_BASE, BTN_PRIMARY, TABLE_STYLE, SEARCH_STYLE, focusIn, focusOut, LS, IS, SC, STitle } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import PriceInput from '@/components/PriceInput';
import { useTranslation } from '@/lib/i18n';
import { getCurrencySymbol, formatNumber } from '@/lib/currency';

interface FinancialYear { id: string; name: string; isOpen: boolean; openingBalancesLocked: boolean; startDate: string; }
interface Account { id: string; code: string; name: string; nature: string; type: string; isParent: boolean; accountCategory?: string; }
interface OpeningBalance { id: string; accountId: string; debit: number; credit: number; account: Account; }

const ALLOWED_TYPES = ['asset', 'liability', 'equity'];
const fmtDisplay = (n: number) => formatNumber(n);

export default function OpeningBalancesPage() {
    const { data: session } = useSession();
    const { lang, t } = useTranslation();

    const typeLabels: Record<string, string> = {
        asset: t('أصول'), liability: t('خصوم'), equity: t('حقوق ملكية'),
    };

    const FILTER_BTNS = [
        { key: 'all',       label: t('الكل'),        color: C.primary },
        { key: 'asset',     label: t('أصول'),        color: C.success },
        { key: 'liability', label: t('خصوم'),        color: C.danger },
        { key: 'equity',    label: t('حقوق ملكية'), color: '#a78bfa' },
    ];
    const [years, setYears]               = useState<FinancialYear[]>([]);
    const [selectedYear, setSelectedYear] = useState('');
    const [accounts, setAccounts]         = useState<Account[]>([]);
    const [balances, setBalances]         = useState<Map<string, { debit: number; credit: number }>>(new Map());
    const [loading, setLoading]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [carrying, setCarrying]         = useState(false);
    const [locking, setLocking]           = useState(false);
    const [saved, setSaved]               = useState(false);
    const [search, setSearch]             = useState('');
    const [filterType, setFilterType]     = useState('all');
    const [currencySymbol, setCurrencySymbol] = useState('ج.م');
    const [showCarryModal, setShowCarryModal] = useState(false);

    const curYear = years.find(y => y.id === selectedYear);
    const isLocked = curYear?.openingBalancesLocked || false;
    
    const role = session?.user?.role;
    const canUnlock = role === 'admin' || role === 'accounts_manager' || role === t('مدير النظام') || role === t('مدير الحسابات');
    const isAccountantOnly = (role === 'accountant' || role === t('محاسب')) && !canUnlock;
    const isReadlyOnly = isLocked && isAccountantOnly;

    useEffect(() => {
        fetchYears();
        fetch('/api/accounts').then(r => r.json()).then((data: Account[]) => {
            setAccounts(data.filter(a => !a.isParent && a.accountCategory !== 'summary' && ALLOWED_TYPES.includes(a.type)));
        }).catch(() => {});
        // Fetch currency from settings
        fetch('/api/settings').then(r => r.json()).then(data => {
            const cur = data?.company?.currency;
            if (cur) {
                setCurrencySymbol(getCurrencySymbol(cur, lang));
            }
        }).catch(() => {});
    }, []);

    const fetchYears = () => {
        fetch('/api/settings').then(r => r.json()).then(data => setYears(data.financialYears || [])).catch(() => {});
    };

    useEffect(() => {
        if (!selectedYear) return;
        setLoading(true);
        fetch(`/api/opening-balances?financialYearId=${selectedYear}`)
            .then(r => r.json())
            .then((data: OpeningBalance[]) => {
                const map = new Map<string, { debit: number; credit: number }>();
                data.forEach(b => map.set(b.accountId, { debit: b.debit, credit: b.credit }));
                setBalances(map);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [selectedYear]);

    const handleChange = (accountId: string, field: 'debit' | 'credit', value: number) => {
        if (isReadlyOnly) return;
        const next = new Map(balances);
        const cur  = next.get(accountId) || { debit: 0, credit: 0 };
        if (field === 'debit')  { cur.debit  = value; if (cur.debit  > 0) cur.credit = 0; }
        else                    { cur.credit = value; if (cur.credit > 0) cur.debit  = 0; }
        next.set(accountId, { ...cur });
        setBalances(next);
        setSaved(false);
    };

    const handleSave = async () => {
        if (isReadlyOnly) return;
        setSaving(true);
        try {
            // Collect all non-zero balances into a single batch
            const batchBalances: { accountId: string; debit: number; credit: number }[] = [];
            balances.forEach((val, accountId) => {
                if (val.debit > 0 || val.credit > 0) {
                    batchBalances.push({ accountId, debit: val.debit, credit: val.credit });
                }
            });

            // Send a single batch request instead of parallel individual requests
            const res = await fetch('/api/opening-balances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    batch: true,
                    financialYearId: selectedYear,
                    balances: batchBalances,
                }),
            });

            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (e) {
            console.error('Save error:', e);
        } finally {
            setSaving(false);
        }
    };

    const handleCarryForward = async () => {
        setCarrying(true);
        try {
            const res = await fetch('/api/opening-balances/carry-forward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetYearId: selectedYear }),
            });
            const data = await res.json();
            if (data.success) {
                setShowCarryModal(false);
                alert(data.message);
                window.location.reload();
            } else {
                alert(data.error || t('فشل الترحيل'));
            }
        } catch {
            alert(t('حدث خطأ أثناء الترحيل'));
        } finally {
            setCarrying(false);
        }
    };

    const toggleLock = async () => {
        if (!canUnlock) return;
        setLocking(true);
        try {
            await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'update_financial_year', 
                    data: { id: selectedYear, openingBalancesLocked: !isLocked } 
                }),
            });
            fetchYears();
        } catch {
            alert(t('فشل تحديث حالة القفل'));
        } finally {
            setLocking(false);
        }
    };

    const totalDebit  = Array.from(balances.values()).reduce((s, b) => s + b.debit,  0);
    const totalCredit = Array.from(balances.values()).reduce((s, b) => s + b.credit, 0);
    const difference  = totalDebit - totalCredit;
    const isBalanced  = Math.abs(difference) < 0.01;
    const filledCount = Array.from(balances.values()).filter(b => b.debit > 0 || b.credit > 0).length;

    const filtered = accounts.filter(a => {
        const matchSearch = a.name.includes(search) || a.code.includes(search);
        const matchType   = filterType === 'all' || a.type === filterType;
        return matchSearch && matchType;
    });

    return (
        <DashboardLayout>
            <div style={PAGE_BASE}>
                <PageHeader
                    title={t("الأرصدة الافتتاحية")}
                    subtitle={t("إدخال أرصدة الحسابات عند بداية السنة المالية — تأكد من توازن القيد لضمان صحة القوائم المالية")}
                    icon={Wallet}
                    leftContent={(
                        <div style={{ width: '220px' }}>
                            <CustomSelect
                                value={selectedYear}
                                onChange={setSelectedYear}
                                icon={CalendarDays}
                                placeholder={t("اختر السنة المالية")}
                                options={years.filter(y => y.isOpen).map(y => ({ value: y.id, label: y.name }))} 
                            />
                        </div>
                    )}
                    actions={selectedYear ? [
                        !isLocked && filledCount === 0 && years.some(y => new Date(y.startDate) < new Date(curYear?.startDate || '')) && (
                             <button key="carry" onClick={() => setShowCarryModal(true)} disabled={carrying} 
                                 style={{ 
                                     display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 18px', 
                                     borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: carrying ? 'not-allowed' : 'pointer',
                                     background: 'rgba(16,185,129,0.08)', border: `1px solid ${C.success}30`, color: C.success,
                                     transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: CAIRO
                                 }}
                                 onMouseEnter={e => { if(!carrying) { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                 onMouseLeave={e => { if(!carrying) { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; e.currentTarget.style.transform = 'none'; } }}
                             >
                                 {carrying ? <Loader2 size={16} className="animate-spin" /> : <ArrowRightLeft size={16} />}
                                 {t('ترحيل من سنة سابقة')}
                             </button>
                        ),
                        canUnlock && (
                             <button key="lock" onClick={toggleLock} disabled={locking} 
                                 style={{ 
                                     display: 'flex', alignItems: 'center', gap: '8px', height: '42px', padding: '0 18px', 
                                     borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: locking ? 'not-allowed' : 'pointer',
                                     color: isLocked ? C.danger : C.textSecondary, background: isLocked ? `${C.danger}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${isLocked ? `${C.danger}30` : C.border}`,
                                     transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', fontFamily: CAIRO
                                 }}
                                 onMouseEnter={e => { if(!locking) { e.currentTarget.style.background = isLocked ? `${C.danger}20` : 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                                 onMouseLeave={e => { if(!locking) { e.currentTarget.style.background = isLocked ? `${C.danger}12` : 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'none'; } }}
                             >
                                 {locking ? <Loader2 size={16} className="animate-spin" /> : isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                 {isLocked ? t('فتح القفل') : t('قفل الأرصدة')}
                             </button>
                        ),
                        !isReadlyOnly && (
                             <button key="save" onClick={handleSave} disabled={saving || !filledCount} 
                                 style={{ 
                                     display: 'flex', alignItems: 'center', gap: '10px', height: '42px', padding: '0 24px', 
                                     borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: (saving || !filledCount) ? 'not-allowed' : 'pointer',
                                     background: saved ? '#10b981' : C.primary, color: 'white', border: 'none',
                                     boxShadow: (saving || !filledCount) ? 'none' : '0 4px 12px rgba(37,106,244,0.25)',
                                     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', opacity: (saving || !filledCount) ? 0.6 : 1,
                                     fontFamily: CAIRO, whiteSpace: 'nowrap'
                                 }}
                                 onMouseEnter={e => { if(!saving && filledCount) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37,106,244,0.35)'; } }}
                                 onMouseLeave={e => { if(!saving && filledCount) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,106,244,0.25)'; } }}
                             >
                                 {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                                 {saving ? t('جاري الحفظ...') : saved ? t('تم الحفظ بنجاح') : t('حفظ الأرصدة')}
                             </button>
                        )
                    ].filter(Boolean) as React.ReactNode[] : undefined}
                />

                {!selectedYear ? (
                    <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...SC, padding: '120px 20px', borderStyle: 'dashed' }}>
                        <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                            <Wallet size={40} style={{ color: C.textSecondary, opacity: 0.5 }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('برجاء اختيار السنة المالية')}</p>
                        <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('حدد السنة المالية المناسبة لاستعراض أو إدخال الأرصدة الافتتاحية')}</p>
                    </div>
                ) : loading ? (
                    <div style={{ ...SC, height: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: C.primary }} />
                        <span style={{ fontSize: '15px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('جاري تحميل البيانات...')}</span>
                    </div>
                ) : accounts.length === 0 ? (
                    <div style={{  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...SC, padding: '100px 20px', borderStyle: 'styled' }}>
                        <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <AlertTriangle size={36} style={{ color: C.warning }} />
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>{t('لا توجد حسابات تحليلية متاحة')}</p>
                        <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 600, color: C.textSecondary, fontFamily: CAIRO }}>{t('يجب إضافة حسابات "أصول" أو "خصوم" أو "حقوق ملكية" في دليل الحسابات أولاً')}</p>
                    </div>
                ) : (
                    <>
                        {isLocked && (
                            <div style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', borderRadius: '16px', 
                                background: 'rgba(248,113,113,0.05)', border: `1px solid ${C.danger}20`, marginBottom: '24px', 
                                fontSize: '13px', color: C.danger, fontWeight: 700, fontFamily: CAIRO 
                            }}>
                                <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${C.danger}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Lock size={18} />
                                </div>
                                <span>{t('هذه الأرصدة معتمدة ومقفلة نهائياً.')} {canUnlock ? t('لديك صلاحية فك القفل للتعديل عند الضرورة.') : t('لا يمكن إجراء أي تعديلات إلا بتصريح من الإدارة المالية.')}</span>
                            </div>
                        )}

                        {/* Stats Cards - Unified Design */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
                            {[
                                { label: t('الحسابات المسجلة'), value: `${filledCount} / ${accounts.length}`, color: C.primary, icon: Wallet, sub: t('حساب تحليلي') },
                                { label: t('إجمالي مدين'), value: fmtDisplay(totalDebit), color: C.success, icon: TrendingUp, sub: currencySymbol },
                                { label: t('إجمالي دائن'), value: fmtDisplay(totalCredit), color: C.danger, icon: TrendingDown, sub: currencySymbol },
                                { label: t('حالة التوازن'),
                                  value: isBalanced ? t('متوازن') : fmtDisplay(Math.abs(difference)),
                                  color: isBalanced ? C.success : C.warning,
                                  icon: Scale,
                                  sub: isBalanced ? t('القيد متوازن ✓') : t('يوجد فرق') },
                            ].map((s, i) => (
                                <div key={i} style={{ 
                                    background: `${s.color}08`, 
                                    border: `1px solid ${s.color}33`, 
                                    borderRadius: '10px', 
                                    padding: '16px 18px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between' 
                                }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <p style={{ fontSize: '11px', fontWeight: 500, color: C.textSecondary, margin: '0 0 4px', fontFamily: CAIRO }}>{s.label}</p>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT }}>{s.value}</span>
                                            <span style={{ fontSize: '11px', color: C.textSecondary, fontWeight: 500, fontFamily: CAIRO }}>{s.sub}</span>
                                        </div>
                                    </div>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '10px',
                                        background: `${s.color}15`,
                                        border: `1px solid ${s.color}30`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: s.color,
                                    }}>
                                        <s.icon size={18} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Filters & Search - Standard Design */}
                        <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                            <div style={SEARCH_STYLE.wrapper}>
                                <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                                <input
                                    placeholder={t("ابحث بكود الحساب أو الاسم العربي/الإنجليزي...")}
                                    value={search} 
                                    onChange={e => setSearch(e.target.value)}
                                    style={SEARCH_STYLE.input}
                                    onFocus={focusIn} onBlur={focusOut} 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {FILTER_BTNS.map(btn => (
                                    <button key={btn.key} onClick={() => setFilterType(btn.key)} style={{
                                        height: '36px', padding: '0 14px', borderRadius: '6px', border: '1px solid',
                                        fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                                        borderColor: filterType === btn.key ? `${btn.color}50` : C.border,
                                        background:  filterType === btn.key ? `${btn.color}15`  : 'transparent',
                                        color:       filterType === btn.key ? btn.color          : C.textSecondary,
                                    }}>
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table - Standard Design */}
                        <div style={TABLE_STYLE.container}>
                            <table style={TABLE_STYLE.table}>
                                <thead style={TABLE_STYLE.thead}>
                                    <tr>
                                        {[t('الكود المحاسبي'), t('اسم الحساب'), t('النوع'), t('الطبيعة'), t('مدين'), t('دائن')].map((h, i) => (
                                            <th key={i} style={TABLE_STYLE.th(false, true)}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: '60px',  color: C.textSecondary, fontSize: '15px', fontFamily: CAIRO, fontWeight: 700 }}>{t('لا توجد نتائج مطابقة لعملية البحث')}</td></tr>
                                    ) : filtered.map((account: Account, idx: number) => {
                                        const balance = balances.get(account.id) || { debit: 0, credit: 0 };
                                        const hasDr   = balance.debit  > 0;
                                        const hasCr   = balance.credit > 0;
                                        const tColor  = C.primary;
                                        const natureColor = account.nature === 'debit' ? C.success : C.danger;
                                        
                                        return (
                                            <tr key={account.id}
                                                style={TABLE_STYLE.row(idx === filtered.length - 1)}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                onMouseLeave={e => e.currentTarget.style.background  = 'rgba(0,0,0,0.15)'}>
                                                <td style={TABLE_STYLE.td(true, true)}>
                                                    <span style={{ fontFamily: OUTFIT, fontSize: '13px', color: natureColor, fontWeight: 600 }}>{account.code}</span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(true, true),  fontWeight: 600 }}>{account.name}</td>
                                                <td style={TABLE_STYLE.td(false, true)}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: `${tColor}12`, color: tColor, border: `1px solid ${tColor}20`, fontFamily: CAIRO }}>
                                                        {typeLabels[account.type]}
                                                    </span>
                                                </td>
                                                <td style={TABLE_STYLE.td(false, true)}>
                                                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px', background: `${natureColor}12`, color: natureColor, border: `1px solid ${natureColor}20`, fontFamily: CAIRO }}>
                                                        {account.nature === 'debit' ? t('مدين') : t('دائن')}
                                                    </span>
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), width: '160px' }}>
                                                    <PriceInput 
                                                        value={hasDr ? balance.debit : ''} 
                                                        onChange={val => handleChange(account.id, 'debit', val)}
                                                        disabled={hasCr || isReadlyOnly}
                                                        style={{ 
                                                            borderColor: hasDr ? `${C.success}50` : C.border, 
                                                            color: C.textPrimary, 
                                                            background: hasDr ? `${C.success}05` : 'transparent',
                                                        }}
                                                    />
                                                </td>
                                                <td style={{ ...TABLE_STYLE.td(false, true), width: '160px' }}>
                                                    <PriceInput 
                                                        value={hasCr ? balance.credit : ''} 
                                                        onChange={val => handleChange(account.id, 'credit', val)}
                                                        disabled={hasDr || isReadlyOnly}
                                                        style={{ 
                                                            borderColor: hasCr ? `${C.danger}50` : C.border, 
                                                            color: C.textPrimary, 
                                                            background: hasCr ? `${C.danger}05` : 'transparent',
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: `1px solid ${C.border}` }}>
                                        <td colSpan={4} style={{ padding: '14px 20px',  fontSize: '13px', fontWeight: 600, color: C.textPrimary,  fontFamily: CAIRO, textAlign: 'center' }}>{t('إجمالي الأرصدة الختامية')}</td>
                                        <td style={{ padding: '14px 20px',   fontSize: '13px', fontWeight: 600, color: C.textPrimary,  fontFamily: OUTFIT }}>{fmtDisplay(totalDebit)}</td>
                                        <td style={{ padding: '14px 20px',   fontSize: '13px', fontWeight: 600, color: C.textPrimary, textAlign: 'center', fontFamily: OUTFIT }}>{fmtDisplay(totalCredit)}</td>
                                    </tr>
                                    {!isBalanced && filledCount > 0 && (
                                        <tr style={{ background: `${C.warning}10` }}>
                                            <td colSpan={4} style={{ padding: '10px 20px', fontSize: '12px', fontWeight: 600, color: C.warning,  fontFamily: CAIRO }}>
                                                <AlertTriangle size={14} style={{ display: 'inline', marginInlineStart: '6px' }} /> {t('يرجى مراجعة المدخلات - القيد غير متوازن')}
                                            </td>
                                            <td colSpan={2} style={{ padding: '10px 20px',  fontSize: '13px', fontWeight: 600, color: C.warning, direction: 'ltr', fontFamily: OUTFIT }}>{fmtDisplay(Math.abs(difference))}</td>
                                        </tr>
                                    )}
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <AppModal
                show={showCarryModal}
                onClose={() => setShowCarryModal(false)}
                onConfirm={handleCarryForward}
                title={t("تأكيد ترحيل الأرصدة")}
                icon={ArrowRightLeft}
            >
                <div style={{ padding: '10px 0' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '20px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.success, margin: '0 auto 20px' }}>
                        <ArrowRightLeft size={30} />
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO, marginBottom: '12px' }}>{t('هل أنت متأكد من ترحيل الأرصدة الختامية؟')}</p>
                    <p style={{ fontSize: '13px', color: C.textSecondary, fontFamily: CAIRO, lineHeight: 1.6 }}>
                        {t('سيتم استيراد كافة الأرصدة الختامية من السنة المالية السابقة كأرصدة افتتاحية لهذه السنة')} ({curYear?.name}).
                        <br />
                        <span style={{ color: C.warning, fontWeight: 700 }}>{t('ملاحظة: تأكد أن السنة السابقة تم تدقيقها وإقفالها بشكل نهائي.')}</span>
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button onClick={handleCarryForward} disabled={carrying} style={{ ...BTN_PRIMARY(carrying, false), flex: 1.5, height: '46px' }}>
                        {carrying ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                        <span style={{ marginInlineEnd: '8px' }}>{t('تأكيد الترحيل الآن')}</span>
                    </button>
                    <button onClick={() => setShowCarryModal(false)} style={{ height: '46px', padding: '0 20px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flex: 1, fontFamily: CAIRO }}>
                        {t('تراجع')}
                    </button>
                </div>
            </AppModal>

            <style>{`
                input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type=number] { -moz-appearance: textfield; }
                .animate-spin { animation: spin 1s linear infinite; } 
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </DashboardLayout>
    );
}

