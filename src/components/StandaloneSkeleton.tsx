import { C } from '@/constants/theme';

export default function StandaloneSkeleton({ isRtl }: { isRtl: boolean }) {
    return (
        <div style={{ display: 'flex', height: '100vh', background: C.bg }} dir={isRtl ? 'rtl' : 'ltr'}>
            <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="skeleton-pulse" style={{ width: '100%', height: '60px', borderRadius: '16px', background: 'rgba(128,128,128,0.08)' }} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                     {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton-pulse" style={{ height: '120px', borderRadius: '16px', background: 'rgba(128,128,128,0.05)' }} />)}
                </div>
            </div>
            <div style={{ width: '400px', background: C.card, borderInlineStart: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>
                <div className="skeleton-pulse" style={{ width: '100%', height: '60px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
                <div className="skeleton-pulse" style={{ width: '100%', flex: 1, borderRadius: '12px', background: 'rgba(128,128,128,0.05)' }} />
                <div className="skeleton-pulse" style={{ width: '100%', height: '120px', borderRadius: '12px', background: 'rgba(128,128,128,0.08)' }} />
            </div>
            <style jsx global>{`
                @keyframes pulse-shimmer {
                    0% { opacity: 0.5; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.5; }
                }
                .skeleton-pulse {
                    animation: pulse-shimmer 2s infinite ease-in-out;
                }
            `}</style>
        </div>
    );
}
