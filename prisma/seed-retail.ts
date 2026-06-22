/**
 * Retail test data seed for dofas13792@okcpress.com
 * Run: npx tsx prisma/seed-retail.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
    // ── 1. Find user ──────────────────────────────────────────────
    const user = await prisma.user.findUnique({
        where: { email: 'dofas13792@okcpress.com' },
        include: { company: true },
    });

    if (!user) throw new Error('❌ User not found: dofas13792@okcpress.com');
    if (!user.companyId) throw new Error('❌ User has no companyId');

    const companyId = user.companyId;
    const company = user.company!;
    console.log(`✅ Found user: ${user.name} — Company: ${company.name} (${companyId})`);

    // ── 2. Make sure businessType is RETAIL ───────────────────────
    await prisma.company.update({
        where: { id: companyId },
        data: { businessType: 'RETAIL' },
    });
    console.log('✅ businessType set to RETAIL');

    // ── 3. Unit ───────────────────────────────────────────────────
    const unit = await prisma.unit.upsert({
        where: { name_companyId: { name: 'قطعة', companyId } },
        update: {},
        create: { name: 'قطعة', nameEn: 'Piece', code: 'PCS', companyId },
    });
    console.log(`✅ Unit: ${unit.name}`);

    // ── 4. Categories ─────────────────────────────────────────────
    const cats = await Promise.all([
        prisma.category.upsert({
            where: { id: `cat-electronics-${companyId}` },
            update: {},
            create: { id: `cat-electronics-${companyId}`, name: 'إلكترونيات', companyId },
        }),
        prisma.category.upsert({
            where: { id: `cat-clothes-${companyId}` },
            update: {},
            create: { id: `cat-clothes-${companyId}`, name: 'ملابس', companyId },
        }),
        prisma.category.upsert({
            where: { id: `cat-food-${companyId}` },
            update: {},
            create: { id: `cat-food-${companyId}`, name: 'مواد غذائية', companyId },
        }),
    ]);
    console.log(`✅ Categories: ${cats.map(c => c.name).join(', ')}`);

    // ── 5. Warehouse ──────────────────────────────────────────────
    let warehouse = await prisma.warehouse.findFirst({
        where: { companyId },
    });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: { name: 'المخزن الرئيسي', code: 'WH01', companyId },
        });
    }
    console.log(`✅ Warehouse: ${warehouse.name}`);

    // ── 6. Accounts (Cash + Revenue) ─────────────────────────────
    // Check existing accounts first
    const existingCash = await prisma.account.findFirst({
        where: { companyId, code: '1101' },
    });
    const existingRevenue = await prisma.account.findFirst({
        where: { companyId, code: '4101' },
    });

    let cashAccount = existingCash;
    let revenueAccount = existingRevenue;

    // Find or create parent account for cash
    let cashParent = await prisma.account.findFirst({
        where: { companyId, code: '110' },
    });
    if (!cashParent) {
        cashParent = await prisma.account.create({
            data: {
                code: '110', name: 'النقدية', nature: 'debit', type: 'asset',
                accountCategory: 'summary', isParent: true, level: 2, companyId,
            },
        });
    }

    if (!cashAccount) {
        cashAccount = await prisma.account.create({
            data: {
                code: '1101', name: 'الصندوق الرئيسي', nature: 'debit', type: 'asset',
                accountCategory: 'detail', level: 3, parentId: cashParent.id, companyId,
            },
        });
    }
    console.log(`✅ Cash account: ${cashAccount.code} — ${cashAccount.name}`);

    let revenueParent = await prisma.account.findFirst({
        where: { companyId, code: '410' },
    });
    if (!revenueParent) {
        revenueParent = await prisma.account.create({
            data: {
                code: '410', name: 'إيرادات المبيعات', nature: 'credit', type: 'revenue',
                accountCategory: 'summary', isParent: true, level: 2, companyId,
            },
        });
    }

    if (!revenueAccount) {
        revenueAccount = await prisma.account.create({
            data: {
                code: '4101', name: 'المبيعات', nature: 'credit', type: 'revenue',
                accountCategory: 'detail', level: 3, parentId: revenueParent.id, companyId,
            },
        });
    }
    console.log(`✅ Revenue account: ${revenueAccount.code} — ${revenueAccount.name}`);

    // ── 7. Treasury ───────────────────────────────────────────────
    let treasury = await prisma.treasury.findFirst({
        where: { companyId, type: 'cash' },
    });
    if (!treasury) {
        treasury = await prisma.treasury.create({
            data: {
                name: 'الصندوق الرئيسي',
                type: 'cash',
                balance: 5000,
                accountId: cashAccount.id,
                companyId,
            },
        });
    } else if (!treasury.accountId) {
        treasury = await prisma.treasury.update({
            where: { id: treasury.id },
            data: { accountId: cashAccount.id },
        });
    }
    console.log(`✅ Treasury: ${treasury.name} — رصيد: ${treasury.balance}`);

    // ── 8. Items with stock ───────────────────────────────────────
    const itemsData = [
        { code: 'ITM001', name: 'سماعات بلوتوث', cost: 150, sell: 250, cat: cats[0].id, qty: 30 },
        { code: 'ITM002', name: 'شاحن سريع USB-C', cost: 50, sell: 90, cat: cats[0].id, qty: 50 },
        { code: 'ITM003', name: 'كابل شحن متعدد', cost: 20, sell: 45, cat: cats[0].id, qty: 100 },
        { code: 'ITM004', name: 'حافظة موبايل', cost: 15, sell: 35, cat: cats[0].id, qty: 80 },
        { code: 'ITM005', name: 'تي شيرت قطن', cost: 40, sell: 85, cat: cats[1].id, qty: 60 },
        { code: 'ITM006', name: 'بنطلون جينز', cost: 120, sell: 220, cat: cats[1].id, qty: 40 },
        { code: 'ITM007', name: 'كاب رياضي', cost: 25, sell: 60, cat: cats[1].id, qty: 35 },
        { code: 'ITM008', name: 'شوكولاتة فاخرة', cost: 30, sell: 55, cat: cats[2].id, qty: 25 },
        { code: 'ITM009', name: 'عصير طبيعي 1L', cost: 18, sell: 35, cat: cats[2].id, qty: 45 },
        { code: 'ITM010', name: 'مكسرات مشكلة 500g', cost: 60, sell: 110, cat: cats[2].id, qty: 20 },
    ];

    for (const d of itemsData) {
        let item = await prisma.item.findFirst({
            where: { companyId, code: d.code },
        });

        if (!item) {
            item = await prisma.item.create({
                data: {
                    code: d.code,
                    name: d.name,
                    costPrice: d.cost,
                    sellPrice: d.sell,
                    averageCost: d.cost,
                    categoryId: d.cat,
                    unitId: unit.id,
                    type: 'product',
                    isPosEligible: true,
                    status: 'active',
                    companyId,
                },
            });
        }

        // Upsert stock
        await prisma.stock.upsert({
            where: { itemId_warehouseId: { itemId: item.id, warehouseId: warehouse.id } },
            update: { quantity: d.qty },
            create: { itemId: item.id, warehouseId: warehouse.id, quantity: d.qty },
        });
        console.log(`   📦 ${d.name} — مخزون: ${d.qty} — سعر: ${d.sell}`);
    }
    console.log('✅ تم إضافة الأصناف والمخزون');

    // ── 9. Customers ──────────────────────────────────────────────
    const customersData = [
        { name: 'أحمد محمد', phone: '01012345678' },
        { name: 'سارة علي', phone: '01098765432' },
        { name: 'محمود حسن', phone: '01122334455' },
        { name: 'نورا إبراهيم', phone: '01055667788' },
    ];

    for (const c of customersData) {
        const existing = await prisma.customer.findFirst({
            where: { companyId, name: c.name },
        });
        if (!existing) {
            await prisma.customer.create({
                data: { name: c.name, phone: c.phone, type: 'individual', companyId },
            });
            console.log(`   👤 عميل: ${c.name}`);
        }
    }
    console.log('✅ تم إضافة العملاء');

    // ── 10. Financial Year (if missing) ───────────────────────────
    const fyExists = await prisma.financialYear.findFirst({
        where: { companyId, isOpen: true },
    });
    if (!fyExists) {
        await prisma.financialYear.create({
            data: {
                name: '2026',
                startDate: new Date('2026-01-01'),
                endDate: new Date('2026-12-31'),
                isOpen: true,
                companyId,
            },
        });
        console.log('✅ تم إنشاء السنة المالية 2026');
    } else {
        console.log(`✅ السنة المالية موجودة: ${fyExists.name}`);
    }

    console.log('\n🎉 تمت إضافة الداتا التجريبية بنجاح!');
    console.log(`   — ${itemsData.length} صنف مع المخزون`);
    console.log(`   — ${customersData.length} عملاء`);
    console.log(`   — ${cats.length} تصنيفات`);
    console.log(`   — خزينة: ${treasury.name}`);
    console.log(`   — مخزن: ${warehouse.name}`);
    console.log('\nيمكنك الآن تجربة شاشة الكاشير 🛒');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
