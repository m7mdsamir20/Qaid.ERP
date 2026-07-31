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
| `index.ts` | نقطة الدخول — استورد من `@/modules` بس |
| `trading.ts` `retail.ts` `services.ts` `restaurants.ts` `contracting.ts` | نشاط لكل ملف |

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

## قواعد

- **ممنوع** `if (businessType === '...')` في أي صفحة. لو محتاج سلوك مختلف،
  ضيف مفتاح في `flags` أو `pageLabels` واقراه من `getActivity()`.
- النصوص العربية في الملفات دي **خام** — الملف اللي بيعرضها هو اللي بينادي `t()`.
  `t_s()` مجرد مُعلِّم عشان سكريبت استخراج الترجمة يلقطها.
- `getActivity()` بيرجع `TRADING` لو القيمة فاضية أو غلط — مفيش حالة `undefined`.

## الحالة الحالية

اتعمل: `Sidebar` · `DashboardLayout` · `Header` · صفحة التسجيل · السوبر أدمن (إنشاء/تعديل)

لسه: ~45 ملف فيهم شروط `businessType` متفرقة (فواتير، طباعة، تقارير، POS)،
وحماية المسارات على مستوى `middleware.ts`.
