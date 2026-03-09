const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function extractAndReplace(startMarker, endMarker, replacement = 'null') {
    let sIdx = content.indexOf(startMarker);
    if (sIdx === -1) return null;
    let nextBraceIdx = content.indexOf('}', sIdx);
    let eIdx = content.indexOf(endMarker, sIdx);
    if (eIdx === -1) return null;

    // We want to capture the whole block
    // For our modals, they start with { and end with } and are after a comment
    let realStart = content.lastIndexOf('{', sIdx);
    let realEnd = content.indexOf('}', eIdx) + 1;

    let block = content.substring(realStart, realEnd);
    content = content.substring(0, realStart) + replacement + content.substring(realEnd);
    return block;
}

// 1. Extract Modals
// Delete Modal
let deleteModal = extractAndReplace('{/* Delete Confirmation Modal */}', '<Trash2 className="w-4 h-4" />');
// Save Modal (using unique string inside)
let saveModal = extractAndReplace('{/* Save List Modal */}', 'handleAddToExistingLists');
// Rename Modal
let renameModal = extractAndReplace('{/* Rename List Modal */}', 'Renomear Lista');

// 2. Extract Batch UI
let batchUI = '';
let bStartIdx = content.indexOf('<div className="flex flex-col items-center justify-center py-10');
if (bStartIdx !== -1) {
    let bEndIdx = content.indexOf('</div>', content.indexOf('Salvar no Lote'));
    if (bEndIdx !== -1) {
        batchUI = content.substring(bStartIdx, bEndIdx + 6);
        content = content.substring(0, bStartIdx) + 'null' + content.substring(bEndIdx + 6);
    }
}

// 3. Inject into Root
const injectionMarker = '{/* Share and Import Modals */}';
let iIdx = content.indexOf(injectionMarker);
if (iIdx !== -1) {
    const rootModals = `
            {/* Extracted Root Modals */}
            ${deleteModal}
            ${saveModal}
            ${renameModal}

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
                            ${batchUI}
                        </div>
                    </div>
                </div>
            )}
    `;
    content = content.substring(0, iIdx) + rootModals + '\n            ' + content.substring(iIdx);
}

fs.writeFileSync(path, content, 'utf8');
console.log('✅ Final extraction complete!');
