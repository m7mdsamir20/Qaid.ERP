import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import crypto from 'crypto';

// GET: list API keys for the company
export const GET = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const keys = await prisma.apiKey.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                key: true,
                isActive: true,
                permissions: true,
                lastUsedAt: true,
                usageCount: true,
                createdAt: true,
            }
        });
        return NextResponse.json(keys);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireAdmin: true });

// POST: create a new API key
export const POST = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const name = body?.name || 'مفتاح API';
        const permissions = body?.permissions || 'orders';

        // Generate a secure API key: qaid_live_<random>
        const rawKey = crypto.randomBytes(32).toString('hex');
        const apiKey = `qaid_live_${rawKey}`;

        const created = await prisma.apiKey.create({
            data: {
                name,
                key: apiKey,
                permissions,
                companyId,
            }
        });

        return NextResponse.json(created);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireAdmin: true });

// PUT: toggle active status
export const PUT = withProtection(async (request, session, body) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id, isActive } = body;

        const key = await prisma.apiKey.findFirst({ where: { id, companyId } });
        if (!key) return NextResponse.json({ error: 'مفتاح غير موجود' }, { status: 404 });

        const updated = await prisma.apiKey.update({
            where: { id },
            data: { isActive }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireAdmin: true });

// DELETE: remove an API key
export const DELETE = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const url = new URL(request.url);
        const id = url.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'يرجى تحديد المفتاح' }, { status: 400 });

        const key = await prisma.apiKey.findFirst({ where: { id, companyId } });
        if (!key) return NextResponse.json({ error: 'مفتاح غير موجود' }, { status: 404 });

        await prisma.apiKey.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}, { requireAdmin: true });
