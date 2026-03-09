const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Purge corrupted root modals section
const rootMarker = '{/* Extracted Root Modals */}';
let rStart = content.indexOf(rootMarker);
if (rStart !== -1) {
    let rEnd = content.indexOf('{/* Share and Import Modals */}');
    if (rEnd !== -1) {
        content = content.substring(0, rStart) + rootMarker + '\n' + content.substring(rEnd);
    }
}

// 2. Clear old location fragments
// Delete Modal cleanup
let dIdx = content.indexOf('{/* Delete Confirmation Modal */}');
if (dIdx !== -1) {
    let dEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', dIdx) + 6) + 6);
    if (dEnd !== -1) {
        content = content.substring(0, dIdx) + 'null' + content.substring(dEnd + 6);
    }
}

// Rename Modal cleanup
let rnIdx = content.indexOf('{/* Rename List Modal */}');
if (rnIdx !== -1) {
    let rnEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', rnIdx) + 6) + 6);
    if (rnEnd !== -1) {
        content = content.substring(0, rnIdx) + 'null' + content.substring(rnEnd + 6);
    }
}

// 3. Clean up the Save List Modal location (around line 4300)
// This one is harder to find because of nulls, let's look for a unique string in its original location
let sIdx = content.indexOf('const allPlaylists = JSON.parse(localStorage.getItem(\'iron_chords_playlists\') || \'[]\');');
if (sIdx !== -1 && sIdx < 4800) { // Ensure it's the one in the trapped location
    let sStart = content.lastIndexOf('{', sIdx);
    let sEnd = content.indexOf('})()}', sIdx);
    if (sEnd !== -1) {
        content = content.substring(0, sStart) + 'null' + content.substring(sEnd + 5);
    }
}

// 4. Clean up the Batch UI location (around 4657)
let bLeftover = content.indexOf('null', content.indexOf('listasSubTab === \'lote\' ? (', 4000));
if (bLeftover !== -1) {
    // Already replaced with null by prev script, but let's be sure
}

// 5. Inject Clean Modals
const cleanDeleteModal = "            {deleteModalOpen && (\n" +
    "                <div className=\"fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300\">\n" +
    "                    <div className=\"bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-md flex flex-col\">\n" +
    "                        <div className=\"flex items-center justify-between mb-8\">\n" +
    "                            <div className=\"flex items-center space-x-4\">\n" +
    "                                <div className=\"w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]\"></div>\n" +
    "                                <h3 className=\"text-xl font-black text-white uppercase italic tracking-tighter\">Confirmar Exclusão</h3>\n" +
    "                            </div>\n" +
    "                            <button onClick={() => setDeleteModalOpen(false)} className=\"p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5\"><X className=\"w-5 h-5 text-slate-400\" /></button>\n" +
    "                        </div>\n" +
    "                        <div className=\"space-y-6\">\n" +
    "                            <p className=\"text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed\">\n" +
    "                                Você tem certeza que deseja excluir permanentemente {deleteTarget.type === 'acervo' ? 'a música' : 'a lista'} <span className=\"text-white\">\"{deleteTarget.name}\"</span>?\n" +
    "                            </p>\n" +
    "                            <p className=\"text-[10px] text-red-500/80 italic uppercase\">Esta ação não poderá ser desfeita.</p>\n" +
    "\n" +
    "                            <div className=\"flex items-center space-x-4 mt-6\">\n" +
    "                                <button onClick={() => setDeleteModalOpen(false)} className=\"flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-xl transition-all border border-white/5\">Cancelar</button>\n" +
    "                                <button onClick={confirmDelete} className=\"flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-red-900/20 flex items-center justify-center space-x-2\">\n" +
    "                                    <Trash2 className=\"w-4 h-4\" />\n" +
    "                                    <span>Excluir</span>\n" +
    "                                </button>\n" +
    "                            </div>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            )}";

