const fs = require('fs');

const file = 'src/app/installments/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// The typescript errors in page.tsx:
// 1. Tuple type '[Response, Response, Response, Response]' of length '4' has no element at index '4'
// This was from `Promise.all([fetch1, fetch2, fetch3, fetch4, fetchInvoices])`. I removed the fetch call, but not the variable assignment!
code = code.replace(/const \[resItems, resCust, resTax, resTreas, invRes\] = await Promise.all\(\[[\s\S]*?\]\);/,
`const [resItems, resCust, resTax, resTreas] = await Promise.all([
    fetch('/api/items'),
    fetch('/api/customers'),
    fetch('/api/settings/tax'),
    fetch('/api/settings/treasury'),
]);`);

// Remove planType states completely
code = code.replace(/const \[planType, setPlanType\] = useState\('direct'\);\s*\/\/ 'direct' or 'invoice'/g, '');

// Clean up planType leftovers around the JSX
// Around line 445: <div onClick={() => setPlanType('direct')} ...>
// I'll just use a regex to kill any div that has setPlanType in its onClick
code = code.replace(/<div[^>]*onClick=\{\(\) => setPlanType\('direct'\)\}[^>]*>[\s\S]*?<\/div>/g, '');
code = code.replace(/<div[^>]*onClick=\{\(\) => setPlanType\('invoice'\)\}[^>]*>[\s\S]*?<\/div>/g, '');
code = code.replace(/<div style=\{\{ display: 'flex', gap: '8px', marginBottom: '16px' \}\}>\s*<\/div>/g, '');

// Remove {planType === 'direct' ? (
code = code.replace(/\{planType === 'direct' \? \([\s\S]*?\) : \([\s\S]*?\{\/\* Cart Section \*\//g, '{/* Cart Section */');
// Wait, if I do that, the old direct block will be deleted. But I already deleted it.
// Let's just remove any {planType === 'direct' ? ( if it exists.
code = code.replace(/\{planType === 'direct' \? \(/g, '');

// Remove unpaidInvoices usages
code = code.replace(/const \[unpaidInvoices, setUnpaidInvoices\] = useState<any\[\]>\(\[\]\);/g, '');
code = code.replace(/if \(invRes && invRes\.ok\) \{\s*const data = await invRes\.json\(\);\s*setUnpaidInvoices\(data\);\s*\}/g, '');

// If there's an orphaned `) : (` block for unpaid invoices, it should be removed.
code = code.replace(/\) : \([\s\S]*?اختر الفاتورة الآجلة[\s\S]*?<\/div>\s*\)/g, '');

fs.writeFileSync(file, code);
console.log('Cleanup script written');
