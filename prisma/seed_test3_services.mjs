/**
 * 🔧  Seed Script — بيانات نشاط الخدمات (test3)
 * ================================================
 * يُحشو:
 *  1. السنة المالية والخزينة
 *  2. الأقسام والموظفين (5 موظفين)
 *  3. كتالوج الخدمات  (8 خدمات)
 *  4. الأصناف:  خدمات (بدون مخزن) + منتجات مادية (بمخزن)
 *  5. المورد والمخزن والعملاء
 *  6. عقود الخدمة
 *  7. أوامر العمل (مسندة للموظفين)
 *  8. فواتير الخدمات (مبيعات)
 *  9. فواتير المشتريات  (تُضاف للمخزن فقط للمنتجات)
 * 10. سندات قبض وصرف
 *
 * الاستخدام: node prisma/seed_test3_services.mjs
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ─── إعدادات ────────────────────────────────────────────────────────────────
const TARGET_USERNAME = 'test3';

// ─── مساعدات ─────────────────────────────────────────────────────────────────
const cuid  = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(10,0,0,0); return d; };
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
    // ── 0. تحقق من اليوزر ───────────────────────────────────────────────────
    // البحث عن اليوزر بغض النظر عن حالة الأحرف
    const allUsers = await prisma.user.findMany({ select: { id: true, username: true, name: true, companyId: true } });
    const user = allUsers.find(u => u.username.toLowerCase() === TARGET_USERNAME.toLowerCase());
    if (!user) {
        console.error(`❌  اليوزر "${TARGET_USERNAME}" غير موجود. تأكد من إنشائه أولاً.`);
        process.exit(1);
    }
    const companyId = user.companyId;
    if (!companyId) {
        console.error('❌  اليوزر ليس مرتبطاً بشركة.');
        process.exit(1);
    }
    console.log(`✅  اليوزر: ${user.name}  |  companyId: ${companyId}`);

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    console.log(`✅  الشركة: ${company.name}  |  businessType: ${company.businessType}`);

    // ── الفرع الرئيسي ──────────────────────────────────────────────────────
    let branch = await prisma.branch.findFirst({ where: { companyId }, orderBy: { createdAt: 'asc' } });
    if (!branch) {
        branch = await prisma.branch.create({
            data: { name: 'الفرع الرئيسي', companyId, isMain: true }
        });
        console.log('✅  تم إنشاء الفرع الرئيسي');
    }
    const branchId = branch.id;
    console.log(`✅  الفرع: ${branch.name}  |  branchId: ${branchId}`);

    // ── 1. السنة المالية ─────────────────────────────────────────────────────
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
        console.log('✅  السنة المالية أنشئت');
    } else {
        console.log('ℹ️   السنة المالية موجودة');
    }

    // ── 2. الخزينة ───────────────────────────────────────────────────────────
    let treasury = await prisma.treasury.findFirst({ where: { companyId } });
    if (!treasury) {
        treasury = await prisma.treasury.create({
            data: { name: 'الصندوق الرئيسي', type: 'cash', balance: 50000, companyId, branchId }
        });
        console.log('✅  الخزينة أنشئت');
    } else {
        console.log('ℹ️   الخزينة موجودة');
    }

    // ── 3. المخزن ────────────────────────────────────────────────────────────
    let warehouse = await prisma.warehouse.findFirst({ where: { companyId } });
    if (!warehouse) {
        warehouse = await prisma.warehouse.create({
            data: { name: 'مخزن قطع الغيار', code: 'WH-001', companyId, branchId }
        });
        console.log('✅  المخزن أنشئ');
    } else {
        console.log('ℹ️   المخزن موجود');
    }
    const warehouseId = warehouse.id;

    // ── 4. دليل الحسابات ──────────────────────────────────────────────────────
    const accExists = await prisma.account.findFirst({ where: { companyId } });
    let cashAccount, revenueAccount, suppliersAccount, inventoryAccount;
    if (!accExists) {
        console.log('➕  إنشاء دليل الحسابات ...');
        const accs = await prisma.account.createMany({
            data: [
                { code:'1110', name:'الصندوق',              nature:'debit',  type:'asset',    accountCategory:'detail', isParent:false, companyId },
                { code:'1130', name:'ذمم مدينة - عملاء',   nature:'debit',  type:'asset',    accountCategory:'detail', isParent:false, companyId },
                { code:'1131', name:'المخزون',              nature:'debit',  type:'asset',    accountCategory:'detail', isParent:false, companyId },
                { code:'2110', name:'ذمم دائنة - موردين',  nature:'credit', type:'liability',accountCategory:'detail', isParent:false, companyId },
                { code:'4100', name:'إيرادات الخدمات',     nature:'credit', type:'revenue',  accountCategory:'detail', isParent:false, companyId },
                { code:'5100', name:'تكلفة المشتريات',     nature:'debit',  type:'expense',  accountCategory:'detail', isParent:false, companyId },
                { code:'5210', name:'رواتب الموظفين',      nature:'debit',  type:'expense',  accountCategory:'detail', isParent:false, companyId },
            ],
            skipDuplicates: true
        });
        console.log('✅  دليل حسابات أنشئ');
    }

    // ── 5. الأقسام ───────────────────────────────────────────────────────────
    console.log('\n──── الأقسام ────');
    const deptNames = ['الفنيين والتركيب', 'خدمة العملاء', 'الصيانة الميدانية', 'المخازن والتوريد'];
    const departments = [];
    for (const name of deptNames) {
        let dept = await prisma.department.findFirst({ where: { companyId, name } });
        if (!dept) dept = await prisma.department.create({ data: { name, companyId } });
        departments.push(dept);
    }
    console.log(`✅  ${departments.length} قسم جاهز`);

    // ── 6. الموظفين ──────────────────────────────────────────────────────────
    console.log('\n──── الموظفين ────');
    const employeesData = [
        { code:'EMP-001', name:'أحمد السيد محمد',    position:'فني تركيب أجهزة',    basicSalary:5000, dept: 0 },
        { code:'EMP-002', name:'محمود عبد الرحمن',   position:'مهندس صيانة',         basicSalary:7000, dept: 2 },
        { code:'EMP-003', name:'سارة علي حسن',       position:'مسؤولة خدمة عملاء',  basicSalary:4500, dept: 1 },
        { code:'EMP-004', name:'طارق محمد إبراهيم',  position:'فني صيانة ميدانية',  basicSalary:5500, dept: 2 },
        { code:'EMP-005', name:'نادية حسين علي',     position:'مسؤولة مخازن',       basicSalary:4000, dept: 3 },
    ];
    const employees = [];
    for (const e of employeesData) {
        let emp = await prisma.employee.findFirst({ where: { companyId, code: e.code } });
        if (!emp) {
            emp = await prisma.employee.create({
                data: {
                    code: e.code,
                    name: e.name,
                    position: e.position,
                    basicSalary: e.basicSalary,
                    transportAllowance: 500,
                    hireDate: daysAgo(rand(180, 730)),
                    departmentId: departments[e.dept]?.id,
                    companyId,
                    branchId,
                    status: 'active',
                }
            });
            console.log(`  ✅  ${emp.name}`);
        } else {
            console.log(`  ℹ️   ${emp.name} (موجود)`);
        }
        employees.push(emp);
    }

    // ── 7. العملاء ───────────────────────────────────────────────────────────
    console.log('\n──── العملاء ────');
    const customersData = [
        { name:'شركة النيل للمقاولات',     phone:'0100-111-2233', balance: 0 },
        { name:'مصنع الشرق للصناعات',      phone:'0101-222-3344', balance: 0 },
        { name:'فندق سيتي ستارز',          phone:'0102-333-4455', balance: 0 },
        { name:'مستشفى المواساة الطبية',   phone:'0103-444-5566', balance: 0 },
        { name:'مدارس المستقبل الدولية',   phone:'0104-555-6677', balance: 0 },
    ];
    const customers = [];
    for (const c of customersData) {
        let cust = await prisma.customer.findFirst({ where: { companyId, name: c.name } });
        if (!cust) {
            cust = await prisma.customer.create({ data: { ...c, companyId } });
            console.log(`  ✅  ${cust.name}`);
        } else {
            console.log(`  ℹ️   ${cust.name} (موجود)`);
        }
        customers.push(cust);
    }

    // ── 8. المورد ───────────────────────────────────────────────────────────
    console.log('\n──── الموردين ────');
    const suppliersData = [
        { name:'شركة أجهزة الخليج',        phone:'0111-100-2000', balance: 0 },
        { name:'مصنع قطع الغيار العربي',   phone:'0112-200-3000', balance: 0 },
        { name:'مستودع مواد التركيب',       phone:'0113-300-4000', balance: 0 },
    ];
    const suppliers = [];
    for (const s of suppliersData) {
        let sup = await prisma.supplier.findFirst({ where: { companyId, name: s.name } });
        if (!sup) {
            sup = await prisma.supplier.create({ data: { ...s, companyId } });
            console.log(`  ✅  ${sup.name}`);
        } else {
            console.log(`  ℹ️   ${sup.name} (موجود)`);
        }
        suppliers.push(sup);
    }

    // ── 9. الوحدات ──────────────────────────────────────────────────────────
    let unit = await prisma.unit.findFirst({ where: { companyId } });
    if (!unit) {
        unit = await prisma.unit.create({ data: { name: 'قطعة', companyId } });
    }

    // ── 10. الفئات ──────────────────────────────────────────────────────────
    console.log('\n──── الفئات ────');
    let catService = await prisma.category.findFirst({ where: { companyId, name: 'خدمات وصيانة' } });
    if (!catService) catService = await prisma.category.create({ data: { name: 'خدمات وصيانة', companyId } });

    let catParts = await prisma.category.findFirst({ where: { companyId, name: 'قطع الغيار' } });
    if (!catParts) catParts = await prisma.category.create({ data: { name: 'قطع الغيار', companyId } });

    console.log('✅  الفئات جاهزة');

    // ── 11. كتالوج الخدمات ──────────────────────────────────────────────────
    console.log('\n──── كتالوج الخدمات ────');
    const catalogData = [
        { code:'CAT-001', name:'صيانة أجهزة التكييف',             description:'صيانة وإصلاح جميع أنواع وحدات التكييف' },
        { code:'CAT-002', name:'تركيب شبكات الكاميرات',           description:'تصميم وتركيب كاميرات المراقبة' },
        { code:'CAT-003', name:'صيانة أجهزة الكمبيوتر',          description:'إصلاح وصيانة الحاسبات الشخصية والشبكات' },
        { code:'CAT-004', name:'خدمات التنظيف الصناعي',          description:'تنظيف المصانع والمنشآت الصناعية' },
        { code:'CAT-005', name:'صيانة المولدات الكهربائية',       description:'فحص وصيانة مولدات الطاقة' },
        { code:'CAT-006', name:'تركيب الأنظمة الأمنية',          description:'تركيب أجهزة الإنذار وأنظمة التحكم' },
        { code:'CAT-007', name:'صيانة شبكات الصرف الصحي',        description:'فحص وصيانة وإصلاح شبكات الصرف' },
        { code:'CAT-008', name:'خدمات الاتصالات وأبراج البث',   description:'صيانة وتشغيل أبراج الاتصالات' },
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

    // ── 12. الأصناف: خدمات (type=service) + منتجات مادية (type=product) ────
    console.log('\n──── الأصناف ────');

    // خدمات (بدون مخزن)
    const serviceItemsData = [
        { code:'SRV-001', name:'خدمة صيانة تكييف سنوية',     sellPrice:1500, costPrice:400  },
        { code:'SRV-002', name:'تركيب كاميرا مراقبة',        sellPrice:800,  costPrice:200  },
        { code:'SRV-003', name:'صيانة شبكة كمبيوتر',         sellPrice:600,  costPrice:150  },
        { code:'SRV-004', name:'تنظيف صناعي شهري',           sellPrice:2500, costPrice:800  },
        { code:'SRV-005', name:'فحص وصيانة مولد كهربائي',    sellPrice:1200, costPrice:350  },
    ];
    const serviceItems = [];
    for (const si of serviceItemsData) {
        let item = await prisma.item.findFirst({ where: { companyId, code: si.code } });
        if (!item) {
            item = await prisma.item.create({
                data: {
                    ...si,
                    type: 'service',
                    categoryId: catService.id,
                    averageCost: si.costPrice,
                    companyId,
                    status: 'active',
                }
            });
            console.log(`  ✅  [خدمة]  ${item.name}`);
        } else {
            console.log(`  ℹ️   [خدمة]  ${item.name} (موجود)`);
        }
        serviceItems.push(item);
    }

    // منتجات مادية (بمخزن)
    const productItemsData = [
        { code:'PRD-001', name:'مبرد فريون R410',          sellPrice:150, costPrice:90,  qty:50  },
        { code:'PRD-002', name:'كابل شبكة CAT6 (متر)',     sellPrice:8,   costPrice:4,   qty:500 },
        { code:'PRD-003', name:'لمبة LED توفير 18W',        sellPrice:25,  costPrice:12,  qty:200 },
        { code:'PRD-004', name:'قاطع كهربائي 32A',         sellPrice:80,  costPrice:45,  qty:80  },
        { code:'PRD-005', name:'مرشح هواء تكييف',          sellPrice:60,  costPrice:30,  qty:120 },
    ];
    const productItems = [];
    for (const pi of productItemsData) {
        let item = await prisma.item.findFirst({ where: { companyId, code: pi.code } });
        if (!item) {
            item = await prisma.item.create({
                data: {
                    code: pi.code,
                    name: pi.name,
                    sellPrice: pi.sellPrice,
                    costPrice: pi.costPrice,
                    averageCost: pi.costPrice,
                    type: 'product',
                    categoryId: catParts.id,
                    unitId: unit.id,
                    companyId,
                    status: 'active',
                }
            });
            // أضف مخزون ابتدائي
            await prisma.stock.upsert({
                where: { itemId_warehouseId: { itemId: item.id, warehouseId } },
                update: { quantity: { increment: pi.qty } },
                create: { itemId: item.id, warehouseId, quantity: pi.qty },
            });
            console.log(`  ✅  [منتج]  ${item.name}  (مخزون: ${pi.qty})`);
        } else {
            console.log(`  ℹ️   [منتج]  ${item.name} (موجود)`);
        }
        productItems.push(item);
    }

    // ── 13. عقود الخدمة ─────────────────────────────────────────────────────
    console.log('\n──── عقود الخدمة ────');
    const contractsData = [
        { customerId: customers[0].id, type:'maintenance',  startDate: daysAgo(60), contractValue: 12000, status:'active',   billing:'monthly' },
        { customerId: customers[1].id, type:'support',      startDate: daysAgo(90), contractValue: 24000, status:'active',   billing:'quarterly' },
        { customerId: customers[2].id, type:'installation', startDate: daysAgo(30), contractValue: 8000,  status:'active',   billing:'monthly' },
        { customerId: customers[3].id, type:'maintenance',  startDate: daysAgo(120),contractValue: 18000, status:'completed',billing:'monthly' },
    ];
    const contracts = [];
    let contractNum = (await prisma.serviceContract.count({ where: { companyId } })) + 1;
    for (const cd of contractsData) {
        const existing = await prisma.serviceContract.findFirst({
            where: { companyId, customerId: cd.customerId, type: cd.type }
        });
        if (!existing) {
            const contract = await prisma.serviceContract.create({
                data: {
                    contractNumber: contractNum++,
                    type: cd.type,
                    startDate: cd.startDate,
                    endDate: new Date(cd.startDate.getTime() + 365*24*60*60*1000),
                    contractValue: cd.contractValue,
                    billingCycle: cd.billing,
                    status: cd.status,
                    autoRenew: cd.status === 'active',
                    customerId: cd.customerId,
                    companyId,
                    branchId,
                }
            });
            contracts.push(contract);
            const cust = customers.find(c => c.id === cd.customerId);
            console.log(`  ✅  عقد ${cd.type} - ${cust?.name}`);
        } else {
            contracts.push(existing);
            console.log(`  ℹ️   عقد موجود للعميل`);
        }
    }

    // ── 14. أوامر العمل (مسندة للموظفين) ───────────────────────────────────
    console.log('\n──── أوامر العمل ────');
    const workOrdersData = [
        { customerId: customers[0].id, contractId: contracts[0]?.id, assignedTo: employees[0].id, type:'maintenance',  priority:'high',   status:'completed', desc:'صيانة دورية لأجهزة التكييف بالمقر الرئيسي', scheduledDate: daysAgo(20) },
        { customerId: customers[1].id, contractId: contracts[1]?.id, assignedTo: employees[1].id, type:'installation', priority:'normal', status:'completed', desc:'تركيب منظومة كاميرات مراقبة في المصنع', scheduledDate: daysAgo(15) },
        { customerId: customers[2].id, contractId: contracts[2]?.id, assignedTo: employees[3].id, type:'maintenance',  priority:'urgent', status:'in_progress',desc:'إصلاح عطل في نظام الإنذار الحريق', scheduledDate: daysAgo(5) },
        { customerId: customers[3].id, contractId: contracts[3]?.id, assignedTo: employees[0].id, type:'repair',       priority:'high',   status:'completed', desc:'إصلاح مولدات كهربائية طارئة', scheduledDate: daysAgo(30) },
        { customerId: customers[4].id, contractId: null,             assignedTo: employees[1].id, type:'support',      priority:'normal', status:'new',       desc:'زيارة فحص وتقديم عرض أسعار شبكة الكمبيوتر', scheduledDate: daysAgo(2) },
        { customerId: customers[0].id, contractId: contracts[0]?.id, assignedTo: employees[3].id, type:'maintenance',  priority:'normal', status:'completed', desc:'استبدال مرشحات هواء أجهزة التكييف', scheduledDate: daysAgo(45) },
    ];
    const workOrders = [];
    let woNum = (await prisma.workOrder.count({ where: { companyId } })) + 1;
    for (const wo of workOrdersData) {
        const existing = await prisma.workOrder.findFirst({
            where: { companyId, description: wo.desc }
        });
        if (!existing) {
            const workOrder = await prisma.workOrder.create({
                data: {
                    orderNumber: woNum++,
                    customerId: wo.customerId,
                    contractId: wo.contractId || null,
                    assignedTo: wo.assignedTo,
                    type: wo.type,
                    priority: wo.priority,
                    status: wo.status,
                    description: wo.desc,
                    scheduledDate: wo.scheduledDate,
                    startedAt: wo.status !== 'new' ? new Date(wo.scheduledDate.getTime() + 2*60*60*1000) : null,
                    completedAt: wo.status === 'completed' ? new Date(wo.scheduledDate.getTime() + 6*60*60*1000) : null,
                    companyId,
                    branchId,
                }
            });
            workOrders.push(workOrder);

            // أضف مواد لأوامر العمل المكتملة
            if (wo.status === 'completed' && productItems.length > 0) {
                const matItem = productItems[rand(0, productItems.length - 1)];
                await prisma.workOrderMaterial.create({
                    data: {
                        workOrderId: workOrder.id,
                        itemId: matItem.id,
                        quantity: rand(1, 3),
                        unitPrice: matItem.sellPrice,
                        total: matItem.sellPrice * rand(1, 3),
                        unit: 'قطعة',
                    }
                }).catch(() => {}); // ignore if item not found
            }

            const emp = employees.find(e => e.id === wo.assignedTo);
            console.log(`  ✅  أمر عمل #${workOrder.orderNumber}  (${wo.status})  ← ${emp?.name}`);
        } else {
            workOrders.push(existing);
            console.log(`  ℹ️   أمر عمل موجود`);
        }
    }

    // ── 15. فواتير الخدمات (مبيعات) ─────────────────────────────────────────
    console.log('\n──── فواتير الخدمات (مبيعات) ────');
    let lastSaleInv = await prisma.invoice.findFirst({
        where: { companyId, type: 'sale' },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
    });
    let saleNum = (lastSaleInv?.invoiceNumber || 0) + 1;

    const salesInvoicesData = [
        // خدمات فقط (بدون مخزن)
        {
            customerId: customers[0].id,
            contractId: contracts[0]?.id,
            workOrderId: workOrders[0]?.id,
            date: daysAgo(18),
            lines: [
                { item: serviceItems[0], qty: 1, price: 1500 },  // صيانة تكييف
                { item: serviceItems[4], qty: 1, price: 1200 },  // فحص مولد
            ]
        },
        // خدمات + منتجات مادية
        {
            customerId: customers[1].id,
            contractId: contracts[1]?.id,
            workOrderId: workOrders[1]?.id,
            date: daysAgo(13),
            lines: [
                { item: serviceItems[1], qty: 4, price: 800  },  // تركيب كاميرا × 4
                { item: productItems[1], qty: 20, price: 8   },  // كابل شبكة × 20م
                { item: productItems[0], qty: 2,  price: 150 },  // مبرد فريون × 2
            ]
        },
        // خدمة فقط
        {
            customerId: customers[2].id,
            contractId: contracts[2]?.id,
            workOrderId: null,
            date: daysAgo(10),
            lines: [
                { item: serviceItems[2], qty: 1, price: 600 },   // صيانة شبكة كمبيوتر
            ]
        },
        // منتجات + خدمات مختلطة
        {
            customerId: customers[3].id,
            contractId: contracts[3]?.id,
            workOrderId: workOrders[3]?.id,
            date: daysAgo(7),
            lines: [
                { item: serviceItems[4], qty: 2, price: 1200 },  // فحص مولد × 2
                { item: productItems[3], qty: 3, price: 80   },  // قاطع كهربائي × 3
                { item: productItems[2], qty: 10, price: 25  },  // لمبة LED × 10
            ]
        },
        // فاتورة كبيرة
        {
            customerId: customers[4].id,
            contractId: null,
            workOrderId: null,
            date: daysAgo(4),
            lines: [
                { item: serviceItems[3], qty: 1, price: 2500 },  // تنظيف صناعي
                { item: serviceItems[0], qty: 3, price: 1500 },  // صيانة تكييف × 3
                { item: productItems[4], qty: 6, price: 60   },  // مرشح هواء × 6
            ]
        },
    ];

    for (const si of salesInvoicesData) {
        const subtotal = si.lines.reduce((s, l) => s + l.qty * l.price, 0);
        const paidAmount = Math.round(subtotal * 0.7);
        const remaining = subtotal - paidAmount;

        // تحقق أن المخزون يكفي للمنتجات
        for (const line of si.lines) {
            if (line.item.type === 'product') {
                const stock = await prisma.stock.findFirst({
                    where: { itemId: line.item.id, warehouseId }
                });
                if ((stock?.quantity || 0) < line.qty) {
                    // زود المخزون
                    await prisma.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.item.id, warehouseId } },
                        update: { quantity: { increment: line.qty * 2 } },
                        create: { itemId: line.item.id, warehouseId, quantity: line.qty * 2 },
                    });
                }
            }
        }

        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: saleNum++,
                    type: 'sale',
                    date: si.date,
                    customerId: si.customerId,
                    serviceContractId: si.contractId || null,
                    workOrderId: si.workOrderId || null,
                    subtotal,
                    discount: 0,
                    total: subtotal,
                    paidAmount,
                    remaining,
                    paymentMethod: 'cash',
                    warehouseId,
                    companyId,
                    branchId,
                    lines: {
                        create: si.lines.map(l => ({
                            itemId: l.item.id,
                            quantity: l.qty,
                            price: l.price,
                            discount: 0,
                            total: l.qty * l.price,
                        }))
                    }
                }
            });

            // خصم مخزون فقط للمنتجات
            for (const line of si.lines) {
                if (line.item.type === 'product') {
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.item.id, warehouseId } },
                        update: { quantity: { decrement: line.qty } },
                        create: { itemId: line.item.id, warehouseId, quantity: -line.qty },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: 'out',
                            date: si.date,
                            itemId: line.item.id,
                            warehouseId,
                            quantity: line.qty,
                            reference: `SRV-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            notes: `فاتورة خدمات رقم ${invoice.invoiceNumber}`,
                            companyId,
                            invoiceId: invoice.id,
                        }
                    });
                }
            }

            // تحديث رصيد العميل
            if (remaining > 0) {
                await tx.customer.update({
                    where: { id: si.customerId },
                    data: { balance: { increment: remaining } }
                });
            }

            // تحديث الخزينة بالمبلغ المدفوع
            if (paidAmount > 0) {
                await tx.treasury.update({
                    where: { id: treasury.id },
                    data: { balance: { increment: paidAmount } }
                });
            }

            console.log(`  ✅  فاتورة خدمات #${invoice.invoiceNumber}  |  إجمالي: ${subtotal.toLocaleString()} ج`);
        });
    }

    // ── 16. فواتير المشتريات (منتجات + خدمات مختلطة) ───────────────────────
    console.log('\n──── فواتير المشتريات ────');
    let lastPurInv = await prisma.invoice.findFirst({
        where: { companyId, type: 'purchase' },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true }
    });
    let purNum = (lastPurInv?.invoiceNumber || 0) + 1;

    const purchasesData = [
        // مشتريات منتجات مادية فقط (تضاف للمخزن)
        {
            supplierId: suppliers[0].id,
            date: daysAgo(50),
            lines: [
                { item: productItems[0], qty: 30, price: 90  },  // مبرد فريون
                { item: productItems[2], qty: 100, price: 12 },  // لمبة LED
            ]
        },
        // مشتريات مختلطة — منتجات + خدمة استشارية (لا تؤثر على مخزن)
        {
            supplierId: suppliers[1].id,
            date: daysAgo(35),
            lines: [
                { item: productItems[1], qty: 200, price: 4  },  // كابل شبكة
                { item: productItems[3], qty: 40,  price: 45 },  // قاطع كهربائي
                { item: serviceItems[2], qty: 1,   price: 600},  // خدمة صيانة شبكة (شراء استشارة)
            ]
        },
        // مشتريات منتجات مادية
        {
            supplierId: suppliers[2].id,
            date: daysAgo(20),
            lines: [
                { item: productItems[4], qty: 60, price: 30 },   // مرشح هواء
            ]
        },
        // مشتريات مختلطة
        {
            supplierId: suppliers[0].id,
            date: daysAgo(8),
            lines: [
                { item: productItems[0], qty: 15, price: 95  },  // مبرد فريون
                { item: productItems[4], qty: 30, price: 32  },  // مرشح هواء
                { item: serviceItems[4], qty: 1,  price: 800 },  // خدمة فحص مولدات (شراء)
            ]
        },
    ];

    for (const pur of purchasesData) {
        const subtotal = pur.lines.reduce((s, l) => s + l.qty * l.price, 0);
        const paidAmount = Math.round(subtotal * 0.5);
        const remaining = subtotal - paidAmount;

        await prisma.$transaction(async (tx) => {
            const invoice = await tx.invoice.create({
                data: {
                    invoiceNumber: purNum++,
                    type: 'purchase',
                    date: pur.date,
                    supplierId: pur.supplierId,
                    subtotal,
                    discount: 0,
                    total: subtotal,
                    paidAmount,
                    remaining,
                    paymentMethod: paidAmount > 0 ? 'cash' : 'credit',
                    warehouseId,
                    companyId,
                    branchId,
                    lines: {
                        create: pur.lines.map(l => ({
                            itemId: l.item.id,
                            quantity: l.qty,
                            price: l.price,
                            discount: 0,
                            total: l.qty * l.price,
                        }))
                    }
                }
            });

            // أضف للمخزن فقط المنتجات المادية
            for (const line of pur.lines) {
                if (line.item.type === 'product') {
                    await tx.stock.upsert({
                        where: { itemId_warehouseId: { itemId: line.item.id, warehouseId } },
                        update: { quantity: { increment: line.qty } },
                        create: { itemId: line.item.id, warehouseId, quantity: line.qty },
                    });
                    await tx.stockMovement.create({
                        data: {
                            type: 'in',
                            date: pur.date,
                            itemId: line.item.id,
                            warehouseId,
                            quantity: line.qty,
                            reference: `PUR-${String(invoice.invoiceNumber).padStart(5, '0')}`,
                            notes: `فاتورة مشتريات رقم ${invoice.invoiceNumber}`,
                            companyId,
                            invoiceId: invoice.id,
                        }
                    });
                }
                // الخدمات: لا مخزن، لكن نحدّث سعر التكلفة
                else {
                    await tx.item.update({
                        where: { id: line.item.id },
                        data: { costPrice: line.price }
                    });
                }
            }

            // تحديث رصيد المورد
            if (remaining > 0) {
                await tx.supplier.update({
                    where: { id: pur.supplierId },
                    data: { balance: { increment: remaining } }
                });
            }

            // تحديث الخزينة
            if (paidAmount > 0) {
                await tx.treasury.update({
                    where: { id: treasury.id },
                    data: { balance: { decrement: paidAmount } }
                });
            }

            const productLinesCount = pur.lines.filter(l => l.item.type === 'product').length;
            const serviceLinesCount = pur.lines.filter(l => l.item.type === 'service').length;
            console.log(`  ✅  فاتورة مشتريات #${invoice.invoiceNumber}  |  إجمالي: ${subtotal.toLocaleString()} ج  [${productLinesCount} منتج + ${serviceLinesCount} خدمة]`);
        });
    }

    // ── 17. ملخص نهائي ──────────────────────────────────────────────────────
    console.log('\n════════════════════════════════════════════');
    console.log('🎉  تم إضافة جميع البيانات بنجاح!');
    console.log('════════════════════════════════════════════');
    console.log(`👤  اليوزر: ${user.name} (${TARGET_USERNAME})`);
    console.log(`🏢  الشركة: ${company.name}`);
    console.log(`👥  الموظفين: ${employees.length}`);
    console.log(`🔧  كتالوج الخدمات: ${catalogData.length} بند`);
    console.log(`📦  الأصناف: ${serviceItemsData.length} خدمة + ${productItemsData.length} منتج`);
    console.log(`🤝  العملاء: ${customers.length}`);
    console.log(`🚚  الموردين: ${suppliers.length}`);
    console.log(`📋  عقود الخدمة: ${contracts.length}`);
    console.log(`🔨  أوامر العمل: ${workOrders.length}`);
    console.log(`🧾  فواتير الخدمات: ${salesInvoicesData.length}`);
    console.log(`🛒  فواتير المشتريات: ${purchasesData.length}`);
}

main()
    .catch(e => { console.error('❌ خطأ:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
