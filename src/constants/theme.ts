/* ─── ERP Design System Tokens ─── */
export const THEME = {
    colors: {
        primary: '#256af4',
        primaryHover: '#1a56d6',
        primaryBg: 'var(--c-primary-bg, rgba(37,106,244,0.12))',
        primaryBorder: 'var(--c-primary-border, rgba(37,106,244,0.3))',

        success: '#4ade80',
        successBg: 'var(--c-success-bg, rgba(74,222,128,0.1))',
        successBorder: 'var(--c-success-border, rgba(74,222,128,0.22))',

        danger: '#ef4444',
        dangerBg: 'var(--c-danger-bg, rgba(239,68,68,0.1))',
        dangerBorder: 'var(--c-danger-border, rgba(239,68,68,0.22))',

        warning: '#fbbf24',
        warningBg: 'var(--c-warning-bg, rgba(251,191,36,0.1))',
        warningBorder: 'var(--c-warning-border, rgba(251,191,36,0.22))',

        blue: '#3b82f6',
        teal: '#14b8a6',
        purple: '#a78bfa',

        bg: 'var(--c-bg, #070d1a)',
        card: 'var(--c-card, #0e172a)',
        hover: 'var(--c-hover, rgba(255,255,255,0.04))',
        border: 'var(--c-border, rgba(255,255,255,0.15))',
        inputBg: 'var(--c-input-bg, rgba(14, 23, 41, 0.4))',
        subtle: 'var(--c-subtle, rgba(255,255,255,0.02))',

        textPrimary: 'var(--c-text-primary, #f8fafc)',
        textSecondary: 'var(--c-text-secondary, #94a3b8)',
        textMuted: 'var(--c-text-muted, #64748b)',
    },
    fonts: {
        /* ERP-Numbers أول → يطبق Outfit على الأرقام، Cairo للحروف */
        cairo: "'ERP-Numbers', 'Cairo', sans-serif",
        outfit: "'ERP-Numbers', 'Outfit', sans-serif",
    },
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        premium: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    },
    glass: {
        card: {
            background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
        }
    },
    header: {
        pt: '0px',
        mb: '20px',
        iconSize: 18,
        iconPadding: '8px',
        titleSize: '16px',
        subSize: '12px',
    },
    button: {
        height: '40px',
        fontSize: '14px',
        radius: '10px',
    },
    input: {
        height: '42px',
        fontSize: '14px',
        radius: '10px',
    }
};

/** Outfit font — للأرقام والقيم الرقمية */
export const OUTFIT = THEME.fonts.outfit;
/** alias للتوافق مع الكود القديم — نفس OUTFIT تماماً */
export const INTER = OUTFIT;
export const CAIRO = THEME.fonts.cairo;
export const C = THEME.colors;

export const IS: React.CSSProperties = {
    width: '100%', height: THEME.input.height, padding: '0 16px',
    textAlign: 'start',
    borderRadius: THEME.input.radius, border: `1px solid ${C.border}`,
    background: C.inputBg, color: C.textPrimary, fontSize: THEME.input.fontSize,
    fontWeight: 500, outline: 'none', transition: 'all 0.15s', boxSizing: 'border-box',
    fontFamily: CAIRO,
};

export const LS: React.CSSProperties = {
    display: 'block', marginBottom: '8px', fontSize: '11px',
    fontWeight: 700, color: C.textSecondary, textAlign: 'start',
    fontFamily: CAIRO
};

export const focusIn = (e: React.FocusEvent<any>) => {
    e.currentTarget.style.borderColor = C.primary;
};
export const focusOut = (e: React.FocusEvent<any>) => {
    e.currentTarget.style.borderColor = C.border;
    e.currentTarget.style.boxShadow = 'none';
};

/* ─── Premium Layout Components ─── */

/** Section Card (الريجون) */
export const SC: React.CSSProperties = {
    background: C.card,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: C.border,
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
};

/** Section Title (عنوان الريجون) */
export const STitle: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 800,
    color: '#3b82f6', // Bright Azure Blue
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: CAIRO
};

/** Standard Layout Grid (لتقسيم الصفحة يمين ويسار) */
export const GRID = {
    main: '1fr minmax(280px, 320px)',
    gap: '16px',
    verticalGap: '8px',
};

/** Page Base Container (الحاوية الأساسية للصفحة) */
export const PAGE_BASE: React.CSSProperties = {
    paddingBottom: '30px',
    paddingTop: THEME.header.pt,
};

/** Primary Action Button Style (أزرار الحفظ الأساسية) */
export const BTN_PRIMARY = (disabled: boolean, submitting: boolean): React.CSSProperties => ({
    width: '100%', height: '52px', borderRadius: '14px', border: 'none',
    background: (disabled || submitting) ? 'rgba(59,130,246,0.18)' : C.primary,
    color: (disabled || submitting) ? C.textMuted : '#fff', fontWeight: 800, fontSize: '15px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    cursor: (disabled || submitting) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
    boxShadow: (disabled || submitting) ? 'none' : '0 8px 16px -4px rgba(37,106,244,0.3)'
});

