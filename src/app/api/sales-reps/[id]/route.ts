import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const PATCH = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;
        const { name, code, phone, email, commissionRate, commissionType, userId, employeeId, isActive } = body;

        if (!name) {
            return NextResponse.json({ error: "اسم المندوب مطلوب" }, { status: 400 });
        }

        // Check if code is already taken for another sales representative in the same company
        if (code) {
            const exists = await prisma.salesRepresentative.findFirst({
                where: { 
                    code, 
                    companyId,
                    id: { not: id }
                }
            });
            if (exists) {
                return NextResponse.json({ error: "رمز المندوب مستخدم بالفعل" }, { status: 400 });
            }
        }

        const salesRep = await prisma.salesRepresentative.update({
            where: { id, companyId },
            data: {
                name,
                code: code || null,
                phone: phone || null,
                email: email || null,
                commissionRate: Number(commissionRate) || 0,
                commissionType: commissionType || "invoice_total",
                userId: userId || null,
                employeeId: employeeId || null,
                isActive: isActive !== undefined ? isActive : true
            }
        });

        return NextResponse.json(salesRep);
    } catch (error) {
        console.error('Error updating sales rep:', error);
        return NextResponse.json({ error: "فشل في تحديث بيانات مندوب المبيعات" }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session, body, context) => {
    try {
        const { id } = await context.params;
        const companyId = (session.user as any).companyId;

        // Check if there are invoices, quotations, or customers linked to this sales representative
        const [invoiceCount, customerCount, quotationCount] = await Promise.all([
            prisma.invoice.count({ where: { salesRepresentativeId: id, companyId } }),
            prisma.customer.count({ where: { salesRepresentativeId: id, companyId } }),
            prisma.quotation.count({ where: { salesRepresentativeId: id, companyId } })
        ]);

        if (invoiceCount > 0 || customerCount > 0 || quotationCount > 0) {
            return NextResponse.json({ 
                error: "لا يمكن حذف مندوب المبيعات لوجود فواتير أو عملاء أو عروض أسعار مرتبطة به" 
            }, { status: 400 });
        }

        await prisma.salesRepresentative.delete({
            where: { id, companyId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting sales rep:', error);
        return NextResponse.json({ error: "فشل في حذف مندوب المبيعات" }, { status: 500 });
    }
});
