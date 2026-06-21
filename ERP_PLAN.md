# خطة تطوير نظام ERP — الخطة الشاملة
**تاريخ الإعداد:** 2026-06-21  
**النظام:** erp-app (Next.js + Prisma + PostgreSQL)  
**الأنشطة المستهدفة:** خدمات | جملة | تجزئة | مقاولات

---

## فهرس المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [أوامر الشراء (Purchase Orders)](#2-أوامر-الشراء)
3. [أوامر البيع (Sales Orders)](#3-أوامر-البيع)
4. [الحضور والانصراف (Attendance)](#4-الحضور-والانصراف)
5. [سجل النشاط (Audit Log)](#5-سجل-النشاط)
6. [ما ينقص نشاط الخدمات](#6-ما-ينقص-نشاط-الخدمات)
7. [ما ينقص نشاط الجملة](#7-ما-ينقص-نشاط-الجملة)
8. [ما ينقص نشاط التجزئة](#8-ما-ينقص-نشاط-التجزئة)
9. [ما ينقص نشاط المقاولات](#9-ما-ينقص-نشاط-المقاولات)
10. [تعديل الفاتورة — حقل رقم أمر الشراء](#10-تعديل-الفاتورة)
11. [أولوية التنفيذ والجدول الزمني](#11-أولوية-التنفيذ)
12. [مخطط قاعدة البيانات الكامل](#12-مخطط-قاعدة-البيانات)

---

## 1. ملخص تنفيذي

### الوضع الحالي
النظام يحتوي على:
- فواتير مبيعات ومشتريات ✅
- عروض أسعار (Quotations) ✅
- مخزون ومخازن ✅
- محاسبة كاملة (حسابات، قيود، خزائن) ✅
- موارد بشرية (موظفين، رواتب، سلف، خصومات) ✅
- مقاولات (مشاريع، مستخلصات، مقاولين باطن) ✅
- مطاعم (POS، مطبخ، توصيل) ✅

### ما ينقص لاكتمال ERP
| المهمة | النشاط | الأولوية |
|--------|--------|---------|
| أوامر الشراء | جميع الأنشطة | 🔴 عالية جداً |
| أوامر البيع | جميع الأنشطة | 🔴 عالية جداً |
| حقل PO في فاتورة الخدمة | خدمات | 🔴 عالية |
| الحضور والانصراف | HR | 🔴 عالية جداً |
| سجل النشاط (Audit Log) | النظام كله | 🔴 عالية جداً |
| عقود الخدمة + أوامر العمل | خدمات | 🟠 عالية |
| قوائم الأسعار المتعددة | جملة | 🟠 عالية |
| POS التجزئة + نقاط الولاء | تجزئة | 🟠 عالية |
| طلبات المواد للمقاولات | مقاولات | 🟠 عالية |
| تتبع الأرقام التسلسلية | تجزئة/جملة | 🟡 متوسطة |
| التقارير اليومية للمشاريع | مقاولات | 🟡 متوسطة |

---

## 2. أوامر الشراء

### ما هو أمر الشراء؟
أمر الشراء (Purchase Order - PO) هو وثيقة رسمية تُصدرها الشركة للمورد تُعلمه فيها برغبتها في شراء كميات محددة من منتجات أو خدمات بسعر متفق عليه وفي تاريخ تسليم محدد. يُنشأ قبل الفاتورة ويُستخدم كمرجع لها.

### سيكل أمر الشراء الكامل

```
[طلب شراء داخلي]
        ↓
[إنشاء أمر شراء (PO) — حالة: مسودة]
        ↓
[مراجعة وموافقة المدير — حالة: معتمد]
        ↓
[إرسال PO للمورد]
        ↓
[استلام البضاعة جزئياً أو كلياً — حالة: مستلم جزئي / مستلم]
        ↓
[إنشاء فاتورة شراء مرتبطة بالـ PO تلقائياً]
        ↓
[تسوية الفاتورة مع PO — الكميات المستلمة = الكميات المفوترة]
        ↓
[سند صرف للمورد — حالة: مدفوع]
```

### حالات أمر الشراء

| الحالة | الوصف | الإجراء المسموح |
|--------|-------|----------------|
| `draft` مسودة | تم إنشاؤه ولم يُعتمد | تعديل، حذف، اعتماد |
| `approved` معتمد | تمت الموافقة عليه | استلام بضاعة، إلغاء |
| `partially_received` مستلم جزئي | تم استلام جزء من البضاعة | استكمال الاستلام |
| `received` مستلم | تم استلام كل البضاعة | إنشاء فاتورة |
| `invoiced` مُفوتر | تم إنشاء فاتورة شراء مرتبطة به | دفع |
| `cancelled` ملغى | تم إلغاؤه | عرض فقط |

### شاشات أمر الشراء

#### شاشة 1: قائمة أوامر الشراء `/purchase-orders`
**الغرض:** عرض جميع أوامر الشراء مع إمكانية الفلترة والبحث

**البيانات المعروضة:**
- رقم الأمر، التاريخ، اسم المورد، إجمالي المبلغ، الحالة، تاريخ التسليم المتوقع
- نسبة الاستلام (كم % تم استلامه)
- هل تم إنشاء فاتورة مرتبطة؟

**الفلاتر:**
- حسب الحالة (مسودة / معتمد / مستلم / ...)
- حسب المورد
- حسب التاريخ (من - إلى)
- حسب المخزن
- حسب المشروع (للمقاولات)

**الأزرار:**
- إنشاء أمر شراء جديد
- تصدير Excel/PDF
- طباعة

---

#### شاشة 2: إنشاء/تعديل أمر شراء `/purchase-orders/new` و `/purchase-orders/[id]`
**الغرض:** إدخال بيانات أمر شراء جديد أو تعديل موجود

**الحقول الرئيسية:**

*رأس الأمر (Header):*
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| رقم الأمر | تلقائي | تسلسلي PO-0001 |
| التاريخ | تاريخ | افتراضي: اليوم |
| المورد | بحث واختيار | مع رصيده الحالي |
| المخزن | اختيار | مخزن الاستلام |
| تاريخ التسليم المتوقع | تاريخ | |
| المشروع | اختيار (اختياري) | للمقاولات |
| الفرع | اختيار | |
| ملاحظات | نص | |
| مرفقات | ملفات | عروض أسعار المورد، ..إلخ |

*بنود الأمر (Lines):*
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| الصنف | بحث | مع باركود |
| الوصف | نص | |
| الكمية المطلوبة | رقم | |
| الوحدة | اختيار | |
| سعر الوحدة | رقم | |
| الخصم % | رقم | |
| الإجمالي | محسوب | |
| الكمية المستلمة | رقم | يُملأ عند الاستلام |

*الإجماليات:*
- إجمالي قبل الضريبة
- نسبة الضريبة / مبلغ الضريبة
- الإجمالي النهائي

**الأزرار:**
- حفظ كمسودة
- اعتماد وإرسال للمورد
- طباعة PO
- تحويل إلى فاتورة شراء (يظهر فقط عند الاستلام الكامل)

---

#### شاشة 3: استلام البضاعة (Goods Receipt) — ضمن شاشة PO
**الغرض:** تسجيل الاستلام الفعلي للبضاعة من المورد مقارنة بما في PO

**آلية العمل:**
1. يفتح المستخدم أمر الشراء المعتمد
2. يضغط زر "تسجيل استلام"
3. تظهر قائمة بنود PO مع حقل "الكمية المستلمة فعلياً" لكل بند
4. يدخل المستخدم الكميات المستلمة (قد تكون أقل من المطلوب — استلام جزئي)
5. عند الحفظ:
   - تُحدَّث الكميات في المخزن تلقائياً
   - تُسجَّل حركة مخزنية من نوع "استلام من مورد"
   - تتغير حالة PO إلى "مستلم جزئي" أو "مستلم كلي"

---

#### شاشة 4: تقرير أوامر الشراء
**يتضمن:**
- أوامر معلقة (لم تُستلم بعد)
- أوامر متأخرة (تجاوزت تاريخ التسليم)
- مقارنة: الكمية المطلوبة vs المستلمة vs المفوترة
- إجمالي مستحقات الموردين من أوامر مفتوحة

---

### نموذج قاعدة البيانات

```prisma
model PurchaseOrder {
  id                   String              @id @default(cuid())
  orderNumber          Int
  orderCode            String?             // PO-0001
  date                 DateTime
  expectedDeliveryDate DateTime?
  supplierId           String
  warehouseId          String?
  projectId            String?             // للمقاولات
  status               String              @default("draft")
  // draft | approved | partially_received | received | invoiced | cancelled
  subtotal             Float               @default(0)
  taxRate              Float               @default(0)
  taxAmount            Float               @default(0)
  total                Float               @default(0)
  notes                String?
  attachments          String?
  approvedBy           String?             // userId
  approvedAt           DateTime?
  companyId            String
  branchId             String?
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  supplier             Supplier            @relation(...)
  warehouse            Warehouse?          @relation(...)
  project              Project?            @relation(...)
  company              Company             @relation(...)
  lines                PurchaseOrderLine[]
  invoices             Invoice[]           // الفواتير المرتبطة

  @@unique([orderNumber, companyId])
  @@index([companyId, status])
}

model PurchaseOrderLine {
  id               String        @id @default(cuid())
  purchaseOrderId  String
  itemId           String
  description      String?
  quantity         Float         // الكمية المطلوبة
  receivedQty      Float         @default(0) // الكمية المستلمة
  invoicedQty      Float         @default(0) // الكمية المفوترة
  price            Float
  discount         Float         @default(0)
  total            Float
  unit             String?

  purchaseOrder    PurchaseOrder @relation(...)
  item             Item          @relation(...)
}
```

---

## 3. أوامر البيع

### ما هو أمر البيع؟
أمر البيع (Sales Order - SO) هو وثيقة رسمية تتلقاها الشركة من العميل تُثبّت طلبه لكميات محددة بسعر متفق عليه. يأتي بعد عرض السعر ويسبق الفاتورة. يُستخدم لتخطيط التوريد والمخزون.

### سيكل أمر البيع الكامل

```
[عرض سعر للعميل — Quotation (موجود)]
        ↓
[موافقة العميل على العرض]
        ↓
[تحويل عرض السعر إلى أمر بيع — حالة: معتمد]
        ↓         [أو إنشاء أمر بيع مباشر]
[التحقق من توفر المخزون]
        ↓
[تجهيز وشحن البضاعة — حالة: جاري التنفيذ]
        ↓
[تسليم البضاعة جزئياً أو كلياً — حالة: مسلّم جزئي / مسلّم]
        ↓
[إنشاء فاتورة بيع مرتبطة بالـ SO تلقائياً]
        ↓
[سند قبض من العميل — حالة: مدفوع]
```

### حالات أمر البيع

| الحالة | الوصف | الإجراء المسموح |
|--------|-------|----------------|
| `draft` مسودة | تم إنشاؤه لم يُعتمد | تعديل، حذف، اعتماد |
| `approved` معتمد | تمت الموافقة | بدء التنفيذ، إلغاء |
| `processing` جاري التنفيذ | يجري تجهيز الطلب | تسليم، إلغاء |
| `partially_delivered` مسلّم جزئي | تم تسليم جزء | استكمال التسليم |
| `delivered` مسلّم | تم التسليم الكامل | إنشاء فاتورة |
| `invoiced` مُفوتر | فاتورة مرتبطة | تحصيل |
| `cancelled` ملغى | تم الإلغاء | عرض فقط |

### شاشات أمر البيع

#### شاشة 1: قائمة أوامر البيع `/sales-orders`
**الغرض:** عرض جميع أوامر البيع مع الفلترة

**البيانات المعروضة:**
- رقم الأمر، التاريخ، اسم العميل، المبلغ، الحالة، تاريخ التسليم المتوقع
- نسبة التسليم، هل تم إنشاء فاتورة؟
- المندوب المسؤول

**الفلاتر:**
- حسب الحالة
- حسب العميل
- حسب المندوب
- حسب التاريخ
- حسب المشروع

---

#### شاشة 2: إنشاء/تعديل أمر بيع `/sales-orders/new` و `/sales-orders/[id]`
**الغرض:** إدخال بيانات أمر بيع جديد أو تعديل موجود

**الحقول الرئيسية:**

*رأس الأمر:*
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| رقم الأمر | تلقائي | SO-0001 |
| التاريخ | تاريخ | |
| العميل | بحث واختيار | مع رصيده وحد الائتمان |
| عرض السعر المرتبط | اختيار (اختياري) | تحويل من Quotation |
| المخزن | اختيار | مخزن التوريد |
| تاريخ التسليم المتوقع | تاريخ | |
| المندوب | اختيار | |
| المشروع | اختيار (اختياري) | |
| ملاحظات | نص | |
| مرفقات | ملفات | |

*بنود الأمر:*
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| الصنف | بحث | مع الكمية المتاحة |
| الكمية المطلوبة | رقم | تحذير إن كانت أكبر من المخزون |
| الكمية المسلّمة | رقم | يُملأ عند التسليم |
| سعر الوحدة | رقم | |
| الخصم % | رقم | |
| الإجمالي | محسوب | |

**الأزرار:**
- حفظ كمسودة
- اعتماد الأمر
- تسجيل تسليم
- تحويل إلى فاتورة بيع
- طباعة

---

#### شاشة 3: تسجيل التسليم — ضمن شاشة SO
**آلية العمل:**
1. يفتح المستخدم أمر البيع المعتمد
2. يضغط زر "تسجيل تسليم"
3. تظهر بنود SO مع حقل "الكمية المسلّمة فعلياً"
4. عند الحفظ:
   - تُخصم الكميات من المخزون تلقائياً
   - تُسجَّل حركة مخزنية من نوع "بيع"
   - تتغير حالة SO

---

#### شاشة 4: تقرير أوامر البيع
- أوامر معلقة لم تُسلَّم
- أوامر متأخرة عن موعد التسليم
- مقارنة: المطلوب vs المسلّم vs المُفوتر
- توقعات المبيعات من الأوامر المفتوحة

---

### نموذج قاعدة البيانات

```prisma
model SalesOrder {
  id                   String           @id @default(cuid())
  orderNumber          Int
  orderCode            String?          // SO-0001
  date                 DateTime
  expectedDeliveryDate DateTime?
  customerId           String?
  warehouseId          String?
  quotationId          String?          // ربط بعرض السعر
  projectId            String?
  salesRepId           String?
  status               String           @default("draft")
  // draft | approved | processing | partially_delivered | delivered | invoiced | cancelled
  subtotal             Float            @default(0)
  taxRate              Float            @default(0)
  taxAmount            Float            @default(0)
  total                Float            @default(0)
  notes                String?
  attachments          String?
  approvedBy           String?
  approvedAt           DateTime?
  companyId            String
  branchId             String?
  createdAt            DateTime         @default(now())
  updatedAt            DateTime         @updatedAt

  customer             Customer?        @relation(...)
  warehouse            Warehouse?       @relation(...)
  quotation            Quotation?       @relation(...)
  salesRep             SalesRep?        @relation(...)
  project              Project?         @relation(...)
  company              Company          @relation(...)
  lines                SalesOrderLine[]
  invoices             Invoice[]

  @@unique([orderNumber, companyId])
}

model SalesOrderLine {
  id             String      @id @default(cuid())
  salesOrderId   String
  itemId         String
  description    String?
  quantity       Float
  deliveredQty   Float       @default(0)
  invoicedQty    Float       @default(0)
  price          Float
  discount       Float       @default(0)
  total          Float
  unit           String?

  salesOrder     SalesOrder  @relation(...)
  item           Item        @relation(...)
}
```

---

## 4. الحضور والانصراف

### ما هو نظام الحضور والانصراف؟
نظام يُسجّل وقت حضور كل موظف وانصرافه يومياً، ويحسب ساعات العمل الفعلية، والغيابات، والتأخيرات، والعمل الإضافي. يُلقي بظله مباشرة على مسير الرواتب.

### سيكل الحضور والانصراف

```
[تسجيل الحضور — بداية الدوام]
        ↓
[عمل إضافي / خروج مبكر؟]
        ↓
[تسجيل الانصراف — نهاية الدوام]
        ↓
[احتساب: ساعات فعلية / تأخير / عمل إضافي / غياب]
        ↓
[مراجعة الحضور الشهري من المدير]
        ↓
[اعتماد الحضور وتأثيره على الراتب]
        ↓
[مسير الرواتب يسحب بيانات الحضور تلقائياً]
```

### أنواع الحالات اليومية

| الحالة | الوصف |
|--------|-------|
| `present` حاضر | حضر في الوقت المحدد |
| `late` متأخر | حضر بعد وقت الدوام |
| `absent` غائب | لم يحضر بدون إذن |
| `excused` إجازة | غائب بإذن رسمي |
| `on_leave` إجازة مقررة | ضمن رصيد الإجازات |
| `holiday` إجازة رسمية | عطلة رسمية |
| `overtime` عمل إضافي | عمل لما بعد وقت الدوام |

### شاشات الحضور والانصراف

#### شاشة 1: تسجيل الحضور اليومي `/attendance/record`
**الغرض:** تسجيل حضور وانصراف الموظفين يومياً

**طرق التسجيل:**
1. **يدوي من قِبل HR:** يختار الموظف ويُدخل وقت الحضور/الانصراف
2. **تسجيل جماعي:** يعرض قائمة كل الموظفين ويُحدد كل منهم (حاضر / غائب / إجازة)
3. **استيراد من جهاز البصمة:** رفع ملف CSV/Excel من جهاز الحضور

**الحقول:**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| الموظف | بحث | |
| التاريخ | تاريخ | |
| وقت الحضور | وقت | |
| وقت الانصراف | وقت | |
| الحالة | اختيار | حاضر/غائب/إجازة/... |
| ساعات العمل | محسوبة | تلقائياً |
| التأخير (دقائق) | محسوب | إن وُجد |
| العمل الإضافي (ساعات) | محسوب | |
| ملاحظات | نص | |

---

#### شاشة 2: جدول مواعيد العمل (Work Schedule) `/attendance/schedules`
**الغرض:** تعريف ساعات الدوام الرسمي لكل موظف أو قسم

**الحقول:**
| الحقل | النوع |
|-------|-------|
| اسم الجدول | نص (مثال: دوام صباحي، دوام إداري) |
| وقت الحضور المعياري | وقت |
| وقت الانصراف المعياري | وقت |
| أيام العمل | اختيار متعدد (الأحد–الخميس، ...) |
| مهلة التأخير المسموحة (دقيقة) | رقم |
| احتساب التأخير من | اختيار (فوري / بعد المهلة) |
| احتساب العمل الإضافي من | اختيار |

---

#### شاشة 3: كشف الحضور الشهري `/attendance/monthly`
**الغرض:** عرض تقرير تفصيلي لكل موظف في الشهر

**الجدول يعرض:**
- أسماء الموظفين في الصفوف
- أيام الشهر في الأعمدة
- لون مختلف لكل حالة (أخضر=حاضر، أحمر=غائب، أصفر=متأخر، رمادي=إجازة)

**الإجماليات لكل موظف:**
- عدد أيام الحضور
- عدد أيام الغياب
- عدد أيام التأخير وإجمالي دقائق التأخير
- إجمالي ساعات العمل الإضافي
- رصيد الإجازات المتبقي

---

#### شاشة 4: إدارة الإجازات `/attendance/leaves`
**الغرض:** طلب الإجازات والموافقة عليها

**أنواع الإجازات:**
| النوع | الوصف |
|-------|-------|
| سنوية | إجازة سنوية مقررة |
| مرضية | إجازة مرضية بشهادة |
| طارئة | إجازة طوارئ |
| بدون راتب | إجازة غير مدفوعة |
| أمومة/أبوة | إجازة الوضع |

**سيكل طلب الإجازة:**
```
[موظف يقدم طلب إجازة]
        ↓
[مدير القسم يوافق/يرفض]
        ↓
[HR تعتمد وتخصم من الرصيد]
        ↓
[يُسجَّل في كشف الحضور تلقائياً]
```

---

#### شاشة 5: الإجازات الرسمية `/attendance/holidays`
**الغرض:** تعريف العطلات الرسمية في النظام

**الحقول:**
- اسم الإجازة، التاريخ، هل متكررة سنوياً؟

---

#### شاشة 6: تقارير الحضور `/attendance/reports`
- **تقرير يومي:** من حضر ومن غاب اليوم
- **تقرير شهري لموظف:** كشف كامل بالحضور والغياب
- **تقرير التأخيرات:** أكثر الموظفين تأخراً
- **تقرير العمل الإضافي:** ساعات إضافية لكل موظف
- **تقرير الغيابات:** أيام الغياب غير المبررة

---

### ربط الحضور بمسير الرواتب

عند إنشاء مسير الرواتب، يسحب النظام تلقائياً:
- **أيام الغياب** → خصم يومي = (الراتب الأساسي ÷ أيام العمل) × عدد أيام الغياب
- **التأخيرات** → خصم = (الراتب الأساسي ÷ ساعات الدوام الشهرية) × دقائق التأخير
- **العمل الإضافي** → إضافة = سعر ساعة العمل الإضافي × الساعات الإضافية

---

### نماذج قاعدة البيانات — الحضور

```prisma
model WorkSchedule {
  id                    String           @id @default(cuid())
  name                  String           // "دوام صباحي"
  checkInTime           String           // "08:00"
  checkOutTime          String           // "17:00"
  workDays              String           // JSON: ["Sun","Mon","Tue","Wed","Thu"]
  lateToleranceMinutes  Int              @default(0)
  overtimeStartAfter    Int              @default(0) // دقائق بعد نهاية الدوام
  companyId             String
  createdAt             DateTime         @default(now())
  company               Company          @relation(...)
  employees             Employee[]       // موظفون مرتبطون بهذا الجدول
}

model AttendanceRecord {
  id              String    @id @default(cuid())
  employeeId      String
  date            DateTime
  checkIn         DateTime?
  checkOut        DateTime?
  status          String    // present | late | absent | excused | on_leave | holiday | overtime
  workHours       Float     @default(0)
  lateMinutes     Int       @default(0)
  overtimeHours   Float     @default(0)
  notes           String?
  source          String    @default("manual") // manual | device | import
  companyId       String
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  employee        Employee  @relation(...)
  company         Company   @relation(...)

  @@unique([employeeId, date])
  @@index([companyId, date])
}

model LeaveRequest {
  id            String    @id @default(cuid())
  employeeId    String
  type          String    // annual | sick | emergency | unpaid | maternity
  startDate     DateTime
  endDate       DateTime
  daysCount     Int
  reason        String?
  status        String    @default("pending") // pending | approved | rejected
  approvedBy    String?
  approvedAt    DateTime?
  notes         String?
  companyId     String
  createdAt     DateTime  @default(now())
  employee      Employee  @relation(...)
  company       Company   @relation(...)
}

model LeaveBalance {
  id          String   @id @default(cuid())
  employeeId  String
  year        Int
  type        String   // annual | sick | ...
  entitled    Int      // الرصيد المستحق
  used        Int      @default(0)
  remaining   Int
  companyId   String
  employee    Employee @relation(...)
  company     Company  @relation(...)

  @@unique([employeeId, year, type])
}

model OfficialHoliday {
  id          String   @id @default(cuid())
  name        String
  date        DateTime
  isRecurring Boolean  @default(false)
  companyId   String
  company     Company  @relation(...)
}
```

---

## 5. سجل النشاط (Audit Log)

### ما هو سجل النشاط؟
سجل النشاط (Audit Trail / Activity Log) هو نظام يُسجّل كل عملية تحدث في النظام: من قام بها، ماذا فعل، متى، وما الذي تغير. يُستخدم للمراجعة والمساءلة والأمان.

### ما الذي يُسجَّل؟

| النوع | أمثلة |
|-------|-------|
| **إنشاء** | إنشاء فاتورة، موظف جديد، مستخدم جديد |
| **تعديل** | تعديل سعر صنف، تغيير بيانات عميل |
| **حذف** | حذف فاتورة، حذف قيد يومي |
| **تسجيل دخول/خروج** | login, logout |
| **تغيير كلمة المرور** | password change |
| **اعتماد** | اعتماد مسير رواتب، اعتماد أمر شراء |
| **طباعة** | طباعة فاتورة، تقرير |
| **تصدير** | تصدير Excel، PDF |
| **تغييرات الإعدادات** | تغيير السنة المالية، إعدادات الضريبة |
| **الصلاحيات** | تغيير صلاحيات مستخدم |

### شاشات سجل النشاط

#### شاشة 1: سجل النشاط الكامل `/activity-log`
**الغرض:** عرض جميع الأحداث في النظام مع الفلترة

**البيانات المعروضة:**
| العمود | الوصف |
|--------|-------|
| التاريخ والوقت | timestamp دقيق |
| المستخدم | اسمه + اسم المستخدم |
| نوع العملية | إنشاء / تعديل / حذف / تسجيل دخول |
| الموديول | فواتير / مشتريات / موظفين / ... |
| التفاصيل | مثال: "أنشأ فاتورة بيع رقم 1023 للعميل محمد أحمد بمبلغ 5000 ريال" |
| IP Address | عنوان الجهاز |
| البيانات القديمة | القيم قبل التعديل |
| البيانات الجديدة | القيم بعد التعديل |

**الفلاتر:**
- حسب المستخدم
- حسب نوع العملية (إنشاء / تعديل / حذف / ...)
- حسب الموديول (فواتير / مشتريات / موظفين / ...)
- حسب التاريخ (من - إلى)
- حسب الفرع
- بحث في التفاصيل

**ملاحظة مهمة:** السجل للقراءة فقط — لا يمكن لأي مستخدم حذف سجلات النشاط، حتى الـ super admin لا يمكنه الحذف.

---

#### شاشة 2: نشاط مستخدم بعينه `/activity-log/user/[userId]`
**الغرض:** عرض كل ما فعله مستخدم محدد

**يتضمن:**
- سجل تسجيلات الدخول والخروج
- كل الفواتير التي أنشأها أو عدّلها
- كل القيود المحاسبية
- تغييرات الإعدادات

---

#### شاشة 3: سجل وثيقة بعينها (Document History)
**الغرض:** عرض تاريخ أي وثيقة (فاتورة، أمر شراء، ...)

**مثال:** في صفحة فاتورة بيع رقم 1023، يوجد tab أو زر "السجل" يعرض:
```
2026-06-21 10:15  |  أحمد محمد  |  أنشأ الفاتورة
2026-06-21 11:30  |  محمد علي   |  عدّل السعر من 4500 إلى 5000
2026-06-21 14:00  |  أحمد محمد  |  طبع الفاتورة
2026-06-22 09:00  |  محمد علي   |  أضاف دفعة بمبلغ 2000
```

---

#### شاشة 4: لوحة تحكم النشاط `/activity-log/dashboard`
**الغرض:** نظرة عامة سريعة

**تعرض:**
- آخر 10 أحداث مباشرة (real-time)
- أكثر المستخدمين نشاطاً اليوم
- عدد الفواتير المنشأة اليوم
- عدد الحذف والتعديلات اليوم
- تنبيهات: تسجيل دخول من IP غير معروف، محاولات فاشلة

---

### نموذج قاعدة البيانات — سجل النشاط

```prisma
model ActivityLog {
  id           String   @id @default(cuid())
  userId       String?
  userName     String?  // نسخة من الاسم وقت الحدث
  action       String   // create | update | delete | login | logout | print | export | approve
  module       String   // invoices | purchases | employees | settings | ...
  entityType   String?  // Invoice | Employee | PurchaseOrder | ...
  entityId     String?  // الـ id للعنصر المتأثر
  entityRef    String?  // رقم مرجعي بشري (فاتورة 1023، ...)
  description  String   // وصف مقروء: "أنشأ فاتورة بيع رقم 1023"
  oldData      Json?    // البيانات القديمة قبل التعديل
  newData      Json?    // البيانات الجديدة بعد التعديل
  ipAddress    String?
  userAgent    String?
  companyId    String?
  branchId     String?
  createdAt    DateTime @default(now())

  @@index([companyId, createdAt])
  @@index([userId, createdAt])
  @@index([module, action])
  @@index([entityType, entityId])
}
```

### آلية التسجيل التلقائي

يُنشأ **Middleware** في Next.js API يعترض كل طلب POST/PUT/DELETE ويُسجّل:
- من قام بالعملية (من الـ session)
- على أي endpoint
- البيانات التي أُرسلت
- ما الذي تغير (مقارنة القيم القديمة والجديدة)

```typescript
// مثال على آلية التسجيل في كل API route
await logActivity({
  userId: session.user.id,
  action: 'create',
  module: 'invoices',
  entityType: 'Invoice',
  entityId: newInvoice.id,
  entityRef: `فاتورة بيع رقم ${newInvoice.invoiceNumber}`,
  description: `أنشأ فاتورة بيع رقم ${newInvoice.invoiceNumber} للعميل ${customer.name} بمبلغ ${newInvoice.total}`,
  newData: newInvoice,
  companyId: session.user.companyId,
});
```

---

## 6. ما ينقص نشاط الخدمات

### عقود الخدمة (Service Contracts)

#### ما هو؟
وثيقة رسمية بين الشركة والعميل تُحدد نطاق الخدمات المقدمة، ومدة العقد، والسعر الدوري، وشروط التجديد. أساس نشاط الخدمات.

#### سيكل عقد الخدمة
```
[تقديم عرض سعر للعميل]
        ↓
[توقيع عقد خدمة — حالة: نشط]
        ↓
[إنشاء فواتير دورية تلقائياً (شهري/ربعي/سنوي)]
        ↓
[تنفيذ الخدمة — أوامر العمل]
        ↓
[مراجعة الأداء / تجديد العقد أو إنهاؤه]
```

#### الحقول الرئيسية
| الحقل | الوصف |
|-------|-------|
| رقم العقد | تسلسلي |
| العميل | |
| نوع الخدمة | صيانة / استشارة / تطوير / ... |
| تاريخ البداية | |
| تاريخ النهاية | |
| قيمة العقد الإجمالية | |
| دورية الفوترة | شهري / ربعي / نصف سنوي / سنوي |
| شروط التجديد | تجديد تلقائي / يدوي |
| الحالة | draft / active / expired / cancelled |

---

### أوامر العمل (Work Orders)

#### ما هو؟
طلب داخلي لتنفيذ خدمة محددة لعميل معين. يُنشأ من عقد الخدمة أو مباشرة ويُسند لموظف أو فريق.

#### سيكل أمر العمل
```
[طلب خدمة من العميل]
        ↓
[إنشاء أمر عمل — حالة: جديد]
        ↓
[تعيين موظف/فريق — حالة: مُسنَد]
        ↓
[بدء التنفيذ — حالة: جاري]
        ↓
[الانتهاء + توقيع العميل — حالة: مكتمل]
        ↓
[إنشاء فاتورة خدمة مرتبطة]
```

#### الحقول الرئيسية
| الحقل | الوصف |
|-------|-------|
| رقم أمر العمل | |
| العميل | |
| عقد الخدمة المرتبط | اختياري |
| **رقم أمر الشراء (PO)** | **لربط خدمة بأمر شراء العميل** |
| نوع الخدمة | |
| الأولوية | عادي / عاجل / حرج |
| الموظف المُسنَد | |
| التاريخ المطلوب | |
| وقت البداية الفعلي | |
| وقت الانتهاء الفعلي | |
| المواد المستخدمة | أصناف + كميات |
| تكلفة العمالة | |
| الحالة | new / assigned / in_progress / completed / invoiced |

---

### حقل رقم أمر الشراء في الفاتورة (المطلوب تحديداً)

في كثير من شركات الخدمات، يُرسل العميل **أمر شراء (PO)** خاص به قبل تقديم الخدمة. الشركة مُلزمة بذكر رقم هذا الأمر في فاتورتها حتى يتمكن قسم الحسابات لدى العميل من مطابقة الفاتورة.

**التعديل المطلوب:**
- إضافة حقل `customerPONumber` (نص) في نموذج Invoice
- يظهر هذا الحقل في شاشة إنشاء فاتورة الخدمة
- يُطبع في الفاتورة بشكل واضح: "رقم أمر شراء العميل: PO-XYZ"

---

### نماذج قاعدة البيانات — الخدمات

```prisma
model ServiceContract {
  id                String       @id @default(cuid())
  contractNumber    Int
  customerId        String
  type              String       // maintenance | consulting | development | support
  startDate         DateTime
  endDate           DateTime?
  contractValue     Float        @default(0)
  billingCycle      String       // monthly | quarterly | semi_annual | annual
  autoRenew         Boolean      @default(false)
  status            String       @default("draft") // draft | active | expired | cancelled
  description       String?
  terms             String?
  attachments       String?
  companyId         String
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  customer          Customer     @relation(...)
  company           Company      @relation(...)
  workOrders        WorkOrder[]
  invoices          Invoice[]
}

model WorkOrder {
  id                String      @id @default(cuid())
  orderNumber       Int
  customerId        String?
  contractId        String?     // عقد الخدمة المرتبط
  customerPONumber  String?     // رقم أمر شراء العميل
  type              String
  priority          String      @default("normal") // low | normal | high | critical
  assignedTo        String?     // employeeId
  scheduledDate     DateTime?
  startedAt         DateTime?
  completedAt       DateTime?
  status            String      @default("new") // new | assigned | in_progress | completed | invoiced | cancelled
  description       String?
  resolution        String?
  notes             String?
  companyId         String
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  customer          Customer?   @relation(...)
  contract          ServiceContract? @relation(...)
  assignedEmployee  Employee?   @relation(...)
  company           Company     @relation(...)
  materials         WorkOrderMaterial[]
  invoice           Invoice?    // الفاتورة المنشأة من هذا الأمر
}

model WorkOrderMaterial {
  id          String    @id @default(cuid())
  workOrderId String
  itemId      String
  quantity    Float
  unitPrice   Float
  total       Float
  workOrder   WorkOrder @relation(...)
  item        Item      @relation(...)
}
```

---

كمية | فوق 100 قطعة → خصم 5% |
| سعر موسمي | في فترة زمنية | تخفيضات الصيف |

#### نموذج قاعدة البيانات
```prisma
model PriceList {
  id          String          @id @default(cuid())
  name        String          // "أسعار الموزعين"
  type        String          // customer_group | individual | volume | seasonal
  startDate   DateTime?
  endDate     DateTime?
  isActive    Boolean         @default(true)
  companyId   String
  createdAt   DateTime        @default(now())
  company     Company         @relation(...)
  items       PriceListItem[]
  customers   Customer[]      // العملاء المرتبطون بهذه القائمة
}

model PriceListItem {
  id           String    @id @default(cuid())
  priceListId  String
  itemId       String
  price        Float
  discountRate Float     @default(0)
  minQty       Float     @default(1)  // الحد الأدنى للكمية
  priceList    PriceList @relation(...)
  item         Item      @relation(...)
}
```

---

### حسابات عمولات المناديب (Commission Calculations)

#### الموجود حالياً
يوجد نموذج SalesRepresentative مع `commissionRate` لكنه لا يُحسب تلقائياً.

#### المطلوب إضافته
- **شاشة تصفية عمولات**: تحسب عمولة كل مندوب لفترة محددة
- **تقرير المندوبين**: مبيعات كل مندوب، عمولاته، المحصّل منها
- **ربط العمولة بالتحصيل**: نوعان:
  - عمولة على الفاتورة: تُحسب عند إنشاء الفاتورة
  - عمولة على التحصيل: تُحسب عند قبض المبلغ من العميل

---

### تتبع الدُّفعات (Batch/Lot Tracking)

#### ما هو؟
ربط كل كمية من صنف بدُفعة إنتاج أو استيراد محددة، مع تاريخ انتهاء الصلاحية.

#### نموذج قاعدة البيانات
```prisma
model ItemBatch {
  id             String    @id @default(cuid())
  itemId         String
  warehouseId    String
  batchNumber    String
  expiryDate     DateTime?
  quantity       Float
  costPrice      Float
  invoiceId      String?   // فاتورة الشراء التي جاءت منها
  companyId      String
  createdAt      DateTime  @default(now())

  item           Item      @relation(...)
  warehouse      Warehouse @relation(...)
}
```
## 7. ما ينقص نشاط التجزئة

### نقطة بيع التجزئة (Retail POS)

#### الفرق بين POS المطعم وPOS التجزئة
| الميزة | POS مطعم (موجود) | POS تجزئة (مطلوب) |
|--------|------------------|-------------------|
| طريقة الدفع | نقدي/بطاقة/مختلط | + نقاط ولاء + بطاقة هدايا |
| المخزون | لا يُعتبر | خصم مباشر من المخزن |
| الأصناف | وجبات مع إضافات | أصناف عادية + باركود |
| الفواتير | طلب مطعم | فاتورة بيع مباشرة |
| العميل | اختياري | مرتبط بنقاط الولاء |
| الإرجاع | محدود | إرجاع مباشر |

---

### برنامج نقاط الولاء (Loyalty Program)

#### سيكل نقاط الولاء
```
[عميل يشتري بمبلغ X]
        ↓
[النظام يُضيف نقاط = المبلغ × معدل النقاط]
        ↓
[رصيد النقاط يُحفظ للعميل]
        ↓
[في عملية شراء جديدة: العميل يستبدل النقاط بخصم]
        ↓
[النقاط المستخدمة تُخصم من الرصيد]
```

#### نموذج قاعدة البيانات
```prisma
model LoyaltyProgram {
  id                 String    @id @default(cuid())
  name               String
  pointsPerCurrency  Float     // نقطة لكل وحدة نقد (مثال: 1 نقطة لكل 10 ريال)
  pointsValue        Float     // قيمة النقطة عند الاستبدال (مثال: 0.1 ريال)
  minRedeemPoints    Int       // أقل عدد نقاط للاستبدال
  expiryMonths       Int?      // صلاحية النقاط
  isActive           Boolean   @default(true)
  companyId          String
  company            Company   @relation(...)
}

model CustomerPoints {
  id           String   @id @default(cuid())
  customerId   String
  balance      Float    @default(0)
  totalEarned  Float    @default(0)
  totalRedeemed Float   @default(0)
  companyId    String
  updatedAt    DateTime @updatedAt
  customer     Customer @relation(...)

  @@unique([customerId, companyId])
}

model PointsTransaction {
  id          String   @id @default(cuid())
  customerId  String
  type        String   // earned | redeemed | expired | adjusted
  points      Float
  invoiceId   String?
  notes       String?
  companyId   String
  createdAt   DateTime @default(now())
  customer    Customer @relation(...)
}
```

---

### تتبع الأرقام التسلسلية (Serial Numbers)

#### ما هو؟
ربط كل وحدة مُباعة برقم تسلسلي فريد. ضروري للأجهزة الإلكترونية والمعدات.

```prisma
model SerialNumber {
  id          String    @id @default(cuid())
  itemId      String
  serial      String
  warehouseId String?
  status      String    @default("in_stock") // in_stock | sold | returned | defective
  invoiceId   String?   // فاتورة البيع
  customerId  String?
  soldAt      DateTime?
  warrantyEnd DateTime?
  companyId   String
  createdAt   DateTime  @default(now())

  item        Item      @relation(...)

  @@unique([serial, companyId])
}
```

---

## 9. ما ينقص نشاط المقاولات

### طلبات المواد (Material Requests)

#### ما هي؟
طلب داخلي من موقع المشروع لاستلام مواد من المخزن أو طلب شراء مواد جديدة.

#### سيكل طلب المواد
```
[مشرف الموقع يطلب مواد]
        ↓
[طلب مواد — حالة: معلق]
        ↓
[مدير المشروع يوافق]
        ↓
[مخزن موجود؟]
    ↓ نعم              ↓ لا
[صرف من المخزن]   [إنشاء أمر شراء]
        ↓
[المواد تصل للموقع — حالة: منفذ]
        ↓
[التكاليف تُضاف لميزانية المشروع]
```

#### نموذج قاعدة البيانات
```prisma
model MaterialRequest {
  id               String               @id @default(cuid())
  requestNumber    Int
  projectId        String
  phaseId          String?
  requestedBy      String               // employeeId
  requestDate      DateTime
  requiredDate     DateTime?
  status           String               @default("pending")
  // pending | approved | partially_fulfilled | fulfilled | rejected
  notes            String?
  companyId        String
  createdAt        DateTime             @default(now())
  updatedAt        DateTime             @updatedAt

  project          Project              @relation(...)
  phase            ProjectPhase?        @relation(...)
  requester        Employee             @relation(...)
  company          Company              @relation(...)
  lines            MaterialRequestLine[]
  purchaseOrder    PurchaseOrder?       // أمر الشراء المُنشأ منه
}

model MaterialRequestLine {
  id                String          @id @default(cuid())
  requestId         String
  itemId            String
  quantity          Float
  fulfilledQty      Float           @default(0)
  unit              String?
  notes             String?
  request           MaterialRequest @relation(...)
  item              Item            @relation(...)
}
```

---

### التقارير اليومية للمشاريع (Daily Site Reports)

#### ما هي؟
تقرير يومي يُرفع من موقع العمل يوضح: ما تم إنجازه، عدد العمال، الظروف الجوية، المشكلات، المواد المستهلكة.

#### نموذج قاعدة البيانات
```prisma
model DailySiteReport {
  id                String    @id @default(cuid())
  reportNumber      Int
  projectId         String
  date              DateTime
  weather           String?   // sunny | cloudy | rainy | windy
  workersCount      Int       @default(0)
  workDescription   String    // ما تم إنجازه
  issues            String?   // المشكلات والعقبات
  safetyIncidents   String?
  visitorsCount     Int       @default(0)
  completionPercent Float?
  notes             String?
  submittedBy       String    // employeeId
  companyId         String
  createdAt         DateTime  @default(now())

  project           Project   @relation(...)
  submitter         Employee  @relation(...)
}
```

---

## 10. تعديل الفاتورة

### إضافة حقل رقم أمر الشراء للعميل

```prisma
// في نموذج Invoice — إضافة الحقول التالية:
model Invoice {
  // ... الحقول الموجودة ...

  // ربط بأوامر الشراء والبيع في النظام
  purchaseOrderId   String?   // ربط بـ PurchaseOrder في النظام
  salesOrderId      String?   // ربط بـ SalesOrder في النظام

  // رقم أمر الشراء الخاص بالعميل (نص حر)
  customerPONumber  String?   // "رقم مرجع العميل / أمر الشراء الخارجي"

  purchaseOrder     PurchaseOrder? @relation(...)
  salesOrder        SalesOrder?    @relation(...)
}
```

### كيف يظهر في الواجهة؟

**في شاشة إنشاء فاتورة الخدمة:**
```
┌─────────────────────────────────────────┐
│  رقم أمر الشراء (العميل)               │
│  ┌──────────────────────────────────┐   │
│  │  PO-2026-XYZ                     │   │
│  └──────────────────────────────────┘   │
│  أدخل رقم أمر الشراء الخاص بالعميل    │
└─────────────────────────────────────────┘
```

**في طباعة الفاتورة:**
```
──────────────────────────────────────
الفاتورة رقم: 1023
التاريخ: 2026-06-21
رقم أمر شراء العميل: PO-2026-XYZ    ← يظهر هنا
──────────────────────────────────────
```

---

## 11. أولوية التنفيذ

### المرحلة الأولى — أساسيات (4-6 أسابيع)
| المهمة | الوصف | الأسابيع |
|--------|-------|---------|
| سجل النشاط (Audit Log) | نموذج DB + Middleware + شاشة | 1-2 |
| حضور وانصراف — الأساسي | نماذج DB + تسجيل يدوي + كشف شهري | 2-3 |
| حقل رقم PO في الفاتورة | تعديل DB + واجهة + طباعة | 0.5 |
| أوامر الشراء | نماذج DB + API + شاشات كاملة | 2-3 |
| أوامر البيع | نماذج DB + API + شاشات كاملة | 2-3 |

### المرحلة الثانية — ميزات متقدمة (6-8 أسابيع)
| المهمة | الأسابيع |
|--------|---------|
| إدارة الإجازات + رصيد إجازات | 1-2 |
| جدول مواعيد العمل | 1 |
| ربط الحضور بمسير الرواتب | 1 |
| عقود الخدمة | 2 |
| أوامر العمل (Work Orders) | 2 |

### المرحلة الثالثة — ميزات متخصصة (8-12 أسابيع)
| المهمة | النشاط | الأسابيع |
|--------|--------|---------|
| قوائم الأسعار المتعددة | جملة | 2 |
| تتبع الدفعات والأرقام التسلسلية | جملة/تجزئة | 2 |
| نقاط الولاء | تجزئة | 2 |
| طلبات المواد للمقاولات | مقاولات | 2 |
| التقارير اليومية للمشاريع | مقاولات | 1 |
| POS التجزئة | تجزئة | 3 |

---

## 12. مخطط قاعدة البيانات الكامل

### النماذج الجديدة المطلوب إضافتها

```
النظام الحالي:
├── Company, Branch, User, Role
├── Invoice, InvoiceLine
├── Quotation, QuotationLine
├── Item, Category, Unit, Stock, StockMovement
├── Warehouse, WarehouseTransfer
├── Stocktaking
├── Customer, Supplier
├── Treasury, Voucher
├── Account, JournalEntry, CostCenter
├── Employee, Payroll, Advance, Deduction
├── Partner, PartnerTransaction
├── FixedAsset, FinancialYear
├── Project, ProjectPhase, ProgressBill
├── Subcontractor, SubContract
└── PosOrder, Shift, RestaurantTable, ...

النماذج الجديدة المطلوب إضافتها:
├── 🆕 PurchaseOrder, PurchaseOrderLine         ← أوامر الشراء
├── 🆕 SalesOrder, SalesOrderLine               ← أوامر البيع
├── 🆕 AttendanceRecord                         ← الحضور والانصراف
├── 🆕 WorkSchedule                             ← جدول مواعيد العمل
├── 🆕 LeaveRequest, LeaveBalance               ← الإجازات
├── 🆕 OfficialHoliday                          ← العطلات الرسمية
├── 🆕 ActivityLog                              ← سجل النشاط
├── 🆕 ServiceContract                          ← عقود الخدمة
├── 🆕 WorkOrder, WorkOrderMaterial             ← أوامر العمل
├── 🆕 PriceList, PriceListItem                 ← قوائم الأسعار
├── 🆕 ItemBatch                                ← تتبع الدفعات
├── 🆕 SerialNumber                             ← الأرقام التسلسلية
├── 🆕 LoyaltyProgram, CustomerPoints           ← نقاط الولاء
├── 🆕 PointsTransaction                        ← حركات النقاط
├── 🆕 MaterialRequest, MaterialRequestLine     ← طلبات المواد
└── 🆕 DailySiteReport                          ← تقارير المواقع

التعديلات على النماذج الموجودة:
├── 📝 Invoice: + purchaseOrderId, + salesOrderId, + customerPONumber
├── 📝 Employee: + workScheduleId
├── 📝 Customer: + priceListId, + loyaltyProgramId
└── 📝 Project: + materialRequests[]
```

---

## ملاحظات ختامية

1. **سجل النشاط** يجب أن يُبنى أولاً لأنه يحتاج أن يكون موجوداً قبل باقي الميزات حتى يُسجّل كل شيء منذ البداية

2. **أوامر الشراء والبيع** هما الأكثر تأثيراً على جميع الأنشطة وتعظيم فائدة النظام

3. **الحضور والانصراف** مطلوب قبل أي مسير رواتب لأن الرواتب تعتمد عليه

4. **حقل رقم PO في الفاتورة** أسرع مهمة وتُحل في يوم واحد

5. **باقي الميزات** تُبنى تدريجياً حسب الأولوية ونوع النشاط

---

*آخر تحديث: 2026-06-21 | erp-app Planning Document v1.0*
