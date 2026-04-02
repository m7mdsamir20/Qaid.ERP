import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const branchId = (session.user as any).activeBranchId === 'all' ? null : (session.user as any).activeBranchId;
        const { quotationId } = body;

        // ① جيب عرض السعر بالأصناف
        // @ts-ignore
        const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId, companyId },
            include: { lines: true }
        });

        if (!quotation) return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
        if (quotation.status === 'converted') return NextResponse.json({ error: 'عرض السعر تم تحويله بالفعل' }, { status: 400 });

        // ② جيب رقم الفاتورة القادم
        const lastInvoice = await prisma.invoice.findFirst({
            where: { companyId, type: 'sale' },
            orderBy: { invoiceNumber: 'desc' },
            select: { invoiceNumber: true }
        });
        const invoiceNumber = (lastInvoice?.invoiceNumber || 0) + 1;

        // ③ إنشاء الفاتورة النهائية
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                type: 'sale',
                date: new Date(),
                customerId: quotation.customerId,
                subtotal: quotation.subtotal,
                discount: quotation.discount,
                taxEnabled: quotation.taxEnabled,
                taxRate: quotation.taxRate,
                taxAmount: quotation.taxAmount,
                taxInclusive: quotation.taxInclusive,
                taxLabel: quotation.taxLabel,
                total: quotation.total,
                notes: quotation.notes + `\n(تم التحويل من عرض سعر رقم: ${quotation.quotationNumber})`,
                companyId,
                branchId,
                paidAmount: 0,
                remaining: quotation.total,
                lines: {
                    create: quotation.lines.map((l: any) => ({
                        itemId: l.itemId,
                        quantity: l.quantity,
                        price: l.price,
                        discount: l.discount,
                        total: l.total,
                        taxRate: l.taxRate,
                        taxAmount: l.taxAmount,
                        description: l.description,
                        unit: l.unit
                    }))
                }
            }
        });

        // ④ تحديث حالة عرض السعر
        // @ts-ignore
        await prisma.quotation.update({
            where: { id: quotationId },
            data: { status: 'converted', convertedInvoiceId: invoice.id }
        });

        return NextResponse.json({ success: true, invoiceId: invoice.id });
    } catch (error) {
        console.error("Quotation Convert Error:", error);
        return NextResponse.json({ error: 'فشل تحويل عرض السعر إلى فاتورة' }, { status: 500 });
    }
});
