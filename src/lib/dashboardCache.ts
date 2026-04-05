// نظام تخزين ذكي (Stale-While-Revalidate)
// يقوم بإظهار البيانات القديمة فوراً ثم تحديثها في الخلفية لضمان سرعة لحظية
let dashboardCache: any = null;
let lastFetch: number = 0;

export const getDashboardCache = () => {
    // دائماً رجع الكاش إذا وجد (مهما طال الوقت) لضمان عدم ظهور شاشة بيضاء
    return dashboardCache;
};

export const setDashboardCache = (data: any) => {
    dashboardCache = data;
    lastFetch = Date.now();
};

export const isCacheOld = () => {
    const now = Date.now();
    // إذا مر أكثر من 20 ثانية، نعتبر الكاش قديم ونحتاج تحديث
    return !dashboardCache || (now - lastFetch > 20000);
};
