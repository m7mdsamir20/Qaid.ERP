'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { Plus, X, Layers, CheckCircle2, XCircle, Pencil, Trash2, AlertTriangle, Loader2, Search, Eye } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCurrency } from '@/hooks/useCurrency';

interface CostCenter {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isActive: boolean;
    totalExpenses?: number;
    transactionCount?: number;
}

import { 
    C, CAIRO, INTER, PAGE_BASE, SC, IS, LS, THEME, focusIn, focusOut, 
    TABLE_STYLE, SEARCH_STYLE, BTN_PRIMARY, KPI_STYLE, KPI_ICON 
} from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import Pagination from '@/components/Pagination';
import AppModal from '@/components/AppModal';

const AC = C.primary;

/* ── Delete Confirm ── */

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function CostCentersPage() {
    const { symbol: cSymbol } = useCurrency();
    const { data: session } = useSession();
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState<CostCenter | null>(null);
    const [deleteItem, setDeleteItem] = useState<CostCenter | null>(null);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 15;

    const isAdmin = session?.user?.role === 'admin';
    const perms = (session?.user as any)?.permissions || {};
    const canCreate = isAdmin || perms['/cost-centers']?.create;
    const canEdit = isAdmin || perms['/cost-centers']?.edit;
    const canDelete = isAdmin || perms['/cost-centers']?.delete;

    const emptyForm = { code: '', name: '', description: '', isActive: true };
    const [form, setForm] = useState(emptyForm);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/cost-centers');
            if (res.ok) setCostCenters(await res.json());
        } catch { }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const generateCode = (list: CostCenter[]) => {
        const next = list.length + 1;
        return `CC-${String(next).padStart(3, '0')}`;
    };

    const openCreate = () => {
        setEditItem(null);
        setForm({ ...emptyForm, code: generateCode(costCenters) });
        setShowModal(true);
    };
    const openEdit = (cc: CostCenter) => {
        setEditItem(cc);
        setForm({ code: cc.code, name: cc.name, description: cc.description || '', isActive: cc.isActive });
        setShowModal(true);
    };

    const handleDelete = async () => {
        if (!deleteItem) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/cost-centers/${deleteItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setDeleteItem(null);
                fetchData();
            } else {
                const d = await res.json();
                alert(d.error || 'فشل الحذف');
                setDeleteItem(null);
            }
        } catch { 
            alert('فشل الاتصال'); 
            setDeleteItem(null);
        }
        finally { setSaving(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const url = editItem ? `/api/cost-centers/${editItem.id}` : '/api/cost-centers';
            const method = editItem ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) { setShowModal(false); fetchData(); }
            else { const d = await res.json(); alert(d.error || 'حدث خطأ'); }
        } catch { alert('فشل الاتصال'); }
        finally { setSaving(false); }
    };

    const toggleActive = async (cc: CostCenter) => {
        try {
            await fetch(`/api/cost-centers/${cc.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cc, isActive: !cc.isActive }),
            });
            fetchData();
        } catch { }
    };

    const filteredAll = costCenters.filter(cc => {
        const matchSearch = cc.name.includes(search) || cc.code.toLowerCase().includes(search.toLowerCase());
        const matchActive = filterActive === 'all' ? true : filterActive === 'active' ? cc.isActive : !cc.isActive;
        return matchSearch && matchActive;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    useEffect(() => { setCurrentPage(1); }, [search, filterActive]);

    const activeCount = costCenters.filter(c => c.isActive).length;
    const inactiveCount = costCenters.filter(c => !c.isActive).length;



    return (
        <DashboardLayout>
            <PageHeader 
                title="مراكز التكلفة"
                subtitle="تقسيم المصروفات والمشاريع — تتبع كفاءة الصرف لكل قسم"
                icon={Layers}
                primaryButton={canCreate ? {
                    label: "مركز تكلفة جديد",
                    onClick: openCreate,
                    icon: Plus
                } : undefined}
            />



            {/* ── Search & Filters ── */}
            <div style={SEARCH_STYLE.container}>
                <div style={SEARCH_STYLE.wrapper}>
                    <Search size={SEARCH_STYLE.iconSize} style={SEARCH_STYLE.icon(C.primary)} />
                    <input 
                        placeholder="ابحث بالاسم أو رمز المركز..." 
                        value={search} onChange={e => setSearch(e.target.value)}
                        style={SEARCH_STYLE.input} 
                        onFocus={focusIn} onBlur={focusOut} 
                    />
                </div>
            </div>

            {/* ── Table View ── */}
            <div style={TABLE_STYLE.container}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', flexDirection: 'column', gap: '12px', color: C.textMuted }}>
                        <Loader2 size={36} style={{ animation: 'spin 1.5s linear infinite', color: C.primary }} />
                        <span style={{ fontSize: '14px', fontFamily: CAIRO }}>جاري التحميل...</span>
                    </div>
                ) : filteredAll.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', color: C.textMuted }}>
                        <Layers size={60} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.1 }} />
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: CAIRO }}>{search ? 'لا توجد نتائج بحث مطابقة' : 'لا توجد مراكز تكلفة مضافة بعد'}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={TABLE_STYLE.table}>
                            <thead>
                                <tr style={TABLE_STYLE.thead}>
                                    <th style={TABLE_STYLE.th(true)}>رمز المركز</th>
                                    <th style={TABLE_STYLE.th(false)}>اسم المركز التكاليفي</th>
                                    <th style={TABLE_STYLE.th(false)}>البيان / الملاحظات</th>
                                    <th style={TABLE_STYLE.th(false)}>الحالة</th>
                                    <th style={{ ...TABLE_STYLE.th(false), textAlign: 'center' }}>إجمالي المصروفات</th>
                                    <th style={TABLE_STYLE.th(false)}>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((cc, idx) => (
                                    <tr key={cc.id} style={TABLE_STYLE.row(idx === paginated.length - 1)}
                                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.12)'}
                                    >
                                        <td style={{ ...TABLE_STYLE.td(true), fontWeight: 800, fontSize: '11px', color: C.primary, opacity: 0.65, fontFamily: INTER }}>
                                            {cc.code}
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{cc.name}</div>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ fontSize: '12px', color: C.textSecondary, fontFamily: CAIRO, maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {cc.description || '—'}
                                            </div>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: cc.isActive ? C.success : C.danger, background: cc.isActive ? C.successBg : C.dangerBg, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${cc.isActive ? C.successBorder : C.dangerBorder}` }}>
                                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cc.isActive ? C.success : C.danger }} />
                                                {cc.isActive ? 'نشط' : 'موقوف'}
                                            </div>
                                        </td>
                                        <td style={{ ...TABLE_STYLE.td(false), textAlign: 'center' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 900, color: C.textPrimary, fontFamily: INTER }}>
                                                {cc.totalExpenses ? cc.totalExpenses.toLocaleString('en-US') : '0.00'} 
                                                <span style={{ fontSize: '10px', color: C.textMuted, marginInlineEnd: '4px' }}>{cSymbol}</span>
                                            </div>
                                        </td>
                                        <td style={TABLE_STYLE.td(false)}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                {canEdit && (
                                                    <button onClick={() => openEdit(cc)} style={TABLE_STYLE.actionBtn()} title="تعديل">
                                                        <Pencil size={TABLE_STYLE.actionIconSize} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => setDeleteItem(cc)} style={TABLE_STYLE.actionBtn(C.danger)} title="حذف">
                                                        <Trash2 size={TABLE_STYLE.actionIconSize} />
                                                    </button>
                                                )}
                                                <button onClick={() => window.location.href = `/cost-centers/${cc.id}`} style={TABLE_STYLE.actionBtn()} title="عرض التفاصيل">
                                                    <Eye size={TABLE_STYLE.actionIconSize} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <Pagination 
                            total={filteredAll.length} 
                            pageSize={pageSize} 
                            currentPage={currentPage} 
                            onPageChange={setCurrentPage} 
                        />
                    </div>
                )}
            </div>


            {/* ── Modal ── */}
            <AppModal
                show={showModal}
                onClose={() => setShowModal(false)}
                title={editItem ? 'تعديل مركز التكلفة' : 'مركز تكلفة جديد'}
                icon={Layers}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px' }}>
                        <div>
                            <label style={LS}>رمز المركز</label>
                            <input readOnly value={form.code}
                                style={{ ...IS, direction: 'ltr', textAlign: 'end', fontFamily: 'monospace', fontWeight: 700, background: 'rgba(255,255,255,0.02)', color: '#64748b', cursor: 'not-allowed', borderColor: 'rgba(255,255,255,0.04)' }} />
                        </div>
                        <div>
                            <label style={LS}>اسم المركز <span style={{ color: '#f87171' }}>*</span></label>
                            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="مثال: مشروع البنية التحتية" style={IS} onFocus={focusIn} onBlur={focusOut} />
                        </div>
                    </div>

                    <div>
                        <label style={LS}>الوصف التفصيلي</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="ملاحظات حول طبيعة المركز..." rows={3}
                            style={{ ...IS, height: 'auto', padding: '10px 14px', resize: 'none' as const }}
                            onFocus={focusIn} onBlur={focusOut} />
                    </div>

                    <div onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '10px', border: `1px solid ${form.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`, background: form.isActive ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: form.isActive ? '#34d399' : '#64748b' }}>
                                {form.isActive ? 'نشط للاستخدام' : 'موقوف مؤقتاً'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                {form.isActive ? 'يمكن تحديده في القيود المحاسبية' : 'لن يظهر عند إدخال القيود'}
                            </div>
                        </div>
                        <div style={{ width: 44, height: 24, borderRadius: '12px', background: form.isActive ? '#10b981' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                            <div style={{ position: 'absolute', top: 3, right: form.isActive ? 3 : 'auto', left: form.isActive ? 'auto' : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        <button type="submit" disabled={saving} style={{ ...BTN_PRIMARY(saving, false), flex: 1.5, height: '48px' }}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : (editItem ? <CheckCircle2 size={18} /> : <Plus size={18} />)}
                            <span style={{ marginInlineEnd: '8px' }}>{editItem ? 'حفظ التعديلات' : 'إضافة المركز'}</span>
                        </button>
                        <button type="button" onClick={() => setShowModal(false)} style={{ height: '48px', padding: '0 20px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: '12px', color: C.textSecondary, fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO }}>إلغاء</button>
                    </div>
                </form>
            </AppModal>

            <AppModal
                show={!!deleteItem}
                onClose={() => setDeleteItem(null)}
                isDelete={true}
                title="حذف مركز التكلفة"
                itemName={deleteItem?.name}
                onConfirm={handleDelete}
                isSubmitting={saving}
            />

            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </DashboardLayout >
    );
}
