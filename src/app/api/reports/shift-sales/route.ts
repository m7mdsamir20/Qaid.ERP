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

        let whereClause: any = { companyId };
        
        if (from || to) {
            whereClause.openedAt = {};
            if (from) whereClause.openedAt.gte = new Date(from);
            if (to) {
                const toDate = new Date(to);
                toDate.setHours(23, 59, 59, 999);
                whereClause.openedAt.lte = toDate;
            }
        }
        
        if (branchId && branchId !== 'all') {
            whereClause.branchId = branchId;
        }

        const shifts = await prisma.shift.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true } }
            },
            orderBy: { openedAt: 'desc' }
        });

        const totalSales = shifts.reduce((sum: number, s: any) => sum + (s.totalSales || 0), 0);
        const totalExpected = shifts.reduce((sum: number, s: any) => sum + (s.expectedBalance || 0), 0);
        const totalActual = shifts.reduce((sum: number, s: any) => sum + (s.closingBalance || 0), 0);
        const totalDiff = shifts.reduce((sum: number, s: any) => sum + (s.difference || 0), 0);

        return NextResponse.json({
            shifts,
            totalSales,
            totalExpected,
            totalActual,
            totalDiff
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
