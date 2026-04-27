const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'm7mdsamir1' },
        include: { company: true }
    });

    if (!user) {
        console.log('User not found!');
        return;
    }

    const companyId = user.companyId;
    console.log(`Found user ${user.username}, company: ${user.company.name} (${companyId})`);

    // 1. Delete all existing data for this company
    console.log('Cleaning up existing data...');
    // We must delete in reverse order of dependencies or use cascade deletes where available.
    // However, some might not cascade, so we do it manually to be safe.
    
    // no kitchen ticket
    await prisma.posOrderLine.deleteMany({ where: { order: { companyId } } });
    await prisma.posPayment.deleteMany({ where: { order: { companyId } } });
    await prisma.posOrder.deleteMany({ where: { companyId } });
    await prisma.shift.deleteMany({ where: { companyId } });
    await prisma.restaurantTable.deleteMany({ where: { companyId } });
    
    await prisma.recipeItem.deleteMany({ where: { recipe: { companyId } } });
    await prisma.recipe.deleteMany({ where: { companyId } });
    await prisma.modifierOption.deleteMany({ where: { modifier: { companyId } } });
    await prisma.modifier.deleteMany({ where: { companyId } });
    
    await prisma.stockMovement.deleteMany({ where: { companyId } });
    await prisma.stocktakingLine.deleteMany({ where: { stocktaking: { companyId } } });
    await prisma.stocktaking.deleteMany({ where: { companyId } });
    
    await prisma.warehouseTransferLine.deleteMany({ where: { transfer: { companyId } } });
    await prisma.warehouseTransfer.deleteMany({ where: { companyId } });
    
    await prisma.stock.deleteMany({ where: { warehouse: { companyId } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { companyId } } });
    await prisma.quotationLine.deleteMany({ where: { quotation: { companyId } } });
    
    await prisma.item.deleteMany({ where: { companyId } });
    await prisma.category.deleteMany({ where: { companyId } });
    await prisma.unit.deleteMany({ where: { companyId } });

    console.log('Seeding new data...');

    // 2. Create Units
    const unitKg = await prisma.unit.create({ data: { name: 'كيلو', code: 'kg', companyId } });
    const unitPiece = await prisma.unit.create({ data: { name: 'قطعة', code: 'pcs', companyId } });
    const unitLiter = await prisma.unit.create({ data: { name: 'لتر', code: 'L', companyId } });

    // 3. Create Categories
    const catRaw = await prisma.category.create({ data: { name: 'مواد خام', companyId } });
    const catPizza = await prisma.category.create({ data: { name: 'بيتزا', companyId } });
    const catDrinks = await prisma.category.create({ data: { name: 'مشروبات', companyId } });

    // 4. Create Raw Materials
    const flour = await prisma.item.create({
        data: {
            name: 'دقيق فاخر',
            code: 'RAW-01',
            type: 'raw_material',
            categoryId: catRaw.id,
            unitId: unitKg.id,
            costPrice: 5.0,
            minLimit: 20,
            companyId
        }
    });

    const cheese = await prisma.item.create({
        data: {
            name: 'جبنة موزاريلا',
            code: 'RAW-02',
            type: 'raw_material',
            categoryId: catRaw.id,
            unitId: unitKg.id,
            costPrice: 25.0,
            minLimit: 10,
            companyId
        }
    });

    const tomatoSauce = await prisma.item.create({
        data: {
            name: 'صلصة طماطم',
            code: 'RAW-03',
            type: 'raw_material',
            categoryId: catRaw.id,
            unitId: unitLiter.id,
            costPrice: 10.0,
            minLimit: 5,
            companyId
        }
    });
    
    const sausage = await prisma.item.create({
        data: {
            name: 'سجق بلدي',
            code: 'RAW-04',
            type: 'raw_material',
            categoryId: catRaw.id,
            unitId: unitKg.id,
            costPrice: 40.0,
            minLimit: 15,
            companyId
        }
    });

    // 5. Create Final Products
    const pizzaMargherita = await prisma.item.create({
        data: {
            name: 'بيتزا مارجريتا',
            code: 'PIZ-01',
            type: 'product',
            categoryId: catPizza.id,
            unitId: unitPiece.id,
            sellPrice: 45.0,
            costPrice: 15.0,
            isPosEligible: true,
            status: 'active',
            companyId
        }
    });
    // Variant for Margherita
    const pizzaMargheritaLarge = await prisma.item.create({
        data: {
            name: 'حجم كبير',
            code: 'PIZ-01-L',
            type: 'product',
            categoryId: catPizza.id,
            parentId: pizzaMargherita.id,
            unitId: unitPiece.id,
            sellPrice: 65.0,
            costPrice: 20.0,
            isPosEligible: true,
            status: 'active',
            companyId
        }
    });

    const pizzaSausage = await prisma.item.create({
        data: {
            name: 'بيتزا سجق',
            code: 'PIZ-02',
            type: 'product',
            categoryId: catPizza.id,
            unitId: unitPiece.id,
            sellPrice: 55.0,
            costPrice: 22.0,
            isPosEligible: true,
            status: 'active',
            companyId
        }
    });

    const cola = await prisma.item.create({
        data: {
            name: 'كوكاكولا',
            code: 'DRK-01',
            type: 'product',
            categoryId: catDrinks.id,
            unitId: unitPiece.id,
            sellPrice: 5.0,
            costPrice: 2.0,
            isPosEligible: true,
            status: 'active',
            companyId
        }
    });

    // 6. Create Recipes for Products
    // Recipe for Margherita
    const recipeMargherita = await prisma.recipe.create({
        data: {
            itemId: pizzaMargherita.id,
            companyId,
            items: {
                create: [
                    { itemId: flour.id, quantity: 0.25, unit: 'kg' },
                    { itemId: cheese.id, quantity: 0.1, unit: 'kg' },
                    { itemId: tomatoSauce.id, quantity: 0.05, unit: 'L' }
                ]
            }
        }
    });

    // Recipe for Sausage Pizza
    const recipeSausage = await prisma.recipe.create({
        data: {
            itemId: pizzaSausage.id,
            companyId,
            items: {
                create: [
                    { itemId: flour.id, quantity: 0.25, unit: 'kg' },
                    { itemId: cheese.id, quantity: 0.1, unit: 'kg' },
                    { itemId: tomatoSauce.id, quantity: 0.05, unit: 'L' },
                    { itemId: sausage.id, quantity: 0.15, unit: 'kg' }
                ]
            }
        }
    });

    // 7. Add Inventory (Stock Movements)
    const warehouse = await prisma.warehouse.findFirst({ where: { companyId } });
    if (warehouse) {
        await prisma.stockMovement.create({
            data: {
                itemId: flour.id,
                warehouseId: warehouse.id,
                quantity: 100,
                type: 'in',
                reference: 'OP-BAL-001',
                date: new Date(),
                companyId
            }
        });
        await prisma.stockMovement.create({
            data: {
                itemId: cheese.id,
                warehouseId: warehouse.id,
                quantity: 50,
                type: 'in',
                reference: 'OP-BAL-001',
                date: new Date(),
                companyId
            }
        });
        await prisma.stockMovement.create({
            data: {
                itemId: tomatoSauce.id,
                warehouseId: warehouse.id,
                quantity: 20,
                type: 'in',
                reference: 'OP-BAL-001',
                date: new Date(),
                companyId
            }
        });
        await prisma.stockMovement.create({
            data: {
                itemId: sausage.id,
                warehouseId: warehouse.id,
                quantity: 30,
                type: 'in',
                reference: 'OP-BAL-001',
                date: new Date(),
                companyId
            }
        });
        // We also add some cola to stock, since it's a direct product, not a recipe
        await prisma.stockMovement.create({
            data: {
                itemId: cola.id,
                warehouseId: warehouse.id,
                quantity: 200,
                type: 'in',
                reference: 'OP-BAL-001',
                date: new Date(),
                companyId
            }
        });
    }

    // 8. Create Tables
    await prisma.restaurantTable.create({ data: { name: 'طاولة 1', capacity: 4, section: 'الداخل', companyId } });
    await prisma.restaurantTable.create({ data: { name: 'طاولة 2', capacity: 2, section: 'الداخل', companyId } });
    await prisma.restaurantTable.create({ data: { name: 'طاولة 3', capacity: 6, section: 'تراس', companyId } });

    console.log('Seeding completed successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
