import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PhoneticMatcher } from './utils/PhoneticMatcher';
import VideokePlayer from './components/VideokePlayer';
import { Music, UploadCloud, Plus, FileText, CheckCircle, AlertCircle, FileAudio, Info, X, Guitar, Settings2, Image as ImageIcon, Database, Edit3, Trash2, ArrowRight, Play, Maximize, Maximize2, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, ArrowLeft, SkipBack, SkipForward, Save, FolderHeart, Flame, Hammer, Sparkles, RefreshCw, Zap, ShieldCheck, Monitor, Tv, Check, LayoutList, Layout, Mic, Search, RotateCcw, Printer, Archive } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SVGuitarChord } from 'svguitar';
import { AudioTracker } from './utils/AudioTracker';
import { CifraParser } from './utils/CifraParser';

// -------------------------------------------------------------------
// CHORD DICTIONARY  (ported from chord_drawer.py)
// Format: each chord maps to one or more voicings.
// Each voicing is an array of 6 finger positions (strings 1-6, low-E first).
// -1 = muted (X), 0 = open, 1-5 = fret number
// -------------------------------------------------------------------
const CHORD_DICT = {
    // Major
    C: [[-1, 3, 2, 0, 1, 0]],
    'C#': [[-1, 4, 6, 6, 6, 4]], Db: [[-1, 4, 6, 6, 6, 4]],
    D: [[-1, -1, 0, 2, 3, 2]],
    'D#': [[-1, -1, 1, 3, 4, 3]], Eb: [[-1, -1, 1, 3, 4, 3]],
    E: [[0, 2, 2, 1, 0, 0]],
    F: [[1, 3, 3, 2, 1, 1]],
    'F#': [[2, 4, 4, 3, 2, 2]], Gb: [[2, 4, 4, 3, 2, 2]],
    G: [[3, 2, 0, 0, 0, 3]],
    'G#': [[4, 6, 6, 5, 4, 4]], Ab: [[4, 6, 6, 5, 4, 4]],
    A: [[-1, 0, 2, 2, 2, 0]],
    'A#': [[-1, 1, 3, 3, 3, 1]], Bb: [[-1, 1, 3, 3, 3, 1]],
    B: [[-1, 2, 4, 4, 4, 2]],
    // Minor
    Cm: [[-1, 3, 5, 5, 4, 3]],
    'C#m': [[-1, 4, 6, 6, 5, 4]], Dbm: [[-1, 4, 6, 6, 5, 4]],
    Dm: [[-1, -1, 0, 2, 3, 1]],
    'D#m': [[-1, -1, 1, 3, 4, 2]], Ebm: [[-1, -1, 1, 3, 4, 2]],
    Em: [[0, 2, 2, 0, 0, 0]],
    Fm: [[1, 3, 3, 1, 1, 1]],
    'F#m': [[2, 4, 4, 2, 2, 2]], Gbm: [[2, 4, 4, 2, 2, 2]],
    Gm: [[3, 5, 5, 3, 3, 3]],
    'G#m': [[4, 6, 6, 4, 4, 4]], Abm: [[4, 6, 6, 4, 4, 4]],
    Am: [[-1, 0, 2, 2, 1, 0]],
    'A#m': [[-1, 1, 3, 3, 2, 1]], Bbm: [[-1, 1, 3, 3, 2, 1]],
    Bm: [[-1, 2, 4, 4, 3, 2]],
    // 7th
    C7: [[-1, 3, 2, 3, 1, 0]],
    D7: [[-1, -1, 0, 2, 1, 2]],
    E7: [[0, 2, 0, 1, 0, 0]],
    F7: [[1, 3, 1, 2, 1, 1]],
    G7: [[3, 2, 0, 0, 0, 1]],
    A7: [[-1, 0, 2, 0, 2, 0]],
    B7: [[-1, 2, 1, 2, 0, 2]],
    // Minor 7th
    Cm7: [[-1, 3, 5, 3, 4, 3]],
    Dm7: [[-1, -1, 0, 2, 1, 1]],
    Em7: [[0, 2, 2, 0, 3, 0]],
    Fm7: [[1, 3, 1, 1, 1, 1]],
    Gm7: [[3, 5, 3, 3, 3, 3]],
    Am7: [[-1, 0, 2, 0, 1, 0]],
    Bm7: [[-1, 2, 4, 2, 3, 2]],
    // Major 7th
    Cmaj7: [[-1, 3, 2, 0, 0, 0]],
    Dmaj7: [[-1, -1, 0, 2, 2, 2]],
    Emaj7: [[0, 2, 1, 1, 0, 0]],
    Fmaj7: [[1, -1, 2, 2, 1, 0]],
    Gmaj7: [[3, -1, 4, 4, 3, -1]],
    Amaj7: [[-1, 0, 2, 1, 2, 0]],
    Bmaj7: [[-1, 2, 4, 3, 4, 2]],
    // sus4
    Dsus4: [[-1, -1, 0, 2, 3, 3]],
    Esus4: [[0, 2, 2, 2, 0, 0]],
    Asus4: [[-1, 0, 2, 2, 3, 0]],
    // sus2
    Dsus2: [[-1, -1, 0, 2, 3, 0]],
    Asus2: [[-1, 0, 2, 2, 0, 0]],
    // dim
    Cdim: [[-1, 3, 4, 5, 4, 3]],
    Ddim: [[-1, -1, 0, 1, 0, 1]],
    Edim: [[0, 1, 2, 3, 2, 0]],
    Gdim: [[3, 4, 5, 3, 2, 3]],
    Adim: [[-1, 0, 1, 2, 1, 0]],
    Bdim: [[-1, 2, 3, 4, 3, 2]],
    // aug
    Caug: [[-1, 3, 2, 1, 1, 0]],
    Daug: [[-1, -1, 0, 3, 3, 2]],
    Eaug: [[0, 3, 2, 1, 1, 0]],
    Faug: [[1, 4, 3, 2, 2, 1]],
    Gaug: [[3, 2, 1, 0, 0, 3]],
    Aaug: [[-1, 0, 3, 2, 2, 1]],
    Baug: [[-1, 2, 1, 0, 0, 3]],
};

