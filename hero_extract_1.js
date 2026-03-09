const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// 1. Extract Delete Confirmation and Save List Modals from dead code
// They are around lines 4251 - 4339
const startDeleteModal = '{/* Delete Confirmation Modal */}';
const startSaveModal = '{/* Save List Modal */}';

// Find end of Save Modal
let deleteModalIdx = content.indexOf(startDeleteModal);
let saveModalIdx = content.indexOf(startSaveModal);

if (deleteModalIdx !== -1 && saveModalIdx !== -1) {
    // The save modal ends with:
    //                                         </div>
    //                                     </div>
    //                                 </div>
    //                             );
    //                         })()
    //                     }
    // Just find `                           })()\n                        }` after Save List Modal

    let closureIdx = content.indexOf('})()', saveModalIdx);
    if (closureIdx !== -1) {
        let endIdx = content.indexOf('}', closureIdx) + 1;
        let modalsBlock = content.substring(deleteModalIdx, endIdx);

        // Remove from current position
        content = content.replace(modalsBlock, '');

        // Add to the root, right before `{/* Share and Import Modals */}`
        let rootTarget = content.indexOf('{/* Share and Import Modals */}');
        if (rootTarget !== -1) {
            content = content.slice(0, rootTarget) + modalsBlock + '\n\n            ' + content.slice(rootTarget);
            changes++;
            console.log('✅ Moved Delete and Save modals to root.');
        }
    }
}

// 2. Add Lote button to Listas Sidebar
// In the Sidebar Tab Listas `playerSidebarTab === 'listas'` we have the search bar.
// `                                        <div className="relative mb-3 flex-shrink-0">`
const searchBarStart = '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />';
let searchBarIdx = content.indexOf(searchBarStart);

if (searchBarIdx !== -1) {
    // Look for the parent relative container: `<div className="relative mb-3 flex-shrink-0">`
    let parentStartIdx = content.lastIndexOf('<div className="relative mb-3 flex-shrink-0">', searchBarIdx);

    // Change this container to a flex row to fit the batch upload button next to it
    const newHeader = `
                                        <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                                <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />
                                            </div>
                                            <button onClick={() => setBatchModalOpen(true)} className="p-3 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-xl border border-[#B87333]/30 transition-all" title="Importação em Lote">
                                                <UploadCloud className="w-4 h-4" />
                                            </button>
                                        </div>
    `;

    // We need to replace the whole `div` block of the search bar
    let searchBlockEnd = content.indexOf('</div>', searchBarIdx) + 6;
    let oldSearchBlock = content.substring(parentStartIdx, searchBlockEnd);

    content = content.replace(oldSearchBlock, newHeader);
    changes++;
    console.log('✅ Replaced sidebar search block with search + lote button.');
}

// 3. Prepare state for Batch Modal
// Needs `const [batchModalOpen, setBatchModalOpen] = useState(false);`
const stateInsertionMarker = 'const [batchResults, setBatchResults] = useState([]);';
if (content.includes(stateInsertionMarker) && !content.includes('batchModalOpen')) {
    content = content.replace(stateInsertionMarker, stateInsertionMarker + '\n    const [batchModalOpen, setBatchModalOpen] = useState(false);');
    changes++;
    console.log('✅ Added batchModalOpen state.');
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
} else {
    console.log('❌ No changes made.');
}
