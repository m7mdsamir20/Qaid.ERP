const fs = require('fs');
const path = require('path');

// Target files configuration
const SRC_DIR = path.join(__dirname, '../src');
const I18N_PATH = path.join(SRC_DIR, 'lib/i18n.tsx');
const AUDIT_REPORT_PATH = path.join(SRC_DIR, 'app/brain/translation_audit.md');

// Unicode Arabic range regex
const ARABIC_CHAR_REGEX = /[\u0600-\u06FF]/;
// Arabic phrase regex (matching words and spaces/punctuation in between)
const ARABIC_PHRASE_REGEX = /[\u0600-\u06FF][\u0600-\u06FF\s0-9\-_./()!?:%,]*[\u0600-\u06FF]|[\u0600-\u06FF]/g;

// Common translation dictionary to auto-translate during sync
const COMMON_TRANSLATIONS = {
    "حفظ": "Save",
    "تعديل": "Edit",
    "حذف": "Delete",
    "إلغاء": "Cancel",
    "إضافة": "Add",
    "تأكيد": "Confirm",
    "بحث": "Search",
    "البحث": "Search",
    "تصفية": "Filter",
    "الكل": "All",
    "جديد": "New",
    "تفاصيل": "Details",
    "عرض": "View",
    "طباعة": "Print",
    "إغلاق": "Close",
    "موافق": "OK",
    "نعم": "Yes",
    "لا": "No",
    "خطأ": "Error",
    "نجاح": "Success",
    "تنبيه": "Warning",
    "تحذير": "Warning",
    "السابق": "Previous",
    "التالي": "Next",
    "المستندات": "Documents",
    "التقارير": "Reports",
    "الإعدادات": "Settings",
    "المستخدمين": "Users",
    "الصلاحيات": "Permissions",
    "الفروع": "Branches",
    "المخازن": "Warehouses",
    "العملاء": "Customers",
    "الموردين": "Suppliers",
    "المبيعات": "Sales",
    "المشتريات": "Purchases",
    "المشاريع": "Projects",
    "المشروع": "Project",
    "العقود": "Contracts",
    "العقد": "Contract",
    "المستخلصات": "Payment Certificates",
    "مستخلص": "Payment Certificate",
    "الحسابات": "Accounts",
    "القيود": "Journal Entries",
    "الرواتب": "Salaries",
    "الموظفين": "Employees",
    "تاريخ": "Date",
    "المبلغ": "Amount",
    "البيان": "Description",
    "الحالة": "Status",
    "النوع": "Type",
    "الكمية": "Quantity",
    "السعر": "Price",
    "الإجمالي": "Total",
    "الصافي": "Net",
    "الضريبة": "Tax",
    "الخصم": "Discount",
    "الرصيد": "Balance",
    "الفرع": "Branch",
    "المخزن": "Warehouse",
    "الخزينة": "Treasury",
    "البنك": "Bank",
    "حساب": "Account",
    "رقم الهاتف": "Phone Number",
    "العنوان": "Address",
    "البريد الإلكتروني": "Email",
    "الاسم": "Name",
    "الاسم بالكامل": "Full Name",
    "الرمز": "Code",
    "الكود": "Code",
    "ملاحظات": "Notes",
    "الوصف": "Description",
    "القيمة": "Value",
    "العملة": "Currency",
    "البلد": "Country",
    "الدولة": "Country",
    "المدينة": "City",
    "المستخدم": "User",
    "القسم": "Department",
    "الوظيفة": "Job Title",
    "الراتب": "Salary",
    "البدلات": "Allowances",
    "الاستقطاعات": "Deductions",
    "السلف": "Advances",
    "الجزاءات": "Penalties",
    "مسير الرواتب": "Payroll",
    "الحضور": "Attendance",
    "الانصراف": "Departure",
    "الإجازات": "Leaves",
    "الغياب": "Absence",
    "التأخير": "Delay",
    "العمل الإضافي": "Overtime",
    "سند قبض": "Receipt Voucher",
    "سند صرف": "Payment Voucher",
    "فاتورة مبيعات": "Sales Invoice",
    "فاتورة مشتريات": "Purchase Invoice",
    "مرتجع مبيعات": "Sales Return",
    "مرتجع مشتريات": "Purchase Return",
    "عرض سعر": "Quotation",
    "طلب شراء": "Purchase Request",
    "أمر شراء": "Purchase Order",
    "سند توريد": "Receipt Voucher",
    "سند صرف مخزني": "Issue Voucher",
    "تحويل مخزني": "Stock Transfer",
    "جرد المخزن": "Stocktaking",
    "تسوية مخزنية": "Stock Adjustment",
    "الأصول الثابتة": "Fixed Assets",
    "الأصول": "Assets",
    "الخصوم": "Liabilities",
    "حقوق الملكية": "Equity",
    "الإيرادات": "Revenues",
    "المصروفات": "Expenses",
    "الأرباح والخسائر": "P&L",
    "الميزانية العمومية": "Balance Sheet",
    "ميزان المراجعة": "Trial Balance",
    "دفتر اليومية": "Daily Journal",
    "دفتر الأستاذ": "General Ledger",
    "المركز المالي": "Financial Position",
    "التدفق النقدي": "Cash Flow",
    "مركز التكلفة": "Cost Center",
    "الشركاء": "Partners",
    "الأسهم": "Shares",
    "توزيع الأرباح": "Profit Distribution",
    "رأس المال": "Capital",
    "السنة المالية": "Financial Year",
    "الفترة المالية": "Financial Period",
    "إغلاق السنة": "Close Year",
    "الأقساط": "Installments",
    "جدول الأقساط": "Installment Schedule",
    "التحصيل": "Collection",
    "المتأخرات": "Arrears",
    "العميل": "Customer",
    "المورد": "Supplier",
    "الصنف": "Item",
    "الأصناف": "Items",
    "الخدمة": "Service",
    "الخدمات": "Services",
    "التصنيف": "Category",
    "التصنيفات": "Categories",
    "الوحدة": "Unit",
    "العمليات": "Operations",
    "الإجراءات": "Actions",
    "تعديل الصلاحيات": "Edit Permissions",
    "حفظ التغييرات": "Save Changes",
    "إلغاء الأمر": "Cancel",
    "موافق": "OK",
    "تراجع": "Back",
    "بحث...": "Search...",
    "ابحث هنا...": "Search here...",
    "رقم الفاتورة": "Invoice Number",
    "تاريخ الفاتورة": "Invoice Date",
    "تاريخ الاستحقاق": "Due Date",
    "طريقة الدفع": "Payment Method",
    "نقداً": "Cash",
    "آجل": "Credit",
    "شيك": "Cheque",
    "تحويل بنكي": "Bank Transfer",
    "شبكة": "POS",
    "إجمالي الفاتورة": "Invoice Total",
    "قيمة الضريبة": "Tax Value",
    "صافي الفاتورة": "Invoice Net",
    "المدفوع": "Paid",
    "المتبقي": "Remaining",
    "حالة الفاتورة": "Invoice Status",
    "مسودة": "Draft",
    "مرحلة": "Posted",
    "معتمدة": "Approved",
    "ملغاة": "Cancelled",
    "مرتجعة": "Returned",
    "مرتجعة جزئياً": "Partially Returned",
    "مدفوعة": "Paid",
    "غير مدفوعة": "Unpaid",
    "مدفوعة جزئياً": "Partially Paid",
    "مستحقة": "Due",
    "متأخرة": "Overdue",
    "الرقم الضريبي للمؤسسة": "Company Tax Number",
    "السجل التجاري للمؤسسة": "Company Commercial Registry",
    "الهاتف": "Phone",
    "البريد": "Email",
    "الموقع": "Website",
    "شعار": "Logo",
    "تحديث الشعار": "Update Logo",
    "تحميل...": "Loading...",
    "جاري التحميل...": "Loading...",
    "الرئيسية": "Dashboard",
    "لوحة التحكم": "Dashboard",
    "المستودعات": "Warehouses",
    "الخزن": "Treasuries",
    "البنوك": "Banks",
    "رواتب الموظفين": "Employee Salaries",
    "شؤون الموظفين": "Personnel Affairs",
    "البطاقات": "Cards",
    "عرض التفاصيل": "View Details",
    "تعديل البيانات": "Edit Data",
    "إضافة جديد": "Add New",
    "بحث متقدم": "Advanced Search",
    "تصدير": "Export",
    "استيراد": "Import",
    "النسخ الاحتياطي": "Backup",
    "استعادة": "Restore",
    "الاشتراكات": "Subscriptions",
    "الدعم الفني": "Technical Support",
    "اتصل بنا": "Contact Us",
    "الخروج": "Exit",
    "تسجيل الخروج": "Logout",
    "تسجيل الدخول": "Login",
    "مستخدم جديد؟": "New User?",
    "إنشاء حساب جديد": "Create New Account",
    "نسيت كلمة المرور؟": "Forgot Password?",
    "استعادة كلمة المرور": "Reset Password",
    "تغيير كلمة المرور": "Change Password",
    "كلمة المرور الحالية": "Current Password",
    "كلمة المرور الجديدة": "New Password",
    "تأكيد كلمة المرور": "Confirm Password",
    "الملف الشخصي": "Profile",
    "تحديث الملف الشخصي": "Update Profile",
    "الصورة الشخصية": "Profile Picture",
    "تغيير الصورة": "Change Picture"
};

