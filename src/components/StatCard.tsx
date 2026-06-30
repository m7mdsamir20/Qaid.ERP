'use client';
/**
 * StatCard — مكوّن الكارت الإحصائي الموحّد
 *
 * التصميم المرجعي: صفحة العملاء (customers/page.tsx)
 * الاستخدام الصحيح لأي صفحة جديدة تحتاج إحصائيات KPI:
 *
 *   import StatCard, { StatCardGrid } from '@/components/StatCard';
 *
 *   <StatCardGrid cols={3}>
 *     <StatCard label="إجمالي العملاء" value={count} suffix="عميل" icon={<Users size={18} />} color="#256af4" />
 *     <StatCard label="المديونيات" value={total} suffix={cSymbol} icon={<TrendingUp size={18} />} color="#10b981" />
 *   </StatCardGrid>
 */

import React, { useState } from 'react';
import { C, CAIRO, OUTFIT, STAT_CARD_STYLE, STAT_CARD_ICON_BOX, STAT_CARD_GRID } from '@/constants/theme';
import { formatNumber } from '@/lib/currency';

export interface StatCardProps {
    /** العنوان الظاهر فوق القيمة */
    label: string;
    /** القيمة الرقمية أو النصية */
    value: string | number;
    /** الوحدة بعد القيمة (مثال: عميل، ج.م، %) */
    suffix?: string;
    /** الأيقونة (React node مثل <Users size={18} />) */
    icon: React.ReactNode;
    /** لون accent الكارت (hex مثل '#256af4') */
    color: string;
    /** هل يتم تنسيق الأرقام تلقائياً بفواصل؟ (افتراضي: false) */
    formatValue?: boolean;
}

/**
 * StatCard — الكارت الإحصائي الموحّد
 */
export default function StatCard({ label, value, suffix, icon, color, formatValue = false }: StatCardProps) {
    const [hovered, setHovered] = useState(false);

    const displayValue = formatValue && typeof value === 'number'
        ? formatNumber(value)
        : value;

    return (
        <div
            style={STAT_CARD_STYLE(color, hovered)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* النص: العنوان + القيمة */}
            <div>
                <p style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: C.textSecondary,
                    margin: '0 0 4px',
                    whiteSpace: 'nowrap',
                    fontFamily: CAIRO,
                }}>
                    {label}
                </p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: C.textPrimary,
                        fontFamily: OUTFIT,
                    }}>
                        {displayValue}
                    </span>
                    {suffix && (
                        <span style={{
                            fontSize: '11px',
                            color: C.textSecondary,
                            fontWeight: 500,
                            fontFamily: CAIRO,
                        }}>
                            {suffix}
                        </span>
                    )}
                </div>
            </div>

            {/* الأيقونة */}
            <div style={STAT_CARD_ICON_BOX(color)}>
                {icon}
            </div>
        </div>
    );
}

/**
 * StatCardGrid — حاوية الشبكة لكروت الإحصائيات
 *
 * الاستخدام:
 *   <StatCardGrid cols={3}>
 *     <StatCard ... />
 *     <StatCard ... />
 *   </StatCardGrid>
 */
export function StatCardGrid({
    children,
    cols = 3,
    style,
    ...props
}: {
    children: React.ReactNode;
    cols?: number;
    style?: React.CSSProperties;
    [key: string]: any;
}) {
    return (
        <div style={{ ...STAT_CARD_GRID(cols), ...style }} {...props}>
            {children}
        </div>
    );
}
