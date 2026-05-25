const fs = require('fs');
const path = require('path');

const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');
let newCode = fs.readFileSync(newPageFile, 'utf8');

// The new page is currently a copy of the old page with the main return replaced by the modal.
// We need to clean up unused variables if they cause TS errors, but since this is TS, it's safer to just inject the new cart behavior logic.

// 1. We need to add refs and event handlers for the cart inputs.
// In React, we can add `useRef` at the top of the component.
const useRefIndex = newCode.indexOf('useRef');
if (useRefIndex === -1) {
    newCode = newCode.replace(/import \{.*?\} from 'react';/, (match) => match.replace('}', ', useRef }'));
}

// 2. Inject refs into the component body.
// Find the start of the component `export default function InstallmentsPage() {`
const compStart = newCode.indexOf('export default function InstallmentsPage() {');
if (compStart !== -1) {
    const afterComp = compStart + 'export default function InstallmentsPage() {\n'.length;
    const refsCode = `
    const qtyInputRef = useRef<HTMLInputElement>(null);
    const priceInputRef = useRef<HTMLInputElement>(null);
    const itemSelectRef = useRef<HTMLSelectElement>(null);

    const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setSelectedItem(id);
        if (id) {
            const item = items.find(i => i.id === id);
            if (item) {
                setTempItem({ quantity: 1, price: item.price, total: item.price });
                // Auto-focus quantity and select
                setTimeout(() => {
                    if (qtyInputRef.current) {
                        qtyInputRef.current.focus();
                        qtyInputRef.current.select();
                    }
                }, 50);
            }
        } else {
            setTempItem({ quantity: 1, price: 0, total: 0 });
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
                addToCart();
                // Focus back to select
                setTimeout(() => {
                    setSelectedItem('');
                    if (itemSelectRef.current) {
                        itemSelectRef.current.focus();
                    }
                }, 50);
            }
        }
    };
    `;
    newCode = newCode.substring(0, afterComp) + refsCode + newCode.substring(afterComp);
}

// 3. Replace the `onChange` of the item select to use `handleItemSelect`.
// Wait, the select currently is: 
// <select className="cart-input" value={selectedItem} onChange={(e) => { ... }}>
const selectRegex = /<select[^>]*?value=\{selectedItem\}[^>]*?onChange=\{\(e\) => \{[\s\S]*?\}\}[^>]*?>/;
newCode = newCode.replace(selectRegex, (match) => {
    return `<select className="cart-input" value={selectedItem} onChange={handleItemSelect} ref={itemSelectRef}>`;
});

// 4. Update the Quantity input to use ref and onKeyDown and onFocus
const qtyRegex = /<input[^>]*?type="number"[^>]*?value=\{tempItem\.quantity\}[^>]*?onChange=\{\(e\).*?\}[^>]*?\/>/;
newCode = newCode.replace(qtyRegex, (match) => {
    return match.replace('/>', ' ref={qtyInputRef} onKeyDown={handleQtyKeyDown} onFocus={(e) => e.target.select()} />');
});

// 5. Update the Price input to use ref and onKeyDown and onFocus
const priceRegex = /<input[^>]*?type="number"[^>]*?value=\{tempItem\.price\}[^>]*?onChange=\{\(e\).*?\}[^>]*?\/>/;
newCode = newCode.replace(priceRegex, (match) => {
    return match.replace('/>', ' ref={priceInputRef} onKeyDown={handlePriceKeyDown} onFocus={(e) => e.target.select()} />');
});

// 6. Rename the component to `NewInstallmentPage`
newCode = newCode.replace('export default function InstallmentsPage() {', 'export default function NewInstallmentPage() {');

// 7. Change the layout of the page so it looks good as a full page.
// In `refactor.js` we changed it to `<div className="page-container" style={{ padding: "20px", background: "var(--background)" }}>`
// We should remove the `modal-overlay` class and `fixed inset-0` tailwind classes if any.
// Just to be safe, replace className="modal-overlay" with className="new-page-container"
newCode = newCode.replace(/className="modal-overlay"/g, 'className="new-page-container"');

fs.writeFileSync(newPageFile, newCode);
console.log('Applied cart improvements to new/page.tsx');
