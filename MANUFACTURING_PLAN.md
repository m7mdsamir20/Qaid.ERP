# خطة نشاط المصانع — MANUFACTURING
**تاريخ الخطة:** 2026-06-26

---

## أولاً: السيكل الكامل لنشاط المصانع

```
[إعداد الأصناف] ──► [وصفة الإنتاج BOM] ──► [أمر إنتاج]
                                                    │
                    ┌───────────────────────────────┘
                    ▼
         [سحب المواد الخام من المخزن]
                    │
                    ▼
         [تسجيل الإنتاج الفعلي]
                    │
                    ▼
         [مراقبة الجودة — قبول / رفض]
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
  [إضافة المقبول للمخزن]   [تسجيل الهدر/المرفوض]
          │
          ▼
   [فاتورة مبيعات]
          │
          ▼
   [تقارير التكلفة والإنتاجية]
```

**بالتفصيل:**
1. تُعرَّف المواد الخام والمنتجات النهائية في **الأصناف** (مع تحديد نوع كل صنف)
2. تُحدد **وصفة الإنتاج (BOM)** — كمية كل مادة خام لإنتاج وحدة واحدة
3. يُنشأ **أمر إنتاج** — يحدد المنتج، الوصفة، الكمية، المخازن، التواريخ
4. عند تنفيذ الأمر تُسحب المواد الخام تلقائياً من المخزن
5. عند اكتمال الإنتاج تُسجَّل الكميات الفعلية ومراقبة الجودة
6. الكمية المقبولة تُضاف للمخزن، والمرفوضة تُسجَّل كهدر
7. يمكن بيع المنتج النهائي بفاتورة مبيعات عادية
8. التقارير تحسب التكلفة الفعلية مقارنة بالمخططة وتتبع الإنتاجية

---

## ثانياً: الصفحات الجديدة (تُبنى من الصفر)

### 1. وصفات الإنتاج — `/manufacturing/bom`

**الهدف:** تحديد مكونات كل منتج نهائي (كمية الخامات اللازمة لإنتاج وحدة واحدة)

**الجداول في الداتابيز:**
```
ProductionBom:     id, name, itemId, yieldQty, yieldUnitId, notes, companyId, createdAt
ProductionBomLine: id, bomId, itemId, quantity, unitId, notes
```

**فورم إنشاء وصفة إنتاج:**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| اسم الوصفة | نص | مثال: وصفة كيس بلاستيك 5كجم |
| المنتج النهائي | اختيار أصناف (type=product أو semi_finished) | |
| الكمية المنتجة | رقم | كمية المنتج الناتجة من هذه الوصفة |
| الوحدة | اختيار | |
| **جدول المكونات:** | | |
| — المادة الخام | اختيار أصناف (type=raw أو semi_finished) | |
| — الكمية | رقم | |
| — الوحدة | اختيار | |
| — ملاحظة | نص | اختياري |
| التكلفة الإجمالية المقدرة | حسابي تلقائي | مجموع (كمية × سعر التكلفة) |
| ملاحظات | نص | |

---

### 2. أوامر الإنتاج — `/manufacturing/production-orders`

**الهدف:** إصدار أمر لإنتاج كمية معينة، وتتبع تنفيذه حتى الاكتمال

**الجداول في الداتابيز:**
```
ProductionOrder:
  id, orderNumber, date, startDate, expectedEndDate, actualEndDate,
  itemId, bomId, plannedQty, actualQty, acceptedQty, rejectedQty,
  warehouseId, outputWarehouseId,
  status (draft|in_progress|completed|cancelled),
  notes, companyId, branchId, createdAt

ProductionOrderLine:
  id, productionOrderId, itemId, plannedQty, actualQty, unitId
```

