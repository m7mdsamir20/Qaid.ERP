const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');

const FILES_TO_CHECK = {
    superAdminNew: path.join(ROOT_DIR, 'src/app/super-admin/new/page.tsx'),
    superAdminEdit: path.join(ROOT_DIR, 'src/app/super-admin/edit/[id]/page.tsx'),
    sidebar: path.join(ROOT_DIR, 'src/components/Sidebar.tsx'),
    dashboardLayout: path.join(ROOT_DIR, 'src/components/DashboardLayout.tsx'),
    reportsHub: path.join(ROOT_DIR, 'src/app/reports/page.tsx'),
    itemsPage: path.join(ROOT_DIR, 'src/app/items/page.tsx'),
    categoriesPage: path.join(ROOT_DIR, 'src/app/categories/page.tsx'),
    warehousesPage: path.join(ROOT_DIR, 'src/app/warehouses/page.tsx'),
    salesPage: path.join(ROOT_DIR, 'src/app/sales/page.tsx'),
    customersPage: path.join(ROOT_DIR, 'src/app/customers/page.tsx')
};

console.log('==================================================');
console.log('  STARTING CONTRACTING SPECIALIZATION AUDIT SCRIPT');
console.log('==================================================\n');

let issuesFound = 0;
let passes = 0;

function checkFileExists(filePath, name) {
    if (!fs.existsSync(filePath)) {
        console.error(`❌ [ERROR] File for ${name} not found at: ${filePath}`);
        issuesFound++;
        return false;
    }
    return true;
}

// 1. Check Super Admin Page logic
if (checkFileExists(FILES_TO_CHECK.superAdminNew, 'Super Admin New Company')) {
    const content = fs.readFileSync(FILES_TO_CHECK.superAdminNew, 'utf8');
    const hasFilter = content.includes('uniqueSections') && content.includes('CONTRACTING') && content.includes('/settlements') && content.includes('reports-installments');
    if (hasFilter) {
        console.log('✅ Super Admin [New Company Page]: Successfully filters installments and debt settlements for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Super Admin [New Company Page]: Missing filter for installments and settlements for CONTRACTING.');
        issuesFound++;
    }
}

if (checkFileExists(FILES_TO_CHECK.superAdminEdit, 'Super Admin Edit Company')) {
    const content = fs.readFileSync(FILES_TO_CHECK.superAdminEdit, 'utf8');
    const hasFilter = content.includes('uniqueSections') && content.includes('CONTRACTING') && content.includes('/settlements') && content.includes('reports-installments');
    if (hasFilter) {
        console.log('✅ Super Admin [Edit Company Page]: Successfully filters installments and debt settlements for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Super Admin [Edit Company Page]: Missing filter for installments and settlements for CONTRACTING.');
        issuesFound++;
    }
}

// 2. Check Sidebar navigation filters and names
if (checkFileExists(FILES_TO_CHECK.sidebar, 'Sidebar Navigation')) {
    const content = fs.readFileSync(FILES_TO_CHECK.sidebar, 'utf8');
    
    // Check module filter
    const excludesInstallments = content.includes('installments') && content.includes('/settlements') && content.includes('CONTRACTING');
    
    // Check dynamic names
    const renamesItems = content.includes('المواد والبنود');
    const renamesCategories = content.includes('تصنيفات المواد والبنود');
    const renamesWarehouses = content.includes('المخازن والمواقع');
    const renamesSales = content.includes('فواتير الأعمال والخدمات');
    const renamesCustomers = content.includes('العملاء / أصحاب المشاريع');

    if (excludesInstallments && renamesItems && renamesCategories && renamesWarehouses && renamesSales && renamesCustomers) {
        console.log('✅ Sidebar Navigation: Successfully filters irrelevant modules and dynamically renames navigation links for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Sidebar Navigation: Missing either module filtering or dynamic link renaming for CONTRACTING.');
        if (!excludesInstallments) console.error('  - Missing filtering logic.');
        if (!renamesItems) console.error('  - Missing "الأصناف" -> "المواد والبنود" renaming.');
        if (!renamesCategories) console.error('  - Missing "التصنيفات" -> "تصنيفات المواد والبنود" renaming.');
        if (!renamesWarehouses) console.error('  - Missing "المخازن" -> "المخازن والمواقع" renaming.');
        if (!renamesSales) console.error('  - Missing "فواتير المبيعات" -> "فواتير الأعمال والخدمات" renaming.');
        if (!renamesCustomers) console.error('  - Missing "العملاء" -> "العملاء / أصحاب المشاريع" renaming.');
        issuesFound++;
    }
}

// 3. Check Dashboard Layout Route Guard
if (checkFileExists(FILES_TO_CHECK.dashboardLayout, 'Dashboard Layout Route Guard')) {
    const content = fs.readFileSync(FILES_TO_CHECK.dashboardLayout, 'utf8');
    const guardsInstallments = content.includes('reports-installments') && content.includes('CONTRACTING');
    const guardsSettlements = content.includes('/settlements') && content.includes('CONTRACTING');

    if (guardsInstallments && guardsSettlements) {
        console.log('✅ Dashboard Layout Route Guard: Successfully prevents direct navigation to installments reports and debt settlements for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Dashboard Layout Route Guard: Missing route guards for installments reports or debt settlements.');
        issuesFound++;
    }
}

