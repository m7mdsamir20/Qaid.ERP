import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const companyId = session.user.companyId;

        const url = new URL(req.url);
        const from = url.searchParams.get('from');
        const to = url.searchParams.get('to');
        const branchId = url.searchParams.get('branchId');

        let whereClause: any = { companyId, status: { not: 'cancelled' } };
        
        if (from || to) {
            whereClause.createdAt = {};
            if (from) whereClause.createdAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                whereClause.createdAt.lte = toDate;
            }
        }
        
        if (branchId && branchId !== 'all') {
            whereClause.branchId = branchId;
        }

        // Get all lines of non-cancelled orders in the period
        const lines = await prisma.posOrderLine.findMany({
            where: { order: whereClause },
            select: { itemId: true, quantity: true }
        });

        // Group quantities by meal (itemId)
        const mealsSold: Record<string, number> = {};
        for (const line of lines) {
            mealsSold[line.itemId] = (mealsSold[line.itemId] || 0) + line.quantity;
        }

        // Fetch recipes for the sold meals
        const mealIds = Object.keys(mealsSold);
        const recipes = await prisma.recipe.findMany({
            where: { itemId: { in: mealIds } },
            include: {
                items: {
                    include: { item: { select: { id: true, name: true, unit: { select: { name: true } }, code: true } } }
                }
            }
        });

        // Calculate raw material consumption
        const consumptionMap: Record<string, { id: string, name: string, code: string, unit: string, quantity: number }> = {};
        let totalCostEstimate = 0; // If we want to add cost later

        for (const recipe of recipes) {
            const soldQty = mealsSold[recipe.itemId] || 0;
            for (const rItem of recipe.items) {
                const rawId = rItem.itemId;
                const usedQty = rItem.quantity * soldQty;
                
                if (!consumptionMap[rawId]) {
                    consumptionMap[rawId] = {
                        id: rawId,
                        name: rItem.item.name,
                        code: rItem.item.code,
                        unit: rItem.unit || rItem.item.unit?.name || 'حبة',
                        quantity: 0
                    };
                }
                consumptionMap[rawId].quantity += usedQty;
            }
        }

        const consumptionList = Object.values(consumptionMap).sort((a, b) => b.quantity - a.quantity);

        return NextResponse.json({
            consumption: consumptionList,
            totalMealsSold: Object.values(mealsSold).reduce((sum, q) => sum + q, 0),
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
