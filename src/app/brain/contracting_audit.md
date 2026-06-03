# Contracting (نشاط المقاولات) Activity Configuration Audit Report

This report lists the pages, sidebar modules, super admin module assignment, and Arabic terminology usage for the **Contracting** business activity.

## 1. Super Admin Module Assignment
- **New Company Form modules**: `projects, subcontractors, sales, purchases, inventory, accounting, treasury, hr, reports`
- **Edit Company Form modules**: `projects, subcontractors, sales, purchases, inventory, accounting, treasury, hr, reports`
- **Configs Match**: ✅ Yes

## 2. Navigation Sections (from navigation.ts)
All defined navigation sections and their feature keys:

| Section Title | Feature Key | Status for Contracting |
| --- | --- | --- |
| الرئيسية | `dashboard` | Included |
| نقطة البيع (POS) | `pos` | Excluded (Filtered in Sidebar / Super Admin) |
| الطاولات والصالة | `tables` | Excluded (Restaurant features) |
| المطبخ | `kitchen` | Excluded (Restaurant features) |
| التوصيل | `delivery` | Excluded (Restaurant features) |
| باركود وQR الطاولات | `barcode` | Excluded (Filtered in Sidebar / Super Admin) |
| المشاريع | `projects` | ⭐ Contracting Core Feature |
| مقاولين الباطن | `subcontractors` | ⭐ Contracting Core Feature |
| المبيعات | `sales` | Included |
| الأقساط | `installments` | Excluded (Filtered in Sidebar / Super Admin) |
| المشتريات | `purchases` | Included |
| إدارة المخزون | `inventory` | Included |
| الحسابات العامة | `accounting` | Included |
| الخزن والبنوك | `treasury` | Included |
| القيود | `accounting` | Included |
| الموارد البشرية | `hr` | Included |
| الشركاء | `partners` | Included |
| الأصول الثابتة | `fixed_assets` | Included |
| التقارير الإحصائية | `reports` | Included |
| إعدادات النظام | `settings` | Included |

## 3. Sidebar Filtering for Contracting
Below is the filter logic applied to the Contracting activity in the sidebar:
```typescript
businessType === 'CONTRACTING') {
                if (section.featureKey === 'installments') return null;
                if (section.featureKey === 'sales') {
                    section.links = section.links?.filter((l: any) => !['/coupons', '/sale-returns'].includes(l.id));
                }
```

## 4. App Page Titles & Naming Inspection
Below is the list of active pages under `src/app` with their rendered titles:

