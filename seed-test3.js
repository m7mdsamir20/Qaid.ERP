const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cid = "cmr1qenbg0001cthbafhotvoo";

async function main() {
  console.log("Starting data seeding for TEST3...");

  // 1. Branch
  let branch = await prisma.branch.findFirst({ where: { companyId: cid } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'الفرع الرئيسي',
        companyId: cid
      }
    });
    console.log("Created main branch:", branch.name);
  } else {
    console.log("Branch exists:", branch.name);
  }

  // 2. Financial Year
  let fy = await prisma.financialYear.findFirst({ where: { companyId: cid, isOpen: true } });
  if (!fy) {
    fy = await prisma.financialYear.create({
      data: {
        name: '2026',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        isOpen: true,
        companyId: cid
      }
    });
    console.log("Created financial year:", fy.name);
  } else {
    console.log("Financial year exists:", fy.name);
  }

  // 3. Chart of accounts
  const accCount = await prisma.account.count({ where: { companyId: cid } });
  if (accCount === 0) {
    const accsData = [
      { code: '1000', name: 'الأصول', nature: 'debit', type: 'asset', accountCategory: 'parent', isParent: true },
      { code: '1100', name: 'أصول متداولة', nature: 'debit', type: 'asset', accountCategory: 'parent', isParent: true },
      { code: '1111', name: 'الصندوق الرئيسي', nature: 'debit', type: 'asset', accountCategory: 'detail', isParent: false },
      { code: '1120', name: 'البنك', nature: 'debit', type: 'asset', accountCategory: 'detail', isParent: false },
      { code: '1121', name: 'ذمم مدينة - عملاء', nature: 'debit', type: 'asset', accountCategory: 'detail', isParent: false },
      { code: '1210', name: 'المخزون', nature: 'debit', type: 'asset', accountCategory: 'detail', isParent: false },
      { code: '2000', name: 'الخصوم', nature: 'credit', type: 'liability', accountCategory: 'parent', isParent: true },
      { code: '2100', name: 'خصوم متداولة', nature: 'credit', type: 'liability', accountCategory: 'parent', isParent: true },
      { code: '2110', name: 'ذمم دائنة - موردين', nature: 'credit', type: 'liability', accountCategory: 'detail', isParent: false },
      { code: '2114', name: 'ضريبة القيمة المضافة المحصلة', nature: 'credit', type: 'liability', accountCategory: 'detail', isParent: false },
      { code: '3000', name: 'حقوق الملكية', nature: 'credit', type: 'equity', accountCategory: 'parent', isParent: true },
      { code: '3100', name: 'رأس المال', nature: 'credit', type: 'equity', accountCategory: 'detail', isParent: false },
      { code: '4000', name: 'الإيرادات', nature: 'credit', type: 'revenue', accountCategory: 'parent', isParent: true },
      { code: '4100', name: 'إيرادات المبيعات', nature: 'credit', type: 'revenue', accountCategory: 'detail', isParent: false },
      { code: '4200', name: 'إيرادات الخدمات', nature: 'credit', type: 'revenue', accountCategory: 'detail', isParent: false },
      { code: '5000', name: 'المصروفات', nature: 'debit', type: 'expense', accountCategory: 'parent', isParent: true },
      { code: '5100', name: 'تكلفة الخدمات والمواد', nature: 'debit', type: 'expense', accountCategory: 'detail', isParent: false },
    ];
    for (const data of accsData) {
      await prisma.account.create({ data: { ...data, companyId: cid } });
    }
    console.log("Seeded chart of accounts.");
  }

  // Fetch accounts to link
  const allAccounts = await prisma.account.findMany({ where: { companyId: cid } });
  const cashAcc = allAccounts.find(a => a.code === '1111') || allAccounts[0];

  // 4. Warehouse & Treasury
  let warehouse = await prisma.warehouse.findFirst({ where: { companyId: cid } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        name: 'المستودع الرئيسي للقطع',
        code: 'WH01',
        companyId: cid,
        branchId: branch.id
      }
    });
    console.log("Created warehouse:", warehouse.name);
  }

  let treasury = await prisma.treasury.findFirst({ where: { companyId: cid } });
  if (!treasury) {
    treasury = await prisma.treasury.create({
      data: {
        name: 'الخزينة الرئيسية',
        type: 'cash',
        balance: 100000,
        accountId: cashAcc.id,
        companyId: cid,
        branchId: branch.id
      }
    });
    console.log("Created treasury:", treasury.name);
  }

  // 5. Items (Materials & Services)
  let itemsList = await prisma.item.findMany({ where: { companyId: cid } });
  if (itemsList.length === 0) {
    const itemsData = [
      { name: 'فلتر مياه 7 مراحل أمريكي', code: 'FL7-US', type: 'product', sellPrice: 1200, costPrice: 800, averageCost: 800 },
      { name: 'شمعة فلتر مياه قطن 5 ميكرون', code: 'FIL-CT', type: 'product', sellPrice: 150, costPrice: 80, averageCost: 80 },
      { name: 'تركيب فلتر مياه منزلي', code: 'SRV-INS', type: 'service', sellPrice: 200, costPrice: 0, averageCost: 0 },
      { name: 'صيانة فلتر مياه دورية شمعات', code: 'SRV-MNT', type: 'service', sellPrice: 100, costPrice: 0, averageCost: 0 },
    ];
    for (const item of itemsData) {
      const created = await prisma.item.create({ data: { ...item, companyId: cid } });
      itemsList.push(created);
    }
    console.log("Seeded items:", itemsList.map(i => i.name));
  }

  const f7 = itemsList.find(i => i.code === 'FL7-US') || itemsList[0];
  const fc = itemsList.find(i => i.code === 'FIL-CT') || itemsList[1];
  const sIns = itemsList.find(i => i.code === 'SRV-INS') || itemsList[2];
  const sMnt = itemsList.find(i => i.code === 'SRV-MNT') || itemsList[3];

  // 6. Customers
  let customersList = await prisma.customer.findMany({ where: { companyId: cid } });
  if (customersList.length === 0) {
    const custsData = [
      { name: 'شركة الصفا والمروة المحدودة', email: 'safamwa@example.com', phone: '01011223344', balance: 0 },
      { name: 'شركة الأمل للمقاولات والتطوير', email: 'alamal@example.com', phone: '01299887766', balance: 0 },
      { name: 'مستشفى الشفاء التخصصي', email: 'shifaa@example.com', phone: '01122334455', balance: 0 },
    ];
    for (const cust of custsData) {
      const created = await prisma.customer.create({ data: { ...cust, companyId: cid } });
      customersList.push(created);
    }
    console.log("Seeded customers:", customersList.map(c => c.name));
  }

  const c1 = customersList[0];
  const c2 = customersList[1];
  const c3 = customersList[2];

  // 7. Employees
  let employeesList = await prisma.employee.findMany({ where: { companyId: cid } });
  if (employeesList.length === 0) {
    const empsData = [
      { name: 'المهندس أحمد علي', position: 'مهندس صيانة فلاتر', email: 'ahmed@company.com', phone: '01000998877' },
      { name: 'الفني محمد حسن', position: 'فني تركيبات وتمديد', email: 'mohamed@company.com', phone: '01000112233' },
    ];
    for (const emp of empsData) {
      const created = await prisma.employee.create({ data: { ...emp, companyId: cid } });
      employeesList.push(created);
    }
    console.log("Seeded employees:", employeesList.map(e => e.name));
  }

  const emp1 = employeesList[0];
  const emp2 = employeesList[1];

  // 8. Service Contracts
  let contractsList = await prisma.serviceContract.findMany({ where: { companyId: cid } });
  if (contractsList.length === 0) {
    const contractsData = [
      { contractNumber: 1, customerId: c1.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), contractValue: 2400, billingCycle: 'monthly', status: 'active', description: 'عقد صيانة فلاتر دوري 6 زيارات سنوية' },
      { contractNumber: 2, customerId: c3.id, startDate: new Date('2026-02-01'), endDate: new Date('2027-02-01'), contractValue: 4800, billingCycle: 'monthly', status: 'active', description: 'عقد صيانة فلاتر محطة المياه المركزية' },
    ];
    for (const contract of contractsData) {
      const created = await prisma.serviceContract.create({ data: { ...contract, companyId: cid } });
      contractsList.push(created);
    }
    console.log("Seeded contracts.");
  }

  const contract1 = contractsList[0];

  // 9. Work Orders
  let woList = await prisma.workOrder.findMany({ where: { companyId: cid } });
  if (woList.length === 0) {
    // Work Order 1: New
    const wo1 = await prisma.workOrder.create({
      data: {
        orderNumber: 1,
        customerId: c2.id,
        assignedTo: emp2.id,
        type: 'installation',
        priority: 'high',
        scheduledDate: new Date(),
        status: 'assigned',
        description: 'تركيب فلتر مياه 7 مراحل جديد مع تمديدات المطبخ وتجربة المياه',
        companyId: cid,
        materials: {
          create: [
            { itemId: f7.id, quantity: 1, unitPrice: f7.sellPrice, total: f7.sellPrice, unit: 'قطع' }
          ]
        }
      }
    });

    // Work Order 2: In Progress
    const wo2 = await prisma.workOrder.create({
      data: {
        orderNumber: 2,
        customerId: c1.id,
        contractId: contract1.id,
        assignedTo: emp1.id,
        type: 'repair',
        priority: 'normal',
        scheduledDate: new Date(),
        startedAt: new Date(),
        status: 'in_progress',
        description: 'الفلتر ينقط مياه من الشمعة الثالثة - فحص وتغيير الجلدة أو الشمعة بالكامل',
        companyId: cid,
        materials: {
          create: [
            { itemId: fc.id, quantity: 2, unitPrice: fc.sellPrice, total: fc.sellPrice * 2, unit: 'قطع' }
          ]
        }
      }
    });

    // Work Order 3: Completed (Uninvoiced)
    const wo3 = await prisma.workOrder.create({
      data: {
        orderNumber: 3,
        customerId: c1.id,
        contractId: contract1.id,
        assignedTo: emp1.id,
        type: 'maintenance',
        priority: 'normal',
        scheduledDate: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'completed',
        description: 'الزيارة الدورية الثانية - تغيير الشمعات الثلاثة الأولى وتنظيف خزان الضغط',
        resolution: 'تم الحضور وتغيير شمعات الفلتر الثلاثة بالكامل وتطهير الخزان وقياس نسبة الأملاح (120 ppm)',
        companyId: cid,
        materials: {
          create: [
            { itemId: fc.id, quantity: 3, unitPrice: fc.sellPrice, total: fc.sellPrice * 3, unit: 'قطع' }
          ]
        }
      }
    });

    // Work Order 4: Invoiced (Finished fully)
    const wo4 = await prisma.workOrder.create({
      data: {
        orderNumber: 4,
        customerId: c3.id,
        assignedTo: emp1.id,
        type: 'repair',
        priority: 'urgent',
        scheduledDate: new Date(),
        startedAt: new Date(),
        completedAt: new Date(),
        status: 'invoiced',
        description: 'عطل في مضخة الفلتر المركزية وسخونة مستمرة',
        resolution: 'تم فحص الدينامو وتغيير المضخة التالفة وتجربة الضغط والاستقرار بنجاح',
        companyId: cid,
        materials: {
          create: [
            { itemId: f7.id, quantity: 1, unitPrice: f7.sellPrice, total: f7.sellPrice, unit: 'قطع' }
          ]
        }
      }
    });

    // 10. Generate Invoice for Work Order 4
    const invNumber = 1;
    const invTotal = f7.sellPrice + sMnt.sellPrice;
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNumber,
        type: 'sale',
        date: new Date(),
        customerId: c3.id,
        subtotal: invTotal,
        discount: 0,
        taxRate: 0,
        taxAmount: 0,
        total: invTotal,
        paidAmount: invTotal,
        remaining: 0,
        paymentMethod: 'cash',
        notes: 'فاتورة صيانة مضخة فلتر المستشفى بناء على أمر العمل رقم 4',
        companyId: cid,
        branchId: branch.id,
        status: 'approved',
        workOrderId: wo4.id,
        lines: {
          create: [
            { itemId: f7.id, quantity: 1, price: f7.sellPrice, total: f7.sellPrice, unit: 'قطع' },
            { itemId: sMnt.id, quantity: 1, price: sMnt.sellPrice, total: sMnt.sellPrice, unit: 'خدمة' },
          ]
        }
      }
    });

    console.log("Seeded work orders and related invoices.");
  }

  console.log("Seeding complete successfully for company", cid);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
