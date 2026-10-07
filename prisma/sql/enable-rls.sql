-- ═══════════════════════════════════════════════════════════════
--  تفعيل Row Level Security على كل جداول public
-- ═══════════════════════════════════════════════════════════════
--
-- ليه:
--   Supabase بيعرض جداول public عن طريق PostgREST، وأي حد معاه
--   الـ anon key (مفتاح عام بطبيعته) يقدر يقرا أي جدول من غير RLS
--   — بيانات كل الشركات مع بعض.
--
-- ليه آمن على التطبيق:
--   Prisma بيتصل بدور postgres وده عنده BYPASSRLS ومالك الجداول،
--   فالتطبيق مش بيتأثر. ومفيش policies، فـ anon/authenticated
--   بيتمنعوا تماماً (default deny) — والتطبيق مش بيستخدم PostgREST أصلاً.
--
-- ⚠️ لازم يتشغّل بعد أي `prisma migrate` أو `prisma db push`:
--   الجداول الجديدة بتتعمل من غير RLS — وده سبب المشكلة من الأول.
--   السكريبت idempotent، تشغيله أكتر من مرة آمن.
--
-- التشغيل:   node scripts/enable-rls.mjs
-- التراجع:   ALTER TABLE public."<اسم_الجدول>" DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND NOT c.relrowsecurity
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.relname);
        RAISE NOTICE 'RLS enabled: %', r.relname;
    END LOOP;
END $$;
