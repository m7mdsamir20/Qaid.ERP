const fs = require('fs');
const path = require('path');

const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let newCode = fs.readFileSync(newPageFile, 'utf8');

// The modal start is `<AppModal`
const modalStart = newCode.indexOf('<AppModal');
const modalEnd = newCode.lastIndexOf('</AppModal>');

if (modalStart !== -1 && modalEnd !== -1) {
    // Extract everything INSIDE the AppModal.
    // `<AppModal show={showNew} onClose={() => setShowNew(false)} title={t("إنشاء خطة تقسيط جديدة")} icon={Plus} maxWidth="720px">`
    // find the closing `>` of the AppModal opening tag.
    const modalTagEnd = newCode.indexOf('>', modalStart);
    const formContent = newCode.substring(modalTagEnd + 1, modalEnd);

    // The main page content begins at `<DashboardLayout>`
    const returnStart = newCode.indexOf('return (');
    const returnEnd = newCode.lastIndexOf(');');

    // We replace the entire return block with just DashboardLayout and the formContent
    const newReturnBlock = `return (
        <DashboardLayout>
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
            }}>
                <PageHeader 
                    title={t("إنشاء خطة تقسيط جديدة")} 
                    subtitle={t("إضافة تفاصيل المنتج، العميل وجدولة الأقساط")} 
                    icon={Plus} 
                    primaryButton={{
                        label: t('رجوع'),
                        onClick: () => router.push('/installments'),
                        icon: ArrowLeftCircle,
                        danger: true
                    }}
                />
                
                <div style={{ maxWidth: '900px', margin: '0 auto', background: C.card, borderRadius: '16px', padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: \`1px solid \${C.border}\` }}>
                    ${formContent}
                </div>
            </div>
        </DashboardLayout>
    );`;

    newCode = newCode.substring(0, returnStart) + newReturnBlock + newCode.substring(returnEnd + 2);
    
    // Fix `handleSubmit` to router.push to `/installments` instead of setShowNew(false)
    newCode = newCode.replace('setShowNew(false);', 'router.push("/installments");');
}

fs.writeFileSync(newPageFile, newCode);
console.log("new/page.tsx fixed!");

// Now clean `page.tsx`
const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'page.tsx');
let code = fs.readFileSync(pageFile, 'utf8');

const listModalStart = code.indexOf('<AppModal');
const listModalEnd = code.lastIndexOf('</AppModal>');
if (listModalStart !== -1 && listModalEnd !== -1) {
    code = code.substring(0, listModalStart) + code.substring(listModalEnd + '</AppModal>'.length);
}

fs.writeFileSync(pageFile, code);
console.log("page.tsx fixed!");
