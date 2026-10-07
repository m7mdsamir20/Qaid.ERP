/**
 * بيطبّق prisma/sql/enable-rls.sql جوه transaction ويتحقق قبل الحفظ:
 *   1) مفيش أي جدول في public من غير RLS
 *   2) التطبيق (دور postgres) لسه بيقدر يقرا البيانات
 * لو أي فحص فشل → rollback، ومفيش حاجة بتتغير.
 *
 *   node scripts/enable-rls.mjs          تطبيق
 *   node scripts/enable-rls.mjs --check  فحص بس من غير تعديل
 */
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const CHECK_ONLY = process.argv.includes('--check');

const listOff = (db) => db.$queryRawUnsafe(`
    SELECT c.relname AS t FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity ORDER BY 1`);

try {
    const before = await listOff(p);
    console.log(`جداول من غير RLS: ${before.length}`);
    before.forEach(r => console.log('  - ' + r.t));

    if (CHECK_ONLY || before.length === 0) {
        console.log(before.length === 0 ? '✅ كل الجداول محمية' : '(فحص فقط — مفيش تعديل)');
        process.exit(0);
    }

    const sql = readFileSync(new URL('../prisma/sql/enable-rls.sql', import.meta.url), 'utf8');

    await p.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(sql);

        const after = await listOff(tx);
        if (after.length > 0) throw new Error(`لسه ${after.length} جدول من غير RLS`);

        // نفس الدور اللي التطبيق بيستخدمه — لو القراءة وقفت نرجع فوراً
        const companies = await tx.company.count();
        const invoices = await tx.invoice.count();
        console.log(`✅ التطبيق لسه بيقرا: ${companies} شركة، ${invoices} فاتورة`);
    });

    console.log(`✅ اتفعّل RLS على ${before.length} جدول`);
} catch (e) {
    console.error('❌ اترجعت كل التغييرات:', e.message);
    process.exitCode = 1;
} finally {
    await p.$disconnect();
}
