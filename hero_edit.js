const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');
let changes = 0;

// 1. We need to move the `editingList` modal to the global modal area (near the end of the return statement).
// It starts with `{editingList && (`
// Let's find its exact block safely.
let editingListStart = content.indexOf('{/* Edit List Modal */}');
let editingListEnd = content.indexOf('</div>', content.indexOf('{/* Modal Header */}')) + 6; // approximate, we need to find the matching brackets.

if (editingListStart !== -1) {
    // A robust way to extract it:
    // It ends right before `                                                    {deleteTarget && (`
    let deleteTargetStart = content.indexOf('{/* Delete Confirmation Modal */}');
    if (deleteTargetStart === -1) deleteTargetStart = content.indexOf('{deleteTarget && (');

    if (deleteTargetStart > editingListStart) {
        let editingListBlock = content.substring(editingListStart, deleteTargetStart);

        // Remove it from current location
        content = content.replace(editingListBlock, '');

        // Add it to the main modal area right before `</main>` or `<ShareModal`
        let shareModalStart = content.indexOf('{/* Share and Import Modals */}');
        if (shareModalStart !== -1) {
            content = content.slice(0, shareModalStart) + editingListBlock + '\n            ' + content.slice(shareModalStart);
            console.log('✅ Moved editingList modal to root');
            changes++;
        }
    }
}

// 2. Add the Edit Button back into the NEW Listas Sidebar Tab
// We find our new `playerSidebarTab === 'listas'` block.
let listasSidebarBlockIdx = content.indexOf("{/* ——— LISTAS TAB CONTENT ——— */}");
if (listasSidebarBlockIdx !== -1) {
    // In that block, we have the buttons: Carregar and Trash2
    let carregarBtnMarker = `setPlayerSidebarTab('fila'); }} className="flex-1 py-2 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Carregar</button>`;

    if (content.includes(carregarBtnMarker)) {
        let editBtn = `
                                                            <button onClick={() => {
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

        let target = carregarBtnMarker + editBtn;
        content = content.replace(carregarBtnMarker, target);
        console.log('✅ Added Edit3 button to Listas Sidebar');
        changes++;
    }
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
    console.log(`\n✅ Saved changes. Total changes: ${changes}`);
} else {
    console.log('\n⚠️ No structural changes saved.');
}
