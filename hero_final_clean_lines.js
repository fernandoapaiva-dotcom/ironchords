const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

function extractLines(startLine, endLine) {
    // line numbers are 1-based
    let block = lines.slice(startLine - 1, endLine).join('\n');
    for (let i = startLine - 1; i < endLine; i++) {
        lines[i] = '// CLEARED';
    }
    return block;
}

const deleteModal = extractLines(4252, 4280);
const saveModal = extractLines(4283, 4344);
const renameModal = extractLines(4675, 4729);

// Batch UI is between 4732 and 5096
const batchUI = extractLines(4732, 5096);

// Final cleanup: replace // CLEARED blocks with single nulls or just join and replace
let content = lines.join('\n');
// We'll replace the cleared blocks with null later or just let them be for now and fix JSX balance

// Actually, let's do it cleaner
let cleanLines = fs.readFileSync(path, 'utf8').split('\n');
const deleteM = cleanLines.slice(4251, 4280).join('\n'); // 4252-1 = 4251
const saveM = cleanLines.slice(4282, 4344).join('\n');
const renameM = cleanLines.slice(4674, 4729).join('\n');
const batchU = cleanLines.slice(4731, 5096).join('\n');

// Build the final content by replacing the blocks
// We use placeholders to replace
let finalContent = fs.readFileSync(path, 'utf8');
finalContent = finalContent.replace(deleteM, 'null');
finalContent = finalContent.replace(saveM, 'null');
finalContent = finalContent.replace(renameM, 'null');
finalContent = finalContent.replace(batchU, 'null');

const injectionMarker = '{/* Share and Import Modals */}';
let iIdx = finalContent.indexOf(injectionPoint = injectionMarker);
if (iIdx !== -1) {
    const rootModals = `
            {/* Extracted Root Modals */}
            ${deleteM}
            ${saveM}
            ${renameM}

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
                            ${batchU}
                        </div>
                    </div>
                </div>
            )}
    `;
    finalContent = finalContent.substring(0, iIdx) + rootModals + '\n            ' + finalContent.substring(iIdx);
}

fs.writeFileSync(path, finalContent, 'utf8');
console.log('✅ Line-based extraction complete!');