**فورم إنشاء أمر إنتاج:**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| رقم الأمر | تلقائي | |
| التاريخ | تاريخ | |
| تاريخ البدء | تاريخ | |
| تاريخ الانتهاء المتوقع | تاريخ | |
| المنتج النهائي | اختيار من أصناف | |
| الوصفة | اختيار من BOM المرتبطة بالمنتج | تملأ المكونات تلقائياً |
| الكمية المطلوبة | رقم | |
| مخزن المواد الخام | اختيار | |
| مخزن الإنتاج (المنتج النهائي) | اختيار | |
| **جدول المواد المطلوبة (تلقائي من BOM):** | | |
| — المادة الخام | قراءة فقط | |
| — الكمية المطلوبة | محسوب | BOM × الكمية المطلوبة |
| — المتاح في المخزن | قراءة فقط | |
| — الفرق | ملوّن أحمر لو ناقص | |
| ملاحظات | نص | |

**حالات أمر الإنتاج:**
| الحالة | ما يحدث |
|--------|---------|
| مسودة | يمكن التعديل، لا تأثير على المخزن |
| جاري | تُخصم الخامات من المخزن عند بدء التنفيذ |
| مكتمل | يُفتح modal مراقبة الجودة لتسجيل المقبول والمرفوض |
| ملغي | يُعاد المخزون لو كان الأمر في حالة "جاري" |

**Modal إكمال الأمر + مراقبة الجودة:**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| تاريخ الاكتمال | تاريخ | |
| الكمية المنتجة فعلياً | رقم | |
| الكمية المقبولة | رقم | تُضاف للمخزن |
| الكمية المرفوضة | رقم | تُسجَّل كهدر |
| سبب الرفض | نص | اختياري |
| المواد المستهلكة فعلياً | جدول | قد تختلف عن المخطط |

---

### 3. مراقبة الجودة — `/manufacturing/quality` *(اختياري — مرحلة ثانية)*

> إذا كان الـ modal داخل أمر الإنتاج يكفي، تُنفَّذ هذه الصفحة لاحقاً

**الهدف:** صفحة مستقلة لسجل كل عمليات فحص الجودة المرتبطة بأوامر الإنتاج

**يعرض:**
- جدول بكل سجلات الجودة (أمر الإنتاج، المنتج، المقبول، المرفوض، التاريخ)
- فلتر حسب المنتج / التاريخ / الحالة
- إمكانية طباعة تقرير الجودة لكل دفعة

---

## ثالثاً: تغييرات على الصفحات الموجودة

### 1. صفحة الأصناف — `/items`

**الحقول الموجودة بالفعل في الـ schema:** `type: "product" | "raw" | "semi_finished" | "service"`

**إضافات في فورم الصنف:**
| الحقل | التغيير |
|-------|---------|
| نوع الصنف | **إضافة** — dropdown: منتج نهائي / مادة خام / نصف مصنع |
| الحد الأدنى للمخزون | **إضافة** — رقم، يُستخدم للتنبيه عند انخفاض الخامات |
| وصفات الإنتاج | **إضافة تبويب** في تفاصيل الصنف — يعرض BOMs المرتبطة |

**تغييرات في قائمة الأصناف:**
| التغيير |
|---------|
| **إضافة فلتر** "نوع الصنف" (كل الأصناف / مواد خام / منتجات نهائية / نصف مصنع) |
| **إضافة عمود** "النوع" في الجدول مع badge ملون |
| **إضافة تنبيه** لو المخزون أقل من الحد الأدنى (أيقونة تحذير في العمود) |

---

### 2. صفحة المشتريات — `/purchases`

| الحقل | التغيير |
|-------|---------|
| فلتر الأصناف في سطور الفاتورة | **تغيير** — يعرض مواد خام ونصف مصنع افتراضياً (مع خيار "عرض الكل") |

---

### 3. صفحة المبيعات — `/sales`

| الحقل | التغيير |
|-------|---------|
| فلتر الأصناف في سطور الفاتورة | **تغيير** — يعرض منتجات نهائية فقط افتراضياً |

---

### 4. صفحة الجرد — `/stocktakings`

| التغيير |
|---------|
| **إضافة فلتر** "نوع الصنف" (خامات / منتجات نهائية / نصف مصنع / الكل) |

---

### 5. التقارير — `/reports`

**التقارير الجديدة:**

