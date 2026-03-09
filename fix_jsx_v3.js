const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

// Fixistas 4061/4808
// Current 4061:                             {mainNav === 'listas' && (() => {
// Current 4808:                             })() )}
lines[4060] = lines[4060].replace('{mainNav === \'listas\' && (() => {', '{mainNav === \'listas\' && (() => {'); // Keep it same for now but check 4808
lines[4807] = lines[4807].replace('})() )}', '})() }');

// Fix Save List Modal (Missing IIFE Closure)
// Current 5192:                 )
// Current 5193:             }
lines[5191] = lines[5191].replace(')', '})()');

// Fix Edit Acervo Modal (Extra IIFE Closure)
// Current 5307:             })()
// Current 5308:         }
lines[5306] = lines[5306].replace('})()', ')');

fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('JSX balance fix v3 applied successfully.');