const cleanSaveModal = "            {saveListModalOpen && (() => {\n" +
    "                const allPlaylists = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');\n" +
    "                const hasExisting = allPlaylists.length > 0;\n" +
    "                return (\n" +
    "                    <div className=\"fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300\">\n" +
    "                        <div className=\"bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-md flex flex-col\">\n" +
    "                            <div className=\"flex items-center justify-between mb-6\">\n" +
    "                                <div className=\"flex items-center space-x-3\">\n" +
    "                                    <div className=\"w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]\"></div>\n" +
    "                                    <h3 className=\"text-xl font-black text-white uppercase italic tracking-tighter\">Salvar Forja</h3>\n" +
    "                                </div>\n" +
    "                                <button onClick={() => { setSaveListModalOpen(false); setSaveListName(''); setSelectedListsToAddTo([]); }} className=\"p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5\"><X className=\"w-5 h-5 text-slate-400\" /></button>\n" +
    "                            </div>\n" +
    "\n" +
    "                            <div className=\"flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6\">\n" +
    "                                <button onClick={() => setSaveListMode('new')} className=\"flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \" + (saveListMode === 'new' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-white')}>+ Nova Lista</button>\n" +
    "                                <button onClick={() => setSaveListMode('existing')} disabled={!hasExisting} className=\"flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed \" + (saveListMode === 'existing' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-white')}>Adicionar à Existente</button>\n" +
    "                            </div>\n" +
    "\n" +
    "                            {saveListMode === 'new' && (\n" +
    "                                <div className=\"space-y-4\">\n" +
    "                                    <div>\n" +
    "                                        <label className=\"block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1\">Nome da Nova Lista</label>\n" +
    "                                        <input type=\"text\" autoFocus placeholder=\"Ex: Missa de Domingo...\" value={saveListName} onChange={e => setSaveListName(e.target.value)} className=\"w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700\" onKeyDown={e => e.key === 'Enter' && handleSaveList()} />\n" +
    "                                    </div>\n" +
    "                                    <button onClick={handleSaveList} disabled={!saveListName.trim()} className=\"w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2\">\n" +
    "                                        <Save className=\"w-4 h-4\" /><span>Criar e Salvar Lista</span>\n" +
    "                                    </button>\n" +
    "                                </div>\n" +
    "                            )}\n" +
    "\n" +
    "                            {saveListMode === 'existing' && (\n" +
    "                                <div className=\"space-y-4\">\n" +
    "                                    <label className=\"block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest ml-1\">Selecione uma ou mais listas</label>\n" +
    "                                    <div className=\"max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10\">\n" +
    "                                        {allPlaylists.map(pl => (\n" +
    "                                            <label key={pl.id} className=\"flex items-center space-x-4 p-4 rounded-2xl border cursor-pointer transition-all \" + (selectedListsToAddTo.includes(pl.id) ? 'bg-[#B87333]/15 border-[#B87333]/40' : 'bg-black/30 border-white/5 hover:border-white/15')}>\n" +
    "                                                <div className=\"w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all \" + (selectedListsToAddTo.includes(pl.id) ? 'bg-[#B87333] border-[#B87333]' : 'border-white/20')}>\n" +
    "                                                    {selectedListsToAddTo.includes(pl.id) && <Check className=\"w-3 h-3 text-white\" />}\n" +
    "                                                </div>\n" +
    "                                                <input type=\"checkbox\" className=\"hidden\" checked={selectedListsToAddTo.includes(pl.id)} onChange={e => {\n" +
    "                                                    if (e.target.checked) setSelectedListsToAddTo(prev => [...prev, pl.id]);\n" +
    "                                                    else setSelectedListsToAddTo(prev => prev.filter(id => id !== pl.id));\n" +
    "                                                }} />\n" +
    "                                                <div className=\"flex-1 min-w-0\">\n" +
    "                                                    <p className=\"font-black text-white text-sm uppercase italic tracking-tight truncate\">{pl.name}</p>\n" +
    "                                                    <p className=\"text-[10px] text-slate-500 font-bold mt-0.5\">{pl.songs?.length || 0} músicas</p>\n" +
    "                                                </div>\n" +
    "                                            </label>\n" +
    "                                        ))}\n" +
    "                                    </div>\n" +
    "                                    <button onClick={handleAddToExistingLists} disabled={selectedListsToAddTo.length === 0} className=\"w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2\">\n" +
    "                                        <FolderHeart className=\"w-4 h-4\" /><span>{selectedListsToAddTo.length > 0 ? ('Adicionar às ' + selectedListsToAddTo.length + ' Lista(s)') : 'Selecione as Listas'}</span>\n" +
    "                                    </button>\n" +
    "                                </div>\n" +
    "                            )}\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                );\n" +
    "            })()}";

