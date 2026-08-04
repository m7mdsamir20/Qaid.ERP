# نظام الأنشطة (Activity Modules)

المصدر **الوحيد** للحقيقة بخصوص: مين يشوف إيه، والصفحات اسمها إيه، عند كل نشاط.

## ليه موجود

قبل كده كانت قواعد كل نشاط متناثرة في 74 ملف، وأسوأ حاجة إن `Sidebar.tsx`
(اللي بيعرض القوائم) و `DashboardLayout.tsx` (اللي بيمنع الدخول) كان عندهم
**قواعد مختلفة** — فكان ممكن لينك يبان في القائمة وأول ما تدوس عليه
يرميك على الصفحة الرئيسية. دلوقتي الاتنين بيقروا من نفس المكان.

## الملفات

| الملف | بيعمل إيه |
|---|---|
| `types.ts` | شكل الـ `ActivityModule` |
| `shared.ts` | الأقسام والباقات المشتركة بين كل الأنشطة |
| `registry.ts` | بيجمع الأنشطة + دوال الاستعلام |
| `routes.ts` | خريطة المسار → القسم، عشان حماية الـ middleware |
| `useActivity.ts` | الـ hook اللي الكومبوننتس بتقرا بيه النشاط |
| `index.ts` | نقطة الدخول — استورد من `@/modules` بس |
| `trading.ts` `retail.ts` `services.ts` `restaurants.ts` `contracting.ts` | نشاط لكل ملف |

## تنظيم الصفحات (Route Groups)

صفحات كل نشاط متجمّعة في مجلد بين قوسين. **الأقواس مش بتظهر في الـ URL** —
`src/app/(restaurants)/kds/page.tsx` لسه بيتفتح على `/kds` بالظبط.

```
src/app/
  (core)/         الصفحات المشتركة بين كل الأنشطة (المبيعات، المشتريات، المخزون، الحسابات، HR…)
  (pos)/          pos — مشترك بين التجزئة والمطاعم
  (restaurants)/  tables shifts kds kitchen modifiers delivery barcode restaurant menu
  (contracting)/  projects progress-bills subcontractors sub-contracts material-requests daily-site-reports
  (services)/     service-contracts work-orders service-catalog
  (retail)/       loyalty serial-numbers
  (trading)/      sales-reps installments due-installments overdue-installments
  api/
```

⚠️ لو ضفت أو نقلت صفحة نشاط، حدّث `ROUTE_RULES` في `routes.ts` كمان —
الجروبات تنظيم بصري بس، الحماية الفعلية من الخريطة دي.

## الطبقات الثلاثة

الصفحة بتظهر لما **الثلاثة** يسمحوا:

1. **النشاط** — `sections` و `hiddenPages` هنا. ثابت لكل نشاط.
2. **الاشتراك** — `subscription.features` من الداتابيز. السوبر أدمن بيتحكم فيه،
   و `defaultModules` هو الاقتراح الأولي عند اختيار النشاط.
3. **الصلاحيات** — `user.permissions` لكل مستخدم.

الطبقات دي مستقلة عن بعض عن قصد. `defaultModules` **مش** نفس `sections`.

## إزاي تضيف نشاط جديد

```ts
// src/modules/clinics.ts
import type { ActivityModule } from './types';
import { CORE_SECTIONS, CORE_MODULES, DEFAULT_FLAGS, t_s } from './shared';

const clinics: ActivityModule = {
    key: 'CLINICS',
    label: t_s('عيادات ومراكز طبية'),
    sections: [...CORE_SECTIONS, 'appointments'],
    hiddenPages: ['/coupons', '/service-catalog'],
    sectionTitles: { sales: t_s('الفواتير والمرضى') },
    pageLabels: { '/customers': t_s('المرضى') },
    defaultModules: [...CORE_MODULES, 'appointments'],
    flags: { ...DEFAULT_FLAGS },
};
export default clinics;
```

بعدها سطرين بس:
- `types.ts` → ضيف `'CLINICS'` لـ `ActivityKey`
- `registry.ts` → ضيف `CLINICS: clinics` للـ `ACTIVITIES`

خلاص. السايدبار وصفحة التسجيل والسوبر أدمن والراوت جارد كلهم هيشوفوه أوتوماتيك.

## إزاي تقرا النشاط في الكود

في كومبوننت (client):
```tsx
import { useActivity } from '@/modules/useActivity';

const { term, isContracting, key } = useActivity();
<h1>{t(term('customers'))}</h1>          {/* العملاء / أصحاب المشاريع */}
{isContracting && <ProjectsPanel />}
```

في API route أو مكتبة (server):
```ts
import { getActivity } from '@/modules';

const isServices = getActivity(session.user.businessType).key === 'SERVICES';
```

**متقراش `businessType` من الـ session مباشرة.** `getActivity()` بيوحّد
الحروف (الافتراضي في الداتابيز `"trading"` بحروف صغيرة) وبيرجع `TRADING`
لو القيمة فاضية أو غلط، والمقارنة بـ `.key` بيتحقق منها TypeScript.

## قواعد

- **ممنوع** `if (businessType === '...')` في أي صفحة. لو محتاج سلوك مختلف،
  ضيف مفتاح في `flags` أو `terms` أو `pageLabels` واقراه من `useActivity()`.
- المصطلح المتكرر (عميل، صنف، مخزن، فاتورة) مكانه `terms`. النص الطويل
  الخاص بصفحة واحدة يفضل في الصفحة.
- كود الفاتورة من `getInvoiceRef()` **بس** — بيتخزن في مرجع القيود.
- النصوص العربية في الملفات دي **خام** — الملف اللي بيعرضها هو اللي بينادي `t()`.
  `t_s()` مجرد مُعلِّم عشان سكريبت استخراج الترجمة يلقطها.
- `getActivity()` بيرجع `TRADING` لو القيمة فاضية أو غلط — مفيش حالة `undefined`.

## الحالة الحالية

اتعمل:
- `Sidebar` · `DashboardLayout` · `Header` · صفحة التسجيل · السوبر أدمن (إنشاء/تعديل)
- حماية المسارات على مستوى السيرفر في `middleware.ts`
- تجميع الصفحات في route groups
- 31 صفحة + 9 API routes + `printInvoices` + `InvoicePDF` بقوا على المصدر الموحّد

الاستثناء الوحيد المقصود: صفحات السوبر أدمن وصفحة التسجيل بتقرا من
`form.businessType` (نشاط الشركة اللي بيتعمَلها) مش من نشاط المستخدم.
