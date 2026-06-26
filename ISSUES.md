# تقرير المشاكل — نظام ERP
**تاريخ التقرير:** 2026-06-25

---

## 🔴 عالية الأولوية

### 1. Double Refresh عند تغيير الفرع
**الملف:** `src/components/Header.tsx` — السطر 431-433
**الوصف:**
عند تغيير الفرع من القائمة، الكود يعمل خطوتين:
1. `await update(...)` — بيحدث الـ session فبيحرك re-render وبيجيب البيانات (refresh أول)
2. `window.location.reload()` — بعدها بيعمل reload كامل للصفحة (refresh تاني)

النتيجة: الصفحة بتتحمل مرتين بدل مرة واحدة.

```typescript
const switchBranch = async (branchId: string | null) => {
    await update({ user: { activeBranchId: branchId === null ? 'all' : branchId } }); // refresh 1
    setOpen(false);
    window.location.reload(); // refresh 2 ← المشكلة هنا
};
```

**الحل المقترح:** استخدام `router.refresh()` بدل `window.location.reload()`

---

## 🟡 متوسطة الأولوية

### 2. عدم التحقق من `.ok` قبل قراءة الـ JSON في صفحات القوائم
**الملفات المتأثرة:**
- `src/app/receipts/page.tsx` — السطر ~55
- `src/app/purchases/page.tsx` — السطر ~50
- وعدة صفحات أخرى

**الوصف:**
الكود بيعمل `fetch` ثم مباشرة `.json()` بدون ما يتحقق إن الـ response ناجح. لو الـ API رجع خطأ (500 أو 404)، الصفحة مش هتعرف وهتحاول تحلل رسالة الخطأ كأنها بيانات حقيقية.

```typescript
// ❌ الكود الحالي
const data = await res.json(); // لو res.ok = false، هيحصل مشكلة
setInvoices(data.invoices || []);

// ✅ الصح
if (!res.ok) throw new Error('API error');
const data = await res.json();
```

### 3. إمكانية إرسال الفورم أكثر من مرة عند الخطأ
**الملف:** `src/app/sales/new/page.tsx` — السطر ~468
**الوصف:**
لو الحفظ فشل وجاء رد مش JSON، الكود ممكن يرمي exception غير متوقع. كمان الـ `submitting` بيرجع `false` بسرعة مما يسمح للمستخدم يضغط حفظ تاني قبل ما يشوف رسالة الخطأ.

---

## 🟢 منخفضة الأولوية

### 4. البحث بالاسم Case Sensitive
**الملف:** `src/app/receipts/page.tsx` — السطر ~65
**الوصف:**
البحث بيستخدم `.includes()` بدون `.toLowerCase()` — يعني لو العميل اسمه "Ahmed" والمستخدم بحث "ahmed" مش هيلاقيه.

```typescript
// ❌ الحالي
(v.customer?.name || '').includes(searchTerm)

// ✅ الصح
(v.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
```

### 5. API بترجع بيانات فاضية بدل error واضح عند الفشل
**الملفات:**
- `src/app/api/vouchers/route.ts`
- `src/app/api/purchases/route.ts`

**الوصف:**
عند الـ catch، الـ API بترجع array فاضي `[]` مع status 500. الـ frontend مش قادر يفرق بين "مفيش بيانات" و"في خطأ في السيرفر".

---

## ملاحظات عامة
- صفحات التقارير (`src/app/reports/`) شغالة صح — كلها عندها print وPDF
- صفحات الحضور (`src/app/attendance/`) مفيش مشاكل كود واضحة
- الصلاحيات موجودة وشغالة في معظم الصفحات