// Helper to strip comments but preserve character offsets and line breaks
function stripComments(code) {
    return code
        .replace(/\/\*[\s\S]*?\*\//g, (match) => match.replace(/[^\n]/g, ' '))
        .replace(/\/\/.*/g, (match) => match.replace(/[^\n]/g, ' '));
}

// Helper to unescape string literals to get their actual evaluated string values
function unescapeStringLiteral(str) {
    return str.replace(/\\(.)/g, (match, char) => {
        switch (char) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            case 'b': return '\b';
            case 'f': return '\f';
            case 'v': return '\v';
            case '0': return '\0';
            case '\\': return '\\';
            case '"': return '"';
            case "'": return "'";
            case '`': return '`';
            default: return char;
        }
    });
}

// Recursively get files
function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFiles(fullPath));
        } else {
            const ext = path.extname(fullPath);
            if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

// Main execution
function main() {
    console.log('Starting translation extraction and audit...');

    // 1. Read existing translations from src/lib/i18n.tsx
    if (!fs.existsSync(I18N_PATH)) {
        console.error(`Error: i18n file not found at ${I18N_PATH}`);
        process.exit(1);
    }
    const i18nContent = fs.readFileSync(I18N_PATH, 'utf8');
    
    // Find dictionaries.en block
    const enStartIndex = i18nContent.indexOf('en: {');
    if (enStartIndex === -1) {
        console.error('Error: Could not find "en: {" block in i18n.tsx');
        process.exit(1);
    }
    
    // Match matching braces
    let braceCount = 1;
    let enEndIndex = -1;
    const startSearchIndex = enStartIndex + 'en: {'.length;
    for (let i = startSearchIndex; i < i18nContent.length; i++) {
        if (i18nContent[i] === '{') {
            braceCount++;
        } else if (i18nContent[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                enEndIndex = i;
                break;
            }
        }
    }
    
    if (enEndIndex === -1) {
        console.error('Error: Could not find closing brace for "en: {" block');
        process.exit(1);
    }
    
    const enBlockContent = i18nContent.substring(startSearchIndex, enEndIndex);
    
    // Parse key-value pairs from en block
    const pairRegex = /"((?:[^"\\]|\\.)*)"\s*:\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')/g;
    const existingTranslations = {};
    let match;
    while ((match = pairRegex.exec(enBlockContent)) !== null) {
        const rawKey = match[1];
        const rawVal = match[2] || match[3];
        const key = unescapeStringLiteral(rawKey, '"');
        const val = unescapeStringLiteral(rawVal, match[2] ? '"' : "'");
        existingTranslations[key] = val;
    }
    
    console.log(`Loaded ${Object.keys(existingTranslations).length} existing translation keys from i18n.tsx`);

    // 2. Scan project files (excluding i18n.tsx)
    const files = getFiles(SRC_DIR).filter(f => f !== I18N_PATH);
    
    const usedKeys = new Set();
    const unwrappedArabic = []; // { file, line, text }
    
    files.forEach((file) => {
        const relativePath = path.relative(SRC_DIR, file).replace(/\\/g, '/');
        const content = fs.readFileSync(file, 'utf8');
        const cleanContent = stripComments(content);
        
        // A. Find all t(...) calls
        // Matches t("key") or t('key') or t(`key`)
        const tCallRegex = /\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`((?:[^`\\]|\\.)*)`)\s*\)/g;
        let tMatch;
        const tRanges = [];
        while ((tMatch = tCallRegex.exec(cleanContent)) !== null) {
            const quote = tMatch[1] ? '"' : (tMatch[2] ? "'" : '`');
            const rawKey = tMatch[1] || tMatch[2] || tMatch[3];
            if (rawKey) {
                const key = unescapeStringLiteral(rawKey, quote);
                usedKeys.add(key);
                tRanges.push({
                    start: tMatch.index,
                    end: tMatch.index + tMatch[0].length,
                    key: key
                });
            }
        }
        
        // B. Find all Arabic text in the file
        // For each Arabic text match, check if it's wrapped in a t() call
        let arMatch;
        while ((arMatch = ARABIC_PHRASE_REGEX.exec(cleanContent)) !== null) {
            const text = arMatch[0].trim();
            if (!text) continue;
            
            const startIdx = arMatch.index;
            const endIdx = arMatch.index + arMatch[0].length;
            
            // Check if this range is inside any of the t(...) ranges
            const isWrapped = tRanges.some(r => startIdx >= r.start && endIdx <= r.end);
            
            if (!isWrapped) {
                // Find line number
                const lineNum = content.substring(0, startIdx).split('\n').length;
                unwrappedArabic.push({
                    file: relativePath,
                    line: lineNum,
                    text: text
                });
            }
        }
    });
    
    console.log(`Found ${usedKeys.size} distinct keys used in t() calls`);
    console.log(`Found ${unwrappedArabic.length} instances of unwrapped Arabic text`);

    // 3. Find missing and unused keys
    const missingKeys = [];
    usedKeys.forEach((key) => {
        if (!(key in existingTranslations)) {
            missingKeys.push(key);
        }
    });
    
    const unusedKeys = [];
    Object.keys(existingTranslations).forEach((key) => {
        if (!usedKeys.has(key)) {
            unusedKeys.push(key);
        }
    });

    console.log(`Missing keys (used in code but not in i18n): ${missingKeys.length}`);
    console.log(`Unused keys (in i18n but not found in code): ${unusedKeys.length}`);

    // 4. If there are missing keys, let's automatically merge them!
    let mergedCount = 0;
    let updatedI18nContent = i18nContent;
    
    if (missingKeys.length > 0) {
        // Prepare the new entries block
        let newEntriesStr = '\n\n        // --- Auto-synced Keys (Missing in Code) ---\n';
        missingKeys.forEach((key) => {
            // Escape backslashes, double quotes, and newlines in key/translation
            const escapedKey = key
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
            const defaultTranslation = COMMON_TRANSLATIONS[key] || key;
            const escapedTranslation = defaultTranslation
                .replace(/\\/g, '\\\\')
                .replace(/"/g, '\\"')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r');
            newEntriesStr += `        "${escapedKey}": "${escapedTranslation}",\n`;
            mergedCount++;
        });
        
        // We will insert newEntriesStr right before the closing brace of en block
        // enEndIndex is the index of '}' of the en: { ... } block
        updatedI18nContent = i18nContent.substring(0, enEndIndex) + newEntriesStr + i18nContent.substring(enEndIndex);
        
        fs.writeFileSync(I18N_PATH, updatedI18nContent, 'utf8');
        console.log(`Successfully merged ${mergedCount} missing keys into ${I18N_PATH}`);
    }

    // 5. Generate Audit Report
    const reportDir = path.dirname(AUDIT_REPORT_PATH);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    let reportMd = `# Translation Audit Report\n\n`;
    reportMd += `Generated on: ${new Date().toISOString()}\n\n`;
    
    reportMd += `## Summary\n\n`;
    reportMd += `- **Total Keys in \`i18n.tsx\`**: ${Object.keys(existingTranslations).length}\n`;
    reportMd += `- **Total t() Keys in Code**: ${usedKeys.size}\n`;
    reportMd += `- **Missing Keys (Auto-merged)**: ${missingKeys.length}\n`;
    reportMd += `- **Unused Keys in \`i18n.tsx\`**: ${unusedKeys.length}\n`;
    reportMd += `- **Unwrapped Arabic Text Instances**: ${unwrappedArabic.length}\n\n`;
    
    if (missingKeys.length > 0) {
        reportMd += `## Missing Keys (Auto-merged)\n\n`;
        reportMd += `These keys were found in \`t()\` calls in the code but were missing from \`i18n.tsx\`. They have been automatically added to \`i18n.tsx\`'s \`dictionaries.en\` so they can be translated.\n\n`;
        reportMd += `| Arabic Key | Auto-translated / Placeholder |\n`;
        reportMd += `| --- | --- |\n`;
        missingKeys.forEach((key) => {
            const translation = COMMON_TRANSLATIONS[key] || `*${key}*`;
            reportMd += `| \`${key}\` | \`${translation}\` |\n`;
        });
        reportMd += `\n`;
    }
    
    if (unwrappedArabic.length > 0) {
        reportMd += `## Unwrapped Arabic Text\n\n`;
        reportMd += `These are raw Arabic strings found in code files that are NOT wrapped in a \`t()\` call. Developers should wrap these in \`t()\` to support localization.\n\n`;
        
        // Group by file
        const grouped = {};
        unwrappedArabic.forEach((item) => {
            if (!grouped[item.file]) grouped[item.file] = [];
            grouped[item.file].push(item);
        });
        
        Object.keys(grouped).forEach((file) => {
            reportMd += `### [${file}](file:///c:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/${file})\n`;
            grouped[file].forEach((item) => {
                reportMd += `- Line ${item.line}: \`${item.text}\`\n`;
            });
            reportMd += `\n`;
        });
    }
    
    if (unusedKeys.length > 0) {
        reportMd += `## Unused Keys in i18n.tsx\n\n`;
        reportMd += `These keys exist in \`i18n.tsx\` but were not found in any \`t()\` calls. They can potentially be cleaned up.\n\n`;
        unusedKeys.forEach((key) => {
            reportMd += `- \`${key}\`\n`;
        });
        reportMd += `\n`;
    }
    
    fs.writeFileSync(AUDIT_REPORT_PATH, reportMd, 'utf8');
    console.log(`Audit report generated at ${AUDIT_REPORT_PATH}`);
}

main();
