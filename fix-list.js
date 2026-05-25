const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src', 'app', 'installments', 'page.tsx');
let code = fs.readFileSync(pageFile, 'utf8');

// 1. Change button click handler
code = code.replace(/onClick: \(\) => setShowNew\(true\)/g, 'onClick: () => router.push("/installments/new")');

// 2. Remove AppModal block
const modalStart = code.indexOf('<AppModal');
if (modalStart !== -1) {
    // Find the end of AppModal by counting braces and tags?
    // Actually, we can just find `</AppModal>`
    const modalEndStr = '</AppModal>';
    const modalEnd = code.lastIndexOf(modalEndStr);
    if (modalEnd !== -1) {
        code = code.substring(0, modalStart) + code.substring(modalEnd + modalEndStr.length);
    }
}

// 3. We should also remove all the state and unused code inside the list page, but for safety (to avoid TS errors), we can leave them for now, or just remove them if we are confident. 
// Since TS is complaining if we remove things partially, let's just leave the unused variables (they won't break the build since TS might just warn, wait we are using strict? Next.js fails build on unused vars sometimes).
// The unused vars will be `showNew`, `form`, `cart`, `items` etc. 
// Let's see if we can easily prune them. 
// Actually, in TS, unused vars just give warnings unless configured otherwise. But let's check. 
fs.writeFileSync(pageFile, code);
console.log("List page cleaned up!");
