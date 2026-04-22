'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import DashboardLayout from '@/components/DashboardLayout';
import AppModal from '@/components/AppModal';
import CustomSelect from '@/components/CustomSelect';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import { TrendingUp, Plus, Search, Loader2, Calendar, Building2, Banknote, X, Tag, Activity, ArrowUpRight, History } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';
import { C, CAIRO, OUTFIT, PAGE_BASE, SC, IS, LS, THEME, focusIn, focusOut, TABLE_STYLE, BTN_PRIMARY, SEARCH_STYLE } from '@/constants/theme';

export default function OtherIncomePage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const { symbol: currencySign } = useCurrency();
    const { data: session } = useSession();
    const [entries, setEntries] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const [form, setForm] = useState({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        accountId: '',
        treasuryId: '',
        notes: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [eRes, aRes, tRes] = await Promise.all([
                fetch('/api/other-income'),
                fetch('/api/accounts'),
                fetch('/api/treasuries'),
            ]);
            const aData = await aRes.json();
            setEntries(await eRes.json());
            setAccounts(aData.filter((a: any) => a.type === 'revenue' && (a.accountCategory === 'detail' || !a.isParent)));
            setTreasuries(await tRes.json());
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!form.amount || !form.accountId || !form.treasuryId) {
            alert(t('يرجى ملء كافة البيانات الأساسية')); return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/other-income', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setShowForm(false);
                setForm({ date: new Date().toISOString().split('T')[0], amount: '', notes: '', treasuryId: '', accountId: '' });
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || t('فشل الحفظ'));
            }
        } catch { alert(t('خطأ في الاتصال بالخادم')); }
        finally { setSubmitting(false); }
    };

    const filteredAll = entries.filter(e => {
        const q = searchQuery.toLowerCase();
        const creditLine = e.lines.find((l: any) => l.credit > 0);
        return (
            e.entryNumber.toString().includes(q) ||
            (e.description || '').toLowerCase().includes(q) ||
            (creditLine?.account?.name || '').toLowerCase().includes(q)
        );
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [searchQuery]);

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader 
                    title={t("الإيرادات")} 
                    subtitle={t("إدارة وتحصيل الإيرادات المتنوعة وغير المرتبطة بالمبيعات المباشرة")}
                    icon={TrendingUp}
                    primaryButton={{
                        label: t("إضافة إيراد جديد"),
                        onClick: () => setShowForm(true),
                        icon: Plus
                    }}
                />

                {/* ── Search ── */}
                <div className="mobile-column" style={{ ...SEARCH_STYLE.container, alignItems: 'stretch' }}>
                    <div style={SEARCH_STYLE.wrapper}>
                        <Search size={16} style={SEARCH_STYLE.icon(C.primary)} />
                        <input 
                            placeholder={t("البحث في قيود الإيرادات، البند، أو الوصف...")} 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={SEARCH_STYLE.input} 
                            onFocus={focusIn} onBlur={focusOut}
                        />
                    </div>
                </div>

                {/* ── List ── */}
                <div style={TABLE_STYLE.container}>
                    <table style={TABLE_STYLE.table}>
                        <thead>
                            <tr style={TABLE_STYLE.thead}>
                                <th style={TABLE_STYLE.th(true)}>{t('التاريخ')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('رقم القيد')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('بند الإيراد')}</th>
                                <th style={{ ...TABLE_STYLE.th(false), }}>{t('الخزينة / البنك')}</th>
                                <th style={TABLE_STYLE.th(false)}>{t('البيان / التفاصيل')}</th>
                                <th style={{ ...TABLE_STYLE.th(false, true), }}>{t('المبلغ')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} style={{ padding: '60px', }}><Loader2 size={32} className="animate-spin" style={{ color: C.primary, margin: '0 auto' }} /></td></tr>
                            ) : filteredAll.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: '80px',  color: C.textMuted, fontWeight: 600, fontFamily: CAIRO }}>{t('لا توجد بيانات مسجلة مطابقة للبحث')}</td></tr>
                            ) : paginated.map((e, idx) => {
                                const creditLine = e.lines.find((l: any) => l.credit > 0);
                                const debitLine = e.lines.find((l: any) => l.debit > 0);
                                return (
                                    <tr key={e.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ ...TABLE_STYLE.td(true), color: C.textSecondary, fontSize: '12px' }}>{new Date(e.date).toLocaleDateString('en-GB')}</td>
                                        <td style={{ ...TABLE_STYLE.td(false), padding: '8px 12px' }}>
                                            <span style={{ 
                                                fontFamily: OUTFIT, fontSize: '10px', fontWeight: 900, color: '#fff',
                                                background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)',
                                                padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)'
                                            }}>
                                                JV-{e.entryNumber.toString().padStart(5, '0')}
                                            </span>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ fontWeight: 800, color: C.textPrimary }}>{creditLine?.account?.name}</div>
                                            <div style={{ fontSize: '10px', color: C.textMuted }}>{creditLine?.account?.code}</div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.textPrimary, fontWeight: 700, fontSize: '13px' }}>
                                                    <Banknote size={14} style={{ color: e.sourceType === 'bank' ? '#60a5fa' : C.success, opacity: 0.8 }} />
                                                    {e.sourceName || debitLine?.account?.name || '—'}
                                                </div>
                                                <div style={{ 
                                                    display: 'inline-flex', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800,
                                                    background: e.sourceType === 'bank' ? 'rgba(96, 165, 250, 0.1)' : 'rgba(52, 211, 153, 0.1)',
                                                    color: e.sourceType === 'bank' ? '#60a5fa' : '#34d399',
                                                    fontFamily: CAIRO
                                                }}>
                                                    {e.sourceType === 'bank' ? t('تحويل بنكي') : t('نقدية / خزينة')}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), maxWidth: '180px', color: C.textSecondary, fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {e.description || '—'}
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), }}>
                                            <span style={{ fontSize: '16px', fontWeight: 900, color: C.success, fontFamily: OUTFIT }}>
                                                {(creditLine?.credit || 0).toLocaleString('en-US')}
                                                <small style={{ fontSize: '11px', marginInlineEnd: '6px', fontWeight: 700, fontFamily: CAIRO }}>{currencySign}</small>
                                            </span>
                                        </td>
                                    </tr>
                                );
                        })}
                    </tbody>
                </table>
                <Pagination 
                    total={filteredAll.length}
                    pageSize={pageSize}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                />
            </div>

                {/* ── Create Modal ── */}
                <AppModal 
                    show={showForm} 
                    onClose={() => setShowForm(false)} 
                    title={t("تسجيل إيراد متنوع")} 
                    icon={TrendingUp} 
                    maxWidth="500px"
                    footer={
                        <button onClick={handleSave} disabled={submitting || !form.amount || !form.accountId || !form.treasuryId}
                            style={{ ...BTN_PRIMARY(false, submitting), height: '48px', margin: 0 }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                            {submitting ? <Loader2 size={24} className="animate-spin" /> : <>{t('حفظ العملية وتأكيد القيد')}</>}
                        </button>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0 0 0' }}>
                        <div>
                            <label style={LS}>{t('تاريخ التحصيل')}</label>
                            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                style={{ ...IS, direction: 'ltr' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>

                        <div>
                            <label style={LS}>{t('المبلغ المحصل')}</label>
                            <div 
                                style={{ 
                                    position: 'relative', 
                                    background: C.inputBg, 
                                    borderRadius: THEME.input.radius, 
                                    border: `1px solid ${C.border}`, 
                                    overflow: 'hidden', 
                                    height: THEME.input.height, 
                                    display: 'flex', 
                                    alignItems: 'center'
                                }}
                            >
                                {!form.amount && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 900, color: 'rgba(255,255,255,0.03)', pointerEvents: 'none', fontFamily: OUTFIT }}>0.00</div>}
                                <input 
                                    type="number" step="0.01" value={form.amount} 
                                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} 
                                    className="amount-input"
                                    style={{ 
                                        border: 'none', background: 'transparent', textAlign: 'center', 
                                        fontWeight: 900, color: C.primary, height: '100%', 
                                        fontSize: '17px', width: '100%', padding: '0 45px', 
                                        outline: 'none', fontFamily: OUTFIT 
                                    }} 
                                    onFocus={e => e.target.select()}
                                />
                                <span style={{ position: 'absolute', insetInlineStart: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: C.textMuted, fontWeight: 800 }}>{currencySign}</span>
                            </div>
                        </div>

                        <div>
                            <label style={LS}>{t('الخزينة / البنك')}</label>
                            <CustomSelect options={treasuries.map(t => ({ value: t.id, label: t.name, sub: t.balance.toLocaleString() }))}
                                value={form.treasuryId} onChange={v => setForm(f => ({ ...f, treasuryId: v }))} placeholder={t("وجهة الاستلام...")} icon={Banknote} />
                        </div>

                        <div>
                            <label style={LS}>{t('بند الإيراد')}</label>
                            <CustomSelect options={accounts.map(a => ({ value: a.id, label: a.name, sub: a.code }))}
                                value={form.accountId} onChange={v => setForm(f => ({ ...f, accountId: v }))} 
                                placeholder={t("اختر البند...")} icon={Tag} openUp={true} />
                        </div>

                        <div>
                            <label style={LS}>{t('البيان / التفاصيل')}</label>
                            <textarea rows={2} placeholder={t("وصف العملية...")} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                style={{ ...IS, height: '54px', padding: '8px 12px', resize: 'none', fontSize: '13px' }} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                    </div>
                </AppModal>

                <style>{`
                    .animate-spin { animation: spin 1.5s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                `}</style>
            </div>
        </DashboardLayout>
    );
}


