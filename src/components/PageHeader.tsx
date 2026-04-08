'use client';

import { LucideIcon, Plus, ArrowRight } from 'lucide-react';
import { THEME, C, CAIRO } from '@/constants/theme';
import { useRouter } from 'next/navigation';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    backUrl?: string;
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
    backButton,
    primaryButton,
    actions,
    leftContent,
    titleSize,
    titleWeight,
    children
}) => {
    const router = useRouter();
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: THEME.header.mb 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {backUrl && (
                    <button onClick={() => router.push(backUrl)} 
                        style={{ 
                            width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', 
                            border: `1px solid ${C.border}`, color: C.textSecondary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <ArrowRight size={22} />
                    </button>
                )}
                {backButton && (
                    <button onClick={backButton.onClick} 
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '6px', 
                            padding: '0 12px', height: '38px', borderRadius: '12px', 
                            background: 'rgba(255,255,255,0.03)', 
                            border: `1px solid ${C.border}`, color: C.textSecondary,
                            cursor: 'pointer', transition: '0.2s', fontSize: '13px', fontWeight: 600, fontFamily: CAIRO
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <ArrowRight size={18} /> {backButton.label}
                    </button>
                )}
                <div style={{ 
                    padding: THEME.header.iconPadding, 
                    borderRadius: '8px', 
                    background: C.primaryBg, 
                    color: C.primary,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={THEME.header.iconSize} />
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h1 style={{ 
                            fontSize: titleSize || THEME.header.titleSize, 
                            fontWeight: titleWeight || 600, 
                            margin: 0, 
                            color: C.textPrimary, 
                            textAlign: 'start',
                            fontFamily: CAIRO
                        }}>
                            {title}
                        </h1>
                        {children}
                    </div>
                    {subtitle && (
                        <p style={{ 
                            fontSize: THEME.header.subSize, 
                            color: C.textMuted, 
                            margin: '2px 0 0', 
                            fontWeight: 400, 
                            textAlign: 'start',
                            fontFamily: CAIRO
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {leftContent}
                
                {actions && actions.map((action, i) => (
                    <div key={i}>{action}</div>
                ))}
                
                {primaryButton && (
                    <button
                        onClick={primaryButton.onClick}
                        style={{
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            height: THEME.button.height, 
                            padding: '0 16px', 
                            borderRadius: THEME.button.radius,
                            background: C.primary, 
                            color: '#fff', 
                            border: 'none',
                            fontSize: THEME.button.fontSize, 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            fontFamily: CAIRO,
                            boxShadow: `0 4px 12px ${C.primary}30`
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