/** Success/Print Button Style (أزرار الطباعة والنجاح) */
export const BTN_SUCCESS = (disabled: boolean, submitting: boolean): React.CSSProperties => ({
    width: '100%', height: '48px', borderRadius: '14px',
    border: '1px solid rgba(16,185,129,0.4)',
    background: 'rgba(16,185,129,0.1)',
    color: '#10b981', fontWeight: 700, fontSize: '14px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    cursor: (disabled || submitting) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
    opacity: (disabled || submitting) ? 0.6 : 1
});

/** Danger Button Style (أزرار الحذف والصرف) */
export const BTN_DANGER = (disabled: boolean, submitting: boolean): React.CSSProperties => ({
    width: '100%', height: '52px', borderRadius: '14px', border: 'none',
    background: (disabled || submitting) ? 'rgba(239,68,68,0.18)' : C.danger,
    color: (disabled || submitting) ? C.textMuted : '#fff', fontWeight: 800, fontSize: '15px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    cursor: (disabled || submitting) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
    boxShadow: (disabled || submitting) ? 'none' : '0 8px 16px -4px rgba(239,68,68,0.3)'
});

/* ─── Premium UI Design Tokens (Reusable) ─── */

/** Standard Search Design (التصميم الموحد للبحث) 
 * يُستخدم بشكل مستقل فوق الجداول مباشرة
 */
export const SEARCH_STYLE = {
    container: { marginBottom: '20px', display: 'flex', gap: '12px', alignItems: 'center' },
    wrapper: { flex: 1, position: 'relative' as 'relative' },
    input: {
        ...IS, width: '100%', paddingInlineStart: '42px', paddingInlineEnd: '16px', paddingRight: undefined, paddingLeft: undefined, height: '42px',
        borderRadius: '10px', background: C.inputBg, fontSize: '13.5px',
        border: `1px solid ${C.border}`, transition: 'all 0.2s ease-in-out'
    },
    icon: (color: string = C.primary): React.CSSProperties => ({
        position: 'absolute' as 'absolute', insetInlineStart: '14px', top: '50%', right: undefined, left: undefined,
        transform: 'translateY(-50%)', color: color, pointerEvents: 'none' as 'none',
        opacity: 0.85
    }),
    iconSize: 16
};

/** Standard Table Design (التصميم الموحد للجداول - النسخة المعتمدة) 
 * تم ضبط هذا الثابت ليكون المرجع الأساسي لكافة جداول النظام
 */
export const TABLE_STYLE = {
    container: {
        background: THEME.colors.card,
        border: `1px solid ${C.border}`,
        borderRadius: '14px',
        overflowX: 'auto' as 'auto',
        overflowY: 'hidden' as 'hidden',
        WebkitOverflowScrolling: 'touch' as any,
        boxShadow: '0 4px 20px -8px rgba(0,0,0,0.5)'
    },
    table: {
        width: '100%',
        minWidth: '600px',
        borderCollapse: 'separate' as 'separate',
        borderSpacing: 0,
        fontSize: '13px',
        color: C.textPrimary
    },
    thead: {
        background: C.subtle,
        borderBottom: `1px solid ${C.border}`
    },
    th: (isFirst: boolean) => ({
        padding: '16px 20px',
        textAlign: (isFirst ? 'start' : 'center') as 'start' | 'center',
        fontSize: '12px',
        fontWeight: 700,
        color: C.textMuted,
        fontFamily: CAIRO,
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${C.border}`
    }),
    row: (isLast: boolean) => ({
        background: 'transparent',
        borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
        transition: 'all 0.2s',
        cursor: 'default' as 'default'
    }),
    td: (isFirst: boolean) => ({
        padding: '16px 20px',
        textAlign: (isFirst ? 'start' : 'center') as 'start' | 'center',
        verticalAlign: 'middle' as 'middle'
    }),
    /** Action Button Standard (30x30, Icon 14) */
    actionBtn: (color: string = C.textSecondary): React.CSSProperties => ({
        width: '30px', height: '30px', borderRadius: '8px',
        border: `1px solid ${C.border}`, background: C.subtle,
        color: color, cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
    }),
    actionIconSize: 14
};

/** Standard KPI Card (التصميم الموحد لبطاقات الإحصائيات المدمجة) */
export const KPI_STYLE = (color: string): React.CSSProperties => ({
    minWidth: '220px', background: `${color}08`, border: `1px solid ${color}30`, borderRadius: '12px',
    padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', overflow: 'hidden'
});

export const KPI_ICON = (color: string): React.CSSProperties => ({
    width: '32px', height: '32px', borderRadius: '8px', background: `${color}15`, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
});
