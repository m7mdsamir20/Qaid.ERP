'use client';
 
import { useTranslation } from '@/lib/i18n';
import { C, CAIRO, OUTFIT } from '@/constants/theme';
import { CreditCard, AlertCircle, Calendar, Users, Clock, ArrowUpRight, Phone } from 'lucide-react';
import { TabHeader } from './shared';

interface SubscriptionTabProps {
    company: any;
    session: any;
}

export default function SubscriptionTab({ company, session }: SubscriptionTabProps) {
    const { t } = useTranslation();

    return (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '32px', boxShadow: '0 10px 40px -15px rgba(0,0,0,0.5)', minHeight: '600px' }}>
            <TabHeader
                title={t("الاشتراك والخطة")}
                sub={t("باقتك الحالية، تاريخ الانتهاء، والمميزات المفعّلة")}
                hideEditBtn={true}
                t={t}
            />

            {(() => {
                const sub = (session?.user as any)?.subscription;
                if (!sub) return (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.1)' }}>
                        <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
                        <h3 style={{ color: '#ef4444', margin: '0 0 8px', fontSize: '13px' }}>{t('لا توجد بيانات اشتراك')}</h3>
                        <p style={{ color: '#64748b', margin: 0, fontSize: '13px' }}>{t('تواصل مع المسؤول لتفعيل اشتراكك')}</p>
                    </div>
                );

                const planLabels: Record<string, string> = {
                    trial: t('التجربة المجانية'),
                    basic: t('الأساسية'),
                    pro: t('المتقدمة'),
                    premium: t('البريميوم'),
                    custom: t('مخصصة')
                };
                const planColors: Record<string, string> = { trial: '#fb923c', basic: '#60a5fa', pro: '#a78bfa', premium: '#fbbf24', custom: '#34d399' };

                const daysLeft = Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                const isTrial = sub.plan === 'trial';
                const totalDays = isTrial ? 14 : 365;
                const pct = Math.min(100, Math.max(0, (daysLeft / totalDays) * 100));
                const barColor = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f59e0b' : planColors[sub.plan] || '#256af4';
                const planColor = planColors[sub.plan] || '#256af4';

                return (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                        {/* ── الاشتراك الحالي ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <CreditCard size={14} /> {t('الباقة الحالية')}
                            </div>

                            <div style={{ background: C.card, border: `1px solid ${planColor}30`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', flex: 1 }}>
                                {/* اسم الباقة */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: planColor }}><CreditCard size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الباقة الحالية')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: planColor, fontFamily: CAIRO }}>
                                            {t('باقة')} {planLabels[sub.plan] || sub.plan}
                                        </span>
                                    </div>
                                </div>

                                {/* حالة الاشتراك */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: isExpired ? C.danger : '#10b981' }}><AlertCircle size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('حالة الاشتراك')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: isExpired ? C.danger : '#10b981', fontFamily: CAIRO }}>
                                            {isExpired ? t('غير مفعّلة / منتهية') : t('مفعّلة ونشطة')}
                                            {isTrial && !isExpired && <span style={{ marginInlineEnd: '10px', fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: 'rgba(37, 106, 244,0.1)', color: C.primary, border: `1px solid ${C.primary}30` }}>({t('نسخة تجريبية')})</span>}
                                        </span>
                                    </div>
                                </div>

                                {/* تاريخ البداية */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: C.textSecondary }}><Calendar size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تاريخ البداية')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: OUTFIT, direction: 'ltr', textAlign: 'center' }}>
                                        {new Date(sub.startDate).toLocaleDateString('en-GB')}
                                    </div>
                                </div>

                                {/* تاريخ الانتهاء */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: isExpired ? C.danger : C.textMuted }}><Calendar size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('تاريخ الانتهاء')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: isExpired ? C.danger : C.textPrimary, fontFamily: OUTFIT, direction: 'ltr', textAlign: 'center' }}>
                                        {new Date(sub.endDate).toLocaleDateString('en-GB')}
                                        {isExpired && <span style={{ fontSize: '11px', color: C.danger, marginInlineEnd: '12px', padding: '2px 8px', borderRadius: '4px', background: `${C.danger}15`, fontWeight: 600, fontFamily: CAIRO }}>{t('انتهى الاشتراك')}</span>}
                                    </div>
                                </div>

                                {/* عدد المستخدمين */}
                                <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: C.textSecondary }}><Users size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('عدد المستخدمين')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, fontFamily: CAIRO }}>
                                        {sub.maxUsers} {t('مستخدم مخصص')}
                                    </div>
                                </div>

                                {/* Progress */}
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{ width: '180px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 20px', borderInlineStart: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ color: barColor }}><Clock size={15} /></div>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: C.textSecondary, fontFamily: CAIRO }}>{t('الأيام المتبقية')}</span>
                                    </div>
                                    <div style={{ flex: 1, padding: '16px 20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.textSecondary, marginBottom: '8px', fontFamily: CAIRO }}>
                                            <span style={{ color: barColor, fontWeight: 600 }}>
                                                {isExpired ? t('انتهت الصلاحية') : `${Math.max(0, daysLeft)} ${t('يوم متبقي')}`}
                                            </span>
                                            <span style={{ fontWeight: 600 }}>{Math.round(pct)}%</span>
                                        </div>
                                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: '4px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: `0 0 12px ${barColor}50` }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* تحذير */}
                            {daysLeft <= 7 && !isExpired && (
                                <div style={{ display: 'flex', gap: '12px', padding: '16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '16px', fontSize: '13px', color: '#f59e0b', lineHeight: 1.6, fontFamily: CAIRO, boxShadow: '0 4px 15px -5px rgba(245,158,11,0.2)' }}>
                                    <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                                    <span style={{ fontWeight: 600 }}>{isTrial ? t('نهاية الفترة التجريبية ووشيكة — يرجى الترقية لضمان استمرارية العمل والوصول لكامل البيانات') : t('باقة الاشتراك تنتهي قريباً — يرجى تجديد الاشتراك مبكراً لضمان عدم توقف العمل المفاجئ')}</span>
                                </div>
                            )}

                        </div>

                        {/* ── ترقية الباقة ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: C.primary, display: 'flex', alignItems: 'center', gap: '8px', fontFamily: CAIRO, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <ArrowUpRight size={14} /> {t('طلب ترقية أو تجديد')}
                            </div>

                            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '32px', boxShadow: '0 4px 20px -10px rgba(0,0,0,0.3)', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ width: 56, height: 56, background: `${C.primary}15`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.primary, margin: '0 auto 20px', boxShadow: `0 8px 16px ${C.primary}20` }}>
                                    <ArrowUpRight size={24} />
                                </div>
                                <h4 style={{ margin: '0 0 10px', color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: CAIRO }}>{t('ترقية أو تجديد الباقة')}</h4>
                                <p style={{ fontSize: '13px', color: C.textSecondary, lineHeight: 1.7, marginBottom: '24px', fontFamily: CAIRO }}>
                                    {t('للوصول لمزيد من المميزات المتقدمة أو زيادة عدد المستخدمين المسموح بهم في النظام؛ يرجى التواصل مع فريق الدعم الفني والمبيعات مباشرة.')}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* WhatsApp Row */}
                                    <a href="https://wa.me/201090943033" target="_blank" rel="noopener noreferrer"
                                        style={{ textDecoration: 'none', width: '100%', height: '48px', borderRadius: '12px', background: 'rgba(37, 211, 102, 0.1)', border: '1px solid rgba(37, 211, 102, 0.2)', color: '#25D366', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontSize: '13px', transition: 'all 0.2s', fontFamily: CAIRO }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                        {t('مراسلة الدعم عبر واتساب')}
                                    </a>

                                    {/* Phone Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: '12px', height: '48px', boxSizing: 'border-box' }}>
                                        <div style={{ width: '24px', height: '16px', borderRadius: '3px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', flexShrink: 0 }}>
                                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ flex: 1, background: '#ce1126' }} />
                                                <div style={{ flex: 1, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <div style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#c09300' }} />
                                                </div>
                                                <div style={{ flex: 1, background: '#000' }} />
                                            </div>
                                        </div>
                                        <a href="tel:+201090943033" style={{ textDecoration: 'none', color: C.textPrimary, fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '0.5px', marginInlineStart: 'auto', direction: 'ltr' }}>
                                            +20 109 094 3033
                                        </a>
                                        <div style={{ padding: '6px', borderRadius: '8px', background: `${C.primary}15`, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Phone size={14} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
