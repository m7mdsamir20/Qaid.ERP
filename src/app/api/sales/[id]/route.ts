import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const GET = withProtection(async (request, session, body, context) => {
    try {
        const companyId = (session.user as any).companyId;
        const { id } = await context.params;

        const invoice = await prisma.invoice.findFirst({
            where: { 
                id,
                companyId, 
                type: 'sale',
            },
            include: {
                customer: true,
                supplier: true,
                lines: { 
                    include: { 
                        item: { 
                            include: { unit: true } 
                        } 
                    } 
                },
                returnInvoices: { 
                    include: { 
                        lines: true 
                    } 
                },
            },
        });

        if (!invoice) {
            return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
        }

        // Calculate already returned quantities
        const linesWithReturned = invoice.lines.map(line => {
            let alreadyReturned = 0;
            invoice.returnInvoices.forEach(retInv => {
                retInv.lines.forEach(retLine => {
                    if (retLine.itemId === line.itemId) {
                        alreadyReturned += retLine.quantity;
                    }
                });
            });
            return { ...line, alreadyReturned };
        });

        // Parse attachments if they exist (stored as JSON string in DB)
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
            lines: linesWithReturned,
            attachments: parsedAttachments
        });
    } catch (error) {
        console.error('Fetch invoice error:', error);
        return NextResponse.json({ error: 'فشل في جلب الفاتورة' }, { status: 500 });
    }
});