| Page Path | Rendered Title | Contracting Terminology Notes |
| --- | --- | --- |
| `accounts/new/page.tsx` | إضافة حساب جديد | Generic |
| `accounts/page.tsx` | تعديل | Generic |
| `advances/page.tsx` | سلف الموظفين | Generic |
| `advances/[id]/page.tsx` | {t('تفاصيل سلفة الموظف')} | Generic |
| `barcode/page.tsx` | باركود وQR الطاولات | Restaurant / POS (Excluded in Sidebar) |
| `capital/page.tsx` | زيادة | Generic |
| `categories/page.tsx` | تعديل | Generic |
| `closing-entries/page.tsx` | قيود الإقفال | Generic |
| `cost-centers/page.tsx` | مراكز التكلفة | Generic |
| `cost-centers/[id]/page.tsx` | طباعة | Generic |
| `coupons/page.tsx` | كوبونات الخصم | Generic |
| `customers/page.tsx` | العملاء | Generic |
| `customers/[id]/page.tsx` | {isServices ? t('كشف خدمات العميل') : t('كشف حركة العميل')} | Generic |
| `deductions/page.tsx` | جزاءات وخصومات الموظفين | Generic |
| `deductions/[id]/page.tsx` | {t('تفاصيل الخصم / الجزاء')} | Generic |
| `delivery/apps/page.tsx` | تطبيقات التوصيل (Aggregators) | Restaurant / POS (Excluded in Sidebar) |
| `delivery/page.tsx` | إدارة التوصيل | Restaurant / POS (Excluded in Sidebar) |
| `departments/page.tsx` | الأقسام والوظائف | Generic |
| `due-installments/page.tsx` | الأقساط المستحقة | Installments (Excluded in Sidebar) |
| `employees/new/edit/page.tsx` | تعديل بيانات الموظف | Generic |
| `employees/new/page.tsx` | إضافة موظف | Generic |
| `employees/page.tsx` | الموظفين | Generic |
| `employees/[id]/edit/page.tsx` | تعديل الموظف | Generic |
| `employees/[id]/page.tsx` | ملف الموظف | Generic |
| `expenses/page.tsx` | المصروفات | Generic |
| `financial-years/page.tsx` | السنة المالية | Generic |
| `fixed-assets/depreciation/page.tsx` | احتساب قيود الإهلاك للفترة | Generic |
| `fixed-assets/disposals/page.tsx` | استبعاد ومبيعات الأصول | Generic |
| `fixed-assets/new/page.tsx` | إضافة أصل ثابت جديد | Generic |
| `fixed-assets/page.tsx` | الرصيد الدفتري للأصول | Generic |
| `general-ledger/page.tsx` | Not found | Generic |
| `installments/new/page.tsx` | إنشاء خطة تقسيط جديدة | Installments (Excluded in Sidebar) |
| `installments/page.tsx` | خطط التقسيط | Installments (Excluded in Sidebar) |
| `installments/[id]/page.tsx` | طباعة سند قبض | Installments (Excluded in Sidebar) |
| `items/page.tsx` | طباعة باركود | Generic |
| `journal-entries/page.tsx` | Not found | Generic |
| `kds/page.tsx` | الخروج للنظام | Restaurant / POS (Excluded in Sidebar) |
| `kitchen/page.tsx` | Not found | Generic |
| `menu/[companyId]/page.tsx` | Not found | Generic |
| `modifiers/page.tsx` | الإضافات والتعديلات | Restaurant / POS (Excluded in Sidebar) |
| `opening-balances/page.tsx` | الأرصدة الافتتاحية | Generic |
| `other-income/page.tsx` | الإيرادات | Generic |
| `overdue-installments/page.tsx` | المتأخرات وحالات التعثر | Installments (Excluded in Sidebar) |
| `page.tsx` | أكبر مستحقات مقاولي الباطن | Generic |
| `partner-accounts/page.tsx` | حسابات الشركاء | Generic |
| `partners/page.tsx` | بيانات الشركاء | Generic |
| `payments/new/page.tsx` | سند صرف جديد | Generic |
| `payments/page.tsx` | سندات الصرف | Generic |
| `payrolls/page.tsx` | مسيرات الرواتب | Generic |
| `payrolls/[id]/page.tsx` | اعتماد وصرف المسير | Generic |
| `pos/customer/page.tsx` | شكراً لزيارتكم! | Restaurant / POS (Excluded in Sidebar) |
| `pos/history/page.tsx` | الطلبات | Restaurant / POS (Excluded in Sidebar) |
| `pos/page.tsx` | بون تحضير | Restaurant / POS (Excluded in Sidebar) |
| `print/installment/[id]/page.tsx` | Not found | Generic |
| `print/installment-receipt/page.tsx` | Not found | Generic |
| `print/invoice/[id]/page.tsx` | Not found | Generic |
| `print/quotation/[id]/page.tsx` | Not found | Generic |
| `print/report/page.tsx` | Not found | Generic |
| `print/voucher/[id]/page.tsx` | Not found | Generic |
| `profile/page.tsx` | {t('الملف الشخصي')} | Generic |
| `profile/password/page.tsx` | {t('تغيير كلمة المرور')} | Generic |
| `profit-distribution/page.tsx` | توزيع الأرباح | Generic |
| `progress-bills/page.tsx` | مستخلصات المالك | Contracting (Progress Bills / مستخلصات) |
| `projects/edit/[id]/page.tsx` | تعديل بيانات المشروع | Contracting (Projects) |
| `projects/new/page.tsx` | إنشاء مشروع جديد | Contracting (Projects) |
| `projects/page.tsx` | المشاريع | Contracting (Projects) |
| `projects/[id]/page.tsx` | إضافة مرحلة عمل جديدة | Contracting (Projects) |
| `purchase-payments/new/page.tsx` | سند صرف جديد | Generic |
| `purchase-payments/page.tsx` | سندات الصرف | Generic |
| `purchase-returns/new/page.tsx` | مرتجع مشتريات جديد | Generic |
| `purchase-returns/page.tsx` | مرتجعات المشتريات | Generic |
| `purchases/new/page.tsx` | فاتورة مشتريات جديدة | Generic |
| `purchases/page.tsx` | طباعة | Generic |
| `purchases/[id]/page.tsx` | Not found | Generic |
| `quotations/new/page.tsx` | إنشاء عرض سعر | Generic |
| `quotations/page.tsx` | عروض الأسعار | Generic |
| `quotations/[id]/page.tsx` | تفاصيل عرض السعر | Generic |
| `receipts/new/page.tsx` | سند قبض جديد | Generic |
| `receipts/page.tsx` | سندات القبض | Generic |
| `reports/aging-report/page.tsx` | Not found | Generic |
| `reports/balance-sheet/page.tsx` | ${t('المركز المالي')} | Generic |
| `reports/bank-statement/page.tsx` | Not found | Generic |
| `reports/cash-flow/page.tsx` | Not found | Generic |
| `reports/cash-statement/page.tsx` | Not found | Generic |
| `reports/clients-suppliers-balances/page.tsx` | Not found | Generic |
| `reports/customer-statement/page.tsx` | Not found | Generic |
| `reports/daily-report/page.tsx` | ${t('التقرير اليومي للمبيعات والتحصيلات')} | Generic |
| `reports/detailed-balance-sheet/page.tsx` | Not found | Generic |
| `reports/employees-advances/page.tsx` | Not found | Generic |
| `reports/employees-catalog/page.tsx` | Not found | Generic |
| `reports/employees-deductions/page.tsx` | Not found | Generic |
| `reports/expenses-report/page.tsx` | Not found | Generic |
| `reports/fixed-assets/page.tsx` | Not found | Generic |
| `reports/general-ledger/page.tsx` | Not found | Generic |
| `reports/income-statement/page.tsx` | Not found | Generic |
| `reports/installments/collection/page.tsx` | Not found | Generic |
| `reports/installments/customer-statement/page.tsx` | Not found | Generic |
| `reports/installments/overdue/page.tsx` | Not found | Generic |
| `reports/installments/page.tsx` | تقارير الأقساط | Generic |
| `reports/inventory-report/page.tsx` | Not found | Generic |
| `reports/item-movement/page.tsx` | Not found | Generic |
| `reports/kitchen-consumption/page.tsx` | Not found | Generic |
| `reports/kitchen-waste/page.tsx` | Not found | Generic |
| `reports/low-stock-items/page.tsx` | Not found | Generic |
| `reports/page.tsx` | التقارير الشاملة | Generic |
| `reports/payroll-statement/page.tsx` | Not found | Generic |
| `reports/purchases-report/page.tsx` | Not found | Generic |
| `reports/recipes-report/page.tsx` | وصفات الطبخ | Generic |
| `reports/returns-report/page.tsx` | Not found | Generic |
| `reports/revenues-report/page.tsx` | Not found | Generic |
| `reports/sales-report/page.tsx` | Not found | Generic |
| `reports/shift-sales/page.tsx` | Not found | Generic |
| `reports/supplier-statement/page.tsx` | Not found | Generic |
| `reports/top-selling-items/page.tsx` | Not found | Generic |
| `reports/treasury-bank-report/page.tsx` | Not found | Generic |
| `reports/treasury-reconciliation/page.tsx` | Not found | Generic |
| `reports/trial-balance/page.tsx` | Not found | Generic |
| `restaurant/drivers/page.tsx` | إدارة السائقين | Restaurant / POS (Excluded in Sidebar) |
| `restaurant/reports/page.tsx` | تقارير المطعم | Restaurant / POS (Excluded in Sidebar) |
| `sale-returns/new/page.tsx` | Not found | Generic |
| `sale-returns/page.tsx` | طباعة | Generic |
| `sale-returns/[id]/page.tsx` | {isServices ? t("تفاصيل إلغاء الخدمة / المرتجع") : t("تفاصيل مرتجع المبيعات")} | Generic |
| `sales/new/page.tsx` | إضافة عميل جديد | Generic |
| `sales/page.tsx` | طباعة | Generic |
| `sales/[id]/page.tsx` | فاتورة مبيعات | Generic |
| `settings/api-keys/page.tsx` | الربط البرمجي (API & Webhooks) | Generic |
| `settings/page.tsx` | الإعدادات الشاملة للمؤسسة | Generic |
| `settlements/page.tsx` | تسوية ديون | Generic |
| `shifts/page.tsx` | الورديات | Restaurant / POS (Excluded in Sidebar) |
| `stock-movements/page.tsx` | Not found | Generic |
| `stocktakings/new/page.tsx` | جلسة جرد جديدة | Generic |
| `stocktakings/page.tsx` | جرد المخازن | Generic |
| `sub-contracts/page.tsx` | عقود مقاولي الباطن | Contracting (Subcontractors / مقاولو الباطن) |
| `subcontractors/page.tsx` | مقاولين الباطن | Contracting (Subcontractors / مقاولو الباطن) |
| `suppliers/page.tsx` | الموردين | Generic |
| `tables/page.tsx` | خريطة الطاولات | Restaurant / POS (Excluded in Sidebar) |
| `treasuries/page.tsx` | الخزن والبنوك | Generic |
| `units/page.tsx` | وحدات القياس | Generic |
| `warehouse-transfers/new/page.tsx` | تحويل مخزني جديد | Generic |
| `warehouse-transfers/page.tsx` | التحويل بين المخازن | Generic |
| `warehouses/page.tsx` | تعديل | Generic |

