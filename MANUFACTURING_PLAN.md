# خطة نشاط المصانع — MANUFACTURING
**تاريخ الخطة:** 2026-06-25

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
         [إضافة المنتج النهائي للمخزن]
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   [فاتورة مبيعات]     [تقرير تكلفة الإنتاج]
```

**بالتفصيل:**
1. تُعرَّف المواد الخام والمنتجات النهائية في **الأصناف**
2. تُحدد **وصفة الإنتاج (BOM)** للمنتج النهائي — كمية كل مادة خام لإنتاج وحدة واحدة
3. عند الحاجة للإنتاج يُنشأ **أمر إنتاج** — يحدد المنتج، الكمية، المخزن، التاريخ
4. عند تنفيذ الأمر تُسحب المواد الخام تلقائياً من المخزن (حركة مخزنية سالبة)
5. عند اكتمال الإنتاج يُضاف المنتج النهائي للمخزن (حركة مخزنية موجبة)
6. يمكن بيع المنتج النهائي بفاتورة مبيعات عادية
7. تقرير تكلفة الإنتاج يحسب التكلفة الفعلية مقارنة بالمخططة

---

## ثانياً: الصفحات الجديدة (تُبنى من الصفر)

### 1. وصفات الإنتاج — `/manufacturing/bom`

**الهدف:** تحديد مكونات كل منتج نهائي (كمية الخامات اللازمة لإنتاج وحدة واحدة)

**الجدول في الداتابيز — `ProductionBom`:**
```
id, name, itemId (المنتج النهائي), yieldQty (الكمية المنتجة),
yieldUnitId, notes, companyId, createdAt
```

**`ProductionBomLine`:**
```
id, bomId, itemId (المادة الخام), quantity, unitId, notes
```

**فورم إنشاء وصفة إنتاج:**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| اسم الوصفة | نص | مثال: وصفة كيس بلاستيك 5كجم |
| المنتج النهائي | اختيار من أصناف (type=product أو semi_finished) | |
| الكمية المنتجة | رقم | كمية المنتج الناتجة من هذه الوصفة |
| الوحدة | اختيار | |
| جدول المكونات: | | |
| — المادة الخام | اختيار من أصناف (type=raw أو semi_finished) | |
| — الكمية | رقم | |
| — الوحدة | اختيار | |
| — ملاحظة | نص | اختياري |
| التكلفة الإجمالية | حسابي تلقائي | مجموع (الكمية × سعر التكلفة) |
| ملاحظات | نص | |

---

### 2. أوامر الإنتاج — `/manufacturing/production-orders`

**الهدف:** إصدار أمر لإنتاج كمية معينة من منتج، وتتبع حالته

**الجدول في الداتابيز — `ProductionOrder`:**
```
id, orderNumber, date, startDate, expectedEndDate, actualEndDate,
itemId (المنتج), bomId (الوصفة), plannedQty, actualQty,
warehouseId (مخزن الخامات), outputWarehouseId (مخزن المنتج النهائي),
status (draft|in_progress|completed|cancelled),
notes, companyId, branchId, createdAt
```

**`ProductionOrderLine`:**
```
id, productionOrderId, itemId (المادة الخام), plannedQty,
actualQty, unitId
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
| مخزن الإنتاج | اختيار | |
| **جدول المواد المطلوبة (تلقائي من BOM):** | | |
| — المادة الخام | نص (قراءة فقط) | |
| — الكمية المطلوبة | رقم (محسوب) | BOM كمية × الكمية المطلوبة |
| — المتاح في المخزن | رقم (قراءة فقط) | من Stock |
| — الفرق | رقم ملوّن | أحمر لو ناقص |
| ملاحظات | نص | |

**حالات أمر الإنتاج:**
- `مسودة` → يمكن التعديل
- `جاري` → بدأ الإنتاج، تُخصم الخامات من المخزن
- `مكتمل` → يُضاف المنتج النهائي للمخزن + يُسجل في حركات المخزن
- `ملغي` → يُعاد المخزون لو كان قد خُصم

**عند إكمال الأمر (modal):**
| الحقل | النوع | ملاحظة |
|-------|-------|--------|
| الكمية المنتجة فعلياً | رقم | قد تختلف عن المخططة |
| تاريخ الاكتمال | تاريخ | |
| المواد المستهلكة فعلياً | جدول | |

---

### 3. تقرير تكلفة الإنتاج — `/reports/production-cost`

**الهدف:** مقارنة التكلفة المخططة بالفعلية لكل أمر إنتاج

**يعرض:**
| العمود | المصدر |
|--------|--------|
| رقم أمر الإنتاج | |
| المنتج | |
| الكمية المنتجة | |
| تكلفة الخامات المخططة | من BOM × سعر تكلفة الأصناف |
| تكلفة الخامات الفعلية | الخامات المستهلكة فعلاً × سعر التكلفة |
| تكلفة الوحدة المخططة | |
| تكلفة الوحدة الفعلية | |
| سعر البيع | |
| هامش الربح | |

---

## ثالثاً: تغييرات على الصفحات الموجودة

### 1. صفحة الأصناف — `/items`

