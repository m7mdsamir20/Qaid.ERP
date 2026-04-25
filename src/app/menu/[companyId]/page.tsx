import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export default async function PublicMenuPage({ params }: { params: { companyId: string } }) {
    const { companyId } = params;

    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, restaurantSettings: true }
    });

    if (!company) notFound();

    let settings: any = {};
    try { settings = company.restaurantSettings ? JSON.parse(company.restaurantSettings as string) : {}; } catch { }

    const categories = await prisma.category.findMany({
        where: { companyId },
        include: {
            items: {
                where: { type: { in: ['product', 'service'] }, isPosEligible: true, status: 'active' },
                select: { id: true, name: true, description: true, sellPrice: true, imageUrl: true, category: { select: { name: true } } }
            }
        },
        orderBy: { name: 'asc' }
    });

    const activeCategories = categories.filter(c => c.items.length > 0);
    const currency = settings.currency || 'ر.س';

    return (
        <html lang="ar" dir="rtl">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>{company.name} — المنيو الرقمي</title>
                <meta name="description" content={`قائمة الطعام الرقمية لـ ${company.name}`} />
                <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet" />
                <style>{`
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Cairo', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; -webkit-font-smoothing: antialiased; }
                    .menu-header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 48px 20px 36px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.06); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(20px); }
                    .menu-header h1 { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 6px; }
                    .menu-header p { font-size: 14px; color: rgba(255,255,255,0.5); font-weight: 500; }
                    .cat-tabs { display: flex; gap: 8px; padding: 16px 20px; overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; position: sticky; top: 0; z-index: 9; background: rgba(15,23,42,0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,0.04); }
                    .cat-tabs::-webkit-scrollbar { display: none; }
                    .cat-tab { padding: 8px 20px; border-radius: 30px; font-size: 13px; font-weight: 700; white-space: nowrap; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.6); text-decoration: none; transition: all 0.3s; }
                    .cat-tab:hover { background: rgba(37,106,244,0.15); color: #60a5fa; border-color: rgba(37,106,244,0.3); }
                    .menu-grid { max-width: 680px; margin: 0 auto; padding: 0 20px 60px; }
                    .cat-section { margin-top: 28px; }
                    .cat-title { font-size: 18px; font-weight: 800; color: #f8fafc; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 10px; }
                    .cat-title::before { content: ''; width: 4px; height: 20px; background: linear-gradient(180deg, #256af4, #60a5fa); border-radius: 4px; }
                    .item-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 16px; display: flex; gap: 16px; align-items: center; margin-bottom: 12px; transition: all 0.3s; }
                    .item-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(37,106,244,0.2); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
                    .item-img { width: 80px; height: 80px; border-radius: 14px; object-fit: cover; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.08); }
                    .item-placeholder { width: 80px; height: 80px; border-radius: 14px; background: linear-gradient(135deg, rgba(37,106,244,0.1), rgba(139,92,246,0.1)); display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.06); }
                    .item-info { flex: 1; min-width: 0; }
                    .item-name { font-size: 15px; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
                    .item-desc { font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.6; margin-bottom: 8px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                    .item-price { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #10b981; }
                    .item-currency { font-size: 11px; color: rgba(16,185,129,0.7); font-family: 'Cairo', sans-serif; margin-inline-start: 4px; }
                    .empty-state { text-align: center; padding: 80px 20px; color: rgba(255,255,255,0.3); }
                    .empty-state h3 { font-size: 18px; margin-bottom: 8px; }
                    .footer { text-align: center; padding: 20px; font-size: 11px; color: rgba(255,255,255,0.15); border-top: 1px solid rgba(255,255,255,0.04); }
                    @media (max-width: 480px) {
                        .menu-header h1 { font-size: 22px; }
                        .item-img, .item-placeholder { width: 64px; height: 64px; border-radius: 12px; }
                        .item-name { font-size: 14px; }
                        .item-price { font-size: 15px; }
                    }
                `}</style>
            </head>
            <body>
                <div className="menu-header">
                    <h1>{company.name}</h1>
                    <p>المنيو الرقمي — اختر ما يناسبك</p>
                </div>

                {activeCategories.length > 1 && (
                    <div className="cat-tabs">
                        {activeCategories.map(cat => (
                            <a key={cat.id} href={`#cat-${cat.id}`} className="cat-tab">{cat.name}</a>
                        ))}
                    </div>
                )}

                <div className="menu-grid">
                    {activeCategories.map(category => (
                        <div key={category.id} id={`cat-${category.id}`} className="cat-section">
                            <h2 className="cat-title">{category.name}</h2>
                            {category.items.map(item => (
                                <div key={item.id} className="item-card">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="item-img" loading="lazy" />
                                    ) : (
                                        <div className="item-placeholder">🍽️</div>
                                    )}
                                    <div className="item-info">
                                        <div className="item-name">{item.name}</div>
                                        {item.description && <div className="item-desc">{item.description}</div>}
                                        <div className="item-price">
                                            {item.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            <span className="item-currency">{currency}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    {activeCategories.length === 0 && (
                        <div className="empty-state">
                            <h3>عفواً، لا توجد أصناف متاحة حالياً</h3>
                            <p>يرجى المحاولة لاحقاً</p>
                        </div>
                    )}
                </div>

                <div className="footer">
                    Powered by Qaid.ERP — منيو رقمي احترافي
                </div>
            </body>
        </html>
    );
}
