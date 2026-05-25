const fs = require('fs');
const path = require('path');

const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let code = fs.readFileSync(newPageFile, 'utf8');

// The hooks to inject
const hooksCode = `
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const itemSelectRef = useRef<any>(null);

    const handleItemSelect = (id: any) => {
        setSelectedItem(id);
        if (id) {
            const item = items.find(i => i.id === id);
            if (item) {
                setCartQuantity('1');
                setCartPrice(String(item.sellPrice || 0));
                
                setTimeout(() => {
                    if (qtyInputRef.current) {
                        qtyInputRef.current.focus();
                        qtyInputRef.current.select();
                    }
                }, 50);
            }
        } else {
            setCartQuantity('1');
            setCartPrice('');
        }
    };

    const handleQtyKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (priceInputRef.current) {
                priceInputRef.current.focus();
                priceInputRef.current.select();
            }
        }
    };

    const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedItem) {
                handleAddToCart();
                setTimeout(() => {
                    if (itemSelectRef.current) {
                        itemSelectRef.current.focus();
                    }
                }, 50);
            }
        }
    };
`;

// 1. Remove the old incorrectly placed hooksCode if it's there
const oldHooksMatch = code.match(/\s*const qtyInputRef = useRef[\s\S]*?const handlePriceKeyDown = \(e: React\.KeyboardEvent<HTMLInputElement>\) => \{[\s\S]*?\}\s*;\s*/);
if (oldHooksMatch) {
    code = code.replace(oldHooksMatch[0], '');
}

// 2. Insert hooksCode at a safe location, like right before `const handleAddToCart = () => {`
const handleAddToCartIndex = code.indexOf('const handleAddToCart = () => {');
if (handleAddToCartIndex !== -1) {
    code = code.substring(0, handleAddToCartIndex) + hooksCode + code.substring(handleAddToCartIndex);
}

// 3. Update the inputs in JSX
// Find CustomSelect for items:
// <CustomSelect value={selectedItem} onChange={(id) => { setSelectedItem(id); const it = items.find(i => i.id === id); if (it) setCartPrice(String(it.sellPrice || 0)); }} ... />
const customSelectRegex = /<CustomSelect\s+value=\{selectedItem\}[\s\S]*?onChange=\{\(id\) => \{[\s\S]*?\}\}[\s\S]*?\/>/;
code = code.replace(customSelectRegex, (match) => {
    return match.replace(/onChange=\{\(id\) => \{[\s\S]*?\}\}/, 'onChange={handleItemSelect} ref={itemSelectRef}');
});

// Find Quantity input
const qtyRegex = /<input[^>]*?value=\{cartQuantity\}[^>]*?onChange=\{e => setCartQuantity\(e\.target\.value\)\}[^>]*?\/>/;
code = code.replace(qtyRegex, (match) => {
    if (!match.includes('ref=')) {
        return match.replace('/>', ' ref={qtyInputRef} onKeyDown={handleQtyKeyDown} onFocus={(e) => e.target.select()} />');
    }
    return match;
});

// Find Price input
const priceRegex = /<input[^>]*?value=\{cartPrice\}[^>]*?onChange=\{e => setCartPrice\(e\.target\.value\)\}[^>]*?\/>/;
code = code.replace(priceRegex, (match) => {
    if (!match.includes('ref=')) {
        return match.replace('/>', ' ref={priceInputRef} onKeyDown={handlePriceKeyDown} onFocus={(e) => e.target.select()} />');
    }
    return match;
});

fs.writeFileSync(newPageFile, code);
console.log('Fixed DOM interactions in new page!');
