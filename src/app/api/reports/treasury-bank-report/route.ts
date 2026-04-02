import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const treasuryId = searchParams.get('treasuryId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (from && to && new Date(from) > new Date(to)) {
            return NextResponse.json({ error: "تاريخ البداية يجب أن يكون قبل تاريخ النهاية" }, { status: 400 });
        }

        if (!treasuryId) {
            return NextResponse.json({ error: 'يرجى اختيار الخزينة أو البنك' }, { status: 400 });
        }

        const dateFilter: any = {};
        if (from) {
            dateFilter.gte = new Date(from);
        }
        if (to) {
            const endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
            dateFilter.lte = endDate;
        }

        // 1. Get Treasury Info
        const treasury = await prisma.treasury.findFirst({
            where: { id: treasuryId, companyId }
        });

        if (!treasury) {
            return NextResponse.json({ error: 'الخزينة غير موجودة أو غير تابعة للشركة' }, { status: 404 });
        }

        // 2. Get All Vouchers for this treasury within the date range
        const vouchers = await prisma.voucher.findMany({
            where: {
                treasuryId,
                companyId, // Ensure voucher belongs to company
                date: dateFilter
            },
            include: {
                customer: { select: { name: true } },
                supplier: { select: { name: true } }
            },
            orderBy: { date: 'asc' }
        });

        // 3. Calculate Opening Balance relative to 'from' date
        let openingBalance = treasury.balance;
        if (from) {
            const movementsAfter = await prisma.voucher.groupBy({
                by: ['type'],
                where: {
                    treasuryId,
                    companyId,
                    date: { gte: new Date(from) }
                },
                _sum: { amount: true }
            });

            let receiptsAfter = 0;
            let paymentsAfter = 0;

            movementsAfter.forEach(m => {
                if (m.type === 'receipt') receiptsAfter = m._sum.amount || 0;
                if (m.type === 'payment') paymentsAfter = m._sum.amount || 0;
            });
            
            openingBalance = treasury.balance - receiptsAfter + paymentsAfter;
        }

        const report = {
            treasuryName: treasury.name,
            treasuryType: treasury.type,
            openingBalance,
            currentBalance: treasury.balance,
            movements: vouchers.map(v => ({
                id: v.id,
                date: v.date,
                type: v.type,
                amount: v.amount,
                description: v.description,
                party: v.customer?.name || v.supplier?.name || '—',
                voucherNumber: v.voucherNumber
            }))
        };

        return NextResponse.json(report);
    } catch (error) {
        console.error("Treasury Bank Report API Error:", error);
        return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
    }
});
