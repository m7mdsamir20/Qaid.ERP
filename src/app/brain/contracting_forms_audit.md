# Contracting Activity Forms & Fields Audit Report

This report lists all the inputs, placeholders, labels, and select fields extracted from pages/forms relevant to the **Contracting** (`CONTRACTING`) activity, auditing them to detect generic or retail-focused terms.

## Summary of Scan
- **Folders Scanned**: 14
- **Files with Forms Found**: 24

### Audit Highlights
- ⚠️ **Unguarded Generic/Retail Terms Found**: **23** (requires manual review or verified dynamic guarding)
- ✅ **Guarded Contracting Terms Found**: **4** (correctly specialized using dynamic conditions)

---

## Detailed Audit per File

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/projects/edit/[id]/page.tsx)
**Path**: `src/app/projects/edit/[id]/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `اسم المشروع *` | 189 | ✅ Suitable |
| Label | `الوصف / التفاصيل` | 193 | ✅ Suitable |
| Label | `العميل / المالك` | 202 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Label | `موقع المشروع` | 211 | ✅ Suitable |
| Label | `تصنيف المشروع` | 219 | ✅ Suitable |
| Label | `مدير المشروع` | 228 | ✅ Suitable |
| Label | `قيمة عقد المشروع *` | 245 | ✅ Suitable |
| Label | `التكلفة التقديرية` | 252 | ✅ Suitable |
| Label | `الربح المتوقع التلقائي` | 259 | ✅ Suitable |
| Label | `تاريخ البدء *` | 275 | ✅ Suitable |
| Label | `التاريخ المتوقع للانتهاء` | 279 | ✅ Suitable |
| Label | `تاريخ الانتهاء الفعلي` | 283 | ✅ Suitable |
| Label | `نسبة الإنجاز الكلية %` | 287 | ✅ Suitable |
| Label | `حالة المشروع` | 291 | ✅ Suitable |
| Label | `ملاحظات إضافية` | 304 | ✅ Suitable |
| Placeholder | `اسم المشروع...` | 190 | ✅ Suitable |
| Placeholder | `اكتب تفاصيل المشروع والمواصفات...` | 194 | ✅ Suitable |
| Placeholder | `الموقع الجغرافي للمشروع...` | 212 | ✅ Suitable |
| Placeholder | `0.00` | 247 | ✅ Suitable |
| Placeholder | `0` | 288 | ✅ Suitable |
| Placeholder | `أي ملاحظات أو بنود خاصة...` | 305 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/projects/new/page.tsx)
**Path**: `src/app/projects/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `اسم المشروع *` | 153 | ✅ Suitable |
| Label | `الوصف / التفاصيل` | 157 | ✅ Suitable |
| Label | `العميل / المالك` | 166 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Label | `موقع المشروع` | 175 | ✅ Suitable |
| Label | `تصنيف المشروع` | 183 | ✅ Suitable |
| Label | `مدير المشروع` | 192 | ✅ Suitable |
| Label | `قيمة عقد المشروع (سعر البيع) *` | 209 | ⚠️ Review: Contains "سعر البيع" (Retail term (Contracting prefers "التكلفة التقديرية" or "سعر الخدمة")) |
| Label | `التكلفة التقديرية للمشروع *` | 216 | ✅ Suitable |
| Label | `الربح المتوقع التلقائي` | 223 | ✅ Suitable |
| Label | `تاريخ البدء *` | 239 | ✅ Suitable |
| Label | `التاريخ المتوقع للانتهاء` | 243 | ✅ Suitable |
| Label | `حالة المشروع` | 247 | ✅ Suitable |
| Label | `ملاحظات إضافية` | 260 | ✅ Suitable |
| Placeholder | `مثال: مشروع برج الياسمين` | 154 | ✅ Suitable |
| Placeholder | `اكتب تفاصيل المشروع والمواصفات...` | 158 | ✅ Suitable |
| Placeholder | `مثال: التجمع الخامس، القاهرة` | 176 | ✅ Suitable |
| Placeholder | `0.00` | 211 | ✅ Suitable |
| Placeholder | `أي ملاحظات أو بنود خاصة بالعقد...` | 261 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/projects/page.tsx)
**Path**: `src/app/projects/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Placeholder | `ابحث برقم المشروع، الاسم، العميل، الموقع...` | 188 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/projects/[id]/page.tsx)
**Path**: `src/app/projects/[id]/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `اسم المرحلة *` | 600 | ✅ Suitable |
| Label | `ترتيب المرحلة *` | 605 | ✅ Suitable |
| Label | `التكلفة التقديرية` | 609 | ✅ Suitable |
| Label | `تاريخ البدء` | 618 | ✅ Suitable |
| Label | `تاريخ الانتهاء` | 622 | ✅ Suitable |
| Label | `الحالة` | 627 | ✅ Suitable |
| Label | `ملاحظات` | 635 | ✅ Suitable |
| Placeholder | `مثال: الحفر وتجهيز التربة` | 601 | ✅ Suitable |
| Placeholder | `0.00` | 611 | ✅ Suitable |
| Placeholder | `أي شروط أو تفاصيل لهذه المرحلة...` | 636 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/subcontractors/page.tsx)
**Path**: `src/app/subcontractors/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `اسم المقاول *` | 248 | ✅ Suitable |
| Label | `رقم الهاتف` | 253 | ✅ Suitable |
| Label | `التخصص الرئيسي` | 257 | ✅ Suitable |
| Label | `الرقم الضريبي` | 263 | ✅ Suitable |
| Label | `العنوان` | 267 | ✅ Suitable |
| Label | `ملاحظات` | 272 | ✅ Suitable |
| Placeholder | `ابحث باسم المقاول، الهاتف، التخصص...` | 168 | ✅ Suitable |
| Placeholder | `مثال: شركة النخبة للمقاولات الكهربائية` | 249 | ✅ Suitable |
| Placeholder | `05xxxxxxxx` | 254 | ✅ Suitable |
| Placeholder | `مثال: أعمال صحية، خرسانة، تشطيب` | 258 | ✅ Suitable |
| Placeholder | `العنوان...` | 268 | ✅ Suitable |
| Placeholder | `تفاصيل إضافية...` | 273 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/sub-contracts/page.tsx)
**Path**: `src/app/sub-contracts/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `المشروع *` | 301 | ✅ Suitable |
| Label | `مقاول الباطن *` | 310 | ✅ Suitable |
| Label | `توصيف الأعمال *` | 323 | ✅ Suitable |
| Label | `قيمة عقد الباطن *` | 327 | ✅ Suitable |
| Label | `تاريخ البدء` | 338 | ✅ Suitable |
| Label | `تاريخ الانتهاء` | 342 | ✅ Suitable |
| Label | `ملاحظات وشروط إضافية` | 349 | ✅ Suitable |
| Placeholder | `ابحث برقم العقد، اسم المقاول، المشروع...` | 201 | ✅ Suitable |
| Placeholder | `مثال: أعمال التأسيسات الكهربائية للبرج` | 324 | ✅ Suitable |
| Placeholder | `0.00` | 329 | ✅ Suitable |
| Placeholder | `أي شروط دفع أو مواصفات خاصة بالباطن...` | 350 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/progress-bills/page.tsx)
**Path**: `src/app/progress-bills/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `المشروع *` | 353 | ✅ Suitable |
| Label | `التاريخ *` | 362 | ✅ Suitable |
| Label | `نسبة الضمان %` | 429 | ✅ Suitable |
| Label | `خصم دفعة مقدمة` | 433 | ✅ Suitable |
| Label | `خصومات أخرى` | 440 | ✅ Suitable |
| Label | `حالة المستخلص` | 447 | ✅ Suitable |
| Label | `ملاحظات المستخلص` | 481 | ✅ Suitable |
| Placeholder | `ابحث برقم المستخلص أو اسم المشروع...` | 253 | ✅ Suitable |
| Placeholder | `0` | 407 | ✅ Suitable |
| Placeholder | `0.00` | 435 | ✅ Suitable |
| Placeholder | `أي ملاحظات فنية أو إدارية تخص هذا المستخلص...` | 482 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/sales/new/page.tsx)
**Path**: `src/app/sales/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `رقم الفاتورة` | 588 | ✅ Suitable |
| Label | `اسم العميل` | 605 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Label | `مخزن الصرف` | 637 | ✅ Suitable |
| Label | `تاريخ الفاتورة` | 647 | ✅ Suitable |
| Label | `تاريخ الاستحقاق` | 658 | ✅ Suitable |
| Label | `isServices ? اسم الخدمة : اسم الصنف` | 685 | ⚠️ Review: Contains "صنف" (Generic term (Contracting prefers "بند / مادة")) |
| Label | `الكمية` | 724 | ✅ Suitable |
| Label | `السعر` | 740 | ✅ Suitable |
| Label | `الوصف (يتم سحبه تلقائياً ويمكن التعديل)` | 774 | ✅ Suitable |
| Label | `ملاحظات` | 901 | ✅ Suitable |
| Label | `طريقة الدفع` | 1022 | ✅ Suitable |
| Label | `المبلغ المدفوع` | 1041 | ✅ Suitable |
| Label | `الخزينة المستلمة *` | 1061 | ✅ Suitable |
| Label | `الحساب البنكي *` | 1070 | ✅ Suitable |
| Label | `الاسم *` | 1197 | ✅ Suitable |
| Label | `رقم الجوال` | 1205 | ✅ Suitable |
| Placeholder | `ابحث واختر...` | 613 | ✅ Suitable |
| Placeholder | `اختر المكان...` | 640 | ✅ Suitable |
| Placeholder | `اكتب وصف الخدمة التفصيلي هنا...` | 778 | ✅ Suitable |
| Placeholder | `أدخل أي ملاحظات هنا...` | 904 | ✅ Suitable |
| Placeholder | `0` | 950 | ✅ Suitable |
| Placeholder | `0.00` | 1047 | ✅ Suitable |
| Placeholder | `اختر الخزينة...` | 1063 | ✅ Suitable |
| Placeholder | `اختر البنك...` | 1072 | ✅ Suitable |
| Placeholder | `اسم العميل...` | 1200 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Placeholder | `01x xxxx xxxx` | 1208 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/purchases/new/page.tsx)
**Path**: `src/app/purchases/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `رقم الفاتورة` | 433 | ✅ Suitable |
| Label | `اسم المورد` | 447 | ✅ Suitable |
| Label | `مخزن الاستلام` | 479 | ✅ Suitable |
| Label | `تاريخ الفاتورة` | 489 | ✅ Suitable |
| Label | `الصنف` | 503 | ⚠️ Review: Contains "صنف" (Generic term (Contracting prefers "بند / مادة")) |
| Label | `الكمية` | 527 | ✅ Suitable |
| Label | `التكلفة` | 545 | ✅ Suitable |
| Label | `ملاحظات` | 636 | ✅ Suitable |
| Label | `طريقة الدفع` | 716 | ✅ Suitable |
| Label | `المبلغ المدفوع` | 725 | ✅ Suitable |
| Label | `الخزينة المستلمة *` | 740 | ✅ Suitable |
| Label | `الحساب البنكي *` | 749 | ✅ Suitable |
| Label | `الاسم *` | 808 | ✅ Suitable |
| Label | `رقم الجوال` | 816 | ✅ Suitable |
| Placeholder | `ابحث واختر المورد...` | 455 | ✅ Suitable |
| Placeholder | `اختر المكان...` | 482 | ✅ Suitable |
| Placeholder | `اختر الصنف...` | 513 | ⚠️ Review: Contains "صنف" (Generic term (Contracting prefers "بند / مادة")) |
| Placeholder | `أدخل أي ملاحظات هنا...` | 637 | ✅ Suitable |
| Placeholder | `0` | 667 | ✅ Suitable |
| Placeholder | `0.00` | 731 | ✅ Suitable |
| Placeholder | `اختر الخزينة...` | 742 | ✅ Suitable |
| Placeholder | `اختر البنك...` | 751 | ✅ Suitable |
| Placeholder | `اسم المورد...` | 811 | ✅ Suitable |
| Placeholder | `01x xxxx xxxx` | 819 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/purchases/page.tsx)
**Path**: `src/app/purchases/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Placeholder | `رقم الفاتورة أو اسم المورد...` | 173 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/items/page.tsx)
**Path**: `src/app/items/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `الباركود الإضافي` | 557 | ⚠️ Review: Contains "الباركود" (Retail/Barcode term - usually not used in contracting materials/services)<br/>⚠️ Review: Contains "باركود" (Retail/Barcode term - usually not used in contracting materials/services) |
| Label | `صورة الصنف (اختياري)` | 572 | ⚠️ Review: Contains "صنف" (Generic term (Contracting prefers "بند / مادة")) |
| Label | `وصف الصنف (يظهر في المنيو)` | 603 | ⚠️ Review: Contains "المنيو" (Restaurant/Menu term)<br/>⚠️ Review: Contains "منيو" (Restaurant/Menu term)<br/>⚠️ Review: Contains "صنف" (Generic term (Contracting prefers "بند / مادة")) |
| Label | `حالة الخدمة` | 649 | ✅ Suitable |
| Label | `وحدة القياس` | 661 | ✅ Suitable |
| Label | `وصف الخدمة` | 680 | ✅ Suitable |
| Label | `companyBusinessType === CONTRACTING ? تكلفة الشراء / التنفيذ : سعر التكلفة` | 695 | ✅ Suitable |
| Label | `حد الطلب (تنبيه نقص المخزون)` | 702 | ✅ Suitable |
| Label | `companyBusinessType === CONTRACTING ? التكلفة التقديرية (سعر البيع للعميل) : سعر البيع` | 720 | ✅ Guarded (Contracting specialized: "سعر البيع") |
| Label | `المقاس *` | 758 | ✅ Suitable |
| Label | `سعر البيع *` | 766 | ⚠️ Review: Contains "سعر البيع" (Retail term (Contracting prefers "التكلفة التقديرية" or "سعر الخدمة")) |
| Label | `المادة الخام *` | 872 | ✅ Suitable |
| Label | `الكمية *` | 887 | ✅ Suitable |
| Label | `الوحدة` | 895 | ✅ Suitable |
| Label | `الكمية الافتتاحية` | 927 | ✅ Suitable |
| Label | `عدد النسخ المراد طباعتها` | 972 | ✅ Suitable |
| Label | `companyBusinessType === CONTRACTING ? اسم تصنيف المواد والبنود الجديد : اسم التصنيف الجديد` | 1016 | ✅ Suitable |
| Label | `اسم الوحدة الجديدة` | 1031 | ✅ Suitable |
| Placeholder | `سكان الباركود...` | 558 | ⚠️ Review: Contains "الباركود" (Retail/Barcode term - usually not used in contracting materials/services)<br/>⚠️ Review: Contains "باركود" (Retail/Barcode term - usually not used in contracting materials/services) |
| Placeholder | `وصف مختصر للوجبة يظهر في المنيو...` | 607 | ⚠️ Review: Contains "المنيو" (Restaurant/Menu term)<br/>⚠️ Review: Contains "منيو" (Restaurant/Menu term) |
| Placeholder | `قطعة، كرتونة...` | 664 | ✅ Suitable |
| Placeholder | `اكتب تفاصيل الخدمة هنا ليتم سحبها في الفاتورة...` | 684 | ✅ Suitable |
| Placeholder | `0.00` | 697 | ✅ Suitable |
| Placeholder | `مثال: وسط، كبير...` | 763 | ✅ Suitable |
| Placeholder | `المادة الخام` | 816 | ✅ Suitable |
| Placeholder | `الكمية` | 826 | ✅ Suitable |
| Placeholder | `الوحدة` | 833 | ✅ Suitable |
| Placeholder | `اختر المادة الخام` | 881 | ✅ Suitable |
| Placeholder | `1` | 892 | ✅ Suitable |
| Placeholder | `جم` | 900 | ✅ Suitable |
| Placeholder | `مثال: لتر، جالون، طقم...` | 1032 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/categories/page.tsx)
**Path**: `src/app/categories/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `كود التصنيف` | 223 | ✅ Suitable |
| Label | `isContracting ? اسم تصنيف المواد والبنود : اسم التصنيف *` | 231 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/warehouses/page.tsx)
**Path**: `src/app/warehouses/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `isContracting ? كود المخزن / الموقع النظامي : كود المخزن النظامي` | 266 | ✅ Guarded (Contracting specialized: "المخزن") |
| Label | `isContracting ? اسم المخزن / الموقع : اسم المخزن *` | 276 | ✅ Guarded (Contracting specialized: "المخزن") |
| Label | `isContracting ? العنوان التفصيلي / موقع المشروع : العنوان التفصيلي` | 289 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/customers/page.tsx)
**Path**: `src/app/customers/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `اسم العميل *` | 384 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Label | `رقم الهاتف` | 388 | ✅ Suitable |
| Label | `isContracting ? نوع الطرف : نوع العميل *` | 398 | ✅ Guarded (Contracting specialized: "العميل") |
| Label | `العنوان` | 430 | ✅ Suitable |
| Label | `addrCfg.labels[0]` | 433 | ✅ Suitable |
| Label | `addrCfg.labels[1]` | 437 | ✅ Suitable |
| Label | `addrCfg.labels[2]` | 441 | ✅ Suitable |
| Label | `addrCfg.labels[3]` | 445 | ✅ Suitable |
| Label | `الرقم الضريبي` | 457 | ✅ Suitable |
| Label | `السجل التجاري` | 461 | ✅ Suitable |
| Label | `المسؤول / جهة الاتصال` | 475 | ✅ Suitable |
| Label | `الحد الائتماني المسموح (اختياري)` | 481 | ✅ Suitable |
| Label | `الرصيد الافتتاحي (عند بداية التعامل)` | 506 | ✅ Suitable |
| Placeholder | `مثال: أحمد محمد` | 385 | ✅ Suitable |
| Placeholder | `مثال: محمد علي` | 476 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/customers/[id]/page.tsx)
**Path**: `src/app/customers/[id]/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `تاريخ البداية` | 123 | ✅ Suitable |
| Label | `تاريخ النهاية` | 130 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/suppliers/page.tsx)
**Path**: `src/app/suppliers/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `نوع المورد *` | 336 | ✅ Suitable |
| Label | `العنوان` | 366 | ✅ Suitable |
| Label | `addrCfg.labels[0]` | 369 | ✅ Suitable |
| Label | `addrCfg.labels[1]` | 373 | ✅ Suitable |
| Label | `addrCfg.labels[2]` | 377 | ✅ Suitable |
| Label | `addrCfg.labels[3]` | 381 | ✅ Suitable |
| Label | `الرقم الضريبي` | 391 | ✅ Suitable |
| Label | `السجل التجاري` | 395 | ✅ Suitable |
| Label | `رقم الهاتف` | 404 | ✅ Suitable |
| Label | `المسؤول / جهة الاتصال` | 409 | ✅ Suitable |
| Label | `الرصيد الافتتاحي` | 417 | ✅ Suitable |
| Placeholder | `ابحث باسم المورد أو رقم الهاتف...` | 294 | ✅ Suitable |
| Placeholder | `مثال: محمد علي` | 410 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/employees/new/edit/page.tsx)
**Path**: `src/app/employees/new/edit/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `labelrequired &&  *` | 35 | ✅ Suitable |
| Placeholder | `محمد أحمد علي محمود` | 276 | ✅ Suitable |
| Placeholder | `29xxxxxxxxxxxxxxx` | 281 | ✅ Suitable |
| Placeholder | `01xxxxxxxxx` | 296 | ✅ Suitable |
| Placeholder | `name@company.com` | 301 | ✅ Suitable |
| Placeholder | `المدينة، الحي، الشارع` | 304 | ✅ Suitable |
| Placeholder | `(بدون قسم)` | 313 | ✅ Suitable |
| Placeholder | `محاسب أول` | 316 | ✅ Suitable |
| Placeholder | `0.00` | 328 | ✅ Suitable |
| Placeholder | `البنك الأهلي المصري` | 367 | ✅ Suitable |
| Placeholder | `xxxxxxxxxxxx` | 370 | ✅ Suitable |
| Label Prop | `البيانات الشخصية` | 270 | ✅ Suitable |
| Label Prop | `كود الموظف` | 272 | ✅ Suitable |
| Label Prop | `الاسم الرباعي` | 275 | ✅ Suitable |
| Label Prop | `الرقم القومي` | 280 | ✅ Suitable |
| Label Prop | `تاريخ الميلاد` | 283 | ✅ Suitable |
| Label Prop | `الجنس` | 288 | ✅ Suitable |
| Label Prop | `رقم الهاتف` | 295 | ✅ Suitable |
| Label Prop | `البريد الإلكتروني` | 300 | ✅ Suitable |
| Label Prop | `العنوان` | 303 | ✅ Suitable |
| Label Prop | `البيانات الوظيفية` | 310 | ✅ Suitable |
| Label Prop | `القسم الإداري` | 312 | ✅ Suitable |
| Label Prop | `المسمى الوظيفي` | 315 | ✅ Suitable |
| Label Prop | `تاريخ التعيين` | 319 | ✅ Suitable |
| Label Prop | `الراتب والبدلات والخصومات` | 325 | ✅ Suitable |
| Label Prop | `بدل سكن` | 338 | ✅ Suitable |
| Label Prop | `بدل مواصلات` | 341 | ✅ Suitable |
| Label Prop | `بدل غذاء` | 344 | ✅ Suitable |
| Label Prop | `خصم التأمينات` | 354 | ✅ Suitable |
| Label Prop | `خصم الضرائب` | 357 | ✅ Suitable |
| Label Prop | `بيانات الحساب البنكي` | 364 | ✅ Suitable |
| Label Prop | `اسم البنك` | 366 | ✅ Suitable |
| Label Prop | `رقم الحساب / IBAN` | 369 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/employees/new/page.tsx)
**Path**: `src/app/employees/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `labelrequired &&  *` | 370 | ✅ Suitable |
| Placeholder | `أدخل اسم الموظف الرباعي` | 111 | ✅ Suitable |
| Placeholder | `الرقم القومي المكون من 14 رقم` | 114 | ✅ Suitable |
| Placeholder | `اختر الجنس` | 123 | ✅ Suitable |
| Placeholder | `01xxxxxxxxx` | 133 | ✅ Suitable |
| Placeholder | `name@company.com` | 136 | ✅ Suitable |
| Placeholder | `المدينة، الحي، الشارع` | 139 | ✅ Suitable |
| Placeholder | `اختر القسم أو الإدارة` | 148 | ✅ Suitable |
| Placeholder | `اختر الفرع` | 152 | ✅ Suitable |
| Placeholder | `مثال: محاسب أول` | 156 | ✅ Suitable |
| Placeholder | `اختر الحالة` | 165 | ✅ Suitable |
| Placeholder | `0.00` | 193 | ✅ Suitable |
| Placeholder | `اسم البنك المعتمد` | 246 | ✅ Suitable |
| Placeholder | `رقم الحساب البنكي` | 249 | ✅ Suitable |
| Label Prop | `البيانات الشخصية والتعريفية` | 105 | ✅ Suitable |
| Label Prop | `كود الموظف` | 107 | ✅ Suitable |
| Label Prop | `الاسم الكامل` | 110 | ✅ Suitable |
| Label Prop | `الرقم القومي` | 113 | ✅ Suitable |
| Label Prop | `تاريخ الميلاد` | 116 | ✅ Suitable |
| Label Prop | `الجنس` | 119 | ✅ Suitable |
| Label Prop | `رقم الهاتف` | 132 | ✅ Suitable |
| Label Prop | `البريد الإلكتروني` | 135 | ✅ Suitable |
| Label Prop | `العنوان السكني الحالي` | 138 | ✅ Suitable |
| Label Prop | `البيانات الوظيفية والتعاقدية` | 145 | ✅ Suitable |
| Label Prop | `القسم الإداري` | 147 | ✅ Suitable |
| Label Prop | `الفرع` | 151 | ✅ Suitable |
| Label Prop | `المسمى الوظيفي` | 155 | ✅ Suitable |
| Label Prop | `تاريخ التعيين` | 158 | ✅ Suitable |
| Label Prop | `حالة الموظف` | 161 | ✅ Suitable |
| Label Prop | `سلم الرواتب والبدلات` | 178 | ✅ Suitable |
| Label Prop | `الراتب الأساسي المعتمد` | 180 | ✅ Suitable |
| Label Prop | `بدل سكن` | 202 | ✅ Suitable |
| Label Prop | `بدل مواصلات` | 209 | ✅ Suitable |
| Label Prop | `بدل غذاء` | 216 | ✅ Suitable |
| Label Prop | `خصم التأمينات` | 225 | ✅ Suitable |
| Label Prop | `خصم الضرائب` | 232 | ✅ Suitable |
| Label Prop | `معلومات التحويل البنكي` | 243 | ✅ Suitable |
| Label Prop | `اسم البنك` | 245 | ✅ Suitable |
| Label Prop | `رقم الحساب / IBAN` | 248 | ✅ Suitable |
| Label Prop | `الراتب الأساسي` | 282 | ✅ Suitable |
| Label Prop | `إجمالي البدلات` | 283 | ✅ Suitable |
| Label Prop | `إجمالي الخصومات` | 284 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/employees/page.tsx)
**Path**: `src/app/employees/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Placeholder | `ابحث باسم الموظف أو الكود أو المنصب الوظيفي...` | 161 | ✅ Suitable |
| Placeholder | `كل الأقسام` | 177 | ✅ Suitable |
| Placeholder | `كل الحالات` | 190 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/employees/[id]/edit/page.tsx)
**Path**: `src/app/employees/[id]/edit/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `labelrequired &&  *` | 411 | ✅ Suitable |
| Placeholder | `أدخل اسم الموظف` | 167 | ✅ Suitable |
| Placeholder | `14 رقم` | 170 | ✅ Suitable |
| Placeholder | `اختر النوع` | 179 | ✅ Suitable |
| Placeholder | `01xxxxxxxxx` | 189 | ✅ Suitable |
| Placeholder | `name@company.com` | 192 | ✅ Suitable |
| Placeholder | `المدينة، الحي` | 195 | ✅ Suitable |
| Placeholder | `اختر القسم` | 204 | ✅ Suitable |
| Placeholder | `اختر الفرع` | 208 | ✅ Suitable |
| Placeholder | `المسمى الوظيفي الحالي` | 212 | ✅ Suitable |
| Placeholder | `اختر الحالة` | 221 | ✅ Suitable |
| Placeholder | `0.00` | 248 | ✅ Suitable |
| Label Prop | `البيانات الشخصية والتعريفية` | 161 | ✅ Suitable |
| Label Prop | `كود الموظف` | 163 | ✅ Suitable |
| Label Prop | `الاسم الكامل` | 166 | ✅ Suitable |
| Label Prop | `الرقم القومي` | 169 | ✅ Suitable |
| Label Prop | `تاريخ الميلاد` | 172 | ✅ Suitable |
| Label Prop | `الجنس` | 175 | ✅ Suitable |
| Label Prop | `رقم الهاتف` | 188 | ✅ Suitable |
| Label Prop | `البريد الإلكتروني` | 191 | ✅ Suitable |
| Label Prop | `العنوان السكني` | 194 | ✅ Suitable |
| Label Prop | `البيانات الوظيفية والتعاقدية` | 201 | ✅ Suitable |
| Label Prop | `القسم الإداري` | 203 | ✅ Suitable |
| Label Prop | `الفرع` | 207 | ✅ Suitable |
| Label Prop | `المسمى الوظيفي` | 211 | ✅ Suitable |
| Label Prop | `تاريخ التعيين` | 214 | ✅ Suitable |
| Label Prop | `حالة الموظف` | 217 | ✅ Suitable |
| Label Prop | `سلم الرواتب والبدلات` | 234 | ✅ Suitable |
| Label Prop | `الراتب الأساسي الشهري` | 235 | ✅ Suitable |
| Label Prop | `بدل سكن` | 256 | ✅ Suitable |
| Label Prop | `بدل مواصلات` | 263 | ✅ Suitable |
| Label Prop | `بدل غذاء` | 270 | ✅ Suitable |
| Label Prop | `خصم التأمينات` | 279 | ✅ Suitable |
| Label Prop | `خصم الضرائب` | 286 | ✅ Suitable |
| Label Prop | `معلومات التحويل البنكي` | 297 | ✅ Suitable |
| Label Prop | `اسم البنك` | 299 | ✅ Suitable |
| Label Prop | `رقم الحساب / IBAN` | 302 | ✅ Suitable |
| Label Prop | `الراتب الأساسي` | 335 | ✅ Suitable |
| Label Prop | `إجمالي البدلات` | 336 | ✅ Suitable |
| Label Prop | `إجمالي الخصومات` | 337 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/receipts/new/page.tsx)
**Path**: `src/app/receipts/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `رقم السند` | 176 | ✅ Suitable |
| Label | `تاريخ السند *` | 191 | ✅ Suitable |
| Label | `المستفيد (عميل/مورد) *` | 199 | ✅ Suitable |
| Label | `طريقة الدفع *` | 254 | ✅ Suitable |
| Label | `ملاحظات / البيان المالي` | 299 | ✅ Suitable |
| Label | `المبلغ المحصَّل *` | 317 | ✅ Suitable |
| Placeholder | `بحث باسم العميل أو المورد...` | 209 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |
| Placeholder | `مثال: استلام دفعة من الحساب...` | 300 | ✅ Suitable |
| Placeholder | `0.00` | 323 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/receipts/page.tsx)
**Path**: `src/app/receipts/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Placeholder | `ابحث برقم السند أو اسم العميل...` | 93 | ⚠️ Review: Contains "العميل" (Generic term (Contracting prefers "صاحب المشروع")) |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/payments/new/page.tsx)
**Path**: `src/app/payments/new/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Label | `رقم السند` | 163 | ✅ Suitable |
| Label | `تاريخ السند *` | 178 | ✅ Suitable |
| Label | `المورد (المُستلِم) *` | 186 | ✅ Suitable |
| Label | `طريقة الصرف *` | 212 | ✅ Suitable |
| Label | `ملاحظات / البيان المالي` | 263 | ✅ Suitable |
| Label | `المبلغ المُنصرِف *` | 279 | ✅ Suitable |
| Placeholder | `ابحث واختر المورد...` | 192 | ✅ Suitable |
| Placeholder | `مثال: سداد دفعة من الحساب، سداد فاتورة مشتريات...` | 264 | ✅ Suitable |
| Placeholder | `0.00` | 285 | ✅ Suitable |

---

### 📄 [page.tsx](file:///C:/Users/pc203/OneDrive/Desktop/Projects/erp-app/src/app/payments/page.tsx)
**Path**: `src/app/payments/page.tsx`

| Field Type | Label / Placeholder Text | Line No | Status / Issues |
| --- | --- | --- | --- |
| Placeholder | `رقم السند أو اسم المورد...` | 98 | ✅ Suitable |

---

