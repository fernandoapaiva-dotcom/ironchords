import React, { useState, useRef, useEffect } from 'react';
import { Music, UploadCloud, Plus, FileText, CheckCircle, AlertCircle, FileAudio, Info, X, Guitar, Settings2, Image as ImageIcon, Database, Edit3, Trash2, ArrowRight, Play, Maximize, Maximize2, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, ArrowLeft, SkipBack, SkipForward, Save, FolderHeart, Flame, Hammer, Sparkles, RefreshCw, Zap, ShieldCheck, Monitor, Tv, Check, LayoutList, Mic } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SVGuitarChord } from 'svguitar';

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
    // strip bass note (e.g. G/B → G)
    const name = rawChord.split('/')[0];
    if (CHORD_DICT[name]) return CHORD_DICT[name];
    // Try case-normalised root + suffix
    const m = name.match(/^([A-Ga-g][b#]?)(.*)$/);
    if (!m) return null;
    const root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    const suffix = m[2];
    const key = root + suffix;
    return CHORD_DICT[key] || null;
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

    const voicings = findChordVoicings(chord) || [[0, 0, 0, 0, 0, 0]];
    const total = voicings.length;

    // Position tooltip above the anchor element, smart edge detection
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
        if (!anchor) return;

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
const CHORD_TOKEN_RE = /([A-G][b#]?(?:maj7?|min7?|m7?|7|sus[24]?|dim7?|aug|add9|6|9|11|13)?(?:\/[A-G][b#]?)?)/g;

function renderChordLine(line, onChordClick) {
    const parts = [];
    let last = 0;
    let match;
    CHORD_TOKEN_RE.lastIndex = 0;
    while ((match = CHORD_TOKEN_RE.exec(line)) !== null) {
        // text before this match
        if (match.index > last) {
            parts.push(line.slice(last, match.index));
        }
        const chord = match[0];
        parts.push(
            <span
                key={match.index}
                className="cursor-pointer underline decoration-[#B87333]/40 underline-offset-2 hover:text-amber-300 hover:decoration-amber-300 transition-colors"
                onMouseEnter={e => onChordClick(chord, e.currentTarget)}
                onClick={e => { e.stopPropagation(); onChordClick(chord, e.currentTarget); }}
            >{chord}</span>
        );
        last = match.index + match[0].length;
    }
    if (last < line.length) parts.push(line.slice(last));
    return parts;
}


const MoltenLoading = ({ message = "Forjando conteúdo...", current = 0, total = 0 }) => {
    const progress = total > 0 ? (current / total) * 100 : 0;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070709]/98 backdrop-blur-3xl animate-in fade-in duration-700">
            <div className="relative w-full max-w-2xl h-[500px] flex items-center justify-center">

                {/* Molten Pot (Bucket) - Positioned so the EDGE is the pour point */}
                <div className="absolute top-20 left-1/2 -translate-x-32 w-32 h-32 animate-pot-tilt z-20">
                    <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 rounded-b-3xl border-2 border-white/5 relative shadow-2xl">
                        {/* Molten metal inside */}
                        <div className="absolute inset-2 bottom-0 bg-gradient-to-t from-orange-600 via-[#B87333] to-orange-400 rounded-b-2xl opacity-90 animate-pulse"></div>
                        {/* Pot Handle */}
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-36 h-20 border-t-4 border-l-4 border-r-4 border-slate-700 rounded-t-full -z-10"></div>
                    </div>
                </div>

                {/* Pouring Liquid - Align with the edge of the pot */}
                <div className="absolute top-[180px] left-1/2 -translate-x-[45px] w-4 bg-gradient-to-b from-orange-400 via-[#B87333] to-transparent animate-liquid-flow z-10 origin-top shadow-[0_0_15px_rgba(184,115,51,0.5)]"></div>

                {/* Musical Note Mold - Custom SVG for fill logic */}
                <div className="mt-32 relative">
                    <div className="animate-note-fill-up flex items-center justify-center">
                        <svg
                            viewBox="0 0 24 24"
                            className="w-48 h-48 animate-note-temper"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </div>

                    {/* Steam Effects - Timed after completion */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute bg-white/10 blur-2xl rounded-full animate-steam-rise"
                                style={{
                                    width: `${40 + Math.random() * 60}px`,
                                    height: `${40 + Math.random() * 60}px`,
                                    animationDelay: `${i * 0.4}s`,
                                    left: `${20 + Math.random() * 60}%`,
                                    top: '30%'
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Message Container */}
            <div className="mt-4 text-center space-y-8 z-10 w-full max-w-lg px-8">
                <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white italic tracking-[0.15em] animate-pulse uppercase drop-shadow-[0_0_20px_rgba(184,115,51,0.4)]">
                        {message}
                    </h3>

                    {total > 0 && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex items-baseline space-x-2">
                                <span className="text-[#B87333] font-black text-4xl tracking-tighter">
                                    {current}
                                </span>
                                <span className="text-white/20 text-xl font-black">/</span>
                                <span className="text-white/40 font-black text-2xl tracking-tighter">
                                    {total}
                                </span>
                            </div>
                            <span className="text-white/30 text-[10px] uppercase font-black tracking-[0.6em]">Músicas Processadas</span>
                        </div>
                    )}
                </div>

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


const StepIndicator = ({ currentStep, steps }) => (
    <div className="flex items-center justify-between mb-12 w-full max-w-4xl mx-auto px-4">
        {steps.map((step, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            return (
                <div key={idx} className="flex items-center flex-1 last:flex-none group">
                    <div className="flex flex-col items-center relative">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${isActive ? 'bg-[#B87333] border-[#B87333] shadow-[0_0_20px_rgba(184,115,51,0.4)] scale-110' :
                            isCompleted ? 'bg-blue-600 border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' :
                                'bg-black/40 border-white/10 text-slate-600'
                            }`}>
                            {isCompleted ? <CheckCircle className="w-6 h-6 text-white" /> :
                                <span className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-600'}`}>{stepNum}</span>}
                        </div>
                        <span className={`absolute -bottom-7 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-all duration-500 ${isActive ? 'text-[#B87333] scale-105' : 'text-slate-500'
                            }`}>
                            {step}
                        </span>
                    </div>
                    {idx < steps.length - 1 && (
                        <div className="flex-1 h-[2px] mx-4 bg-white/5 relative overflow-hidden">
                            <div className={`absolute inset-0 bg-gradient-to-r from-blue-600 to-[#B87333] transition-all duration-1000 transform origin-left ${isCompleted ? 'scale-x-100' : 'scale-x-0'
                                }`}></div>
                        </div>
                    )}
                </div>
            );
        })}
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
    const [currentStep, setCurrentStep] = useState(1);

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
    const [batchLinkLoading, setBatchLinkLoading] = useState(false);

    // Filter Suggestions State
    const [editingChord, setEditingChord] = useState(null);
    const [editFormData, setEditFormData] = useState({ song_name: '', artist_name: '', song_key: '', content: '' });

    // Presentation Mode State
    const [presenterSongIndex, setPresenterSongIndex] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [scrollSpeed, setScrollSpeed] = useState(1);
    const scrollContainerRef = useRef(null);

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

    // Mic Level & Frequency Listener
    useEffect(() => {
        if (micEnabled) {
            startMic();
            startSpeechRecognition();
        } else {
            stopMic();
            stopSpeechRecognition();
        }
    }, [micEnabled]);

    const startSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.onresult = (event) => {
            const results = event.results;
            const latest = results[results.length - 1];
            const text = latest[0].transcript.toLowerCase();
            setTranscriptRaw(text);
            syncLineByText(text, latest.isFinal);
        };
        recognitionRef.current.onend = () => {
            if (micEnabled && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch (e) { }
            }
        };
        recognitionRef.current.start();
    };

    const stopSpeechRecognition = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
    };

    const syncLineByText = (text, isFinal) => {
        const songIdx = activeTab === 'player' ? selectedManualIndex : selectedManualIndex;
        if (songIdx === null || !songs[songIdx]) return;
        const lines = (songs[songIdx]?.content || "").split('\n');

        let foundIndex = -1;
        const searchRange = 6;
        const start = currentLineIndexRef.current;
        const end = Math.min(lines.length, start + searchRange);

        const PHONETIC_ALIASED = {
            'benção': ['bênção', 'bensao', 'bencao'],
            'espírito': ['espirito', 'espirito santo'],
            'glória': ['gloria', 'gloria a deus'],
            'jesus': ['jezu', 'jesu'],
            'senhor': ['senor'],
            'deu': 'deus'
        };

        const actualStartSearch = isAnchored ? start : 0;
        const actualEndSearch = isAnchored ? end : Math.min(lines.length, 30);

        for (let i = actualStartSearch; i < actualEndSearch; i++) {
            const lineContent = lines[i].toLowerCase();
            if (lineContent.match(/^[a-g][b#]?\s/i) || lineContent.trim().length < 3) continue;
            let transcriptClean = transcriptRaw;
            Object.entries(PHONETIC_ALIASED).forEach(([target, aliases]) => {
                const aliasList = Array.isArray(aliases) ? aliases : [aliases];
                aliasList.forEach(alias => {
                    if (transcriptRaw.includes(alias)) transcriptClean = transcriptClean.replace(alias, target);
                });
            });
            const words = transcriptClean.split(' ');
            const matchedCount = words.filter(w => w.length > 2 && lineContent.includes(w)).length;
            const isStartAnchor = !isAnchored && (matchedCount >= 1 && (words.some(w => w.length > 5) || matchedCount >= 2));
            if (foundIndex === -1 && (isStartAnchor || matchedCount >= 2 || (lineContent.length < 15 && matchedCount >= 1))) {
                foundIndex = i;
                break;
            }
        }

        if (foundIndex !== -1) {
            lastVoiceMatchedIndexRef.current = foundIndex;
            if (isWaitingForVoice) {
                setIsWaitingForVoice(false);
                if (isRhythmicMode) startRhythmicTimer();
            }
            if (isRhythmicMode && isAnchored) {
                const diff = foundIndex - currentLineIndexRef.current;
                const now = Date.now();
                driftHistoryRef.current.push(diff);
                if (driftHistoryRef.current.length > 5) driftHistoryRef.current.shift();
                const timeSinceLastAdjust = now - lastBpmAdjustTimeRef.current;
                const averageDrift = driftHistoryRef.current.reduce((a, b) => a + b, 0) / driftHistoryRef.current.length;
                if (timeSinceLastAdjust > 2500) {
                    if (averageDrift < -0.5) {
                        setBpm(prev => Math.max(40, prev - 1));
                        lastBpmAdjustTimeRef.current = now;
                        setIsBpmSyncing(true);
                        setTimeout(() => setIsBpmSyncing(false), 1200);
                    } else if (averageDrift > 1.2) {
                        setBpm(prev => Math.min(200, prev + 1));
                        lastBpmAdjustTimeRef.current = now;
                        setIsBpmSyncing(true);
                        setTimeout(() => setIsBpmSyncing(false), 1200);
                    }
                }
            }
            if (!isAnchored) {
                setIsAnchored(true);
                setIsWaitingForVoice(false);
                startRhythmicTimer();
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

    const startMic = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            source.connect(analyserRef.current);
            const bufferLength = analyserRef.current.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            const freqData = new Float32Array(bufferLength);
            const checkAudio = () => {
                if (!micEnabled) return;
                analyserRef.current.getByteFrequencyData(dataArray);
                analyserRef.current.getFloatFrequencyData(freqData);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
                const avg = sum / bufferLength;
                setMicLevel(avg);
                let maxVal = -Infinity;
                let maxIdx = -1;
                for (let i = 0; i < bufferLength; i++) {
                    if (freqData[i] > maxVal) { maxVal = freqData[i]; maxIdx = i; }
                }
                if (maxVal > -50) {
                    const freq = maxIdx * audioContextRef.current.sampleRate / analyserRef.current.fftSize;
                    const note = getNoteFromFreq(freq);
                    if (note) setDetectedNote(note);
                }
                requestAnimationFrame(checkAudio);
            };
            checkAudio();
        } catch (err) { console.error(err); setMicEnabled(false); }
    };

    const getNoteFromFreq = (freq) => {
        if (freq < 70 || freq > 1000) return null;
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const h = Math.round(12 * Math.log2(freq / 440)) + 69;
        return notes[h % 12];
    };

    const stopMic = () => {
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    };

    const transposeSong = async (index, semitones) => {
        const song = songs[index];
        if (!song) return;
        const currentKeyToUse = song.requested_key || song.song_key || 'C';
        setIsTransposing(true);
        try {
            const res = await fetch('http://localhost:8000/api/transpose', {
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
            const res = await fetch('http://localhost:8000/api/transpose', {
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
            if (songName.length >= 3) fetchSuggestions(songName);
            else setSuggestions([]);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [songName]);

    const fetchSuggestions = async (name) => {
        try {
            const res = await fetch(`http://localhost:8000/api/search/suggestions?q=${encodeURIComponent(name)}`);
            const data = await res.json();
            let results = data.suggestions || [];

            // Extra safety filter for branding
            results = results.filter(s => !s.song.toLowerCase().includes('agape') && !s.artist.toLowerCase().includes('agape'));
            setSuggestions(results);

            const searchVal = name.trim().toLowerCase();
            const match = results.find(r => r.song.toLowerCase() === searchVal || r.song.toLowerCase().startsWith(searchVal));

            if (match && searchVal.length >= 3) {
                console.log("MATCH PROATIVO:", match.song, "Tom:", match.key);
                setArtistName(match.artist);
                if (match.key) setSongKey(normalizeNote(match.key));
                else fetchSongMetadata(match.song, match.artist);
            }
        } catch (err) { console.error(err); }
    };

    const fetchSongMetadata = async (song, artist) => {
        try {
            const res = await fetch(`http://localhost:8000/api/music/metadata?song_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`);
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
            const res = await fetch(`http://localhost:8000/api/song/versions?artist_slug=${artistSlug}&song_slug=${songSlug}`);
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
            const res = await fetch('http://localhost:8000/api/chords');
            const data = await res.json();
            setAcervo(data.chords);
        } catch (err) { console.error(err); }
        finally { setAcervoLoading(false); }
    };

    const handleDeleteAcervo = async (id) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await fetch(`http://localhost:8000/api/chords/${id}`, { method: 'DELETE' });
            fetchAcervo();
        } catch (err) { alert(err); }
    };

    const handleEditOpen = async (id) => {
        try {
            const res = await fetch(`http://localhost:8000/api/chords/${id}`);
            const data = await res.json();
            setEditingChord(data.id);
            setEditFormData({ song_name: data.song_name, artist_name: data.artist_name, song_key: data.song_key, content: data.content });
        } catch (err) { alert(err); }
    };

    const handleEditSave = async (e) => {
        e.preventDefault();
        try {
            await fetch(`http://localhost:8000/api/chords/${editingChord}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });
            setEditingChord(null);
            fetchAcervo();
        } catch (err) { alert(err); }
    };

    // Auto-update Manual Preview when Capo or Tabs change
    useEffect(() => {
        if (manualPreviewSong && activeTab === 'manual') {
            handleManualSubmit();
        }
    }, [manualCapo, includeTabs]);

    const handleManualSubmit = async (e, songNameOverride, artistNameOverride, keyOverride) => {
        if (e) e.preventDefault();
        const useSongName = songNameOverride || songName;
        const useArtistName = artistNameOverride || artistName;
        const useKey = keyOverride || songKey;
        if (!useSongName || !useArtistName) return;
        setManualLoading(true);
        setManualError('');
        try {
            const res = await fetch('http://localhost:8000/api/music/manual', {
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
            if (!res.ok) throw new Error(data.detail || 'Erro ao buscar cifra.');
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
        } catch (err) { setManualError(err.message); }
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
                const res = await fetch('http://localhost:8000/api/music/batch/pdf', {
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
        setForgeMessage("Vasculhando Internet pelo Lote...");

        const songsToProcess = batchRawData.map(row => ({
            song_name: String(row[batchMapping.song_name] || '').trim(),
            artist_name: String(row[batchMapping.artist_name] || '').trim(),
            key: String(row[batchMapping.key] || '').trim(),
            version: 'Principal',
            include_tabs: includeTabs,
            capo: 0
        })).filter(s => s.song_name && s.key);

        setBatchProgress({ current: 0, total: songsToProcess.length });
        setIsGenerating(true);

        const finalResults = [];

        // Process one by one to show progress
        for (let i = 0; i < songsToProcess.length; i++) {
            const song = songsToProcess[i];
            try {
                const res = await fetch('http://localhost:8000/api/music/manual', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(song)
                });

                if (res.ok) {
                    const data = await res.json();
                    const inAcervo = acervo.some(a =>
                        a.song_name.toLowerCase() === data.song_name.toLowerCase() &&
                        a.artist_name.toLowerCase() === data.artist_name.toLowerCase()
                    );

                    finalResults.push({
                        ...data,
                        status: 'success',
                        show_chords: true,
                        in_acervo: inAcervo
                    });
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    finalResults.push({
                        song_name: song.song_name,
                        artist_name: song.artist_name,
                        requested_key: song.key,
                        status: 'error',
                        suggestions: errorData.detail?.suggestions || []
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
            const res = await fetch('http://localhost:8000/api/music/manual', {
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
                const inAcervo = acervo.some(a =>
                    a.song_name.toLowerCase() === data.song_name.toLowerCase() &&
                    a.artist_name.toLowerCase() === data.artist_name.toLowerCase()
                );

                const next = [...batchResults];
                next[idx] = {
                    ...data,
                    status: 'success',
                    show_chords: true,
                    in_acervo: inAcervo
                };
                setBatchResults(next);
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
            const res = await fetch('http://localhost:8000/api/generate_book', { method: 'POST', body: formData });

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
            {chordTooltip && (
                <>
                    {/* Transparent backdrop to close on click-away */}
                    <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setChordTooltip(null)}
                    />
                    <ChordTooltip
                        chord={chordTooltip.chord}
                        anchor={chordTooltip.anchor}
                        onClose={() => setChordTooltip(null)}
                    />
                </>
            )}

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-20 relative">
                {/* Visual Header */}
                <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-4">
                    <div className="flex items-center space-x-4">
                        <Flame className="w-10 h-10 text-[#B87333] animate-pulse" />
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
                        <div className="h-20 bg-black/40 border-b border-white/5 flex items-center justify-between px-8 backdrop-blur-xl shrink-0">
                            <div className="flex items-center space-x-6">
                                <button onClick={() => { setActiveTab('manual'); setCurrentStep(3); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{currentSong?.song_name}</h2>
                                    <p className="text-[10px] font-bold text-[#B87333] uppercase tracking-widest mt-1 opacity-60 italic">{currentSong?.artist_name}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-10">
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Tom Atual</span>
                                    <div className="flex items-center space-x-3 bg-black/40 px-5 py-2 rounded-xl border border-[#B87333]/20 shadow-[0_0_15px_rgba(184,115,51,0.1)]">
                                        <Music className="w-4 h-4 text-[#B87333]" />
                                        <span className="text-sm font-black text-white uppercase italic">{currentSong?.sounding_key}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Escala</span>
                                    <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                        <button onClick={() => setPlayerFontSize(prev => Math.max(12, prev - 1))} className="p-2 text-slate-500 hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                                        <span className="text-xs font-black text-white w-8 text-center">{playerFontSize}</span>
                                        <button onClick={() => setPlayerFontSize(prev => Math.min(45, prev + 1))} className="p-2 text-slate-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {/* PLAYER PLAYLIST SIDEBAR */}
                            <div className="w-80 bg-black/40 border-r border-white/5 flex flex-col p-6 space-y-6 shrink-0 relative">
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
                                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-16 scroll-smooth scrollbar-none pb-48">
                                    <div className="max-w-4xl mx-auto space-y-1">
                                        {(currentSong?.content || "").split('\n').map((line, lIdx) => {
                                            const isChordLine = !!(line && line.match(/^[A-G][b#]?(maj|min|m|7|sus|dim|aug)?/i));
                                            const isActive = currentLineIndex === lIdx;
                                            return (
                                                <div
                                                    key={lIdx}
                                                    data-line-index={lIdx}
                                                    onClick={() => handleLineClick(lIdx)}
                                                    className={`py-1 px-4 rounded-xl cursor-pointer transition-all duration-300 flex items-center group relative ${isActive ? 'bg-[#B87333]/15' : 'hover:bg-white/5'}`}
                                                    style={{ fontSize: `${playerFontSize}px` }}
                                                >
                                                    {isActive && <div className="absolute left-0 w-1.5 h-full bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.5)]"></div>}
                                                    <pre className={`font-mono leading-relaxed whitespace-pre-wrap ${isChordLine ? 'text-[#B87333] font-black italic tracking-tight' : 'text-slate-200 font-medium'}`}>
                                                        {isChordLine
                                                            ? renderChordLine(line, (chord, anchor) => setChordTooltip({ chord, anchor }))
                                                            : (line || ' ')}
                                                    </pre>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* PLAYER CONTROLS FLOATING PANEL */}
                                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A]/95 backdrop-blur-3xl border border-white/10 p-6 rounded-[40px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex items-center space-x-10 z-[110]">
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
                    <div className="selection-branch-root">
                        <StepIndicator currentStep={currentStep} steps={["Estoque", "Seleção", "Projeção", "Engrenagens", "Finalizar"]} />
                        <div className="min-h-[600px] flex flex-col">

                            {/* STEP 1: SELEÇÃO DE MÚSICAS */}
                            {currentStep === 1 && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
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
                                                                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white focus:ring-2 focus:ring-[#B87333]/40 outline-none transition-all font-bold placeholder:text-slate-700" placeholder="Ex: Mil Acasos"
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
                                                                                        const resolvedKey = item.key ? normalizeNote(item.key) : songKey;
                                                                                        setSongName(item.song);
                                                                                        setArtistName(item.artist);
                                                                                        if (item.key) setSongKey(resolvedKey);
                                                                                        else fetchSongMetadata(item.song, item.artist);
                                                                                        setShowSuggestions(false);
                                                                                        // Auto-trigger search immediately after selecting a suggestion
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
                                                                    type="text" required value={artistName}
                                                                    onChange={e => setArtistName(e.target.value)}
                                                                    className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white focus:ring-2 focus:ring-[#B87333]/40 outline-none transition-all font-bold placeholder:text-slate-700" placeholder="Ex: Skank"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6 relative z-10">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tom Original</label>
                                                                    <select value={songKey} onChange={e => setSongKey(e.target.value)} className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold appearance-none">
                                                                        {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Capo</label>
                                                                    <select value={manualCapo} onChange={e => setManualCapo(Number(e.target.value))} className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold appearance-none">
                                                                        {[...Array(13)].map((_, i) => <option key={i} value={i} className="bg-[#1A1A1A]">{i === 0 ? 'Sem Capo' : `${i}ª Casa`}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col justify-center">
                                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tablaturas</label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setIncludeTabs(!includeTabs)}
                                                                        className={`w-full py-5 rounded-2xl border transition-all font-black uppercase text-[10px] tracking-widest ${includeTabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/60 border-white/10 text-slate-600'}`}
                                                                    >
                                                                        {includeTabs ? 'Ativadas' : 'Desativar'}
                                                                    </button>
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

                                                    {/* Live Preview Area */}
                                                    {manualPreviewSong && (
                                                        <div className={`${isManualFullscreen ? 'fixed inset-0 z-[9999] bg-[#0A0A0F]' : 'bg-[#16161D] border border-white/10 rounded-[40px] shadow-2xl'} animate-in fade-in slide-in-from-top-10 duration-700 overflow-hidden flex flex-col`}>
                                                            {/* Preview Controls */}
                                                            <div className="bg-black/60 border-b border-white/10 p-6 flex flex-wrap items-center justify-between gap-6 relative z-20">
                                                                <div className="flex items-center space-x-6">
                                                                    <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.5)]"></div>
                                                                    <div>
                                                                        <div className="flex items-center space-x-3">
                                                                            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter line-clamp-1">{manualPreviewSong.song_name}</h4>
                                                                            {manualPreviewSong.capo > 0 && (
                                                                                <span className="bg-[#B87333]/20 text-[#B87333] text-[9px] font-black px-2 py-0.5 rounded border border-[#B87333]/30 uppercase tracking-widest">Capo {manualPreviewSong.capo}ª Casa</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] font-bold text-[#B87333] uppercase tracking-widest mt-1 opacity-60 italic">{manualPreviewSong.artist_name}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center space-x-6">
                                                                    {/* Navigation Arrows */}
                                                                    {songs.length > 1 && (
                                                                        <div className="flex items-center space-x-2 mr-4">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const idx = songs.findIndex(s => s.song_name === manualPreviewSong.song_name);
                                                                                    const prevIdx = (idx - 1 + songs.length) % songs.length;
                                                                                    setManualPreviewSong(songs[prevIdx]);
                                                                                }}
                                                                                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all border border-white/10"
                                                                            >
                                                                                <ChevronLeft className="w-5 h-5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    const idx = songs.findIndex(s => s.song_name === manualPreviewSong.song_name);
                                                                                    const nextIdx = (idx + 1) % songs.length;
                                                                                    setManualPreviewSong(songs[nextIdx]);
                                                                                }}
                                                                                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white transition-all border border-white/10"
                                                                            >
                                                                                <ChevronRight className="w-5 h-5" />
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    <div className="flex items-center space-x-8">
                                                                        {/* Fullscreen Toggle */}
                                                                        <button
                                                                            onClick={() => setIsManualFullscreen(!isManualFullscreen)}
                                                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isManualFullscreen ? 'bg-red-900/40 text-red-500 border-red-500/30' : 'bg-white/5 text-slate-500 hover:text-white border-white/10'} border`}
                                                                        >
                                                                            {isManualFullscreen ? <X className="w-6 h-6" /> : <Maximize2 className="w-5 h-5" />}
                                                                        </button>

                                                                        {/* Font Size */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Fonte</span>
                                                                            <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                                                                <button onClick={() => setManualFontSize(prev => Math.max(10, prev - 1))} className="p-1.5 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3.5 h-3.5" /></button>
                                                                                <span className="text-[10px] font-black text-white w-5 text-center">{manualFontSize}</span>
                                                                                <button onClick={() => setManualFontSize(prev => Math.min(40, prev + 1))} className="p-1.5 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Transpose */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Tom</span>
                                                                            <div className="flex items-center space-x-2 bg-black/40 p-1 rounded-xl border border-white/5">
                                                                                <button onClick={async () => {
                                                                                    const song = manualPreviewSong;
                                                                                    const currentKeyToUse = song.sounding_key || song.song_key || 'C';
                                                                                    try {
                                                                                        const res = await fetch('http://localhost:8000/api/transpose', {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: song.content, current_key: currentKeyToUse, semitones: -1 })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...song, content: data.transposed_content, sounding_key: data.new_key });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1.5 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3.5 h-3.5" /></button>
                                                                                <span className="text-[10px] font-black text-white w-6 text-center italic">{manualPreviewSong.sounding_key || manualPreviewSong.song_key}</span>
                                                                                <button onClick={async () => {
                                                                                    const song = manualPreviewSong;
                                                                                    const currentKeyToUse = song.sounding_key || song.song_key || 'C';
                                                                                    try {
                                                                                        const res = await fetch('http://localhost:8000/api/transpose', {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: song.content, current_key: currentKeyToUse, semitones: 1 })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...song, content: data.transposed_content, sounding_key: data.new_key });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1.5 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Scroll Controls */}
                                                                        <div className="flex items-center space-x-6 px-8 border-x border-white/5">
                                                                            <button
                                                                                onClick={() => setIsManualAutoScrolling(!isManualAutoScrolling)}
                                                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isManualAutoScrolling ? 'bg-[#B87333] text-white shadow-xl shadow-[#B87333]/30 scale-105' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                                                            >
                                                                                {isManualAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                                                            </button>
                                                                            <div className="w-28">
                                                                                <div className="flex items-center justify-between mb-1.5">
                                                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Velocidade</span>
                                                                                    <span className="text-[9px] font-black text-white italic">{manualScrollSpeed}x</span>
                                                                                </div>
                                                                                <input type="range" min="0.5" max="5" step="0.5" value={manualScrollSpeed} onChange={(e) => setManualScrollSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#B87333]" />
                                                                            </div>
                                                                        </div>

                                                                        {/* Action Button */}
                                                                        <button
                                                                            onClick={() => {
                                                                                if (manualPreviewSong && !songs.some(s => s.song_name === manualPreviewSong.song_name && s.artist_name === manualPreviewSong.artist_name)) {
                                                                                    setSongs(prev => [...prev, manualPreviewSong]);
                                                                                }
                                                                                // Keep the preview visible, just clear the search fields
                                                                                setSongName('');
                                                                                setArtistName('');
                                                                            }}
                                                                            className="px-8 py-4 bg-[#B87333] hover:bg-green-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B87333]/20 flex items-center space-x-3 group"
                                                                        >
                                                                            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                                                                            <span>Adicionar à Lista</span>
                                                                        </button>

                                                                        <button onClick={() => setManualPreviewSong(null)} className="p-4 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-2xl transition-all border border-white/5" title="Fechar preview"><X className="w-5 h-5" /></button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Scrollable Chord Content */}
                                                            <div ref={manualScrollContainerRef} className="overflow-y-auto p-10 scrollbar-none pb-10" style={{ maxHeight: isManualFullscreen ? 'calc(100vh - 120px)' : '500px' }}>
                                                                <div className="max-w-3xl mx-auto">
                                                                    {(manualPreviewSong?.content || "").split('\n').map((line, lIdx) => {
                                                                        const isChordLine = !!(line && line.match(/^[A-G][b#]?(maj|min|m|7|sus|dim|aug)?/i));
                                                                        return (
                                                                            <pre key={lIdx} className={`font-mono leading-relaxed whitespace-pre-wrap ${isChordLine ? 'text-[#B87333] font-black italic tracking-tight mb-0' : 'text-slate-300 font-medium mb-1'}`} style={{ fontSize: `${manualFontSize}px` }}>
                                                                                {isChordLine
                                                                                    ? renderChordLine(line, (chord, anchor) => setChordTooltip({ chord, anchor }))
                                                                                    : (line || ' ')}
                                                                            </pre>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}


                                                    {/* Error display */}
                                                    {manualError && (
                                                        <div className="flex items-center space-x-3 p-4 bg-red-900/20 border border-red-500/30 rounded-2xl animate-in fade-in duration-300">
                                                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                                            <p className="text-xs font-bold text-red-400">{manualError}</p>
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
                                                                <span className="text-xs font-black bg-[#B87333] text-white py-1.5 px-4 rounded-full shadow-lg shadow-[#B87333]/20 uppercase italic">{songs.length}</span>
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
                                                            <div className="w-20 h-20 bg-[#B87333]/10 rounded-3xl flex items-center justify-center mb-6 border border-[#B87333]/20 group-hover:scale-110 transition-transform">
                                                                {batchLoading ? <RefreshCw className="w-10 h-10 text-[#B87333] animate-spin" /> : <UploadCloud className="w-10 h-10 text-[#B87333]" />}
                                                            </div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest">{batchLoading ? 'Processando Arquivo...' : 'Importação em Massa'}</h3>
                                                            <p className="text-xs text-slate-500 uppercase font-bold mt-3">PDF, XLSX ou CSV</p>
                                                            <input type="file" ref={fileInputRef} onChange={handleBatchFileSelect} className="hidden" />
                                                        </div>

                                                    ) : showMappingUI && !showBatchReview ? (
                                                        <div className="w-full max-w-xl bg-black/40 p-8 rounded-[32px] border border-white/5 space-y-6">
                                                            <h4 className="text-xs font-black text-[#B87333] uppercase tracking-widest text-center">Mapear Colunas</h4>
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
                                                                <button onClick={handleBatchProcess} disabled={batchLoading} className="flex-[2] py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase text-[10px] rounded-xl shadow-lg shadow-[#B87333]/20 flex items-center justify-center disabled:opacity-50">
                                                                    {batchLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Processar Lote'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : showBatchReview ? (
                                                        <div className="w-full max-w-4xl bg-black/40 p-8 rounded-[32px] border border-white/5 space-y-6">
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
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
                                                                                    <h5 className="font-black text-white uppercase italic tracking-tighter text-lg truncate">{item.song_name}</h5>
                                                                                    <div className="flex items-center space-x-3 mt-1">
                                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{item.artist_name}</p>
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
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="flex flex-col items-end space-y-4">
                                                                                        <div className="flex items-center space-x-4">
                                                                                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Não Encontrada</span>
                                                                                            <button onClick={() => setBatchFixData({ idx, song_name: item.song_name, artist_name: item.artist_name, song_key: item.requested_key || 'C', content: '', link: '' })} className="px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white border border-red-500/30 font-black uppercase text-[10px] rounded-lg transition-all flex items-center space-x-2">
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
                                                                                                content: data.content
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
                                                                    <div>
                                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tom Original da Cifra</label>
                                                                        <select value={batchFixData.song_key} onChange={e => setBatchFixData({ ...batchFixData, song_key: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none">
                                                                            {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col">
                                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Cifra Bruta</label>
                                                                        <textarea value={batchFixData.content} onChange={e => setBatchFixData({ ...batchFixData, content: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none font-mono text-xs leading-relaxed min-h-[250px] resize-none scrollbar-thin" placeholder="Cole a cifra estruturada aqui..."></textarea>
                                                                    </div>
                                                                </div>

                                                                <button onClick={async () => {
                                                                    if (!batchFixData.content.trim()) return;
                                                                    try {
                                                                        await fetch('http://localhost:8000/api/chords', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({
                                                                                song_name: batchFixData.song_name,
                                                                                artist_name: batchFixData.artist_name,
                                                                                song_key: batchFixData.song_key,
                                                                                content: batchFixData.content,
                                                                                capo: 0
                                                                            })
                                                                        });
                                                                        // Update acervo list so it shows 'No Acervo' optionally globally
                                                                        fetchAcervo();
                                                                    } catch (e) { console.error(e); }

                                                                    const next = [...batchResults];
                                                                    next[batchFixData.idx] = {
                                                                        ...next[batchFixData.idx],
                                                                        song_name: batchFixData.song_name,
                                                                        artist_name: batchFixData.artist_name,
                                                                        requested_key: batchFixData.song_key,
                                                                        original_key: batchFixData.song_key,
                                                                        sounding_key: batchFixData.song_key,
                                                                        content: batchFixData.content,
                                                                        status: 'success',
                                                                        in_acervo: true
                                                                    };
                                                                    setBatchResults(next);
                                                                    setBatchFixData(null);
                                                                }} className="w-full mt-6 py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 shrink-0">
                                                                    Salvar no Banco e Lote
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {activeTab === 'acervo' && (
                                                <div className="space-y-6 animate-in fade-in duration-500">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[450px] overflow-y-auto pr-4 scrollbar-thin">
                                                        {acervoLoading ? (
                                                            <div className="col-span-full py-20 text-center"><RefreshCw className="w-10 h-10 animate-spin text-[#B87333] mx-auto mb-4" /><p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronizando Banco...</p></div>
                                                        ) : acervo.map((item, idx) => (
                                                            <div key={idx} className="bg-black/40 border border-white/5 p-6 rounded-[28px] flex items-center justify-between hover:border-[#B87333]/30 transition-all group relative overflow-hidden">
                                                                <div className="absolute top-0 left-0 w-1 h-full bg-[#B87333]/20 group-hover:bg-[#B87333] transition-all"></div>
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <p className="text-sm font-black text-white uppercase italic truncate">{item.song_name}</p>
                                                                    <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase transition-colors group-hover:text-[#B87333]/60">{item.artist_name} • {item.song_key}</p>
                                                                </div>
                                                                <button onClick={() => setSongs([...songs, { ...item, requested_key: item.song_key, sounding_key: item.song_key, capo: 0, show_chords: true }])} className="w-10 h-10 bg-white/5 hover:bg-[#B87333] text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all shadow-xl active:scale-90 flex-shrink-0">
                                                                    <Plus className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            )}

                            {/* STEP 2: REVISÃO DA SELEÇÃO (PASSO VAZIO OU REDIRECIONADO) */}
                            {currentStep === 2 && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                        <div className="flex items-center justify-between mb-10">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Revisão da Forja</h2>
                                            </div>
                                            <span className="text-[10px] font-black bg-white/5 text-[#B87333] py-2.5 px-6 rounded-full border border-white/5 uppercase tracking-widest italic">{songs.length} Itens Selecionados</span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#B87333]/20">
                                            {songs.length === 0 ? (
                                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px] bg-black/20">
                                                    <FileAudio className="w-16 h-16 text-slate-800 mx-auto mb-6 opacity-20" />
                                                    <p className="text-xs font-black text-slate-600 uppercase tracking-[0.3em]">Nenhuma peça selecionada</p>
                                                    <button onClick={() => setCurrentStep(1)} className="mt-8 px-8 py-3 bg-[#B87333]/10 text-[#B87333] border border-[#B87333]/20 rounded-xl hover:bg-[#B87333] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Voltar para o estoque</button>
                                                </div>
                                            ) : songs.map((song, i) => (
                                                <div key={i} className="p-6 rounded-[32px] border flex items-center justify-between transition-all bg-black/40 border-white/5 hover:border-[#B87333]/30 group">
                                                    <div className="flex items-center space-x-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-[#B87333] border border-white/5 group-hover:bg-[#B87333] group-hover:text-white transition-all shadow-inner">
                                                            <Music className="w-6 h-6" />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-white text-lg line-clamp-1 uppercase italic tracking-tighter">{song.song_name}</h4>
                                                            <div className="flex items-center space-x-4 mt-1">
                                                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{song.artist_name}</p>
                                                                <div className="h-1 w-1 bg-slate-700 rounded-full"></div>
                                                                <p className="text-[10px] text-[#B87333] font-black uppercase tracking-widest">Tom: {song.sounding_key || song.song_key}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex flex-col items-center mr-6">
                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Ajuste de Tom</span>
                                                            <div className="flex items-center space-x-1.5 bg-black/60 p-1 rounded-xl border border-white/5">
                                                                <button onClick={() => transposeSong(i, -1)} className="p-2 hover:text-[#B87333] transition-all"><ChevronDown className="w-4 h-4" /></button>
                                                                <span className="font-mono font-black text-xs w-8 text-center text-white">{song.sounding_key || song.song_key || 'C'}</span>
                                                                <button onClick={() => transposeSong(i, 1)} className="p-2 hover:text-[#B87333] transition-all"><ChevronUp className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-center mr-6">
                                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Capo</span>
                                                            <select
                                                                value={song.capo || 0}
                                                                onChange={(e) => {
                                                                    const newCapo = Number(e.target.value);
                                                                    const oldCapo = song.capo || 0;
                                                                    transposeSong(i, oldCapo - newCapo);
                                                                    const next = [...songs];
                                                                    next[i].capo = newCapo;
                                                                    setSongs(next);
                                                                }}
                                                                className="bg-black/60 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black text-[#B87333] outline-none"
                                                            >
                                                                {[...Array(13)].map((_, c) => <option key={c} value={c} className="bg-[#1A1A1A]">{c === 0 ? 'Off' : `${c}ª`}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex items-center space-x-2 border-l border-white/5 pl-6">
                                                            <button
                                                                onClick={() => toggleChords(i)}
                                                                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${song.show_chords ? 'bg-[#B87333] text-white border-[#B87333]/30 shadow-lg shadow-[#B87333]/20' : 'bg-white/5 text-slate-700 border-white/5 hover:text-[#B87333]'}`}
                                                            >
                                                                <Guitar className="w-5 h-5" />
                                                            </button>
                                                            <button onClick={() => removeSong(i)} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 hover:bg-red-900/40 text-slate-700 hover:text-red-500 border border-white/5 transition-all">
                                                                <Trash2 className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: MODO PROJEÇÃO */}
                            {currentStep === 3 && (
                                <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-700">
                                    <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-[40px] p-8 shadow-2xl">
                                        <div className="flex items-center space-x-4 mb-10">
                                            <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                            <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Modo Projeção</h2>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="bg-black/40 border border-white/5 rounded-[40px] p-10 flex flex-col items-center text-center group hover:border-[#B87333]/40 transition-all">
                                                <div className="w-24 h-24 bg-[#B87333]/10 rounded-[32px] flex items-center justify-center mb-8 border border-[#B87333]/20 group-hover:scale-110 transition-all shadow-2xl shadow-[#B87333]/5">
                                                    <Monitor className="w-10 h-10 text-[#B87333]" />
                                                </div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Performance ao Vivo</h3>
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 max-w-xs">{songs.length === 0 ? "Adicione músicas para ativar o player." : "Interface otimizada para palcos, com autoscroll e fontes industriais de alta visibilidade."}</p>
                                                <button
                                                    onClick={() => { setActiveTab('player'); setCurrentStep(3); setSelectedManualIndex(songs.length > 0 ? 0 : null); }}
                                                    className={`px-10 py-5 font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95 ${songs.length === 0 ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed shadow-none' : 'bg-[#B87333] hover:bg-[#8B4513] text-white shadow-[#B87333]/20'}`}
                                                    disabled={songs.length === 0}
                                                >
                                                    Ativar Player
                                                </button>
                                            </div>

                                            <div className="bg-black/40 border border-white/5 rounded-[40px] p-10 flex flex-col items-center text-center opacity-40 grayscale group cursor-not-allowed">
                                                <div className="w-24 h-24 bg-white/5 rounded-[32px] flex items-center justify-center mb-8 border border-white/5">
                                                    <Tv className="w-10 h-10 text-slate-700" />
                                                </div>
                                                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest mb-4">Display Externo</h3>
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-8 max-w-xs">Espelhamento wireless para telas auxiliares e projetores. Em desenvolvimento.</p>
                                                <span className="px-8 py-4 bg-white/5 text-slate-700 font-black uppercase tracking-widest rounded-2xl border border-white/5 text-xs">Indisponível</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: CONFIGURAÇÕES DA FORJA */}
                            {currentStep === 4 && (
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
                            {currentStep === 5 && (
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

                            {/* GLOBAL NAVIGATION CONTROLS */}
                            {activeTab !== 'player' && activeTab !== 'presentation' && (
                                <div className="mt-10 flex items-center justify-between px-4 pb-12">
                                    <button
                                        disabled={currentStep === 1}
                                        onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                        className={`flex items-center space-x-3 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] italic transition-all border ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-white/5 border-white/5 text-slate-500 hover:text-white hover:border-[#B87333]/40'}`}
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>Voltar</span>
                                    </button>

                                    <button
                                        disabled={currentStep === 5 || (currentStep === 1 && songs.length === 0)}
                                        onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                                        className={`flex items-center space-x-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] italic transition-all shadow-xl ${currentStep === 5 ? 'opacity-0 pointer-events-none' : 'bg-[#B87333] text-white shadow-[#B87333]/20 hover:bg-[#8B4513] disabled:opacity-20'}`}
                                    >
                                        <span>{currentStep === 4 ? "Ir para Finalização" : "Próximo Passo"}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div >
                )
                }
            </main >
        </div >
    );
}


