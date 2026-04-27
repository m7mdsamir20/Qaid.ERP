import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCurrencySymbol } from '@/lib/currency';
import MenuClient from './MenuClient';

import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ companyId: string }> }): Promise<Metadata> {
    const { companyId } = await params;
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
    });
    return {
        title: company ? `${company.name} — المنيو الرقمي` : 'المنيو الرقمي',
        viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
    };
}

export default async function PublicMenuPage({ params, searchParams }: { params: Promise<{ companyId: string }>, searchParams: Promise<{ table?: string }> }) {
    const { companyId } = await params;
    const { table } = await searchParams;

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, restaurantSettings: true, currency: true }
    });

    if (!company) notFound();

    let settings: any = {};
    try { settings = company.restaurantSettings ? JSON.parse(company.restaurantSettings as string) : {}; } catch { }

    const categories = await prisma.category.findMany({
        where: { companyId },
        include: {
            items: {
                where: { type: { in: ['product', 'service'] }, isPosEligible: true, status: 'active', parentId: null },
                select: { 
                    id: true, name: true, description: true, sellPrice: true, imageUrl: true, category: { select: { name: true } },
                    variants: {
                        where: { isPosEligible: true, status: 'active' },
                        select: { id: true, name: true, sellPrice: true }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    const activeCategories = categories.filter(c => c.items.length > 0);
    const currencyCode = company.currency || settings.currency || 'SAR';
    const currency = getCurrencySymbol(currencyCode, 'ar');

    return (
        <>
            <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Cairo', sans-serif; background: #0b0f19; color: #f1f5f9; min-height: 100vh; -webkit-font-smoothing: antialiased; padding-bottom: 90px; }
                    
                    /* Modern Header */
                    .menu-header { position: relative; padding: 50px 20px 40px; text-align: center; overflow: hidden; }
                    .menu-header::before { content:''; position:absolute; inset:0; background: radial-gradient(circle at top, rgba(37,106,244,0.15) 0%, transparent 70%); z-index:0; }
                    .header-content { position:relative; z-index:1; }
                    .header-content h1 { font-size: 32px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -0.5px; }
                    .header-content p { font-size: 15px; color: #94a3b8; font-weight: 500; }
                    
                    /* Glassmorphism Tabs */
                    .cat-tabs-wrapper { position: sticky; top: 0; z-index: 10; background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.05); }
                    .cat-tabs { display: flex; gap: 12px; padding: 16px 20px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
                    .cat-tabs::-webkit-scrollbar { display: none; }
                    .cat-tab { padding: 10px 24px; border-radius: 100px; font-size: 14px; font-weight: 700; white-space: nowrap; background: rgba(255,255,255,0.03); color: #94a3b8; text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; }
                    .cat-tab.active, .cat-tab:hover { background: #256af4; color: #fff; box-shadow: 0 4px 15px rgba(37,106,244,0.4); }
                    
                    /* Menu Grid */
                    .menu-grid { max-width: 600px; margin: 0 auto; padding: 0 20px; }
                    .cat-section { margin-top: 32px; scroll-margin-top: 80px; }
                    .cat-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px dashed rgba(255,255,255,0.1); }
                    
                    /* Item Cards */
                    .items-list { display: flex; flex-direction: column; gap: 16px; }
                    .item-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; padding: 16px; display: flex; gap: 16px; transition: all 0.3s; position: relative; overflow: hidden; }
                    .item-card:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.1); }
                    .item-img { width: 90px; height: 90px; border-radius: 14px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
                    .item-placeholder { width: 90px; height: 90px; border-radius: 14px; background: linear-gradient(135deg, rgba(37,106,244,0.1), rgba(139,92,246,0.1)); display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; }
                    .item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                    .item-name { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 4px; }
                    .item-desc { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                    
                    /* Standard Add button & Price */
                    .item-footer { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
                    .item-price { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: #10b981; }
                    .item-currency { font-size: 12px; color: rgba(16,185,129,0.7); font-family: 'Cairo', sans-serif; margin-inline-start: 4px; }
                    .add-btn { width: 36px; height: 36px; border-radius: 12px; background: rgba(37,106,244,0.1); color: #60a5fa; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
                    .add-btn:active { transform: scale(0.9); background: #256af4; color: #fff; }
                    
                    /* Variants UI */
                    .variants-list { display: flex; flex-direction: column; gap: 8px; }
                    .variant-btn { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 10px 14px; border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: start; color: #e2e8f0; font-family: 'Cairo', sans-serif; }
                    .variant-btn:active { background: rgba(37,106,244,0.2); border-color: #256af4; transform: scale(0.98); }
                    .v-name { font-size: 14px; font-weight: 700; flex: 1; }
                    .v-price { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 800; color: #10b981; display: flex; gap: 4px; align-items: center; }
                    .v-icon { color: #60a5fa; margin-inline-start: 8px; }
                    
                    /* Floating Cart */
                    .floating-cart { position: fixed; bottom: 24px; left: 24px; right: 24px; max-width: 400px; margin: 0 auto; background: #256af4; color: #fff; border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 10px 25px rgba(37,106,244,0.4); z-index: 50; animation: slideUp 0.3s ease-out; }
                    @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    .cart-badge { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; font-family: 'Outfit', sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }
                    .cart-info { display: flex; align-items: center; }
                    .cart-total { font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; }
                    
                    /* Cart Modal */
                    .cart-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.2s ease-out; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .cart-modal { background: #1e293b; width: 100%; max-width: 500px; max-height: 85vh; border-radius: 24px 24px 0 0; display: flex; flex-direction: column; animation: slideUpModal 0.3s ease-out; }
                    @keyframes slideUpModal { from { transform: translateY(100%); } to { transform: translateY(0); } }
                    .cart-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; }
                    .cart-header h3 { font-size: 18px; font-weight: 800; color: #fff; margin: 0; }
                    .close-btn { background: rgba(255,255,255,0.05); border: none; color: #94a3b8; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                    .cart-items { flex: 1; overflow-y: auto; padding: 20px; }
                    .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: rgba(255,255,255,0.02); padding: 12px 16px; border-radius: 12px; }
                    .cart-item-name { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 4px; }
                    .cart-item-price { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 700; color: #10b981; }
                    .cart-item-actions { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 8px; }
                    .cart-item-actions button { width: 28px; height: 28px; border-radius: 6px; border: none; background: rgba(255,255,255,0.1); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                    .cart-item-actions span { font-family: 'Outfit', sans-serif; font-weight: 800; width: 20px; text-align: center; }
                    .cart-footer { padding: 20px; border-top: 1px solid rgba(255,255,255,0.05); background: rgba(0,0,0,0.2); }
                    .cart-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 18px; font-weight: 800; color: #fff; }
                    .summary-total { font-family: 'Outfit', sans-serif; color: #10b981; }
                    .checkout-btn { width: 100%; padding: 16px; border-radius: 14px; background: #256af4; color: #fff; font-size: 16px; font-weight: 800; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; font-family: 'Cairo', sans-serif; box-shadow: 0 4px 15px rgba(37,106,244,0.3); }
                    .checkout-btn:disabled { opacity: 0.7; cursor: not-allowed; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .order-success { text-align: center; padding: 40px 20px; }
                    .success-icon { width: 80px; height: 80px; border-radius: 50%; background: rgba(16,185,129,0.1); color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
                    .order-success h2 { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 8px; }
                    .order-success p { color: #94a3b8; font-size: 15px; }
                `}</style>
            <MenuClient company={company} categories={activeCategories as any} currency={currency} tableId={table} />
        </>
    );
}
