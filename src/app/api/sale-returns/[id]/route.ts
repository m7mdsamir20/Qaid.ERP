import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, { params }) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await params;

        const invoice = await prisma.invoice.findFirst({
            where: { 
                id,
                companyId, 
                type: 'sale_return',
            },
            include: {
                customer: true,
                lines: { 
                    include: { 
                        item: { 
                            include: { unit: true } 
                        } 
                    } 
                },
                originalInvoice: {
                    include: {
                        customer: true
                    }
                }
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "المرتجع غير موجود" }, { status: 404 });
        }

        // Parse attachments if they exist
        let parsedAttachments = [];
        if (invoice.attachments) {
            try {
                parsedAttachments = JSON.parse(invoice.attachments);
            } catch (e) {
                console.error("Failed to parse attachments:", e);
            }
        }

        return NextResponse.json({
            ...invoice,
            attachments: parsedAttachments
        });
    } catch (error) {
        console.error('Fetch sale return error:', error);
        return NextResponse.json({ error: 'فشل في جلب بيانات المرتجع' }, { status: 500 });
    }
});
