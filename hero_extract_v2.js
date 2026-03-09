const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

function moveBlock(startMarker, endMarker, targetMarker) {
    let startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
        console.log('❌ Start marker not found: ' + startMarker);
        return;
    }

    let endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) {
        console.log('❌ End marker not found: ' + endMarker + ' after ' + startMarker);
        return;
    }

    let block = content.substring(startIdx, endIdx + endMarker.length);
    content = content.replace(block, '');

    let targetIdx = content.indexOf(targetMarker);
    if (targetIdx === -1) {
        console.log('❌ Target marker not found: ' + targetMarker);
        // Put it back? No, let's just fail.
        return;
    }

    content = content.slice(0, targetIdx) + block + '\n\n' + content.slice(targetIdx);
    changes++;
    console.log('✅ Moved block starting with: ' + startMarker);
}

// === 1. Extract Delete Confirmation Modal ===
// It ends just before Save List Modal
let dStartMarker = '{/* Delete Confirmation Modal */}';
let dEndMarker = '            }'; // This is risky but let's be more specific
// Let's find the closing brace of the deleteModalOpen block.
let dIdx = content.indexOf(dStartMarker);
if (dIdx !== -1) {
    let nextComment = content.indexOf('{/* Save List Modal */}', dIdx);
    if (nextComment !== -1) {
        let block = content.substring(dIdx, nextComment).trim();
        // The block should end with }
        if (block.endsWith('}')) {
            content = content.replace(block, '');
            let targetRoot = content.indexOf('{/* Rename List Modal */}');
            if (targetRoot !== -1) {
                content = content.slice(0, targetRoot) + block + '\n\n            ' + content.slice(targetRoot);
                changes++;
                console.log('✅ Extracted Delete Modal.');
            }
        } else {
            console.log('❌ Delete block did not end with } as expected.');
        }
    }
}

// === 2. Extract Save List Modal ===
// It's followed by `)()} \n </div> \n </div>` in the original trapped code
let sStartMarker = '{/* Save List Modal */}';
let sIdx = content.indexOf(sStartMarker);
if (sIdx !== -1) {
    let endMarker = '})()';
    let endIdx = content.indexOf(endMarker, sIdx);
    if (endIdx !== -1) {
        // Find the next } after })()
        let finalBraceIdx = content.indexOf('}', endIdx);
        if (finalBraceIdx !== -1) {
            let block = content.substring(sIdx, finalBraceIdx + 1).trim();
            content = content.replace(block, '');
            let targetRoot = content.indexOf('{/* Rename List Modal */}');
            if (targetRoot !== -1) {
                content = content.slice(0, targetRoot) + block + '\n\n            ' + content.slice(targetRoot);
                changes++;
                console.log('✅ Extracted Save List Modal.');
            }
        }
    }
}

// === 3. Add Lote button to Sidebar ===
const searchBarInputMarker = 'placeholder="Buscar lista..."';
let searchIdx = content.indexOf(searchBarInputMarker);
if (searchIdx !== -1 && !content.includes('setBatchModalOpen(true)')) {
    // Find the parent div of the search input
    let parentStart = content.lastIndexOf('<div', searchIdx);
    let parentEnd = content.indexOf('</div>', searchIdx) + 6;
    let oldSearchBlock = content.substring(parentStart, parentEnd);

    const newHeader = `
                                        <div className="flex items-center gap-2 mb-3 shrink-0">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                                <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />
                                            </div>
                                            <button onClick={() => setBatchModalOpen(true)} className="p-3 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-xl border border-[#B87333]/20 transition-all" title="Importação em Lote">
                                                <UploadCloud className="w-4 h-4" />
                                            </button>
                                        </div>`;

    content = content.replace(oldSearchBlock, newHeader);
    changes++;
    console.log('✅ Added Lote button.');
}

// === 4. Extract Batch Upload Logic ===
const batchUIStartMarker = '<div className="flex flex-col items-center justify-center py-10';
let bStartIdx = content.indexOf(batchUIStartMarker);
if (bStartIdx !== -1 && content.includes('listasSubTab === \'lote\'')) {
    // Find the end of this div by counting depth
    let depth = 0;
    let bEndIdx = -1;
    let tempStr = content.substring(bStartIdx);
    for (let i = 0; i < tempStr.length; i++) {
        if (tempStr.substring(i, i + 4) === '<div') depth++;
        else if (tempStr.substring(i, i + 5) === '</div') {
            depth--;
            if (depth === 0) {
                bEndIdx = bStartIdx + i + 6;
                break;
            }
        }
    }

    if (bEndIdx !== -1) {
        let batchBlock = content.substring(bStartIdx, bEndIdx);

        let batchModal = `
            {/* Batch Upload Modal */}
            {batchModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 p-4">
                    <div className="bg-[#16161D] border border-white/10 p-8 rounded-[40px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5 shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Forja em Lote</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Importe múltiplos arquivos (.txt, .docx, .pdf)</p>
                                </div>
                            </div>
                            <button onClick={() => { setBatchModalOpen(false); setBatchFiles([]); setBatchResults([]); setBatchLoading(false); setShowMappingUI(false); setShowBatchReview(false); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 disabled:opacity-50">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                            ${batchBlock}
                        </div>
                    </div>
                </div>
            )}`;

        let targetRoot = content.indexOf('{/* Rename List Modal */}');
        if (targetRoot !== -1) {
            content = content.slice(0, targetRoot) + batchModal + '\n\n            ' + content.slice(targetRoot);
            // Replace old block with placeholder to keep structure or just remove
            content = content.replace(batchBlock, '<div className="hidden text-slate-800">Batch UI moved</div>');
            changes++;
            console.log('✅ Extracted Batch Modal.');
        }
    }
}

// === 5. Add batchModalOpen state (if not already there) ===
if (!content.includes('batchModalOpen')) {
    const stateMarker = 'const [batchResults, setBatchResults] = useState([]);';
    content = content.replace(stateMarker, stateMarker + '\n    const [batchModalOpen, setBatchModalOpen] = useState(false);');
    changes++;
    console.log('✅ Added state.');
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
} else {
    console.log('❌ No changes made.');
}
