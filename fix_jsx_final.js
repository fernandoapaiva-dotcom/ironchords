const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
let lines = content.split(/\r?\n/);

// Fix 1: Listas closure (Line 4808 / Index 4807)
// Current: 4808:                             })() }
// Wait, in step 706 it showed: 4808:                             })()}
// I'll use a match to be safe.
if (lines[4807].includes('})()}')) {
    lines[4807] = lines[4807].replace('})()}', '})() )}');
} else if (lines[4807].includes('})() }')) {
    lines[4807] = lines[4807].replace('})() }', '})() )}');
}

// Fix 2: Save List Modal (Line 5192 / Index 5191)
// Current: 5192:                 })()
if (lines[5191].includes('})()')) {
    lines[5191] = lines[5191].replace('})()', '})() )');
}

// Fix 3: Edit Acervo Modal (Line 5307 / Index 5306 is extra)
// Current: 5307:                 )
// 5306:                 )
// 5307:                 )
// 5308:             }
// We remove the line at index 5306.
if (lines[5306].trim() === ')' && lines[5305].trim() === ')') {
    lines.splice(5306, 1);
}

fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log('Final JSX balance fixes applied.');
