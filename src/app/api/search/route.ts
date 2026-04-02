import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const q = searchParams.get('q');

        if (!q || q.length < 2) {
            return NextResponse.json([]);
        }

        const [items, customers, suppliers, invoices] = await Promise.all([
            prisma.item.findMany({
                where: { companyId, OR: [{ name: { contains: q, } }, { code: { contains: q } }] },
                take: 5,
                select: { id: true, name: true, code: true, sellPrice: true }
            }),
            prisma.customer.findMany({
                where: { companyId, OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
                take: 5,
                select: { id: true, name: true, phone: true }
            }),
            prisma.supplier.findMany({
                where: { companyId, OR: [{ name: { contains: q } }, { phone: { contains: q } }] },
                take: 5,
                select: { id: true, name: true, phone: true }
            }),
            prisma.invoice.findMany({
                where: { 
                    companyId,
                    OR: [
                        { invoiceNumber: isNaN(parseInt(q)) ? undefined : parseInt(q) },
                        { customer: { name: { contains: q } } },
                        { supplier: { name: { contains: q } } }
                    ]
                },
                take: 5,
                include: { customer: true, supplier: true }
            })
        ]);

        const results = [
            ...items.map(it => ({
                type: 'product',
                id: it.id,
                label: it.name,
                sub: `كود: ${it.code} — سعر: ${it.sellPrice}`,
                href: `/inventory/items`
            })),
            ...customers.map(c => ({
                type: 'customer',
                id: c.id,
                label: c.name,
                sub: `عميل — ${c.phone || 'بدون هاتف'}`,
                href: `/customers`
            })),
            ...suppliers.map(s => ({
                type: 'supplier',
                id: s.id,
                label: s.name,
                sub: `مورد — ${s.phone || 'بدون هاتف'}`,
                href: `/suppliers`
            })),
            ...invoices.map(inv => ({
                type: 'invoice',
                id: inv.id,
                label: `فاتورة ${inv.type === 'sale' ? 'مبيعات' : 'مشتريات'} #${inv.invoiceNumber}`,
                sub: `${inv.customer?.name || inv.supplier?.name || '—'} — ${inv.total} ج.م`,
                href: inv.type === 'sale' ? `/sales` : `/purchases`
            }))
        ];

        return NextResponse.json(results);
    } catch (error) {
        console.error('Search error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
});
