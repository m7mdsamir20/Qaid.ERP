const fs = require('fs');
const file = 'src/app/pos/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// I'll just remove the literal string "      </div>\r\n            )}"
// or "      </div>\n            )}"
const lines = content.split(/\r?\n/);
for(let i = 0; i < lines.length; i++){
  if(lines[i].includes("      </div>") && lines[i+1] && lines[i+1].includes("            )}")){
     lines.splice(i, 2);
     break;
  }
}
fs.writeFileSync(file, lines.join('\n'), 'utf8');
