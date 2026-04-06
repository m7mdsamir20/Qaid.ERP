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
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onExportPdf, printTitle, printDate }: ReportHeaderProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const co = (session?.user as any) || {};

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
                marginBottom: '40px', 
                paddingBottom: '25px', 
                borderBottom: '2.5px double #111',
                paddingTop: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '30px' }}>
                    
                    {/* Right: Company Info */}
                    <div style={{ flex: 1.2, textAlign: 'right' }}>
                        <h2 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 950, color: '#000', fontFamily: CAIRO }}>{co.companyName}</h2>
                        <div style={{ fontSize: '12px', color: '#111', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: CAIRO, fontWeight: 600 }}>
                           {co.taxNumber && <span>الرقم الضريبي: {co.taxNumber}</span>}
                           {co.commercialRegister && <span>السجل التجاري: {co.commercialRegister}</span>}
                           {co.phone && <span>الهاتف: {co.phone}</span>}
                           {co.address && <span>العنوان: {co.address}</span>}
                        </div>
                    </div>
                    
                    {/* Center: Title Box */}
                    <div style={{ flex: 1, textAlign: 'center', paddingTop: '10px' }}>
                        <div style={{ display: 'inline-block', border: '2px solid #111', padding: '10px 40px', background: '#fff', boxShadow: '4px 4px 0px #111' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 1000, color: '#000', fontFamily: CAIRO, textTransform: 'uppercase' }}>{printTitle || title}</h3>
                        </div>
                        <div style={{ marginTop: '12px', fontSize: '13px', color: '#000', fontWeight: 800, fontFamily: INTER, opacity: 0.9 }}>
                            {printDate || new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {/* Left: Logo */}
                    <div style={{ flex: 1, textAlign: 'left' }}>
                        {co.companyLogo && <img src={co.companyLogo} alt="Logo" style={{ maxHeight: '100px', maxWidth: '180px', objectFit: 'contain' }} />}
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    .no-print, .print-hide { display: none !important; }
                    .print-only { display: block !important; }
                    body { background: white !important; color: black !important; padding: 0.5cm !important; margin: 0 !important; }
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        box-shadow: none !important; 
                        text-shadow: none !important;
                    }
                    div, section, table, tr, th, td {
                        border-radius: 0 !important;
                    }
                    table { border-collapse: collapse !important; width: 100% !important; }
                    th, td { border: 1px solid #333 !important; padding: 10px 12px !important; color: #000 !important; background: #fff !important; }
                    th { font-weight: 900 !important; background: #f0f0f0 !important; }
                    .stat-card, .stat-item {
                        border: 1px solid #333 !important;
                        background: #fff !important;
                    }
                    .stat-value { font-size: 14pt !important; font-weight: 900 !important; }
                    .stat-label { font-size: 10pt !important; font-weight: 700 !important; }
                }
                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>
        </div>
    );
}
