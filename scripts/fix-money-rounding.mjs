/**
 * تصحيح كسور الهللات في فواتير البيع ومرتجعاتها القديمة
 * ─────────────────────────────────────────────────────
 * الفواتير القديمة اتحفظت بضريبة من غير تقريب (زي 4881.745)، فرصيد العميل
 * وكشف الحساب بيطلع فيهم فرق هللة (0.01) حتى بعد السداد الكامل.
 *
 * السكريبت ده بيعمل الآتي لكل فاتورة بيع / مرتجع مبيعات فيها كسور:
 *   1) يقرّب مبالغ الفاتورة وسطورها لأقرب هللة
 *   2) يعدّل رصيد العميل (أو المورد) بفرق التقريب بس — من غير ما يلمس الرصيد الافتتاحي
 *   3) يقرّب سطور القيد المحاسبي بتاع الفاتورة ويحافظ على توازنه
 *   4) لو المدفوع وقت الفاتورة اتقرّب، يعدّل رصيد الخزينة/البنك بنفس الفرق
 * وكمان بيصلّح مرتجعات المبيعات القديمة اللي اتحفظ إجماليها من غير الضريبة
 * (رصيد العميل كان بيتخصم منه المبلغ شامل الضريبة، فالكشف كان مختلف عن الرصيد).
 *
 * كل التعديلات جوه transaction واحدة — لو أي حاجة فشلت مفيش حاجة بتتغير.
 * خُد نسخة احتياطية من قاعدة البيانات قبل --apply.
 *
 *   node scripts/fix-money-rounding.mjs                       معاينة بس (مفيش تعديل)
 *   node scripts/fix-money-rounding.mjs --company <companyId> معاينة لشركة واحدة
 *   node scripts/fix-money-rounding.mjs --apply               تطبيق التعديلات
 */
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const APPLY = process.argv.includes('--apply');
const ci = process.argv.indexOf('--company');
const COMPANY_ID = ci > -1 ? process.argv[ci + 1] : null;

// نفس roundMoney في src/lib/currency.ts
const r2 = (value) => {
    const n = Number(value) || 0;
    const v = Math.sign(n) * Math.round(Number(`${Math.abs(n).toFixed(8)}e2`)) / 100;
    return Object.is(v, -0) ? 0 : v;
};
const dirty = (x) => x != null && Math.abs(r2(x) - x) > 1e-9;
const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(4);

const companyWhere = COMPANY_ID ? { companyId: COMPANY_ID } : {};

