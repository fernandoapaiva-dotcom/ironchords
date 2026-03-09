const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// === 1. Extract Delete Confirmation Modal ===
// By checking lines 4251-4281 visually
let dStart = content.indexOf('{/* Delete Confirmation Modal */}');
let dEndStr = '</div>\n                    </div>\n                )\n            }';
let dEnd = content.indexOf(dEndStr, dStart);

if (dStart !== -1 && dEnd !== -1) {
    let block = content.substring(dStart, dEnd + dEndStr.length);
    if (block.includes('deleteModalOpen')) {
        content = content.replace(block, '');
        let targetRoot = content.indexOf('{/* Rename List Modal */}');
        if (targetRoot !== -1) {
            content = content.slice(0, targetRoot) + block + '\n\n            ' + content.slice(targetRoot);
            changes++;
            console.log('✅ Extracted Delete Modal.');
        }
    }
}

// === 2. Extract Save List Modal ===
// It's right after Delete Modal, ends with `})()\n            }`
let sStart = content.indexOf('{/* Save List Modal */}');
let sEndStr = '})()\n            }';
let sEnd = content.indexOf(sEndStr, sStart);

if (sStart !== -1 && sEnd !== -1) {
    let block = content.substring(sStart, sEnd + sEndStr.length);
    if (block.includes('saveListModalOpen')) {
        content = content.replace(block, '');
        let targetRoot = content.indexOf('{/* Rename List Modal */}');
        if (targetRoot !== -1) {
            content = content.slice(0, targetRoot) + block + '\n\n            ' + content.slice(targetRoot);
            changes++;
            console.log('✅ Extracted Save List Modal.');
        }
    }
}

// === 3. Fix the "Lote" Button in Listas ===
// Find the Search Bar in Listas tab and add the lote trigger next to it
const searchBarStart = '<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />';
let searchBarIdx = content.indexOf(searchBarStart);

if (searchBarIdx !== -1) {
    let parentStartIdx = content.lastIndexOf('<div className="relative mb-3">', searchBarIdx);
    if (parentStartIdx !== -1) {
        const newHeader = `
                                        <div className="flex items-center gap-2 mb-3 shrink-0">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                                <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />
                                            </div>
                                            <button onClick={() => setBatchModalOpen(true)} className="p-3 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-xl border border-[#B87333]/20 transition-all" title="Importação em Lote">
                                                <UploadCloud className="w-4 h-4" />
                                            </button>
                                        </div>
        `;
        let searchBlockEnd = content.indexOf('</div>', searchBarIdx) + 6;
        let oldSearchBlock = content.substring(parentStartIdx, searchBlockEnd);

        content = content.replace(oldSearchBlock, newHeader);
        changes++;
        console.log('✅ Added Lote button to sidebar search.');
    }
}

// === 4. Extract Batch Upload Logic ===
const batchStartMarker = 'listasSubTab === \'lote\' ? (';
let batchStartIdx = content.indexOf(batchStartMarker);

if (batchStartIdx !== -1) {
    const startString = `<div className="flex flex-col items-center justify-center py-10`;
    let batchUiStartIdx = content.indexOf(startString);
    if (batchUiStartIdx !== -1) {
        let depth = 0;
        let batchUiEndIdx = -1;
        let tempStr = content.substring(batchUiStartIdx);
        for (let i = 0; i < tempStr.length; i++) {
            if (tempStr.substring(i, i + 4) === '<div') depth++;
            else if (tempStr.substring(i, i + 5) === '</div') {
                depth--;
                if (depth === 0) {
                    batchUiEndIdx = batchUiStartIdx + i + 6;
                    break;
                }
            }
        }

        if (batchUiEndIdx !== -1) {
            let batchBlock = content.substring(batchUiStartIdx, batchUiEndIdx);

            // Reconstruct as a modal
            let batchModal = `
            {/* Batch Upload Modal */}
            {batchModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-500 p-4">
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

                // Now blank out the old branch
                content = content.replace(batchBlock, '<div className="hidden">Old Batch UI</div>');
                changes++;
                console.log('✅ Extracted Batch Modal.');
            }
        }
    }
}

// === 5. Add state ===
const stateInsertionMarker = 'const [batchResults, setBatchResults] = useState([]);';
if (content.includes(stateInsertionMarker) && !content.includes('batchModalOpen')) {
    content = content.replace(stateInsertionMarker, stateInsertionMarker + '\n    const [batchModalOpen, setBatchModalOpen] = useState(false);');
    changes++;
    console.log('✅ Added state variables.');
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
} else {
    console.log('❌ No changes made.');
}
