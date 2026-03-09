const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

let changes = 0;

// 1. Add playerSidebarTab state
const stateMarker = `const [activeTab, setActiveTab] = useState('manual');`;
if (content.includes(stateMarker) && !content.includes('playerSidebarTab')) {
    content = content.replace(
        stateMarker,
        `${stateMarker}\n    const [playerSidebarTab, setPlayerSidebarTab] = useState('fila'); // 'fila' | 'listas'`
    );
    console.log('✅ Added playerSidebarTab state');
    changes++;
}

// 2. We need to construct the new Player Sidebar with Tabs
// Find the sidebar opening
const sidebarOpening = content.indexOf('PLAYER PLAYLIST SIDEBAR');
if (sidebarOpening !== -1) {
    console.log('✅ Found Player Sidebar Opening');

    // Instead of doing complex string manipulation that might fail, we will use a more robust regex/replace strategy for the sidebar.
    // However, the cleanest way to do this large refactor safely is to break it down.

    // Step 2a: Add the Tabs UI right after the toggle button in the sidebar
    const toggleButtonEnd = content.indexOf('</button>', content.indexOf('Expandir Lista')) + 9;
    if (toggleButtonEnd > 9) {
        const tabsUI = `

                                {/* --- SIDEBAR TABS --- */}
                                {!isSidebarCollapsed && (
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner shrink-0">
                                        <button
                                            onClick={() => setPlayerSidebarTab('fila')}
                                            className={\`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 \${playerSidebarTab === 'fila' ? 'bg-[#B87333] text-white shadow-md' : 'text-slate-500 hover:text-white'}\`}
                                        >
                                            Fila
                                        </button>
                                        <button
                                            onClick={() => setPlayerSidebarTab('listas')}
                                            className={\`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 \${playerSidebarTab === 'listas' ? 'bg-[#B87333] text-white shadow-md' : 'text-slate-500 hover:text-white'}\`}
                                        >
                                            Listas
                                        </button>
                                    </div>
                                )}
`;
        if (!content.includes('SIDEBAR TABS')) {
            content = content.slice(0, toggleButtonEnd) + tabsUI + content.slice(toggleButtonEnd);
            console.log('✅ Added Sidebar Tabs UI');
            changes++;
        }
    }

    // Step 2b: Wrap the existing Fila content (Search Bar down to Song List)
    // We will do this by wrapping the known elements.
    const searchBarStart = content.indexOf('{/* ——— SEARCH BAR (Feature 1) ——— */}');
    if (searchBarStart !== -1) {
        if (!content.includes("{playerSidebarTab === 'fila' && (")) {
            content = content.replace('{/* ——— SEARCH BAR (Feature 1) ——— */}', `{playerSidebarTab === 'fila' && (\n                                    <div className="flex flex-col flex-1 overflow-hidden space-y-6">\n                                {/* ——— SEARCH BAR (Feature 1) ——— */}`);
            console.log('✅ Wrapped Fila content start');
            changes++;

            // Now find where the Fila content ends. It ends where the sidebar ends.
            // Look for `</div>` before `{/* PREVIEW + PRINT LAYER */}`
            const previewLayerIdx = content.indexOf('{/* PREVIEW + PRINT LAYER */}');
            if (previewLayerIdx !== -1) {
                // Find the closing div of the sidebar
                const snippetBeforePreview = content.slice(previewLayerIdx - 50, previewLayerIdx);
                // It's likely `</div>\r\n\r\n                        {/* PREVIEW`
                content = content.slice(0, previewLayerIdx) + `    </div>\n                                )}\n\n                                {/* ——— LISTAS TAB CONTENT ——— */}\n                                {playerSidebarTab === 'listas' && (\n                                    <div className="flex flex-col flex-1 overflow-hidden space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">\n                                        {/* Simplified Listas UI for Sidebar */}\n                                        <div className="relative shrink-0">\n                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />\n                                            <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />\n                                        </div>\n                                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">\n                                            {(() => {\n                                                const allPlaylists = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');\n                                                const filteredPlaylists = allPlaylists.filter(pl => pl.name.toLowerCase().includes(listSearchTerm.toLowerCase()));\n                                                if (filteredPlaylists.length === 0) return <div className="text-center p-6 border border-dashed border-white/10 rounded-2xl"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Nenhuma lista</p></div>;\n                                                return filteredPlaylists.map(pl => (\n                                                    <div key={pl.id} className="bg-white/5 border border-white/5 hover:border-[#B87333]/30 rounded-2xl p-4 transition-all group">\n                                                        <div className="flex items-center justify-between mb-3">\n                                                            <h3 className="text-xs font-black text-white uppercase italic tracking-tighter truncate max-w-[150px]">{pl.name}</h3>\n                                                            <span className="text-[9px] font-bold text-slate-500 bg-black/40 px-2 py-1 rounded-md">{pl.songs?.length || 0}</span>\n                                                        </div>\n                                                        <div className="flex space-x-2">\n                                                            <button onClick={() => { setSongs(pl.songs.map(s => ({...s}))); setActivePlaylistName(pl.name); setPlayerSidebarTab('fila'); }} className="flex-1 py-2 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Carregar</button>\n                                                            <button onClick={() => { setDeleteTarget({ type: 'lista', id: pl.id, name: pl.name }); setDeleteModalOpen(true); }} className="p-2 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>\n                                                        </div>\n                                                    </div>\n                                                ));\n                                            })()}\n                                        </div>\n                                    </div>\n                                )}\n` + content.slice(previewLayerIdx);
                console.log('✅ Wrapped Fila content end and injected Listas UI');
                changes++;
            }
        }
    }
}

// 3. Remove the old selection-branch completely
// The old block starts at: `<div className="selection-branch-root flex flex-col min-h-[600px] h-full">`
// Actually, earlier we established that `mainNav === 'player'` was checked. Let's look at line 2852: `{(isFullScreenPlayer || activeTab === 'player' || mainNav === 'player') ? (`
// We want to remove that ternary and just render the player UI unconditionally (since it's the hero page).
const playerTernary = `{(isFullScreenPlayer || activeTab === 'player' || mainNav === 'player') ? (`;
if (content.includes(playerTernary)) {
    content = content.replace(playerTernary, `{true ? (`); // Quickest way to force the player branch, we'll let the compiler strip it later. Or let's just leave it as true.
    console.log('✅ Forced player ternary to true');
    changes++;
}

if (changes > 0) {
    fs.writeFileSync(path, content, 'utf8');
    console.log(`\n✅ Saved changes. Total changes: ${changes}`);
} else {
    console.log('\n⚠️ No structural changes saved.');
}
