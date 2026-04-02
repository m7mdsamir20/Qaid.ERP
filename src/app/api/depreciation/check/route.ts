import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const { searchParams } = new URL(request.url);
        const financialYearId = searchParams.get('financialYearId');
        const period          = searchParams.get('period') || 'سنوي';

        if (!financialYearId)
            return NextResponse.json([], { status: 200 });

        // ابحث عن قيود إهلاك مسجلة لهذه السنة والفترة
        const entries = await prisma.journalEntry.findMany({
            where: {
                companyId,
                financialYearId,
                referenceType:  'depreciation',
                description:    { contains: period },
            },
            select: { referenceId: true },
        });

        const doneAssetIds = entries
            .map(e => e.referenceId)
            .filter(Boolean) as string[];

        return NextResponse.json(doneAssetIds);
    } catch (error) {
        console.error(error);
        return NextResponse.json([], { status: 500 });
    }
});
