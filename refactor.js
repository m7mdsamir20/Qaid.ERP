const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'page.tsx');
const newPageFile = path.join(__dirname, 'src', 'app', 'installments', 'new', 'page.tsx');

let listCode = fs.readFileSync(pageFile, 'utf8');
let newCode = fs.readFileSync(newPageFile, 'utf8');

// 1. In list page, remove the modal render part, but keep state simple.
// The list page renders: {showModal && ( <div className="modal-overlay"> ... </div> )}
// We can just replace the "showModal" state usage.
// Let's find the "إضافة خطة جديدة" button and replace it with a Link.
listCode = listCode.replace(
    /onClick=\{\(\) => setShowModal\(true\)\}/g,
    'onClick={() => window.location.href="/installments/new"}'
);

// We should also remove {showModal && ( ... )} from listCode.
// Because it's a huge block, we can find the start of modal overlay and end.
const modalStartIndex = listCode.indexOf('{showModal && (');
if (modalStartIndex !== -1) {
    // find the matching closing brace.
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

// 2. In the new page, we want to KEEP the modal content but make it the main page content.
// We remove the layout wrapper and replace it with the modal content.
// Wait, the "modal content" has a close button which we should change to a "Back" button or link.
const modalStart2 = newCode.indexOf('{showModal && (');
if (modalStart2 !== -1) {
    let braceCount = 0;
    let modalEnd2 = -1;
    for (let i = modalStart2; i < newCode.length; i++) {
        if (newCode[i] === '{') braceCount++;
        if (newCode[i] === '}') braceCount--;
        if (braceCount === 0) {
            modalEnd2 = i + 1;
            break;
        }
    }
    
    // Extract the inner JSX of the modal
    // '{showModal && (\n <div className="modal-overlay"> ... </div>\n)}'
    let modalJsx = newCode.substring(modalStart2, modalEnd2);
    // Remove '{showModal && (' and ')}'
    modalJsx = modalJsx.replace(/^\{showModal && \(\s*/, '').replace(/\s*\)\}$/, '');
    
    // Replace the main page content with modalJsx.
    // Main page content starts at `<div style={{ minHeight: '100vh'...`
    const mainStart = newCode.indexOf('<div style={{ minHeight: \'100vh\'');
    const mainEnd = newCode.lastIndexOf('</div>');
    // Wait, lastIndexOf('</div>') might be the outermost. 
    // We can replace the `return ( ... );` block.
    const returnStart = newCode.indexOf('return (');
    const returnEnd = newCode.lastIndexOf(');') + 2;
    
    // We want to make the page scrollable and look like a full page.
    modalJsx = modalJsx.replace(/className="modal-overlay".*?>/, 'className="page-container" style={{ padding: "20px", background: "var(--background)" }}>');
    modalJsx = modalJsx.replace(/className="modal-content"/g, 'className="modal-content" style={{ maxWidth: "1200px", margin: "0 auto", height: "auto", maxHeight: "none" }}');
    modalJsx = modalJsx.replace(/onClick=\{\(\) => setShowModal\(false\)\}/g, 'onClick={() => window.location.href="/installments"}');
    
    newCode = newCode.substring(0, returnStart) + 'return (\n' + modalJsx + '\n);\n' + newCode.substring(returnEnd);
}

fs.writeFileSync(pageFile, listCode);
fs.writeFileSync(newPageFile, newCode);
console.log('Refactored basic structure!');
