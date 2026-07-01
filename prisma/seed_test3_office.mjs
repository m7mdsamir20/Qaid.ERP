/**
 * 🏢  Supplement Seed — خدمات المكاتب والمحاسبة والاستشارات (test3)
 * يُضيف:
 *  1. كتالوج خدمات: مكاتب، محاسبة، استشارات
 *  2. أصناف خدمية جديدة
 *  3. فواتير خدمات لهذه الخدمات
 *
 * الاستخدام: node prisma/seed_test3_office.mjs
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_USERNAME = 'test3';
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(10,0,0,0); return d; };

async function main() {
    // ── 0. اليوزر والشركة ───────────────────────────────────────────────────
    const allUsers = await prisma.user.findMany({ select: { id:true, username:true, companyId:true } });
    const user = allUsers.find(u => u.username.toLowerCase() === TARGET_USERNAME.toLowerCase());
    if (!user) { console.error('❌ اليوزر غير موجود'); process.exit(1); }
    const companyId = user.companyId;

    const branch  = await prisma.branch.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    const branchId = branch?.id;
    const treasury = await prisma.treasury.findFirst({ where: { companyId } });
    const fy      = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });

    console.log(`✅  شركة: ${companyId}  |  فرع: ${branchId}`);

    // ── 1. الفئة الجديدة ─────────────────────────────────────────────────────
    let catOffice = await prisma.category.findFirst({ where: { companyId, name: 'استشارات ومحاسبة' } });
    if (!catOffice) {
        catOffice = await prisma.category.create({ data: { name: 'استشارات ومحاسبة', companyId } });
        console.log('✅  فئة "استشارات ومحاسبة" أنشئت');
    } else {
        console.log('ℹ️   الفئة موجودة');
    }

    // ── 2. كتالوج الخدمات الجديدة ────────────────────────────────────────────
    console.log('\n──── كتالوج خدمات المكاتب والمحاسبة ────');
    const catalogData = [
        // محاسبة
        { code:'CAT-ACC-001', name:'إعداد القوائم المالية',           description:'إعداد ميزانية عمومية وقائمة دخل وتدفقات نقدية' },
        { code:'CAT-ACC-002', name:'مسك الدفاتر والمحاسبة الشهرية',  description:'تسجيل القيود اليومية والتسويات الشهرية' },
        { code:'CAT-ACC-003', name:'إعداد التقارير الضريبية',         description:'إعداد الإقرارات الضريبية وضريبة القيمة المضافة' },
        { code:'CAT-ACC-004', name:'مراجعة الحسابات وتدقيقها',       description:'مراجعة دقيقة للحسابات والسجلات المالية' },
        { code:'CAT-ACC-005', name:'إعداد الرواتب وشؤون الموظفين',   description:'معالجة الرواتب والتأمينات الاجتماعية والتسويات' },
        // استشارات
        { code:'CAT-CON-001', name:'استشارة قانونية تجارية',         description:'استشارات في العقود والنزاعات التجارية والقانونية' },
        { code:'CAT-CON-002', name:'استشارة إدارية وتنظيمية',        description:'تطوير الهياكل الإدارية وإجراءات العمل' },
        { code:'CAT-CON-003', name:'استشارة في التحول الرقمي',       description:'تقييم الأنظمة الرقمية وتطبيق حلول ERP' },
        { code:'CAT-CON-004', name:'دراسات جدوى اقتصادية',           description:'إعداد دراسات الجدوى للمشاريع والاستثمارات' },
        { code:'CAT-CON-005', name:'تدريب وتطوير الكوادر',           description:'برامج تدريبية في المحاسبة والإدارة المالية' },
        // خدمات مكتبية
        { code:'CAT-OFF-001', name:'إدارة وتجهيز الوثائق القانونية', description:'إعداد ومراجعة العقود والاتفاقيات' },
        { code:'CAT-OFF-002', name:'خدمات سكرتارية واستقبال',        description:'إدارة المكاتب والمكالمات والمراسلات' },
        { code:'CAT-OFF-003', name:'تأسيس الشركات والسجل التجاري',   description:'متابعة إجراءات تأسيس الشركات والتراخيص' },
        { code:'CAT-OFF-004', name:'تقديم خدمات الترجمة',            description:'ترجمة الوثائق التجارية والقانونية' },
    ];

    for (const c of catalogData) {
        const exists = await prisma.serviceCatalog.findFirst({ where: { companyId, code: c.code } });
        if (!exists) {
            await prisma.serviceCatalog.create({ data: { ...c, companyId } });
            console.log(`  ✅  ${c.name}`);
        } else {
            console.log(`  ℹ️   ${c.name} (موجود)`);
        }
    }

    // ── 3. الأصناف الخدمية (type=service) ────────────────────────────────────
    console.log('\n──── الأصناف الخدمية ────');
    const serviceItemsData = [
        // محاسبة
        { code:'SRV-ACC-001', name:'إعداد القوائم المالية السنوية',     sellPrice:3500, costPrice:800  },
        { code:'SRV-ACC-002', name:'مسك دفاتر شهري',                    sellPrice:1200, costPrice:300  },
        { code:'SRV-ACC-003', name:'إقرار ضريبي ربع سنوي',              sellPrice:2000, costPrice:500  },
        { code:'SRV-ACC-004', name:'تدقيق حسابات سنوي',                 sellPrice:5000, costPrice:1500 },
        { code:'SRV-ACC-005', name:'إعداد كشف رواتب شهري',              sellPrice:800,  costPrice:200  },
        // استشارات
        { code:'SRV-CON-001', name:'استشارة قانونية (جلسة)',             sellPrice:500,  costPrice:100  },
        { code:'SRV-CON-002', name:'دراسة جدوى اقتصادية',               sellPrice:8000, costPrice:2000 },
        { code:'SRV-CON-003', name:'خطة التحول الرقمي',                  sellPrice:6000, costPrice:1500 },
        { code:'SRV-CON-004', name:'برنامج تدريبي محاسبة (يوم)',         sellPrice:1500, costPrice:400  },
        // مكتبية
        { code:'SRV-OFF-001', name:'إعداد عقد تجاري',                   sellPrice:1000, costPrice:200  },
        { code:'SRV-OFF-002', name:'تأسيس شركة (كامل الإجراءات)',        sellPrice:4500, costPrice:1200 },
        { code:'SRV-OFF-003', name:'ترجمة وثائق (حتى 10 صفحات)',        sellPrice:300,  costPrice:80   },
    ];

    const serviceItems = [];
    for (const si of serviceItemsData) {
        let item = await prisma.item.findFirst({ where: { companyId, code: si.code } });
        if (!item) {
            item = await prisma.item.create({
                data: {
                    ...si,
                    type: 'service',
                    categoryId: catOffice.id,
                    averageCost: si.costPrice,
                    companyId,
                    status: 'active',
                }
            });
            console.log(`  ✅  ${item.name}`);
        } else {
            console.log(`  ℹ️   ${item.name} (موجود)`);
        }
        serviceItems.push(item);
    }

    // ── 4. عملاء جدد مناسبون لهذه الخدمات ──────────────────────────────────
    console.log('\n──── عملاء جدد ────');
    const newCustomersData = [
        { name:'مكتب المحاسب أحمد الغامدي',      phone:'0115-100-2000', balance:0 },
        { name:'شركة رؤية للاستشارات التجارية',   phone:'0116-200-3000', balance:0 },
        { name:'مكتب المحامي سالم البلوي',         phone:'0117-300-4000', balance:0 },
        { name:'مجموعة التطوير والتدريب',          phone:'0118-400-5000', balance:0 },
        { name:'شركة الحلول الرقمية المتكاملة',   phone:'0119-500-6000', balance:0 },
    ];
    const newCustomers = [];
    for (const c of newCustomersData) {
        let cust = await prisma.customer.findFirst({ where: { companyId, name: c.name } });
        if (!cust) {
            cust = await prisma.customer.create({ data: { ...c, companyId } });
            console.log(`  ✅  ${cust.name}`);
        } else {
            console.log(`  ℹ️   ${cust.name} (موجود)`);
        }
        newCustomers.push(cust);
    }

    // ── 5. فواتير الخدمات المحاسبية والاستشارية ──────────────────────────────
    console.log('\n──── فواتير خدمات المكاتب والمحاسبة ────');

    let lastSaleInv = await prisma.invoice.findFirst({
        where: { companyId, type: 'sale' },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
    });
    let saleNum = (lastSaleInv?.invoiceNumber || 0) + 1;

    const invoicesData = [
        // ① مكتب محاسب — مسك دفاتر + كشف رواتب × 3 أشهر
        {
            customer: newCustomers[0],
            date: daysAgo(30),
            notes: 'مسك دفاتر وكشوف رواتب لمدة 3 أشهر',
            paidPct: 1.0,
            lines: [
                { item: serviceItems[1], qty: 3, price: 1200 },  // مسك دفاتر × 3
                { item: serviceItems[4], qty: 3, price: 800  },  // رواتب × 3
            ]
        },
        // ② شركة استشارات — دراسة جدوى + خطة تحول رقمي
        {
            customer: newCustomers[1],
            date: daysAgo(22),
            notes: 'دراسة جدوى مشروع + خطة التحول الرقمي',
            paidPct: 0.5,
            lines: [
                { item: serviceItems[6], qty: 1, price: 8000 },  // دراسة جدوى
                { item: serviceItems[7], qty: 1, price: 6000 },  // خطة رقمية
            ]
        },
        // ③ مكتب محامي — عقود + استشارات قانونية
        {
            customer: newCustomers[2],
            date: daysAgo(15),
            notes: 'إعداد عقود ووثائق قانونية',
            paidPct: 1.0,
            lines: [
                { item: serviceItems[9],  qty: 3, price: 1000 },  // عقود × 3
                { item: serviceItems[5],  qty: 4, price: 500  },  // استشارة قانونية × 4
                { item: serviceItems[11], qty: 5, price: 300  },  // ترجمة × 5
            ]
        },
        // ④ مجموعة تدريب — برنامج تدريبي
        {
            customer: newCustomers[3],
            date: daysAgo(10),
            notes: 'برنامج تدريبي متكامل في المحاسبة لمدة 3 أيام',
            paidPct: 0.75,
            lines: [
                { item: serviceItems[8], qty: 3, price: 1500 },  // تدريب محاسبة × 3 أيام
            ]
        },
        // ⑤ شركة حلول رقمية — تأسيس + تدقيق
        {
            customer: newCustomers[4],
            date: daysAgo(5),
            notes: 'تأسيس شركة جديدة + تدقيق الحسابات',
            paidPct: 0.5,
            lines: [
                { item: serviceItems[10], qty: 1, price: 4500 },  // تأسيس شركة
                { item: serviceItems[3],  qty: 1, price: 5000 },  // تدقيق حسابات
            ]
        },
        // ⑥ مكتب محاسب — إقرار ضريبي + قوائم مالية ربع سنوية
        {
            customer: newCustomers[0],
            date: daysAgo(2),
            notes: 'إقرار ضريبي + قوائم مالية الربع الثاني',
            paidPct: 1.0,
            lines: [
                { item: serviceItems[2], qty: 1, price: 2000 },  // إقرار ضريبي
                { item: serviceItems[0], qty: 1, price: 3500 },  // قوائم مالية
            ]
        },
        // ⑦ شركة استشارات — استشارات قانونية + إعداد وثائق
        {
            customer: newCustomers[1],
            date: daysAgo(1),
            notes: 'استشارات استثمارية واتفاقيات شراكة',
            paidPct: 0.6,
            lines: [
                { item: serviceItems[5],  qty: 6, price: 500  },  // استشارة قانونية × 6
                { item: serviceItems[9],  qty: 2, price: 1000 },  // عقود × 2
            ]
        },
    ];

    for (const inv of invoicesData) {
        const subtotal    = inv.lines.reduce((s, l) => s + l.qty * l.price, 0);
        const paidAmount  = Math.round(subtotal * inv.paidPct);
        const remaining   = subtotal - paidAmount;

        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: saleNum++,
                    type: 'sale',
                    date: inv.date,
                    customerId: inv.customer.id,
                    notes: inv.notes,
                    subtotal,
                    discount: 0,
                    total: subtotal,
                    paidAmount,
                    remaining,
                    paymentMethod: paidAmount === subtotal ? 'cash' : 'credit',
                    companyId,
                    branchId,
                    lines: {
                        create: inv.lines.map(l => ({
                            itemId: l.item.id,
                            quantity: l.qty,
                            price: l.price,
                            discount: 0,
                            total: l.qty * l.price,
                        }))
                    }
                }
            });

            // جميع الأصناف خدمات — لا مخزون
            // تحديث رصيد العميل إذا في متبقي
            if (remaining > 0) {
                await tx.customer.update({
                    where: { id: inv.customer.id },
                    data: { balance: { increment: remaining } }
                });
            }
            // تحديث الخزينة
            if (paidAmount > 0 && treasury) {
                await tx.treasury.update({
                    where: { id: treasury.id },
                    data: { balance: { increment: paidAmount } }
                });
            }

            const linesDesc = inv.lines.map(l => `${l.item.name}×${l.qty}`).join(' | ');
            console.log(`  ✅  فاتورة #${invoice.invoiceNumber}  |  ${subtotal.toLocaleString()} ج  |  ${inv.customer.name}`);
            console.log(`       📋  ${linesDesc}`);
        });
    }

    // ── 6. ملخص ─────────────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════');
    console.log('🎉  تم إضافة خدمات المكاتب والمحاسبة بنجاح!');
    console.log('════════════════════════════════════════════');
    console.log(`📋  كتالوج الخدمات المضافة: ${catalogData.length} بند`);
    console.log(`📦  أصناف خدمية جديدة: ${serviceItemsData.length}`);
    console.log(`👥  عملاء جدد: ${newCustomersData.length}`);
    console.log(`🧾  فواتير خدمات جديدة: ${invoicesData.length}`);
    console.log('\nالخدمات المضافة تشمل:');
    console.log('  ✦ محاسبة: قوائم مالية، مسك دفاتر، ضرائب، تدقيق، رواتب');
    console.log('  ✦ استشارات: قانونية، إدارية، رقمية، دراسات جدوى، تدريب');
    console.log('  ✦ مكتبية: إعداد عقود، تأسيس شركات، ترجمة وثائق');
}

main()
    .catch(e => { console.error('❌ خطأ:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
