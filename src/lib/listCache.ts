// نظام تخزين عالمي لصفحات القوائم (Sales, Purchases, Treasuries)
// لضمان ظهور البيانات فوراً عند التنقل بين الصفحات
const cache: Record<string, any> = {};

export const getListCache = (key: string) => {
    return cache[key] || null;
};

export const setListCache = (key: string, data: any) => {
    cache[key] = data;
};
