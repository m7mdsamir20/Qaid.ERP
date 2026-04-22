'use client';

import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { navSections } from '@/constants/navigation';
import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Settings as SettingsIcon, Building2, Globe, Bell, Shield, Database, AlertCircle, FileText, CreditCard, CheckCircle2, Percent, Loader2, Store } from 'lucide-react';
import { C, CAIRO, PAGE_BASE } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import AppModal from '@/components/AppModal';
import * as XLSX from 'xlsx';

import CompanyTab from './_tabs/CompanyTab';
import GeneralTab from './_tabs/GeneralTab';
import NotificationsTab from './_tabs/NotificationsTab';
import TaxTab from './_tabs/TaxTab';
import UsersTab from './_tabs/UsersTab';
import SubscriptionTab from './_tabs/SubscriptionTab';
import BranchesTab from './_tabs/BranchesTab';
import DatabaseTab from './_tabs/DatabaseTab';

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function SettingsPage() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    return (
        <Suspense fallback={
            <DashboardLayout>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#64748b' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري تحميل الإعدادات...')}
                </div>
            </DashboardLayout>
        }>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [company, setCompany] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '', phone: '' });
    const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
    const [showBranchModal, setShowBranchModal] = useState(false);
    const [isSavingBranch, setIsSavingBranch] = useState(false);


    const searchParams = useSearchParams();
    const { data: session, status, update } = useSession();
    const businessType = (session?.user as any)?.businessType?.toUpperCase();
    const isServices = businessType === 'SERVICES';

    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'company');
    const [isEditMode, setIsEditMode] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');
    const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: string; name?: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currencySearch, setCurrencySearch] = useState('');

    // Forms
    const [companyForm, setCompanyForm] = useState({
        name: '', nameEn: '', phone: '', email: '',
        addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '',
        taxNumber: '', commercialRegister: '', website: '', logo: ''
    });
    const [generalForm, setGeneralForm] = useState({
        currency: 'EGP', timezone: 'Africa/Cairo', calendarType: 'Gregorian', dateFormat: 'DD/MM/YYYY',
        customCurrency: '', countryCode: 'EG'
    });
    const [savedGeneral, setSavedGeneral] = useState({
        currency: 'EGP', timezone: 'Africa/Cairo', calendarType: 'Gregorian', dateFormat: 'DD/MM/YYYY',
        customCurrency: '', countryCode: 'EG'
    });
    const [savedCompanyForm, setSavedCompanyForm] = useState({
        name: '', nameEn: '', phone: '', email: '',
        addressRegion: '', addressCity: '', addressDistrict: '', addressStreet: '',
        taxNumber: '', commercialRegister: '', website: '', logo: ''
    });
    const [notificationsForm, setNotificationsForm] = useState<any>({
        lowStock: { enabled: true, channels: { system: true, email: false, whatsapp: false }, threshold: 10, priority: 'High' },
        latePayment: { enabled: true, channels: { system: true, email: true, whatsapp: true }, priority: 'Medium' }
    });
    const [taxForm, setTaxForm] = useState({
        enabled: false,
        type: 'VAT',
        rate: 14,
        isInclusive: false,
    });
    const [savedTaxForm, setSavedTaxForm] = useState({
        enabled: false,
        type: 'VAT',
        rate: 14,
        isInclusive: false,
    });
    interface NewUserForm {
        name: string;
        username: string;
        email: string;
        phone: string;
        password: string;
        roleId: string;
        status: string;
        avatar: string;
        branchId: string;
        allowedBranches: string[]; // [] = all branches
        customPermissions: Record<string, { view: boolean; create: boolean; editDelete: boolean }>;
    }

    const [newUserForm, setNewUserForm] = useState<NewUserForm>({
        name: '', username: '', email: '', phone: '', password: '', roleId: 'none', status: 'active',
        avatar: 'm1', branchId: '', allowedBranches: [],
        customPermissions: {}
    });
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);

    // Default permissions per role
    const getRoleDefaults = (role: string) => {
        const perms: any = {};
        const grant = (pageIds: string[], readOnly?: string[]) => {
            pageIds.forEach(id => { perms[id] = { view: true, create: true, editDelete: true }; });
            (readOnly || []).forEach(id => { perms[id] = { view: true, create: false, editDelete: false }; });
        };

        if (role === 'admin') {
            navSections.forEach(s => grant(s.links.map(l => l.id)));
        } else if (role === 'accountant') {
            // محاسب: حسابات + خزن + قيود + تقارير مالية
            grant([
                '/', '/accounts', '/opening-balances', '/journal-entries', '/cost-centers', '/closing-entries',
                '/treasuries', '/other-income', '/expenses',
                '/partners', '/partner-accounts', '/profit-distribution', '/capital',
                '/financial-years',
            ], ['reports-financial', 'reports-treasury-bank']);
        } else if (role === 'sales') {
            // مندوب مبيعات / خدمات: مبيعات + عملاء
            const salesPages = isServices ? ['/', '/sales', '/customers', '/receipts'] : ['/', '/sales', '/sale-returns', '/receipts', '/customers', '/installments'];
            grant(salesPages, ['reports-sales-purchases']);
        } else if (role === 'procurement') {
            // مسؤول مشتريات: مشتريات + موردين
            grant([
                '/', '/purchases', '/purchase-returns', '/purchase-payments', '/suppliers',
            ], ['reports-sales-purchases']);
        } else if (role === 'storekeeper') {
            // أمين مستودع / مسؤول خدمات: قائمة الخدمات + الفروع
            const invPages = isServices ? ['/', '/categories', '/items', '/warehouses'] : ['/', '/units', '/items', '/warehouses', '/stocktakings', '/warehouse-transfers'];
            grant(invPages, ['reports-inventory']);
        } else if (role === 'hr') {
            // موارد بشرية: موظفين + رواتب + سلف + خصومات + أقسام
            grant([
                '/', '/employees', '/payrolls', '/advances', '/deductions', '/departments',
            ], ['reports-hr']);
        } else if (role === 'cashier') {
            // كاشير
            grant(['/', '/sales', '/receipts'], ['/customers', '/treasuries']);
        } else if (role === 'manager') {
            // مدير فرع: كل شيء عدا الإعدادات
            permissionHierarchy
                .filter(s => s.featureKey !== 'settings')
                .forEach(s => grant(s.links.map(l => l.id)));
        }
        return perms;
    };
    // --- Import System States ---
    const [showImportModal, setShowImportModal] = useState(false);
    const [importType, setImportType] = useState<'customers' | 'suppliers' | 'items' | null>(null);
    const [importStep, setImportStep] = useState(1); // 1: Select, 2: Review, 3: Processing
    const [importData, setImportData] = useState<any[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [currentImportIndex, setCurrentImportIndex] = useState(0);
    const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

    // Fetch warehouses when items import opens
    useEffect(() => {
        if (importType === 'items' && showImportModal) {
            fetch('/api/warehouses')
                .then(r => r.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setWarehouses(data);
                        if (data.length > 0 && !selectedWarehouseId) setSelectedWarehouseId(data[0].id);
                    }
                })
                .catch(() => { });
        }
    }, [importType, showImportModal]);

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

            if (data.length > 1) {
                const headers = data[0] as string[];
                const rows = data.slice(1).map((row: any) => {
                    const obj: any = {};
                    headers.forEach((h, i) => { if (h) obj[h] = row[i]; });
                    return obj;
                });
                setImportData(rows);
                setImportStep(2);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processImport = async () => {
        if (!importType) return;
        setImportStep(3);
        setImportLoading(true);
        let successCount = 0;
        let failCount = 0;

        const apiEndpoint = `/api/${importType}`;

        // For items: use the selected warehouse
        let defaultWarehouseId: string | null = selectedWarehouseId || null;
        if (importType === 'items' && !defaultWarehouseId) {
            try {
                const wRes = await fetch('/api/warehouses');
                if (wRes.ok) {
                    const wList = await wRes.json();
                    if (wList.length > 0) defaultWarehouseId = wList[0].id;
                }
            } catch { /* no warehouse */ }
        }

        for (let i = 0; i < importData.length; i++) {
            setCurrentImportIndex(i);
            const row = importData[i];
            let payload: any = {};

            if (importType === 'customers' || importType === 'suppliers') {
                // ── Smart name detection: any keyword ──
                const findT = (keywords: string[]) => {
                    const k = Object.keys(row).find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                    return k ? String(row[k] || '').trim() : '';
                };
                const findV = (keywords: string[]) => {
                    const k = Object.keys(row).find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                    return k ? (parseFloat(String(row[k]).replace(/,/g, '')) || 0) : 0;
                };

                const name = findT([
                    'اسم', 'الاسم', 'اسماء', 'الاسماء', 'الأسماء', 'بيان', 'البيان',
                    'عميل', 'العميل', 'عملاء', 'العملاء',
                    'مورد', 'المورد', 'موردين', 'الموردين',
                    'شركة', 'الشركة', 'جهة', 'الجهة',
                    'name', 'client', 'supplier', 'customer', 'party'
                ]) || String(Object.values(row)[0] || '');
                if (!String(name).trim()) { failCount++; continue; }

                let openingBalance = 0;
                let balanceType: 'debit' | 'credit' = importType === 'suppliers' ? 'credit' : 'debit';

                // Case 1: Two explicit columns (debit / credit)
                const debitVal = findV(['مدين', 'عليه', 'علية', 'debit', ' dr']);
                const creditVal = findV(['دائن', 'له', 'لة', 'credit', ' cr']);

                // Case 2: One balance column + optional type column
                const genericBal = findV(['رصيد', 'balance', 'bal', 'افتتاحي', 'opening']);
                const typeStr = findT(['نوع', 'type', 'حالة', 'status']);

                if (debitVal > 0 || creditVal > 0) {
                    // Two-column format
                    if (debitVal >= creditVal) {
                        openingBalance = debitVal;
                        balanceType = 'debit';
                    } else {
                        openingBalance = creditVal;
                        balanceType = 'credit';
                    }
                } else if (genericBal !== 0) {
                    // One-column format
                    openingBalance = Math.abs(genericBal);
                    if (typeStr) {
                        const isCredit = ['دائن', 'له', 'لة', 'credit', 'cr'].some(kw => typeStr.toLowerCase().includes(kw));
                        balanceType = isCredit ? 'credit' : 'debit';
                    } else {
                        // Infer from sign or entity type
                        if (genericBal < 0) {
                            balanceType = importType === 'customers' ? 'credit' : 'debit';
                        }
                        // else keep default
                    }
                }

                payload = {
                    name: String(name).trim(),
                    phone: findT(['هاتف', 'جوال', 'موبايل', 'phone', 'mobile', 'tel']),
                    address: findT(['عنوان', 'address', 'مقره', 'location']),
                    openingBalance,
                    balanceType,
                    ...(importType === 'customers' ? { creditLimit: findV(['حد', 'limit', 'ائتمان']) } : {})
                };
            } else if (importType === 'items') {
                const findT = (keywords: string[]) => {
                    const k = Object.keys(row).find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                    return k ? String(row[k] || '').trim() : '';
                };
                const findV = (keywords: string[]) => {
                    const k = Object.keys(row).find(c => keywords.some(kw => c.toLowerCase().includes(kw.toLowerCase())));
                    return k ? (parseFloat(String(row[k]).replace(/,/g, '')) || 0) : 0;
                };
                const name = findT([
                    'اسم الصنف', 'اسماء الصنف', 'الصنف', 'الصنف / الخدمة',
                    'البضاعة', 'البضائع', 'السلعة', 'السلع',
                    'المادة', 'الخامة', 'المنتج', 'الخدمة',
                    'الوصف', 'البيان', 'البند', 'المقال',
                    'اسم', 'الاسم', 'اسماء', 'الاسماء',
                    'item', 'item name', 'product', 'product name',
                    'article', 'goods', 'material', 'service', 'description', 'name'
                ]) || String(Object.values(row)[0] || '');
                if (!String(name).trim()) { failCount++; continue; }

                const qty = findV(['كمية افتتاحية', 'كمية حالية', 'الكمية', 'كمية', 'stock', 'qty', 'quantity', 'opening qty']);
                const cost = findV(['تكلفة', 'cost', 'شراء']);

                payload = {
                    name: String(name).trim(),
                    category: findT(['تصنيف', 'قسم', 'category', 'group']),
                    unit: findT(['وحدة القياس', 'الوحدة', 'وحده', 'القياس', 'unit', 'measure', 'uom']),
                    costPrice: cost,
                    sellPrice: findV(['بيع', 'price', 'sale']),
                    initialQuantity: qty,          // الاسم اللي يتوقعه الـ API
                    warehouseId: defaultWarehouseId, // لازم عشان يسجل حركة المخزون
                    minLimit: findV(['حد أدنى', 'min', 'الطلب']),
                };
            }

            try {
                const res = await fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (res.ok) successCount++;
                else failCount++;
            } catch { failCount++; }
        }

        setImportLoading(false);
        alert(`${t('تم الانتهاء من الاستيراد.')}\n${t('تمت إضافة')}: ${successCount}\n${t('فشل')}: ${failCount}`);
        setShowImportModal(false);
        setImportData([]);
        setImportStep(1);
        setImportType(null);
    };
    const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToastMsg(msg); setToastType(type);
        setTimeout(() => setToastMsg(''), 3500);
    };

    /* ── PERMISSION HIERARCHY (filtered by user & subscription) ── */
    const isAdmin = session?.user?.role === 'admin';
    const isSuperAdmin = (session?.user as any)?.isSuperAdmin;

    // Get company features from subscription
    const enabledFeatures = (() => {
        const sub = (session?.user as any)?.subscription;
        if (!sub?.features) return {};
        try { return JSON.parse(sub.features); } catch { return {}; }
    })();

    // Helper to check if a page is accessible
    const hasPage = (featureKey: string, pageId: string): boolean => {
        if (isSuperAdmin) return true;

        const userRole = (session?.user as any)?.role;
        const userPerms = (session?.user as any)?.permissions || {};
        const isUserAdmin = userRole === 'admin';

        if (isUserAdmin) {
            if (featureKey === 'settings') return true;
            if (Object.keys(enabledFeatures).length > 0) {
                if (!(featureKey in enabledFeatures)) return false;
                const pagesInSub = enabledFeatures[featureKey];
                return pagesInSub.includes(pageId);
            }
            return true;
        }

        // 1. Check subscription (granular check)
        if (Object.keys(enabledFeatures).length > 0) {
            if (!(featureKey in enabledFeatures)) return false;
            const pagesInSub = enabledFeatures[featureKey];
            if (!pagesInSub.includes(pageId)) return false;
        } else if (featureKey !== 'dashboard' && featureKey !== 'settings') {
            // If no subscription features are defined, we might want to restrict or allow all.
            // Based on existing code (line 56), it returns true if empty.
        }

        // 2. Check user permissions
        // For 'custom' role, or any non-admin role that might have limited perms
        // If a page is in permissions, it must have view:true
        if (Object.keys(userPerms).length > 0) {
            const p = userPerms[pageId];
            if (p) return !!p.view;
            return false; // If perms exist but this page isn't in them, hide it
        }

        return true;
    };

    // Build the permission hierarchy based on user's actual permissions and subscription
    const permissionHierarchy = navSections
        .filter(sectionOrigin => {
            return sectionOrigin.links.some(link => hasPage(sectionOrigin.featureKey || '', link.id));
        })
        .map(sectionOrigin => {
            let section = { ...sectionOrigin };
            // Apply services terminology to the permission tree
            if (isServices) {
                if (section.featureKey === 'sales') {
                    section.title = t('فواتير الخدمات');
                    section.links = section.links?.map((l: any) => {
                        if (l.label === 'فواتير المبيعات') return { ...l, label: t('فواتير الخدمات') };
                        if (l.label === 'مرتجع مبيعات') return { ...l, label: t('إلغاء خدمات / مرتجع') };
                        return l;
                    });
                }
                if (section.featureKey === 'inventory') {
                    section.title = t('الخدمات');
                    section.links = [
                        { id: '/categories', href: '/categories', label: t('تصنيفات الخدمات') },
                        { id: '/items', href: '/items', label: t('قائمة الخدمات') },
                        { id: '/units', href: '/units', label: t('الوحدات') },
                        { id: '/warehouses', href: '/warehouses', label: t('الفروع / مواقع العمل') }
                    ];
                }
            }

            const filteredLinks = section.links?.filter((link: any) => hasPage(section.featureKey || '', link.id)) || [];
            return {
                title: section.title,
                featureKey: section.featureKey,
                links: filteredLinks.map((link: any) => ({ id: link.id, label: link.label }))
            };
        })
        .filter(section => section.links.length > 0); // Remove empty sections

    const handleRoleChange = (roleId: string) => {
        let perms: Record<string, { view: boolean; create: boolean; editDelete: boolean }> = {};

        // Build the perms based on the filtered permissionHierarchy
        permissionHierarchy.forEach(s => {
            s.links.forEach(l => {
                perms[l.id] = { view: false, create: false, editDelete: false };
            });
        });

        const grant = (pageIds: string[], actions = { view: true, create: true, editDelete: true }) => {
            pageIds.forEach(id => {
                if (perms[id]) perms[id] = { ...actions };
            });
        };

        if (roleId === 'admin') {
            permissionHierarchy.forEach(s => grant(s.links.map(l => l.id)));
        } else if (roleId === 'accountant') {
            grant(['/', '/accounts', '/opening-balances', '/journal-entries', '/cost-centers', '/closing-entries', '/treasuries', '/other-income', '/expenses', '/partners', '/partner-accounts', '/profit-distribution', '/capital']);
        } else if (roleId === 'sales') {
            grant(['/', '/sales', '/sale-returns', '/receipts', '/customers', '/settlements', '/installments', '/due-installments', '/overdue-installments'], { view: true, create: true, editDelete: false });
        } else if (roleId === 'procurement') {
            grant(['/', '/purchases', '/purchase-returns', '/purchase-payments', '/suppliers'], { view: true, create: true, editDelete: false });
        } else if (roleId === 'storekeeper') {
            grant(['/', '/units', '/items', '/warehouses', '/stocktakings', '/warehouse-transfers'], { view: true, create: true, editDelete: false });
        } else if (roleId === 'hr') {
            grant(['/', '/employees', '/payrolls', '/advances', '/deductions', '/departments', 'reports-hr']);
        }

        setNewUserForm(prev => ({ ...prev, roleId, customPermissions: perms }));
    };

    /* ── Fetch ── */
    const fetchData = async () => {
        try {
            const res = await fetch('/api/settings', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setCompany(data.company);
                setUsers(data.users || []);
                if (data.company) {
                    const cForm = { name: data.company.name || '', nameEn: data.company.nameEn || '', phone: data.company.phone || '', email: data.company.email || '', addressRegion: data.company.addressRegion || '', addressCity: data.company.addressCity || '', addressDistrict: data.company.addressDistrict || '', addressStreet: data.company.addressStreet || '', taxNumber: data.company.taxNumber || '', commercialRegister: data.company.commercialRegister || '', website: data.company.website || '', logo: data.company.logo || '' };

                    const standardCurrencies = ['EGP', 'SAR', 'AED', 'KWD', 'USD', 'QAR', 'BHD', 'OMR', 'JOD', 'LYD', 'IQD', 'TRY', 'EUR', 'GBP', 'LBP', 'SYP', 'YER', 'TND', 'DZD', 'MAD', 'SDG'];
                    const isCustom = data.company.currency && !standardCurrencies.includes(data.company.currency);

                    const gForm = {
                        currency: isCustom ? 'OTHER' : (data.company.currency || 'EGP'),
                        timezone: data.company.timezone || 'Africa/Cairo',
                        calendarType: data.company.calendarType || 'Gregorian',
                        dateFormat: data.company.dateFormat || 'DD/MM/YYYY',
                        customCurrency: data.company.currency || '',
                        countryCode: data.company.countryCode || 'EG'
                    };
                    setCompanyForm(cForm);
                    setSavedCompanyForm(cForm);
                    setGeneralForm(gForm);
                    setSavedGeneral(gForm);

                    // Tax settings
                    if (data.company.taxSettings) {
                        try {
                            const tax = typeof data.company.taxSettings === 'string' ? JSON.parse(data.company.taxSettings) : data.company.taxSettings;
                            const tForm = {
                                enabled: tax.enabled ?? false,
                                type: tax.type || 'VAT',
                                rate: tax.rate ?? 14,
                                isInclusive: tax.isInclusive ?? false,
                            };
                            setTaxForm(tForm);
                            setSavedTaxForm(tForm);
                        } catch (e) { }
                    }
                }
                if (data.notificationSettings) setNotificationsForm((p: any) => ({ ...p, ...data.notificationSettings }));
            }
        } catch (error) {
            console.error('Fetch error:', error);
            // Only show error toast if it's not a background refresh
            if (loading) showToast(t('حدث خطأ في تحميل البيانات'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranches = async () => {
        try {
            const res = await fetch('/api/branches');
            if (res.ok) setBranches(await res.json());
        } catch { }
    };

    useEffect(() => {
        if (status === 'loading') return;
        fetchData();
        fetchBranches();
    }, [status, session?.user?.id]);

    const handleCancel = () => {
        setIsEditMode(false);
        // Instant synchronous rollback to last known saved state
        setCompanyForm(savedCompanyForm);
        setGeneralForm(savedGeneral);
        setTaxForm(savedTaxForm);
        fetchData(); // Sync with server backup
    };

    const saveSettings = async (action: string, data: any) => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, data }) });
            if (res.ok) {
                showToast(t('تم الحفظ بنجاح ✓'));
                await fetchData(); 
                setIsEditMode(false);
                // Force session update with latest currency metadata
                if (update) {
                    const finalCurrency = action === 'update_general' 
                        ? (data.currency === 'OTHER' ? data.customCurrency : data.currency)
                        : undefined;
                    update({
                        user: {
                            currency: finalCurrency,
                            countryCode: action === 'update_general' ? data.countryCode : undefined
                        }
                    });
                }
            }
            else { const e = await res.json(); showToast(e.error || t('فشل الحفظ'), 'error'); }
        } finally { setIsSaving(false); }
    };


    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault(); setIsSaving(true);
        try {
            const endpoint = '/api/settings';
            const method = editingUserId ? 'PUT' : 'POST';
            const action = editingUserId ? 'update_user_full' : 'create_user';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, data: { ...newUserForm, userId: editingUserId } })
            });

            if (res.ok) {
                showToast(editingUserId ? t('تم تحديث بيانات المستخدم ✓') : t('تم إضافة المستخدم ✓'));
                fetchData();
                setEditingUserId(null);
                setNewUserForm({
                    name: '', username: '', email: '', phone: '', password: '', roleId: 'admin', status: 'active',
                    avatar: 'm1', branchId: '', allowedBranches: [],
                    customPermissions: {}
                });
            }
            else { const e = await res.json(); showToast(e.error || t('فشل'), 'error'); }
        } finally { setIsSaving(false); }
    };

    const editUser = (u: any) => {
        setEditingUserId(u.id);

        let perms = {};
        if (u.customRole?.permissions) {
            try { perms = JSON.parse(u.customRole.permissions); } catch (e) { perms = {}; }
        }

        setNewUserForm({
            name: u.name || '',
            username: u.username || '',
            email: u.email || '',
            phone: u.phone || '',
            password: '', // Don't show password
            roleId: u.role || 'user',
            status: u.status || 'active',
            avatar: u.avatar || 'm1',
            branchId: u.branchId || '',
            allowedBranches: (() => { try { return u.allowedBranches ? JSON.parse(u.allowedBranches) : []; } catch { return []; } })(),
            customPermissions: perms
        });

        // Expand all modules to show current permissions
        const exp: any = {};
        permissionHierarchy.forEach(s => { exp[s.title] = true; });
        setExpandedModules(exp);

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteUser = async (userId: string) => {
        setIsDeleting(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_user', data: { userId } })
            });
            if (res.ok) { showToast(t('تم حذف المستخدم بنجاح')); fetchData(); }
            else { const e = await res.json(); showToast(e.error || t('فشل الحذف'), 'error'); }
        } catch (err) {
            showToast(t('خطأ في الاتصال بالسيرفر'), 'error');
        } finally {
            setIsDeleting(false);
            setConfirmDelete(null);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: string) => {
        setIsSaving(true);
        try {
            const nextStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_user_status', data: { userId, status: nextStatus } })
            });
            if (res.ok) { showToast(t('تم تحديث حالة المستخدم ✓')); fetchData(); }
            else { const e = await res.json(); showToast(e.error || t('فشل التحديث'), 'error'); }
        } finally { setIsSaving(false); }
    };

    if (loading) return (
        <DashboardLayout>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '12px', color: '#64748b' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} /> {t('جاري تحميل الإعدادات...')}
            </div>
                <style jsx>{`
                    @media (max-width: 1023px) {
                        .settings-sidebar { position: relative !important; top: 0 !important; }
                    }
                `}</style>
                <style>{`
                    @keyframes spin{to{transform:rotate(360deg)}}
                input:-webkit-autofill,
                input:-webkit-autofill:hover,
                input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0px 1000px #0f172a inset !important;
                    -webkit-text-fill-color: #e2e8f0 !important;
                    caret-color: #e2e8f0;
                    border-color: rgba(255,255,255,0.08) !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(37, 106, 244,0.3); borderRadius: 10px; }
            `}</style>
        </DashboardLayout>
    );

    // Filter tabs based on permissionHierarchy
    const filteredTabs = [
        { id: 'company', icon: Building2, label: t('بيانات الشركة'), featureKey: 'settings', pageId: '/settings/company' },
        { id: 'general', icon: Globe, label: t('الإعدادات العامة'), featureKey: 'settings', pageId: '/settings/general' },
        { id: 'branches', icon: Store, label: t('الفروع'), featureKey: 'settings', pageId: '/settings/branches' },
        { id: 'notifications', icon: Bell, label: t('الإشعارات'), featureKey: 'settings', pageId: '/settings/notifications' },
        { id: 'tax', icon: Percent, label: t('الضريبة'), featureKey: 'settings', pageId: '/settings/tax' },
        { id: 'users', icon: Shield, label: t('المستخدمين والصلاحيات'), featureKey: 'settings', pageId: '/settings/users' },
        { id: 'subscription', icon: CreditCard, label: t('الاشتراك والخطة'), featureKey: 'settings', pageId: '/settings/subscription' },
        { id: 'database', icon: Database, label: t('قواعد البيانات'), featureKey: 'settings', pageId: '/settings/database' },
    ].filter(tab => hasPage(tab.featureKey, tab.pageId));


    /* ══════════════════════════════════════════
       RENDER
    ══════════════════════════════════════════ */
    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={PAGE_BASE}>
                <PageHeader
                    title={t("الإعدادات الشاملة للمؤسسة")}
                    subtitle={t("إدارة بيانات المنشأة، المستخدمين ونظام الصلاحيات العام وفترات العمل المالية")}
                    icon={SettingsIcon}
                />

                {/* Toast */}
                {toastMsg && (
                    <div style={{ position: 'fixed', bottom: '24px', insetInlineStart: '24px', background: toastType === 'success' ? '#10b981' : '#ef4444', color: '#fff', padding: '12px 24px', borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 9999, fontSize: '14px', fontWeight: 600 }}>
                        {toastType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {toastMsg}
                    </div>
                )}

                <div className="mobile-column" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    {/* ── Sidebar ── */}
                    <div className="settings-sidebar mobile-full" style={{
                        padding: '8px', width: '280px', flexShrink: 0,
                        background: C.card, borderRadius: '20px', border: `1px solid ${C.border}`,
                        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)', position: 'sticky', top: '84px',
                        zIndex: 10
                    }}>
                        <div className="settings-tabs">
                        {filteredTabs.map(tab => {
                            const Icon = tab.icon;
                            const active = activeTab === tab.id;
                            return (
                                    <button className="settings-tab-btn" key={tab.id} onClick={() => {
                                        setActiveTab(tab.id);
                                        handleCancel();
                                    }}
                                        style={{
                                            width: '100%', textAlign: 'start', display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px 16px', border: 'none', borderRadius: '12px', marginBottom: '4px',
                                            background: active ? 'rgba(37,106,244,0.1)' : 'transparent',
                                            color: active ? C.primary : C.textSecondary,
                                            fontWeight: active ? 900 : 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                                            fontFamily: CAIRO
                                        }}
                                    onMouseEnter={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                            e.currentTarget.style.color = C.textPrimary;
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!active) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = C.textSecondary;
                                        }
                                    }}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: active ? `${C.primary}20` : 'rgba(255,255,255,0.02)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: active ? C.primary : C.textMuted, transition: 'all 0.2s'
                                    }}>
                                        <Icon size={16} />
                                    </div>
                                        <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
                                        {active && <div style={{ marginInlineStart: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: C.primary }} />}
                                </button>
                            );
                        })}
                        </div>
                    </div>

                    {/* ── Content ── */}
                    <div style={{ flexGrow: 1, minWidth: 0 }}>

                        {activeTab === 'company' && (
                            <CompanyTab
                                countryCode={generalForm.countryCode}
                                isEditMode={isEditMode}
                                setIsEditMode={setIsEditMode}
                                companyForm={companyForm}
                                setCompanyForm={setCompanyForm}
                                isSaving={isSaving}
                                handleCancel={handleCancel}
                                saveSettings={saveSettings}
                                showToast={showToast}
                            />
                        )}

                        {activeTab === 'general' && (
                            <GeneralTab
                                isEditMode={isEditMode}
                                setIsEditMode={setIsEditMode}
                                generalForm={generalForm}
                                setGeneralForm={setGeneralForm}
                                savedGeneral={savedGeneral}
                                isSaving={isSaving}
                                handleCancel={handleCancel}
                                saveSettings={saveSettings}
                                currencySearch={currencySearch}
                                setCurrencySearch={setCurrencySearch}
                            />
                        )}

                        {activeTab === 'notifications' && (
                            <NotificationsTab
                                notificationsForm={notificationsForm}
                                setNotificationsForm={setNotificationsForm}
                                isSaving={isSaving}
                                saveSettings={saveSettings}
                                isEditMode={isEditMode}
                                setIsEditMode={setIsEditMode}
                                fetchData={fetchData}
                                hasInstallmentsAccess={hasPage('installments', '/installments')}
                                isServices={isServices}
                            />
                        )}

                        {activeTab === 'tax' && (
                            <TaxTab
                                isEditMode={isEditMode}
                                setIsEditMode={setIsEditMode}
                                taxForm={taxForm}
                                setTaxForm={setTaxForm}
                                savedTaxForm={savedTaxForm}
                                isSaving={isSaving}
                                handleCancel={handleCancel}
                                saveSettings={saveSettings}
                            />
                        )}

                        {activeTab === 'users' && (
                            <UsersTab
                                users={users}
                                branches={branches}
                                isSaving={isSaving}
                                saveSettings={saveSettings}
                                showToast={showToast}
                                fetchData={fetchData}
                                session={session}
                                newUserForm={newUserForm}
                                setNewUserForm={setNewUserForm}
                                editingUserId={editingUserId}
                                setEditingUserId={setEditingUserId}
                                userSearchTerm={userSearchTerm}
                                setUserSearchTerm={setUserSearchTerm}
                                expandedModules={expandedModules}
                                setExpandedModules={setExpandedModules}
                                permissionHierarchy={permissionHierarchy}
                                handleRoleChange={handleRoleChange}
                                handleCreateUser={handleCreateUser}
                                editUser={editUser}
                                deleteUser={deleteUser}
                                toggleUserStatus={toggleUserStatus}
                                setConfirmDelete={setConfirmDelete}
                                getRoleDefaults={getRoleDefaults}
                            />
                        )}

                        {activeTab === 'subscription' && (
                            <SubscriptionTab
                                company={company}
                                session={session}
                            />
                        )}

                        {activeTab === 'branches' && (
                            <BranchesTab
                                branches={branches}
                                branchForm={branchForm}
                                setBranchForm={setBranchForm}
                                editingBranchId={editingBranchId}
                                setEditingBranchId={setEditingBranchId}
                                showBranchModal={showBranchModal}
                                setShowBranchModal={setShowBranchModal}
                                isSavingBranch={isSavingBranch}
                                setIsSavingBranch={setIsSavingBranch}
                                fetchBranches={fetchBranches}
                                showToast={showToast}
                                session={session}
                                setConfirmDelete={setConfirmDelete}
                            />
                        )}

                        {activeTab === 'database' && (
                            <DatabaseTab
                                company={company}
                                showToast={showToast}
                                showImportModal={showImportModal}
                                setShowImportModal={setShowImportModal}
                                importType={importType}
                                setImportType={setImportType}
                                importStep={importStep}
                                setImportStep={setImportStep}
                                importData={importData}
                                setImportData={setImportData}
                                importLoading={importLoading}
                                currentImportIndex={currentImportIndex}
                                warehouses={warehouses}
                                selectedWarehouseId={selectedWarehouseId}
                                setSelectedWarehouseId={setSelectedWarehouseId}
                                handleImportFileChange={handleImportFileChange}
                                processImport={processImport}
                            />
                        )}



                    </div>
                </div>

                <style jsx global>{`
                    @media (max-width: 1023px) {
                        .settings-sidebar {
                            position: static !important;
                            top: auto !important;
                            width: 100% !important;
                            padding: 6px !important;
                            border-radius: 14px !important;
                        }
                        .settings-tabs {
                            display: flex !important;
                            gap: 8px !important;
                            overflow-x: auto !important;
                            overflow-y: hidden !important;
                            padding: 2px;
                            -webkit-overflow-scrolling: touch;
                            scrollbar-width: none;
                        }
                        .settings-tabs::-webkit-scrollbar {
                            display: none;
                        }
                        .settings-tab-btn {
                            flex: 0 0 auto !important;
                            width: auto !important;
                            min-width: 170px;
                            margin-bottom: 0 !important;
                            padding: 10px 12px !important;
                            border-radius: 10px !important;
                        }
                    }
                `}</style>

                <AppModal
                    show={!!confirmDelete}
                    onClose={() => !isDeleting && setConfirmDelete(null)}
                    isSubmitting={isDeleting}
                    isDelete={true}
                    title={
                        confirmDelete?.type === 'user' ? t('حذف المستخدم') :
                            confirmDelete?.type === 'branch' ? t('حذف الفرع') :
                                confirmDelete?.type === 'closeYear' ? t('إغلاق السنة المالية') : t('تأكيد')
                    }
                    description={
                        confirmDelete?.type === 'user'
                            ? t('هل أنت متأكد من حذف المستخدم') + ` "${confirmDelete?.name}"؟ ` + t('لا يمكن التراجع عن هذا الإجراء.')
                            : confirmDelete?.type === 'branch'
                                ? t('هل أنت متأكد من حذف الفرع') + ` "${confirmDelete?.name}"؟ ` + t('يجب أن يكون الفرع فارغاً من المخازن والموظفين والفواتير.')
                                : confirmDelete?.type === 'closeYear'
                                    ? t('هل أنت متأكد من إغلاق') + ` "${confirmDelete?.name}"؟ ` + t('سيتم تجميد كافة العمليات في هذه الفترة وفتح سنة جديدة تلقائياً.')
                                    : t('هل أنت متأكد؟')
                    }
                    confirmText={
                        confirmDelete?.type === 'closeYear' ? t('نعم، أغلق السنة') : t('نعم، احذف الآن')
                    }
                    onConfirm={async () => {
                        if (confirmDelete?.type === 'user') {
                            await deleteUser(confirmDelete.id);
                        } else if (confirmDelete?.type === 'branch') {
                            setIsDeleting(true);
                            try {
                                const res = await fetch(`/api/branches?id=${confirmDelete.id}`, { method: 'DELETE' });
                                if (res.ok) { showToast(t('تم حذف الفرع ✓')); fetchBranches(); }
                                else { const d = await res.json(); showToast(d.error || t('فشل الحذف'), 'error'); }
                            } finally { setIsDeleting(true); setConfirmDelete(null); }
                        } else if (confirmDelete?.type === 'closeYear') {
                            setIsDeleting(true);
                            const newEnd = (document.getElementById('closeEnd') as HTMLInputElement)?.value;
                            await saveSettings('close_financial_year', {
                                id: confirmDelete.id,
                                newEndDate: newEnd
                            });
                            setIsDeleting(false);
                            setConfirmDelete(null);
                        }
                    }}
                />
            </div>
        </DashboardLayout>
    );
}
