import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = session.user.companyId;
        if (!companyId) {
            return NextResponse.json({ error: "Company context is required" }, { status: 400 });
        }

        interface TopSellingAggregate {
            id: string;
            code: string;
            name: string;
            category: string;
            unit: string;
            totalQuantity: number;
            totalSales: number;
            totalProfit: number;
        }

        // Fetch invoice lines from 'sale' invoices
        const invoiceLines = await prisma.invoiceLine.findMany({
            where: {
                invoice: { 
                    companyId, 
                    type: 'sale' 
                }
            },
            include: {
                item: { include: { unit: true, category: true } }
            }
        });

        // Use a map to aggregate totals per item
        const itemAggregates: Record<string, TopSellingAggregate> = {};
        
        invoiceLines.forEach((line) => {
            const itemId = line.itemId;
            if (!itemAggregates[itemId]) {
                itemAggregates[itemId] = {
                    id: itemId,
                    code: line.item.code,
                    name: line.item.name,
                    category: line.item.category?.name || '—',
                    unit: line.item.unit?.name || '—',
                    totalQuantity: 0,
                    totalSales: 0,
                    totalProfit: 0,
                };
            }
            itemAggregates[itemId].totalQuantity += line.quantity;
            itemAggregates[itemId].totalSales += line.total;
            // Simplified profit: total sales - (quantity * average cost)
            itemAggregates[itemId].totalProfit += (line.total - (line.quantity * (line.item.averageCost || line.item.costPrice || 0)));
        });

        // Convert map to array and sort by total sales
        const topSellingItems = Object.values(itemAggregates)
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, 50); // Top 50

        return NextResponse.json(topSellingItems);
    } catch (error) {
        console.error("Top Selling Items API Error:", error);
        return NextResponse.json({ error: "فشل في جلب تقرير الأكثر مبيعاً" }, { status: 500 });
    }
});

