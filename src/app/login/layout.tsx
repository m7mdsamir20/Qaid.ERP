import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'تسجيل الدخول | نظام ERP',
    description: 'سجل دخولك للوصول إلى نظام إدارة موارد المؤسسة',
    icons: {
        icon: '/icon.png',
        apple: '/icon.png',
    }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
