/**
 * Demo Data Seeder — يحشو بيانات تجريبية شاملة لمستخدم معين
 * الاستخدام: node prisma/demo-data.mjs
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const TARGET_USERNAME = 'M7mdsamir';
const COMPANY_ID      = 'cmnakbkqy0001urt9so5h0ucr';

// ─── helpers ────────────────────────────────────────────────────────────────
const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };
const daysFrom = (n) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(0,0,0,0); return d; };
const monthAgo = (m) => { const d = new Date(); d.setMonth(d.getMonth() - m); d.setHours(0,0,0,0); return d; };
const rand     = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick     = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
    // 1. تحقق من وجود الشركة
    const company = await prisma.company.findUnique({ where: { id: COMPANY_ID } });
    if (!company) {
        console.error(`❌ الشركة بالـ ID "${COMPANY_ID}" غير موجودة.`);
        process.exit(1);
    }
    const companyId = COMPANY_ID;
    console.log(`✅ companyId = ${companyId} (${company.name})`);

    // جيب الفرع الرئيسي
    const mainBranch = await prisma.branch.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    const branchId = mainBranch?.id || null;
    console.log(`✅ branchId = ${branchId} (${mainBranch?.name || 'بدون فرع'})`);

    // تحقق من اليوزر (اختياري — للتأكيد فقط)
    const user = await prisma.user.findFirst({ where: { username: TARGET_USERNAME } });
    if (user) console.log(`✅ مستخدم موجود: ${user.name}`);
    else console.log(`⚠️  تحذير: اليوزر "${TARGET_USERNAME}" غير موجود — سيتم إضافة البيانات على الشركة فقط`);

    // ════════════════════════════════════════════════════════════
    // 2. السنة المالية
    // ════════════════════════════════════════════════════════════
    let fy = await prisma.financialYear.findFirst({ where: { companyId, isOpen: true } });
    if (!fy) {
        fy = await prisma.financialYear.create({
            data: {
                name: '2025',
                startDate: new Date('2025-01-01'),
                endDate:   new Date('2025-12-31'),
                isOpen: true,
                companyId,
            }
        });
        console.log('✅ سنة مالية أنشئت');
    } else {
        console.log('ℹ️  السنة المالية موجودة مسبقاً');
    }

    // ════════════════════════════════════════════════════════════
    // 3. دليل الحسابات الأساسي (إذا مش موجود)
    // ════════════════════════════════════════════════════════════
    const accExists = await prisma.account.findFirst({ where: { companyId } });
    let accounts = {};
    if (!accExists) {
        const accsData = [
            // أصول
            { code:'1000', name:'الأصول',            nature:'debit',  type:'asset',     accountCategory:'parent', isParent:true  },
            { code:'1100', name:'أصول متداولة',       nature:'debit',  type:'asset',     accountCategory:'parent', isParent:true  },
            { code:'1110', name:'الصندوق',             nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1120', name:'البنك',               nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1130', name:'ذمم مدينة - عملاء',  nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1131', name:'المخزون',             nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1126', name:'سلف الموظفين',        nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1143', name:'ذمم الموظفين',        nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1200', name:'أصول ثابتة',          nature:'debit',  type:'asset',     accountCategory:'parent', isParent:true  },
            { code:'1210', name:'الأثاث والمعدات',      nature:'debit',  type:'asset',     accountCategory:'detail', isParent:false },
            { code:'1211', name:'مجمع إهلاك الأثاث',   nature:'credit', type:'asset',     accountCategory:'detail', isParent:false },
            // خصوم
            { code:'2000', name:'الخصوم',              nature:'credit', type:'liability', accountCategory:'parent', isParent:true  },
            { code:'2100', name:'خصوم متداولة',        nature:'credit', type:'liability', accountCategory:'parent', isParent:true  },
            { code:'2110', name:'ذمم دائنة - موردين',  nature:'credit', type:'liability', accountCategory:'detail', isParent:false },
            // حقوق ملكية
            { code:'3000', name:'حقوق الملكية',        nature:'credit', type:'equity',    accountCategory:'parent', isParent:true  },
            { code:'3100', name:'رأس المال',            nature:'credit', type:'equity',    accountCategory:'detail', isParent:false },
            { code:'3500', name:'الأرباح المحتجزة',    nature:'credit', type:'equity',    accountCategory:'detail', isParent:false },
            // إيرادات
            { code:'4000', name:'الإيرادات',           nature:'credit', type:'revenue',   accountCategory:'parent', isParent:true  },
            { code:'4100', name:'إيرادات المبيعات',    nature:'credit', type:'revenue',   accountCategory:'detail', isParent:false },
            { code:'4200', name:'إيرادات فوائد',       nature:'credit', type:'revenue',   accountCategory:'detail', isParent:false },
            { code:'4300', name:'إيرادات متنوعة',      nature:'credit', type:'revenue',   accountCategory:'detail', isParent:false },
            { code:'4310', name:'جزاءات وغرامات',      nature:'credit', type:'revenue',   accountCategory:'detail', isParent:false },
            // مصروفات
            { code:'5000', name:'المصروفات',           nature:'debit',  type:'expense',   accountCategory:'parent', isParent:true  },
            { code:'5100', name:'تكلفة المبيعات',      nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5200', name:'مصروفات تشغيلية',     nature:'debit',  type:'expense',   accountCategory:'parent', isParent:true  },
            { code:'5210', name:'رواتب والأجور',       nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5220', name:'إيجار المحل',         nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5230', name:'مصروفات كهرباء',      nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5240', name:'مصروفات أخرى',        nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5250', name:'إهلاك الأصول الثابتة',nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
            { code:'5260', name:'نقص مخزون',           nature:'debit',  type:'expense',   accountCategory:'detail', isParent:false },
        ];

        for (const a of accsData) {
            await prisma.account.upsert({
                where: { code_companyId: { code: a.code, companyId } },
                update: {},
                create: { ...a, companyId, level: 1 }
            });
        }
        console.log('✅ دليل الحسابات أنشئ');
    }

    // اجمع الحسابات في map
    const allAccs = await prisma.account.findMany({ where: { companyId } });
    const accByCode = {};
    for (const a of allAccs) accByCode[a.code] = a;

    // ════════════════════════════════════════════════════════════
    // 4. خزائن وبنوك
    // ════════════════════════════════════════════════════════════
    let treasury = await prisma.treasury.findFirst({ where: { companyId, name: 'الصندوق الرئيسي' } });
    if (!treasury) {
        treasury = await prisma.treasury.create({ data: { name: 'الصندوق الرئيسي', type: 'cash', balance: 85000, companyId, branchId } });
        console.log('✅ الصندوق الرئيسي أنشئ');
    } else { console.log('ℹ️  الصندوق الرئيسي موجود'); }

    const treasury2Exists = await prisma.treasury.findFirst({ where: { companyId, name: 'صندوق الفرع' } });
    if (!treasury2Exists) {
        await prisma.treasury.create({ data: { name: 'صندوق الفرع', type: 'cash', balance: 12000, companyId, branchId } });
        console.log('✅ صندوق الفرع أنشئ');
    } else { console.log('ℹ️  صندوق الفرع موجود'); }

    let bank = await prisma.treasury.findFirst({ where: { companyId, name: 'البنك الأهلي' } });
    if (!bank) {
        bank = await prisma.treasury.create({ data: { name: 'البنك الأهلي', type: 'bank', balance: 320000, bankName: 'البنك الأهلي المصري', accountNumber: '0012345678', companyId, branchId } });
        console.log('✅ البنك الأهلي أنشئ');
    } else { console.log('ℹ️  البنك الأهلي موجود'); }

    const bank2Exists = await prisma.treasury.findFirst({ where: { companyId, name: 'بنك مصر' } });
    if (!bank2Exists) {
        await prisma.treasury.create({ data: { name: 'بنك مصر', type: 'bank', balance: 95000, bankName: 'بنك مصر', accountNumber: '9988776655', companyId, branchId } });
        console.log('✅ بنك مصر أنشئ');
    } else { console.log('ℹ️  بنك مصر موجود'); }

    // ════════════════════════════════════════════════════════════
    // 5. وحدات وتصنيفات وأصناف
    // ════════════════════════════════════════════════════════════
    const unitNames = ['حبة', 'كرتون', 'كيلو', 'متر', 'لتر', 'علبة'];
    const unitMap = {};
    for (const uName of unitNames) {
        const u = await prisma.unit.upsert({
            where: { name_companyId: { name: uName, companyId } },
            update: {},
            create: { name: uName, companyId }
        });
        unitMap[uName] = u;
    }

    const catNames = ['إلكترونيات', 'مواد غذائية', 'ملابس', 'مستلزمات مكتبية', 'أجهزة منزلية'];
    const catMap = {};
    for (const cName of catNames) {
        const existing = await prisma.category.findFirst({ where: { name: cName, companyId } });
        const c = existing || await prisma.category.create({ data: { name: cName, companyId } });
        catMap[cName] = c;
    }

    const itemsData = [
        { code:'ITM-001', name:'لابتوب ديل',          cost: 8000,  sell: 10500, unit:'حبة',   cat:'إلكترونيات',       min:3,  qty:25 },
        { code:'ITM-002', name:'شاشة سامسونج 24"',    cost: 1800,  sell: 2500,  unit:'حبة',   cat:'إلكترونيات',       min:5,  qty:40 },
        { code:'ITM-003', name:'كيبورد لاسلكي',       cost: 250,   sell: 400,   unit:'حبة',   cat:'مستلزمات مكتبية',  min:10, qty:60 },
        { code:'ITM-004', name:'ماوس بلوتوث',         cost: 150,   sell: 250,   unit:'حبة',   cat:'مستلزمات مكتبية',  min:10, qty:55 },
        { code:'ITM-005', name:'طابعة HP LaserJet',   cost: 3200,  sell: 4500,  unit:'حبة',   cat:'إلكترونيات',       min:2,  qty:12 },
        { code:'ITM-006', name:'ورق A4 (ريمة)',       cost: 35,    sell: 55,    unit:'علبة',  cat:'مستلزمات مكتبية',  min:20, qty:150 },
        { code:'ITM-007', name:'قميص قطن',            cost: 120,   sell: 200,   unit:'حبة',   cat:'ملابس',             min:15, qty:80 },
        { code:'ITM-008', name:'بنطلون جينز',         cost: 200,   sell: 350,   unit:'حبة',   cat:'ملابس',             min:10, qty:65 },
        { code:'ITM-009', name:'مكيف سبليت 1.5 طن',  cost: 4500,  sell: 6200,  unit:'حبة',   cat:'أجهزة منزلية',      min:2,  qty:18 },
        { code:'ITM-010', name:'ثلاجة سامسونج',       cost: 6000,  sell: 8500,  unit:'حبة',   cat:'أجهزة منزلية',      min:2,  qty:10 },
        { code:'ITM-011', name:'زيت نخيل (5 لتر)',    cost: 85,    sell: 130,   unit:'لتر',   cat:'مواد غذائية',       min:30, qty:200 },
        { code:'ITM-012', name:'أرز بسمتي (5 كيلو)',  cost: 60,    sell: 90,    unit:'كيلو',  cat:'مواد غذائية',       min:50, qty:300 },
    ];

    let warehouse = await prisma.warehouse.findFirst({ where: { companyId, name: 'المستودع الرئيسي' } });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({ data: { name: 'المستودع الرئيسي', companyId, branchId } });
        console.log('✅ المستودع الرئيسي أنشئ');
    } else { console.log('ℹ️  المستودع الرئيسي موجود'); }

    let warehouse2 = await prisma.warehouse.findFirst({ where: { companyId, name: 'مستودع الفرع' } });
    if (!warehouse2) {
        warehouse2 = await prisma.warehouse.create({ data: { name: 'مستودع الفرع', companyId, branchId } });
        console.log('✅ مستودع الفرع أنشئ');
    } else { console.log('ℹ️  مستودع الفرع موجود'); }

    const wh3Exists = await prisma.warehouse.findFirst({ where: { companyId, name: 'مستودع المرتجعات' } });
    if (!wh3Exists) {
        await prisma.warehouse.create({ data: { name: 'مستودع المرتجعات', companyId, branchId } });
        console.log('✅ مستودع المرتجعات أنشئ');
    } else { console.log('ℹ️  مستودع المرتجعات موجود'); }

    const itemMap = {};
    for (const itm of itemsData) {
        const item = await prisma.item.upsert({
            where: { code_companyId: { code: itm.code, companyId } },
            update: {},
            create: {
                code:        itm.code,
                name:        itm.name,
                costPrice:   itm.cost,
                averageCost: itm.cost,
                sellPrice:   itm.sell,
                minLimit:    itm.min,
                unitId:      unitMap[itm.unit]?.id,
                categoryId:  catMap[itm.cat]?.id,
                companyId,
            }
        });
        itemMap[itm.code] = item;

        // مخزون المستودع الرئيسي
        await prisma.stock.upsert({
            where: { itemId_warehouseId: { itemId: item.id, warehouseId: warehouse.id } },
            update: {},
            create: { itemId: item.id, warehouseId: warehouse.id, quantity: itm.qty }
        });
        // مخزون مستودع الفرع (25%)
        await prisma.stock.upsert({
            where: { itemId_warehouseId: { itemId: item.id, warehouseId: warehouse2.id } },
            update: {},
            create: { itemId: item.id, warehouseId: warehouse2.id, quantity: Math.floor(itm.qty * 0.25) }
        });
    }
    console.log(`✅ ${itemsData.length} صنف أنشئ مع المخزون`);

    // ════════════════════════════════════════════════════════════
    // 6. عملاء
    // ════════════════════════════════════════════════════════════
    const customersData = [
        { name:'أحمد محمد علي',       phone:'0501234567', address:'القاهرة - مدينة نصر' },
        { name:'شركة النور للتجارة',   phone:'0507654321', address:'الإسكندرية - سيدي بشر' },
        { name:'محمود السيد',          phone:'0512345678', address:'الجيزة - الدقي' },
        { name:'مؤسسة الأمل التجارية',phone:'0523456789', address:'القاهرة - التجمع الخامس' },
        { name:'خالد عبدالله',         phone:'0534567890', address:'المنصورة - المحطة' },
        { name:'شركة الربيع للتوريد', phone:'0545678901', address:'الإسماعيلية' },
        { name:'فاطمة حسن',           phone:'0556789012', address:'القاهرة - مصر الجديدة' },
        { name:'عمر التاجر',          phone:'0567890123', address:'الأقصر' },
    ];
    const customerIds = [];
    for (const c of customersData) {
        const existing = await prisma.customer.findFirst({ where: { companyId, name: c.name } });
        const cust = existing || await prisma.customer.create({ data: { ...c, companyId } });
        customerIds.push(cust.id);
    }
    console.log(`✅ ${customersData.length} عميل أنشئ`);

    // ════════════════════════════════════════════════════════════
    // 7. موردين
    // ════════════════════════════════════════════════════════════
    const suppliersData = [
        { name:'شركة الإمداد التقني',  phone:'0211234567', address:'القاهرة - المعادي' },
        { name:'مصنع النسيج الحديث',  phone:'0212345678', address:'المحلة الكبرى' },
        { name:'مستودعات السعد',       phone:'0213456789', address:'القاهرة - شبرا' },
        { name:'شركة التوريدات العامة',phone:'0214567890', address:'الإسكندرية - المرسى' },
        { name:'مؤسسة الخليج للتجارة',phone:'0215678901', address:'القاهرة - هليوبوليس' },
    ];
    const supplierIds = [];
    for (const s of suppliersData) {
        const existing = await prisma.supplier.findFirst({ where: { companyId, name: s.name } });
        const supp = existing || await prisma.supplier.create({ data: { ...s, companyId } });
        supplierIds.push(supp.id);
    }
    console.log(`✅ ${suppliersData.length} مورد أنشئ`);

    // ════════════════════════════════════════════════════════════
    // 8. فواتير مبيعات (20 فاتورة)
    // ════════════════════════════════════════════════════════════
    const existingSaleCount = await prisma.invoice.count({ where: { companyId, type:'sale' } });
    let saleNum = (await prisma.invoice.findFirst({ where: { companyId, type:'sale' }, orderBy:{ invoiceNumber:'desc' } }))?.invoiceNumber || 0;
    const salesItems = Object.values(itemMap);
    const payMethods = ['cash','credit','bank'];
    const salesToAdd = Math.max(0, 20 - existingSaleCount);

    for (let i = 0; i < salesToAdd; i++) {
        saleNum++;
        const custId  = pick(customerIds);
        const method  = pick(payMethods);
        const daysAgoN = rand(1, 90);
        const invDate  = daysAgo(daysAgoN);
        const numLines = rand(1, 4);
        const lines = [];
        let subtotal = 0;
        for (let j = 0; j < numLines; j++) {
            const item = salesItems[rand(0, salesItems.length - 1)];
            const qty  = rand(1, 10);
            const price = item.sellPrice;
            const total = qty * price;
            subtotal += total;
            lines.push({ itemId: item.id, quantity: qty, price, total, unit: 'حبة' });
        }
        const discount = rand(0, 1) ? rand(50, 500) : 0;
        const total    = subtotal - discount;
        const paid     = method === 'credit' ? rand(0, Math.floor(total * 0.7)) : total;
        const remaining = total - paid;

        await prisma.invoice.create({
            data: {
                invoiceNumber: saleNum,
                type:          'sale',
                date:          invDate,
                customerId:    custId,
                subtotal,
                discount,
                total,
                paidAmount:    paid,
                remaining,
                paymentMethod: method,
                warehouseId:   warehouse.id,
                companyId,
                lines: { create: lines }
            }
        });
    }
    if (salesToAdd > 0) console.log(`✅ ${salesToAdd} فاتورة مبيعات أنشئت`);
    else console.log('ℹ️  فواتير المبيعات موجودة مسبقاً');

    // ════════════════════════════════════════════════════════════
    // 9. فواتير مشتريات (10 فواتير)
    // ════════════════════════════════════════════════════════════
    const existingPurchCount = await prisma.invoice.count({ where: { companyId, type:'purchase' } });
    let purNum = (await prisma.invoice.findFirst({ where: { companyId, type:'purchase' }, orderBy:{ invoiceNumber:'desc' } }))?.invoiceNumber || 0;
    const purchToAdd = Math.max(0, 10 - existingPurchCount);

    for (let i = 0; i < purchToAdd; i++) {
        purNum++;
        const suppId   = pick(supplierIds);
        const daysAgoN = rand(5, 120);
        const invDate  = daysAgo(daysAgoN);
        const numLines = rand(1, 5);
        const lines = [];
        let subtotal = 0;
        for (let j = 0; j < numLines; j++) {
            const item = salesItems[rand(0, salesItems.length - 1)];
            const qty  = rand(5, 50);
            const price = item.costPrice;
            const total = qty * price;
            subtotal += total;
            lines.push({ itemId: item.id, quantity: qty, price, total, unit: 'حبة' });
        }
        const total    = subtotal;
        const method   = pick(['cash', 'credit', 'bank']);
        const paid     = method === 'credit' ? rand(0, Math.floor(total * 0.6)) : total;
        const remaining = total - paid;

        await prisma.invoice.create({
            data: {
                invoiceNumber: purNum,
                type:          'purchase',
                date:          invDate,
                supplierId:    suppId,
                subtotal,
                discount:      0,
                total,
                paidAmount:    paid,
                remaining,
                paymentMethod: method,
                warehouseId:   warehouse.id,
                companyId,
                lines: { create: lines }
            }
        });
    }
    if (purchToAdd > 0) console.log(`✅ ${purchToAdd} فاتورة مشتريات أنشئت`);
    else console.log('ℹ️  فواتير المشتريات موجودة مسبقاً');

    // ════════════════════════════════════════════════════════════
    // 10. سندات قبض وصرف (15 سند)
    // ════════════════════════════════════════════════════════════
    const existingVoucherCount = await prisma.voucher.count({ where: { companyId } });
    let vNum = (await prisma.voucher.findFirst({ where: { companyId }, orderBy:{ voucherNumber:'desc' } }))?.voucherNumber || 0;
    const vouchersToAdd = Math.max(0, 15 - existingVoucherCount);
    const receiptToAdd = Math.min(8, Math.ceil(vouchersToAdd * 8/15));
    const paymentToAdd = vouchersToAdd - receiptToAdd;

    for (let i = 0; i < receiptToAdd; i++) {
        vNum++;
        await prisma.voucher.create({
            data: {
                voucherNumber:   vNum,
                type:            'receipt',
                date:            daysAgo(rand(1, 60)),
                amount:          rand(500, 15000),
                description:     `تحصيل دفعة من عميل`,
                customerId:      pick(customerIds),
                treasuryId:      treasury.id,
                financialYearId: fy.id,
                companyId,
            }
        });
    }
    for (let i = 0; i < paymentToAdd; i++) {
        vNum++;
        await prisma.voucher.create({
            data: {
                voucherNumber:   vNum,
                type:            'payment',
                date:            daysAgo(rand(1, 60)),
                amount:          rand(1000, 20000),
                description:     `سداد دفعة لمورد`,
                supplierId:      pick(supplierIds),
                treasuryId:      bank.id,
                financialYearId: fy.id,
                companyId,
            }
        });
    }
    if (vouchersToAdd > 0) console.log(`✅ ${vouchersToAdd} سند قبض/صرف أنشئ`);
    else console.log('ℹ️  السندات موجودة مسبقاً');

    // ════════════════════════════════════════════════════════════
    // 11. الموظفين والأقسام
    // ════════════════════════════════════════════════════════════
    const deptNames = ['المبيعات', 'المشتريات', 'المحاسبة', 'المستودع', 'الإدارة'];
    const deptMap = {};
    for (const dName of deptNames) {
        const d = await prisma.department.findFirst({ where: { companyId, name: dName } }) ||
            await prisma.department.create({ data: { name: dName, companyId } });
        deptMap[dName] = d;
    }

    const employeesData = [
        { name:'محمد عبدالرحمن',  position:'مدير مبيعات',    dept:'المبيعات',   basic:5000, housing:1000, transport:500 },
        { name:'سارة أحمد',       position:'محاسبة',         dept:'المحاسبة',   basic:4500, housing:800,  transport:400 },
        { name:'علي حسن',         position:'أمين مستودع',    dept:'المستودع',   basic:3500, housing:600,  transport:500 },
        { name:'نورا السيد',      position:'مسؤولة مشتريات', dept:'المشتريات',  basic:4000, housing:700,  transport:400 },
        { name:'خالد إبراهيم',    position:'مندوب مبيعات',   dept:'المبيعات',   basic:3000, housing:500,  transport:500 },
        { name:'رنا محمود',       position:'سكرتيرة',        dept:'الإدارة',    basic:3500, housing:600,  transport:400 },
    ];
    const empIds = [];
    let empCodeNum = 1;
    for (const e of employeesData) {
        const code = `EMP-${String(empCodeNum++).padStart(3,'0')}`;
        const existing = await prisma.employee.findFirst({ where: { companyId, name: e.name } });
        const emp = existing || await prisma.employee.create({
            data: {
                code,
                name:               e.name,
                position:           e.position,
                hireDate:           daysAgo(rand(200, 800)),
                basicSalary:        e.basic,
                housingAllowance:   e.housing,
                transportAllowance: e.transport,
                departmentId:       deptMap[e.dept].id,
                companyId,
            }
        });
        empIds.push(emp.id);
    }
    console.log(`✅ ${employeesData.length} موظف أنشئ`);

    // ════════════════════════════════════════════════════════════
    // 12. سلف الموظفين
    // ════════════════════════════════════════════════════════════
    const existingAdvCount = await prisma.advance.count({ where: { companyId } });
    const advToAdd = Math.max(0, 4 - existingAdvCount);
    for (let i = 0; i < advToAdd; i++) {
        await prisma.advance.create({
            data: {
                date:             daysAgo(rand(10, 60)),
                amount:           rand(500, 3000),
                installmentCount: rand(1, 6),
                employeeId:       pick(empIds),
                status:           pick(['pending', 'deducted']),
                treasuryId:       treasury?.id,
                companyId,
            }
        });
    }
    if (advToAdd > 0) console.log(`✅ ${advToAdd} سلفة موظف أنشئت`);
    else console.log('ℹ️  سلف الموظفين موجودة مسبقاً');

    // ════════════════════════════════════════════════════════════
    // 13. مسير الرواتب (شهر ماضي)
    // ════════════════════════════════════════════════════════════
    const lastMonth  = new Date(); lastMonth.setMonth(lastMonth.getMonth() - 1);
    const payMonth   = lastMonth.getMonth() + 1;
    const payYear    = lastMonth.getFullYear();
    const existPayroll = await prisma.payroll.findFirst({ where: { companyId, month: payMonth, year: payYear } });
    if (!existPayroll) {
        const allEmps = await prisma.employee.findMany({ where: { companyId, status:'active' } });
        let totalSalaries = 0, totalAllowances = 0, netTotal = 0;
        const payLines = allEmps.map(e => {
            const allowances = (e.housingAllowance || 0) + (e.transportAllowance || 0) + (e.foodAllowance || 0);
            const deductions = (e.insuranceDeduction || 0) + (e.taxDeduction || 0);
            const net = e.basicSalary + allowances - deductions;
            totalSalaries  += e.basicSalary;
            totalAllowances += allowances;
            netTotal       += net;
            return { employeeId: e.id, basicSalary: e.basicSalary, allowances, discounts: deductions, advances: 0, netSalary: net };
        });

        await prisma.payroll.create({
            data: {
                month:           payMonth,
                year:            payYear,
                date:            lastMonth,
                totalSalaries,
                totalAllowances,
                totalDiscounts:  0,
                totalAdvances:   0,
                netTotal,
                status:          'draft',
                companyId,
                lines: { create: payLines }
            }
        });
        console.log(`✅ مسير رواتب ${payMonth}/${payYear} أنشئ`);
    }

    // ════════════════════════════════════════════════════════════
    // 14. خطط تقسيط (3 خطط)
    // ════════════════════════════════════════════════════════════
    const existingPlanCount = await prisma.installmentPlan.count({ where: { companyId } });
    let planNum = (await prisma.installmentPlan.findFirst({ where: { companyId }, orderBy:{ planNumber:'desc' } }))?.planNumber || 0;

    const plansData = [
        { custIdx:0, product:'لابتوب ديل',       total:10500, down:2000, rate:5,  months:12, daysAgoStart:60 },
        { custIdx:1, product:'مكيف سبليت 1.5 طن',total:6200,  down:1000, rate:0,  months:6,  daysAgoStart:30 },
        { custIdx:2, product:'ثلاجة سامسونج',    total:8500,  down:1500, rate:8,  months:9,  daysAgoStart:15 },
    ];

    if (existingPlanCount > 0) {
        console.log('ℹ️  خطط التقسيط موجودة مسبقاً');
    } else for (const p of plansData) {
        planNum++;
        const startDate    = daysAgo(p.daysAgoStart);
        const principal    = p.total - p.down;
        const totalInterest = (principal * p.rate / 100) * (p.months / 12);
        const grandTotal   = principal + totalInterest;
        const installAmt   = parseFloat((grandTotal / p.months).toFixed(2));

        const plan = await prisma.installmentPlan.create({
            data: {
                planNumber:        planNum,
                customerId:        customerIds[p.custIdx],
                productName:       p.product,
                totalAmount:       p.total,
                downPayment:       p.down,
                interestRate:      p.rate,
                totalInterest,
                grandTotal,
                monthsCount:       p.months,
                installmentAmount: installAmt,
                startDate,
                status: 'active',
                companyId,
            }
        });

        // أنشئ الأقساط
        for (let m = 1; m <= p.months; m++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + m);
            const isPast     = dueDate < new Date();
            const isThisMonth = dueDate.getMonth() === new Date().getMonth() && dueDate.getFullYear() === new Date().getFullYear();
            let status = 'pending';
            let paidAmount = 0;
            let paidAt = null;
            if (isPast && m <= 2) { status = 'paid'; paidAmount = installAmt; paidAt = dueDate; }
            else if (isThisMonth) { status = 'partial'; paidAmount = installAmt * 0.5; }

            await prisma.installment.create({
                data: {
                    planId:        plan.id,
                    installmentNo: m,
                    dueDate,
                    principal:     parseFloat((principal / p.months).toFixed(2)),
                    interest:      parseFloat((totalInterest / p.months).toFixed(2)),
                    amount:        installAmt,
                    paidAmount,
                    remaining:     installAmt - paidAmount,
                    status,
                    paidAt,
                    companyId,
                }
            });
        }

        // تحديث رصيد العميل بالمبالغ المتبقية
        const totalRemaining = grandTotal - (installAmt * 2);
        await prisma.customer.update({
            where: { id: customerIds[p.custIdx] },
            data:  { balance: { increment: totalRemaining } }
        });
    }
    if (existingPlanCount === 0) console.log('✅ 3 خطط تقسيط أنشئت');

    // ════════════════════════════════════════════════════════════
    // 15. أصول ثابتة
    // ════════════════════════════════════════════════════════════
    const assetAcc  = accByCode['1210'];
    const depAcc    = accByCode['5250'];
    const accumAcc  = accByCode['1211'];
    if (assetAcc && depAcc && accumAcc) {
        const assetsData = [
            { code:'FA-001', name:'سيارة توصيل',    cat:'مركبات',   cost:150000, salvage:20000, rate:20, life:5 },
            { code:'FA-002', name:'أثاث المكتب',    cat:'أثاث',     cost:25000,  salvage:2000,  rate:10, life:10 },
            { code:'FA-003', name:'أجهزة حاسوب',    cat:'معدات',    cost:45000,  salvage:5000,  rate:25, life:4 },
        ];
        for (const a of assetsData) {
            const exists = await prisma.fixedAsset.findFirst({ where: { companyId, code: a.code } });
            if (!exists) {
                const annualDep = (a.cost - a.salvage) / a.life;
                const accumulated = annualDep * 1.5; // سنة ونص
                await prisma.fixedAsset.create({
                    data: {
                        code:                    a.code,
                        name:                    a.name,
                        category:                a.cat,
                        purchaseDate:            daysAgo(rand(400, 800)),
                        purchaseCost:            a.cost,
                        salvageValue:            a.salvage,
                        depreciationRate:        a.rate,
                        depreciationMethod:      'straight',
                        usefulLife:              a.life,
                        accumulatedDepreciation: parseFloat(accumulated.toFixed(2)),
                        netBookValue:            parseFloat((a.cost - accumulated).toFixed(2)),
                        status:                  'active',
                        assetAccountId:          assetAcc.id,
                        depAccountId:            depAcc.id,
                        accumAccountId:          accumAcc.id,
                        companyId,
                    }
                });
            }
        }
        console.log('✅ 3 أصول ثابتة أنشئت');
    }

    // ════════════════════════════════════════════════════════════
    // 16. شركاء
    // ════════════════════════════════════════════════════════════
    const partnersData = [
        { name:'أحمد الشريك الأول', share:50, capital:200000, phone:'0501111111' },
        { name:'محمد الشريك الثاني',share:30, capital:120000, phone:'0502222222' },
        { name:'سارة الشريكة',     share:20, capital:80000,  phone:'0503333333' },
    ];
    for (const p of partnersData) {
        const exists = await prisma.partner.findFirst({ where: { companyId, name: p.name } });
        if (!exists) {
            await prisma.partner.create({ data: { ...p, balance: p.capital, companyId } });
        }
    }
    console.log('✅ 3 شركاء أنشئوا');

    // ════════════════════════════════════════════════════════════
    // 17. قيود محاسبية يدوية (5 قيود)
    // ════════════════════════════════════════════════════════════
    if (accByCode['5220'] && accByCode['1110']) {
        let jeNum = (await prisma.journalEntry.findFirst({ where: { companyId }, orderBy:{ entryNumber:'desc' } }))?.entryNumber || 0;

        const manualEntries = [
            {
                desc:  'إيجار المحل - يناير 2025',
                lines: [
                    { accountId: accByCode['5220'].id, debit: 5000, credit: 0,    description: 'إيجار المحل' },
                    { accountId: accByCode['1110'].id, debit: 0,    credit: 5000, description: 'دفع من الصندوق' },
                ]
            },
            {
                desc:  'مصروفات كهرباء - يناير 2025',
                lines: [
                    { accountId: accByCode['5230']?.id || accByCode['5240'].id, debit: 1200, credit: 0,    description: 'فاتورة كهرباء' },
                    { accountId: accByCode['1110'].id,                           debit: 0,    credit: 1200, description: 'دفع نقدي' },
                ]
            },
            {
                desc:  'إيداع بنكي',
                lines: [
                    { accountId: accByCode['1120'].id, debit: 50000, credit: 0,     description: 'إيداع في البنك' },
                    { accountId: accByCode['1110'].id, debit: 0,     credit: 50000, description: 'من الصندوق' },
                ]
            },
        ];

        for (const je of manualEntries) {
            jeNum++;
            await prisma.journalEntry.create({
                data: {
                    entryNumber:     jeNum,
                    date:            daysAgo(rand(5, 60)),
                    description:     je.desc,
                    referenceType:   'manual',
                    financialYearId: fy.id,
                    companyId,
                    isPosted:        true,
                    lines:           { create: je.lines }
                }
            });
        }
        console.log('✅ 3 قيود محاسبية يدوية أنشئت');
    }

    // ════════════════════════════════════════════════════════════
    // 18. أرصدة افتتاحية
    // ════════════════════════════════════════════════════════════
    if (accByCode['1110'] && accByCode['3100']) {
        const obData = [
            { code:'1110', debit: 50000, credit: 0 },
            { code:'1120', debit: 200000, credit: 0 },
            { code:'1130', debit: 35000,  credit: 0 },
            { code:'1131', debit: 80000,  credit: 0 },
            { code:'2110', debit: 0,      credit: 25000 },
            { code:'3100', debit: 0,      credit: 340000 },
        ];
        let jeNum2 = (await prisma.journalEntry.findFirst({ where: { companyId }, orderBy:{ entryNumber:'desc' } }))?.entryNumber || 0;
        const nonZero = obData.filter(b => accByCode[b.code]);

        for (const ob of nonZero) {
            await prisma.openingBalance.upsert({
                where: { accountId_financialYearId: { accountId: accByCode[ob.code].id, financialYearId: fy.id } },
                update: { debit: ob.debit, credit: ob.credit },
                create: { accountId: accByCode[ob.code].id, financialYearId: fy.id, debit: ob.debit, credit: ob.credit, companyId }
            });
        }

        // قيد الأرصدة الافتتاحية
        const existingOB = await prisma.journalEntry.findFirst({ where: { companyId, financialYearId: fy.id, referenceType: 'opening_balance' } });
        if (!existingOB) {
            jeNum2++;
            await prisma.journalEntry.create({
                data: {
                    entryNumber:     jeNum2,
                    date:            new Date(fy.startDate),
                    description:     'أرصدة افتتاحية',
                    referenceType:   'opening_balance',
                    referenceId:     fy.id,
                    financialYearId: fy.id,
                    companyId,
                    isPosted:        true,
                    lines: {
                        create: nonZero.map(ob => ({
                            accountId: accByCode[ob.code].id,
                            debit:     ob.debit,
                            credit:    ob.credit,
                            description: `رصيد افتتاحي — ${accByCode[ob.code].name}`
                        }))
                    }
                }
            });
        }
        console.log('✅ أرصدة افتتاحية أنشئت');
    }

    console.log('\n🎉 تمت إضافة جميع البيانات التجريبية بنجاح!');
}

main()
    .catch(e => { console.error('❌ خطأ:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
