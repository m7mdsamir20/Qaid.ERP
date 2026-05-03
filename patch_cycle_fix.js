const fs = require('fs');

let content = fs.readFileSync('src/app/pos/page.tsx', 'utf-8');

// 1. Remove "زر تحديد طريقة الدفع"
const btnRegex = /\{\/\* زر تحديد طريقة الدفع \*\/\}\s*\{\!\(orderType === 'dine-in' && restaurantSettings\.dineInPaymentPolicy === 'post-pay'\) && \(\s*<button onClick=\{\(\) => setShowPaymentModal\(true\)\}[\s\S]*?<\/button>\s*\)\}/m;
content = content.replace(btnRegex, '');

// 2. Remove "Payment Method & Treasury Modal"
const modalRegex = /\{\/\* Payment Method & Treasury Modal \*\/\}\s*\{showPaymentModal && \([\s\S]*?\n            \)\}/m;
content = content.replace(modalRegex, '');

// 3. Define allOrderTypes inside render
if (!content.includes('const allOrderTypes')) {
    content = content.replace(
        /    return \(\s*<div style=\{\{ display: 'flex'/,
        `    const allOrderTypes: any[] = [
        ...ORDER_TYPES,
        ...(restaurantSettings.deliveryApps || []).map((app: any) => ({
            value: \`app_\${app.id}\`,
            label: app.name,
            icon: Store,
            color: '#ec4899',
            isApp: true
        }))
    ];

    return (
        <div style={{ display: 'flex'`
    );
}

// 4. Update the order type icon label below the notes
content = content.replace(
    /\{ORDER_TYPES\.find\(o => o\.value === orderType\)\?\.label \|\| t\('نوع الطلب'\)\}/g,
    `{allOrderTypes.find(o => o.value === orderType)?.label || t('نوع الطلب')}`
);

// 5. Update the Order Type Modal mapping
content = content.replace(
    /ORDER_TYPES\.map\(ot => \{/g,
    `allOrderTypes.map(ot => {`
);

// 6. Fix aggregator check in the payment buttons
content = content.replace(
    /\{orderType === 'aggregator' \? \(/g,
    `{orderType.startsWith('app_') ? (`
);

// 7. Make sure `Store` is imported from lucide-react if not already
if (!content.includes('Store,')) {
    content = content.replace(
        /import \{(.*?)\} from 'lucide-react';/,
        `import { $1, Store } from 'lucide-react';`
    );
}

fs.writeFileSync('src/app/pos/page.tsx', content, 'utf-8');
console.log('Modified successfully.');
