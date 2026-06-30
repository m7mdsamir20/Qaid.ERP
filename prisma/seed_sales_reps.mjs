import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting Sales Representative Demo Data Seeding...');

    // 1. Get the first company
    const company = await prisma.company.findFirst();
    if (!company) {
        console.error('❌ No Company found. Please seed a company first.');
        return;
    }
    const companyId = company.id;
    console.log(`✅ Using Company: ${company.name} (${companyId})`);

    // Get first branch if any
    const branch = await prisma.branch.findFirst({ where: { companyId } });
    const branchId = branch?.id || null;

    // 2. Fetch some existing customers to link collections to
    const customers = await prisma.customer.findMany({ where: { companyId }, take: 5 });
    if (customers.length === 0) {
        console.error('❌ No Customers found. Please create some customers first.');
        return;
    }
    console.log(`✅ Found ${customers.length} customers to link collections.`);

    // 3. Create Sales Representatives
    const repData = [
        { name: 'أحمد ممدوح', code: 'REP-01', phone: '01011112222', commissionRate: 5.0, commissionType: 'invoice_total' },
        { name: 'سارة القاضي', code: 'REP-02', phone: '01022223333', commissionRate: 7.0, commissionType: 'collected_amount' },
        { name: 'محمد حسن', code: 'REP-03', phone: '01033334444', commissionRate: 4.5, commissionType: 'invoice_total' }
    ];

    const reps = [];
    for (const r of repData) {
        const rep = await prisma.salesRepresentative.upsert({
            where: { code_companyId: { code: r.code, companyId } },
            update: {
                commissionRate: r.commissionRate,
                commissionType: r.commissionType,
                phone: r.phone
            },
            create: {
                name: r.name,
                code: r.code,
                phone: r.phone,
                commissionRate: r.commissionRate,
                commissionType: r.commissionType,
                companyId
            }
        });
        reps.push(rep);
        console.log(`👤 Seeded Representative: ${rep.name}`);
    }

    // 4. Create Sales Targets for current, past, and next month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const months = [
        currentMonth - 1 === 0 ? 12 : currentMonth - 1, // Past Month
        currentMonth, // Current Month
        currentMonth + 1 === 13 ? 1 : currentMonth + 1 // Next Month
    ];
    const targetAmounts = [15000, 20000, 25000, 30000];

    for (const rep of reps) {
        for (const m of months) {
            const y = (m === 12 && currentMonth === 1) ? currentYear - 1 : (m === 1 && currentMonth === 12) ? currentYear + 1 : currentYear;
            const targetAmount = targetAmounts[Math.floor(Math.random() * targetAmounts.length)];
            
            await prisma.salesTarget.upsert({
                where: {
                    salesRepId_year_month: {
                        salesRepId: rep.id,
                        year: y,
                        month: m
                    }
                },
                update: { targetAmount },
                create: {
                    salesRepId: rep.id,
                    year: y,
                    month: m,
                    targetAmount,
                    companyId
                }
            });
        }
        console.log(`🎯 Targets seeded for rep: ${rep.name}`);
    }

    // 5. Link some existing invoices to the reps to simulate actual sales
    const invoices = await prisma.invoice.findMany({
        where: { companyId, status: 'approved', type: 'sale' },
        take: 30
    });

    if (invoices.length > 0) {
        console.log(`🔄 Associating ${invoices.length} invoices to representatives...`);
        for (let i = 0; i < invoices.length; i++) {
            const rep = reps[i % reps.length];
            await prisma.invoice.update({
                where: { id: invoices[i].id },
                data: { salesRepresentativeId: rep.id }
            });
        }
        console.log('✅ Invoices associated successfully.');
    } else {
        console.warn('⚠️ No invoices found to associate.');
    }

    // 6. Create Collections
    console.log('💰 Seeding Collections...');
    const collectionData = [
        // Ahmad Mamdouh collections
        {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
            amount: 1500,
            method: 'cash',
            status: 'deposited',
            salesRepId: reps[0].id,
            customerId: customers[0].id,
            notes: 'تحصيل كاش نقدي'
        },
        {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
            amount: 4500,
            method: 'transfer',
            status: 'deposited',
            salesRepId: reps[0].id,
            customerId: customers[1].id,
            notes: 'تحويل بنكي فودافون كاش'
        },
        // Sara Al Qadi collections
        {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2),
            amount: 3000,
            method: 'check',
            status: 'pending',
            salesRepId: reps[1].id,
            customerId: customers[2].id,
            checkNumber: '1002345',
            bankName: 'البنك الأهلي المصري',
            checkDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
            notes: 'شيك مؤجل للتحصيل'
        },
        {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
            amount: 5000,
            method: 'check',
            status: 'deposited',
            salesRepId: reps[1].id,
            customerId: customers[3].id,
            checkNumber: '1002346',
            bankName: 'بنك مصر',
            checkDueDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5),
            notes: 'شيك تم صرفه وإيداعه'
        },
        // Mohamed Hassan collections
        {
            date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4),
            amount: 2500,
            method: 'cash',
            status: 'deposited',
            salesRepId: reps[2].id,
            customerId: customers[4].id,
            notes: 'تحصيل نقدية'
        }
    ];

    // Link collections to some invoice if possible
    for (let idx = 0; idx < collectionData.length; idx++) {
        const col = collectionData[idx];
        const linkedInvoice = invoices.find(inv => inv.salesRepresentativeId === col.salesRepId);
        
        await prisma.collection.create({
            data: {
                date: col.date,
                amount: col.amount,
                method: col.method,
                status: col.status,
                salesRepId: col.salesRepId,
                customerId: col.customerId,
                invoiceId: linkedInvoice ? linkedInvoice.id : null,
                checkNumber: col.checkNumber || null,
                bankName: col.bankName || null,
                checkDueDate: col.checkDueDate || null,
                notes: col.notes,
                companyId,
                branchId
            }
        });
    }
    console.log('✅ Collections seeded successfully.');

    // 7. Create some Commission Payments
    console.log('🎖️ Seeding Commission Payments...');
    const pastMonth = currentMonth - 1 === 0 ? 12 : currentMonth - 1;
    const pastYear = pastMonth === 12 ? currentYear - 1 : currentYear;

    for (const rep of reps) {
        const sales = Math.floor(Math.random() * 15000) + 10000;
        const collected = Math.floor(sales * 0.8);
        const rate = rep.commissionRate;
        const amount = rep.commissionType === 'invoice_total' ? (sales * rate / 100) : (collected * rate / 100);

        await prisma.commissionPayment.upsert({
            where: {
                salesRepId_year_month: {
                    salesRepId: rep.id,
                    year: pastYear,
                    month: pastMonth
                }
            },
            update: {},
            create: {
                salesRepId: rep.id,
                year: pastYear,
                month: pastMonth,
                totalSales: sales,
                totalCollected: collected,
                commissionBase: rep.commissionType === 'invoice_total' ? sales : collected,
                commissionRate: rate,
                commissionAmount: amount,
                status: 'paid',
                notes: 'صرف عمولات الشهر الماضي',
                companyId
            }
        });
    }
    console.log('✅ Commission Payments seeded successfully.');
    console.log('🎉 Seeding Completed Successfully!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