#### أ) تقرير تكلفة الإنتاج — `/reports/production-cost`
**الهدف:** مقارنة التكلفة المخططة بالفعلية لكل أمر إنتاج

| العمود | المصدر |
|--------|--------|
| رقم أمر الإنتاج | |
| المنتج | |
| الكمية المخططة | |
| الكمية المنتجة | |
| الكمية المقبولة | |
| الكمية المرفوضة (الهدر) | |
| تكلفة الخامات المخططة | BOM × سعر التكلفة |
| تكلفة الخامات الفعلية | المستهلك فعلاً × سعر التكلفة |
| تكلفة الوحدة المخططة | |
| تكلفة الوحدة الفعلية | |
| سعر البيع | |
| هامش الربح | |

---

#### ب) تقرير حركة المواد الخام — `/reports/raw-material-movement`
**الهدف:** تتبع مصدر وصرف كل مادة خام

| العمود | |
|--------|--|
| الصنف (المادة الخام) | |
| رصيد أول المدة | |
| الوارد (من المشتريات) | |
| المصروف (لأوامر الإنتاج) | |
| رصيد آخر المدة | |
| فلتر: تاريخ / مادة خام / مخزن | |

---

#### ج) تقرير ملخص الإنتاج الشهري — `/reports/production-summary`
**الهدف:** نظرة عامة على حجم الإنتاج شهرياً

| العمود | |
|--------|--|
| الشهر | |
| عدد أوامر الإنتاج | |
| إجمالي الكميات المنتجة | |
| نسبة القبول | مقبول / إجمالي |
| نسبة الهدر | مرفوض / إجمالي |
| إجمالي التكلفة | |

---

#### د) تقرير الهدر والفاقد — `/reports/production-waste`
**الهدف:** تحليل الهدر في الإنتاج

| العمود | |
|--------|--|
| أمر الإنتاج | |
| المنتج | |
| الكمية المرفوضة | |
| سبب الرفض | |
| تكلفة الهدر | الكمية المرفوضة × تكلفة الوحدة |
| فلتر: تاريخ / منتج | |

---

### 6. صفحة التسجيل — `/register`

```typescript
{ value: "MANUFACTURING", label: "مصانع وتصنيع" }
```

---

### 7. السوبر ادمن — صفحة إعداد الشركة

| التغيير |
|---------|
| إضافة "MANUFACTURING" في قائمة أنواع الأنشطة |
| ربط الصفحات الخاصة: `/manufacturing/bom`, `/manufacturing/production-orders` |
| ربط التقارير الخاصة: 4 تقارير جديدة |

---

## رابعاً: الصفحات المرتبطة بنشاط المصانع (كاملة)

### صفحات خاصة بنشاط المصانع فقط:
```
/manufacturing/bom                    ✅ جديدة — وصفات الإنتاج
/manufacturing/production-orders      ✅ جديدة — أوامر الإنتاج
/manufacturing/quality                ✅ جديدة (مرحلة ثانية) — مراقبة الجودة
/reports/production-cost              ✅ جديدة — تقرير تكلفة الإنتاج
/reports/raw-material-movement        ✅ جديدة — حركة المواد الخام
/reports/production-summary           ✅ جديدة — ملخص الإنتاج الشهري
/reports/production-waste             ✅ جديدة — الهدر والفاقد
```

### صفحات موجودة تظهر للمصانع (مع تعديلات):
```
/items                    الأصناف              — فلتر النوع + حد أدنى + عمود النوع
/purchases                المشتريات            — فلتر الأصناف للخامات
/sales                    المبيعات             — فلتر الأصناف للمنتجات النهائية
/stocktakings             الجرد                — فلتر نوع الصنف
```

### صفحات موجودة تظهر للمصانع (بدون تعديل):
```
/purchase-orders          أوامر الشراء
/sales-orders             أوامر البيع
/sale-returns             مرتجعات مبيعات
/purchase-returns         مرتجعات مشتريات
/customers                العملاء
/suppliers                الموردين
/warehouses               المخازن
/warehouse-transfers      تحويلات المخازن
/accounts                 الحسابات
/journal-entries          القيود اليومية
/receipts                 سندات القبض
/payments                 سندات الصرف
/purchase-payments        مدفوعات المشتريات
/employees                الموظفين
/attendance               الحضور والانصراف
/payrolls                 مسير الرواتب
/expenses                 المصروفات
/advances                 السلف
/deductions               الخصومات
/material-requests        طلبات المواد
```

