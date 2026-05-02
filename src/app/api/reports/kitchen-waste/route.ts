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

        // Look for StockMovements representing waste (usually manual out adjustment with a reference to waste)
        // We will assume 'type: out' and notes or reference containing keywords like هالك, تالف, waste, spoilage, or type = 'waste' if added in future.
        let whereClause: any = { 
            companyId,
            type: 'out', // Only outgoing adjustments
            OR: [
                { notes: { contains: 'هالك' } },
                { notes: { contains: 'تالف' } },
                { notes: { contains: 'waste', mode: 'insensitive' } },
                { notes: { contains: 'spoilage', mode: 'insensitive' } },
                { reference: { contains: 'waste', mode: 'insensitive' } },
                { type: 'waste' } // Just in case a specific type is used in the future
            ]
        };
        
        if (from || to) {
            whereClause.date = {};
            if (from) whereClause.date.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                whereClause.date.lte = toDate;
            }
        }
        
        if (branchId && branchId !== 'all') {
            whereClause.warehouse = { branchId: branchId };
        }

        const movements = await prisma.stockMovement.findMany({
            where: whereClause,
            include: {
                item: { select: { name: true, code: true, unit: { select: { name: true } } } },
                warehouse: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Calculate total estimated loss
        const totalLoss = movements.reduce((sum: number, m: any) => sum + ((m.quantity * (m.unitPrice || 0))), 0);

        return NextResponse.json({
            wasteMovements: movements,
            totalLoss
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
