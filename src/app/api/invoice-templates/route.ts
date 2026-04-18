import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';
import { getDefaultTemplateConfig } from '@/lib/invoiceTemplateDefaults';

async function handler(request: NextRequest, session: any, body: any) {
    const companyId = session.user.companyId;

    if (request.method === 'GET') {
        const templates = await prisma.invoiceTemplate.findMany({
            where: { companyId },
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(templates);
    }

    if (request.method === 'POST') {
        const { name, invoiceType, taxInvoiceType, layoutConfig, setAsDefault } = body;
        
        if (!name || !invoiceType) {
            return NextResponse.json({ error: 'الاسم ونوع الفاتورة مطلوبان' }, { status: 400 });
        }

        const configToSave = layoutConfig || getDefaultTemplateConfig(taxInvoiceType);

        if (setAsDefault) {
            await prisma.invoiceTemplate.updateMany({
                where: { companyId, invoiceType },
                data: { isDefault: false }
            });
        }

        // If this is the first template for this type, make it default automatically
        const existingCount = await prisma.invoiceTemplate.count({
            where: { companyId, invoiceType }
        });
        const makeDefault = setAsDefault || existingCount === 0;

        const newTemplate = await prisma.invoiceTemplate.create({
            data: {
                companyId,
                name,
                invoiceType,
                taxInvoiceType: taxInvoiceType || 'simplified',
                layoutConfig: configToSave,
                isDefault: makeDefault
            }
        });

        return NextResponse.json(newTemplate);
    }

    if (request.method === 'PUT') {
        const { id, name, invoiceType, taxInvoiceType, layoutConfig, isDefault } = body;
        
        if (!id) return NextResponse.json({ error: 'ID مطلوب' }, { status: 400 });

        const template = await prisma.invoiceTemplate.findUnique({
            where: { id }
        });

        if (!template || template.companyId !== companyId) {
            return NextResponse.json({ error: 'النموذج غير موجود' }, { status: 404 });
        }

        if (isDefault) {
            await prisma.invoiceTemplate.updateMany({
                where: { companyId, invoiceType: invoiceType || template.invoiceType },
                data: { isDefault: false }
            });
        }

        const updated = await prisma.invoiceTemplate.update({
            where: { id },
            data: {
                name,
                invoiceType,
                taxInvoiceType,
                layoutConfig,
                ...(isDefault !== undefined ? { isDefault } : {})
            }
        });

        return NextResponse.json(updated);
    }

    if (request.method === 'DELETE') {
        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID مطلوب' }, { status: 400 });

        const template = await prisma.invoiceTemplate.findUnique({
            where: { id }
        });

        if (!template || template.companyId !== companyId) {
            return NextResponse.json({ error: 'النموذج غير موجود' }, { status: 404 });
        }

        if (template.isDefault) {
            // Find another one to make default
            const another = await prisma.invoiceTemplate.findFirst({
                where: { companyId, invoiceType: template.invoiceType, id: { not: id } }
            });
            if (another) {
                await prisma.invoiceTemplate.update({
                    where: { id: another.id },
                    data: { isDefault: true }
                });
            }
        }

        await prisma.invoiceTemplate.delete({ where: { id } });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

export const GET = withProtection(handler);
export const POST = withProtection(handler);
export const PUT = withProtection(handler);
export const DELETE = withProtection(handler);
