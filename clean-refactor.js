const fs = require('fs');
const path = require('path');

// 1. Copy page.tsx (the current clean one with the modal) to new/page.tsx
const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'page.tsx');
const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');

let code = fs.readFileSync(pageFile, 'utf8');

// The new page should have `useRef`
code = code.replace(/import React, \{ useState, useEffect, useCallback \} from 'react';/, "import React, { useState, useEffect, useCallback, useRef } from 'react';");

// 2. We need to find `setTempItem` and `addToCart` definitions inside the component so we can place our hooks AFTER them.
// Wait, why don't we just place our hooks right before `const calculateTotals = `
const calculateTotalsIndex = code.indexOf('const calculateTotals =');

const hooksCode = `
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

code = code.substring(0, calculateTotalsIndex) + hooksCode + code.substring(calculateTotalsIndex);

// Replace select
const selectRegex = /<select[^>]*?value=\{selectedItem\}[^>]*?onChange=\{\(e\) => \{[\s\S]*?\}\}[^>]*?>/;
code = code.replace(selectRegex, `<select className="cart-input" value={selectedItem} onChange={handleItemSelect} ref={itemSelectRef}>`);

// Replace Quantity
const qtyRegex = /<input[^>]*?type="number"[^>]*?value=\{tempItem\.quantity\}[^>]*?onChange=\{\(e\) => \{[\s\S]*?\}\}[^>]*?\/>/;
code = code.replace(qtyRegex, (match) => {
    return match.replace('/>', ' ref={qtyInputRef} onKeyDown={handleQtyKeyDown} onFocus={(e) => e.target.select()} />');
});

// Replace Price
const priceRegex = /<input[^>]*?type="number"[^>]*?value=\{tempItem\.price\}[^>]*?onChange=\{\(e\) => \{[\s\S]*?\}\}[^>]*?\/>/;
code = code.replace(priceRegex, (match) => {
    return match.replace('/>', ' ref={priceInputRef} onKeyDown={handlePriceKeyDown} onFocus={(e) => e.target.select()} />');
});

// Change component name
code = code.replace('export default function InstallmentsPage() {', 'export default function NewInstallmentPage() {');

// Replace the main UI with just the modal content.
const modalStart2 = code.indexOf('{showModal && (');
if (modalStart2 !== -1) {
    let braceCount = 0;
    let modalEnd2 = -1;
    for (let i = modalStart2; i < code.length; i++) {
        if (code[i] === '{') braceCount++;
        if (code[i] === '}') braceCount--;
        if (braceCount === 0) {
            modalEnd2 = i + 1;
            break;
        }
    }
    
    let modalJsx = code.substring(modalStart2, modalEnd2);
    modalJsx = modalJsx.replace(/^\{showModal && \(\s*/, '').replace(/\s*\)\}$/, '');
    
    const returnStart = code.indexOf('return (');
    const returnEnd = code.lastIndexOf(');') + 2;
    
    modalJsx = modalJsx.replace(/className="modal-overlay".*?>/, 'className="page-container" style={{ padding: "20px", background: "var(--background)", minHeight: "100vh" }}>');
    modalJsx = modalJsx.replace(/className="modal-content"/g, 'className="modal-content" style={{ maxWidth: "1200px", margin: "0 auto", height: "auto", maxHeight: "none", boxShadow: "none" }}');
    modalJsx = modalJsx.replace(/onClick=\{\(\) => setShowModal\(false\)\}/g, 'onClick={() => window.location.href="/installments"}');
    
    code = code.substring(0, returnStart) + 'return (\n<DashboardLayout>\n' + modalJsx + '\n</DashboardLayout>\n);\n' + code.substring(returnEnd);
}

fs.writeFileSync(newPageFile, code);
console.log('Clean new page generated!');

// Now clean the main page (page.tsx)
let listCode = fs.readFileSync(pageFile, 'utf8');
listCode = listCode.replace(
    /onClick=\{\(\) => setShowModal\(true\)\}/g,
    'onClick={() => router.push("/installments/new")}'
);

const modalStartIndex = listCode.indexOf('{showModal && (');
if (modalStartIndex !== -1) {
    let braceCount = 0;
    let modalEndIndex = -1;
    for (let i = modalStartIndex; i < listCode.length; i++) {
        if (listCode[i] === '{') braceCount++;
        if (listCode[i] === '}') braceCount--;
        if (braceCount === 0) {
            modalEndIndex = i + 1;
            break;
        }
    }
    if (modalEndIndex !== -1) {
        listCode = listCode.substring(0, modalStartIndex) + listCode.substring(modalEndIndex);
    }
}
fs.writeFileSync(pageFile, listCode);
console.log('Clean list page generated!');

