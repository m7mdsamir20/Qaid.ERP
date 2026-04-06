import { ArrowRight, Printer, FileSpreadsheet, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { THEME, C, CAIRO, INTER } from '@/constants/theme';
import { useSession } from 'next-auth/react';

interface ReportHeaderProps {
    title: string;
    subtitle: string;
    backTab?: string;
    onExportExcel?: () => void;
    onExportPdf?: () => void;
    data?: any;
    printTitle?: string;
    printDate?: string;
    printCode?: string;
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onExportPdf, printTitle, printDate, printCode }: ReportHeaderProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const [co, setCo] = React.useState<any>((session?.user as any) || {});

    React.useEffect(() => {
        fetch('/api/company')
            .then(res => res.json())
            .then(d => { if (d && !d.error) setCo(d); })
            .catch(() => { });
    }, []);

    const handleBack = () => {
        if (backTab) router.push(`/reports?tab=${backTab}`);
        else router.push('/reports');
    };

    return (
        <div style={{ marginBottom: THEME.header.mb }}>
            {/* ── UI Header (Hidden on Print) ── */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
                    <button
                        onClick={handleBack}
                        style={{
                            width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${C.border}`, color: C.textSecondary,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        title="رجوع"
                    >
                        <ArrowRight size={22} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ fontSize: THEME.header.titleSize, fontWeight: 600, margin: 0, color: C.textPrimary, textAlign: 'right', fontFamily: CAIRO }}>{title}</h1>
                        <p className="page-subtitle" style={{ fontSize: THEME.header.subSize, color: C.textMuted, margin: '2px 0 0', fontWeight: 400, textAlign: 'right', fontFamily: CAIRO }}>{subtitle}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {onExportExcel && (
                        <button
                            onClick={onExportExcel}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                                borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                                border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '12px', fontWeight: 700,
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)'; e.currentTarget.style.transform = 'none'; }}
                        >
                            <FileSpreadsheet size={15} /> تحميل Excel
                        </button>
                    )}
                    <button
                        onClick={onExportPdf || (() => window.print())}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'none'; }}
                    >
                        <FileDown size={15} /> حفظ PDF
                    </button>
                    <button
                        onClick={() => window.print()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '12px', fontWeight: 700,
                            cursor: 'pointer', transition: 'all 0.2s', fontFamily: CAIRO
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; e.currentTarget.style.transform = 'none'; }}
                    >
                        <Printer size={15} /> طباعة
                    </button>
                </div>
            </div>

            {/* ── Professional Print Header (Visible only on Print) ── */}
            <div className="print-only" dir="rtl" style={{ 
                marginBottom: '30px', 
                paddingBottom: '20px', 
                borderBottom: '1.5px solid #000',
                paddingTop: '5px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    
                    {/* Visual Right: Info (1st in RTL) */}
                    <div style={{ textAlign: 'right', flex: 1.5 }}>
                        <h2 style={{ margin: '0 0 5px', fontSize: '24px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{co.companyName || co.name}</h2>
                        <div style={{ fontSize: '12px', color: '#333', display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: CAIRO, fontWeight: 700 }}>
                           {co.address && <span>العنوان: {co.address}</span>}
                           {co.phone && <span dir="ltr" style={{ textAlign: 'right' }}>الهاتف: {co.phone}</span>}
                           {co.taxNumber && <span>الرقم الضريبي: {co.taxNumber}</span>}
                           {co.commercialRegister && <span>السجل التجاري: {co.commercialRegister}</span>}
                        </div>
                    </div>
                    
                    {/* Visual Center: Title Box (2nd in RTL) */}
                    <div style={{ textAlign: 'center', flex: 1.2, padding: '0 20px' }}>
                        <div style={{ 
                            display: 'inline-block', 
                            border: '1.5px solid #ddd', 
                            padding: '12px 25px', 
                            background: '#f8f9fa', 
                            borderRadius: '12px',
                            minWidth: '220px'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 950, color: '#000', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{printTitle || title}</h3>
                        </div>
                        {printCode && (
                            <div style={{ marginTop: '8px', fontSize: '14px', fontWeight: 800, color: '#333', fontFamily: INTER }}>
                                {printCode}
                            </div>
                        )}
                        <div style={{ marginTop: '4px', fontSize: '12px', color: '#555', fontWeight: 700, fontFamily: INTER }}>
                            {printDate || new Date().toLocaleDateString('en-GB')}
                        </div>
                    </div>

                    {/* Visual Left: Logo (3rd in RTL) */}
                    <div style={{ textAlign: 'left', flex: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
                        {(co.companyLogo || co.logo) && (
                            <div style={{ 
                                width: '100px', height: '100px', 
                                border: '1px solid #ddd', 
                                borderRadius: '50%', 
                                padding: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff'
                            }}>
                                <img src={co.companyLogo || co.logo} alt="Logo" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print, .print-hide { display: none !important; }
                    .print-only { display: block !important; }
                    
                    html, body { 
                        background: white !important; 
                        color: black !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                    }
                    
                    body { padding: 0.5cm !important; }

                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        box-shadow: none !important; 
                        text-decoration: none !important;
                    }

                    /* ── Card Styling for Print ── */
                    div[style*="grid-template-columns"] {
                        display: flex !important;
                        flex-wrap: nowrap !important;
                        gap: 10px !important;
                        margin-bottom: 20px !important;
                    }
                    div[style*="grid-template-columns"] > div {
                        flex: 1 !important;
                        min-width: 0 !important;
                        padding: 8px 10px !important;
                        border: 0.5px solid #ccc !important;
                        background: #fff !important;
                        border-radius: 8px !important;
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: center !important;
                        justify-content: center !important;
                        text-align: center !important;
                    }
                    .stat-value { 
                        font-size: 13px !important; 
                        font-weight: 950 !important; 
                        color: #000 !important; 
                        margin: 2px 0 !important;
                    }
                    .stat-label { 
                        font-size: 9.5px !important; 
                        font-weight: 800 !important;
                        color: #444 !important; 
                        font-family: ${CAIRO} !important;
                    }

                    /* ── Standardize Table for Print (Remove backgrounds from spans) ── */
                    table span {
                        background: transparent !important;
                        border: none !important;
                        padding: 0 !important;
                        color: #000 !important;
                        font-weight: 800 !important;
                    }
                    
                    table { border-collapse: collapse !important; width: 100% !important; margin-top: 10px; }
                    th, td { border: 0.5px solid #ccc !important; padding: 8px 10px !important; color: #000 !important; background: #fff !important; font-size: 10px !important; }
                    th { font-weight: 950 !important; background: #f8f9fa !important; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>
        </div>
    );
}
