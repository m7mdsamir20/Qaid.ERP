import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { notFound } from 'next/navigation';

export default async function PublicMenuPage({ params }: { params: { companyId: string } }) {
    const { companyId } = params;

    // Fetch company
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true }
    });

    if (!company) {
        notFound();
    }

    // Fetch categories and items
    const categories = await prisma.category.findMany({
        where: { companyId },
        include: {
            items: {
                where: { type: { in: ['product', 'service'] }, isPosEligible: true },
            }
        }
    });

    // Filter out empty categories
    const activeCategories = categories.filter(c => c.items.length > 0);

    return (
        <div dir="rtl" style={{ fontFamily: 'sans-serif', background: '#f8fafc', minHeight: '100vh', paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ background: '#1e293b', padding: '40px 20px', textAlign: 'center', color: '#fff', borderRadius: '0 0 30px 30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <h1 style={{ margin: '0', fontSize: '28px', fontWeight: 'bold' }}>{company.name}</h1>
                <p style={{ margin: '10px 0 0', opacity: 0.8, fontSize: '15px' }}>مرحباً بكم في المنيو الرقمي</p>
            </div>

            {/* Menu */}
            <div style={{ maxWidth: '600px', margin: '-20px auto 0', padding: '0 20px' }}>
                {activeCategories.map(category => (
                    <div key={category.id} style={{ marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '20px', color: '#1e293b', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '16px' }}>
                            {category.name}
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {category.items.map(item => (
                                <div key={item.id} style={{ background: '#fff', borderRadius: '16px', padding: '16px', display: 'flex', gap: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', alignItems: 'center' }}>
                                    
                                    {/* Image Placeholder */}
                                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                                        🍽️
                                    </div>

                                    {/* Info */}
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: '#334155', fontWeight: 'bold' }}>{item.name}</h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.4 }}>
                                            {item.description || 'وصف شهي لهذا الطبق الرائع، يحضر طازجاً من أجلك.'}
                                        </p>
                                        <div style={{ marginTop: '10px', fontWeight: 'bold', color: '#10b981', fontSize: '15px' }}>
                                            {item.sellPrice} ج.م
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {activeCategories.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                        <h3>عفواً، لا توجد أصناف متاحة حالياً</h3>
                    </div>
                )}
            </div>
        </div>
    );
}
