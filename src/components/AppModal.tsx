import React, { useEffect, useState } from 'react';
import { X, LucideIcon, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { THEME, C, CAIRO, OUTFIT } from '@/constants/theme';
import { useTranslation } from '@/lib/i18n';

interface AppModalProps {
    show: boolean;
    onClose: () => void;
    title: React.ReactNode;
    icon?: LucideIcon;
    children?: React.ReactNode;
    maxWidth?: string;
    footer?: React.ReactNode;
    variant?: 'default' | 'danger';
    headerActions?: React.ReactNode;
    // New Deletion Props
    isDelete?: boolean;
    itemName?: string;
    description?: string;
    onConfirm?: () => void;
    isSubmitting?: boolean;
    confirmText?: string;
    cancelText?: string;
    error?: string;
}

const AppModal: React.FC<AppModalProps> = ({ 
    show, 
    onClose, 
    title, 
    icon: Icon, 
    children, 
    maxWidth = '480px' ,
    footer,
    variant = 'default',
    headerActions,
    isDelete = false,
    itemName,
    description,
    onConfirm,
    isSubmitting = false,
    confirmText,
    cancelText,
    error
}) => {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'ar';
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (show) setIsMounted(true);
        else {
            const timer = setTimeout(() => setIsMounted(false), 200);
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!isMounted && !show) return null;

    const isDanger = variant === 'danger' || isDelete;

    // Localized Defaults
    const effectiveConfirmText = confirmText || t('نعم، احذف الآن');
    const effectiveCancelText = cancelText || t('إلغاء');

    return (
        <div
            style={{
                position: 'fixed', top: 0, insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, zIndex: 99999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--c-overlay, rgba(0,0,0,0.5))',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                opacity: show ? 1 : 0,
                transition: 'opacity 0.2s ease',
            }}
            onClick={onClose}
        >
            <div
                dir={isRtl ? 'rtl' : 'ltr'}
                className="modal-content"
                style={{
                    width: '94%', maxWidth: isDelete ? '420px' : maxWidth, background: C.card,
                    borderRadius: '16px', border: `1px solid ${isDanger ? 'rgba(239,68,68,0.3)' : C.border}`,
                    boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                    transform: show ? 'scale(1)' : 'scale(0.95)',
                    transition: 'transform 0.2s ease',
                    overflow: 'visible',
                    maxHeight: '92vh', display: 'flex', flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {((isDelete && !Icon) ? Trash2 : Icon) && (
                            <div style={{ 
                                padding: '10px', borderRadius: '10px', 
                                background: isDanger ? 'rgba(239,68,68,0.1)' : C.primaryBg, 
                                color: isDanger ? '#ef4444' : C.primary, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {isDelete && !Icon ? <Trash2 size={18} /> : Icon && <Icon size={18} />}
                            </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: C.textPrimary, fontFamily: CAIRO, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {title}
                            </h2>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {headerActions}
                        <button
                            onClick={onClose}
                            style={{
                                width: '30px', height: '30px', borderRadius: '6px',
                                border: `1px solid ${C.border}`, background: 'transparent',
                                color: C.textMuted, cursor: 'pointer', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = C.danger;
                                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
                                e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = C.textMuted;
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = C.border;
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ 
                    padding: isDelete ? '18px 22px' : '20px 24px',
                    flex: 1,
                    overflowY: 'auto'
                }}>
                    {isDelete ? (
                        <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: CAIRO }}>
                            <div style={{ 
                                width: '70px', height: '70px', borderRadius: '20px', 
                                background: `${C.danger}15`, 
                                color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                margin: '0 auto 20px', border: `1px solid ${C.danger}30`
                            }}>
                               <AlertTriangle size={36} />
                            </div>
                            
                            <h3 style={{ margin: '0 0 10px', color: C.textPrimary, fontSize: '20px', fontWeight: 900 }}>{title}</h3>
                            <p style={{ margin: '0 auto', color: C.textSecondary, fontSize: '14px', lineHeight: 1.7, maxWidth: '320px', fontWeight: 600 }}>
                                {description || (
                                    <>
                                        {t('سيتم حذف')} <span style={{ color: C.danger, fontWeight: 900 }}>"{itemName || t('هذا العنصر')}"</span> {t('نهائياً من قاعدة البيانات.')}
                                    </>
                                )}
                            </p>
                            
                            {error && (
                                <div style={{ 
                                    marginTop: '20px', padding: '10px 15px', borderRadius: '10px', 
                                    background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444', fontSize: '13px', fontWeight: 800, textAlign: 'center',
                                    display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={15} />
                                    {error}
                                </div>
                            )}

                            <div className="modal-actions" style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', 
                                gap: '12px', 
                                marginTop: '32px' 
                            }}>
                                <button 
                                    onClick={onConfirm} 
                                    disabled={isSubmitting} 
                                    style={{ 
                                        height: '50px', borderRadius: '13px', border: 'none', 
                                        background: C.danger, 
                                        color: '#fff', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        fontSize: '15px', fontFamily: CAIRO, 
                                        boxShadow: `0 8px 16px -4px ${C.danger}40`,
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                    }}
                                    onMouseOver={e => { if (!isSubmitting) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 20px -4px ${C.danger}50`; e.currentTarget.style.filter = 'brightness(1.1)'; } }}
                                    onMouseOut={e => { if (!isSubmitting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 8px 16px -4px ${C.danger}40`; e.currentTarget.style.filter = 'none'; } }}
                                >
                                    {isSubmitting ? (
                                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                                    ) : (
                                        <><Trash2 size={18} /> {effectiveConfirmText}</>
                                    )}
                                </button>
                                
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    style={{ 
                                        height: '50px', borderRadius: '13px', border: `1px solid ${C.border}`, 
                                        background: 'rgba(255,255,255,0.03)', color: C.textSecondary, 
                                        fontWeight: 700, cursor: 'pointer', fontSize: '14px',
                                        fontFamily: CAIRO, transition: 'all 0.2s'
                                    }}
                                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = C.textPrimary; }}
                                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = C.textSecondary; }}
                                >
                                    {effectiveCancelText}
                                </button>
                            </div>
                        </div>
                    ) : children}
                </div>

                {/* Footer if exists */}
                {footer && !isDelete && (
                    <div style={{ padding: '16px 22px', borderTop: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                        {footer}
                    </div>
                )}
            </div>
            <style jsx>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 480px) {
                    .modal-content {
                        width: 96% !important;
                        margin: 10px !important;
                        max-height: 96vh !important;
                    }
                    .modal-actions {
                        grid-template-columns: 1fr !important;
                    }
                    .modal-actions button {
                        width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default AppModal;
