'use client';

import { useTranslation } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { Key, Plus, Copy, Check, Trash2, Eye, EyeOff, Shield, Activity, Code, ExternalLink, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { TabHeader, Toggle } from './shared';

interface ApiKeyData {
    id: string;
    name: string;
    key: string;
    isActive: boolean;
    permissions: string;
    lastUsedAt: string | null;
    usageCount: number;
    createdAt: string;
}

export default function ApiTab() {
    const { t } = useTranslation();
    const [keys, setKeys] = useState<ApiKeyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
    const [activeDocTab, setActiveDocTab] = useState<'create-order' | 'get-menu'>('create-order');

    const fetchKeys = async () => {
        try {
            const res = await fetch('/api/api-keys');
            if (res.ok) setKeys(await res.json());
        } catch { }
        setLoading(false);
    };

    useEffect(() => { fetchKeys(); }, []);

    const createKey = async () => {
        if (!newKeyName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/api-keys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newKeyName, permissions: 'orders,menu' }),
            });
            if (res.ok) {
                const created = await res.json();
                setKeys(prev => [created, ...prev]);
                setNewKeyName('');
                setShowCreateForm(false);
                // Show key immediately
                setVisibleKeys(prev => ({ ...prev, [created.id]: true }));
            }
        } catch { }
        setCreating(false);
    };

    const toggleKey = async (id: string, isActive: boolean) => {
        try {
            await fetch('/api/api-keys', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive }),
            });
            setKeys(prev => prev.map(k => k.id === id ? { ...k, isActive } : k));
        } catch { }
    };

    const deleteKey = async (id: string) => {
        try {
            await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' });
            setKeys(prev => prev.filter(k => k.id !== id));
        } catch { }
    };

    const copyToClipboard = (key: string, id: string) => {
        navigator.clipboard.writeText(key);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const maskKey = (key: string) => {
        if (key.length <= 20) return key;
        return key.slice(0, 14) + '••••••••••••••••••••' + key.slice(-6);
    };

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("ربط API خارجي")}
                sub={t("إنشاء مفاتيح API لربط الموقع الإلكتروني أو التطبيقات الخارجية")}
                hideEditBtn
                t={t}
            >
                <button
                    onClick={() => setShowCreateForm(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '0 18px', height: '36px', borderRadius: '10px',
                        background: C.primary, color: '#fff', border: 'none',
                        fontSize: '12.5px', fontWeight: 700, cursor: 'pointer',
                        fontFamily: CAIRO, transition: 'all 0.2s',
                        boxShadow: `0 4px 12px ${C.primary}40`
                    }}
                >
                    <Plus size={14} /> {t('إنشاء مفتاح جديد')}
                </button>
            </TabHeader>

            {/* ── Create Form ── */}
            {showCreateForm && (
                <div style={{
                    background: `${C.primary}08`, border: `1px solid ${C.primary}30`,
                    borderRadius: '16px', padding: '20px', marginBottom: '24px',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, marginBottom: '12px', fontFamily: CAIRO }}>
                        <Key size={14} style={{ marginInlineEnd: '6px', color: C.primary }} />
                        {t('إنشاء مفتاح API جديد')}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                            placeholder={t('اسم المفتاح (مثال: موقع المطعم)')}
                            value={newKeyName}
                            onChange={e => setNewKeyName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createKey()}
                            style={{
                                flex: 1, height: '42px', borderRadius: '10px',
                                border: `1px solid ${C.border}`, background: C.inputBg,
                                color: C.textPrimary, padding: '0 16px', fontSize: '13px',
                                fontWeight: 600, outline: 'none', fontFamily: CAIRO
                            }}
                        />
                        <button
                            onClick={createKey}
                            disabled={creating || !newKeyName.trim()}
                            style={{
                                height: '42px', padding: '0 20px', borderRadius: '10px',
                                background: C.primary, color: '#fff', border: 'none',
                                fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                fontFamily: CAIRO, opacity: creating || !newKeyName.trim() ? 0.5 : 1,
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}
                        >
                            {creating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                            {t('إنشاء')}
                        </button>
                        <button
                            onClick={() => { setShowCreateForm(false); setNewKeyName(''); }}
                            style={{
                                height: '42px', padding: '0 16px', borderRadius: '10px',
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textSecondary, fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', fontFamily: CAIRO
                            }}
                        >
                            {t('إلغاء')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Keys List ── */}
            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center', color: C.textMuted }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : keys.length === 0 ? (
                <div style={{
                    padding: '48px', textAlign: 'center', borderRadius: '20px',
                    background: 'rgba(255,255,255,0.02)', border: `1px dashed ${C.border}`
                }}>
                    <Key size={40} style={{ color: C.textMuted, opacity: 0.3, marginBottom: '16px' }} />
                    <p style={{ color: C.textMuted, fontSize: '14px', fontWeight: 600, margin: '0 0 4px', fontFamily: CAIRO }}>
                        {t('لم يتم إنشاء أي مفتاح API بعد')}
                    </p>
                    <p style={{ color: C.textMuted, fontSize: '12px', margin: 0, fontFamily: CAIRO, opacity: 0.7 }}>
                        {t('قم بإنشاء مفتاح لبدء استقبال الطلبات من الموقع الخارجي')}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                    {keys.map(k => (
                        <div key={k.id} style={{
                            background: 'rgba(255,255,255,0.02)',
                            border: `1px solid ${k.isActive ? C.border : 'rgba(239,68,68,0.2)'}`,
                            borderRadius: '16px', padding: '18px 20px',
                            opacity: k.isActive ? 1 : 0.6,
                            transition: 'all 0.2s'
                        }}>
                            {/* Top Row */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '10px',
                                        background: k.isActive ? `${C.primary}15` : 'rgba(239,68,68,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: k.isActive ? C.primary : '#ef4444'
                                    }}>
                                        <Key size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: C.textPrimary, fontFamily: CAIRO }}>{k.name}</div>
                                        <div style={{ fontSize: '11px', color: C.textMuted, fontFamily: OUTFIT }}>
                                            {t('تم الإنشاء')}: {new Date(k.createdAt).toLocaleDateString('ar-EG')}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Toggle checked={k.isActive} onChange={v => toggleKey(k.id, v)} />
                                    <button
                                        onClick={() => deleteKey(k.id)}
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '8px',
                                            border: `1px solid ${C.border}`, background: 'transparent',
                                            color: C.textMuted, cursor: 'pointer', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textMuted; e.currentTarget.style.borderColor = C.border; }}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Key Display */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                                padding: '10px 14px', marginBottom: '10px'
                            }}>
                                <code style={{
                                    flex: 1, fontSize: '12px', fontFamily: OUTFIT,
                                    color: C.textSecondary, letterSpacing: '0.5px',
                                    direction: 'ltr', textAlign: 'start',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}>
                                    {visibleKeys[k.id] ? k.key : maskKey(k.key)}
                                </code>
                                <button
                                    onClick={() => setVisibleKeys(p => ({ ...p, [k.id]: !p[k.id] }))}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '6px',
                                        border: 'none', background: 'rgba(255,255,255,0.05)',
                                        color: C.textMuted, cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {visibleKeys[k.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(k.key, k.id)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '6px',
                                        border: 'none',
                                        background: copiedId === k.id ? '#10b98120' : 'rgba(255,255,255,0.05)',
                                        color: copiedId === k.id ? '#10b981' : C.textMuted,
                                        cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {copiedId === k.id ? <Check size={13} /> : <Copy size={13} />}
                                </button>
                            </div>

                            {/* Stats */}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: C.textMuted, fontFamily: CAIRO }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={12} />
                                    {t('الاستخدام')}: <strong style={{ fontFamily: OUTFIT, color: C.textSecondary }}>{k.usageCount}</strong> {t('طلب')}
                                </span>
                                {k.lastUsedAt && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <RefreshCw size={12} />
                                        {t('آخر استخدام')}: <strong style={{ fontFamily: OUTFIT, color: C.textSecondary }}>{new Date(k.lastUsedAt).toLocaleDateString('ar-EG')}</strong>
                                    </span>
                                )}
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Shield size={12} />
                                    {k.permissions.split(',').map(p => p.trim() === 'orders' ? t('طلبات') : p.trim() === 'menu' ? t('منيو') : p.trim()).join(' · ')}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ══════════════════════════════════ */}
            {/* ══ API Documentation Section ══ */}
            {/* ══════════════════════════════════ */}
            <div style={{ marginTop: '28px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <Code size={14} /> {t('توثيق API')}
                </div>

                <div style={{
                    background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`,
                    borderRadius: '16px', overflow: 'hidden'
                }}>
                    {/* Doc Tabs */}
                    <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
                        {([
                            { key: 'create-order' as const, label: t('إرسال طلب جديد'), method: 'POST' },
                            { key: 'get-menu' as const, label: t('جلب المنيو'), method: 'GET' },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveDocTab(tab.key)}
                                style={{
                                    flex: 1, padding: '12px 16px', border: 'none',
                                    background: activeDocTab === tab.key ? `${C.primary}10` : 'transparent',
                                    color: activeDocTab === tab.key ? C.primary : C.textSecondary,
                                    fontWeight: activeDocTab === tab.key ? 800 : 600,
                                    fontSize: '12px', cursor: 'pointer', fontFamily: CAIRO,
                                    borderBottom: activeDocTab === tab.key ? `2px solid ${C.primary}` : '2px solid transparent',
                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', gap: '6px'
                                }}
                            >
                                <span style={{
                                    fontSize: '10px', fontWeight: 800, fontFamily: OUTFIT,
                                    background: tab.method === 'POST' ? '#10b98120' : '#256af420',
                                    color: tab.method === 'POST' ? '#10b981' : '#256af4',
                                    padding: '2px 6px', borderRadius: '4px'
                                }}>{tab.method}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Doc Content */}
                    <div style={{ padding: '20px' }}>
                        {/* Endpoint */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>
                                {t('الرابط (Endpoint)')}
                            </div>
                            <div style={{
                                background: 'rgba(0,0,0,0.3)', borderRadius: '10px',
                                padding: '12px 16px', direction: 'ltr', display: 'flex',
                                alignItems: 'center', gap: '8px'
                            }}>
                                <span style={{
                                    fontSize: '10px', fontWeight: 800, fontFamily: OUTFIT,
                                    background: activeDocTab === 'create-order' ? '#10b98120' : '#256af420',
                                    color: activeDocTab === 'create-order' ? '#10b981' : '#256af4',
                                    padding: '2px 8px', borderRadius: '4px'
                                }}>
                                    {activeDocTab === 'create-order' ? 'POST' : 'GET'}
                                </span>
                                <code style={{ fontSize: '12px', color: C.textPrimary, fontFamily: OUTFIT }}>
                                    {baseUrl}/api/external/orders
                                </code>
                            </div>
                        </div>

                        {/* Headers */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>
                                {t('الترويسات (Headers)')}
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 16px', direction: 'ltr' }}>
                                <pre style={{ margin: 0, fontSize: '12px', color: '#a78bfa', fontFamily: OUTFIT, whiteSpace: 'pre-wrap' }}>{`{
  "Content-Type": "application/json",
  "x-api-key": "qaid_live_your_key_here"
}`}</pre>
                            </div>
                        </div>

                        {/* Body Example */}
                        {activeDocTab === 'create-order' && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>
                                    {t('جسم الطلب (Body)')}
                                </div>
                                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 16px', direction: 'ltr' }}>
                                    <pre style={{ margin: 0, fontSize: '11.5px', color: '#34d399', fontFamily: OUTFIT, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{`{
  "type": "delivery",
  "customerName": "أحمد محمد",
  "customerPhone": "0512345678",
  "deliveryAddress": "حي النزهة، شارع الملك فهد",
  "notes": "بدون بصل",
  "paymentMethod": "cash",
  "lines": [
    {
      "itemId": "item_id_here",
      "quantity": 2,
      "notes": "إضافة جبنة"
    },
    {
      "itemName": "بيتزا مارجريتا",
      "unitPrice": 85.00,
      "quantity": 1
    }
  ]
}`}</pre>
                                </div>
                            </div>
                        )}

                        {/* Response */}
                        <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: C.textMuted, marginBottom: '6px', fontFamily: CAIRO }}>
                                {t('الاستجابة (Response)')}
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', padding: '12px 16px', direction: 'ltr' }}>
                                {activeDocTab === 'create-order' ? (
                                    <pre style={{ margin: 0, fontSize: '11.5px', color: '#60a5fa', fontFamily: OUTFIT, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{`{
  "success": true,
  "orderId": "clx...",
  "orderNumber": 42,
  "total": 255.00,
  "status": "pending",
  "message": "تم استقبال الطلب بنجاح"
}`}</pre>
                                ) : (
                                    <pre style={{ margin: 0, fontSize: '11.5px', color: '#60a5fa', fontFamily: OUTFIT, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{`{
  "items": [
    {
      "id": "clx...",
      "name": "بيتزا مارجريتا",
      "description": "بيتزا إيطالية بصوص الطماطم وجبنة الموتزاريلا",
      "sellPrice": 85.00,
      "category": { "id": "...", "name": "بيتزا" },
      "imageUrl": "/uploads/pizza.jpg"
    }
  ]
}`}</pre>
                                )}
                            </div>
                        </div>

                        {/* Warning */}
                        <div style={{
                            marginTop: '16px', padding: '12px 16px', borderRadius: '12px',
                            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                            display: 'flex', alignItems: 'flex-start', gap: '10px'
                        }}>
                            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                            <div style={{ fontSize: '11.5px', color: '#f59e0b', fontFamily: CAIRO, lineHeight: 1.6 }}>
                                <strong>{t('تنبيه أمني:')}</strong> {t('لا تشارك مفتاح الـ API في الكود المصدري العام. استخدمه فقط من الخادم (Server-side) ولا تضعه في كود الـ JavaScript الظاهر للعميل.')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
