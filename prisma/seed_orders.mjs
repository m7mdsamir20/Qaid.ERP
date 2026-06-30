import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companies = await prisma.company.findMany();
    console.log(`Found ${companies.length} companies.`);

    for (const company of companies) {
        console.log(`Seeding orders for company: ${company.name} (ID: ${company.id})`);
        
        // Find warehouse
        const warehouse = await prisma.warehouse.findFirst({
            where: { companyId: company.id }
        });
        if (!warehouse) {
            console.log(`No warehouse found for company ${company.name}. Skipping.`);
            continue;
        }

        // Find items
        const items = await prisma.item.findMany({
            where: { companyId: company.id }
        });
        if (items.length === 0) {
            console.log(`No items found for company ${company.name}. Skipping.`);
            continue;
        }

        // Find customers
        const customers = await prisma.customer.findMany({
            where: { companyId: company.id }
        });

        // Find suppliers
        const suppliers = await prisma.supplier.findMany({
            where: { companyId: company.id }
        });

        // Find branch (optional)
        const branch = await prisma.branch.findFirst({
            where: { companyId: company.id }
        });
        const branchId = branch?.id || null;

        // Find sales reps
        const reps = await prisma.salesRepresentative.findMany({
            where: { companyId: company.id }
        });
        const salesRepId = reps.length > 0 ? reps[0].id : null;

        // 1. Seed 5 Sales Orders
        if (customers.length > 0) {
            // Delete existing sales orders first to avoid duplicates
            await prisma.salesOrder.deleteMany({
                where: { companyId: company.id }
            });
            console.log(`Deleted old Sales Orders.`);

            for (let i = 1; i <= 5; i++) {
                const customer = customers[(i - 1) % customers.length];
                const date = new Date();
                date.setDate(date.getDate() - i * 3);
                
                const orderItems = [
                    items[(i - 1) % items.length],
                    items[i % items.length]
                ].filter(Boolean);

                const lines = orderItems.map((item, idx) => {
                    const quantity = 2 + idx;
                    const price = item.sellPrice || 100;
                    return {
                        itemId: item.id,
                        quantity,
                        price,
                        discount: 0,
                        total: quantity * price,
                        unit: 'حبة'
                    };
                });

                const subtotal = lines.reduce((s, l) => s + l.total, 0);
                const discount = i % 2 === 0 ? 50 : 0;
                const afterDiscount = Math.max(0, subtotal - discount);
                const taxRate = 14;
                const taxAmount = afterDiscount * (taxRate / 100);
                const total = afterDiscount + taxAmount;

                await prisma.salesOrder.create({
                    data: {
                        orderNumber: i,
                        date,
                        customerId: customer.id,
                        warehouseId: warehouse.id,
                        salesRepId,
                        status: i === 5 ? 'draft' : 'approved',
                        subtotal,
                        discount,
                        taxRate,
                        taxAmount,
                        total,
                        companyId: company.id,
                        branchId,
                        notes: `طلب بيع تجريبي رقم ${i}`,
                        lines: {
                            create: lines
                        }
                    }
                });
            }
            console.log(`Created 5 Sales Orders.`);
        }

        // 2. Seed 5 Purchase Orders
        if (suppliers.length > 0) {
            await prisma.purchaseOrder.deleteMany({
                where: { companyId: company.id }
            });
            console.log(`Deleted old Purchase Orders.`);

            for (let i = 1; i <= 5; i++) {
                const supplier = suppliers[(i - 1) % suppliers.length];
                const date = new Date();
                date.setDate(date.getDate() - i * 4);

                const orderItems = [
                    items[(i - 1) % items.length],
                    items[i % items.length]
                ].filter(Boolean);

                const lines = orderItems.map((item, idx) => {
                    const quantity = 5 + idx * 2;
                    const price = item.costPrice || 80;
                    return {
                        itemId: item.id,
                        quantity,
                        price,
                        discount: 0,
                        total: quantity * price,
                        unit: 'حبة'
                    };
                });

                const subtotal = lines.reduce((s, l) => s + l.total, 0);
                const discount = i % 2 === 0 ? 100 : 0;
                const afterDiscount = Math.max(0, subtotal - discount);
                const taxRate = 14;
                const taxAmount = afterDiscount * (taxRate / 100);
                const total = afterDiscount + taxAmount;

                await prisma.purchaseOrder.create({
                    data: {
                        orderNumber: i,
                        date,
                        supplierId: supplier.id,
                        warehouseId: warehouse.id,
                        status: i === 5 ? 'draft' : 'approved',
                        subtotal,
                        discount,
                        taxRate,
                        taxAmount,
                        total,
                        companyId: company.id,
                        branchId,
                        notes: `طلب شراء تجريبي رقم ${i}`,
                        lines: {
                            create: lines
                        }
                    }
                });
            }
            console.log(`Created 5 Purchase Orders.`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
