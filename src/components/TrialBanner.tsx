'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { AlertTriangle, X, Crown } from 'lucide-react';
import Link from 'next/link';

export default function TrialBanner() {
    const { data: session } = useSession();
    const [dismissed, setDismissed] = useState(false);
    const [daysLeft, setDaysLeft]   = useState<number | null>(null);

    useEffect(() => {
        const sub = (session?.user as any)?.subscription;
        if (!sub || sub.plan !== 'trial') {
            setDaysLeft(null);
            return;
        }

        const end = new Date(sub.endDate);
        if (isNaN(end.getTime())) {
            setDaysLeft(null);
            return;
        }

        const days = Math.ceil(
            (end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        setDaysLeft(days);
    }, [session]);

    const subPlan = (session?.user as any)?.subscription?.plan || '';
    if (dismissed || !session || subPlan !== 'trial' || daysLeft === null) return null;

    const isExpired = daysLeft < 0;
    const isUrgent = daysLeft >= 0 && daysLeft <= 3;
    const isWarn   = daysLeft > 3 && daysLeft <= 7;

    const bgColor     = isExpired ? 'rgba(239,68,68,0.15)' : isUrgent ? 'rgba(239,68,68,0.1)'    : isWarn ? 'rgba(245,158,11,0.08)'   : 'rgba(99,102,241,0.08)';
    const borderColor = isExpired ? 'rgba(239,68,68,0.4)'  : isUrgent ? 'rgba(239,68,68,0.3)'    : isWarn ? 'rgba(245,158,11,0.25)'   : 'rgba(99,102,241,0.2)';
    const textColor   = isExpired ? '#ef4444'              : isUrgent ? '#f87171'                 : isWarn ? '#f59e0b'                 : '#818cf8';
    const icon        = isExpired ? '🛑' : isUrgent ? '🚨' : isWarn ? '⚠️' : '🎯';

    return (
        <div className="print-hide" style={{
            background:   bgColor,
            border:       `1px solid ${borderColor}`,
            borderRadius: '10px',
            padding:      '10px 16px',
            margin:       '0 0 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            direction: 'inherit',
        }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>

            <div style={{ flex: 1 }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: textColor }}>
                    {isExpired 
                        ? (subPlan === 'trial' ? 'انتهت الفترة التجريبية للنظام!' : 'انتهى اشتراك النظام الحالي!')
                        : (daysLeft === 0 ? 'فترتك التجريبية تنتهي اليوم!' : `فترتك التجريبية تنتهي بعد ${daysLeft} يوم`)
                    }
                </span>
                <span style={{ fontSize: '12px', color: isExpired ? '#ef4444' : '#64748b', marginInlineStart: '8px', opacity: isExpired ? 0.9 : 1 }}>
                    {isExpired 
                        ? 'يرجى تجديد الاشتراك فوراً لتتمكن من استخدام ميزات النظام والتحكم في البيانات.' 
                        : 'قم بترقية اشتراكك للاستمرار في استخدام النظام'
                    }
                </span>
            </div>

            {!isExpired && (
                <>
                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{
                            width:      `${Math.max(0, (daysLeft! / 14) * 100)}%`,
                            height:     '100%',
                            background: isUrgent ? '#ef4444' : isWarn ? '#f59e0b' : '#6366f1',
                            transition: 'width 0.3s',
                            borderRadius: '3px',
                        }} />
                    </div>
                    <span style={{ fontSize: '11px', color: textColor, fontWeight: 800, flexShrink: 0 }}>
                        {daysLeft}/14
                    </span>
                </>
            )}

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <Link href="/settings?tab=subscription"
                    style={{ height: '32px', padding: '0 14px', borderRadius: '8px', border: 'none', background: textColor, color: '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                    <Crown size={12} /> {isExpired ? 'تجديد الاشتراك الآن' : 'ترقية الآن'}
                </Link>

                {!isExpired && (
                    <button onClick={() => setDismissed(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: 0 }}>
                        <X size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}