try {
    const invoices = await p.invoice.findMany({
        where: { ...companyWhere, type: { in: ['sale', 'sale_return'] } },
        include: { lines: true },
        orderBy: { date: 'asc' },
    });

    const treasuries = await p.treasury.findMany({
        where: { ...companyWhere, accountId: { not: null } },
        select: { id: true, name: true, accountId: true, companyId: true, balance: true },
    });
    const treasuryByAccount = new Map(treasuries.map(t => [`${t.companyId}:${t.accountId}`, t]));

    const invoiceUpdates = [];   // { id, data, lines: [{id, data}] }
    const journalUpdates = [];   // { id, debit, credit }
    const customerDelta = new Map();
    const supplierDelta = new Map();
    const treasuryDelta = new Map();
    let returnTaxFixes = 0;

    for (const inv of invoices) {
        // مرتجع قديم اتحفظ إجماليه من غير الضريبة
        const returnTaxBug = inv.type === 'sale_return' && inv.taxEnabled && !inv.taxInclusive
            && inv.taxAmount > 0 && Math.abs(inv.total - (inv.subtotal - inv.discount)) < 0.005;
        const oldTotal = returnTaxBug ? inv.subtotal - inv.discount + inv.taxAmount : inv.total;

        const dirtyLines = inv.lines.filter(l => dirty(l.total) || dirty(l.taxAmount));
        const changed = returnTaxBug || dirtyLines.length > 0
            || [inv.subtotal, inv.discount, inv.taxAmount, inv.total, inv.paidAmount, inv.remaining].some(dirty);
        if (!changed) continue;
        if (returnTaxBug) returnTaxFixes++;

        const newTotal = r2(oldTotal);
        const newPaid = r2(inv.paidAmount);
        invoiceUpdates.push({
            id: inv.id,
            label: `${inv.type === 'sale' ? 'بيع' : 'مرتجع'} #${inv.invoiceNumber}`,
            from: inv.total, to: newTotal, returnTaxBug,
            data: {
                subtotal: r2(inv.subtotal), discount: r2(inv.discount), taxAmount: r2(inv.taxAmount),
                total: newTotal, paidAmount: newPaid, remaining: r2(inv.remaining),
            },
            lines: dirtyLines.map(l => ({ id: l.id, data: { total: r2(l.total), taxAmount: r2(l.taxAmount ?? 0) } })),
        });

        // الفواتير المعلّقة (pending) ماأثّرتش على الأرصدة ولا القيود
        if (inv.status === 'pending') continue;

        const sign = inv.type === 'sale' ? 1 : -1;

        // القيد المحاسبي للفاتورة
        const entries = await p.journalEntry.findMany({
            where: { companyId: inv.companyId, referenceType: 'invoice', referenceId: inv.id },
            include: { lines: true },
        });
        for (const entry of entries) {
            const rawDiff = entry.lines.reduce((s, l) => s + l.debit - l.credit, 0);
            if (Math.abs(rawDiff) > 0.005) {
                console.warn(`⚠️  قيد ${entry.entryNumber} (${entry.description}) مش متوازن أصلاً (${rawDiff.toFixed(4)}) — اتساب زي ما هو`);
                continue;
            }
            const lines = entry.lines.map(l => ({ id: l.id, debit: r2(l.debit), credit: r2(l.credit) }));
            // فرق التقريب (لو حصل) بيتحط على أكبر سطر في الطرف الناقص
            const diff = r2(lines.reduce((s, l) => s + l.debit - l.credit, 0));
            if (diff !== 0) {
                const side = diff > 0 ? 'credit' : 'debit';
                const target = lines.filter(l => l[side] > 0).sort((a, b) => b[side] - a[side])[0];
                if (target) target[side] = r2(target[side] + Math.abs(diff));
            }
            for (const l of lines) {
                const orig = entry.lines.find(o => o.id === l.id);
                if (orig.debit !== l.debit || orig.credit !== l.credit) journalUpdates.push({ id: l.id, debit: l.debit, credit: l.credit });
            }
        }

        // المدفوع وقت إنشاء الفاتورة = سطر الخزينة/البنك في قيدها
        // (paidAmount مش ينفع هنا لأنه بيزيد كمان بسندات القبض اللي اتطبقت على الفاتورة بعدين)
        const tLine = entries.flatMap(e => e.lines).find(l => treasuryByAccount.has(`${inv.companyId}:${l.accountId}`));
        const paidAtCreation = tLine ? (tLine.debit || tLine.credit) : 0;
        const paidDelta = r2(paidAtCreation) - paidAtCreation;
        if (tLine && Math.abs(paidDelta) > 1e-9) {
            const treas = treasuryByAccount.get(`${inv.companyId}:${tLine.accountId}`);
            treasuryDelta.set(treas.id, (treasuryDelta.get(treas.id) || 0) + sign * paidDelta);
        }

        // رصيد العميل اتغيّر وقت الفاتورة بـ (الإجمالي - المدفوع وقتها) → الفرق = فرق تقريب الاتنين
        const delta = sign * ((newTotal - oldTotal) - paidDelta);
        if (inv.customerId) customerDelta.set(inv.customerId, (customerDelta.get(inv.customerId) || 0) + delta);
        else if (inv.supplierId) supplierDelta.set(inv.supplierId, (supplierDelta.get(inv.supplierId) || 0) - delta);
    }

    // ── التقرير ──
    console.log(`\nفواتير هتتعدّل: ${invoiceUpdates.length} (منها ${returnTaxFixes} مرتجع إجماليه كان من غير ضريبة)`);
    invoiceUpdates.forEach(u => console.log(`  ${u.label}: ${u.from} → ${u.to}${u.returnTaxBug ? '  [إضافة الضريبة للإجمالي]' : ''}`));
    console.log(`سطور قيود هتتقرّب: ${journalUpdates.length}`);

    const customers = await p.customer.findMany({ where: companyWhere, select: { id: true, name: true, balance: true } });
    const customerUpdates = customers
        .map(c => ({ ...c, newBalance: r2(c.balance + (customerDelta.get(c.id) || 0)) }))
        .filter(c => c.newBalance !== c.balance);
    console.log(`\nأرصدة عملاء هتتعدّل: ${customerUpdates.length}`);
    customerUpdates.forEach(c => console.log(`  ${c.name}: ${c.balance} → ${c.newBalance} (${fmt(c.newBalance - c.balance)})`));

    const suppliers = supplierDelta.size
        ? await p.supplier.findMany({ where: { id: { in: [...supplierDelta.keys()] } }, select: { id: true, name: true, balance: true } })
        : [];
    const supplierUpdates = suppliers.map(s => ({ ...s, newBalance: r2(s.balance + supplierDelta.get(s.id)) })).filter(s => s.newBalance !== s.balance);
    if (supplierUpdates.length) {
        console.log(`أرصدة موردين هتتعدّل: ${supplierUpdates.length}`);
        supplierUpdates.forEach(s => console.log(`  ${s.name}: ${s.balance} → ${s.newBalance}`));
    }

    const treasuryUpdates = treasuries.filter(t => treasuryDelta.has(t.id))
        .map(t => ({ ...t, newBalance: r2(t.balance + treasuryDelta.get(t.id)) })).filter(t => t.newBalance !== t.balance);
    if (treasuryUpdates.length) {
        console.log(`أرصدة خزائن/بنوك هتتعدّل: ${treasuryUpdates.length}`);
        treasuryUpdates.forEach(t => console.log(`  ${t.name}: ${t.balance} → ${t.newBalance}`));
    }

    if (!APPLY) {
        console.log('\n(معاينة فقط — مفيش تعديل. شغّله بـ --apply للتطبيق بعد أخذ نسخة احتياطية)');
        process.exit(0);
    }

    await p.$transaction(async (tx) => {
        for (const u of invoiceUpdates) {
            await tx.invoice.update({ where: { id: u.id }, data: u.data });
            for (const l of u.lines) await tx.invoiceLine.update({ where: { id: l.id }, data: l.data });
        }
        for (const j of journalUpdates) await tx.journalEntryLine.update({ where: { id: j.id }, data: { debit: j.debit, credit: j.credit } });
        for (const c of customerUpdates) await tx.customer.update({ where: { id: c.id }, data: { balance: c.newBalance } });
        for (const s of supplierUpdates) await tx.supplier.update({ where: { id: s.id }, data: { balance: s.newBalance } });
        for (const t of treasuryUpdates) await tx.treasury.update({ where: { id: t.id }, data: { balance: t.newBalance } });
    }, { timeout: 300000, maxWait: 30000 });

    console.log('\n✅ اتطبّق بنجاح');
} catch (e) {
    console.error('❌ فشل — مفيش أي تعديل اتحفظ:', e.message);
    process.exitCode = 1;
} finally {
    await p.$disconnect();
}
