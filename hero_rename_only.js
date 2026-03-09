const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// 1. Simplify the Sidebar Edit Button
// Old trigger had a lot of song enrichment logic.
const oldButtonTrigger = `<button onClick={() => {
                                                                const enriched = (pl.songs || []).map(s => ({
                                                                    ...s,
                                                                    include_tabs: s.include_tabs !== false,
                                                                    capo: s.capo || 0,
                                                                    _orig_key: s._orig_key || s.sounding_key || s.song_key || 'C',
                                                                    _orig_content: s._orig_content || s.content || ''
                                                                }));
                                                                setEditingList({ ...pl, songs: enriched });
                                                                setEditListName(pl.name);
                                                            }} className="p-2 bg-white/5 hover:bg-[#B87333]/20 text-slate-500 hover:text-[#B87333] rounded-lg transition-all" title="Editar Lista"><Edit3 className="w-3.5 h-3.5" /></button>`;

const newButtonTrigger = `<button onClick={() => {
                                                                setEditingList(pl);
                                                                setEditListName(pl.name);
                                                            }} className="p-2 bg-white/5 hover:bg-[#B87333]/20 text-slate-500 hover:text-[#B87333] rounded-lg transition-all" title="Renomear Lista"><Edit3 className="w-3.5 h-3.5" /></button>`;

if (content.includes(oldButtonTrigger)) {
    content = content.replace(oldButtonTrigger, newButtonTrigger);
    console.log('✅ Simplified Sidebar Edit Button');
    changes++;
}

// 2. Replace the complex editingList modal with a compact one
// The modal starts around line 4681 with `{/* Edit List Modal */}` and `{editingList && (`
// It ends around line 4951 with `)}`

let modalStartMarker = '{/* Edit List Modal */}';
let modalEndMarker = '                                                    )}'; // This needs to be precise relative to the block.

let startIdx = content.indexOf(modalStartMarker);
if (startIdx !== -1) {
    // We need to find the correct closing parenthesis for `{editingList && (`
    // It's followed by `</div>` or some other block.
    // Based on previous view_file, it's followed by `</div>\n                                                </div>\n                                            ) : (` (around 4952)

    let nextBlockMarker = `) : (`;
    let endIdx = content.indexOf(nextBlockMarker, startIdx);

    if (endIdx !== -1) {
        // Backtrack to the last `)}` before endIdx
        let actualEndIdx = content.lastIndexOf(')}', endIdx) + 2;

        const compactModal = `{/* Rename List Modal */}
            {editingList && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4">
                    <div className="bg-[#16161D] border border-[#B87333]/30 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-lg flex flex-col">
                        <div className="flex items-center justify-between p-8 border-b border-white/5">
                            <div className="flex items-center space-x-4">
                                <div className="w-1.5 h-6 bg-[#B87333] rounded-full"></div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Renomear Lista</h3>
                            </div>
                            <button onClick={() => setEditingList(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest ml-1">Novo Nome da Lista</label>
                                <input
                                    type="text"
                                    value={editListName}
                                    onChange={e => setEditListName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold text-lg outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700"
                                    placeholder="Ex: Repertório Show Sábado..."
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && editListName.trim()) {
                                            const all = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
                                            const updated = all.map(pl => pl.id === editingList.id ? { ...pl, name: editListName } : pl);
                                            localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
                                            setSavedPlaylists(updated);
                                            setEditingList(null);
                                            setShowSaveSuccess(true);
                                            setTimeout(() => setShowSaveSuccess(false), 2000);
                                        }
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    if (!editListName.trim()) return;
                                    const all = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
                                    const updated = all.map(pl => pl.id === editingList.id ? { ...pl, name: editListName } : pl);
                                    localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
                                    setSavedPlaylists(updated);
                                    setEditingList(null);
                                    setShowSaveSuccess(true);
                                    setTimeout(() => setShowSaveSuccess(false), 2000);
                                }}
                                className="w-full py-4 bg-[#B87333] hover:bg-[#A86323] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B87333]/20 flex items-center justify-center space-x-3"
                            >
                                <Save className="w-5 h-5" />
                                <span>Salvar Novo Nome</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}`;

        let oldModalBlock = content.substring(startIdx, actualEndIdx);
        content = content.replace(oldModalBlock, compactModal);
        console.log('✅ Replaced complex modal with compact Rename modal');
        changes++;
    }
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
} else {
    console.log('❌ No changes made.');
}
