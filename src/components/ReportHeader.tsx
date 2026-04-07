import { ArrowRight, Printer, FileSpreadsheet, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
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
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

    const handleGeneratePdf = async () => {
        try {
            setIsGeneratingPdf(true);
            
            // Dynamic import to avoid SSR issues
            const html2pdf = (await import('html2pdf.js')).default;
            
            // Get the main container holding the report
            const element = document.querySelector('.dashboard-content') || document.querySelector('main') || document.body;
            
            // Temporarily apply a class to the body to force print styles onto the screen
            document.body.classList.add('pdf-export-mode');

            // Add a small delay to allow the browser to repaint the DOM with the new styles
            await new Promise(resolve => setTimeout(resolve, 100));

            const opt = {
                margin:       10,
                filename:     `${printTitle || title}.pdf`,
                image:        { type: 'jpeg' as const, quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
            };

            await html2pdf().from(element as HTMLElement).set(opt).save();
            
            // Restore the normal screen view
            document.body.classList.remove('pdf-export-mode');
            
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('حدث خطأ أثناء إنشاء ملف PDF');
            document.body.classList.remove('pdf-export-mode');
        } finally {
            setIsGeneratingPdf(false);
        }
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
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px', height: '38px', padding: '0 16px',
                            borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '12px', fontWeight: 700,
                            cursor: isGeneratingPdf ? 'wait' : 'pointer', transition: 'all 0.2s', fontFamily: CAIRO,
                            opacity: isGeneratingPdf ? 0.7 : 1
                        }}
                        onMouseEnter={e => { if(!isGeneratingPdf) { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseLeave={e => { if(!isGeneratingPdf) { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'none'; } }}
                    >
                        <FileDown size={15} /> {isGeneratingPdf ? 'جاري التحضير...' : 'حفظ PDF'}
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
                paddingBottom: '20px', 
                borderBottom: '1px solid #eee',
                paddingTop: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    
                    {/* Visual Right: Info (1st in RTL) */}
                    <div style={{ textAlign: 'right', flex: 1 }}>
                        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 900, color: '#000', fontFamily: CAIRO }}>{co.companyName || co.name}</h2>
                        <div style={{ fontSize: '11.5px', color: '#333', display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: CAIRO, fontWeight: 600 }}>
                           {co.address && <div style={{ color: '#555' }}>{co.address}</div>}
                           {co.phone && <div dir="ltr" style={{ textAlign: 'right', color: '#555' }}>{co.phone}</div>}
                           {co.taxNumber && (
                               <div style={{ display: 'flex', gap: '4px' }}>
                                   <span style={{ color: '#777' }}>الرقم الضريبي:</span>
                                   <span style={{ color: '#000', fontWeight: 800 }}>{co.taxNumber}</span>
                               </div>
                           )}
                           {co.commercialRegister && (
                               <div style={{ display: 'flex', gap: '4px' }}>
                                   <span style={{ color: '#777' }}>السجل التجاري:</span>
                                   <span style={{ color: '#000', fontWeight: 800 }}>{co.commercialRegister}</span>
                               </div>
                           )}
                        </div>
                    </div>
                    
                    {/* Visual Center: Title Box (2nd in RTL) */}
                    <div style={{ textAlign: 'center', flex: 1, padding: '0 10px' }}>
                        <div style={{ 
                            display: 'inline-block', 
                            border: '1.2px solid #ccc', 
                            padding: '10px 35px', 
                            background: '#fff', 
                            borderRadius: '12px',
                            minWidth: '260px'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 950, color: '#000', fontFamily: CAIRO, whiteSpace: 'nowrap' }}>{printTitle || title}</h3>
                        </div>
                        {printCode && (
                            <div style={{ marginTop: '10px', fontSize: '14px', fontWeight: 700, color: '#111', fontFamily: INTER }}>
                                {printCode}
                            </div>
                        )}
                        <div style={{ marginTop: `${printCode ? '4px' : '10px'}`, fontSize: '12px', color: '#444', fontWeight: 800, fontFamily: INTER }}>
                            {printDate || new Date().toLocaleDateString('en-GB')}
                        </div>
                    </div>

                    {/* Visual Left: Logo (3rd in RTL) */}
                    <div style={{ textAlign: 'left', flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {(co.companyLogo || co.logo) && (
                            <img src={co.companyLogo || co.logo} alt="Logo" style={{ maxHeight: '85px', maxWidth: '145px', objectFit: 'contain' }} />
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                /* ── Print Media Styles ── */
                @media print {
                    .no-print, .print-hide, .ui-only, nav, header { display: none !important; }
                    .print-only { display: block !important; }
                    html, body, #__next, .dashboard-content, main, [style*="minHeight"] { 
                        height: auto !important; min-height: 0 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important;
                    }
                    body { padding: 0.5cm 1cm !important; width: 100% !important; }
                    [style*="paddingBottom: '30px'"], [style*="padding-bottom: 30px"] { padding-bottom: 0 !important; padding-top: 0 !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-shadow: none !important; text-decoration: none !important; font-family: 'Cairo', sans-serif !important; }
                    table { page-break-inside: auto !important; border-collapse: collapse !important; width: 100% !important; margin-top: 15px; border: 1.5px solid #333 !important; }
                    tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                    thead { display: table-header-group !important; }
                    div[style*="grid-template-columns"] { display: flex !important; flex-wrap: nowrap !important; gap: 10px !important; margin-bottom: 25px !important; }
                    div[style*="grid-template-columns"] > div { flex: 1 !important; min-width: 0 !important; padding: 10px !important; border: 1px solid #e0e0e0 !important; background: #fff !important; border-radius: 12px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; }
                    .stat-value { font-size: 13px !important; font-weight: 950 !important; color: #111 !important; margin: 2px 0 !important; }
                    .stat-label { font-size: 11px !important; font-weight: 900 !important; color: #111 !important; }
                    table span { background: transparent !important; border: none !important; padding: 0 !important; color: #111 !important; font-weight: 800 !important; }
                    th, td { border: 1px solid #666 !important; padding: 10px 12px !important; color: #1a1a1a !important; background: #fff !important; font-size: 12px !important; }
                    th { font-weight: 900 !important; background: #f0f0f0 !important; color: #111 !important; border: 1.5px solid #333 !important; font-size: 11px !important; }
                }

                /* ── PDF Export Screen Overrides (Used by html2pdf) ── */
                body.pdf-export-mode .no-print, body.pdf-export-mode .print-hide, body.pdf-export-mode .ui-only, body.pdf-export-mode nav, body.pdf-export-mode header { display: none !important; }
                body.pdf-export-mode .print-only { display: block !important; }
                body.pdf-export-mode, body.pdf-export-mode #__next, body.pdf-export-mode .dashboard-content, body.pdf-export-mode main, body.pdf-export-mode [style*="minHeight"] { 
                    height: auto !important; min-height: 0 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important;
                }
                body.pdf-export-mode [style*="paddingBottom: '30px'"], body.pdf-export-mode [style*="padding-bottom: 30px"] { padding-bottom: 0 !important; padding-top: 0 !important; }
                body.pdf-export-mode * { box-shadow: none !important; text-decoration: none !important; font-family: 'Cairo', sans-serif !important; }
                body.pdf-export-mode table { border-collapse: collapse !important; width: 100% !important; margin-top: 15px; border: 1.5px solid #333 !important; }
                body.pdf-export-mode div[style*="grid-template-columns"] { display: flex !important; flex-wrap: nowrap !important; gap: 10px !important; margin-bottom: 25px !important; }
                body.pdf-export-mode div[style*="grid-template-columns"] > div { flex: 1 !important; min-width: 0 !important; padding: 10px !important; border: 1px solid #e0e0e0 !important; background: #fff !important; border-radius: 12px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; }
                body.pdf-export-mode .stat-value { font-size: 13px !important; font-weight: 950 !important; color: #111 !important; margin: 2px 0 !important; }
                body.pdf-export-mode .stat-label { font-size: 11px !important; font-weight: 900 !important; color: #111 !important; }
                body.pdf-export-mode table span { background: transparent !important; border: none !important; padding: 0 !important; color: #111 !important; font-weight: 800 !important; }
                body.pdf-export-mode th, body.pdf-export-mode td { border: 1px solid #666 !important; padding: 10px 12px !important; color: #1a1a1a !important; background: #fff !important; font-size: 12px !important; }
                body.pdf-export-mode th { font-weight: 900 !important; background: #f0f0f0 !important; color: #111 !important; border: 1.5px solid #333 !important; font-size: 11px !important; }

                @media screen {
                    .print-only { display: none !important; }
                }
            `}</style>
        </div>
    );
}
