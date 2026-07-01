const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const cid = "cmr1qenbg0001cthbafhotvoo";

async function main() {
  const counts = {
    customers: await prisma.customer.count({ where: { companyId: cid } }),
    employees: await prisma.employee.count({ where: { companyId: cid } }),
    contracts: await prisma.serviceContract.count({ where: { companyId: cid } }),
    workOrders: await prisma.workOrder.count({ where: { companyId: cid } }),
    invoices: await prisma.invoice.count({ where: { companyId: cid } }),
    items: await prisma.item.count({ where: { companyId: cid } }),
    warehouses: await prisma.warehouse.count({ where: { companyId: cid } }),
    financialYears: await prisma.financialYear.count({ where: { companyId: cid } }),
    treasuries: await prisma.treasury.count({ where: { companyId: cid } }),
    accounts: await prisma.account.count({ where: { companyId: cid } }),
  };
  console.log(JSON.stringify(counts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
