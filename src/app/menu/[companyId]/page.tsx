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
                    body { font-family: 'Cairo', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; -webkit-font-smoothing: antialiased; padding-bottom: 90px; }
                    
                    /* Modern Header */
                    .menu-header { position: relative; padding: 60px 20px 40px; text-align: center; overflow: hidden; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); border-bottom: 1px solid rgba(0,0,0,0.03); box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
                    .header-content { position:relative; z-index:1; }
                    .header-content h1 { font-size: 34px; font-weight: 800; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.5px; }
                    .header-content p { font-size: 15px; color: #64748b; font-weight: 600; }
                    
                    /* Glassmorphism Tabs */
                    .cat-tabs-wrapper { position: sticky; top: 0; z-index: 10; background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(0,0,0,0.05); box-shadow: 0 4px 10px rgba(0,0,0,0.02); }
                    .cat-tabs { display: flex; gap: 12px; padding: 16px 20px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
                    .cat-tabs::-webkit-scrollbar { display: none; }
                    .cat-tab { padding: 10px 24px; border-radius: 100px; font-size: 14px; font-weight: 700; white-space: nowrap; background: #f1f5f9; color: #64748b; text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
                    .cat-tab.active, .cat-tab:hover { background: #256af4; color: #fff; box-shadow: 0 4px 15px rgba(37,106,244,0.3); }
                    
                    /* Menu Grid */
                    .menu-grid { max-width: 95%; margin: 0 auto; padding: 0 20px; }
                    .cat-section { margin-top: 40px; scroll-margin-top: 100px; }
                    .cat-title { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px dashed rgba(0,0,0,0.05); }
                    
                    /* Item Cards */
                    .items-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
                    @media (max-width: 768px) { .items-list { grid-template-columns: 1fr; } }
                    .item-card { background: #ffffff; border: 1px solid rgba(0,0,0,0.04); border-radius: 24px; padding: 18px; display: flex; flex-direction: row; gap: 18px; transition: all 0.3s; position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
                    .item-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.06); border-color: rgba(37,106,244,0.1); }
                    .item-img { width: 100px; height: 100px; border-radius: 16px; object-fit: cover; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                    .item-placeholder { width: 100px; height: 100px; border-radius: 16px; background: linear-gradient(135deg, rgba(37,106,244,0.05), rgba(139,92,246,0.05)); display: flex; align-items: center; justify-content: center; font-size: 32px; flex-shrink: 0; color: #94a3b8; }
                    .item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
                    .item-name { font-size: 17px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
                    .item-desc { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-weight: 600; }
                    
                    /* Standard Add button & Price */
                    .item-footer { display: flex; align-items: center; justify-content: flex-end; gap: 16px; margin-top: auto; }
                    .item-price { font-family: 'ERP-Numbers', 'Cairo', sans-serif; font-size: 16px; font-weight: 800; color: #256af4; }
                    .item-currency { font-size: 12px; color: #64748b; font-family: 'Cairo', sans-serif !important; margin-inline-start: 4px; font-weight: 700; }
                    .add-btn { width: 36px; height: 36px; border-radius: 12px; background: #f1f5f9; color: #256af4; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }
                    .add-btn:active, .add-btn:hover { transform: scale(0.95); background: #256af4; color: #fff; box-shadow: 0 4px 12px rgba(37,106,244,0.3); }
                    
                    /* Variants UI */
                    .variants-list { display: flex; flex-direction: column; gap: 8px; }
                    .variant-btn { display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid rgba(0,0,0,0.04); padding: 10px 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: start; color: #334155; font-family: 'Cairo', sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.01); }
                    .variant-btn:active, .variant-btn:hover { background: #eff6ff; border-color: rgba(37,106,244,0.2); transform: scale(0.98); }
                    .v-name { font-size: 13px; font-weight: 800; flex: 1; }
                    .v-price { font-family: 'ERP-Numbers', 'Cairo', sans-serif; font-size: 14px; font-weight: 800; color: #256af4; display: flex; gap: 4px; align-items: center; }
                    .v-icon { color: #256af4; margin-inline-start: 8px; }
                    
                    /* Floating Cart */
                    .floating-cart { position: fixed; bottom: 24px; left: 24px; right: 24px; max-width: 400px; margin: 0 auto; background: #0f172a; color: #fff; border-radius: 20px; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-shadow: 0 15px 35px rgba(15,23,42,0.3); z-index: 50; animation: slideUp 0.3s ease-out; }
                    @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    .cart-badge { position: absolute; top: -8px; right: -8px; background: #ef4444; color: white; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; font-family: 'ERP-Numbers', 'Cairo', sans-serif; box-shadow: 0 4px 10px rgba(239,68,68,0.4); border: 2px solid #fff; }
                    .cart-info { display: flex; align-items: center; }
                    .cart-total { font-family: 'ERP-Numbers', 'Cairo', sans-serif; font-size: 19px; font-weight: 800; color: #10b981; }
                    
                    /* Cart Modal */
                    .cart-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(8px); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease-out; padding: 20px; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .cart-modal { background: #ffffff; width: 100%; max-width: 500px; max-height: 90vh; border-radius: 24px; display: flex; flex-direction: column; animation: slideUpModal 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 40px rgba(0,0,0,0.15); position: relative; overflow: hidden; }
                    .custom-scroll::-webkit-scrollbar { width: 4px; }
                    .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                    .custom-scroll::-webkit-scrollbar-thumb { background: rgba(15,23,42,0.1); border-radius: 10px; }
                    .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(15,23,42,0.2); }
                    @keyframes slideUpModal { from { transform: translateY(100%); } to { transform: translateY(0); } }
                    .cart-header { padding: 24px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
                    .cart-header h3 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
                    .close-btn { background: #f1f5f9; border: none; color: #64748b; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                    .close-btn:hover { background: #e2e8f0; color: #0f172a; }
                    .cart-items { flex: 1; overflow-y: auto; padding: 24px; }
                    .cart-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; background: #f8fafc; padding: 16px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.03); }
                    .cart-item-name { font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
                    .cart-item-price { font-family: 'ERP-Numbers', 'Cairo', sans-serif; font-size: 15px; font-weight: 800; color: #256af4; }
                    .cart-item-actions { display: flex; align-items: center; gap: 14px; background: #ffffff; padding: 6px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.02); }
                    .cart-item-actions button { width: 32px; height: 32px; border-radius: 8px; border: none; background: #f1f5f9; color: #334155; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s; }
                    .cart-item-actions button:hover { background: #256af4; color: #fff; }
                    .cart-item-actions span { font-family: 'ERP-Numbers', 'Cairo', sans-serif; font-weight: 800; width: 24px; text-align: center; color: #0f172a; }
                    .cart-footer { padding: 24px; border-top: 1px solid rgba(0,0,0,0.05); background: #ffffff; border-radius: 0 0 0 0; }
                    .cart-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 18px; font-weight: 800; color: #64748b; }
                    .summary-total { font-family: 'ERP-Numbers', 'Cairo', sans-serif; color: #0f172a; font-size: 24px; }
                    .checkout-btn { width: 100%; padding: 18px; border-radius: 16px; background: #256af4; color: #fff; font-size: 17px; font-weight: 800; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; font-family: 'Cairo', sans-serif; box-shadow: 0 8px 20px rgba(37,106,244,0.3); transition: 0.2s; }
                    .checkout-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(37,106,244,0.4); }
                    .checkout-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
                    .spin { animation: spin 1s linear infinite; }
                    @keyframes spin { to { transform: rotate(360deg); } }
                    .order-success { text-align: center; padding: 60px 20px; }
                    .success-icon { width: 90px; height: 90px; border-radius: 50%; background: rgba(16,185,129,0.1); color: #10b981; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 0 0 10px rgba(16,185,129,0.05); }
                    .order-success h2 { font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
                    .order-success p { color: #64748b; font-size: 16px; font-weight: 600; line-height: 1.6; }
                `}</style>
            <MenuClient company={company} categories={activeCategories as any} currency={currency} tableId={table} />
        </>
    );
}
