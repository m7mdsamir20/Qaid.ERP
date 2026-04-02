import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;

        const [customers, suppliers] = await Promise.all([
            prisma.customer.findMany({
                where: { companyId },
                select: { id: true, name: true, balance: true, phone: true }
            }),
            prisma.supplier.findMany({
                where: { companyId },
                select: { id: true, name: true, balance: true, phone: true }
            })
        ]);

        const combined = [
            ...customers.map(c => ({ ...c, type: 'عميل', partnerType: 'customer' as const })),
            ...suppliers.map(s => ({ ...s, type: 'مورد', partnerType: 'supplier' as const }))
        ];

        // Sort by balance (highest magnitude first)
        combined.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

        return NextResponse.json({
            data: combined,
            totalCustomerBalance: customers.reduce((sum, c) => sum + c.balance, 0),
            totalSupplierBalance: suppliers.reduce((sum, s) => sum + s.balance, 0)
        });

    } catch (error) {
        console.error("Balances API Error:", error);
        return NextResponse.json({ error: "فشل استخراج التقرير" }, { status: 500 });
    }
});
