const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let code = fs.readFileSync(pageFile, 'utf8');

const dashboardStart = code.indexOf('<DashboardLayout>');
const appModalStart = code.indexOf('<AppModal');

if (dashboardStart !== -1 && appModalStart !== -1) {
    const newContainer = `<DashboardLayout>
            <div dir={isRtl ? 'rtl' : 'ltr'} style={{ 
                ...PAGE_BASE, 
                background: C.bg, 
                minHeight: '100%', 
                fontFamily: CAIRO,
                ['--surface-50' as any]: C.card,
                ['--surface-100' as any]: C.inputBg,
                ['--surface-200' as any]: C.hover,
                ['--text-primary' as any]: C.textPrimary,
                ['--text-secondary' as any]: C.textSecondary,
                ['--text-muted' as any]: C.textMuted,
                ['--border-subtle' as any]: C.border,
                ['--primary-500' as any]: C.primary,
                ['--primary-light' as any]: 'var(--c-primary-bg, rgba(37,106,244,0.15))',
            }}>
                <PageHeader 
                    title={t("إنشاء خطة تقسيط جديدة")} 
                    subtitle={t("إضافة تفاصيل المنتج، العميل وجدولة الأقساط")} 
                    icon={Plus} 
                    primaryButton={{
                        label: t('رجوع للأقساط'),
                        onClick: () => router.push('/installments'),
                        icon: ArrowLeftCircle,
                    }}
                />
                <div style={{ maxWidth: '900px', margin: '0 auto', background: C.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: \`1px solid \${C.border}\` }}>
`;

    const formStartStr = '<form onSubmit={handleSubmit}>';
    const formStart = code.indexOf(formStartStr, appModalStart);
    
    code = code.substring(0, dashboardStart) + newContainer + code.substring(formStart);
    code = code.replace(/<\/form>[\s\S]*?<\/AppModal>/, '</form>\n                </div>');
    
    // Remove deleteId modal
    code = code.replace(/\{deleteId && \([\s\S]*?<\/AppModal>\s*\)\}/, '');
    
}

// Change `setShowNew(false)` to `router.push('/installments')`
code = code.replace(/setShowNew\(false\);/g, 'router.push("/installments");');

fs.writeFileSync(pageFile, code);
console.log('Fixed for real');
