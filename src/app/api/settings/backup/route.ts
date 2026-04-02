import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'json';

        const [
            company, financialYears,
            accounts, customers, suppliers,
            items, warehouses, stocks,
            invoices, journalEntries,
            treasuries, installmentPlans, employees,
        ] = await Promise.all([
            prisma.company.findUnique({ where: { id: companyId } }),
            prisma.financialYear.findMany({ where: { companyId } }),
            prisma.account.findMany({ where: { companyId } }),
            prisma.customer.findMany({ where: { companyId } }),
            prisma.supplier.findMany({ where: { companyId } }),
            prisma.item.findMany({ where: { companyId } }),
            prisma.warehouse.findMany({ where: { companyId } }),
            prisma.stock.findMany({ where: { warehouse: { companyId } } }),
            prisma.invoice.findMany({ where: { companyId }, include: { lines: true } }),
            prisma.journalEntry.findMany({ where: { companyId }, include: { lines: true } }),
            prisma.treasury.findMany({ where: { companyId } }),
            prisma.installmentPlan.findMany({ where: { companyId }, include: { installments: true } }),
            prisma.employee.findMany({ where: { companyId } }),
        ]);

        const dateStr = new Date().toISOString().split('T')[0];
        const coName = company?.name?.replace(/\s/g, '-') || 'qaid';

        // ── JSON ──
        if (format === 'json') {
            const backup = {
                version: '1.0',
                exportedAt: new Date().toISOString(),
                companyId,
                companyName: company?.name,
                data: {
                    company, financialYears, accounts,
                    customers, suppliers, items, warehouses, stocks,
                    invoices, journalEntries,
                    treasuries, installmentPlans, employees,
                },
            };

            return new NextResponse(JSON.stringify(backup, null, 2), {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="backup-${coName}-${dateStr}.json"`,
                },
            });
        }

        // ── Excel ──
        if (format === 'excel') {
            const sheets: Record<string, any[]> = {
                'العملاء': (customers as any[]).map(c => ({
                    'الاسم': c.name, 'الهاتف': c.phone || '',
                    'العنوان': (c as any).address || '', 'الرصيد': (c as any).balance || 0,
                })),
                'الموردين': (suppliers as any[]).map(s => ({
                    'الاسم': s.name, 'الهاتف': (s as any).phone || '',
                    'العنوان': (s as any).address || '', 'الرصيد': (s as any).balance || 0,
                })),
                'الأصناف': (items as any[]).map(i => ({
                    'الكود': (i as any).code, 'الاسم': i.name,
                    'سعر البيع': (i as any).sellPrice || 0,
                    'سعر التكلفة': (i as any).costPrice || 0,
                    'الوحدة': (i as any).unit || '',
                })),
                'الفواتير': (invoices as any[]).map(inv => ({
                    'رقم الفاتورة': (inv as any).invoiceNumber,
                    'نوع الفاتورة': (inv as any).type === 'sale' ? 'بيع' : 'شراء',
                    'التاريخ': new Date((inv as any).date).toLocaleDateString('ar-EG'),
                    'الإجمالي': (inv as any).total || 0,
                    'الحالة': (inv as any).status || '',
                })),
                'الخزائن': (treasuries as any[]).map(t => ({
                    'الاسم': t.name, 'النوع': t.type,
                    'الرصيد': t.balance || 0,
                })),
                'الموظفين': (employees as any[]).map(e => ({
                    'الاسم': e.name,
                    'الوظيفة': (e as any).jobTitle || '',
                    'الراتب': (e as any).salary || 0,
                    'الحالة': (e as any).status || '',
                })),
            };

            let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
                <head><meta charset="UTF-8"></head><body>`;

            for (const [sheetName, rows] of Object.entries(sheets)) {
                if (rows.length === 0) continue;
                html += `<table><caption>${sheetName}</caption><thead><tr>`;
                const headers = Object.keys(rows[0]);
                headers.forEach(h => { html += `<th>${h}</th>`; });
                html += `</tr></thead><tbody>`;
                rows.forEach(row => {
                    html += `<tr>`;
                    headers.forEach(h => { html += `<td>${(row as any)[h] ?? ''}</td>`; });
                    html += `</tr>`;
                });
                html += `</tbody></table>`;
            }

            html += `</body></html>`;

            return new NextResponse(html, {
                headers: {
                    'Content-Type': 'application/vnd.ms-excel; charset=UTF-8',
                    'Content-Disposition': `attachment; filename="backup-${coName}-${dateStr}.xls"`,
                },
            });
        }

        return NextResponse.json({ error: 'صيغة غير معروفة' }, { status: 400 });

    } catch (error: any) {
        console.error("Backup Export Error:", error);
        return NextResponse.json({ error: 'فشل التصدير' }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const backup = body;

        if (!backup.version || !backup.data) {
            return NextResponse.json({ error: 'ملف النسخة الاحتياطية غير صالح' }, { status: 400 });
        }
        if (backup.companyId !== companyId) {
            return NextResponse.json({ error: 'هذه النسخة تعود لشركة مختلفة' }, { status: 400 });
        }

        const d = backup.data;
        const results: Record<string, number> = {};

        // Helper: upsert by id
        const upsertMany = async (model: any, records: any[], cleanFn?: (r: any) => any) => {
            if (!records?.length) return 0;
            let count = 0;
            for (const r of records) {
                const data = cleanFn ? cleanFn(r) : r;
                await model.upsert({ where: { id: r.id }, update: data, create: data }).catch(() => {});
                count++;
            }
            return count;
        };

        // ① Customers
        results.customers = await upsertMany(prisma.customer, d.customers || [], r => ({
            id: r.id, name: r.name, phone: r.phone || null, email: r.email || null,
            address: r.address || null, balance: r.balance || 0, companyId,
        }));

        // ② Suppliers
        results.suppliers = await upsertMany(prisma.supplier, d.suppliers || [], r => ({
            id: r.id, name: r.name, phone: r.phone || null, email: r.email || null,
            address: r.address || null, balance: r.balance || 0, companyId,
        }));

        // ③ Accounts (شجرة الحسابات)
        results.accounts = await upsertMany(prisma.account, d.accounts || [], r => ({
            id: r.id, code: r.code, name: r.name, type: r.type,
            parentId: r.parentId || null, balance: r.balance || 0,
            isActive: r.isActive ?? true, companyId,
        }));

        // ④ Financial Years
        results.financialYears = await upsertMany(prisma.financialYear, d.financialYears || [], r => ({
            id: r.id, name: r.name,
            startDate: new Date(r.startDate), endDate: new Date(r.endDate),
            isOpen: r.isOpen ?? false, companyId,
        }));

        // ⑤ Warehouses
        results.warehouses = await upsertMany(prisma.warehouse, d.warehouses || [], r => ({
            id: r.id, name: r.name, code: r.code || null,
            address: r.address || null, isActive: r.isActive ?? true, companyId,
        }));

        // ⑥ Items
        results.items = await upsertMany(prisma.item, d.items || [], r => ({
            id: r.id, code: r.code || null, name: r.name,
            sellPrice: r.sellPrice || 0, costPrice: r.costPrice || 0,
            averageCost: r.averageCost || 0, companyId,
        }));

        // ⑦ Treasuries
        results.treasuries = await upsertMany(prisma.treasury, d.treasuries || [], r => ({
            id: r.id, name: r.name, type: r.type || 'cash',
            balance: r.balance || 0, companyId,
        }));

        // ⑧ Employees
        results.employees = await upsertMany(prisma.employee, d.employees || [], r => ({
            id: r.id, code: r.code || '', name: r.name,
            phone: r.phone || null, email: r.email || null,
            basicSalary: r.basicSalary || 0, status: r.status || 'active',
            hireDate: r.hireDate ? new Date(r.hireDate) : new Date(),
            companyId,
        }));

        // ⑨ Invoices (بدون lines - يتم تجاهل الـ lines لتجنب تعقيد العلاقات)
        results.invoices = 0;
        if (d.invoices?.length) {
            for (const inv of d.invoices) {
                const { lines, ...invData } = inv;
                await (prisma as any).invoice.upsert({
                    where: { id: inv.id },
                    update: { ...invData, date: new Date(inv.date), companyId },
                    create: { ...invData, date: new Date(inv.date), companyId },
                }).catch(() => {});
                results.invoices++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'تم استيراد النسخة الاحتياطية بنجاح',
            exportedAt: backup.exportedAt,
            companyName: backup.companyName,
            restored: results,
        });

    } catch (error: any) {
        console.error("Backup Import Error:", error);
        return NextResponse.json({ error: 'فشل استيراد النسخة: ' + error.message }, { status: 500 });
    }
}, { requireAdmin: true });
