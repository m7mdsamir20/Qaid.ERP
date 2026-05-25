const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let code = fs.readFileSync(pageFile, 'utf8');

// 1. Remove the DashboardLayout and everything inside it UP TO the AppModal
// Look for `<DashboardLayout>`
const dashboardStart = code.indexOf('<DashboardLayout>');
const appModalStart = code.indexOf('<AppModal \n                    show={showNew}');

if (dashboardStart !== -1 && appModalStart !== -1) {
    // Everything between <DashboardLayout> and <AppModal show={showNew}> should be removed, EXCEPT we want to keep <DashboardLayout> and start a new container.
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
                <div style={{ maxWidth: '900px', margin: '0 auto', background: C.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: \`1px solid \${C.border}\` }}>\n`;

    // The start of the form is right after AppModal
    const formStartStr = '<form onSubmit={handleSubmit}>';
    const formStart = code.indexOf(formStartStr, appModalStart);
    
    // We replace from `<DashboardLayout>` to `<form onSubmit={handleSubmit}>` (exclusive)
    code = code.substring(0, dashboardStart) + newContainer + code.substring(formStart);
    
    // Now we need to remove `</AppModal>` that closes the `showNew` modal.
    // The form ends with `</form>`. The very next thing is `</AppModal>`.
    // Let's replace `</form>\n                </AppModal>` with `</form>\n                </div>`
    code = code.replace('</form>\n                </AppModal>', '</form>\n                </div>');
    
    // Also, we need to remove the `deleteId` modal because it's not needed here and it contains another `<AppModal>` which could cause confusion.
    const deleteModalStart = code.indexOf('{deleteId && (');
    if (deleteModalStart !== -1) {
        const deleteModalEnd = code.indexOf(')}', deleteModalStart) + 2;
        // actually deleteId modal ends with `</AppModal>\n                )}`
        const deleteModalRealEnd = code.indexOf(')}', code.indexOf('</AppModal>', deleteModalStart)) + 2;
        code = code.substring(0, deleteModalStart) + code.substring(deleteModalRealEnd);
    }
}

// Change `setShowNew(false)` to `router.push('/installments')`
code = code.replace(/setShowNew\(false\);/g, 'router.push("/installments");');

fs.writeFileSync(pageFile, code);
console.log("Fixed carefully!");
