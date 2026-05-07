const fs = require('fs');
const file = 'src/App.jsx';
let c = fs.readFileSync(file, 'utf8');
const lines = c.split('\n');
lines[1385] = '                          {content.content.split("\\n").filter(Boolean).map((para,pi)=>(';
fs.writeFileSync(file, lines.join('\n'));
console.log('Fixed line 1386');
