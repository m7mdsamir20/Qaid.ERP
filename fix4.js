const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("      </div>\r\n            )}", "");
content = content.replace("      </div>\n            )}", "");

fs.writeFileSync(file, content, 'utf8');
console.log("Done");