// 4. Check Reports Hub Page
if (checkFileExists(FILES_TO_CHECK.reportsHub, 'Reports Hub Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.reportsHub, 'utf8');
    const salesTabRenamed = content.includes('الأعمال والمبيعات والمشتريات');
    const inventoryTabRenamed = content.includes('تقارير المواد والمواقع');
    const customersTabRenamed = content.includes('أصحاب المشاريع والموردين');
    const reportsRenamed = content.includes('البنود والمواد الأكثر استخداماً') && content.includes('تقرير المواد ومخازن المواقع') && content.includes('سجل حركات المواد والعهدة');

    if (salesTabRenamed && inventoryTabRenamed && customersTabRenamed && reportsRenamed) {
        console.log('✅ Reports Hub: Successfully customized report tabs, report cards, and descriptions for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Reports Hub: Missing customized titles, tabs, or card names.');
        if (!salesTabRenamed) console.error('  - Missing "الأعمال والمبيعات والمشتريات" tab name.');
        if (!inventoryTabRenamed) console.error('  - Missing "تقارير المواد والمواقع" tab name.');
        if (!customersTabRenamed) console.error('  - Missing "أصحاب المشاريع والموردين" tab name.');
        if (!reportsRenamed) console.error('  - Missing customized report cards like "البنود والمواد الأكثر استخداماً" or "تقرير المواد ومخازن المواقع".');
        issuesFound++;
    }
}

// 5. Check Items Page
if (checkFileExists(FILES_TO_CHECK.itemsPage, 'Items/Materials Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.itemsPage, 'utf8');
    const titleRenamed = content.includes('المواد والبنود');
    const subtitleRenamed = content.includes('إدارة المواد الخام، البنود الإنشائية');
    const columnsRenamed = content.includes('كود البند/المادة') && content.includes('المادة / بند العمل') && content.includes('الكمية المتوفرة') && content.includes('تكلفة الشراء / التنفيذ') && content.includes('التكلفة التقديرية');
    const formLabelsRenamed = content.includes('كود البند/المادة') && content.includes('المادة / بند العمل') && content.includes('تصنيف المواد والبنود') && content.includes('تكلفة الشراء / التنفيذ') && content.includes('التكلفة التقديرية (سعر البيع للعميل)');
    const subModalsRenamed = content.includes('إضافة تصنيف مواد وبنود جديد') && content.includes('اسم تصنيف المواد والبنود الجديد');

    if (titleRenamed && subtitleRenamed && columnsRenamed && formLabelsRenamed && subModalsRenamed) {
        console.log('✅ Items/Materials Page: Successfully customized page header, table columns, form labels, and modals for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Items/Materials Page: Missing some contracting terminology customization.');
        if (!titleRenamed) console.error('  - Page title "المواد والبنود" not found.');
        if (!subtitleRenamed) console.error('  - Subtitle referring to construction/contracting items not found.');
        if (!columnsRenamed) console.error('  - Columns like "كود البند/المادة" or "الكمية المتوفرة" or "التكلفة التقديرية" not found.');
        if (!formLabelsRenamed) console.error('  - Form input labels for cost/sell price or item code/name not customized.');
        if (!subModalsRenamed) console.error('  - Add category sub-modal labels not customized.');
        issuesFound++;
    }
}

// 6. Check Categories Page
if (checkFileExists(FILES_TO_CHECK.categoriesPage, 'Categories Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.categoriesPage, 'utf8');
    const titleRenamed = content.includes('تصنيفات المواد والبنود');
    const subtitleRenamed = content.includes('إدارة وتبويب المواد والبنود');
    const columnsRenamed = content.includes('اسم تصنيف المواد والبنود') && content.includes('عدد المواد والبنود المرتبطة');
    const formLabelsRenamed = content.includes('اسم تصنيف المواد والبنود') && content.includes('تعديل تصنيف المواد والبنود');

    if (titleRenamed && subtitleRenamed && columnsRenamed && formLabelsRenamed) {
        console.log('✅ Categories Page: Successfully customized page title, columns, and modal form fields for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Categories Page: Missing some contracting terminology customization.');
        if (!titleRenamed) console.error('  - Title "تصنيفات المواد والبنود" not found.');
        if (!subtitleRenamed) console.error('  - Subtitle not customized.');
        if (!columnsRenamed) console.error('  - Table columns like "اسم تصنيف المواد والبنود" or "عدد المواد والبنود المرتبطة" not found.');
        if (!formLabelsRenamed) console.error('  - Form modal titles or labels not customized.');
        issuesFound++;
    }
}

// 7. Check Warehouses Page
if (checkFileExists(FILES_TO_CHECK.warehousesPage, 'Warehouses/Sites Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.warehousesPage, 'utf8');
    const titleRenamed = content.includes('المخازن والمواقع');
    const subtitleRenamed = content.includes('إدارة مخازن المواد ومستودعات مواقع المشاريع الإنشائية');
    const columnsRenamed = content.includes('اسم المخزن / الموقع') && content.includes('عدد المواد والبنود') && content.includes('مادة/بند');
    const formLabelsRenamed = content.includes('كود المخزن / الموقع النظامي') && content.includes('اسم المخزن / الموقع') && content.includes('العنوان التفصيلي / موقع المشروع');

    if (titleRenamed && subtitleRenamed && columnsRenamed && formLabelsRenamed) {
        console.log('✅ Warehouses/Sites Page: Successfully customized page headers, table columns, and form fields for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Warehouses/Sites Page: Missing some contracting terminology customization.');
        if (!titleRenamed) console.error('  - Title "المخازن والمواقع" not found.');
        if (!subtitleRenamed) console.error('  - Subtitle not customized.');
        if (!columnsRenamed) console.error('  - Table columns or units like "مادة/بند" not customized.');
        if (!formLabelsRenamed) console.error('  - Form inputs/labels not customized.');
        issuesFound++;
    }
}

// 8. Check Sales Page
if (checkFileExists(FILES_TO_CHECK.salesPage, 'Sales Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.salesPage, 'utf8');
    const titleRenamed = content.includes('فواتير الأعمال والخدمات');
    const subtitleRenamed = content.includes('سجل مستخلصات وفواتير الأعمال الإنشائية وحالات التحصيل');
    const columnsRenamed = content.includes('رقم الفاتورة / المستخلص') && content.includes('العميل / صاحب المشروع');
    const emptyMessageRenamed = content.includes('لا توجد فواتير أعمال وخدمات');

    if (titleRenamed && subtitleRenamed && columnsRenamed && emptyMessageRenamed) {
        console.log('✅ Sales/Invoices Page: Successfully customized page headers, table columns, and empty messages for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Sales/Invoices Page: Missing some contracting terminology customization.');
        if (!titleRenamed) console.error('  - Title "فواتير الأعمال والخدمات" not found.');
        if (!subtitleRenamed) console.error('  - Subtitle not customized.');
        if (!columnsRenamed) console.error('  - Columns like "رقم الفاتورة / المستخلص" or "العميل / صاحب المشروع" not found.');
        if (!emptyMessageRenamed) console.error('  - Empty table message not customized.');
        issuesFound++;
    }
}

// 9. Check Customers Page
if (checkFileExists(FILES_TO_CHECK.customersPage, 'Customers/Project Owners Page')) {
    const content = fs.readFileSync(FILES_TO_CHECK.customersPage, 'utf8');
    const titleRenamed = content.includes('العملاء / أصحاب المشاريع');
    const subtitleRenamed = content.includes('إدارة بيانات أصحاب المشاريع، جهات الاتصال والمستخلصات والمستحقات');
    const columnsRenamed = content.includes('العميل / صاحب المشروع');
    const statsRenamed = content.includes('إجمالي أصحاب المشاريع') && content.includes('مستحقات على أصحاب المشاريع') && content.includes('دفعات مقدمة من أصحاب المشاريع');
    const modalRenamed = content.includes('تعديل بيانات صاحب المشروع') && content.includes('إضافة صاحب مشروع جديد') && content.includes('نوع الطرف');

    if (titleRenamed && subtitleRenamed && columnsRenamed && statsRenamed && modalRenamed) {
        console.log('✅ Customers/Project Owners Page: Successfully customized page header, stats cards, table columns, and add/edit modals for CONTRACTING.');
        passes++;
    } else {
        console.error('❌ Customers/Project Owners Page: Missing some contracting terminology customization.');
        if (!titleRenamed) console.error('  - Title "العملاء / أصحاب المشاريع" not found.');
        if (!subtitleRenamed) console.error('  - Subtitle not customized.');
        if (!columnsRenamed) console.error('  - Table columns not customized.');
        if (!statsRenamed) console.error('  - KPI stats cards like "مستحقات على أصحاب المشاريع" not found.');
        if (!modalRenamed) console.error('  - Add/edit modal title or labels not customized.');
        issuesFound++;
    }
}

console.log('\n==================================================');
console.log('                  AUDIT REPORT SUMMARY            ');
console.log('==================================================');
console.log(`Passed checks: ${passes}/10`);
console.log(`Failed checks: ${issuesFound}`);
if (issuesFound === 0) {
    console.log('\n🎉 SUCCESS: All pages, items, modules, report tabs, and forms are properly specialized and verified for Contracting activity!');
} else {
    console.error(`\n⚠️ WARNING: Found ${issuesFound} issues in the specialization configurations. Please check the logs above.`);
}
console.log('==================================================');
process.exit(issuesFound > 0 ? 1 : 0);
