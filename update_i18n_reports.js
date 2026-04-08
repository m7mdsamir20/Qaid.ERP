const fs = require('fs');
const path = require('path');

const i18nPath = 'src/lib/i18n.tsx';
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

function addKey(key, translation) {
    if (i18nContent.includes(`"${key}":`)) return;
    const insertPoint = i18nContent.lastIndexOf('}');
    const newEntry = `        "${key}": "${translation}",\n`;
    i18nContent = i18nContent.slice(0, insertPoint) + newEntry + i18nContent.slice(insertPoint);
}

const translations = {
    // Financial
    "كشف الحساب (دفتر الأستاذ)": "Account Statement (General Ledger)",
    "تتبع حركات أي حساب (مدين/دائن) خلال فترة زمنية محددة مع الرصيد": "Track movements of any account (debit/credit) during a specific period with balance",
    "التقرير اليومي": "Daily Report",
    "ملخص شامل لجميع حركات اليوم (خدمات، مشتريات، سندات)": "Comprehensive summary of all daily movements (services, purchases, vouchers)",
    "ملخص شامل لجميع حركات اليوم (مبيعات، مشتريات، سندات)": "Comprehensive summary of all daily movements (sales, purchases, vouchers)",
    "ميزان المراجعة": "Trial Balance",
    "أرصدة جميع الحسابات المدينة والدائنة": "Balances of all debit and credit accounts",
    "قائمة الدخل": "Income Statement",
    "تحليل الإيرادات والمصروفات وصافي الربح": "Analysis of revenues, expenses, and net profit",
    "المركز المالي": "Financial Position",
    "ملخص الأصول والخصوم وحقوق الملكية": "Summary of assets, liabilities, and equity",
    "الميزانية العمومية": "Balance Sheet",
    "تفاصيل دقيقة وشاملة للمركز المالي": "Accurate and comprehensive details of financial position",
    "تقرير الأصول الثابتة": "Fixed Assets Report",
    "كشف تفصيلي بالأصول — التكلفة التاريخية ومجمع الإهلاك والقيمة الدفترية": "Detailed statement of assets — historical cost, accumulated depreciation, and book value",
    "قائمة التدفق النقدي": "Cash Flow Statement",
    "حركة السيولة والتحليل النقدي الشامل": "Liquidity movement and comprehensive cash analysis",

    // Sales/Purchases
    "تقرير الخدمات": "Services Report",
    "تقرير المبيعات": "Sales Report",
    "حركة طلب الخدمات خلال فترة زمنية": "Services demand movement during a period",
    "حركة المبيعات خلال فترة زمنية": "Sales movement during a period",
    "تقرير المشتريات": "Purchases Report",
    "إجمالي المشتريات وتفاصيل الفواتير": "Total purchases and invoice details",
    "أكثر الخدمات طلباً": "Most Demanded Services",
    "أكثر الأصناف مبيعاً": "Top Selling Items",
    "الخدمات الأعلى طلباً في المنشأة": "The most demanded services in the facility",
    "المنتجات الأعلى حركة طلباً ومبيعاً": "Products with the highest demand and sales activity",
    "مرتجعات الخدمات": "Services Returns",
    "تقرير المرتجعات": "Returns Report",
    "تحليل مرتجعات الخدمات لمعرفة الأسباب": "Analysis of services returns to identify reasons",
    "تحليل المرتجعات لمعرفة أسباب الخسارة": "Analysis of returns to identify loss reasons",

    // Inventory
    "قائمة الخدمات": "Services List",
    "تقرير المخزون": "Inventory Report",
    "قائمة جميع الخدمات المسجلة وأسعارها": "List of all registered services and their prices",
    "حالة المخازن وأرصدة الأصناف والجرد": "Warehouse status, item balances, and inventory",
    "تصنيفات الخدمات": "Services Categories",
    "حركات المخزون": "Inventory Movements",
    "عرض الخدمات حسب التصنيفات": "Display services by categories",
    "سجل شامل لجميع عمليات الصرف والتوريد والتحويل المخزني": "Comprehensive record of all issuance, supply, and warehouse transfer operations",
    "إحصائيات الخدمات": "Services Statistics",
    "حركة صنف": "Item Movement",
    "تحليل حركة طلب خدمة معينة": "Analysis of a specific service request movement",
    "مراقبة الصادر والوارد لصنف معين ككارتة صنف": "Monitor incoming and outgoing for a specific item as an item card",
    "أصناف تحت الحد الأدنى": "Items Below Minimum Limit",
    "تنبيهات الأصناف التي تجاوزت حد إعادة الطلب": "Alerts for items that exceeded the reorder limit",

    // Partners
    "أرصدة العملاء والموردين": "Customers and Suppliers Balances",
    "تقرير إجمالي لجميع العملاء والموردين يعرض من عليه أموال ومن له مستحقات": "Total report for all customers and suppliers showing who owes money and who is owed",
    "كشف حساب عميل": "Customer Statement",
    "تفاصيل مدفوعات ومديونيات العميل": "Customer payments and debts details",
    "كشف حساب مورد": "Supplier Statement",
    "حركة الحساب المالي الجاري للمورد": "Supplier current financial account movement",
    "أعمار الديون": "Aging Report",
    "تأخيرات السداد والمستحقات الزمنية": "Payment delays and temporal dues",

    // Treasury
    "كشف حركة الخزينة": "Treasury Statement",
    "سجل حركات النقدية اليومي مع رصيد ما قبل وما بعد كل حركة": "Daily cash movement record with balance before and after each movement",
    "كشف حساب بنكي": "Bank Statement",
    "تحليل حركات الحساب البنكي والتحويلات والخدمات البنكية": "Analysis of bank account movements, transfers, and banking services",
    "تقرير العجز والزيادة": "Deficit and Surplus Report",
    "مقارنة الرصيد الدفتري بالرصيد الفعلي عند الجرد اليومي": "Compare book balance with actual balance during daily inventory",
    "تقرير المصروفات": "Expenses Report",
    "عرض تفصيلي لجميع المصروفات المسجلة خلال فترة زمنية محددة": "Detailed display of all registered expenses during a specific period",

    // HR
    "كشف رواتب الموظفين": "Employees Payroll Statement",
    "تفاصيل مسيرات الرواتب، البدلات، والاستقطاعات لكل شهر": "Payroll details, allowances, and deductions for each month",
    "تقرير السلف والمديونيات": "Advances and Debts Report",
    "متابعة سلف الموظفين والأرصدة المتبقية وتاريخ السداد": "Follow up on employee advances, remaining balances, and payment date",
    "سجل الخصومات والجزاءات": "Deductions and Penalties Record",
    "كشف شامل بجميع الجزاءات والخصومات الموقعة خلال الفترة": "Comprehensive statement of all penalties and deductions signed during the period",
    "بيانات الموظفين والأقسام": "Employees and Departments Data",
    "قائمة شاملة بجميع الموظفين وتبعيتهم للأقسام وحالتهم الوظيفية": "Comprehensive list of all employees and their affiliation with departments and job status",

    // Installments
    "تقارير التحصيل": "Collection Reports",
    "متابعة المبالغ المحصلة من الأقساط خلال فترة زمنية محددة": "Follow up on amounts collected from installments during a specific period",
    "تقرير المتأخرات الشامل": "Comprehensive Overdue Report",
    "كشف بجميع المديونيات المتأخرة وحساب أيام التأخير لكل عميل": "Statement of all overdue debts and calculation of delay days for each customer",
    "كشف حساب أقساط عميل": "Customer Installment Statement",
    "ملخص شامل لكل خطط التقسيط الخاصة بعميل معين وتفاصيل سداده": "Comprehensive summary of all installment plans for a specific customer and their payment details",

    // Tabs
    "التقارير المالية": "Financial Reports",
    "الخدمات والمشتريات": "Services and Purchases",
    "المبيعات والمشتريات": "Sales and Purchases",
    "تقارير الخدمات": "Services Reports",
    "تقارير المخزون": "Inventory Reports",
    "العملاء والموردين": "Customers and Suppliers",
    "تقارير العملاء": "Customers Reports",
    "تقارير الموردين": "Suppliers Reports",
    "تقارير الموظفين": "Employees Reports",
    "تقارير الأقساط": "Installments Reports",
    "لا تملك صلاحيات لعرض أي تقارير في هذا القسم.": "You do not have permissions to view any reports in this section.",
    "التقارير الشاملة": "Comprehensive Reports",
    "الواجهة المركزية لمنظومة تقارير النظام. تصفح وحلل كافة البيانات المالية والإدارية بدقة عالية.": "Central interface for system reporting. Browse and analyze all financial and administrative data with high accuracy.",
};

Object.entries(translations).forEach(([k, v]) => addKey(k, v));
fs.writeFileSync(i18nPath, i18nContent);
console.log('Added 60+ report translations to i18n.tsx');
