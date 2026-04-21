'use client';

import { LucideIcon, Plus, ArrowRight, ArrowLeft } from 'lucide-react';
import { THEME, C, CAIRO } from '@/constants/theme';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    backUrl?: string;
    onBack?: () => void;
    backButton?: {
        label: string;
        onClick: () => void;
    };
    primaryButton?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    actions?: React.ReactNode[];
    leftContent?: React.ReactNode;
    titleSize?: string;
    titleWeight?: number | string;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    backUrl,
    onBack,
    backButton,
    primaryButton,
    actions,
    leftContent,
    titleSize,
    titleWeight,
    children
}) => {
    const router = useRouter();
    const { lang } = useTranslation();
    const isRtl = lang === 'ar';
    const BackIcon = isRtl ? ArrowRight : ArrowLeft;
    return (
        <div className="mobile-column" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: THEME.header.mb,
            gap: '16px'
        }}>
            <div className="mobile-full" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                {(backUrl || onBack) && (
                    <button onClick={() => onBack ? onBack() : router.push(backUrl!)} 
                        style={{ 
                            width: '38px', height: '38px', borderRadius: '12px', background: C.subtle, 
                            border: `1px solid ${C.border}`, color: C.textSecondary, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                        onMouseLeave={e => e.currentTarget.style.background = C.subtle}>
                        <BackIcon size={22} />
                    </button>
                )}
                {backButton && (
                    <button onClick={backButton.onClick} 
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
                            padding: '0 12px', height: '38px', borderRadius: '12px', 
                            background: C.subtle, 
                            border: `1px solid ${C.border}`, color: C.textSecondary,
                            cursor: 'pointer', transition: '0.2s', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.hover}
                        onMouseLeave={e => e.currentTarget.style.background = C.subtle}>
                        <BackIcon size={18} /> {backButton.label}
                    </button>
                )}
                <div style={{ 
                    padding: '8px',
                    borderRadius: '10px', flexShrink: 0,
                    background: C.primaryBg, 
                    color: C.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px'
                }}>
                    <Icon size={20} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <h1 className="page-title" style={{ 
                            fontSize: titleSize || THEME.header.titleSize, 
                            fontWeight: titleWeight || 800, 
                            margin: 0, 
                            color: C.textPrimary, 
                            textAlign: 'start',
                            fontFamily: CAIRO,
                            lineHeight: 1.2,
                            whiteSpace: 'break-spaces'
                        }}>
                            {title}
                        </h1>
                        {children}
                    </div>
                    {subtitle && (
                        <p className="page-subtitle" style={{ 
                            fontSize: THEME.header.subSize, 
                            color: C.textMuted, 
                            margin: '4px 0 0', 
                            fontWeight: 400, 
                            textAlign: 'start',
                            fontFamily: CAIRO,
                            whiteSpace: 'break-spaces',
                            lineHeight: 1.4
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div className="mobile-stack" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: 'auto' }}>
                {leftContent}
                
                {actions && actions.map((action, i) => (
                    <div key={i} style={{ width: '100%' }}>{action}</div>
                ))}
                
                {primaryButton && (
                    <button
                        className="mobile-full"
                        onClick={primaryButton.onClick}
                        style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px',
                            height: '42px', 
                            padding: '0 24px', 
                            borderRadius: '12px',
                            background: C.primary, 
                            color: '#fff', 
                            border: 'none',
                            fontSize: '14px', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: CAIRO,
                            boxShadow: `0 4px 12px ${C.primary}30`,
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = C.primaryHover}
                        onMouseLeave={e => e.currentTarget.style.background = C.primary}
                    >
                        {primaryButton.icon ? <primaryButton.icon size={18} /> : <Plus size={18} />} 
                        {primaryButton.label}
                    </button>
                )}
            </div>
        </div>
    );
};

export default PageHeader;