const cleanRenameModal = "            {editingList && (\n" +
    "                <div className=\"fixed inset-0 z-[250] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4\">\n" +
    "                    <div className=\"bg-[#16161D] border border-[#B87333]/30 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-lg flex flex-col\">\n" +
    "                        <div className=\"flex items-center justify-between p-8 border-b border-white/5\">\n" +
    "                            <div className=\"flex items-center space-x-4\">\n" +
    "                                <div className=\"w-1.5 h-6 bg-[#B87333] rounded-full\"></div>\n" +
    "                                <h3 className=\"text-xl font-black text-white uppercase italic tracking-tighter\">Renomear Lista</h3>\n" +
    "                            </div>\n" +
    "                            <button onClick={() => setEditingList(null)} className=\"p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all\">\n" +
    "                                <X className=\"w-5 h-5 text-slate-400\" />\n" +
    "                            </button>\n" +
    "                        </div>\n" +
    "                        <div className=\"p-8 space-y-6\">\n" +
    "                            <div>\n" +
    "                                <label className=\"block text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest ml-1\">Novo Nome da Lista</label>\n" +
    "                                <input\n" +
    "                                    type=\"text\"\n" +
    "                                    value={editListName}\n" +
    "                                    onChange={e => setEditListName(e.target.value)}\n" +
    "                                    className=\"w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-lg outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700\"\n" +
    "                                    placeholder=\"Ex: Repertório Show Sábado...\"\n" +
    "                                    autoFocus\n" +
    "                                    onKeyDown={e => {\n" +
    "                                        if (e.key === 'Enter' && editListName.trim()) {\n" +
    "                                            const all = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');\n" +
    "                                            const updated = all.map(pl => pl.id === editingList.id ? { ...pl, name: editListName } : pl);\n" +
    "                                            localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));\n" +
    "                                            setSavedPlaylists(updated);\n" +
    "                                            setEditingList(null);\n" +
    "                                            setShowSaveSuccess(true);\n" +
    "                                            setTimeout(() => setShowSaveSuccess(false), 2000);\n" +
    "                                        }\n" +
    "                                    }}\n" +
    "                                />\n" +
    "                            </div>\n" +
    "                            <button\n" +
    "                                onClick={() => {\n" +
    "                                    if (!editListName.trim()) return;\n" +
    "                                    const all = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');\n" +
    "                                    const updated = all.map(pl => pl.id === editingList.id ? { ...pl, name: editListName } : pl);\n" +
    "                                    localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));\n" +
    "                                    setSavedPlaylists(updated);\n" +
    "                                    setEditingList(null);\n" +
    "                                    setShowSaveSuccess(true);\n" +
    "                                    setTimeout(() => setShowSaveSuccess(false), 2000);\n" +
    "                                }}\n" +
    "                                className=\"w-full py-4 bg-[#B87333] hover:bg-[#A86323] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B87333]/20 flex items-center justify-center space-x-3\"\n" +
    "                            >\n" +
    "                                <Save className=\"w-5 h-5\" />\n" +
    "                                <span>Salvar Novo Nome</span>\n" +
    "                            </button>\n" +
    "                        </div>\n" +
    "                    </div>\n" +
    "                </div>\n" +
    "            )}";

// Fetch Batch UI from the current file
let batchUI = '';
const bStart = content.indexOf('<div className=\"flex flex-col items-center justify-center py-10');
if (bStart !== -1) {
    let bEnd = content.indexOf('</div>', content.lastIndexOf('Salvar no Lote'));
    if (bEnd !== -1) {
        batchUI = content.substring(bStart, bEnd + 6);
    }
}

const finalRootModals = rootMarker + \"\n\" + 
cleanDeleteModal + \"\n\" + 
cleanSaveModal + \"\n\" + 
cleanRenameModal + \"\n\n\" +
\"            {/* Batch Upload Modal */}\\n\" +
\"            {batchModalOpen && (\\n\" +
\"                <div className=\\\"fixed inset-0 z-[300] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 p-4\\\">\\n\" +
\"                    <div className=\\\"bg-[#16161D] border border-white/10 p-8 rounded-[40px] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col relative overflow-hidden\\\">\\n\" +
\"                        <div className=\\\"flex items-center justify-between mb-8 pb-6 border-b border-white/5 shrink-0\\\">\\n\" +
\"                            <div className=\\\"flex items-center space-x-4\\\">\\n\" +
\"                                <div className=\\\"w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]\\\"></div>\\n\" +
\"                                <div>\\n\" +
\"                                    <h2 className=\\\"text-3xl font-black text-white uppercase italic tracking-tighter\\\">Forja em Lote</h2>\\n\" +
\"                                    <p className=\\\"text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1\\\">Importe múltiplos arquivos (.txt, .docx, .pdf)</p>\\n\" +
\"                                </div>\\n\" +
\"                            </div>\\n\" +
\"                            <button onClick={() => { setBatchModalOpen(false); setBatchFiles([]); setBatchResults([]); setBatchLoading(false); setShowMappingUI(false); setShowBatchReview(false); }} className=\\\"p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5 disabled:opacity-50\\\">\\n\" +
\"                                <X className=\\\"w-6 h-6 text-slate-400\\\" />\\n\" +
\"                            </button>\\n\" +
\"                        </div>\\n\" +
\"                        <div className=\\\"flex-1 overflow-y-auto custom-scrollbar pr-4\\\">\\n\" +
\"                            \" + batchUI + \"\\n\" +
\"                        </div>\\n\" +
\"                    </div>\\n\" +
\"                </div>\\n\" +
\"            )}\";

content = content.replace(rootMarker, finalRootModals);

fs.writeFileSync(path, content, 'utf8');
console.log('✅ Surgical repair v2 complete!');