## 5. Translation Dictionary Audit (i18n.tsx)
Checks if contracting-related terms are present in the translations:

| Term (Arabic) | Present in i18n.tsx? |
| --- | --- |
| المشاريع | ❌ No |
| مستخلصات | ❌ No |
| مستخلصات المالك | ❌ No |
| عقود الباطن | ❌ No |
| مقاولين الباطن | ❌ No |
| مستخلص جديد | ❌ No |
| عقد باطن جديد | ❌ No |
| قائمة المشاريع | ❌ No |
| مشروع جديد | ❌ No |
| الأصناف | ✅ Yes |
| التصنيفات | ✅ Yes |
| المخازن | ✅ Yes |
| الوحدات | ✅ Yes |
| سندات القبض | ✅ Yes |
| سندات الصرف | ✅ Yes |

## 6. Recommendations & Actionable Insights
Based on the system audit, here are the recommendations for the Contracting activity:

1. **Super Admin Matching**: The modules enabled for `CONTRACTING` in New Company Form and Edit Company Form are: `['projects', 'subcontractors', 'sales', 'purchases', 'inventory', 'accounting', 'treasury', 'hr', 'reports']`. This matches perfectly.
2. **Sidebar Filters**: In `Sidebar.tsx` and `new/page.tsx` / `edit/[id]/page.tsx`, the `installments` module is excluded for `CONTRACTING`. This is correct since installments are usually for retail/installments sales, not contracting projects.
3. **Terminology in Contracting**:
   - **Items & Categories**: Under Contracting, 'الأصناف' (Items) refers to materials/resources, and 'التصنيفات' (Categories) to item categories. They are currently named generically ('الأصناف' and 'التصنيفات'). They should remain generic to support inventory, or we can make them dynamic (e.g. 'المواد والبنود' and 'تصنيفات المواد' for Contracting).
   - **Warehouses**: Named 'المخازن'. For contracting, 'المخازن' works, but sometimes 'مستودعات المواقع' (Site Stores) is preferred.
   - **Progress Bills**: Named 'مستخلصات المالك'. This is correct and specific to contracting.
   - **Subcontractors**: Named 'مقاولين الباطن' and 'عقود الباطن'. This is correct and specific to contracting.