**الحقول الموجودة بالفعل في الـ schema:**
```
type: "product" | "raw" | "semi_finished" | "service"
```
الـ schema جاهز — المطلوب إظهاره في الفورم.

**إضافات في فورم إنشاء / تعديل الصنف:**
| الحقل | التغيير |
|-------|---------|
| نوع الصنف | **إضافة** — dropdown: منتج نهائي / مادة خام / نصف مصنع |
| وصفات الإنتاج | **إضافة تبويب** في صفحة الصنف التفصيلية — يعرض BOMs المرتبطة بالمنتج |

**تغيير في قائمة الأصناف:**
| التغيير |
|---------|
| **إضافة فلتر** "نوع الصنف" (كل الأصناف / مواد خام / منتجات نهائية / نصف مصنع) |
| **إضافة عمود** "النوع" في الجدول مع badge ملون |

---

### 2. صفحة المشتريات — `/purchases`

**إضافات:**
| الحقل | التغيير |
|-------|---------|
| في سطور الفاتورة: فلتر الأصناف | **تغيير** — يعرض فقط الأصناف من نوع "مادة خام" أو "نصف مصنع" بشكل افتراضي (مع خيار إظهار الكل) |

---

### 3. صفحة المبيعات — `/sales`

**إضافات:**
| الحقل | التغيير |
|-------|---------|
| في سطور الفاتورة: فلتر الأصناف | **تغيير** — يعرض فقط الأصناف من نوع "منتج نهائي" بشكل افتراضي |

---

### 4. صفحة الجرد — `/stocktakings`

**إضافات:**
| الحقل | التغيير |
|-------|---------|
| فلتر جديد | **إضافة** — "نوع الصنف" (خامات / منتجات / الكل) |

---

### 5. التقارير — `/reports`

**تقارير جديدة تُضاف:**
| التقرير | الوصف |
|---------|--------|
| تكلفة الإنتاج | مقارنة مخططة vs فعلية |
| حركة المواد الخام | مصدر وصرف الخامات |
| إنتاجية الأمر | كفاءة كل أمر إنتاج |

---

### 6. صفحة التسجيل — `/register`

**إضافة نشاط جديد في قائمة الأنشطة:**
```typescript
{ value: "MANUFACTURING", label: "مصانع وتصنيع" }
```

---

### 7. السوبر ادمن — صفحة إعداد الشركة

**إضافات:**
| التغيير |
|---------|
| إضافة "MANUFACTURING" في قائمة أنواع الأنشطة |
| ربط الصفحات التالية بهذا النشاط: |
| `/manufacturing/bom` — وصفات الإنتاج |
| `/manufacturing/production-orders` — أوامر الإنتاج |
| `/reports/production-cost` — تقرير تكلفة الإنتاج |

---

## رابعاً: الصفحات المرتبطة بنشاط المصانع (كاملة)

### صفحات تظهر للمستخدم في نشاط MANUFACTURING فقط:
```
/manufacturing/bom                    ✅ جديدة
/manufacturing/production-orders      ✅ جديدة
/reports/production-cost              ✅ جديدة
```

### صفحات موجودة تظهر لنشاط المصانع (مشتركة):
```
/sales                    المبيعات
/purchases                المشتريات
/purchase-orders          أوامر الشراء
/sales-orders             أوامر البيع
/sale-returns             مرتجعات مبيعات
/purchase-returns         مرتجعات مشتريات
/customers                العملاء
/suppliers                الموردين
/items                    الأصناف (مع تعديلات)
/warehouses               المخازن
/warehouse-transfers      تحويلات المخازن
/stocktakings             الجرد (مع تعديلات)
/serial-numbers           الأرقام التسلسلية
/accounts                 الحسابات
/journal-entries          القيود اليومية
/receipts                 المقبوضات
/payments                 المدفوعات
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
  itemId      String              // المنتج النهائي
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
  itemId    String        // المادة الخام
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
  itemId            String                // المنتج النهائي
  bomId             String                // الوصفة المستخدمة
  plannedQty        Float
  actualQty         Float?
  warehouseId       String                // مخزن المواد الخام
  outputWarehouseId String                // مخزن المنتج النهائي
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
  itemId            String          // المادة الخام
  plannedQty        Float
  actualQty         Float?
  unitId            String?
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  item              Item            @relation(fields: [itemId], references: [id])
}
```

---

## سادساً: ترتيب التنفيذ المقترح

| المرحلة | المهمة |
|---------|--------|
| 1 | إضافة MANUFACTURING في register + super admin |
| 2 | إضافة الجداول في schema.prisma + migration |
| 3 | تعديل صفحة الأصناف (فلتر النوع + عمود النوع) |
| 4 | بناء صفحة وصفات الإنتاج (BOM) + API |
| 5 | بناء صفحة أوامر الإنتاج + API |
| 6 | ربط أوامر الإنتاج بحركات المخزن |
| 7 | بناء تقرير تكلفة الإنتاج |
| 8 | تعديل المشتريات والمبيعات (فلتر نوع الصنف) |
| 9 | إضافة الموديولات الجديدة في activity log |
