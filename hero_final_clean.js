const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Precise Extraction using substrings (cleaner than line numbers)
function extract(startStr, endStr) {
    let s = content.indexOf(startStr);
    if (s === -1) return null;
    let e = content.indexOf(endStr, s);
    if (e === -1) return null;
    let block = content.substring(s, e + endStr.length);
    content = content.substring(0, s) + 'null' + content.substring(e + endStr.length);
    return block;
}

// Extract the 3 modals
const deleteModal = extract('{/* Delete Confirmation Modal */}', '                )');
const saveModal = extract('{/* Save List Modal */}', '                )()}');
const renameModal = extract('{/* Rename List Modal */}', '            )}');

// Extract Batch UI
let batchUI = '';
const batchStart = '<div className="flex flex-col items-center justify-center py-10';
const batchEnd = 'Salvar no Lote';
let bS = content.indexOf(batchStart);
if (bS !== -1) {
    let bE = content.indexOf('</div>', content.lastIndexOf(batchEnd));
    if (bE !== -1) {
        batchUI = content.substring(bS, bE + 6);
        content = content.substring(0, bS) + 'null' + content.substring(bE + 6);
    }
}

// 2. Injection at Root
const injectionPoint = '{/* Share and Import Modals */}';
let iIdx = content.indexOf(injectionPoint);
if (iIdx !== -1) {
    const rootModals = `
            {/* Extracted Root Modals */}
            {deleteModalOpen && (
${deleteModal.split('\n').slice(2, -1).join('\n')}
            )}

            {saveListModalOpen && (() => {
${saveModal.split('\n').slice(3, -1).join('\n')}
            })()}

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
console.log('✅ Clean extraction complete!');
