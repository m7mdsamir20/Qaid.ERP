import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'أنشأ حساب جديد | نظام ERP',
    description: 'أنشأ حسابك الجديد وابدأ بإدارة أعمالك باحترافية',
    icons: {
        icon: '/icon.png',
        apple: '/icon.png',
    }
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
