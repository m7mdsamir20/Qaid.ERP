const fs = require('fs');
const path = 'c:\\Users\\pc203\\OneDrive\\Desktop\\ERP\\erp-app\\src\\app\\items\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix handleCreateUnit and confirmDelete transition
const brokenPart = `            if (res.ok) {

    const confirmDelete = async () => {`;

const fixedPart = `            if (res.ok) {
                const data = await res.json();
                setNewUnitName('');
                setShowAddUnit(false);
                await fetchData();
                setForm(prev => ({ ...prev, unitId: data.id }));
            }
        } catch { } finally { setIsSavingSub(false); }
    };

    const confirmDelete = async () => {`;

content = content.replace(brokenPart, fixedPart);

// 2. Fix all corrupted Arabic strings
const mapping = {
    'ط·ط¨ط§ط¹ط© ط§ظ„ط¨ط§ط±ظƒظˆط¯': 'طباعة الباركود',
    'ط¥ط¶ط§ظپط© طھطµظ†ظٹظپ ط¬ط¯ظٹط¯': 'إضافة تصنيف جديد',
    'ط§ط³ظ… ط§ظ„طھطµظ†ظٹظپ ط§ظ„ط¬ط¯ظٹط¯': 'اسم التصنيف الجديد',
    'ظ…ط«ط§ظ„: ط²ظٹظˆطھطŒ ظپظ„ط§طھط±...': 'مثال: زيوت، فلاتر...',
    'ط­ظپط¸ ط§ظ„طھطµظ†ظٹظپ': 'حفظ التصنيف',
    'ط¥ظ„ط؛ط§ط،': 'إلغاء',
    'ط¥ط¶ط§ظپط© ظˆط­ط¯ط© ظ‚ظٹط§ط³ ط¬ط¯ظٹط¯ط©': 'إضافة وحدة قياس جديدة',
    'ط§ط³ظ… ط§ظ„ظˆط­ط¯ط© ط§ظ„ط¬ط¯ظٹط¯ط©': 'اسم الوحدة الجديدة',
    'ظ…ط«ط§ظ„: ظ„طھط±طŒ ط¬ط§ظ„ظˆظ†طŒ ط·ظ‚ظ…...': 'مثال: لتر، جالون، طقم...',
    'ط­ظپط¸ ط§ظ„ظˆط­ط¯ط©': 'حفظ الوحدة',
    'ط§ظ„ط®ط¯ظ…ط§طھ': 'الخدمات',
    'ط§ظ„ط£طµظ†ط§ظپ': 'الأصناف',
    'طھط¹ط±ظٹظپ ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„طھظٹ طھظ‚ط¯ظ…ظ‡ط§ ط§ظ„ظ…ط¤ط³ط³ط© ظˆطھط­ط¯ظٹط¯ ط£ط³ط¹ط§ط±ظ‡ط§': 'تعريف الخدمات التي تقدمها المؤسسة وتحديد أسعارها',
    'ط¥ط¯ط§ط±ط© ظ‚ط§ط¦ظ…ط© ط§ظ„ظ…ظ†طھط¬ط§طھطŒ طھظƒظˆط¯ ط§ظ„ط£طµظ†ط§ظپطŒ ظˆظ…طھط§ط¨ط¹ط© ط§ظ„ط£ط³ط¹ط§ط± ظˆط§ظ„ظ…ط®ط²ظˆظ† ظپظٹ ظƒط§ظپط© ط§ظ„ظپط±ظˆط¹': 'إدارة قائمة المنتجات، تكود الأصناف، ومتابعة الأسعار والمخزون في كافة الفروع',
    'ط¥ط¶ط§ظپط© ط®ط¯ظ…ط© ط¬ط¯ظٹط¯ط©': 'إضافة خدمة جديدة',
    'ط¥ط¶ط§ظپط© طµظ†ظپ ط¬ط¯ظٹط¯': 'إضافة صنف جديد',
    'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط£طµظ†ط§ظپ': 'إجمالي الأصناف',
    'ط£طµظ†ط§ظپ ظ†ظپط¯طھ': 'أصناف نفدت',
    'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظƒظ„ظپط©': 'إجمالي التكلفة',
    'ط£طµظ†ط§ظپ ظ…ظ†ط®ظپط¶ط©': 'أصناف منخفضة',
    'طھظ†ط¨ظٹظ‡': 'تنبيه',
    'طµظ†ظپ': 'صنف'
};

for (const [corrupted, correct] of Object.entries(mapping)) {
    content = content.split(corrupted).join(correct);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed everything!');
