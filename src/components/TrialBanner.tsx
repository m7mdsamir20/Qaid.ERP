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
        if (!sub || sub.plan !== 'trial') return;

        const days = Math.ceil(
            (new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        setDaysLeft(days);
    }, [session]);

    if (dismissed || daysLeft === null || daysLeft < 0) return null;

    const isUrgent = daysLeft <= 3;
    const isWarn   = daysLeft <= 7;

    const bgColor     = isUrgent ? 'rgba(239,68,68,0.1)'    : isWarn ? 'rgba(245,158,11,0.08)'   : 'rgba(99,102,241,0.08)';
    const borderColor = isUrgent ? 'rgba(239,68,68,0.3)'    : isWarn ? 'rgba(245,158,11,0.25)'   : 'rgba(99,102,241,0.2)';
    const textColor   = isUrgent ? '#f87171'                 : isWarn ? '#f59e0b'                 : '#818cf8';
    const icon        = isUrgent ? '🚨' : isWarn ? '⚠️' : '🎯';

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
            direction:    'rtl',
        }}>
            <span style={{ fontSize: '18px' }}>{icon}</span>

            <div style={{ flex: 1 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: textColor }}>
                    {daysLeft === 0
                        ? 'فترتك التجريبية تنتهي اليوم!'
                        : `فترتك التجريبية تنتهي بعد ${daysLeft} يوم`
                    }
                </span>
                <span style={{ fontSize: '12px', color: '#64748b', marginRight: '8px' }}>
                    قم بترقية اشتراكك للاستمرار في استخدام النظام
                </span>
            </div>

            {/* Progress bar */}
            <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                <div style={{
                    width:      `${Math.max(0, (daysLeft / 14) * 100)}%`,
                    height:     '100%',
                    background: isUrgent ? '#ef4444' : isWarn ? '#f59e0b' : '#6366f1',
                    transition: 'width 0.3s',
                    borderRadius: '3px',
                }} />
            </div>

            <span style={{ fontSize: '11px', color: textColor, fontWeight: 800, flexShrink: 0 }}>
                {daysLeft}/14
            </span>

            <Link href="/settings?tab=subscription"
                style={{ height: '28px', padding: '0 12px', borderRadius: '7px', border: 'none', background: textColor, color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', flexShrink: 0 }}>
                <Crown size={11} /> ترقية
            </Link>

            <button onClick={() => setDismissed(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', display: 'flex', alignItems: 'center', padding: 0, flexShrink: 0 }}>
                <X size={14} />
            </button>
        </div>
    );
}
