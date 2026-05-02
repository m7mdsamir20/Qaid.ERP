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
            
            // Add flex column centering to all empty state containers we previously modified
            n = n.replace(/textAlign: 'center', padding: '120px'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px'");
            n = n.replace(/textAlign: 'center', padding: '100px'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '100px'");
            n = n.replace(/textAlign: 'center', padding: '80px'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px'");
            n = n.replace(/textAlign: 'center', padding: '60px'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '60px'");
            
            n = n.replace(/padding: '120px', textAlign: 'center'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px', textAlign: 'center'");
            n = n.replace(/padding: '100px', textAlign: 'center'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px', textAlign: 'center'");
            n = n.replace(/padding: '80px', textAlign: 'center'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', textAlign: 'center'");
            n = n.replace(/padding: '60px', textAlign: 'center'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', textAlign: 'center'");

            n = n.replace(/textAlign: 'center', padding: '120px 20px'/g, "display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 20px'");

            if (c !== n) {
                fs.writeFileSync(fp, n);
                console.log('Fixed:', fp);
            }
        }
    });
}

fixDir(path.join(__dirname, 'src', 'app'));
