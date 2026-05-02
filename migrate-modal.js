const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/pos/history/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add AppModal to imports if missing
if (!content.includes('import AppModal')) {
    content = content.replace(/import PageHeader from '@\/components\/PageHeader';/, "import PageHeader from '@/components/PageHeader';\nimport AppModal from '@/components/AppModal';");
}

// Find and replace the Modal code block
const modalStartRegex = /\{\/\* Modal for Order Details \*\/\}\s*\{selectedOrder && \(\s*<div style=\{\{ position: 'fixed', top: 0[\s\S]*?onClick=\{e => e\.stopPropagation\(\)\}>\s*\{\/\* Modal Header \*\/\}/;

// We need to replace the custom fixed div and header with AppModal wrapper.
// Since AppModal handles the Title and Close button, we'll extract the title logic.
const newModalStart = `{/* Modal for Order Details */}
                <AppModal 
                    show={!!selectedOrder} 
                    onClose={() => setSelectedOrder(null)} 
                    title={selectedOrder ? (selectedOrder.invoice?.invoiceNumber ? \`#\${selectedOrder.invoice.invoiceNumber.toString().padStart(4, '0')}\` : \`#\${selectedOrder.orderNumber.toString().padStart(4, '0')}\`) : ''}
                    maxWidth="800px"
                    headerActions={
                        selectedOrder ? (
                            <button onClick={() => {
                                handlePrint(selectedOrder);
                                window.print();
                            }} style={{ width: '30px', height: '30px', borderRadius: '6px', border: \`1px solid \${C.border}\`, background: 'transparent', color: C.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                <Printer size={16} />
                            </button>
                        ) : null
                    }
                >
                    {selectedOrder && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>`;

// Remove the old header up to Action Badges
const headerToRemoveRegex = /<div style=\{\{ padding: '20px 24px', borderBottom: `1px solid \$\{C\.border\}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' \}\}>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

// Replace Action Badges container to only include Status Badges since print is moved
const badgesRegex = /\{\/\* Action Badges in Modal Header \*\/\}\s*<div style=\{\{ padding: '16px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' \}\}>[\s\S]*?<div style=\{\{ display: 'flex', gap: '8px' \}\}>\s*\{selectedOrder\.status === 'preparing'[\s\S]*?<\/div>\s*<\/div>/;

const newBadges = `{/* Action Badges in Modal Header */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                <p style={{ margin: '0 0 0 auto', fontSize: '13px', color: C.textSecondary, fontFamily: OUTFIT }}>{formatDate(selectedOrder.createdAt)}</p>
                                {selectedOrder.status === 'preparing' && <span style={{ padding: '6px 12px', border: '1px solid #fcd34d', background: '#fffbeb', color: '#f59e0b', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span> معالجة</span>}
                                {selectedOrder.status === 'ready' && <span style={{ padding: '6px 12px', border: '1px solid #93c5fd', background: '#eff6ff', color: '#3b82f6', borderRadius: '6px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span> جاهز</span>}
                            </div>`;

content = content.replace(modalStartRegex, newModalStart);
content = content.replace(headerToRemoveRegex, ''); // Remove the old header
content = content.replace(badgesRegex, newBadges);

// Fix the padding of the Order Info Grid and rest of the body
content = content.replace(/padding: '0 24px 20px'/g, "padding: '0 0 20px'");
content = content.replace(/padding: '0 24px'/g, "padding: '0 0'");
content = content.replace(/marginBottom: '24px'/g, "marginBottom: '20px'");
// Fix Summary padding
content = content.replace(/padding: '0 24px 24px'/g, "padding: '0 0'");

// Footer actions - Instead of being inside AppModal's body with border-top, it can just be inside the body or passed as \`footer\` prop.
// For simplicity, let's keep it in the body, just change the padding.
content = content.replace(/padding: '16px 24px', borderTop: `1px solid \$\{C\.border\}`/g, "padding: '16px 0 0', borderTop: `1px solid ${C.border}`, marginTop: '20px'");

// Close the AppModal
content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>\s*<style>/, `</div>\n                    )}\n                </AppModal>\n            </div>\n            <style>`);

fs.writeFileSync(file, content);
console.log('Migrated POS history modal to AppModal.');
