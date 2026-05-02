'use client';
import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, PAGE_BASE, OUTFIT } from '@/constants/theme';
import { Code2, Key, Webhook, Copy, Check, Info } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

export default function ApiKeysPage() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'ar';
    const [copied, setCopied] = useState('');

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(''), 2000);
    };

    const endpointCode = `
// إنشاء طلب جديد عبر تطبيقات التوصيل (جاهز، هنقرستيشن، طلبات)
POST /api/restaurant/orders
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>

{
  "type": "delivery",
  "source": "api",
  "externalRef": "JAHEZ-98212",
  "deliveryName": "محمد أحمد",
  "deliveryPhone": "0501234567",
  "notes": "بدون طماطم",
  "lines": [
    {
      "itemId": "cm0xyz...",
      "itemName": "وجبة شاورما عربي",
      "quantity": 2,
      "unitPrice": 45,
      "modifiers": {
        "بدون بصل": [{ "name": "نعم", "price": 0 }]
      }
    }
  ]
}
`.trim();

    return (
        <DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ ...PAGE_BASE, padding: '0 24px 40px', fontFamily: CAIRO }}>
                <PageHeader
                    title={t('الربط البرمجي (API & Webhooks)')}
                    subtitle={t('إدارة مفاتيح الربط مع تطبيقات التوصيل والأنظمة الخارجية')}
                    icon={Code2}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    
                    {/* API Keys Section */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '12px', background: `${C.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary }}>
                                <Key size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary }}>مفاتيح الربط (API Keys)</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>استخدم هذا المفتاح لمصادقة الطلبات القادمة من تطبيقات التوصيل.</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: C.bg, padding: '12px 16px', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                            <div style={{ flex: 1, fontFamily: OUTFIT, fontSize: '14px', color: C.textSecondary, letterSpacing: '2px' }}>
                                sk_test_8f92j3n8df2j4n8sdf823j4ndf
                            </div>
                            <button onClick={() => handleCopy('sk_test_8f92j3n8df2j4n8sdf823j4ndf', 'key')} style={{ height: '36px', padding: '0 16px', borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: CAIRO, fontSize: '13px', fontWeight: 600 }}>
                                {copied === 'key' ? <><Check size={14} /> تم النسخ</> : <><Copy size={14} /> نسخ المفتاح</>}
                            </button>
                        </div>
                    </div>

                    {/* Documentation Section */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '12px', background: `#10b98115`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                <Code2 size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary }}>دليل التكامل (API Documentation)</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>طريقة إرسال الطلبات إلى النظام مباشرة</p>
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <button onClick={() => handleCopy(endpointCode, 'code')} style={{ position: 'absolute', top: '12px', insetInlineEnd: '12px', width: 32, height: 32, borderRadius: '8px', border: `1px solid #475569`, background: '#1e293b', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {copied === 'code' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            </button>
                            <pre style={{ margin: 0, background: '#0f172a', padding: '20px', borderRadius: '12px', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '13px', overflowX: 'auto', direction: 'ltr', textAlign: 'left' }}>
                                <code>{endpointCode}</code>
                            </pre>
                        </div>
                    </div>

                    {/* Webhooks Section */}
                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '12px', background: `#8b5cf615`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                                <Webhook size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.textPrimary }}>الويب هوك (Webhooks)</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>إرسال إشعارات للأنظمة الأخرى عند تغير حالة الطلب (مثال: الطلب جاهز)</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', background: C.bg, padding: '16px', borderRadius: '12px', border: `1px solid ${C.border}`, alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '6px' }}>
                                <label style={{ fontSize: '12px', color: C.textSecondary, fontWeight: 600 }}>رابط الاستقبال (URL Endpoint)</label>
                                <input type="url" placeholder="https://your-domain.com/webhook" style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: `1px solid ${C.border}`, background: C.card, outline: 'none', color: C.textPrimary, fontFamily: OUTFIT, fontSize: '14px', direction: 'ltr' }} />
                            </div>
                            <button style={{ height: '40px', padding: '0 24px', borderRadius: '8px', border: 'none', background: C.primary, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: CAIRO, marginTop: '22px' }}>
                                حفظ
                            </button>
                        </div>
                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: C.textMuted, fontSize: '12px' }}>
                            <Info size={14} /> سيتم إرسال (POST Request) كلما تغيرت حالة طلب في النظام.
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}
