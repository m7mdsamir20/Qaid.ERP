// بسيط كاش لحفظ بيانات الداش بورد في الذاكرة لتكون فورية عند التنقل
let dashboardCache: any = null;
let lastFetch: number = 0;

export const getDashboardCache = () => {
    const now = Date.now();
    // صلاحية الكاش 30 ثانية
    if (dashboardCache && (now - lastFetch < 30000)) {
        return dashboardCache;
    }
    return null;
};

export const setDashboardCache = (data: any) => {
    dashboardCache = data;
    lastFetch = Date.now();
};
