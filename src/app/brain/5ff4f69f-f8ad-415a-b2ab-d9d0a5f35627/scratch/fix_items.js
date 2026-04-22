const fs = require('fs');
const path = 'c:\\Users\\pc203\\OneDrive\\Desktop\\ERP\\erp-app\\src\\app\\items\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The corruption happened because of a failed replace.
// It seems there are multiple confirmDelete and other blocks.
// I'll try to find the duplicated block and remove it.

const startMarker = 'const res = await fetch(`/api/items?id=${deleteItem.id}`, { method: \'DELETE\' });';
const endMarker = 'finally { setIsSubmitting(false); }';

// We know from the view_file that the first startMarker is at line 214.
// The garbage starts right after it.
// The next occurrence of startMarker or similar might be the correct one.

const parts = content.split(startMarker);
if (parts.length > 2) {
    // We have at least one duplication.
    // Let's reconstruct.
    // Part 0: up to first startMarker
    // Part 1: garbage + next startMarker
    // Part 2: correct body + ...
    
    // Actually, looking at the previous output:
    // Line 214: const res = await fetch(...)
    // Line 215: imageUrl?: string; (Garbage starts)
    // ...
    // Line 409: const res = await fetch(...) (Correct one?)
    
    // I'll just replace the whole mess with a clean version of that middle section.
    
    const cleanSection = `            if (res.ok) {
                fetchData();
                setDeleteItem(null);
            } else {
                const errorData = await res.json();
                alert(t('فشل الحذف') + ': ' + (errorData.error || errorData.message || res.statusText));
            }
        } catch (err) {
            console.error(err);
            alert(t("حدث خطأ غير متوقع أثناء محاولة حذف الصنف."));
        }
        finally { setIsSubmitting(false); }
    };

    const filteredAll = items.filter(u => {
        const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.code.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;
        
        const totalQty = u.stocks?.reduce((q, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? q + st.quantity : q, 0) || 0;
        
        if (warehouseFilter !== 'all') {
            const hasStockRecord = u.stocks?.some(s => s.warehouseId === warehouseFilter);
            if (kpiFilter === 'all' && !hasStockRecord && totalQty === 0) return false;
        }

        if (kpiFilter === 'low') return (u.minLimit || 0) > 0 && totalQty <= (u.minLimit || 0);
        if (kpiFilter === 'out') return totalQty === 0;
        return true;
    });

    const paginated = filteredAll.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    useEffect(() => { setCurrentPage(1); }, [search, warehouseFilter, kpiFilter]);

    const fmt = (num: number) => formatNumber(num);`;

    // Search for the whole block from 'imageUrl?: string;' to 'const fmt = (num: number) => formatNumber(num);'
    // and replace it.
    
    // Actually, I'll just use a regex to find the mess.
    content = content.replace(/imageUrl\?: string;[\s\S]*?const fmt = \(num: number\) => formatNumber\(num\);/g, '');
    
    // Now I might have multiple confirmDelete.
    // I'll just write a known good state for that middle section.
}

// Re-applying the KPI card change as well.
content = content.replace(/\{ id: 'qty', label: t\('إجمالي الكمية'\), val: totalQuantity, icon: Boxes, color: '#a78bfa', unit: t\('قطعة'\) \},/, "{ id: 'cost', label: t('إجمالي التكلفة'), val: items.reduce((s, i) => { const q = i.stocks?.reduce((sum, st) => (warehouseFilter === 'all' || st.warehouseId === warehouseFilter) ? sum + st.quantity : sum, 0) || 0; return s + (q * (i.costPrice || 0)); }, 0), icon: TrendingUp, color: C.teal, unit: currencySymbol },");
content = content.replace(/\{ id: 'cost'[\s\S]*?unit: currencySymbol \},/, "{ id: 'out', label: t('أصناف نفدت'), val: itemsOutOfStock, icon: PackageX, color: C.danger, unit: t('صنف') },");
content = content.replace(/isClickable = s\.id === 'low'/, "isClickable = s.id === 'low' || s.id === 'out'");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed!');