### صفحات لا تظهر لنشاط المصانع:
```
/serial-numbers           ❌ غير مناسب لمعظم المصانع (خامات وكميات وليس أفراد)
/service-contracts        ❌ للخدمات فقط
/work-orders              ❌ للخدمات فقط
/projects                 ❌ للمقاولات فقط
/daily-site-reports       ❌ للمقاولات فقط
/progress-bills           ❌ للمقاولات فقط
/loyalty                  ❌ غير مناسب
/pos                      ❌ للتجزئة فقط
/tables                   ❌ للمطاعم فقط
```

---

## خامساً: جداول الداتابيز الجديدة

```prisma
model ProductionBom {
  id          String              @id @default(cuid())
  name        String
  itemId      String
  yieldQty    Float               @default(1)
  yieldUnitId String?
  notes       String?
  companyId   String
  createdAt   DateTime            @default(now())
  item        Item                @relation(fields: [itemId], references: [id])
  company     Company             @relation(fields: [companyId], references: [id])
  lines       ProductionBomLine[]
  orders      ProductionOrder[]
}

model ProductionBomLine {
  id        String        @id @default(cuid())
  bomId     String
  itemId    String
  quantity  Float
  unitId    String?
  notes     String?
  bom       ProductionBom @relation(fields: [bomId], references: [id], onDelete: Cascade)
  item      Item          @relation(fields: [itemId], references: [id])
}

model ProductionOrder {
  id                String                @id @default(cuid())
  orderNumber       Int
  date              DateTime
  startDate         DateTime?
  expectedEndDate   DateTime?
  actualEndDate     DateTime?
  itemId            String
  bomId             String
  plannedQty        Float
  actualQty         Float?
  acceptedQty       Float?
  rejectedQty       Float?
  rejectionReason   String?
  warehouseId       String
  outputWarehouseId String
  status            String                @default("draft")
  notes             String?
  companyId         String
  branchId          String?
  createdAt         DateTime              @default(now())
  item              Item                  @relation(fields: [itemId], references: [id])
  bom               ProductionBom         @relation(fields: [bomId], references: [id])
  company           Company               @relation(fields: [companyId], references: [id])
  lines             ProductionOrderLine[]

  @@unique([orderNumber, companyId])
}

model ProductionOrderLine {
  id                String          @id @default(cuid())
  productionOrderId String
  itemId            String
  plannedQty        Float
  actualQty         Float?
  unitId            String?
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  item              Item            @relation(fields: [itemId], references: [id])
}
```

**تعديل على Item model** — إضافة `minStock`:
```prisma
minStock  Float?   // الحد الأدنى للمخزون (للتنبيه)
```

---

## سادساً: ترتيب التنفيذ المقترح

| المرحلة | المهمة |
|---------|--------|
| 1 | إضافة MANUFACTURING في register + super admin |
| 2 | إضافة الجداول في schema.prisma + migration + حقل minStock في Item |
| 3 | تعديل صفحة الأصناف (نوع الصنف + حد أدنى + فلتر + عمود) |
| 4 | بناء صفحة وصفات الإنتاج (BOM) + API |
| 5 | بناء صفحة أوامر الإنتاج + API |
| 6 | ربط أوامر الإنتاج بحركات المخزن + مراقبة الجودة (modal) |
| 7 | تعديل المشتريات والمبيعات (فلتر نوع الصنف) |
| 8 | بناء تقرير تكلفة الإنتاج |
| 9 | بناء تقرير حركة المواد الخام |
| 10 | بناء تقرير ملخص الإنتاج الشهري + تقرير الهدر |
| 11 | إضافة الموديولات الجديدة في activity log |
| 12 | صفحة مراقبة الجودة المستقلة (مرحلة ثانية) |
