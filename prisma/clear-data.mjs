/**
 * Clear Data Script — يحذف جميع البيانات التجريبية لشركة معينة
 * الاستخدام: node prisma/clear-data.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const COMPANY_ID = 'cmnakbkqy0001urt9so5h0ucr';

async function main() {
    const company = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
    if (!company) {
        console.error(`❌ الشركة بالـ ID "${COMPANY_ID}" غير موجودة.`);
        process.exit(1);
    }
    console.log(`✅ شركة: ${company.name}`);
    console.log('⚠️  سيتم حذف جميع بيانات هذه الشركة...\n');

    const cid = COMPANY_ID;

    // ─── حذف بالترتيب الصحيح (الجداول الفرعية أولاً) ────────────────────────

    // قيود محاسبية — السطور أولاً
    const jeIds = (await prisma.journalEntry.findMany({ where: { companyId: cid }, select: { id: true } })).map(j => j.id);
    if (jeIds.length) {
        await prisma.journalEntryLine.deleteMany({ where: { journalEntryId: { in: jeIds } } });
        await prisma.journalEntry.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  قيود محاسبية: ${jeIds.length}`);
    }

    // فواتير مبيعات
    const saleIds = (await prisma.invoice.findMany({ where: { companyId: cid, type: 'sale' }, select: { id: true } })).map(i => i.id);
    if (saleIds.length) {
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: { in: saleIds } } });
        await prisma.invoice.deleteMany({ where: { companyId: cid, type: 'sale' } });
        console.log(`🗑️  فواتير مبيعات: ${saleIds.length}`);
    }

    // فواتير مشتريات
    const purchIds = (await prisma.invoice.findMany({ where: { companyId: cid, type: 'purchase' }, select: { id: true } })).map(i => i.id);
    if (purchIds.length) {
        await prisma.invoiceLine.deleteMany({ where: { invoiceId: { in: purchIds } } });
        await prisma.invoice.deleteMany({ where: { companyId: cid, type: 'purchase' } });
        console.log(`🗑️  فواتير مشتريات: ${purchIds.length}`);
    }

    // سندات قبض وصرف
    const vCount = await prisma.voucher.count({ where: { companyId: cid } });
    if (vCount) {
        await prisma.voucher.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  سندات: ${vCount}`);
    }

    // أقساط وخطط تقسيط
    const planIds = (await prisma.installmentPlan.findMany({ where: { companyId: cid }, select: { id: true } })).map(p => p.id);
    if (planIds.length) {
        await prisma.installment.deleteMany({ where: { planId: { in: planIds } } });
        await prisma.installmentPlan.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  خطط تقسيط: ${planIds.length}`);
    }

    // سلف الموظفين
    const advCount = await prisma.advance.count({ where: { companyId: cid } });
    if (advCount) {
        await prisma.advance.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  سلف موظفين: ${advCount}`);
    }

    // خصومات الموظفين
    try {
        const dedCount = await prisma.deduction.count({ where: { companyId: cid } });
        if (dedCount) {
            await prisma.deduction.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  خصومات: ${dedCount}`);
        }
    } catch(e) {}

    // مسير رواتب (PayrollLine أولاً ثم Payroll)
    try {
        const payrollIds = (await prisma.payroll.findMany({ where: { companyId: cid }, select: { id: true } })).map(p => p.id);
        if (payrollIds.length) {
            await prisma.payrollLine.deleteMany({ where: { payrollId: { in: payrollIds } } });
            await prisma.payroll.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  مسير رواتب: ${payrollIds.length}`);
        }
    } catch(e) {}

    // موظفون (بعد حذف كل المرتبط بهم)
    const empCount = await prisma.employee.count({ where: { companyId: cid } });
    if (empCount) {
        await prisma.employee.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  موظفون: ${empCount}`);
    }

    // أقسام
    const deptCount = await prisma.department.count({ where: { companyId: cid } });
    if (deptCount) {
        await prisma.department.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  أقسام: ${deptCount}`);
    }

    // أصول ثابتة (قبل الحسابات لأنها مرتبطة بها)
    try {
        const faCount = await prisma.fixedAsset.count({ where: { companyId: cid } });
        if (faCount) {
            await prisma.fixedAsset.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  أصول ثابتة: ${faCount}`);
        }
    } catch(e) {}

    // شركاء
    try {
        const pCount = await prisma.partner.count({ where: { companyId: cid } });
        if (pCount) {
            await prisma.partner.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  شركاء: ${pCount}`);
        }
    } catch(e) {}

    // مخزون
    const stCount = await prisma.stock.count({ where: { item: { companyId: cid } } });
    if (stCount) {
        await prisma.stock.deleteMany({ where: { item: { companyId: cid } } });
        console.log(`🗑️  سجلات مخزون: ${stCount}`);
    }

    // حركات مخزون
    try {
        const smCount = await prisma.stockMovement.count({ where: { companyId: cid } });
        if (smCount) {
            await prisma.stockMovement.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  حركات مخزون: ${smCount}`);
        }
    } catch(e) {}

    // أصناف
    const itemCount = await prisma.item.count({ where: { companyId: cid } });
    if (itemCount) {
        await prisma.item.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  أصناف: ${itemCount}`);
    }

    // تصنيفات
    const catCount = await prisma.category.count({ where: { companyId: cid } });
    if (catCount) {
        await prisma.category.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  تصنيفات: ${catCount}`);
    }

    // وحدات
    const unitCount = await prisma.unit.count({ where: { companyId: cid } });
    if (unitCount) {
        await prisma.unit.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  وحدات: ${unitCount}`);
    }

    // مستودعات
    const whCount = await prisma.warehouse.count({ where: { companyId: cid } });
    if (whCount) {
        await prisma.warehouse.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  مستودعات: ${whCount}`);
    }

    // عملاء
    const cusCount = await prisma.customer.count({ where: { companyId: cid } });
    if (cusCount) {
        await prisma.customer.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  عملاء: ${cusCount}`);
    }

    // موردون
    const supCount = await prisma.supplier.count({ where: { companyId: cid } });
    if (supCount) {
        await prisma.supplier.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  موردون: ${supCount}`);
    }

    // خزائن وبنوك
    const trCount = await prisma.treasury.count({ where: { companyId: cid } });
    if (trCount) {
        await prisma.treasury.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  خزائن وبنوك: ${trCount}`);
    }

    // أرصدة الحسابات (AccountBalance / OpeningBalance)
    try {
        const abCount = await prisma.accountBalance.count({ where: { account: { companyId: cid } } });
        if (abCount) {
            await prisma.accountBalance.deleteMany({ where: { account: { companyId: cid } } });
            console.log(`🗑️  أرصدة حسابات: ${abCount}`);
        }
    } catch(e) {}

    try {
        const obCount = await prisma.openingBalance.count({ where: { companyId: cid } });
        if (obCount) {
            await prisma.openingBalance.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  أرصدة افتتاحية: ${obCount}`);
        }
    } catch(e) {}

    // مراكز تكلفة
    try {
        const ccCount = await prisma.costCenter.count({ where: { companyId: cid } });
        if (ccCount) {
            await prisma.costCenter.deleteMany({ where: { companyId: cid } });
            console.log(`🗑️  مراكز تكلفة: ${ccCount}`);
        }
    } catch(e) {}

    // حسابات (آخر شيء لأن كل شيء يرتبط بها)
    const accCount = await prisma.account.count({ where: { companyId: cid } });
    if (accCount) {
        // حذف الحسابات الفرعية أولاً (children قبل parents)
        await prisma.account.deleteMany({ where: { companyId: cid, isParent: false } });
        await prisma.account.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  حسابات: ${accCount}`);
    }

    // سنة مالية
    const fyCount = await prisma.financialYear.count({ where: { companyId: cid } });
    if (fyCount) {
        await prisma.financialYear.deleteMany({ where: { companyId: cid } });
        console.log(`🗑️  سنوات مالية: ${fyCount}`);
    }

    console.log('\n✅ تم حذف جميع البيانات بنجاح!');
}

main()
    .catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
