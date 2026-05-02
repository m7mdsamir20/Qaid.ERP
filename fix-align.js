const fs = require('fs');
const path = require('path');

function fixDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        const fp = path.join(dir, f);
        if (fs.statSync(fp).isDirectory()) {
            fixDir(fp);
        } else if (f.endsWith('.tsx')) {
            let c = fs.readFileSync(fp, 'utf8');
            let n = c;
            // Pattern 1: textAlign: 'start', padding:
            n = n.replace(/textAlign: 'start', padding: '(\d+)px'/g, "textAlign: 'center', padding: '$1px'");
            n = n.replace(/textAlign: 'start', padding: '(\d+)px (\d+)px'/g, "textAlign: 'center', padding: '$1px $2px'");
            // Pattern 2: padding: 'XXpx', textAlign: 'start'
            n = n.replace(/padding: '(\d+)px', textAlign: 'start'/g, "padding: '$1px', textAlign: 'center'");
            n = n.replace(/padding: '(\d+)px (\d+)px', textAlign: 'start'/g, "padding: '$1px $2px', textAlign: 'center'");
            if (c !== n) {
                fs.writeFileSync(fp, n);
                console.log('Fixed:', fp);
            }
        }
    });
}

fixDir(path.join(__dirname, 'src', 'app', 'reports'));
