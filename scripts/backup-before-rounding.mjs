import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function createBackup() {
    console.log('🔄 جاري أخذ نسخة احتياطية من البيانات المتعلقة بالفواتير والعملاء والقيود...');
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-before-rounding-${timestamp}.json`);

    const [invoices, invoiceLines, customers, suppliers, treasuries, journalEntryLines] = await Promise.all([
        prisma.invoice.findMany(),
        prisma.invoiceLine.findMany(),
        prisma.customer.findMany(),
        prisma.supplier.findMany(),
        prisma.treasury.findMany(),
        prisma.journalEntryLine.findMany(),
    ]);

    const backupData = {
        createdAt: new Date().toISOString(),
        counts: {
            invoices: invoices.length,
            invoiceLines: invoiceLines.length,
            customers: customers.length,
            suppliers: suppliers.length,
            treasuries: treasuries.length,
            journalEntryLines: journalEntryLines.length,
        },
        data: {
            invoices,
            invoiceLines,
            customers,
            suppliers,
            treasuries,
            journalEntryLines,
        }
    };

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
    console.log(`✅ تم حفظ النسخة الاحتياطية بنجاح في: ${backupFile}`);
    console.log('📊 تفاصيل السجلات المحفوظة:', backupData.counts);
}

createBackup()
    .catch((e) => {
        console.error('❌ خطأ أثناء إنشاء النسخة الاحتياطية:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
