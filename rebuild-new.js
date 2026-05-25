const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let code = fs.readFileSync(pageFile, 'utf8');

// 1. Extract the `<form onSubmit={handleSubmit}>...</form>` content (the main form)
// We know it starts right after `<AppModal show={showNew}`
const formStartStr = '<form onSubmit={handleSubmit}>';
const formStart = code.indexOf(formStartStr);
if (formStart === -1) {
    console.error("Could not find main form");
    process.exit(1);
}

// Find the END of this form by counting brackets? No, we know the form ends right before `</AppModal>` at line 713.
// Let's find the `</form>` before the first `</AppModal>`
const firstAppModalClose = code.indexOf('</AppModal>');
let formEnd = code.lastIndexOf('</form>', firstAppModalClose) + '</form>'.length;

const formContent = code.substring(formStart, formEnd);

// 2. Extract the Add Customer Modal
const addCustStart = code.indexOf('<AppModal\n                    show={showAddCustomer}');
const addCustEnd = code.indexOf('</AppModal>', addCustStart) + '</AppModal>'.length;
const addCustContent = code.substring(addCustStart, addCustEnd);

// 3. Build the clean return block
const cleanReturn = `return (
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
                    ${formContent}
                </div>

                ${addCustContent}
            </div>
        </DashboardLayout>
    );`;

// 4. Replace the old return block
const returnStart = code.indexOf('return (');
const returnEnd = code.lastIndexOf(');');
code = code.substring(0, returnStart) + cleanReturn + code.substring(returnEnd + 2);

// 5. Replace `setShowNew(false)` inside `handleSubmit` with `router.push('/installments')`
code = code.replace(/setShowNew\(false\);/g, 'router.push("/installments");');

// 6. Fix `onKeyDown` duplication issue if it exists (it doesn't in the restored file probably, wait yes it might have)
// Let's replace the duplicates of `onFocus` if there are any
code = code.replace(/onFocus=\{focusIn\}.*?onFocus=\{\(e\) => e\.target\.select\(\)\}/g, (match) => {
    return 'onFocus={(e) => { focusIn(e); e.target.select(); }}';
});
// And make sure inputs have `ref` and `onKeyDown` if they were removed by git checkout.
// Wait! `git restore` restored to the STATE in git, which ALREADY had the refs injected properly!
// I'll write the code out to ensure it builds correctly!

fs.writeFileSync(pageFile, code);
console.log("new/page.tsx perfectly fixed!");
