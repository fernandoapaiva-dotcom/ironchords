const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// Line 5192 (index 5191):  currently "                })()}"
// showSaveConflict block opened with:
//   { showSaveConflict && (   <- simple conditional, NOT an IIFE
// So the correct closing is:
//   )  <- closes the && (
//   }  <- closes the JSX expression {
// Fix: replace "                })()}" with "                )}" 
if (lines[5191].trim() === '})()}') {
    lines[5191] = '                )}';
    console.log('Fixed line 5192: replaced })()}  with  )}');
} else {
    console.log('Line 5191 is:', JSON.stringify(lines[5191]));
}

fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