// Parse chord name to find a valid dictionary key (handles minor b# etc.)
function findChordVoicings(rawChord) {
    if (!rawChord || typeof rawChord !== 'string') return null;
    try {
        // strip bass note (e.g. G/B → G)
        const name = rawChord.split('/')[0];
        if (!name) return null;

        const result = CHORD_DICT[name] || null;
        if (result) return result;

        // Try case-normalised root + suffix
        const m = name.match(/^([A-Ga-g][b#]?)(.*)$/);
        if (!m) return null;

        const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
        const suffix = m[2] || '';
        const key = root + suffix;
        return CHORD_DICT[key] || null;
    } catch (err) {
        console.error('findChordVoicings FATAL error for chord:', rawChord, err);
        return null;
    }
}

// -------------------------------------------------------------------
// ChordTooltip – floating SVG diagram popup
// -------------------------------------------------------------------
const CHORD_TOOLTIP_SIZE = 170; // px width of tooltip

function ChordTooltip({ chord, anchor, onClose }) {
    const containerRef = useRef(null);
    const svgRef = useRef(null);
    const chartRef = useRef(null);
    const [voiceIdx, setVoiceIdx] = useState(0);
    const [pos, setPos] = useState({ top: 0, left: 0 });

    const voicings = findChordVoicings(chord);
    const total = voicings ? voicings.length : 0;

    // Position tooltip above the anchor element, smart edge detection
    useEffect(() => {
        if (!anchor || !chord) return;

        const updatePosition = () => {
            const rect = anchor.getBoundingClientRect();
            const tooltipH = 220;
            const tooltipW = CHORD_TOOLTIP_SIZE + 16;

            // fixed positioning matches rect directly (viewport relative)
            let top = rect.top - tooltipH - 12;
            let left = rect.left + rect.width / 2 - tooltipW / 2;

            // Flip to bottom if clipping top
            if (top < 10) {
                top = rect.bottom + 12;
            }

            // Clamp horizontal
            left = Math.max(10, Math.min(left, window.innerWidth - tooltipW - 10));

            setPos({ top, left });
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true); // true for capturing sub-element scrolls
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [anchor]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Draw SVG diagram whenever voicing changes
    useEffect(() => {
        if (!svgRef.current) return;
        svgRef.current.innerHTML = '';
        chartRef.current = null;
        if (!voicings || voicings.length === 0) return;
        const voicing = voicings[voiceIdx];
        // Build fingers array for svguitar [string(1=high-e,6=low-E), fret]
        // Our dict order: [lowE, A, D, G, B, highE] = strings [6,5,4,3,2,1]
        const fingers = [];
        let minFret = 99;
        voicing.forEach(f => { if (f > 0) minFret = Math.min(minFret, f); });
        const position = minFret === 99 ? 1 : minFret;
        voicing.forEach((fret, i) => {
            const str = 6 - i; // string number (6=lowE, 1=highE)
            if (fret === -1) {
                // muted – no finger entry, handled by barres/muted
            } else if (fret === 0) {
                // open string – add as 0
                fingers.push([str, 0]);
            } else {
                fingers.push([str, fret - position + 1]);
            }
        });
        // Muted strings
        const barres = [];
        const mutedStrings = voicing
            .map((f, i) => f === -1 ? 6 - i : null)
            .filter(Boolean);

        try {
            const guitar = new SVGuitarChord(svgRef.current)
                .configure({
                    strings: 6,
                    frets: 4,
                    position: position === 99 ? 1 : position,
                    strokeColor: '#94a3b8',
                    color: '#B87333',
                    backgroundColor: 'transparent',
                    fretLabelFontSize: 38,
                    tunings: [],
                    fingerSize: 0.3,
                    fingerColor: '#B87333',
                    fingerTextColor: '#000',
                    fretSize: 1.5,
                    barreChordRadius: 0.25,
                    barreChordStrokeColor: '#B87333',
                    barreChordStrokeWidth: 1,
                    nutColor: '#B87333',
                    nutSize: 0.3,
                    sidePadding: 0.2,
                    topPadding: 0.15,
                    fontFamily: 'inherit',
                })
                .chord({
                    fingers,
                    barres,
                    mutedStrings,
                })
                .draw();
            chartRef.current = guitar;
        } catch (e) {
            console.warn('ChordTooltip SVG error:', e);
        }
    }, [voiceIdx, chord]);

    return (
        <div
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                zIndex: 9999,
                width: CHORD_TOOLTIP_SIZE + 16,
                pointerEvents: 'auto',
            }}
            className="bg-[#12121A] border border-[#B87333]/40 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-[#B87333] font-black text-sm italic tracking-tight">{chord}</span>
                {total > 1 && (
                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => setVoiceIdx(i => (i - 1 + total) % total)}
                            className="p-0.5 text-slate-600 hover:text-[#B87333] transition-all"
                        >
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[9px] font-black text-slate-600 w-8 text-center">{voiceIdx + 1}/{total}</span>
                        <button
                            onClick={() => setVoiceIdx(i => (i + 1) % total)}
                            className="p-0.5 text-slate-600 hover:text-[#B87333] transition-all"
                        >
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
                <button onClick={onClose} className="p-0.5 text-slate-700 hover:text-white transition-all">
                    <X className="w-3 h-3" />
                </button>
            </div>
            {/* SVG Diagram */}
            <div ref={svgRef} style={{ width: CHORD_TOOLTIP_SIZE, height: 160, margin: '0 auto' }} />
            {/* Unknown chord fallback */}
            {!findChordVoicings(chord) && (
                <p className="text-center text-[9px] text-slate-600 pb-2">diagrama não disponível</p>
            )}
        </div>
    );
}

// -------------------------------------------------------------------
// renderChordLine – splits a chord-line string into clickable spans
// Returns an array of React nodes (spans and strings)
// onChordClick(chordName, anchorElement) is called on hover/tap
// -------------------------------------------------------------------
// Improved Regex: enforces word boundaries so words like 'Deus' don't get 'D' captured unless standalone.
// Added (^|\s) and (?!\w) to ensure it only captures the chord if it's isolated.
// Improved Regex: enforces word boundaries and also ensures no accented letters follow the chord.
const CHORD_TOKEN_RE = /(?:^|\s)([A-G][b#]?(?:m|maj|min|M|dim|aug|sus|add|alt|7|9|11|13|6|2|4|5|b5|#5|#11|b9|#9)*(?:\/[A-G][b#]?)?)(?![a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g;

export function renderChordLine(line, onChordClick) {
    const parts = [];
    let last = 0;
    let match;
    CHORD_TOKEN_RE.lastIndex = 0;
    while ((match = CHORD_TOKEN_RE.exec(line)) !== null) {
        // match.index is the start of the entire match, which might include the leading space
        const fullMatch = match[0];
        const chord = match[1];
        const chordIndex = match.index + (fullMatch.length - chord.length);

        if (chordIndex > last) {
            parts.push(line.slice(last, chordIndex));
        }

        parts.push(
            <span
                key={chordIndex}
                className="cursor-pointer underline decoration-[#B87333]/40 underline-offset-2 text-[#B87333] hover:text-amber-300 hover:decoration-amber-300 transition-colors inline-block"
                onMouseEnter={(e) => {
                    // Only trigger hover on desktop (not touch)
                    if (window.matchMedia("(hover: hover)").matches) {
                        onChordClick(chord, e.currentTarget, false);
                    }
                }}
                onMouseLeave={(e) => {
                    if (window.matchMedia("(hover: hover)").matches) {
                        onChordClick(null, null, false);
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    // On touch devices (or explicit clicks), toggle it
                    if (!window.matchMedia("(hover: hover)").matches) {
                        onChordClick(chord, e.currentTarget, true);
                    }
                }}
            >{chord}</span>
        );
        last = chordIndex + chord.length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
}


const MoltenLoading = ({ message = "Forjando conteúdo...", current = 0, total = 0 }) => {
    const progress = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070709]/98 backdrop-blur-3xl animate-in fade-in duration-700">
            <div className="relative w-full max-w-md h-96 flex flex-col items-center justify-center">

                {/* Reactor Core Animation */}
                <div className="relative flex items-center justify-center w-64 h-64 mb-10">
                    {/* Pulsing Aura */}
                    <div className="absolute inset-0 bg-orange-500/10 rounded-full blur-[50px] animate-pulse" style={{ animationDuration: '2s' }}></div>

                    {/* Ring 1 - Dashed Spin */}
                    <div className="absolute inset-0 rounded-full border-[4px] border-dashed border-[#B87333]/30 animate-[spin_8s_linear_infinite]"></div>

                    {/* Ring 2 - Opposite solid arc */}
                    <div className="absolute inset-4 rounded-full border-[3px] border-transparent border-t-[#B87333] border-b-orange-600 animate-[spin_4s_linear_infinite_reverse]"></div>

                    {/* Ring 3 - Outer sharp ring */}
                    <div className="absolute inset-8 rounded-full border border-white/10 shadow-[0_0_20px_rgba(184,115,51,0.5)]"></div>

                    {/* Inner Core Equalizer */}
                    <div className="absolute inset-12 rounded-full bg-black/50 border border-[#B87333]/40 overflow-hidden flex items-center justify-center space-x-2 p-5 shadow-[inset_0_0_30px_rgba(184,115,51,0.8)] z-10">
                        {[...Array(7)].map((_, i) => {
                            const heights = [30, 50, 80, 100, 80, 50, 30];
                            return (
                                <div key={i} className="w-2.5 bg-gradient-to-t from-orange-700 via-[#B87333] to-white rounded-full animate-pulse-height"
                                    style={{
                                        height: `${heights[i]}%`,
                                        animationDelay: `${i * 0.15}s`
                                    }}>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Message Container */}
                <div className="text-center space-y-6 z-10 w-full px-8">
                    <h3 className="text-2xl md:text-3xl font-black text-white italic tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(184,115,51,0.5)] relative inline-block">
                        {message}
                        <span className="absolute -bottom-3 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#B87333] to-transparent"></span>
                    </h3>

                    {total > 0 && (
                        <div className="flex flex-col items-center gap-1 mt-6 animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-baseline space-x-2">
                                <span className="text-[#B87333] font-black text-5xl tracking-tighter drop-shadow-[0_0_10px_rgba(184,115,51,0.6)]">
                                    {current}
                                </span>
                                <span className="text-white/20 text-2xl font-black">/</span>
                                <span className="text-white/60 font-black text-3xl tracking-tighter">
                                    {total}
                                </span>
                            </div>
                            <span className="text-[#B87333] text-[10px] uppercase font-black tracking-[0.6em] animate-pulse mt-1">Músicas Encontradas</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Ambient particles background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-screen">
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="absolute w-1.5 h-1.5 bg-orange-400 rounded-full animate-steam-rise"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${100 + Math.random() * 20}%`,
                            animationDuration: `${3 + Math.random() * 4}s`,
                            animationDelay: `${Math.random() * 5}s`,
                            filter: 'blur(1px)',
                            opacity: 0.6
                        }}></div>
                ))}
            </div>

            {/* Premium Progress Bar Container */}
            <div className="w-full max-w-lg px-8 mt-12 space-y-6 z-10">
                {/* Premium Progress Bar */}
                <div className="w-full h-4 bg-black/60 rounded-full overflow-hidden border border-white/5 relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <div
                        className="h-full bg-gradient-to-r from-[#B87333] via-orange-400 to-[#B87333] transition-all duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1) relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)] animate-[shimmer_2.5s_infinite]"></div>
                    </div>
                </div>

                <div className="flex items-center justify-center space-x-6 opacity-30">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/20"></div>
                    <p className="text-[10px] text-white font-black uppercase tracking-[1em] whitespace-nowrap">Aço ao Rubro • Acordes Fortes</p>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/20"></div>
                </div>
            </div>
        </div>
    );
};


const TopNav = ({ current, onChange }) => (
    <div className="flex items-center justify-center p-4 mb-4 border-b border-white/5 bg-[#070709] sticky top-0 z-50">
        <div className="flex bg-[#16161D] p-1.5 rounded-3xl border border-white/10 shadow-2xl">
            <button
                onClick={() => onChange('escolha')}
                className={`flex items-center space-x-3 px-8 py-3.5 rounded-[20px] font-black uppercase tracking-widest text-[10px] italic transition-all duration-300 ${current === 'escolha' ? 'bg-[#B87333] text-white shadow-[0_0_20px_rgba(184,115,51,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
                <Hammer className="w-4 h-4" />
                <span>Escolha de Músicas</span>
            </button>
            <button
                onClick={() => onChange('listas')}
                className={`flex items-center space-x-3 px-8 py-3.5 rounded-[20px] font-black uppercase tracking-widest text-[10px] italic transition-all duration-300 ${current === 'listas' ? 'bg-[#B87333] text-white shadow-[0_0_20px_rgba(184,115,51,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
                <LayoutList className="w-4 h-4" />
                <span>Listas</span>
            </button>
            <button
                onClick={() => onChange('player')}
                className={`flex items-center space-x-3 px-8 py-3.5 rounded-[20px] font-black uppercase tracking-widest text-[10px] italic transition-all duration-300 ${current === 'player' ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
            >
                <Play className="w-4 h-4" />
                <span>Player da Forja</span>
            </button>
        </div>
    </div>
);

export default function App() {
    const [activeTab, setActiveTab] = useState('manual');
    const [songs, setSongs] = useState([]);
    const [selectedManualIndex, setSelectedManualIndex] = useState(null);
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isTransposing, setIsTransposing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [forgeMessage, setForgeMessage] = useState("Forjando conteúdo...");
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [mainNav, setMainNav] = useState('escolha');
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStep, setExportStep] = useState(1);
    const [currentExportList, setCurrentExportList] = useState(null);
    // Settings
    const [exportFormat, setExportFormat] = useState('docx');
    const [coverImage, setCoverImage] = useState(null);
    const coverInputRef = useRef(null);

    // Manual Form State
    const [songName, setSongName] = useState('');
    const [artistName, setArtistName] = useState('');
    const [songKey, setSongKey] = useState('C');
    const [songVersion, setSongVersion] = useState('Principal');
    const [includeTabs, setIncludeTabs] = useState(true);
    const [manualLoading, setManualLoading] = useState(false);
    const [manualError, setManualError] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [availableVersions, setAvailableVersions] = useState([{ name: 'Principal', key: 'Principal' }]);
    const [showPlayerControls, setShowPlayerControls] = useState(true);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isManualColumns, setIsManualColumns] = useState(false);
    const playerControlsTimerRef = useRef(null);
    const [manualCapo, setManualCapo] = useState(0);
    const [manualPreviewSong, setManualPreviewSong] = useState(null);
    const [stagedSongs, setStagedSongs] = useState([]);
    const [manualScrollSpeed, setManualScrollSpeed] = useState(1);
    const [isManualAutoScrolling, setIsManualAutoScrolling] = useState(false);
    const [manualFontSize, setManualFontSize] = useState(18);
    const [isManualFullscreen, setIsManualFullscreen] = useState(false);
    const [chordDiagramOverlay, setChordDiagramOverlay] = useState(null);
    const [chordTooltip, setChordTooltip] = useState(null); // { chord, anchor }
    const manualScrollContainerRef = useRef(null);

    // Batch Form State
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchError, setBatchError] = useState('');
    const fileInputRef = useRef(null);

    // Batch Mapping State
    const [batchRawData, setBatchRawData] = useState([]);
    const [batchHeaders, setBatchHeaders] = useState([]);
    const [batchMapping, setBatchMapping] = useState({ song_name: '', artist_name: '', key: '' });
    const [showMappingUI, setShowMappingUI] = useState(false);
    const [batchResults, setBatchResults] = useState([]);
    const [showBatchReview, setShowBatchReview] = useState(false);
    const [batchFixData, setBatchFixData] = useState(null);

    // Acervo State
    const [acervo, setAcervo] = useState([]);
    const [acervoLoading, setAcervoLoading] = useState(false);
    const [acervoSearchTerm, setAcervoSearchTerm] = useState('');
    const [conflictData, setConflictData] = useState(null); // { newSong, existingSong, onConfirm }
    const [conflictQueue, setConflictQueue] = useState([]);
    const [selectedAcervoItems, setSelectedAcervoItems] = useState([]);
    const [batchLinkLoading, setBatchLinkLoading] = useState(false);

    // Filter Suggestions State
    const [editingChord, setEditingChord] = useState(null);
    const [editFormData, setEditFormData] = useState({ song_name: '', artist_name: '', song_key: '', content: '', capo: 0 });

    // Presentation Mode State
    const [presenterSongIndex, setPresenterSongIndex] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(1);
    const scrollContainerRef = useRef(null);

    // Save List State
    const [saveListModalOpen, setSaveListModalOpen] = useState(false);
    const [saveListName, setSaveListName] = useState('');
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);

    // Deletion Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ type: '', id: null, name: '' });

    const saveOneChordToAcervo = async (song, force = false) => {
        // Prepare song data
        const songToSave = {
            song_name: song.song_name,
            artist_name: song.artist_name,
            song_key: song.sounding_key || song.requested_key || song.song_key,
            content: song.content || '',
            capo: song.capo || 0,
            include_tabs: song.include_tabs !== undefined ? song.include_tabs : true
        };

        if (!force) {
            // Check for conflict
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/chords/check?name=${encodeURIComponent(songToSave.song_name)}`);
                const data = await res.json();
                if (data.exists) {
                    return { conflict: true, existing: data.chord, newSong: songToSave };
                }
            } catch (err) { console.error("Erro ao verificar conflito:", err); }
        }

        // No conflict or forced, save it
        try {
            await fetch('http://127.0.0.1:8000/api/chords', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(songToSave)
            });
            return { success: true };
        } catch (err) {
            console.error("Erro ao salvar no acervo:", err);
            return { success: false };
        }
    };

    const processConflictQueue = async (queue) => {
        if (queue.length === 0) {
            fetchAcervo();
            return;
        }

        const nextConflict = queue[0];
        setConflictData({
            ...nextConflict,
            onConfirm: async (action) => {
                if (action === 'replace') {
                    await saveOneChordToAcervo(nextConflict.newSong, true);
                }
                // 'skip' does nothing
                const remaining = queue.slice(1);
                setConflictQueue(remaining);
                setConflictData(null);
                processConflictQueue(remaining);
            }
        });
    };

    const handleSaveList = async () => {
        const songsToSave = activeTab === 'batch' && showBatchReview
            ? batchResults.filter(r => r.status === 'success')
            : songs;

        if (!saveListName.trim() || songsToSave.length === 0) return;

        // 1. Save to Playlists (localStorage)
        const listToSave = {
            id: Date.now().toString(),
            name: saveListName,
            songs: songsToSave.map(s => ({
                id: s.id || null,
                song_name: s.song_name,
                artist_name: s.artist_name,
                song_key: s.sounding_key || s.requested_key || s.song_key,
                sounding_key: s.sounding_key || s.requested_key || s.song_key,
                original_key: s.original_key || s.song_key,
                capo: s.capo || 0,
                content: s.content || ''
            }))
        };
        const playlists = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
        localStorage.setItem('iron_chords_playlists', JSON.stringify([...playlists, listToSave]));

        // 2. Save to Acervo (DB) with conflict check
        const conflictsFound = [];
        for (const song of songsToSave) {
            const result = await saveOneChordToAcervo(song);
            if (result.conflict) {
                conflictsFound.push({ newSong: result.newSong, existingSong: result.existing });
            }
        }

        setSaveListModalOpen(false);
        setSaveListName('');

        if (conflictsFound.length > 0) {
            setConflictQueue(conflictsFound);
            processConflictQueue(conflictsFound);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const [micEnabled, setMicEnabled] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);

    const [detectedNote, setDetectedNote] = useState(null);
    const [transcriptRaw, setTranscriptRaw] = useState('');
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [playerFontSize, setPlayerFontSize] = useState(19);
    const [bpm, setBpm] = useState(80);
    const [isRhythmicMode, setIsRhythmicMode] = useState(true);
    const [isAnchored, setIsAnchored] = useState(false);
    const [isWaitingForVoice, setIsWaitingForVoice] = useState(false);
    const [isBpmSyncing, setIsBpmSyncing] = useState(false);
    const [isVideokeOpen, setIsVideokeOpen] = useState(false);

    // Playlists Persistence
    const [savedPlaylists, setSavedPlaylists] = useState(() => {
        const saved = localStorage.getItem('iron_chords_playlists');
        return saved ? JSON.parse(saved) : {};
    });
    const [playlistNameInput, setPlaylistNameInput] = useState('');
    const [showPlaylistManager, setShowPlaylistManager] = useState(false);

    const currentLineIndexRef = useRef(0);
    const recognitionRef = useRef(null);
    const advanceTimerRef = useRef(null);
    const driftHistoryRef = useRef([]);
    const lastBpmAdjustTimeRef = useRef(Date.now());
    const lastVoiceMatchedIndexRef = useRef(0);

    // AutoScroll Effect with Mic interaction
    useEffect(() => {
        let interval;
        if ((activeTab === 'presentation' || activeTab === 'player' || selectedManualIndex !== null) && isAutoScrolling && scrollContainerRef.current) {
            interval = setInterval(() => {
                const threshold = 15;
                const shouldScroll = !micEnabled || micLevel > threshold;
                if (shouldScroll) {
                    scrollContainerRef.current.scrollTop += scrollSpeed;
                }
            }, 50);
        }
        return () => clearInterval(interval);
    }, [activeTab, isAutoScrolling, scrollSpeed, micEnabled, micLevel, selectedManualIndex]);

    // Manual Preview AutoScroll Effect
    useEffect(() => {
        let interval;
        if (activeTab === 'manual' && isManualAutoScrolling && manualScrollContainerRef.current) {
            interval = setInterval(() => {
                manualScrollContainerRef.current.scrollTop += manualScrollSpeed;
            }, 50);
        }
        return () => clearInterval(interval);
    }, [activeTab, isManualAutoScrolling, manualScrollSpeed]);

    // Auto-hide controls in fullscreen (Stage View)
    useEffect(() => {
        const handleInteraction = () => {
            if (!isManualFullscreen) return;
            setShowPlayerControls(true);
            if (playerControlsTimerRef.current) clearTimeout(playerControlsTimerRef.current);
            playerControlsTimerRef.current = setTimeout(() => {
                // Dim controls only if not interacting and autoscrolling (or idle)
                setShowPlayerControls(false);
            }, 3500);
        };

        if (isManualFullscreen) {
            window.addEventListener('mousemove', handleInteraction);
            window.addEventListener('mousedown', handleInteraction);
            window.addEventListener('touchstart', handleInteraction);
            window.addEventListener('keydown', handleInteraction);
            handleInteraction(); // Initial hide cycle
        } else {
            setShowPlayerControls(true);
        }

        return () => {
            window.removeEventListener('mousemove', handleInteraction);
            window.removeEventListener('mousedown', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
            window.removeEventListener('keydown', handleInteraction);
            if (playerControlsTimerRef.current) clearTimeout(playerControlsTimerRef.current);
        };
    }, [isManualFullscreen]);

    // Track scroll progress for the progress bar
    useEffect(() => {
        const container = manualScrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const max = container.scrollHeight - container.clientHeight;
            if (max <= 0) {
                setScrollProgress(0);
                return;
            }
            const progress = (container.scrollTop / max) * 100;
            setScrollProgress(progress);
        };

        container.addEventListener('scroll', handleScroll);
        // Initial check
        handleScroll();
        return () => container.removeEventListener('scroll', handleScroll);
    }, [manualPreviewSong, isManualFullscreen]);

    // Mic Level & Frequency Listener
    const audioTrackerRef = useRef(null);

    useEffect(() => {
        if (micEnabled) {
            if (!audioTrackerRef.current) {
                audioTrackerRef.current = new AudioTracker(
                    (detectedBpm) => {
                        // Smoothly adjust to detected BPM
                        setBpm(prev => {
                            const diff = detectedBpm - prev;
                            if (Math.abs(diff) > 10) return prev + Math.sign(diff) * 2;
                            return detectedBpm;
                        });
                    },
                    (level) => setMicLevel(level),
                    (note) => setDetectedNote(note),
                    (text, isFinal) => {
                        setTranscriptRaw(text);
                        syncLineByText(text, isFinal);
                    }
                );
            }
            audioTrackerRef.current.start();
        } else {
            if (audioTrackerRef.current) {
                audioTrackerRef.current.stop();
                audioTrackerRef.current = null;
            }
        }
    }, [micEnabled]);

    const syncLineByText = (text, isFinal) => {
        const songIdx = activeTab === 'player' ? selectedManualIndex : selectedManualIndex;
        if (songIdx === null || !songs[songIdx]) return;
        const currentContent = songs[songIdx]?.content || "";
        const lines = currentContent.split('\n');

        let foundIndex = -1;
        const start = currentLineIndexRef.current;

        // Rules:
        // 1. If not anchored, search from top (30 lines)
        // 2. If anchored, search forward within range (8 lines)
        // 3. If anchored and end of song, search for Chorus/Start (Redirection)

        const searchRange = 8;
        const actualStartSearch = isAnchored ? start : 0;
        const actualEndSearch = isAnchored ? Math.min(lines.length, start + searchRange) : Math.min(lines.length, 30);

        // Redirection Logic (Looking for Chorus if near end)
        let checkRedirection = false;
        let chorusStart = 0;
        if (isAnchored && start >= lines.length - 6) {
            const sections = CifraParser.parseSections(currentContent);
            chorusStart = CifraParser.getChorusStartLine(sections) || CifraParser.getStartLine(currentContent);
            checkRedirection = true;
        }

        for (let i = actualStartSearch; i < actualEndSearch; i++) {
            if (PhoneticMatcher.isMatch(text, lines[i])) {
                foundIndex = i;
                break;
            }
        }

        // Try redirection if nothing found forward
        if (foundIndex === -1 && checkRedirection) {
            for (let i = chorusStart; i < Math.min(lines.length, chorusStart + 8); i++) {
                if (PhoneticMatcher.isMatch(text, lines[i])) {
                    foundIndex = i;
                    driftHistoryRef.current = []; // Reset drift when jumping
                    break;
                }
            }
        }

        if (foundIndex !== -1) {
            // "Strict Forward" safety: if we are anchored and the match is far BEHIND (not a redirection), ignore
            if (isAnchored && !checkRedirection && foundIndex < start - 2) {
                return;
            }

            lastVoiceMatchedIndexRef.current = foundIndex;

            // Start rhythm only after first match
            if (!isAnchored) {
                setIsAnchored(true);
                setIsWaitingForVoice(false);
                startRhythmicTimer();
            } else if (isWaitingForVoice) {
                setIsWaitingForVoice(false);
                if (isRhythmicMode) startRhythmicTimer();
            }

            // Rhythm smoothing (Adjust BPM based on voice drift)
            if (isRhythmicMode && isAnchored) {
                const diff = foundIndex - currentLineIndexRef.current;
                const now = Date.now();
                driftHistoryRef.current.push(diff);
                if (driftHistoryRef.current.length > 5) driftHistoryRef.current.shift();

                const timeSinceLastAdjust = now - lastBpmAdjustTimeRef.current;
                const averageDrift = driftHistoryRef.current.reduce((a, b) => a + b, 0) / driftHistoryRef.current.length;

                if (timeSinceLastAdjust > 2500) {
                    if (averageDrift < -0.3) {
                        setBpm(prev => Math.max(40, prev - 1));
                        lastBpmAdjustTimeRef.current = now;
                    } else if (averageDrift > 0.8) {
                        setBpm(prev => Math.min(220, prev + 1));
                        lastBpmAdjustTimeRef.current = now;
                    }
                }
            }

            updateCurrentLine(foundIndex);
        }
    };

    const startRhythmicTimer = () => {
        if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
        const msPerLine = (60000 / bpm) * 4;
        advanceTimerRef.current = setInterval(() => {
            const songIdx = (isFullScreenPlayer || activeTab === 'player') ? selectedManualIndex : null;
            if (isRhythmicMode && songIdx !== null && !isWaitingForVoice) {
                const soundThreshold = 15;
                if (micEnabled && micLevel < soundThreshold) return;
                const next = currentLineIndexRef.current + 1;
                const maxLeashLines = 1;
                if (micEnabled && isAnchored && next > (lastVoiceMatchedIndexRef.current + maxLeashLines)) return;
                const currentSong = songs[songIdx];
                if (currentSong) {
                    const lines = (currentSong.content || "").split('\n');
                    if (next < lines.length) {
                        let targetIndex = next;
                        while (targetIndex < lines.length && (lines[targetIndex].match(/^[a-g][b#]?\s/i) || lines[targetIndex].trim().length < 2)) {
                            targetIndex++;
                        }
                        updateCurrentLine(targetIndex);
                    }
                }
            }
        }, msPerLine);
    };

    const updateCurrentLine = (index) => {
        setCurrentLineIndex(index);
        currentLineIndexRef.current = index;
        if (scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const lineElement = container.querySelector(`[data-line-index="${index}"]`);
            if (lineElement) lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    const handleLineClick = (index) => {
        updateCurrentLine(index);
        lastVoiceMatchedIndexRef.current = index;
        if (micEnabled) {
            setIsWaitingForVoice(true);
            if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
        } else if (isRhythmicMode) {
            startRhythmicTimer();
        }
    };



    const transposeSong = async (index, semitones) => {
        const song = songs[index];
        if (!song) return;
        const currentKeyToUse = song.requested_key || song.song_key || 'C';
        setIsTransposing(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/transpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: song.content, current_key: currentKeyToUse, semitones: semitones })
            });
            const data = await res.json();
            if (data.transposed_content) {
                const newSongs = [...songs];
                newSongs[index].content = data.transposed_content;
                newSongs[index].requested_key = data.new_key;
                let s_key = data.new_key;
                if (newSongs[index].capo) {
                    const NOTES_ARR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                    let baseMatch = s_key.match(/([A-G][b#]?)/i);
                    let base = baseMatch ? baseMatch[1] : null;
                    if (base) {
                        let idx = NOTES_ARR.indexOf(base);
                        if (idx !== -1) {
                            let final_idx = (idx + newSongs[index].capo) % 12;
                            s_key = s_key.replace(base, NOTES_ARR[final_idx]);
                        }
                    }
                }
                newSongs[index].sounding_key = s_key;
                setSongs(newSongs);
            }
        } catch (err) { console.error(err); }
        finally { setIsTransposing(false); }
    };

    const transposeBatchSong = async (index, semitones) => {
        const item = batchResults[index];
        if (!item || item.status !== 'success') return;
        const currentKeyToUse = item.sounding_key || item.requested_key || item.original_key || 'C';
        try {
            const res = await fetch('http://127.0.0.1:8000/api/transpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: item.content, current_key: currentKeyToUse, semitones: semitones })
            });
            const data = await res.json();
            if (data.transposed_content) {
                const next = [...batchResults];
                next[index].content = data.transposed_content;
                next[index].requested_key = data.new_key;
                let s_key = data.new_key;
                if (next[index].capo) {
                    const NOTES_ARR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                    let baseMatch = s_key.match(/([A-G][b#]?)/i);
                    let base = baseMatch ? baseMatch[1] : null;
                    if (base) {
                        let i_idx = NOTES_ARR.indexOf(base);
                        if (i_idx !== -1) {
                            let final_idx = (i_idx + next[index].capo) % 12;
                            s_key = s_key.replace(base, NOTES_ARR[final_idx]);
                        }
                    }
                }
                next[index].sounding_key = s_key;
                setBatchResults(next);
            }
        } catch (err) { console.error(err); }
    };

    const handleBatchFixFetch = async () => {
        if (!batchFixData?.song_name || !batchFixData?.artist_name) return;
        setBatchLinkLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: batchFixData.song_name,
                    artist_name: batchFixData.artist_name,
                    key: batchFixData.song_key || '',
                    version: 'Principal',
                    include_tabs: batchFixData.include_tabs !== false,
                    capo: batchFixData.capo || 0
                })
            });
            const data = await res.json();
            if (data.content) {
                setBatchFixData(prev => ({ ...prev, content: data.content, song_key: data.requested_key || prev.song_key }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBatchLinkLoading(false);
        }
    };

    // Auto-update Batch Fix Data when Key, Capo or Tabs change
    useEffect(() => {
        if (batchFixData && batchFixData.song_name && batchFixData.artist_name) {
            handleBatchFixFetch();
        }
    }, [batchFixData?.song_key, batchFixData?.capo, batchFixData?.include_tabs]);

    const resetBatchSong = async (index) => {
        const item = batchResults[index];
        if (!item || item.status !== 'success') return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: item.song_name,
                    artist_name: item.artist_name,
                    key: item.original_key || '',
                    version: 'Principal',
                    include_tabs: true,
                    capo: 0
                })
            });
            const data = await res.json();
            if (data.content) {
                const next = [...batchResults];
                next[index].content = data.content;
                next[index].requested_key = data.requested_key || data.original_key || item.original_key;
                next[index].sounding_key = data.sounding_key || next[index].requested_key;
                next[index].capo = 0;
                next[index].include_tabs = data.content ? (data.content.includes('|-') || data.content.includes('-|')) : false;
                setBatchResults(next);
            }
        } catch (e) { console.error(e); }
    };

    const COMMON_CHORDS_MAP = {
        "C": [0, 1, 0, 2, 3, -1], "C#": [4, 6, 6, 6, 4, -1], "D": [2, 3, 2, 0, -1, -1],
        "D#": [3, 4, 3, 1, -1, -1], "E": [0, 0, 1, 2, 2, 0], "F": [1, 1, 2, 3, 3, 1],
        "F#": [2, 2, 3, 4, 4, 2], "G": [3, 0, 0, 0, 2, 3], "G#": [4, 4, 5, 6, 6, 4],
        "A": [0, 2, 2, 2, 0, -1], "A#": [1, 3, 3, 3, 1, -1], "B": [2, 4, 4, 4, 2, -1],
        "Cm": [3, 4, 5, 5, 3, -1], "C#m": [4, 5, 6, 6, 4, -1], "Dm": [1, 3, 2, 0, -1, -1],
        "D#m": [2, 4, 3, 1, -1, -1], "Em": [0, 0, 0, 2, 2, 0], "Fm": [1, 1, 1, 3, 3, 1],
        "F#m": [2, 2, 2, 4, 4, 2], "Gm": [3, 3, 3, 5, 5, 3], "G#m": [4, 4, 4, 6, 6, 4],
        "Am": [0, 1, 2, 2, 0, -1], "A#m": [1, 2, 3, 3, 1, -1], "Bm": [2, 3, 4, 4, 2, -1],
        "C7": [0, 1, 3, 2, 3, -1], "D7": [2, 1, 2, 0, -1, -1], "E7": [0, 0, 1, 0, 2, 0],
        "F7": [1, 1, 2, 1, 3, 1], "G7": [1, 0, 0, 0, 2, 3], "A7": [0, 2, 0, 2, 0, -1],
        "B7": [2, 0, 2, 1, 2, -1]
    };

    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const normalizeNote = (note) => {
        if (!note) return 'C';
        let n = note.trim().split(/[ \/]/)[0]; // get first part, handle "A/B"
        const match = n.match(/([A-G][b#]?)/i);
        if (!match) return 'C';
        let base = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        const map = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B', 'Fb': 'E', 'E#': 'F', 'B#': 'C' };
        let final = map[base] || base.toUpperCase();
        return NOTES.includes(final) ? final : 'C';
    };

    useEffect(() => { if (activeTab === 'acervo') fetchAcervo(); }, [activeTab]);
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (songName.length >= 2) fetchSuggestions(songName);
            else setSuggestions([]);
        }, 250);
        return () => clearTimeout(delayDebounceFn);
    }, [songName]);

    const fetchSuggestions = async (name) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/search/suggestions?q=${encodeURIComponent(name)}`);
            const data = await res.json();
            let results = data.suggestions || [];
            results = results.filter(s => !s.song.toLowerCase().includes('agape') && !s.artist.toLowerCase().includes('agape'));
            setSuggestions(results);
        } catch (err) { console.error(err); }
    };

    const fetchSongMetadata = async (song, artist) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/music/metadata?song_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`);
            const data = await res.json();
            if (data.key) setSongKey(normalizeNote(data.key));
        } catch (err) { console.error(err); }

        // Fetch versions independently
        try {
            const artistSlug = artist.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const songSlug = song.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            fetchVersions(artistSlug, songSlug);
        } catch (err) { console.error(err); }
    };

    const fetchVersions = async (artistSlug, songSlug) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/song/versions?artist_slug=${artistSlug}&song_slug=${songSlug}`);
            const data = await res.json();
            if (data.versions && data.versions.length > 0) {
                setAvailableVersions(data.versions);
                setSongVersion(data.versions[0].key);
            } else {
                setAvailableVersions([{ name: 'Principal', key: 'Principal' }]);
                setSongVersion('Principal');
            }
        } catch (err) {
            console.error(err);
            setAvailableVersions([{ name: 'Principal', key: 'Principal' }]);
            setSongVersion('Principal');
        }
    };

    const fetchAcervo = async () => {
        setAcervoLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/chords');
            const data = await res.json();
            setAcervo(data.chords);
        } catch (err) { console.error(err); }
        finally { setAcervoLoading(false); }
    };

    const handleDeleteAcervo = (idOrIds, name) => {
        setDeleteTarget({ type: Array.isArray(idOrIds) ? 'acervo_multi' : 'acervo', id: idOrIds, name });
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (deleteTarget.type === 'acervo') {
            try {
                await fetch(`http://127.0.0.1:8000/api/chords/${deleteTarget.id}`, { method: 'DELETE' });
                fetchAcervo();
                setSelectedAcervoItems(prev => prev.filter(id => id !== deleteTarget.id));
            } catch (err) { alert(err); }
        } else if (deleteTarget.type === 'acervo_multi') {
            try {
                // Delete sequentially (or via possible bulk endpoint if added in backend)
                for (const id of deleteTarget.id) {
                    await fetch(`http://127.0.0.1:8000/api/chords/${id}`, { method: 'DELETE' });
                }
                fetchAcervo();
                setSelectedAcervoItems([]);
            } catch (err) { alert(err); }
        } else if (deleteTarget.type === 'lista') {
            const existing = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
            existing.splice(deleteTarget.id, 1);
            localStorage.setItem('iron_chords_playlists', JSON.stringify(existing));
            setSavedPlaylists(existing);
        }
        setDeleteModalOpen(false);
    };

    const handleEditOpen = async (id) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/chords/${id}`);
            const data = await res.json();
            setEditingChord(data.id);
            setEditFormData({ song_name: data.song_name, artist_name: data.artist_name, song_key: data.song_key, content: data.content, capo: data.capo || 0 });
        } catch (err) { alert(err); }
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            await fetch(`http://127.0.0.1:8000/api/chords/${editingChord}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });
            setEditingChord(null);
            fetchAcervo();
        } catch (err) { alert(err); }
    };

    // Auto-update Manual Preview when Key, Capo or Tabs change (DISABLED to decouple player from search form)
    /*
    useEffect(() => {
        if (manualPreviewSong && activeTab === 'manual') {
            handleManualSubmit();
        }
    }, [songKey, manualCapo, includeTabs]);
    */


    const handleManualSubmit = async (e, songNameOverride, artistNameOverride, keyOverride) => {
        if (e) e.preventDefault();
        const useSongName = songNameOverride || songName;
        const useArtistName = artistNameOverride || artistName;
        // Use empty string to signal "Original Key"
        const useKey = (keyOverride === "") ? "" : (keyOverride || songKey);

        if (!useSongName || !useArtistName) return;
        setManualLoading(true);
        setManualError('');
        try {
            const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: useSongName,
                    artist_name: useArtistName,
                    key: useKey,
                    version: songVersion,
                    include_tabs: includeTabs,
                    capo: manualCapo
                })
            });
            const data = await res.json();
            if (!res.ok) {
                // Return original data as error message if not found to handle suggestions
                throw new Error(JSON.stringify(data.detail || data));
            }
            const newSong = {
                ...data,
                status: 'success',
                show_chords: true,
                sounding_key: data.sounding_key || data.requested_key || data.original_key || useKey,
                requested_key: data.requested_key || data.original_key || useKey,
                song_key: data.original_key || data.requested_key || useKey,
                capo: data.capo || manualCapo
            };
            setManualPreviewSong(newSong);
            setSuggestions([]);
            // Sync UI with found data
            if (newSong.song_key) setSongKey(newSong.song_key);
            if (newSong.capo !== undefined) setManualCapo(newSong.capo);
        } catch (err) {
            try {
                const data = JSON.parse(err.message);
                if (data.error === "not_found") {
                    setManualError(data.message || "Música não encontrada.");
                    setSuggestions(data.suggestions || []);
                } else {
                    setManualError(typeof data === 'string' ? data : "Erro ao buscar cifra.");
                }
            } catch (e) {
                setManualError(err.message || "Erro de conexão.");
            }
        }
        finally { setManualLoading(false); }
    };

    const handleBatchFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBatchLoading(true);
        setBatchError('');

        if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('http://127.0.0.1:8000/api/music/batch/pdf', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    let etext = await res.text();
                    try { etext = JSON.parse(etext).detail || etext; } catch (e) { }
                    throw new Error(etext);
                }

                const data = await res.json();
                if (data.headers && data.rows) {
                    setBatchHeaders(data.headers);
                    setBatchRawData(data.rows);
                    setShowMappingUI(true);
                } else {
                    throw new Error("Não foi possível identificar tabelas neste PDF.");
                }
            } catch (err) { setBatchError(err.message); }
            finally { setBatchLoading(false); }
        } else {
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    if (data.length > 0) {
                        setBatchHeaders(data[0].map(h => String(h).trim()));
                        setBatchRawData(XLSX.utils.sheet_to_json(ws));
                        setShowMappingUI(true);
                    }
                } catch (err) { setBatchError("Erro ao processar arquivo."); }
                finally {
                    setBatchLoading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleBatchProcess = async () => {
        setBatchLoading(true);
        setForgeMessage("Vasculhando a Internet...");

        const songsToProcess = batchRawData.map(row => {
            const songName = String(row[batchMapping.song_name] || '').trim();
            const artistName = String(row[batchMapping.artist_name] || '').trim();
            // Basic validation: if artist is just a dot, dash or empty, mark as invalid but keep it
            const invalidArtist = !artistName || artistName === '.' || artistName === '-' || artistName === '_';

            return {
                song_name: songName,
                artist_name: invalidArtist ? '' : artistName,
                key: String(row[batchMapping.key] || '').trim(),
                version: 'Principal',
                include_tabs: true,
                capo: 0,
                needs_artist: invalidArtist
            };
        }).filter(s => s.song_name); // Keep it as long as there is a song name

        setBatchProgress({ current: 0, total: songsToProcess.length });
        setIsGenerating(true);

        const finalResults = [];

        // Process one by one to show progress
        for (let i = 0; i < songsToProcess.length; i++) {
            const song = songsToProcess[i];

            // 1. Check if it already exists in Acervo
            const localMatch = acervo.find(a =>
                a.song_name.toLowerCase() === song.song_name.toLowerCase() &&
                // Optional: require artist match if artist was provided in the batch row
                (!song.artist_name || a.artist_name.toLowerCase() === song.artist_name.toLowerCase())
            );

            if (localMatch) {
                // Use local data instead of fetching from API
                finalResults.push({
                    ...localMatch,
                    requested_key: song.key,
                    sounding_key: localMatch.song_key, // Default to its original key
                    status: 'success',
                    include_tabs: localMatch.content ? (localMatch.content.includes('|-') || localMatch.content.includes('-|')) : false,
                    in_acervo: true
                });
                setBatchProgress({ current: i + 1, total: songsToProcess.length });
                continue;
            }

            // 2. If not in Acervo, fetch from API
            try {
                const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(song)
                });

                if (res.ok) {
                    const data = await res.json();

                    finalResults.push({
                        ...data,
                        status: 'success',
                        show_chords: true,
                        include_tabs: data.content ? (data.content.includes('|-') || data.content.includes('-|')) : false,
                        in_acervo: false
                    });
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    finalResults.push({
                        song_name: song.song_name,
                        artist_name: song.artist_name,
                        requested_key: song.key,
                        status: 'error',
                        suggestions: errorData.detail?.suggestions || [],
                        needs_artist: song.needs_artist
                    });
                }
            } catch (err) {
                finalResults.push({
                    song_name: song.song_name,
                    artist_name: song.artist_name,
                    requested_key: song.key,
                    status: 'error'
                });
            }
            setBatchProgress(prev => ({ ...prev, current: i + 1 }));
        }

        setBatchResults(finalResults);
        setShowBatchReview(true);
        setBatchLoading(false);
        setIsGenerating(false);
        setShowMappingUI(false);
        setBatchProgress({ current: 0, total: 0 });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleTryBatchSuggestion = async (idx, suggestion) => {
        setBatchLoading(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: suggestion.song,
                    artist_name: suggestion.artist,
                    key: batchResults[idx].requested_key || 'C',
                    version: 'Principal',
                    include_tabs: includeTabs,
                    capo: 0
                })
            });

            if (res.ok) {
                const data = await res.json();
                // Open for review/evaluation before adding
                setBatchFixData({
                    idx,
                    song_name: data.song_name,
                    artist_name: data.artist_name,
                    song_key: data.song_key,
                    content: data.content
                });
            } else {
                const errorData = await res.json().catch(() => ({}));
                const next = [...batchResults];
                next[idx] = {
                    ...next[idx],
                    song_name: suggestion.song,
                    artist_name: suggestion.artist,
                    suggestions: errorData.detail?.suggestions || []
                };
                setBatchResults(next);
            }
        } catch (err) {
            console.error("Error trying suggestion:", err);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) setCoverImage(file);
    };

    const handleGenerateDocument = async () => {
        if (songs.length === 0) return;
        setForgeMessage("Forjando peças em metal quente...");
        setIsGenerating(true);
        try {
            const formData = new FormData();
            // Include all songs that have been successfully loaded (manual or batch)
            const validSongs = songs.filter(s => s.content || s.status === 'success');
            formData.append('songs_data', JSON.stringify(validSongs));
            formData.append('export_format', exportFormat);
            if (coverImage) formData.append('cover_image', coverImage);
            const res = await fetch('http://127.0.0.1:8000/api/generate_book', { method: 'POST', body: formData });

            if (!res.ok) {
                let errText = await res.text();
                try {
                    const errObj = JSON.parse(errText);
                    errText = errObj.detail || errText;
                } catch (e) { }
                throw new Error("Erro no servidor: " + errText);
            }

            const blob = await res.blob();
            setDownloadUrl(window.URL.createObjectURL(blob));
        } catch (err) { alert(err.message); }
        finally { setIsGenerating(false); }
    };

    const removeSong = (index) => setSongs(songs.filter((_, i) => i !== index));
    const toggleChords = (index) => {
        const newSongs = [...songs];
        newSongs[index].show_chords = !newSongs[index].show_chords;
        setSongs(newSongs);
    };

    const currentSong = songs[selectedManualIndex] || null;

    return (
        <div className="min-h-screen bg-[#070709] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] text-slate-300 font-sans selection:bg-[#B87333]/30 selection:text-white overflow-x-hidden">
            {isGenerating && <MoltenLoading message={forgeMessage} current={batchProgress.current} total={batchProgress.total} />}

            {/* Chord Tooltip Overlay */}
            {chordTooltip && chordTooltip.chord && (
                <>
                    {/* Transparent backdrop only on persistent (mobile/tap) mode */}
                    {chordTooltip.isPersistent && (
                        <div
                            className="fixed inset-0 z-[9998]"
                            onClick={() => setChordTooltip(null)}
                        />
                    )}
                    <ChordTooltip
                        chord={chordTooltip.chord}
                        anchor={chordTooltip.anchor}
                        onClose={() => setChordTooltip(null)}
                    />
                </>
            )}

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative">
                {/* Visual Header */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4 no-print">
                    <div className="flex items-center space-x-4">
                        <Flame className="w-10 h-10 text-[#B87333]" />
                        <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase leading-none">IRON<span className="text-[#B87333]">CHORDS</span></h1>
                    </div>
                    <div className="flex items-center space-x-3 opacity-40">
                        <div className="h-0.5 w-12 bg-[#B87333]"></div>
                        <span className="text-[10px] font-black uppercase tracking-[0.5em]">Forge Your Sound</span>
                        <div className="h-0.5 w-12 bg-[#B87333]"></div>
                    </div>
                </div>

                {activeTab === 'player' ? (
                    <div className="fixed inset-0 bg-[#070709] z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-500">
                        {/* PLAYER HEADER */}
                        <div className="h-20 bg-black/40 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl shrink-0 no-print">
                            <div className="flex items-center space-x-6">
                                <button onClick={() => { setActiveTab('manual'); setCurrentStep(3); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{currentSong?.song_name}</h2>
                                    <p className="text-[10px] font-bold text-[#B87333] uppercase tracking-widest mt-1 opacity-60 italic">{currentSong?.artist_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2 border-r border-white/10 pr-6">
                                    <button
                                        onClick={handlePrint}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-slate-400 hover:text-white"
                                        title="Imprimir Cifra"
                                    >
                                        <Printer className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (currentSong) {
                                                const res = await saveOneChordToAcervo(currentSong, true);
                                                if (res.success) {
                                                    setShowSaveSuccess(true);
                                                    setTimeout(() => setShowSaveSuccess(false), 2000);
                                                }
                                            }
                                        }}
                                        className="p-3 bg-white/5 hover:bg-[#B87333]/20 rounded-xl transition-all border border-white/5 text-slate-400 hover:text-[#B87333]"
                                        title="Salvar no Acervo"
                                    >
                                        <Archive className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tom Atual</span>
                                    <div className="flex items-center space-x-3 bg-black/40 px-5 py-2 rounded-xl border border-[#B87333]/20 shadow-[0_0_15px_rgba(184,115,51,0.1)]">
                                        <Music className="w-4 h-4 text-[#B87333]" />
                                        <span className="text-sm font-black text-white uppercase italic">{currentSong?.sounding_key || currentSong?.song_key}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end opacity-40">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Original</span>
                                    <div className="flex items-center space-x-3 bg-black/20 px-4 py-1.5 rounded-xl border border-white/5">
                                        <span className="text-xs font-black text-slate-400 uppercase italic">{currentSong?.original_key || currentSong?.song_key}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Escala</span>
                                    <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                        <button onClick={() => setPlayerFontSize(prev => Math.max(12, prev - 1))} className="p-2 text-slate-500 hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                                        <span className="text-xs font-black text-white w-8 text-center">{playerFontSize}</span>
                                        <button onClick={() => setPlayerFontSize(prev => Math.min(45, prev + 1))} className="p-2 text-slate-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tabs</span>
                                        <button
                                            onClick={() => setIncludeTabs(!includeTabs)}
                                            className={`p-3 rounded-xl transition-all border ${includeTabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                            title={includeTabs ? "Esconder Tablaturas" : "Mostrar Tablaturas"}
                                        >
                                            <FileText className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* PLAYER PLAYLIST SIDEBAR */}
                            <div className="w-80 bg-black/40 border-r border-white/5 flex flex-col p-6 space-y-6 shrink-0 relative no-print">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <LayoutList className="w-4 h-4 text-[#B87333]" />
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Fila de Execução</h3>
                                    </div>
                                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                        <button onClick={() => setShowPlaylistManager(!showPlaylistManager)} className={`p-1.5 rounded-md transition-all ${showPlaylistManager ? 'bg-[#B87333] text-white' : 'text-slate-600 hover:text-slate-400'}`}><Save className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>

                                {showPlaylistManager && (
                                    <div className="bg-[#B87333]/10 border border-[#B87333]/30 p-4 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                                        <p className="text-[9px] font-black text-[#B87333] uppercase mb-3">Salvar Setlist</p>
                                        <div className="flex space-x-2">
                                            <input type="text" placeholder="Nome..." value={playlistNameInput} onChange={e => setPlaylistNameInput(e.target.value)} className="flex-1 bg-black/40 border border-[#B87333]/20 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none" />
                                            <button onClick={() => { if (!playlistNameInput.trim()) return; setSavedPlaylists({ ...savedPlaylists, [playlistNameInput]: songs }); localStorage.setItem('iron_chords_playlists', JSON.stringify({ ...savedPlaylists, [playlistNameInput]: songs })); setPlaylistNameInput(''); setShowPlaylistManager(false); }} className="bg-[#B87333] text-white p-2 rounded-lg hover:bg-[#8B4513] transition-all"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        {Object.keys(savedPlaylists).length > 0 && (
                                            <div className="mt-4 space-y-2 border-t border-[#B87333]/20 pt-3">
                                                {Object.keys(savedPlaylists).map(name => (
                                                    <div key={name} className="flex items-center justify-between group">
                                                        <button onClick={() => { setSongs(savedPlaylists[name]); setSelectedManualIndex(0); setShowPlaylistManager(false); }} className="text-[10px] font-bold text-slate-400 hover:text-white truncate flex-1 text-left uppercase italic">{name}</button>
                                                        <button onClick={() => { const next = { ...savedPlaylists }; delete next[name]; setSavedPlaylists(next); localStorage.setItem('iron_chords_playlists', JSON.stringify(next)); }} className="text-red-900 opacity-0 group-hover:opacity-100 transition-all ml-2"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[#B87333]/20">
                                    {songs.map((s, idx) => (
                                        <button key={idx} onClick={() => { setSelectedManualIndex(idx); setCurrentLineIndex(0); currentLineIndexRef.current = 0; }} className={`w-full p-4 rounded-2xl border transition-all text-left flex items-center space-x-4 group relative overflow-hidden ${selectedManualIndex === idx ? 'bg-[#B87333] border-[#B87333] shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 hover:border-[#B87333]/30'}`}>
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${selectedManualIndex === idx ? 'bg-white text-[#B87333]' : 'bg-black/60 text-slate-700 group-hover:text-white'}`}>{idx + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-[11px] font-black uppercase italic truncate tracking-tight transition-colors ${selectedManualIndex === idx ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{s.song_name}</p>
                                                <p className={`text-[9px] font-bold uppercase truncate transition-colors ${selectedManualIndex === idx ? 'text-white/60' : 'text-slate-600'}`}>{s.artist_name}</p>
                                            </div>
                                            {selectedManualIndex === idx && <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-full -mr-6 -mt-6"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* PLAYER LYRICS/CHORDS AREA */}
                            <div className="flex-1 relative flex flex-col bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]">
                                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-16 scroll-smooth scrollbar-none pb-64">

                                    <div className="max-w-4xl mx-auto space-y-1 printable-area">
                                        {/* Print Only Header */}
                                        <div className="print-only mb-10 border-b-4 border-black pb-10 text-black">
                                            <div className="flex flex-col items-center mb-12">
                                                <div className="flex items-center space-x-4">
                                                    <Flame className="w-10 h-10 text-black" />
                                                    <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">IRON<span className="text-black">CHORDS</span></h1>
                                                </div>
                                            </div>
                                            <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">{currentSong?.song_name}</h1>
                                            <div className="flex justify-between items-end">
                                                <p className="text-xl font-bold text-slate-700 uppercase">{currentSong?.artist_name}</p>
                                                <p className="text-2xl font-black uppercase italic tracking-widest">Tom: {currentSong?.sounding_key || currentSong?.song_key}</p>
                                            </div>
                                        </div>
                                        {(currentSong?.content || "").split('\n').map((line, lIdx) => {
                                            const isChordLine = !!(line && line.trim().length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, line.trim().length * 0.25));
                                            const isTabLine = line.includes('|-') || line.includes('-|');

                                            if (!includeTabs && isTabLine) return null;

                                            const isActive = currentLineIndex === lIdx;
                                            const isPast = lIdx < currentLineIndex;

                                            return (
                                                <div
                                                    key={lIdx}
                                                    data-line-index={lIdx}
                                                    onClick={() => handleLineClick(lIdx)}
                                                    className={`py-1 px-4 rounded-xl cursor-pointer transition-all duration-500 flex items-center group relative 
                                                        ${isActive ? 'bg-[#B87333]/25 scale-[1.02] z-10' : 'hover:bg-white/5'}
                                                        ${isPast ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                                                    `}
                                                    style={{ fontSize: `${playerFontSize}px` }}
                                                >
                                                    {isActive && <div className="absolute left-0 w-2 h-full bg-[#B87333] rounded-full shadow-[0_0_20px_rgba(184,115,51,0.8)] animate-pulse"></div>}
                                                    <pre className={`font-mono leading-relaxed whitespace-pre-wrap transition-colors duration-500 
                                                        ${isActive ? 'text-white font-black' : isChordLine ? 'text-[#B87333] font-bold italic opacity-80' : 'text-slate-400 font-medium'}
                                                    `}>
                                                        {isChordLine
                                                            ? renderChordLine(line, (chord, anchor, isPersistent) => setChordTooltip({ chord, anchor, isPersistent }))
                                                            : (line || ' ')}
                                                    </pre>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* NEXT LINE PREVIEW OVERLAY */}
                                {currentLineIndex < (currentSong?.content || "").split('\n').length - 1 && (
                                    <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl px-8 animate-in slide-in-from-bottom-4 duration-500 pointer-events-none">
                                        <div className="bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center space-x-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-[#B87333] uppercase tracking-[0.3em] mb-1">Próxima Linha</span>
                                                <p className="text-xs font-bold text-slate-300 truncate italic">
                                                    {(() => {
                                                        const lines = (currentSong.content || "").split('\n');
                                                        let nextIdx = currentLineIndex + 1;
                                                        while (nextIdx < lines.length && (!lines[nextIdx].trim() || !!(lines[nextIdx].match(CHORD_TOKEN_RE) || []).length)) {
                                                            nextIdx++;
                                                        }
                                                        return lines[nextIdx] || "Fim da música";
                                                    })()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* PLAYER CONTROLS FLOATING PANEL */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A]/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center space-x-10 z-[110] no-print">
                                    <div className="flex items-center space-x-6 pr-10 border-r border-white/10">
                                        <button onClick={() => setIsAutoScrolling(!isAutoScrolling)} className={`w-16 h-16 rounded-[24px] flex items-center justify-center transition-all ${isAutoScrolling ? 'bg-[#B87333] text-white shadow-xl shadow-[#B87333]/30 scale-105' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                                            {isAutoScrolling ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                                        </button>
                                        <div className="w-32">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">Scrolloff</span>
                                                <span className="text-[10px] font-black text-white italic">{scrollSpeed}x</span>
                                            </div>
                                            <input type="range" min="0.5" max="5" step="0.5" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#B87333]" />
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-10 pr-10 border-r border-white/10">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 leading-none">Microfone</span>
                                            <button onClick={() => setMicEnabled(!micEnabled)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border ${micEnabled ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/40 animate-pulse' : 'bg-white/5 border-white/10 text-slate-600 hover:text-slate-400'}`}>
                                                <Mic className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 leading-none">Ritmagem</span>
                                            <button onClick={() => setIsRhythmicMode(!isRhythmicMode)} className={`px-6 py-2.5 rounded-full border text-[10px] font-black uppercase transition-all italic tracking-widest ${isRhythmicMode ? 'bg-green-600/80 border-green-600 text-white' : 'bg-white/5 border-white/10 text-slate-700'}`}>
                                                {isRhythmicMode ? 'Autosync' : 'Manual'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-6 relative group">
                                        <div className={`w-14 h-14 rounded-2xl bg-black/40 border-2 flex items-center justify-center transition-all duration-500 ${isBpmSyncing ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-[#B87333]/20 shadow-none'}`}>
                                            <Zap className={`w-6 h-6 ${isBpmSyncing ? 'text-yellow-500 animate-bounce' : 'text-[#B87333] opacity-40'}`} />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-white italic leading-none">{bpm}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest italic">Pulsos/Min</p>
                                        </div>
                                        <div className="flex flex-col space-y-1">
                                            <button onClick={() => setBpm(b => b + 1)} className="p-1 hover:text-[#B87333] transition-all"><ChevronUp className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setBpm(b => b - 1)} className="p-1 hover:text-[#B87333] transition-all"><ChevronDown className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'presentation' ? (
                    <div className="fixed inset-0 bg-black z-[200] flex flex-col cursor-none">
                        <div className="flex-1 flex flex-col items-center justify-center p-20">
                            <h2 className="text-4xl font-black text-[#B87333] uppercase italic mb-10 tracking-[0.2em]">{currentSong?.song_name}</h2>
                            <div className="w-full max-w-6xl aspect-video bg-white/5 rounded-[40px] border border-white/10 overflow-hidden flex flex-col">
                                <div className="flex-1 p-20 overflow-y-auto scrollbar-none">
                                    <pre className="text-white font-mono text-5xl leading-tight whitespace-pre-wrap text-center italic">{currentSong?.content}</pre>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setActiveTab('manual')} className="absolute top-10 right-10 p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-white opacity-0 hover:opacity-100 transition-all"><X className="w-8 h-8" /></button>
                    </div>
                ) : (
                    <div className="selection-branch-root flex flex-col min-h-[600px] h-full">
                        <div className="no-print">
                            <TopNav current={mainNav} onChange={setMainNav} />
                        </div>
                        <div className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto px-4 pb-20">

                            {/* ABA 1: ESCOLHA DE PEÇAS */}
                            {mainNav === 'escolha' && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700 no-print">
                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-10">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Escolha suas Peças</h2>
                                            </div>
                                            <div className="flex p-1.5 space-x-1.5 bg-black/60 rounded-2xl border border-white/5">
                                                <button onClick={() => setActiveTab('manual')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'manual' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Plus className="w-3 h-3 mr-2 inline" /> Manual</button>
                                                <button onClick={() => setActiveTab('batch')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'batch' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><UploadCloud className="w-3 h-3 mr-2 inline" /> Lote</button>
                                                <button onClick={() => setActiveTab('acervo')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'acervo' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Database className="w-3 h-3 mr-2 inline" /> Acervo</button>
                                            </div>
                                        </div>
                                        <div className="min-h-[400px]">
                                            {activeTab === 'manual' && (
                                                <div className="space-y-10 animate-in fade-in duration-700">
                                                    {/* Search Form */}
                                                    <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-black/40 p-8 rounded-[32px] border border-white/5 shadow-xl relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#B87333]/5 rounded-bl-[100px] pointer-events-none"></div>
                                                        <div className="space-y-6 relative z-10">
                                                            <div className="relative">
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Nome da Música</label>
                                                                <input
                                                                    type="text" required value={songName}
                                                                    onChange={e => { setSongName(e.target.value); setShowSuggestions(true); }}
                                                                    onFocus={() => setShowSuggestions(true)}
                                                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                                    className="w-full bg-[#B87333] border border-[#B87333] rounded-2xl px-5 py-5 text-white outline-none focus:ring-4 focus:ring-[#B87333]/30 transition-all font-black placeholder:text-white/60 shadow-lg shadow-[#B87333]/20" placeholder="Ex: Black"
                                                                />
                                                                {showSuggestions && suggestions.length > 0 && (
                                                                    <div className="absolute z-[100] w-full mt-2 bg-[#16161D] border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-300">
                                                                        <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                                                            <span className="text-[9px] font-black text-[#B87333] uppercase tracking-[0.3em]">Principais Resultados</span>
                                                                        </div>
                                                                        <div className="max-h-[300px] overflow-y-auto scrollbar-thin">
                                                                            {suggestions.map((item, idx) => (
                                                                                <button
                                                                                    key={idx} type="button"
                                                                                    onClick={() => {
                                                                                        const resolvedKey = item.key ? normalizeNote(item.key) : "";
                                                                                        setSongName(item.song);
                                                                                        setArtistName(item.artist);
                                                                                        if (item.key) setSongKey(resolvedKey);
                                                                                        setShowSuggestions(false);
                                                                                        // Auto-trigger search immediately with original key empty string
                                                                                        setTimeout(() => handleManualSubmit(null, item.song, item.artist, resolvedKey), 100);
                                                                                    }}
                                                                                    className="w-full text-left px-6 py-4 hover:bg-[#B87333]/10 transition-all border-b border-white/5 last:border-none flex items-center justify-between group active:bg-[#B87333]/20"
                                                                                >
                                                                                    <div className="flex items-center space-x-4">
                                                                                        <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-[#B87333]/40 group-hover:bg-[#B87333]/10 transition-all">
                                                                                            <Music className="w-4 h-4 text-slate-500 group-hover:text-[#B87333]" />
                                                                                        </div>
                                                                                        <div className="flex flex-col">
                                                                                            <span className="text-xs font-black text-white uppercase italic tracking-tighter group-hover:text-[#B87333] transition-colors">{item.song}</span>
                                                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{item.artist}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center space-x-3">
                                                                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-tighter bg-white/5 px-2 py-1 rounded border border-white/5 group-hover:border-[#B87333]/20 group-hover:text-[#B87333]/50">{item.key || 'TOM'}</span>
                                                                                        <ArrowRight className="w-3 h-3 text-[#B87333] opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                                                                    </div>
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Artista / Banda</label>
                                                                <input
                                                                    type="text" readOnly value={artistName}
                                                                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-5 text-slate-400 outline-none transition-all font-bold cursor-not-allowed opacity-60" placeholder="Selecionado automaticamente"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6 relative z-10">
                                                            <div className="grid grid-cols-1 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tom Original</label>
                                                                    <input
                                                                        type="text" readOnly value={manualPreviewSong?.original_key || songKey}
                                                                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-5 text-slate-400 outline-none transition-all font-bold cursor-not-allowed opacity-60" placeholder="Tom da cifra"
                                                                    />
                                                                </div>
                                                            </div>
                                                            {availableVersions && availableVersions.length > 1 && (
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Versão</label>
                                                                    <select value={songVersion} onChange={e => setSongVersion(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold appearance-none">
                                                                        {availableVersions.map(v => <option key={v.key} value={v.key} className="bg-[#1A1A1A]">{v.name}</option>)}
                                                                    </select>
                                                                </div>
                                                            )}
                                                            {/* Manual search indicator - auto-triggers on suggestion select */}
                                                            {manualLoading && (
                                                                <div className="w-full py-4 flex items-center justify-center space-x-3 text-[#B87333]">
                                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">Buscando cifra...</span>
                                                                </div>
                                                            )}
                                                            {/* Hidden submit for keyboard Enter support */}
                                                            <button type="submit" disabled={manualLoading} className="sr-only" aria-hidden="true">Buscar</button>
                                                        </div>
                                                    </form>

                                                    {/* Live Preview Area (Stage View) */}
                                                    {manualPreviewSong && (
                                                        <div className={`
                                                            ${isManualFullscreen
                                                                ? 'fixed inset-0 z-[9999] bg-[#070709] bg-grid-white/[0.02]'
                                                                : 'bg-[#16161D] border border-white/10 rounded-[40px] shadow-2xl mt-12'} 
                                                            animate-in fade-in slide-in-from-top-10 duration-700 overflow-hidden flex flex-col transition-all printable-area
                                                        `}>

                                                            {/* Scroll Progress Bar (Top) */}
                                                            {isManualFullscreen && (
                                                                <div className="absolute top-0 left-0 w-full h-[6px] bg-white/5 z-[100]">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-[#B87333] via-orange-400 to-[#B87333] transition-all duration-300"
                                                                        style={{ width: `${scrollProgress}%` }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {/* Floating Controller (Stage View) */}
                                                            <div className={`
                                                                ${isManualFullscreen
                                                                    ? `fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ${showPlayerControls ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-95 pointer-events-none'}`
                                                                    : 'bg-black/60 border-b border-white/10 p-4 flex flex-wrap items-center justify-between gap-4 relative z-20'}
                                                            `}>
                                                                <div className={`
                                                                    flex items-center gap-6 no-print
                                                                    ${isManualFullscreen ? 'bg-[#12121A]/95 backdrop-blur-3xl px-8 py-4 rounded-[32px] border border-[#B87333]/30 shadow-[0_20px_80px_rgba(0,0,0,0.9)] ring-1 ring-white/10' : ''}

                                                                `}>
                                                                    {/* Left: Info & Nav */}
                                                                    <div className="flex items-center space-x-4 border-r border-white/10 pr-6">
                                                                        {songs.length > 1 && (
                                                                            <div className="flex items-center space-x-1 mr-2">
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const idx = songs.findIndex(s => s.song_name === manualPreviewSong.song_name);
                                                                                        const prevIdx = (idx - 1 + songs.length) % songs.length;
                                                                                        setManualPreviewSong(songs[prevIdx]);
                                                                                    }}
                                                                                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all border border-white/5"
                                                                                >
                                                                                    <ChevronLeft className="w-5 h-5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        const idx = songs.findIndex(s => s.song_name === manualPreviewSong.song_name);
                                                                                        const nextIdx = (idx + 1) % songs.length;
                                                                                        setManualPreviewSong(songs[nextIdx]);
                                                                                    }}
                                                                                    className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all border border-white/5"
                                                                                >
                                                                                    <ChevronRight className="w-5 h-5" />
                                                                                </button>
                                                                            </div>
                                                                        )}

                                                                        {!isManualFullscreen && (
                                                                            <div className="hidden sm:block whitespace-nowrap">
                                                                                <h4 className="text-sm font-black text-white uppercase italic leading-tight">{manualPreviewSong.song_name}</h4>
                                                                                <p className="text-[9px] font-bold text-[#B87333] uppercase opacity-60 leading-tight">{manualPreviewSong.artist_name}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Center: Music Controls */}
                                                                    <div className="flex items-center space-x-6">
                                                                        {/* Tabs Toggle */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tabs</span>
                                                                            <button
                                                                                onClick={() => setIncludeTabs(!includeTabs)}
                                                                                className={`w-11 h-9 rounded-lg flex items-center justify-center transition-all border ${includeTabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                                                            >
                                                                                <FileText className="w-4 h-4" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Columns Toggle */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Layout</span>
                                                                            <button
                                                                                onClick={() => setIsManualColumns(!isManualColumns)}
                                                                                className={`w-11 h-9 rounded-lg flex items-center justify-center transition-all border ${isManualColumns ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                                                                title={isManualColumns ? "Mudar para 1 coluna" : "Mudar para 2 colunas"}
                                                                            >
                                                                                <Layout className="w-4 h-4" />
                                                                            </button>
                                                                        </div>

                                                                        {/* Capo */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Capo</span>
                                                                            <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
                                                                                <button onClick={() => setManualCapo(prev => Math.max(0, prev - 1))} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3 h-3" /></button>
                                                                                <span className="text-[10px] font-black text-white w-4 text-center">{manualCapo}</span>
                                                                                <button onClick={() => setManualCapo(prev => Math.min(12, prev + 1))} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Tom */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tom</span>
                                                                            <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
                                                                                <button onClick={async () => {
                                                                                    const currentKeyToUse = manualPreviewSong.sounding_key || manualPreviewSong.song_key || 'C';
                                                                                    try {
                                                                                        const res = await fetch('http://127.0.0.1:8000/api/transpose', {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: manualPreviewSong.content, current_key: currentKeyToUse, semitones: -1 })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...manualPreviewSong, content: data.transposed_content, sounding_key: data.new_key });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3 h-3" /></button>
                                                                                <div className="flex flex-col items-center">
                                                                                    <span className="text-[10px] font-black text-white w-6 text-center italic">{manualPreviewSong.sounding_key || manualPreviewSong.song_key}</span>
                                                                                    <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest mt-0.5">({manualPreviewSong.original_key || manualPreviewSong.song_key})</span>
                                                                                </div>
                                                                                <button onClick={async () => {
                                                                                    const currentKeyToUse = manualPreviewSong.sounding_key || manualPreviewSong.song_key || 'C';
                                                                                    try {
                                                                                        const res = await fetch('http://127.0.0.1:8000/api/transpose', {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: manualPreviewSong.content, current_key: currentKeyToUse, semitones: 1 })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...manualPreviewSong, content: data.transposed_content, sounding_key: data.new_key });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Scroll */}
                                                                        <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
                                                                            <button
                                                                                onClick={() => setIsManualAutoScrolling(!isManualAutoScrolling)}
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isManualAutoScrolling ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/40' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                                                            >
                                                                                {isManualAutoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                                                            </button>
                                                                            <div className="w-16 hidden sm:block">
                                                                                <input type="range" min="0.5" max="5" step="0.5" value={manualScrollSpeed} onChange={(e) => setManualScrollSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#B87333]" />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Right: Actions */}
                                                                    <div className="flex items-center space-x-3 border-l border-white/10 pl-6">
                                                                        {/* Add to List Button */}
                                                                        <button
                                                                            onClick={() => {
                                                                                if (manualPreviewSong && !songs.some(s => s.song_name === manualPreviewSong.song_name && s.artist_name === manualPreviewSong.artist_name)) {
                                                                                    setSongs(prev => [...prev, manualPreviewSong]);
                                                                                }
                                                                                setSongName('');
                                                                                setArtistName('');
                                                                            }}
                                                                            className="px-6 py-3 bg-[#B87333] hover:bg-[#A86323] text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center space-x-2 shrink-0"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                            <span>Salvar Lista</span>
                                                                        </button>

                                                                        {/* Fullscreen/Exit/Print */}
                                                                        <div className="flex items-center space-x-2">
                                                                            <button
                                                                                onClick={handlePrint}
                                                                                className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                                                                title="Imprimir Cifra"
                                                                            >
                                                                                <Printer className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (manualPreviewSong) {
                                                                                        const res = await saveOneChordToAcervo(manualPreviewSong, true);
                                                                                        if (res.success) {
                                                                                            setShowSaveSuccess(true);
                                                                                            setTimeout(() => setShowSaveSuccess(false), 2000);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="w-10 h-10 bg-white/5 hover:bg-[#B87333]/20 text-slate-400 hover:text-[#B87333] rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                                                                title="Salvar no Acervo"
                                                                            >
                                                                                <Archive className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setIsVideokeOpen(true)}
                                                                                className="w-10 h-10 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-xl transition-all border border-[#B87333]/20 flex items-center justify-center group"
                                                                                title="Abrir Modo Videokê (IA)"
                                                                            >
                                                                                <Tv className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setIsManualFullscreen(!isManualFullscreen)}
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isManualFullscreen ? 'bg-red-900/40 text-red-500 border-red-500/20' : 'bg-white/5 text-slate-500 hover:text-white border-white/5'} border`}
                                                                                title={isManualFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
                                                                            >
                                                                                {isManualFullscreen ? <X className="w-5 h-5" /> : <Maximize2 className="w-4 h-4" />}
                                                                            </button>
                                                                            {!isManualFullscreen && (
                                                                                <button onClick={() => setManualPreviewSong(null)} className="w-10 h-10 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/5 flex items-center justify-center" title="Fechar"><X className="w-5 h-5" /></button>
                                                                            )}
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Scrollable Chord Content (Optimized Stage View) */}
                                                            <div
                                                                ref={manualScrollContainerRef}
                                                                className={`
                                                                    flex-1 overflow-y-auto ${isManualFullscreen ? 'p-10 md:p-20 pt-16 md:pt-24' : 'p-10'} 
                                                                    scrollbar-none pb-32 transition-all
                                                                `}
                                                                style={{ maxHeight: isManualFullscreen ? '100vh' : '500px' }}
                                                            >
                                                                <div className="printable-area">
                                                                    {/* Print Only Header */}
                                                                    <div className="print-only mb-10 border-b-4 border-black pb-10 text-black">
                                                                        <div className="flex flex-col items-center mb-12">
                                                                            <div className="flex items-center space-x-4">
                                                                                <Flame className="w-10 h-10 text-black" />
                                                                                <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">IRON<span className="text-black">CHORDS</span></h1>
                                                                            </div>
                                                                        </div>
                                                                        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-2">{manualPreviewSong?.song_name}</h1>
                                                                        <div className="flex justify-between items-end">
                                                                            <p className="text-xl font-bold text-slate-700 uppercase">{manualPreviewSong?.artist_name}</p>
                                                                            <p className="text-2xl font-black uppercase italic tracking-widest">Tom: {manualPreviewSong?.sounding_key || manualPreviewSong?.song_key}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Display Info Overlay for Fullscreen Stage View */}
                                                                    {isManualFullscreen && showPlayerControls && (
                                                                        <div className="max-w-7xl mx-auto mb-16 animate-in fade-in slide-in-from-left-10 duration-500 print:hidden">
                                                                            <div className="flex items-baseline space-x-6">
                                                                                <h1 className="text-6xl font-black text-white italic tracking-tighter uppercase">{manualPreviewSong.song_name}</h1>
                                                                                {manualPreviewSong.capo > 0 && (
                                                                                    <span className="text-2xl font-black text-[#B87333] border-l border-white/10 pl-6 uppercase tracking-widest">Capo {manualPreviewSong.capo}ª Casa</span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xl font-black text-[#B87333] uppercase tracking-[0.4em] mt-4 opacity-70 italic">{manualPreviewSong.artist_name}</p>
                                                                        </div>
                                                                    )}

                                                                    <div className={`
                                                                        ${isManualFullscreen && isManualColumns ? 'max-w-7xl mx-auto stage-columns-2 gap-20' : 'max-w-3xl mx-auto'}
                                                                    `}>
                                                                        {(manualPreviewSong?.content || "").split('\n').map((line, lIdx) => {
                                                                            const isChordLine = !!(line && line.trim().length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, line.trim().length * 0.5));
                                                                            const isTabLine = line.includes('|-') || line.includes('-|');

                                                                            // Skip tab lines if includeTabs is false
                                                                            if (!includeTabs && isTabLine) return null;

                                                                            return (
                                                                                <pre key={lIdx} className={`font-mono leading-relaxed whitespace-pre-wrap break-inside-avoid ${isChordLine ? 'text-[#B87333] font-black italic tracking-tight mb-0' : 'text-slate-300 font-medium mb-1'}`} style={{ fontSize: `${manualFontSize}px` }}>
                                                                                    {isChordLine
                                                                                        ? renderChordLine(line, (chord, anchor, isPersistent) => setChordTooltip({ chord, anchor, isPersistent }))
                                                                                        : (line || ' ')}
                                                                                </pre>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}


                                                    {/* Error display */}
                                                    {manualError && (
                                                        <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-[24px] mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                                                            <div className="flex items-center space-x-3 text-red-400 mb-4">
                                                                <AlertCircle className="w-5 h-5" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{typeof manualError === 'string' ? manualError : 'Música não encontrada'}</span>
                                                            </div>

                                                            {suggestions.length > 0 && (
                                                                <div className="mt-4 space-y-2">
                                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-1">Tente uma destas:</p>
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {suggestions.map((s, i) => (
                                                                            <button
                                                                                key={i}
                                                                                onClick={() => {
                                                                                    setSongName(s.song);
                                                                                    setArtistName(s.artist);
                                                                                    handleManualSubmit(null, s.song, s.artist, s.key || "");
                                                                                }}
                                                                                className="flex items-center justify-between p-4 bg-black/40 hover:bg-[#B87333]/10 border border-white/5 hover:border-[#B87333]/30 rounded-2xl transition-all group"
                                                                            >
                                                                                <div className="flex items-center space-x-4">
                                                                                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                                                                                        <Music className="w-4 h-4 text-[#B87333]" />
                                                                                    </div>
                                                                                    <div className="flex flex-col text-left">
                                                                                        <span className="text-[10px] font-black text-white uppercase italic">{s.song}</span>
                                                                                        <span className="text-[8px] font-bold text-slate-500 uppercase">{s.artist}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center space-x-3">
                                                                                    {s.key && <span className="text-[8px] font-black text-slate-600 bg-white/5 px-2 py-0.5 rounded">{s.key}</span>}
                                                                                    <Plus className="w-4 h-4 text-[#B87333] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* LISTA DE MUSICAS SELECIONADAS */}
                                                    {songs.length > 0 && (
                                                        <div className="pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                                            <div className="flex items-center justify-between mb-6">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="w-1.5 h-8 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Pecas na Forja</h3>
                                                                </div>
                                                                <div className="flex items-center space-x-3">
                                                                    <span className="text-xs font-black bg-[#B87333] text-white py-1.5 px-4 rounded-full shadow-lg shadow-[#B87333]/20 uppercase italic">{songs.length}</span>
                                                                    <button onClick={() => setSaveListModalOpen(true)} className="px-4 py-1.5 bg-white/5 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/30 rounded-full font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2">
                                                                        <Save className="w-3 h-3" />
                                                                        <span>Salvar Lista</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {songs.map((song, i) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => {
                                                                            setManualPreviewSong(song);
                                                                            setSongName(song.song_name);
                                                                            setArtistName(song.artist_name);
                                                                            setSongKey(song.song_key);
                                                                            setManualCapo(song.capo || 0);
                                                                        }}
                                                                        className={`bg-black/60 border p-5 rounded-[24px] group hover:border-[#B87333]/50 transition-all relative overflow-hidden flex flex-col justify-between text-left ${manualPreviewSong?.song_name === song.song_name && manualPreviewSong?.artist_name === song.artist_name ? 'border-[#B87333]/60' : 'border-white/5'}`}
                                                                    >
                                                                        <div className="absolute top-0 right-0 w-16 h-16 bg-[#B87333]/5 rounded-bl-[40px] -mr-4 -mt-4 group-hover:bg-[#B87333]/10 transition-all"></div>
                                                                        <div className="mb-3 z-10">
                                                                            <h4 className="font-black text-white text-sm uppercase italic tracking-tighter truncate group-hover:text-[#B87333] transition-colors">{song.song_name}</h4>
                                                                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1 truncate">{song.artist_name}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-between pt-3 border-t border-white/5 z-10 w-full">
                                                                            <span className="text-[10px] font-black text-white italic">{song.sounding_key || song.song_key}{song.capo > 0 && ` · Capo ${song.capo}`}</span>
                                                                            <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                                                                                <button onClick={() => toggleChords(i)} className={`w-7 h-7 flex items-center justify-center rounded-lg border transition-all ${song.show_chords ? 'bg-[#B87333] text-white border-[#B87333]/30' : 'bg-white/5 text-slate-700 border-white/5 hover:text-[#B87333]'}`}><Guitar className="w-3 h-3" /></button>
                                                                                <button
                                                                                    onClick={async (e) => {
                                                                                        e.stopPropagation();
                                                                                        try {
                                                                                            const res = await fetch('http://127.0.0.1:8000/api/music/manual', {
                                                                                                method: 'POST',
                                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                                body: JSON.stringify({
                                                                                                    song_name: song.song_name,
                                                                                                    artist_name: song.artist_name,
                                                                                                    key: song.original_key || song.song_key || '',
                                                                                                    version: 'Principal',
                                                                                                    include_tabs: true,
                                                                                                    capo: 0
                                                                                                })
                                                                                            });
                                                                                            const data = await res.json();
                                                                                            if (data.content) {
                                                                                                const newSongs = [...songs];
                                                                                                newSongs[i].content = data.content;
                                                                                                newSongs[i].sounding_key = data.sounding_key || data.original_key || data.requested_key;
                                                                                                newSongs[i].song_key = data.requested_key || data.original_key;
                                                                                                newSongs[i].capo = 0;
                                                                                                const hasParsedTabs = data.content ? (data.content.includes('|-') || data.content.includes('-|')) : false;
                                                                                                newSongs[i].include_tabs = hasParsedTabs;
                                                                                                setSongs(newSongs);
                                                                                                if (manualPreviewSong?.song_name === song.song_name && manualPreviewSong?.artist_name === song.artist_name) {
                                                                                                    setManualPreviewSong(newSongs[i]);
                                                                                                    setSongKey(newSongs[i].song_key);
                                                                                                    setManualCapo(0);
                                                                                                    setIncludeTabs(hasParsedTabs);
                                                                                                }
                                                                                            }
                                                                                        } catch (err) { console.error(err); }
                                                                                    }}
                                                                                    className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-[#B87333]/40 text-slate-700 hover:text-[#B87333] rounded-lg border border-white/5 transition-all" title="Voltar ao Original"><RotateCcw className="w-3 h-3" /></button>
                                                                                <button onClick={() => removeSong(i)} className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-red-900/40 text-slate-700 hover:text-red-500 rounded-lg border border-white/5 transition-all"><Trash2 className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'batch' && (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in duration-500 relative">

                                                    {batchError && (
                                                        <div className="w-full max-w-2xl bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-2xl animate-in slide-in-from-top-4 flex items-start space-x-3">
                                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                                            <p className="text-xs font-bold text-red-400">{batchError}</p>
                                                        </div>
                                                    )}

                                                    {!showMappingUI && !showBatchReview ? (
                                                        <div onClick={() => !batchLoading && fileInputRef.current?.click()} className={`w-full max-w-2xl border-2 border-dashed border-white/10 bg-black/20 rounded-[40px] p-16 flex flex-col items-center justify-center transition-all group ${batchLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#B87333]/50 cursor-pointer'}`}>
                                                            <div className={`w-20 h-20 ${batchLoading ? 'bg-black/60 border-[#B87333]/50 relative overflow-hidden shadow-[0_0_30px_rgba(184,115,51,0.15)]' : 'bg-[#B87333]/10 border-[#B87333]/20 group-hover:scale-110'} rounded-3xl flex items-center justify-center mb-6 border transition-all duration-500`}>
                                                                {batchLoading ? (
                                                                    <>
                                                                        <UploadCloud className="w-8 h-8 text-[#B87333]/30" />
                                                                        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px] opacity-20"></div>
                                                                        <div className="absolute left-0 w-full h-[3px] bg-white shadow-[0_0_20px_2px_rgba(184,115,51,1),0_0_5px_rgba(255,255,255,1)] animate-scan-metal"></div>
                                                                    </>
                                                                ) : <UploadCloud className="w-10 h-10 text-[#B87333]" />}
                                                            </div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest">{batchLoading ? 'Processando Arquivo...' : 'Importação em Massa'}</h3>
                                                            <p className="text-xs text-slate-500 uppercase font-bold mt-3">PDF, XLSX ou CSV</p>
                                                            <input type="file" ref={fileInputRef} onChange={handleBatchFileSelect} className="hidden" />
                                                        </div>

                                                    ) : showMappingUI && !showBatchReview ? (
                                                        <div className="w-full max-w-xl bg-black/40 p-8 rounded-[32px] border border-white/5 space-y-6 relative">
                                                            <button onClick={() => setShowMappingUI(false)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/5"><X className="w-5 h-5" /></button>
                                                            <h4 className="text-xs font-black text-[#B87333] uppercase tracking-widest text-center">Mapeamento de Colunas</h4>
                                                            <div className="space-y-4">
                                                                {['song_name', 'artist_name', 'key'].map(field => (
                                                                    <div key={field}>
                                                                        <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block">{field === 'song_name' ? 'Música' : field === 'artist_name' ? 'Artista' : 'Tom'}</label>
                                                                        <select value={batchMapping[field]} onChange={e => setBatchMapping({ ...batchMapping, [field]: e.target.value })} className="w-full bg-black/60 border border-white/10 rounded-xl p-4 text-xs font-bold text-white outline-none">
                                                                            <option value="">Ignorar</option>
                                                                            {batchHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                                        </select>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex space-x-4 pt-4">
                                                                <button onClick={() => setShowMappingUI(false)} className="flex-1 py-4 bg-white/5 text-slate-500 font-black uppercase text-[10px] rounded-xl hover:bg-white/10 transition-all">Voltar</button>
                                                                <button onClick={handleBatchProcess} disabled={batchLoading || !batchMapping.song_name || !batchMapping.artist_name} className="flex-[2] py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase text-[10px] rounded-xl shadow-lg shadow-[#B87333]/20 flex items-center justify-center disabled:opacity-50 transition-opacity">
                                                                    {batchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Processar Lote'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : showBatchReview ? (
                                                        <div className="w-full max-w-4xl bg-black/40 p-8 rounded-[32px] border border-white/5 space-y-6 relative">
                                                            <button onClick={() => { setShowBatchReview(false); setBatchResults([]); }} className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/5"><X className="w-5 h-5" /></button>
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-4 pr-12">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className="w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                                    <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Revisão do Lote</h4>
                                                                </div>
                                                                <div className="flex items-center space-x-4">
                                                                    <button onClick={() => {
                                                                        setSongs([...songs, ...batchResults.filter(r => r.status === 'success')]);
                                                                        setShowBatchReview(false);
                                                                        setBatchResults([]);
                                                                    }} className="px-6 py-3 bg-[#B87333] text-white font-black uppercase text-[10px] italic rounded-xl shadow-lg shadow-[#B87333]/20 hover:bg-[#8B4513] transition-all flex items-center">
                                                                        <Zap className="w-3 h-3 mr-2 inline" /> Integrar à Forja ({batchResults.filter(r => r.status === 'success').length})
                                                                    </button>
                                                                    <button onClick={() => setSaveListModalOpen(true)} className="px-6 py-3 bg-white/5 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/30 rounded-xl font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2">
                                                                        <Save className="w-3 h-3" />
                                                                        <span>Salvar Lista</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#B87333]/20">
                                                                {batchResults.map((item, idx) => (
                                                                    <div key={idx} className={`p-5 rounded-[24px] border ${item.status === 'success' ? 'bg-black/40 border-[#B87333]/30' : 'bg-red-900/10 border-red-500/30'} flex flex-col justify-between transition-all relative overflow-hidden`}>
                                                                        {item.status === 'success' && <div className="absolute top-0 right-0 w-16 h-16 bg-[#B87333]/5 rounded-bl-[40px] -mr-4 -mt-4 pointer-events-none"></div>}
                                                                        <div className="flex items-start justify-between relative z-10">
                                                                            <div className="flex items-center space-x-4 w-1/2">
                                                                                <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center border ${item.status === 'success' ? 'bg-[#B87333]/10 border-[#B87333]/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                                                    {item.status === 'success' ? <CheckCircle className="w-6 h-6 text-[#B87333]" /> : <AlertCircle className="w-6 h-6 text-red-500" />}
                                                                                </div>
                                                                                <div className="min-w-0 flex-1">
                                                                                    {item.status === 'success' ? (
                                                                                        <button
                                                                                            onClick={() => setBatchFixData({ idx, song_name: item.song_name, artist_name: item.artist_name, song_key: item.sounding_key || item.requested_key, content: item.content, capo: item.capo || 0, include_tabs: item.include_tabs || false })}
                                                                                            className="text-left w-full hover:underline decoration-[#B87333] decoration-2 underline-offset-4 outline-none group"
                                                                                            title="Clique para analisar a cifra"
                                                                                        >
                                                                                            <h5 className="font-black text-white uppercase italic tracking-tighter text-lg truncate group-hover:text-[#B87333] transition-colors">{item.song_name}</h5>
                                                                                        </button>
                                                                                    ) : (
                                                                                        <h5 className="font-black text-slate-400 uppercase italic tracking-tighter text-lg truncate">{item.song_name}</h5>
                                                                                    )}
                                                                                    <div className="flex items-center space-x-3 mt-1">
                                                                                        {item.needs_artist || !item.artist_name ? (
                                                                                            <div className="flex items-center space-x-2">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    placeholder="Pendente: Digite o Artista..."
                                                                                                    className="bg-black/60 border border-[#B87333]/50 rounded-lg px-3 py-1 text-[10px] font-bold text-white outline-none w-56 placeholder:text-red-500/50 focus:border-[#B87333] shadow-[0_0_10px_rgba(184,115,51,0.1)] transition-all"
                                                                                                    value={item.artist_name || ''}
                                                                                                    onChange={(e) => {
                                                                                                        const next = [...batchResults];
                                                                                                        next[idx].artist_name = e.target.value;
                                                                                                        setBatchResults(next);
                                                                                                    }}
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') handleTryBatchSuggestion(idx, { song: item.song_name, artist: item.artist_name });
                                                                                                    }}
                                                                                                />
                                                                                                <button
                                                                                                    onClick={() => handleTryBatchSuggestion(idx, { song: item.song_name, artist: item.artist_name })}
                                                                                                    className="p-1.5 bg-[#B87333]/20 text-[#B87333] hover:bg-[#B87333] hover:text-white rounded-lg transition-all border border-[#B87333]/30"
                                                                                                    title="Pesquisar este artista"
                                                                                                >
                                                                                                    <Search size={12} />
                                                                                                </button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{item.artist_name}</p>
                                                                                        )}
                                                                                        {item.in_acervo && <span className="text-[8px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded border border-blue-600/30 uppercase whitespace-nowrap" title="Detectado no Acervo Local">Acervo</span>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center">
                                                                                {item.status === 'success' ? (
                                                                                    <div className="flex items-center space-x-4">
                                                                                        <div className="flex items-center space-x-1.5 bg-black/60 p-2 rounded-xl border border-white/5">
                                                                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">Tom</span>
                                                                                            <button onClick={() => transposeBatchSong(idx, -1)} className="p-1 hover:text-[#B87333] transition-all"><ChevronDown className="w-3.5 h-3.5" /></button>
                                                                                            <span className="font-mono font-black text-xs w-8 text-center text-white">{item.sounding_key || item.requested_key}</span>
                                                                                            <button onClick={() => transposeBatchSong(idx, 1)} className="p-1 hover:text-[#B87333] transition-all"><ChevronUp className="w-3.5 h-3.5" /></button>
                                                                                        </div>
                                                                                        <div className="flex items-center space-x-3 bg-black/60 px-3 py-1.5 rounded-xl border border-white/5">
                                                                                            <span className="text-[9px] font-black text-[#B87333] uppercase">Capo</span>
                                                                                            <select value={item.capo || 0} onChange={(e) => {
                                                                                                const next = [...batchResults];
                                                                                                const c_capo = Number(e.target.value);
                                                                                                next[idx].capo = c_capo;

                                                                                                let s_key = next[idx].requested_key || next[idx].original_key;
                                                                                                if (c_capo > 0 && s_key) {
                                                                                                    const NOTES_ARR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                                                                                                    let baseMatch = s_key.match(/([A-G][b#]?)/i);
                                                                                                    let base = baseMatch ? baseMatch[1] : null;
                                                                                                    if (base) {
                                                                                                        let idxx = NOTES_ARR.indexOf(base);
                                                                                                        if (idxx !== -1) {
                                                                                                            let final_idx = (idxx + c_capo) % 12;
                                                                                                            s_key = s_key.replace(base, NOTES_ARR[final_idx]);
                                                                                                        }
                                                                                                    }
                                                                                                }
                                                                                                next[idx].sounding_key = s_key;
                                                                                                setBatchResults(next);
                                                                                            }} className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer">
                                                                                                {[...Array(13)].map((_, c) => <option key={c} value={c} className="bg-[#1A1A1A]">{c === 0 ? 'Off' : `${c}ª`}</option>)}
                                                                                            </select>
                                                                                        </div>
                                                                                        <button onClick={() => {
                                                                                            const next = [...batchResults];
                                                                                            next[idx].include_tabs = !next[idx].include_tabs;
                                                                                            setBatchResults(next);
                                                                                        }} className={`flex items-center space-x-2 px-3 h-10 rounded-xl transition-all border ${item.include_tabs ? 'bg-[#B87333] text-white border-[#B87333]/30 shadow-[0_0_10px_rgba(184,115,51,0.2)]' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-white'}`}>
                                                                                            <span className="text-[10px] font-black uppercase tracking-wider">Tabs</span>
                                                                                            <div className={`w-6 h-3.5 rounded-full relative transition-colors ${item.include_tabs ? 'bg-white/30' : 'bg-slate-700'}`}>
                                                                                                <div className={`absolute top-0.5 bottom-0.5 w-2.5 rounded-full bg-white shadow-sm transition-all ${item.include_tabs ? 'left-3' : 'left-0.5'}`}></div>
                                                                                            </div>
                                                                                        </button>
                                                                                        <button onClick={() => resetBatchSong(idx)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-all border bg-white/5 text-slate-700 border-white/5 hover:text-red-500 hover:border-red-500/30" title="Voltar ao Original"><RotateCcw className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-end space-y-4">
                                                                                        <div className="flex items-center space-x-4">
                                                                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Não Encontrada</span>
                                                                                            <button onClick={() => setBatchFixData({ idx, song_name: item.song_name, artist_name: item.artist_name, song_key: item.requested_key || 'C', content: '', link: '', capo: 0, include_tabs: false })} className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 font-black uppercase text-[10px] rounded-lg transition-all flex items-center space-x-2">
                                                                                                <Edit3 className="w-3 h-3" />
                                                                                                <span>Inserir / Link</span>
                                                                                            </button>
                                                                                        </div>
                                                                                        {item.suggestions && item.suggestions.length > 0 && (
                                                                                            <div className="flex flex-col items-end space-y-2 group/sug">
                                                                                                <div className="flex items-center space-x-2">
                                                                                                    <div className="w-1.5 h-1.5 bg-[#B87333] rounded-full animate-pulse"></div>
                                                                                                    <span className="text-[9px] font-black text-[#B87333] uppercase tracking-widest opacity-60">Sugestões de Proximidade:</span>
                                                                                                </div>
                                                                                                <div className="flex flex-wrap justify-end gap-2 max-w-md">
                                                                                                    {item.suggestions.slice(0, 3).map((sug, sIdx) => (
                                                                                                        <button
                                                                                                            key={sIdx}
                                                                                                            onClick={() => handleTryBatchSuggestion(idx, sug)}
                                                                                                            disabled={batchLoading}
                                                                                                            className="px-4 py-1.5 bg-[#B87333]/5 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/20 hover:border-[#B87333] text-[9px] font-black uppercase rounded-xl transition-all flex items-center space-x-2 group-hover:scale-105 active:scale-95 disabled:opacity-50"
                                                                                                        >
                                                                                                            <Music className="w-3 h-3" />
                                                                                                            <span>{sug.song} - {sug.artist}</span>
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ) : null}

                                                    {/* Batch Manual Fix Modal */}
                                                    {batchFixData && (
                                                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                                                            <div className="bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                                                                <div className="flex items-center justify-between mb-6 shrink-0">
                                                                    <div className="flex items-center space-x-4">
                                                                        <div className="w-1.5 h-6 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.4)]"></div>
                                                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Inserção Manual - Lote</h3>
                                                                    </div>
                                                                    <button onClick={() => setBatchFixData(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                                                                </div>

                                                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 scrollbar-thin">

                                                                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 flex flex-col space-y-3">
                                                                        <label className="block text-[10px] font-black uppercase text-[#B87333] tracking-widest ml-1">Importar via Link (Opcional)</label>
                                                                        <div className="flex items-center space-x-3">
                                                                            <input type="text" placeholder="Cole a URL do CifraClub aqui..." value={batchFixData.link || ''} onChange={e => setBatchFixData({ ...batchFixData, link: e.target.value })} className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono outline-none focus:border-[#B87333]/50 transition-all" />
                                                                            <button
                                                                                disabled={!batchFixData.link || batchLinkLoading}
                                                                                onClick={async () => {
                                                                                    setBatchLinkLoading(true);
                                                                                    try {
                                                                                        const res = await fetch('http://localhost:8000/api/music/scrape-link', {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ url: batchFixData.link })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (res.ok) {
                                                                                            setBatchFixData(prev => ({
                                                                                                ...prev,
                                                                                                song_name: data.song_name,
                                                                                                artist_name: data.artist_name,
                                                                                                song_key: data.key,
                                                                                                content: data.content,
                                                                                                capo: data.capo || 0,
                                                                                                include_tabs: data.include_tabs || false
                                                                                            }));
                                                                                        } else {
                                                                                            alert(data.detail || "Erro ao importar link");
                                                                                        }
                                                                                    } catch (err) { alert("Erro na requisição."); }
                                                                                    finally { setBatchLinkLoading(false); }
                                                                                }}
                                                                                className={`px-6 py-3 font-black uppercase text-[10px] rounded-xl flex items-center transition-all shadow-lg ${(!batchFixData.link || batchLinkLoading) ? 'bg-white/5 text-slate-500 cursor-not-allowed shadow-none' : 'bg-[#B87333] text-white hover:bg-[#8B4513] shadow-[#B87333]/20'}`}>
                                                                                {batchLinkLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Zap className="w-3 h-3 mr-2" /> Extrair</>}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Artista</label>
                                                                            <input type="text" value={batchFixData.artist_name} onChange={e => setBatchFixData({ ...batchFixData, artist_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none" />
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Música</label>
                                                                            <input type="text" value={batchFixData.song_name} onChange={e => setBatchFixData({ ...batchFixData, song_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none" />
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tom Original da Cifra</label>
                                                                            <select value={batchFixData.song_key} onChange={e => setBatchFixData({ ...batchFixData, song_key: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none">
                                                                                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Capo</label>
                                                                            <select value={batchFixData.capo} onChange={e => setBatchFixData({ ...batchFixData, capo: Number(e.target.value) })} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white outline-none cursor-pointer font-bold appearance-none">
                                                                                {[...Array(13)].map((_, i) => <option key={i} value={i} className="bg-[#1A1A1A]">{i === 0 ? 'Sem Capo' : `${i}ª Casa`}</option>)}
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col justify-center">
                                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tablaturas</label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setBatchFixData(prev => ({ ...prev, include_tabs: !prev.include_tabs }))}
                                                                            className={`w-full py-3 rounded-xl border transition-all font-black uppercase text-[10px] tracking-widest ${batchFixData.include_tabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/60 border-white/10 text-slate-600'}`}
                                                                        >
                                                                            {batchFixData.include_tabs ? 'Ativadas' : 'Desativar'}
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col">
                                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Cifra Bruta</label>
                                                                        <textarea value={batchFixData.content} onChange={e => setBatchFixData({ ...batchFixData, content: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none font-mono text-xs leading-relaxed min-h-[250px] resize-none scrollbar-thin" placeholder="Cole a cifra estruturada aqui..."></textarea>
                                                                    </div>
                                                                </div>

                                                                <button onClick={async () => {
                                                                    if (!batchFixData.content.trim()) return;
                                                                    // Only update the local batch results state. No DB call here.
                                                                    const next = [...batchResults];
                                                                    next[batchFixData.idx] = {
                                                                        ...next[batchFixData.idx],
                                                                        song_name: batchFixData.song_name,
                                                                        artist_name: batchFixData.artist_name,
                                                                        requested_key: batchFixData.song_key,
                                                                        original_key: batchFixData.song_key,
                                                                        sounding_key: batchFixData.song_key,
                                                                        content: batchFixData.content,
                                                                        capo: batchFixData.capo,
                                                                        include_tabs: batchFixData.include_tabs,
                                                                        status: 'success'
                                                                    };
                                                                    setBatchResults(next);
                                                                    setBatchFixData(null);
                                                                }} className="w-full mt-6 py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 shrink-0">
                                                                    Salvar no Lote
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'acervo' && (
                                                <div className="space-y-6 animate-in fade-in duration-500">
                                                    {/* Search and Bulk Actions */}
                                                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                                                        <div className="relative flex-1 text-white text-sm">
                                                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                                            <input
                                                                type="text"
                                                                placeholder="Buscar música ou artista no acervo..."
                                                                value={acervoSearchTerm}
                                                                onChange={e => setAcervoSearchTerm(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/10 rounded-[28px] pl-16 pr-6 py-5 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700 shadow-inner"
                                                            />
                                                        </div>
                                                        {selectedAcervoItems.length > 0 && (
                                                            <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-300">
                                                                <button onClick={() => setSelectedAcervoItems([])} className="px-6 py-5 bg-white/5 border border-white/10 hover:bg-white/10 rounded-[28px] text-slate-400 font-bold text-xs uppercase transition-all shadow-inner hover:text-white">Cancelar</button>
                                                                <button onClick={() => handleDeleteAcervo(selectedAcervoItems, `${selectedAcervoItems.length} músicas selecionadas`)} className="px-6 py-5 bg-red-600/20 border border-red-500/30 hover:bg-red-600 rounded-[28px] text-red-500 font-bold text-xs uppercase transition-all shadow-xl hover:text-white flex items-center shadow-red-900/20 gap-2"><Trash2 className="w-4 h-4" /> Excluir ({selectedAcervoItems.length})</button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Select All Toggle */}
                                                    {acervo.length > 0 && !acervoLoading && (
                                                        <div className="mb-4 flex items-center justify-between px-2">
                                                            <label className="flex items-center space-x-3 cursor-pointer group">
                                                                <div className="relative flex items-center justify-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        className="peer sr-only"
                                                                        checked={selectedAcervoItems.length > 0 && selectedAcervoItems.length === acervo.filter(item => item.song_name.toLowerCase().includes(acervoSearchTerm.toLowerCase()) || item.artist_name.toLowerCase().includes(acervoSearchTerm.toLowerCase())).length}
                                                                        onChange={(e) => {
                                                                            const filtered = acervo.filter(item => item.song_name.toLowerCase().includes(acervoSearchTerm.toLowerCase()) || item.artist_name.toLowerCase().includes(acervoSearchTerm.toLowerCase()));
                                                                            if (e.target.checked) setSelectedAcervoItems(filtered.map(i => i.id));
                                                                            else setSelectedAcervoItems([]);
                                                                        }}
                                                                    />
                                                                    <div className="w-5 h-5 border-2 border-white/20 rounded-md peer-checked:bg-[#B87333] peer-checked:border-[#B87333] transition-all flex items-center justify-center group-hover:border-[#B87333]/50">
                                                                        <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                    </div>
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Selecionar Todos Visíveis</span>
                                                            </label>
                                                        </div>
                                                    )}

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto pr-4 scrollbar-thin pb-10">
                                                        {acervoLoading ? (
                                                            <div className="col-span-full py-20 text-center"><RefreshCw className="w-10 h-10 animate-spin text-[#B87333] mx-auto mb-4" /><p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronizando Banco...</p></div>
                                                        ) : acervo.filter(item => item.song_name.toLowerCase().includes(acervoSearchTerm.toLowerCase()) || item.artist_name.toLowerCase().includes(acervoSearchTerm.toLowerCase())).map((item, idx) => (
                                                            <div key={idx} className={`bg-black/40 border p-6 rounded-[28px] flex items-center justify-between transition-all group relative overflow-hidden flex-col sm:flex-row gap-4 ${selectedAcervoItems.includes(item.id) ? 'border-[#B87333]/50 bg-[#B87333]/5' : 'border-white/5 hover:border-[#B87333]/30'}`}>
                                                                <div className={`absolute top-0 left-0 w-1 h-full transition-all ${selectedAcervoItems.includes(item.id) ? 'bg-[#B87333]' : 'bg-[#B87333]/20 group-hover:bg-[#B87333]"'}`}></div>

                                                                {/* Checkbox */}
                                                                <div className="absolute top-4 left-4 z-10 w-full flex justify-start sm:w-auto sm:relative sm:top-0 sm:left-0 sm:h-full sm:items-center sm:pr-2">
                                                                    <label className="cursor-pointer relative flex items-center justify-center p-2 -m-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="peer sr-only"
                                                                            checked={selectedAcervoItems.includes(item.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) setSelectedAcervoItems([...selectedAcervoItems, item.id]);
                                                                                else setSelectedAcervoItems(selectedAcervoItems.filter(id => id !== item.id));
                                                                            }}
                                                                        />
                                                                        <div className="w-5 h-5 border-2 border-white/20 rounded-md peer-checked:bg-[#B87333] peer-checked:border-[#B87333] transition-all flex items-center justify-center hover:border-[#B87333]/50">
                                                                            <Check className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                                                        </div>
                                                                    </label>
                                                                </div>

                                                                <div className="flex-1 min-w-0 px-2 w-full text-left mt-6 sm:mt-0 sm:pr-4">
                                                                    <p className="text-sm font-black text-white uppercase italic truncate">{item.song_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase transition-colors group-hover:text-[#B87333]/60">
                                                                        {item.artist_name} • {item.song_key}
                                                                        {item.capo > 0 && <span className="ml-3 px-2 py-0.5 bg-[#B87333]/20 text-[#B87333] rounded-md font-bold tracking-widest text-[8px] animate-pulse whitespace-nowrap">CAPO NA {item.capo}ª CASA</span>}
                                                                    </p>
                                                                </div>
                                                                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                                                                    <button onClick={() => setSongs([...songs, { ...item, requested_key: item.song_key, sounding_key: item.song_key, capo: item.capo || 0, show_chords: true }])} className="w-10 h-10 bg-white/5 hover:bg-[#B87333] text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0" title="Adicionar à Forja">
                                                                        <Plus className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleEditOpen(item.id)} className="w-10 h-10 bg-white/5 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0" title="Editar">
                                                                        <Edit3 className="w-4 h-4" />
                                                                    </button>
                                                                    <button onClick={() => handleDeleteAcervo(item.id, item.song_name)} className="w-10 h-10 bg-white/5 hover:bg-red-600 text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0" title="Excluir">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            )}


                            {/* ABA 2: LISTAS */}
                            {mainNav === 'listas' && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl min-h-[500px]">
                                        <div className="flex items-center space-x-4 mb-10">
                                            <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Listas Salvas</h2>
                                        </div>

                                        {Object.keys(savedPlaylists).length === 0 && JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]').length === 0 ? (
                                            <div className="py-20 flex col-span-3 items-center justify-center flex-col text-center border-2 border-dashed border-white/5 rounded-[40px] bg-black/20 w-full min-h-[300px]">
                                                <LayoutList className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-20" />
                                                <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Nenhuma lista salva ainda.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]').map((pl, idx) => (
                                                    <div key={idx} className="bg-black/40 border border-white/5 hover:border-[#B87333]/30 rounded-[32px] p-6 transition-all group flex flex-col h-[380px]">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tighter line-clamp-2">{pl.name}</h3>
                                                            <button onClick={() => {
                                                                setDeleteTarget({ type: 'lista', id: idx, name: pl.name });
                                                                setDeleteModalOpen(true);
                                                            }} className="p-2 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-500 rounded-lg transition-all border border-white/5 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                        <div className="mb-4">
                                                            <span className="text-[10px] font-black bg-white/5 text-[#B87333] py-1 px-3 rounded-full border border-white/5 uppercase tracking-widest">{pl.songs?.length || 0} Peças</span>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto mb-6 pr-2 scrollbar-thin scrollbar-thumb-white/10 space-y-2 bg-[#1A1A1A] p-4 rounded-2xl border border-white/5">
                                                            {(pl.songs || []).map((s, i) => (
                                                                <div key={i} className="flex flex-col border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                                    <span className="text-xs text-slate-300 uppercase font-bold truncate tracking-tight">{i + 1}. {s.song_name}</span>
                                                                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">{s.artist_name}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-between mt-auto space-x-3 pt-4 border-t border-white/5">
                                                            <button
                                                                onClick={() => {
                                                                    setSongs(pl.songs || []);
                                                                    setMainNav('player');
                                                                    setSelectedManualIndex(0);
                                                                }}
                                                                className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 rounded-xl transition-all shadow-lg text-[10px] font-black uppercase tracking-widest flex justify-center items-center space-x-2"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                                <span>Tocar Lista</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSongs(pl.songs || []);
                                                                    setCurrentExportList(pl);
                                                                    setExportStep(1);
                                                                    setDownloadUrl(null);
                                                                    setExportFormat('docx');
                                                                    setCoverImage(null);
                                                                    setShowExportModal(true);
                                                                }}
                                                                className="flex-1 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/20 py-4 rounded-xl transition-all shadow-lg text-[10px] font-black uppercase tracking-widest flex justify-center items-center space-x-2"
                                                            >
                                                                <FileText className="w-4 h-4" />
                                                                <span>Gerar Livreto</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ABA 3: PLAYER DA FORJA */}
                            {mainNav === 'player' && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl min-h-[500px] flex flex-col items-center justify-center text-center">
                                        <div className="w-24 h-24 bg-[#B87333]/10 rounded-[32px] flex items-center justify-center mb-8 border border-[#B87333]/20 shadow-2xl shadow-[#B87333]/5 mx-auto transition-transform hover:scale-110">
                                            <Monitor className="w-10 h-10 text-[#B87333]" />
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Player da Forja</h3>
                                        <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8 max-w-sm mx-auto">{songs.length === 0 ? "Vá em 'Escolha de Peças' ou em 'Listas' para carregar músicas para tocar." : (songs.length + " peças carregadas e prontas para execução ao vivo.")}</p>
                                        <button
                                            onClick={() => { setIsFullScreenPlayer(true); setSelectedManualIndex(songs.length > 0 ? 0 : null); setCurrentLineIndex(0); }}
                                            className={`px-12 py-6 font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center space-x-3 mx-auto ${songs.length === 0 ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/40'}`}
                                            disabled={songs.length === 0}
                                        >
                                            <Play className="w-6 h-6 inline mr-2" />
                                            <span>Iniciar Apresentação</span>
                                        </button>
                                        {songs.length > 0 && (
                                            <div className="mt-12 w-full max-w-2xl bg-black/40 border border-white/5 rounded-2xl p-6 text-left mx-auto">
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">Setlist Carregado</h4>
                                                <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-thin">
                                                    {songs.map((s, idx) => (
                                                        <div key={idx} className="flex items-center space-x-4">
                                                            <span className="text-[10px] text-slate-600 font-black">{idx + 1}.</span>
                                                            <span className="text-xs text-white font-bold uppercase truncate">{s.song_name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}


                            {/* Export Livreto Modal */}
                            {showExportModal && (
                                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4">
                                    <div className="bg-[#16161D] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                                        <div className="flex items-center justify-between p-8 border-b border-white/5 shrink-0">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Gerar Livreto: {currentExportList?.name}</h3>
                                            </div>
                                            <button onClick={() => { setShowExportModal(false); setExportStep(1); setDownloadUrl(null); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 flex items-center justify-center">
                                                <X className="w-5 h-5 text-slate-400" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10">
                                            {/* STEP 4: CONFIGURAÇÕES DA FORJA */}
                                            {exportStep === 1 && (
                                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                                        <div className="flex items-center space-x-4 mb-10">
                                                            <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Engrenagens da Forja</h2>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                                            <div className="space-y-8">
                                                                <div className="bg-black/40 border border-white/5 rounded-[32px] p-8">
                                                                    <div className="flex items-center space-x-3 mb-6">
                                                                        <Settings2 className="w-5 h-5 text-[#B87333]" />
                                                                        <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Saída de Dados</h3>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 gap-4">
                                                                        {['docx', 'pdf', 'both'].map(fmt => (
                                                                            <button
                                                                                key={fmt}
                                                                                onClick={() => setExportFormat(fmt)}
                                                                                className={`p-6 rounded-2xl border transition-all text-left flex items-center justify-between group ${exportFormat === fmt ? 'bg-[#B87333] border-[#B87333] shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 hover:border-[#B87333]/40'}`}
                                                                            >
                                                                                <div>
                                                                                    <p className={`text-sm font-black uppercase tracking-widest transition-colors ${exportFormat === fmt ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                                                                                        {fmt === 'docx' ? 'Microsoft Word (.docx)' : fmt === 'pdf' ? 'Adobe PDF (.pdf)' : 'Arquivo Mestre (.ZIP)'}
                                                                                    </p>
                                                                                    <p className={`text-[10px] font-bold mt-1 uppercase ${exportFormat === fmt ? 'text-white/60' : 'text-slate-600'}`}>
                                                                                        {fmt === 'both' ? 'Inclui PDF e DOCX em um único pacote' : 'Otimizado para edição e impressão'}
                                                                                    </p>
                                                                                </div>
                                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${exportFormat === fmt ? 'bg-white border-white text-[#B87333]' : 'border-white/10'}`}>
                                                                                    {exportFormat === fmt && <Check className="w-4 h-4 stroke-[4]" />}
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-8">
                                                                <div className="bg-black/40 border border-white/5 rounded-[32px] p-8">
                                                                    <div className="flex items-center space-x-3 mb-6">
                                                                        <ImageIcon className="w-5 h-5 text-[#B87333]" />
                                                                        <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Identidade Visual</h3>
                                                                    </div>
                                                                    <div
                                                                        onClick={() => coverInputRef.current?.click()}
                                                                        className={`relative overflow-hidden border-2 border-dashed rounded-[32px] aspect-video flex flex-col items-center justify-center cursor-pointer transition-all ${coverImage ? 'border-[#B87333]' : 'border-white/10 hover:border-[#B87333]/40 bg-white/5'}`}
                                                                    >
                                                                        {coverImage ? (
                                                                            <div className="absolute inset-0 w-full h-full p-4">
                                                                                <div className="w-full h-full rounded-2xl bg-black/40 flex flex-col items-center justify-center border border-white/10">
                                                                                    <CheckCircle className="w-10 h-10 text-[#B87333] mb-4" />
                                                                                    <p className="text-[10px] font-black text-white uppercase tracking-widest px-8 text-center truncate w-full">{coverImage.name}</p>
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); setCoverImage(null); }}
                                                                                        className="mt-6 px-6 py-2 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-white/5"
                                                                                    >
                                                                                        Remover
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                                                                    <UploadCloud className="w-8 h-8 text-slate-700" />
                                                                                </div>
                                                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Upload de Capa Customizada</p>
                                                                                <p className="text-[9px] font-bold text-slate-700 mt-2 uppercase tracking-tighter">JPEG, PNG • Max 5MB</p>
                                                                            </>
                                                                        )}
                                                                        <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* STEP 5: FINALIZAÇÃO */}
                                            {exportStep === 2 && (
                                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-12 shadow-2xl flex flex-col items-center justify-center text-center">
                                                        {!downloadUrl ? (
                                                            <div className="max-w-xl space-y-10">
                                                                <div className="relative">
                                                                    <div className="w-32 h-32 bg-[#B87333]/10 rounded-[40px] flex items-center justify-center mx-auto border border-[#B87333]/20 relative z-10">
                                                                        <FileText className={`w-14 h-14 text-[#B87333] ${isGenerating ? 'animate-pulse' : ''}`} />
                                                                    </div>
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#B87333]/5 rounded-full blur-3xl animate-pulse"></div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">A Forja está Pronta</h2>
                                                                    <p className="text-sm text-slate-500 font-medium leading-relaxed uppercase tracking-widest">
                                                                        Todas as suas {songs.length} peças foram ajustadas e cronometradas. <br />
                                                                        Clique abaixo para iniciar a geração do seu material exclusivo.
                                                                    </p>
                                                                </div>

                                                                <button
                                                                    disabled={songs.length === 0 || isGenerating}
                                                                    onClick={handleGenerateDocument}
                                                                    className="w-full py-6 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-[0.3em] rounded-[24px] shadow-2xl shadow-[#B87333]/20 transition-all flex items-center justify-center group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-lg italic"
                                                                >
                                                                    {isGenerating ? (
                                                                        <>
                                                                            <RefreshCw className="w-7 h-7 mr-4 animate-spin" />
                                                                            <span>TRABALHANDO NO METAL...</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Zap className="w-7 h-7 mr-4 group-hover:scale-125 transition-transform" />
                                                                            <span>BATER O MARTELO</span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="max-w-xl space-y-10 animate-in zoom-in-95 duration-700">
                                                                <div className="relative">
                                                                    <div className="w-32 h-32 bg-green-500/10 rounded-[40px] flex items-center justify-center mx-auto border border-green-500/20 relative z-10">
                                                                        <ShieldCheck className="w-14 h-14 text-green-500" />
                                                                    </div>
                                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-green-500/5 rounded-full blur-3xl"></div>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Missão Cumprida</h2>
                                                                    <p className="text-sm text-slate-500 font-medium leading-relaxed uppercase tracking-widest">
                                                                        Seu documento foi forjado com sucesso no calor industrial. <br />
                                                                        Utilize o acesso abaixo para resgatar sua peça.
                                                                    </p>
                                                                </div>

                                                                <div className="grid grid-cols-1 gap-4">
                                                                    <a
                                                                        href={downloadUrl}
                                                                        download={exportFormat === 'pdf' ? "IronChords_Book.pdf" : exportFormat === 'both' ? "IronChords_Forged.zip" : "IronChords_Book.docx"}
                                                                        className="w-full py-6 bg-green-600 hover:bg-green-700 text-white text-center text-lg font-black uppercase tracking-[0.3em] rounded-[24px] transition-all shadow-xl shadow-green-900/20 italic flex items-center justify-center"
                                                                    >
                                                                        <Download className="w-7 h-7 mr-4" />
                                                                        RECOLHER PEÇA
                                                                    </a>
                                                                    <button
                                                                        onClick={() => { setDownloadUrl(null); setCurrentStep(1); setSongs([]); }}
                                                                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white font-black uppercase tracking-widest rounded-2xl text-[10px] italic transition-all border border-white/5"
                                                                    >
                                                                        Iniciar Nova Forja
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}


                                        </div>
                                        {exportStep === 1 && (
                                            <div className="p-8 border-t border-white/5 flex justify-end">
                                                <button
                                                    onClick={() => setExportStep(2)}
                                                    className="px-10 py-5 bg-[#B87333] text-white font-black uppercase tracking-widest text-[10px] italic transition-all shadow-xl shadow-[#B87333]/20 hover:bg-[#8B4513] rounded-2xl flex items-center space-x-3"
                                                >
                                                    <span>Ir para Finalização</span>
                                                    <ArrowRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Conflict Resolution Modal */}
            {conflictData && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 p-4">
                    <div className="bg-[#16161D] border border-blue-500/30 p-10 rounded-[40px] shadow-[0_0_80px_rgba(59,130,246,0.15)] w-full max-w-2xl flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center space-x-5">
                                <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
                                    <AlertCircle className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Conflito de Forja</h3>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Uma peça com este nome já existe no acervo</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 mb-10">
                            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl relative">
                                <span className="absolute -top-3 left-6 px-3 py-1 bg-[#16161D] border border-white/10 rounded-full text-[8px] font-black text-slate-500 uppercase tracking-widest">No Acervo</span>
                                <h4 className="text-lg font-black text-white uppercase italic truncate">{conflictData.existingSong?.song_name}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate">{conflictData.existingSong?.artist_name}</p>
                                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-400 italic bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{conflictData.existingSong?.song_key}</span>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{conflictData.existingSong?.content?.split('\n').length} linhas</span>
                                </div>
                            </div>

                            <div className="bg-blue-600/5 border border-blue-500/30 p-6 rounded-3xl relative">
                                <span className="absolute -top-3 left-6 px-3 py-1 bg-blue-600 border border-blue-500 text-[8px] font-black text-white uppercase tracking-widest">Nova Versão</span>
                                <h4 className="text-lg font-black text-white uppercase italic truncate">{conflictData.newSong?.song_name}</h4>
                                <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mt-1 truncate">{conflictData.newSong?.artist_name}</p>
                                <div className="mt-4 pt-4 border-t border-blue-500/10 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-400 italic bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20">{conflictData.newSong?.song_key}</span>
                                    <span className="text-[10px] font-black text-blue-400/60 uppercase tracking-widest">{conflictData.newSong?.content?.split('\n').length} linhas</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={() => conflictData.onConfirm('replace')}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-900/20 flex items-center justify-center space-x-3 group"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                                <span>Substituir Versão Existente</span>
                            </button>
                            <button
                                onClick={() => conflictData.onConfirm('skip')}
                                className="py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-bold uppercase tracking-widest text-[10px] rounded-xl border border-white/5 transition-all w-full"
                            >
                                Manter Peça do Acervo / Pular
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-md flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-1.5 h-6 bg-red-600 rounded-full shadow-[0_0_15px_rgba(220,38,38,0.4)]"></div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Confirmar Exclusão</h3>
                            </div>
                            <button onClick={() => setDeleteModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-6">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                Você tem certeza que deseja excluir permanentemente {deleteTarget.type === 'acervo' ? 'a música' : 'a lista'} <span className="text-white">"{deleteTarget.name}"</span>?
                            </p>
                            <p className="text-[10px] text-red-500/80 italic uppercase">Esta ação não poderá ser desfeita.</p>

                            <div className="flex items-center space-x-4 mt-6">
                                <button onClick={() => setDeleteModalOpen(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-xl transition-all border border-white/5">Cancelar</button>
                                <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-red-900/20 flex items-center justify-center space-x-2">
                                    <Trash2 className="w-4 h-4" />
                                    <span>Excluir</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Save List Modal */}
            {saveListModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-md flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-4">
                                <div className="w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Salvar Lista</h3>
                            </div>
                            <button onClick={() => { setSaveListModalOpen(false); setSaveListName(''); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Nome da Lista</label>
                                <input type="text" autoFocus placeholder="Ex: Missa de Domingo..." value={saveListName} onChange={e => setSaveListName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700" onKeyDown={e => e.key === 'Enter' && handleSaveList()} />
                            </div>
                            <button onClick={handleSaveList} disabled={!saveListName.trim()} className="w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                <Save className="w-4 h-4" />
                                <span>Confirmar Salvamento</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Success Animation */}
            {showSaveSuccess && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-none">
                    <div className="bg-green-500/10 border border-green-500/20 p-10 rounded-[40px] shadow-[0_0_50px_rgba(34,197,94,0.3)] flex flex-col items-center animate-in zoom-in-50 duration-500 spring-gentle">
                        <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center relative mb-6">
                            <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                            <CheckCircle className="w-12 h-12 text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md">Lista Forjada</h2>
                        <p className="text-green-400/80 font-bold uppercase tracking-[0.2em] text-xs mt-2">Salva com Sucesso no Acervo Local</p>
                    </div>
                </div>
            )}

            {/* Edit Acervo Modal */}
            {editingChord && (
                <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4">
                    <div className="bg-[#16161D] border border-[#B87333]/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between mb-8 shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Cifra</h3>
                            </div>
                            <button onClick={() => setEditingChord(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="overflow-y-auto pr-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Música</label>
                                    <input type="text" value={editFormData.song_name} onChange={e => setEditFormData({ ...editFormData, song_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Artista</label>
                                    <input type="text" value={editFormData.artist_name} onChange={e => setEditFormData({ ...editFormData, artist_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tom Original</label>
                                    <select value={editFormData.song_key} onChange={e => setEditFormData({ ...editFormData, song_key: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all">
                                        {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Capo</label>
                                    <select value={editFormData.capo} onChange={e => setEditFormData({ ...editFormData, capo: parseInt(e.target.value) })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all">
                                        <option value={0} className="bg-[#1A1A1A]">Sem Capo</option>
                                        {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1} className="bg-[#1A1A1A]">Casa {i + 1}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Cifra</label>
                                <textarea value={editFormData.content} onChange={e => setEditFormData({ ...editFormData, content: e.target.value })} className="w-full bg-black/60 border border-white/10 rounded-2xl px-6 py-6 text-white outline-none font-mono text-xs leading-relaxed min-h-[400px] hover:border-white/20 focus:border-[#B87333]/50 transition-all scrollbar-thin shadow-inner" spellCheck="false" />
                            </div>
                        </div>
                        <div className="mt-8 shrink-0">
                            <button onClick={handleEditSave} className="w-full py-5 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-[#B87333]/20 flex items-center justify-center space-x-3 group">
                                <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                <span>Salvar Alterações no Acervo</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Videoke Player Overlay */}
            {isVideokeOpen && manualPreviewSong && (
                <VideokePlayer
                    song={manualPreviewSong}
                    includeTabs={includeTabs}
                    onClose={() => setIsVideokeOpen(false)}
                />
            )}

            {/* DEDICATED PRINT SHEET (Hidden by default, shown via CSS @media print) */}
            {createPortal(
                <div id="dedicated-print-sheet" className="hidden print:block fixed inset-0 bg-white text-black z-[99999] overflow-y-auto">
                    {(() => {
                        const songToPrint = activeTab === 'player' ? currentSong : manualPreviewSong;
                        if (!songToPrint) return null;

                        return (
                            <div className="w-full max-w-5xl mx-auto px-12 py-8 print:px-4 print:py-4">
                                {/* Logo */}
                                <div className="flex justify-between items-start mb-10 print:mb-8 pb-4 border-b-2 border-[#ea580c] print:border-[#ea580c]">
                                    <h1 className="text-5xl print:text-5xl font-black tracking-tighter leading-none text-black">
                                        {songToPrint.song_name}
                                    </h1>
                                    <div className="flex items-center space-x-2 opacity-50">
                                        <Flame className="w-8 h-8 print:w-6 print:h-6 text-black" />
                                        <span className="text-2xl print:text-xl font-black italic tracking-tighter uppercase leading-none">IRON<span className="text-[#ea580c]">CHORDS</span></span>
                                    </div>
                                </div>

                                {/* Metadata */}
                                <div className="mb-8 print:mb-8 font-sans">
                                    <p className="text-3xl print:text-2xl font-bold uppercase text-[#ea580c] mb-6">{songToPrint.artist_name}</p>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg print:text-base font-bold text-gray-800">Tom:</span>
                                        <span className="text-lg print:text-base font-bold text-[#ea580c]">{songToPrint.sounding_key || songToPrint.song_key}</span>
                                    </div>
                                </div>

                                {/* Chords Content */}
                                {(() => {
                                    const rawLines = (songToPrint.content || "").split('\n');
                                    const blocks = [];
                                    let currentBlock = [];

                                    for (let i = 0; i < rawLines.length; i++) {
                                        const line = rawLines[i].replace(/\r/g, '');
                                        const trimmed = line.trim();

                                        // 1. Remove setas de ritmo e batida (famosos lixos visuais)
                                        if (line.includes('↓') || line.includes('↑')) continue;

                                        // 2. Remove tabs e instruções de bateria/guitarra/frases desnecessárias
                                        const isTabLine = line.includes('|-') || line.includes('-|') || /^[eBGDAE]\|/.test(trimmed);
                                        const isGuitarNote = /guitarra|dedilhado|batida|solo|riff|ritmo|frase|passagem/i.test(line) && (line.includes('(') || line.includes('['));

                                        if (!includeTabs && (isTabLine || isGuitarNote)) continue;

                                        const isChordLine = !!(line && trimmed.length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, trimmed.length * 0.25));

                                        // 3. Agrupar linhas em blocos
                                        if (trimmed.length === 0) {
                                            // Se for uma linha em branco, só quebra o bloco se o bloco atual tiver letras (texto verbal) ou se já tiveros 2 linhas em branco seguidas.
                                            // Em outras palavras: se estamos num bloco PÚRO de cifras instrumentais (Intro/Solo), ignoramos linhas em branco singulares para que as cifras grudem no mesmo bloco e ativem o "Lado a Lado" (Grid).
                                            if (currentBlock.length > 0) {
                                                const hasLyrics = currentBlock.some(l => !l.isChordLine && !l.text.trim().startsWith('['));

                                                // Verifica a próxima linha válida olhando para frente no rawLines
                                                let nextValidLineIsChord = false;
                                                for (let j = i + 1; j < rawLines.length; j++) {
                                                    const nextL = rawLines[j].trim();
                                                    if (nextL.length > 0) {
                                                        const nextLIsChord = !!(nextL && (nextL.match(CHORD_TOKEN_RE) || []).length > 0 && nextL.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, nextL.length * 0.25));
                                                        nextValidLineIsChord = nextLIsChord;
                                                        break;
                                                    }
                                                }

                                                // Se não tem vocais E a próxima linha de conteúdo útil também é só Acorde, engolimos essa linha em branco e continuamos agrupando os acordes!
                                                if (!hasLyrics && nextValidLineIsChord) {
                                                    continue; // ignora a quebra de linha em branco
                                                }

                                                blocks.push(currentBlock);
                                                currentBlock = [];
                                            }
                                        } else {
                                            currentBlock.push({ text: line, isChordLine });
                                        }
                                    }
                                    if (currentBlock.length > 0) blocks.push(currentBlock);

                                    // 4. Colapsar acordes repetidos consecutivos no mesmo bloco
                                    const collapsedBlocks = blocks.map(block => {
                                        const newBlock = [];
                                        let lastNormChord = null;
                                        let originalChordText = null;
                                        let chordCount = 0;

                                        const commitChord = () => {
                                            if (chordCount === 1) {
                                                newBlock.push({ text: originalChordText, isChordLine: true });
                                            } else if (chordCount > 1) {
                                                newBlock.push({ text: `${originalChordText.trim()} (x${chordCount})`, isChordLine: true });
                                            }
                                            lastNormChord = null;
                                            originalChordText = null;
                                            chordCount = 0;
                                        };

                                        for (const lineObj of block) {
                                            if (lineObj.isChordLine) {
                                                const normChord = lineObj.text.trim().replace(/\s+/g, ' ');
                                                if (normChord === lastNormChord) {
                                                    chordCount++;
                                                } else {
                                                    commitChord();
                                                    lastNormChord = normChord;
                                                    originalChordText = lineObj.text;
                                                    chordCount = 1;
                                                }
                                            } else {
                                                commitChord();
                                                newBlock.push(lineObj);
                                            }
                                        }
                                        commitChord();
                                        return newBlock;
                                    });

                                    // Determina se deve usar 2 colunas com base no número total de linhas a serem renderizadas
                                    const totalLines = collapsedBlocks.reduce((acc, b) => acc + b.length, 0);
                                    // Limite flexível para ativar as colunas, previne quebra bizarra em músicas médias
                                    const useColumns = totalLines > 65;

                                    return (
                                        <div className={`mt-8 print:mt-6 font-sans ${useColumns ? 'print:columns-2 print:gap-16' : ''}`}>
                                            {collapsedBlocks.map((block, bIdx) => {
                                                const textCount = block.filter(l => !l.isChordLine).length;
                                                // Verifica se é um bloco estritamente instrumental para aplicar a compressão de acordes
                                                const isInstrumentalBlock = block.length >= 2 && (textCount === 0 || (textCount === 1 && block[0].text.includes('[') && block[0].text.length < 25));

                                                return (
                                                    <div key={bIdx} className="break-inside-avoid print:break-inside-avoid mb-8 print:mb-6 flex flex-col space-y-0">
                                                        {block.map((lineObj, lIdx) => {
                                                            // Identifica se a linha é um título de sessão (ex: [Refrão], [Intro])
                                                            const isSectionTitle = lineObj.text.trim().startsWith('[') && lineObj.text.trim().endsWith(']');

                                                            // Na ausência de frases (letras), se for uma cifra com espaçamentos manuais longos,
                                                            // comprimi-los e jogar para a esquerda (justificado lado a lado).
                                                            const displayText = (isInstrumentalBlock && lineObj.isChordLine && !isSectionTitle)
                                                                ? lineObj.text.trim().replace(/\s+/g, '   ')
                                                                : lineObj.text;

                                                            return (
                                                                <pre
                                                                    key={lIdx}
                                                                    className={`whitespace-pre-wrap ${lineObj.isChordLine ? 'font-mono text-[#ea580c] print:text-[#ea580c] font-bold print:leading-snug' : isSectionTitle ? 'font-sans font-bold text-gray-900 mt-2 mb-1 print:text-[15px]' : 'font-sans text-gray-900 print:leading-normal print:text-[15px]'}`}
                                                                    style={{
                                                                        fontSize: lineObj.isChordLine ? '14px' : '15px',
                                                                        marginTop: lineObj.isChordLine && lIdx > 0 && !block[lIdx - 1].isChordLine && !isSectionTitle ? '0.25rem' : '0'
                                                                    }}
                                                                >
                                                                    {displayText}
                                                                </pre>
                                                            );
                                                        })}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}

                            </div>
                        );
                    })()}
                </div>,
                document.body
            )}
        </div>
    );
}

