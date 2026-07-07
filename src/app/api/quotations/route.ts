import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getBranchFilter } from '@/lib/apiAuth';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        
        if (url.searchParams.get('justNextNum') === 'true') {
            // @ts-ignore
            const lastQuotation = await prisma.quotation.findFirst({
                where: { companyId },
                orderBy: { quotationNumber: 'desc' },
                select: { quotationNumber: true }
            });
            return NextResponse.json({ nextNum: (lastQuotation?.quotationNumber || 0) + 1 });
        }

        const id = url.searchParams.get('id');
        if (id) {
            // @ts-ignore
            const quotation = await prisma.quotation.findUnique({
                where: { id, companyId },
                include: {
                    customer: true,
                    lines: { include: { item: { include: { unit: true } } } },
                    salesRepresentative: { select: { id: true, name: true, commissionRate: true } }
                }
            });
            return NextResponse.json(quotation);
        }

        const user = session.user as any;
        const branchFilter = getBranchFilter(session);

        const where: any = {
            companyId,
            ...branchFilter,
        };

        const userRep = await prisma.salesRepresentative.findFirst({
            where: { userId: user.id, companyId, isActive: true }
        });
        if (userRep) {
            where.salesRepresentativeId = userRep.id;
        }

        // @ts-ignore
        const quotations = await prisma.quotation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                lines: { include: { item: { include: { unit: true } } } },
                salesRepresentative: { select: { id: true, name: true } }
            },
        });

        return NextResponse.json({ quotations });
    } catch (error) {
        console.error("GET /api/quotations Error:", error);
        return NextResponse.json({ quotations: [] }, { status: 500 });
    }
});

export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const branchId = (session.user as any).activeBranchId === 'all' ? null : (session.user as any).activeBranchId;

        const user = session.user as any;
        const userRep = await prisma.salesRepresentative.findFirst({
            where: { userId: user.id, companyId, isActive: true }
        });

        let salesRepresentativeId = body.salesRepresentativeId || null;
        if (userRep) {
            salesRepresentativeId = userRep.id;
        }

        const {
            date, customerId, taxRate, taxInclusive, taxLabel,
            notes, lines, discount, taxAmount, total, subtotal
        } = body;

        // ① جيب رقم العرض القادم
        // @ts-ignore
        const lastQuotation = await prisma.quotation.findFirst({
            where: { companyId },
            orderBy: { quotationNumber: 'desc' },
            select: { quotationNumber: true }
        });
        const quotationNumber = (lastQuotation?.quotationNumber || 0) + 1;

        // ② إنشاء عرض السعر
        // @ts-ignore
        const quotation = await prisma.quotation.create({
            data: {
                quotationNumber,
                date: new Date(date),
                customerId: customerId || null,
                taxRate: parseFloat(taxRate) || 0,
                taxInclusive: !!taxInclusive,
                taxLabel: taxLabel || 'ضريبة القيمة المضافة',
                taxAmount: parseFloat(taxAmount) || 0,
                discount: parseFloat(discount) || 0,
                subtotal: parseFloat(subtotal) || 0,
                total: parseFloat(total) || 0,
                notes: notes || '',
                status: 'pending',
                companyId,
                branchId,
                salesRepresentativeId,
                lines: {
                    create: lines.map((l: any) => ({
                        itemId: l.itemId,
                        quantity: Number(l.quantity || 0),
                        price: Number(l.price || 0),
                        discount: Number(l.discount || 0),
                        total: Number(l.total || 0),
                        taxRate: Number(l.taxRate || 0),
                        taxAmount: Number(l.taxAmount || 0),
                        description: l.description || '',
                        unit: l.unit || ''
                    }))
                }
            }
        });

        // @ts-ignore
        const fullQuotation = await prisma.quotation.findUnique({
            where: { id: quotation.id },
            include: { lines: { include: { item: { include: { unit: true } } } }, customer: true }
        });
        return NextResponse.json(fullQuotation, { status: 201 });
    } catch (error) {
        console.error("POST /api/quotations Error:", error);
        return NextResponse.json({ error: 'فشل في إنشاء عرض السعر' }, { status: 500 });
    }
});

export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'معرف عرض السعر مطلوب' }, { status: 400 });

        // @ts-ignore
        await prisma.quotation.delete({ where: { id, companyId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/quotations Error:", error);
        return NextResponse.json({ error: 'فشل في حذف عرض السعر' }, { status: 500 });
    }
});

export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session!.user as any).companyId;
        const { id, date, customerId, taxRate, taxInclusive, taxLabel, notes, lines, discount, taxAmount, total, subtotal } = body;

        if (!id) return NextResponse.json({ error: 'معرف عرض السعر مطلوب' }, { status: 400 });

        // @ts-ignore
        const existing = await prisma.quotation.findUnique({ where: { id, companyId } });
        if (!existing) return NextResponse.json({ error: 'عرض السعر غير موجود' }, { status: 404 });
        if (existing.status === 'converted') {
            return NextResponse.json({ error: 'لا يمكن تعديل عرض سعر تم تحويله إلى فاتورة' }, { status: 400 });
        }

        // Validate that each line's item belongs to this company
        if (lines && lines.length > 0) {
            for (const line of lines) {
                const item = await prisma.item.findFirst({ where: { id: line.itemId, companyId } });
                if (!item) {
                    return NextResponse.json(
                        { error: `الصنف ${line.itemId} غير موجود أو لا ينتمي لهذه الشركة` },
                        { status: 400 }
                    );
                }
            }
        }

        // @ts-ignore
        const updated = await prisma.$transaction(async (tx: any) => {
            // Delete existing lines, then recreate
            // @ts-ignore
            await tx.quotationLine.deleteMany({ where: { quotationId: id } });

            // @ts-ignore
            return tx.quotation.update({
                where: { id },
                data: {
                    date: date ? new Date(date) : existing.date,
                    customerId: customerId !== undefined ? (customerId || null) : existing.customerId,
                    taxRate: taxRate !== undefined ? (parseFloat(taxRate) || 0) : existing.taxRate,
                    taxInclusive: taxInclusive !== undefined ? !!taxInclusive : existing.taxInclusive,
                    taxLabel: taxLabel !== undefined ? taxLabel : existing.taxLabel,
                    taxAmount: taxAmount !== undefined ? (parseFloat(taxAmount) || 0) : existing.taxAmount,
                    discount: discount !== undefined ? (parseFloat(discount) || 0) : existing.discount,
                    subtotal: subtotal !== undefined ? (parseFloat(subtotal) || 0) : existing.subtotal,
                    total: total !== undefined ? (parseFloat(total) || 0) : existing.total,
                    notes: notes !== undefined ? notes : existing.notes,
                    lines: {
                        create: (lines || []).map((l: any) => ({
                            itemId: l.itemId,
                            quantity: Number(l.quantity || 0),
                            price: Number(l.price || 0),
                            discount: Number(l.discount || 0),
                            total: Number(l.total || 0),
                            taxRate: Number(l.taxRate || 0),
                            taxAmount: Number(l.taxAmount || 0),
                            description: l.description || '',
                            unit: l.unit || ''
                        }))
                    }
                },
                include: {
                    lines: { include: { item: { include: { unit: true } } } },
                    customer: true,
                    salesRepresentative: { select: { id: true, name: true, commissionRate: true } }
                }
            });
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error('PUT /api/quotations Error:', error);
        return NextResponse.json({ error: 'فشل في تحديث عرض السعر' }, { status: 500 });
    }
});
