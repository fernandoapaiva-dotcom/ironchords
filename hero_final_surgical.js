const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function replaceBlock(startMarker, endMarker, replacement) {
    let sIdx = content.indexOf(startMarker);
    if (sIdx === -1) {
        console.log('Start marker not found:', startMarker);
        return false;
    }
    let eIdx = content.indexOf(endMarker, sIdx + startMarker.length);
    if (eIdx === -1) {
        console.log('End marker not found:', endMarker);
        return false;
    }
    content = content.substring(0, sIdx) + replacement + content.substring(eIdx + endMarker.length);
    return true;
}

// 1. Move root anchor to a safer place (before ShareModal)
const rootAnchor = '{/* Extracted Root Modals */}';
if (content.indexOf(rootAnchor) === -1) {
    let shareIdx = content.indexOf('{/* Share and Import Modals */}');
    if (shareIdx !== -1) {
        content = content.substring(0, shareIdx) + rootAnchor + '\n            ' + content.substring(shareIdx);
    }
}

// 2. Clear original locations
replaceBlock('{/* Delete Confirmation Modal */}', '{/* Save List Modal */}',
    '{/* Delete Confirmation Modal */}\n                                                    null\n\n                                                    ');

replaceBlock('{/* Save List Modal */}', '{/* Rename List Modal */}',
    '{/* Save List Modal */}\n                                                    null\n\n                                                    ');

replaceBlock('{/* Rename List Modal */}', '</div>',
    '{/* Rename List Modal */}\n                                                    null\n                                                ');

// 3. Clear the Batch UI block
// It starts with <div className="flex flex-col items-center justify-center py-10
// and ends with the next </div>
let bStartIdx = content.indexOf('<div className="flex flex-col items-center justify-center py-10');
if (bStartIdx !== -1) {
    let bEndIdx = content.indexOf('</div>', bStartIdx);
    // There are many nested divs in Batch UI, so let's find the one that corresponds to the end of that condition
    // In our case, it's before the next alternative branch or end of sub-tab
    let subTabEnd = content.indexOf('</div>', content.indexOf('Salvar no Lote'));
    if (subTabEnd !== -1) {
        content = content.substring(0, bStartIdx) + 'null' + content.substring(subTabEnd + 6);
    }
}

fs.writeFileSync(path, content, 'utf8');
console.log('✅ Surgical repair complete!');
