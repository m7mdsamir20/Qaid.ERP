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
                }
            });
            return NextResponse.json(quotation);
        }

        const branchFilter = getBranchFilter(session);

        // @ts-ignore
        const quotations = await prisma.quotation.findMany({
            where: {
                companyId,
                ...branchFilter,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                customer: true,
                lines: { include: { item: { include: { unit: true } } } },
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
