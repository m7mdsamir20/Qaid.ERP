import { ArrowRight, Printer, Download, FileSpreadsheet, FileDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { THEME, C, CAIRO } from '@/constants/theme';

interface ReportHeaderProps {
    title: string;
    subtitle: string;
    backTab?: string;
    onExportExcel?: () => void;
    onExportPdf?: () => void;
    data?: any;
}

export default function ReportHeader({ title, subtitle, backTab, onExportExcel, onExportPdf }: ReportHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (backTab) router.push(`/reports?tab=${backTab}`);
        else router.push('/reports');
    };

    const handleDownloadPdf = () => {
        window.print();
    };

    return (
        <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: THEME.header.mb, gap: '20px', flexWrap: 'wrap' }}>
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
            <style>{`
                @media print {
                    .print-hide, .no-print { display: none !important; }
                    body { background: white !important; color: black !important; }
                    .main-content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .card { border: none !important; box-shadow: none !important; background: transparent !important; }
                    table th { background: #f3f4f6 !important; color: black !important; border-bottom: 2px solid #000 !important; }
                    table td { border-bottom: 1px solid #eee !important; color: black !important; }
                    .badge { border: 1px solid #000; color: #000 !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}</style>
        </div>
    );
}
