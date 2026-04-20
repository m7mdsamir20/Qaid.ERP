import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withProtection } from '@/lib/apiHandler';

export const POST = withProtection(async (request, session) => {
    try {
        const companyId = (session.user as any).companyId;
        const now = new Date();

        // 1. Get Notification Settings
        const company = await prisma.company.findFirst({
            where: { id: companyId },
            select: { notificationSettings: true, subscription: true },
        });

        if (!company) {
            return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 });
        }

        let settings: any = {
            lowStock: { enabled: true, threshold: 10 },
            latePayment: { enabled: true },
        };

        if (company.notificationSettings) {
            try { 
                settings = JSON.parse(company.notificationSettings); 
            } catch {}
        }

        const newNotifications: any[] = [];

        // ① Low Stock Notifications
        if (settings.lowStock?.enabled) {
            const items = await prisma.item.findMany({
                where: { companyId, minLimit: { gt: 0 } },
                include: {
                    stocks: true,
                },
            });

            for (const item of items) {
                const totalQty = item.stocks.reduce((s, st) => s + st.quantity, 0);
                if (totalQty <= (item.minLimit || 0)) {
                    const exists = await prisma.notification.findFirst({
                        where: {
                            companyId, 
                            type: 'low_stock',
                            msg: { contains: item.name },
                            read: false,
                        }
                    });
                    
                    if (!exists) {
                        newNotifications.push({
                            companyId, 
                            type: 'low_stock',
                            priority: totalQty === 0 ? 'high' : 'medium',
                            msg: totalQty === 0
                                ? `${item.name} — نفد من المخزون`
                                : `${item.name} — الكمية ${totalQty} تحت الحد الأدنى (${item.minLimit})`,
                            link: '/inventory/items',
                        });
                    }
                }
            }
        }

        // ② Overdue Payment Notifications
        if (settings.latePayment?.enabled) {
            const overdueInstallments = await prisma.installment.findMany({
                where: {
                    companyId,
                    status: { in: ['pending', 'partial'] },
                    dueDate: { lt: now },
                },
                include: { plan: { include: { customer: true } } },
                take: 10,
            });

            for (const inst of overdueInstallments) {
                const customerName = inst.plan?.customer?.name || '';
                const exists = await prisma.notification.findFirst({
                    where: {
                        companyId, 
                        type: 'overdue_payment',
                        msg: { contains: customerName },
                        read: false,
                    }
                });
                
                if (!exists && customerName) {
                    const days = Math.ceil((now.getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24));
                    newNotifications.push({
                        companyId, 
                        type: 'overdue_payment',
                        priority: days > 7 ? 'high' : 'medium',
                        msg: `قسط متأخر ${days} يوم — ${customerName} (${(inst.remaining || 0).toLocaleString('en-US')} ج.م)`,
                        link: `/installments/${inst.planId}`,
                    });
                }
            }
        }

        // ③ Trial Expiry Notifications
        if (company.subscription) {
            const sub = company.subscription as any;
            if (sub.plan === 'trial' || sub.plan === 'تجريبي') {
                const daysLeft = Math.ceil(
                    (new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );
                if (daysLeft <= 7 && daysLeft >= 0) {
                    const exists = await prisma.notification.findFirst({
                        where: { companyId, type: 'trial_expiry', read: false }
                    });
                    
                    if (!exists) {
                        newNotifications.push({
                            companyId, 
                            type: 'trial_expiry',
                            priority: daysLeft <= 3 ? 'high' : 'medium',
                            msg: daysLeft === 0
                                ? 'فترتك التجريبية تنتهي اليوم!'
                                : `فترتك التجريبية تنتهي بعد ${daysLeft} يوم`,
                            link: '/settings?tab=subscription',
                        });
                    }
                }
            }
        }

        // Save new notifications
        if (newNotifications.length > 0) {
            await Promise.all(newNotifications.map(n => 
                prisma.notification.create({ data: n })
            ));
        }

        return NextResponse.json({ generated: newNotifications.length });
    } catch (error: any) {
        console.error("Generate Notifications Error:", error);
        return NextResponse.json({ error: 'فشل في توليد الإشعارات' }, { status: 500 });
    }
});
