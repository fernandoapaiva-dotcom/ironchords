const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Get the Batch UI block
const batchStart = '<div className="flex flex-col items-center justify-center py-10';
let bIdx = content.lastIndexOf(batchStart); // Get the one that is NOT in the modal (the modal one currently has a placeholder)
if (bIdx === -1) {
    console.log('Batch UI start not found');
    process.exit(1);
}

let depth = 0;
let bEndIdx = -1;
let tempStr = content.substring(bIdx);
for (let i = 0; i < tempStr.length; i++) {
    if (tempStr.substring(i, i + 4) === '<div') depth++;
    else if (tempStr.substring(i, i + 5) === '</div') {
        depth--;
        if (depth === 0) {
            bEndIdx = bIdx + i + 6;
            break;
        }
    }
}

if (bEndIdx === -1) {
    console.log('Batch UI end not found');
    process.exit(1);
}

let batchUIBlock = content.substring(bIdx, bEndIdx);

// 2. Put it into the root modal (replace placeholder)
const placeholder = '<div className="hidden text-slate-800">Batch UI moved</div>';
content = content.replace(placeholder, batchUIBlock);

// 3. Remove the original Batch UI and the surrounding dead ternary/divs
// The ternary starts at line 4766: `) : (` and ends at 5096: `}`
// Actually let's just replace the block itself with nothing and then clean up the ternary manually or via specific markers.
content = content.replace(batchUIBlock, 'null');

// 4. Clean up the leftover Save List Modal at 4652-4684 area
// It starts with `{saveListModalOpen && ...`
const saveModalMarker = '{/* Save List Modal */}';
let sIdx = content.indexOf(saveModalMarker);
// We want the one that is NOT in the root area.
// The root area is after line 4700.
// Let's find all occurrences.
let occurrences = [];
let lastIdx = -1;
while ((lastIdx = content.indexOf(saveModalMarker, lastIdx + 1)) !== -1) {
    occurrences.push(lastIdx);
}

if (occurrences.length > 1) {
    // Delete the first one (the old one)
    let sStart = occurrences[0];
    // Find the end: `})()\n            }`
    let sEnd = content.indexOf('})()\n            }', sStart);
    if (sEnd !== -1) {
        let blockToDelete = content.substring(sStart, sEnd + 18);
        content = content.replace(blockToDelete, '');
        console.log('✅ Removed old Save List Modal copy');
    }
}

// 5. Clean up the Delete Modal old copy if it exists
const deleteModalMarker = '{/* Delete Confirmation Modal */}';
let dOccurrences = [];
lastIdx = -1;
while ((lastIdx = content.indexOf(deleteModalMarker, lastIdx + 1)) !== -1) {
    dOccurrences.push(lastIdx);
}
if (dOccurrences.length > 1) {
    let dStart = dOccurrences[0];
    let dEnd = content.indexOf('}\n                )\n            }', dStart);
    if (dEnd !== -1) {
        let blockToDelete = content.substring(dStart, dEnd + 33);
        content = content.replace(blockToDelete, '');
        console.log('✅ Removed old Delete Modal copy');
    }
}

// 6. Fix the broken ternary at original batch location
// Looking at line 4765 in previous view_file: `</div>\n                                                ) : (`
content = content.replace(/<\/div>\s+\)\s+:\s+\(\s+null\s+\)/g, '</div>');
// Also handle the case where it might be slightly different
content = content.replace(/\)\s+:\s+\(\s+null\s+\)/g, '');

fs.writeFileSync(path, content, 'utf8');
console.log('🚀 Surgical fix complete!');
