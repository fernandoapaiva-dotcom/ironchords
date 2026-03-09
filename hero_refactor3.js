const fs = require('fs');
const path = 'c:/Projetos/Anti Gravity/Caminho das Cifras/frontend/src/App.jsx';
let content = fs.readFileSync(path, 'utf8');

// The marker is:
//                                     ))}
//                                 </div>
//                             </div>
//
//                             {/* PLAYER LYRICS/CHORDS AREA */}

const marker = `                                    ))}
                                </div>
                            </div>

                            {/* PLAYER LYRICS/CHORDS AREA */}`;

const markerReplacement = `                                    ))}
                                </div>
                                    </div>
                                )}

                                {/* ——— LISTAS TAB CONTENT ——— */}
                                {playerSidebarTab === 'listas' && (
                                    <div className="flex flex-col flex-1 overflow-hidden space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="relative shrink-0">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                            <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />
                                        </div>
                                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                                            {(() => {
                                                const allPlaylists = Array.isArray(savedPlaylists) ? savedPlaylists : JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
                                                const filteredPlaylists = allPlaylists.filter(pl => pl.name.toLowerCase().includes(listSearchTerm.toLowerCase()));
                                                if (filteredPlaylists.length === 0) return <div className="text-center p-6 border border-dashed border-white/10 rounded-2xl"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Nenhuma lista</p></div>;
                                                return filteredPlaylists.map(pl => (
                                                    <div key={pl.id} className="bg-white/5 border border-white/5 hover:border-[#B87333]/30 rounded-2xl p-4 transition-all group">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h3 className="text-xs font-black text-white uppercase italic tracking-tighter truncate max-w-[150px]">{pl.name}</h3>
                                                            <span className="text-[9px] font-bold text-slate-500 bg-black/40 px-2 py-1 rounded-md">{pl.songs?.length || 0}</span>
                                                        </div>
                                                        <div className="flex space-x-2">
                                                            <button onClick={() => { setSongs(pl.songs.map(s => ({...s}))); setActivePlaylistName(pl.name); setPlayerSidebarTab('fila'); }} className="flex-1 py-2 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Carregar</button>
                                                            <button onClick={() => { setDeleteTarget({ type: 'lista', id: pl.id, name: pl.name }); setDeleteModalOpen(true); }} className="p-2 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-400 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PLAYER LYRICS/CHORDS AREA */}`;

// Try to replace
if (content.includes(marker)) {
    content = content.replace(marker, markerReplacement);
    console.log('✅ Replaced using exact LF match');
} else {
    // Try CRLF
    const markerCRLF = marker.replace(/\n/g, '\r\n');
    if (content.includes(markerCRLF)) {
        content = content.replace(markerCRLF, markerReplacement.replace(/\n/g, '\r\n'));
        console.log('✅ Replaced using CRLF match');
    } else {
        console.error('❌ Could not find exact marker');
    }
}

// 2. We can now remove the entire `mainNav === 'listas'` block.
// To do this safely, we will just stub it out.
const listasBlockMarker = `{mainNav === 'listas' && (() => {`;
if (content.includes(listasBlockMarker)) {
    content = content.replace(listasBlockMarker, `{false && mainNav === 'listas' && (() => {`);
    console.log('✅ Disabled old listas block');
}

fs.writeFileSync(path, content, 'utf8');
