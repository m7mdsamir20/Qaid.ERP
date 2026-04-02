import { NextRequest, NextResponse } from 'next/server';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session) => {
    try {
        const user = session.user as any;
        return NextResponse.json({ authorized: !!user?.isSuperAdmin });
    } catch {
        return NextResponse.json({ authorized: false });
    }
});
