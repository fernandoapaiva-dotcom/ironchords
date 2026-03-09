const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

function extractBlock(marker, startText, endText) {
    let sIdx = content.indexOf(marker);
    if (sIdx === -1) return null;

    // Find the actual start of the JSX block (the first { or < after the marker)
    let bStart = content.indexOf(startText, sIdx);
    if (bStart === -1) return null;

    let depth = 0;
    let bEnd = -1;
    for (let i = bStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
            depth--;
            if (depth === 0) {
                bEnd = i + 1;
                break;
            }
        }
    }
    if (bEnd === -1) return null;
    return content.substring(bStart, bEnd);
}

// 1. Extract Delete Modal
const deleteModal = extractBlock('{/* Delete Confirmation Modal */}', 'deleteModalOpen && (', ')');
// Special case for Batch UI which uses a different structure
const batchStartMarker = 'flex flex-col items-center justify-center py-10';
let bIdx = content.indexOf(batchStartMarker);
let batchUIBlock = null;
if (bIdx !== -1) {
    // Search upwards for the <div that starts it
    let divStart = content.lastIndexOf('<div', bIdx);
    let depth = 0;
    let bEnd = -1;
    for (let i = divStart; i < content.length; i++) {
        if (content.substring(i, i + 4) === '<div') depth++;
        else if (content.substring(i, i + 5) === '</div') {
            depth--;
            if (depth === 0) { bEnd = i + 6; break; }
        }
    }
    batchUIBlock = content.substring(divStart, bEnd);
}

const saveModal = extractBlock('{/* Save List Modal */}', 'saveListModalOpen && (', ')');
const renameModal = extractBlock('{/* Rename List Modal */}', 'editingList && (', ')');

// 2. Remove originals
if (deleteModal) content = content.replace(deleteModal, 'null');
if (saveModal) content = content.replace(saveModal, 'null');
if (renameModal) content = content.replace(renameModal, 'null');
if (batchUIBlock) content = content.replace(batchUIBlock, 'null');

// 3. Construct Root Injection
const batchModalWrapped = `
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
                            ${batchUIBlock}
                        </div>
                    </div>
                </div>
            )}`;

const rootModals = `
            {/* Extracted Root Modals */}
            {${deleteModal}}
            {${saveModal}}
            {${renameModal}}
            ${batchModalWrapped}
`;

// 4. Inject before final modas
const injectionPoint = '{/* Share and Import Modals */}';
content = content.replace(injectionPoint, rootModals + '\n\n            ' + injectionPoint);

fs.writeFileSync(path, content, 'utf8');
console.log('✅ Final extraction complete!');
