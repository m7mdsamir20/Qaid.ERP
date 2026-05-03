const fs = require('fs');

let content = fs.readFileSync('src/app/pos/page.tsx', 'utf-8');

// 1. Remove the misplaced allOrderTypes declaration
const badDefRegex = /\s*const allOrderTypes: any\[\] = \[\s*\.\.\.ORDER_TYPES,\s*\.\.\.\(restaurantSettings\.deliveryApps \|\| \[\]\)\.map\(\(app: any\) => \(\{\s*value: `app_\$\{app\.id\}`,\s*label: app\.name,\s*icon: Store,\s*color: '#ec4899',\s*isApp: true\s*\}\)\)\s*\];/;
content = content.replace(badDefRegex, '');

// 2. Insert it safely around line 150, right before the first `useEffect`
const insertTarget = '    useEffect(() => {';
if (content.includes(insertTarget)) {
    content = content.replace(
        insertTarget,
        `    const allOrderTypes: any[] = [
        ...ORDER_TYPES,
        ...(restaurantSettings?.deliveryApps || []).map((app: any) => ({
            value: \`app_\${app.id}\`,
            label: app.name,
            icon: Store,
            color: '#ec4899',
            isApp: true
        }))
    ];

    useEffect(() => {`
    );
}

fs.writeFileSync('src/app/pos/page.tsx', content, 'utf-8');
console.log('Fixed scope.');
