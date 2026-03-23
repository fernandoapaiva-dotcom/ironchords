import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PhoneticMatcher } from './utils/PhoneticMatcher';
import { Music, UploadCloud, Plus, Minus, FileText, CheckCircle, AlertCircle, Eye, EyeOff, FileAudio, Info, X, Guitar, Settings2, Activity, Image as ImageIcon, Database, Edit3, Trash2, ArrowRight, Play, Maximize, Maximize2, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download, ArrowLeft, SkipBack, SkipForward, Save, Share2, FolderHeart, Flame, Hammer, Sparkles, RefreshCw, Zap, ShieldCheck, Monitor, Tv, Check, Users, LayoutList, Layout, Mic, Search, RotateCcw, Printer, Archive, GripVertical, Minimize2, Link, MessageCircle, Mail, ExternalLink, Smartphone, Apple, Copy, Wind, Footprints, MoreVertical, Menu, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SVGuitarChord } from 'svguitar';
import { AudioTracker } from './utils/AudioTracker';
import { FaceTracker } from './utils/FaceTracker';
import { CifraParser } from './utils/CifraParser';
import LoginScreen from './components/LoginScreen';

// Dynamic API Base URL detection
// Dynamic API Base URL detection
const getBaseUrl = () => {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // If not local, ALWAYS force the production Render URL to avoid env var issues
    if (!isLocal) {
        return 'https://ironchords.onrender.com';
    }
    
    // In local dev, use the env var or default to 8000
    const raw = import.meta.env.VITE_API_BASE_URL;
    if (raw) return raw.replace(/\/$/, '');
    return 'http://127.0.0.1:8000';
};
const API_BASE_URL = getBaseUrl().replace(/\/api\/?$/, '');

// -------------------------------------------------------------------
// enabled flag allows re-running the effect when the container element becomes available (player opens)
function usePinchZoom(containerRef, fontSize, setFontSize, minSize = 12, maxSize = 60, onPinchActive = null, onPinchUpdate = null, enabled = true, trigger = null) {
    const lastDistRef = React.useRef(null);
    const targetFontSizeRef = React.useRef(fontSize);

    React.useEffect(() => {
        targetFontSizeRef.current = fontSize;
    }, [fontSize]);

    React.useEffect(() => {
        if (!enabled) return;
        
        // Wait a tiny bit to ensure the ref is populated after a mode switch
        const timeout = setTimeout(() => {
            const el = containerRef?.current;
            if (!el) return;

            const getTouchDist = (touches) => {
                if (touches.length < 2) return 0;
                const dx = Math.abs(touches[0].clientX - touches[1].clientX);
                const dy = Math.abs(touches[0].clientY - touches[1].clientY);
                return Math.sqrt(dx * dx + dy * dy);
            };

            const onTouchStart = (e) => {
                if (e.touches.length === 2) {
                    if (e.cancelable) e.preventDefault();
                    lastDistRef.current = getTouchDist(e.touches);
                    if (onPinchActive) onPinchActive(true);
                }
            };

            const onTouchMove = (e) => {
                if (e.touches.length !== 2 || lastDistRef.current === null) return;
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();

                const newDist = getTouchDist(e.touches);
                if (newDist === 0) return;

                const ratio = newDist / lastDistRef.current;
                const newSize = Math.min(maxSize, Math.max(minSize, targetFontSizeRef.current * ratio));
                targetFontSizeRef.current = newSize;

                el.style.setProperty('--dynamic-zoom-fs', `${newSize}px`);
                el.style.fontSize = `${newSize}px`; 

                if (onPinchUpdate) onPinchUpdate(newSize);
                lastDistRef.current = newDist;
            };

            const onTouchEnd = () => {
                if (lastDistRef.current !== null) {
                    if (onPinchActive) onPinchActive(false);
                    setFontSize(Math.round(targetFontSizeRef.current * 10) / 10);
                }
                lastDistRef.current = null;
            };

            el.addEventListener('touchstart', onTouchStart, { capture: true, passive: false });
            el.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
            el.addEventListener('touchend', onTouchEnd, { capture: true, passive: true });
            el.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true });

            el.style.touchAction = 'pan-y';

            return () => {
                el.removeEventListener('touchstart', onTouchStart, { capture: true });
                el.removeEventListener('touchmove', onTouchMove, { capture: true });
                el.removeEventListener('touchend', onTouchEnd, { capture: true });
                el.removeEventListener('touchcancel', onTouchEnd, { capture: true });
            };
        }, 80); // Small delay to let React committed refs

        return () => clearTimeout(timeout);
    }, [containerRef, setFontSize, minSize, maxSize, onPinchActive, onPinchUpdate, enabled, trigger]);
}




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
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'Db', 'Eb', 'Gb', 'Ab', 'Bb'];
const KEY_SEMITONES = { 'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11 };

const CHORD_TOKEN_RE = /(?:^|\s)([A-G][b#]?(?:m|maj|min|M|dim|aug|sus|add|alt|7|9|11|13|6|2|4|5|b5|#5|#11|b9|#9)*(?:\/[A-G][b#]?)?)(?![a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g;

function isChordOnlyLine(line) {
    if (!line || !line.trim()) return false;
    if (isTablatureLine(line)) return false;
    const chords = (line.match(CHORD_TOKEN_RE) || []).map(m => m.trim());
    const cleaned = line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '');
    return chords.length > 0 && cleaned.length < Math.max(2, line.trim().length * 0.5);
}

function isEndOfSection(lines, currentIdx) {
    // A section usually ends before an empty line, a marker like [Chorus], 
    // or if it's the very last line of the song.
    if (currentIdx >= lines.length - 1) return true;
    for (let i = currentIdx + 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) return true;
        if (line.trim().startsWith('[')) return true;
        // If we find another lyric line before a break, it's NOT the end of section
        if (!isChordOnlyLine(line) && !isTablatureLine(line)) return false;
    }
    return true;
}

function isTablatureLine(line) {
    if (!line) return false;
    const trimmed = line.trim();
    if (/^[eEaAdDgGbB]\|/.test(trimmed)) return true;
    if ((trimmed.match(/-/g) || []).length > 8) return true;
    return false;
}

function removeTablatureBlocks(content) {
    if (!content) return '';
    const lines = content.split('\n');
    const result = [];
    let inTabBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Check if entering a tab block
        if (/^\[.*(tab|solo|riff|dedilhado|batida).*\]$/i.test(trimmed)) {
            inTabBlock = true;
            continue;
        }

        if (inTabBlock) {
            // Exit tab block if a non-tab header is found
            if (/^\[.*\]$/i.test(trimmed) && !/^\[.*(tab|solo|riff|dedilhado|batida).*\]$/i.test(trimmed)) {
                inTabBlock = false;
                result.push(line);
                continue;
            }

            // Exit tab block if we hit actual lyrics (not empty, not chord, not tab, not header, not guitar note)
            if (trimmed.length > 0 && !isChordOnlyLine(line) && !isTablatureLine(line) && !/^\[.*\]$/.test(trimmed)) {
                const isGuitarNote = /guitarra|dedilhado|batida|solo|riff|ritmo|frase|passagem/i.test(line) && (line.includes('(') || line.includes('['));
                if (!isGuitarNote) {
                    inTabBlock = false;
                    result.push(line);
                    continue;
                }
            }
            continue; // Drop line inside tab block
        }

        // Even outside a block, drop standalone tab-related lines
        const isTabLine = line.includes('|-') || line.includes('-|') || /^[eBGDAE]\|/.test(trimmed);
        const isRhythmArrow = line.includes('↓') || line.includes('↑');
        const isGuitarNote = /guitarra|dedilhado|batida|solo|riff|ritmo|frase|passagem/i.test(line) && (line.includes('(') || line.includes('['));

        if (isTabLine || isRhythmArrow || isGuitarNote) continue;

        result.push(line);
    }

    // Clean up excessive blank lines left over
    return result.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function transposeChord(chord, semitones) {
    if (!semitones || semitones === 0) return chord;
    const transposeNote = (note) => {
        const useFlats = note.includes('b');
        let idx = NOTES.indexOf(note);
        if (idx === -1) idx = FLATS.indexOf(note);
        if (idx === -1) return note;
        let newIdx = (idx + semitones) % 12;
        if (newIdx < 0) newIdx += 12;
        return useFlats ? FLATS[newIdx] : NOTES[newIdx];
    };
    const match = chord.match(/^([A-G][b#]?)([^/]*)(?:\/([A-G][b#]?))?$/);
    if (!match) return chord;
    const base = match[1];
    const suffix = match[2];
    const bass = match[3];
    let result = transposeNote(base) + suffix;
    if (bass) result += "/" + transposeNote(bass);
    return result;
}

function renderChordLine(line, onChordClick, capo = 0) {
    const parts = [];
    let last = 0;
    let match;
    CHORD_TOKEN_RE.lastIndex = 0;
    while ((match = CHORD_TOKEN_RE.exec(line)) !== null) {
        const fullMatch = match[0];
        const originalChord = match[1];
        const chordIndex = match.index + (fullMatch.length - originalChord.length);

        if (chordIndex > last) {
            parts.push(line.slice(last, chordIndex));
        }

        // Apply Capo (Sounding Key - Capo = Shape)
        const displayChord = capo > 0 ? transposeChord(originalChord, -capo) : originalChord;

        parts.push(
            <span
                key={chordIndex}
                className="cursor-pointer underline decoration-[#B87333]/40 underline-offset-2 text-[#B87333] hover:text-amber-300 hover:decoration-amber-300 transition-colors inline-block"
                onMouseEnter={(e) => {
                    if (window.matchMedia("(hover: hover)").matches) {
                        onChordClick(displayChord, e.currentTarget, false);
                    }
                }}
                onMouseLeave={(e) => {
                    if (window.matchMedia("(hover: hover)").matches) {
                        onChordClick(null, null, false);
                    }
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!window.matchMedia("(hover: hover)").matches) {
                        onChordClick(displayChord, e.currentTarget, true);
                    }
                }}
            >{displayChord}</span>
        );
        last = chordIndex + originalChord.length;
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


// -------------------------------------------------------------------
// SHARE MODAL COMPONENT (Internal View)
// -------------------------------------------------------------------
const ShareModal = ({ isOpen, onClose, listName, link, loading }) => {
    if (!isOpen) return null;

    const handleWhatsApp = () => {
        const text = encodeURIComponent(`Olha esse repertório no IronChords: ${listName}\n\n${link}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    const handleEmail = () => {
        const subject = encodeURIComponent(`Repertório: ${listName}`);
        const body = encodeURIComponent(`Olá, segue o link do repertório no IronChords:\n\n${link}`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(link).then(() => {
            alert("Link copiado!");
        });
    };

    const handleNativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `IronChords - ${listName}`,
                    text: 'Confira este repertório!',
                    url: link,
                });
            } catch (err) { console.log("Share cancelado", err); }
        } else {
            handleCopy();
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#070709]/90 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-md bg-[#16161D] border border-white/10 rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-4">
                        <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                            <Share2 className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Compartilhar Lista</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{listName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Link Preview */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Link do Repert&oacute;rio</p>
                        <p className="text-xs text-slate-300 font-mono truncate">
                            {loading ? "Gerando link curto..." : link}
                        </p>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="shrink-0 p-2 bg-white/5 hover:bg-[#B87333]/20 text-slate-400 hover:text-[#B87333] rounded-xl transition-all border border-white/5"
                        title="Copiar link"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-3">
                    {/* WhatsApp */}
                    <button
                        onClick={handleWhatsApp}
                        disabled={loading}
                        className={`w-full py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Compartilhar no WhatsApp
                    </button>

                    {/* Native Share (mobile) */}
                    {navigator.share && (
                        <button
                            onClick={handleNativeShare}
                            disabled={loading}
                            className={`w-full py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Share2 className="w-4 h-4" />
                            Compartilhar via...
                        </button>
                    )}

                    {/* Email */}
                    <button
                        onClick={handleEmail}
                        disabled={loading}
                        className={`w-full py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <Mail className="w-4 h-4" />
                        Enviar por E-mail
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};


// -------------------------------------------------------------------
// SETTINGS MODAL
// -------------------------------------------------------------------
// -------------------------------------------------------------------
// UTILS
// -------------------------------------------------------------------
const normalize_google_email = (email) => {
    if (!email) return "";
    let e = email.toLowerCase().trim();
    let [local, domain] = e.split('@');
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        local = local.split('+')[0]; // Remove aliases
        local = local.replace(/\./g, ''); // Remove periods
        return `${local}@gmail.com`;
    }
    return e;
};

const SettingsModal = ({ isOpen, onClose, includeToc, setIncludeToc, includeDictionary, setIncludeDictionary, authenticatedUser, setShowUserManagement, deferredPrompt, handleInstallPWA }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4">
            <div className="bg-[#16161D] border border-[#B87333]/30 p-8 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-2xl flex flex-col max-h-[90vh] relative">
                <div className="flex items-center justify-between mb-8 shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Configurações</h2>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="overflow-y-auto pr-4 space-y-8 scrollbar-thin scrollbar-thumb-white/10 pb-10">
                    <div className="bg-black/40 border border-white/5 rounded-[32px] p-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <Settings2 className="w-5 h-5 text-[#B87333]" />
                            <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Padrões de Exportação</h3>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-[#B87333]/40 transition-all group">
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-widest">Incluir Sumário</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Gerar índice clicável no PDF e Word</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${includeToc ? 'bg-[#B87333]' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeToc ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" className="hidden" checked={includeToc} onChange={(e) => setIncludeToc(e.target.checked)} />
                            </label>

                            <label className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-[#B87333]/40 transition-all group">
                                <div>
                                    <p className="text-sm font-black text-white uppercase tracking-widest">Dicionário de Acordes</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Renderizar vamps ao final de cada música</p>
                                </div>
                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${includeDictionary ? 'bg-[#B87333]' : 'bg-slate-700'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeDictionary ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                </div>
                                <input type="checkbox" className="hidden" checked={includeDictionary} onChange={(e) => setIncludeDictionary(e.target.checked)} />
                            </label>
                        </div>
                    </div>

                    {normalize_google_email(authenticatedUser) === 'fernandomaragao89@gmail.com' && (
                        <div className="bg-blue-600/5 border border-blue-500/20 rounded-[32px] p-8 shadow-[0_0_30px_rgba(59,130,246,0.05)]">
                            <div className="flex items-center space-x-3 mb-6">
                                <ShieldCheck className="w-5 h-5 text-blue-500" />
                                <h3 className="text-xs font-black text-blue-500 uppercase tracking-[0.3em] italic">Administração</h3>
                            </div>
                            <button 
                                onClick={() => { setShowUserManagement(true); onClose(); }}
                                className="w-full py-6 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 rounded-2xl border border-blue-500/30 font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center space-x-4 shadow-xl shadow-blue-900/10 group"
                            >
                                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/40 transition-all">
                                    <Users className="w-5 h-5" />
                                </div>
                                <span>Gestão de Acessos</span>
                            </button>
                        </div>
                    )}

                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <FileText className="w-5 h-5 text-slate-300" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] italic">Documentação</h3>
                        </div>
                        <button 
                            onClick={() => window.open('/manual.html', '_blank')}
                            className="w-full py-6 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center space-x-4 shadow-xl group"
                        >
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-all">
                                <FileText className="w-5 h-5" />
                            </div>
                            <span>Manual de Operação (PDF)</span>
                        </button>
                    </div>

                    <div className="bg-[#B87333]/5 border border-[#B87333]/20 rounded-[32px] p-8">
                        <div className="flex items-center space-x-3 mb-6">
                            <Smartphone className="w-5 h-5 text-[#B87333]" />
                            <h3 className="text-xs font-black text-[#B87333] uppercase tracking-[0.3em] italic">Instalar no Celular</h3>
                        </div>
                        
                        {deferredPrompt ? (
                            <button 
                                onClick={handleInstallPWA}
                                className="w-full py-6 bg-[#B87333]/10 hover:bg-[#B87333]/20 text-[#B87333] rounded-2xl border border-[#B87333]/30 font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center space-x-4 group"
                            >
                                <Download className="w-5 h-5" />
                                <span>Instalar Aplicativo</span>
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2 flex items-center opacity-60">
                                        <Apple className="w-3 h-3 mr-2" /> iOS (iPhone/iPad)
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                        Toque no ícone de <span className="text-blue-400 mx-1 inline-block"><Share2 className="w-3 h-3 inline pb-0.5" /> compartilhar</span> no Safari e selecione <span className="text-white">"Adicionar à Tela de Início"</span>.
                                    </p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-2 flex items-center opacity-60">
                                        <Smartphone className="w-3 h-3 mr-2" /> Android
                                    </p>
                                    <p className="text-xs text-slate-400 font-bold leading-relaxed">
                                        Abra o menu do Chrome (<span className="text-white mx-1 inline-block">⋮</span>) e selecione <span className="text-white">"Instalar Aplicativo"</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// -------------------------------------------------------------------
// USER MANAGEMENT MODAL (Admin Only)
// -------------------------------------------------------------------
const UserManagementModal = ({ isOpen, onClose, API_BASE }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, authorized, pending
    const [newUserEmail, setNewUserEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/users`);
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const handleAuthorize = async (email) => {
        try {
            await fetch(`${API_BASE}/auth/authorize/${email}`);
            fetchUsers();
        } catch (err) {
            console.error("Auth failed:", err);
        }
    };

    const handleAddManual = async () => {
        if (!newUserEmail || !newUserEmail.includes('@')) {
            alert("Por favor, insira um e-mail válido.");
            return;
        }
        setIsAdding(true);
        try {
            const res = await fetch(`${API_BASE}/auth/add_manual/${encodeURIComponent(newUserEmail.trim())}`);
            const data = await res.json();
            if (data.status === 'success') {
                setNewUserEmail('');
                fetchUsers();
            } else {
                alert(data.message || "Erro ao adicionar usuário.");
            }
        } catch (err) {
            console.error("Manual add failed:", err);
            alert("Erro de conexão ao adicionar usuário.");
        }
        setIsAdding(false);
    };

    const handleDeauthorize = async (email) => {
        try {
            await fetch(`${API_BASE}/auth/deauthorize/${email}`);
            fetchUsers();
        } catch (err) {
            console.error("Deauth failed:", err);
        }
    };

    const handleDelete = async (email) => {
        if (!window.confirm(`Tem certeza que deseja remover permanentemente ${email}?`)) return;
        try {
            await fetch(`${API_BASE}/auth/delete/${email}`, { method: 'DELETE' });
            fetchUsers();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    if (!isOpen) return null;

    const counts = {
        all: users.length,
        authorized: users.filter(u => u.status === 'authorized').length,
        pending: users.filter(u => u.status === 'pending').length
    };

    const filteredUsers = users.filter(u => {
        if (filter === 'authorized') return u.status === 'authorized';
        if (filter === 'pending') return u.status === 'pending';
        return true;
    });

    return createPortal(
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-[#16161D] border border-white/10 rounded-[50px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500 flex flex-col max-h-[90vh]">
                <div className="p-10 pb-4">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-5">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-[20px] border border-blue-500/30 flex items-center justify-center">
                                <ShieldCheck className="w-7 h-7 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Gerenciar Acessos</h3>
                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-1">Sincronização em Tempo Real</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors group">
                            <X className="w-5 h-5 text-slate-500 group-hover:text-white" />
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div onClick={() => setFilter('all')} className={`p-4 rounded-3xl border transition-all cursor-pointer ${filter === 'all' ? 'bg-blue-500/10 border-blue-500/40 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-2xl font-black text-white">{counts.all}</p>
                        </div>
                        <div onClick={() => setFilter('authorized')} className={`p-4 rounded-3xl border transition-all cursor-pointer ${filter === 'authorized' ? 'bg-green-500/10 border-green-500/40 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Ativos</p>
                            <p className="text-2xl font-black text-green-500">{counts.authorized}</p>
                        </div>
                        <div onClick={() => setFilter('pending')} className={`p-4 rounded-3xl border transition-all cursor-pointer ${filter === 'pending' ? 'bg-yellow-500/10 border-yellow-500/40 shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Pendentes</p>
                            <p className="text-2xl font-black text-yellow-500">{counts.pending}</p>
                        </div>
                    </div>

                    {/* Manual Add Input */}
                    <div className="flex items-center space-x-3 mb-8 bg-white/5 p-2 pr-2 pl-6 rounded-[28px] border border-white/5 focus-within:border-blue-500/50 transition-all">
                        <Mail className="w-5 h-5 text-slate-500" />
                        <input 
                            type="email" 
                            placeholder="Adicionar novo e-mail..."
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddManual()}
                            className="flex-1 bg-transparent border-none outline-none text-white text-sm font-bold placeholder:text-slate-600 py-3"
                        />
                        <button 
                            onClick={handleAddManual}
                            disabled={isAdding}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center space-x-2 shadow-lg shadow-blue-500/20"
                        >
                            {isAdding ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            <span>Adicionar</span>
                        </button>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex p-1 bg-black/40 rounded-2xl border border-white/5 mb-6">
                        {['all', 'authorized', 'pending'].map(f => (
                            <button 
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white/10 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
                            >
                                {f === 'all' ? 'Todos' : f === 'authorized' ? 'Aprovados' : 'Pendentes'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
                    {loading ? (
                        <div className="text-center py-20">
                            <RefreshCw className="w-8 h-8 text-blue-500/50 animate-spin mx-auto mb-4" />
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Sincronizando Banco...</p>
                        </div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="text-center py-20 bg-white/5 border border-white/10 rounded-[32px]">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nenhum usuário nesta categoria.</p>
                        </div>
                    ) : (
                        filteredUsers.map((u, i) => (
                            <div key={u.email} className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-[28px] hover:bg-white/[0.08] transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center space-x-4">
                                    <div className={`w-3 h-3 rounded-full ${u.status === 'authorized' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-yellow-500 animate-pulse'}`}></div>
                                    <div>
                                        <p className="text-white font-black uppercase tracking-widest text-sm leading-none mb-1.5">{u.email}</p>
                                        <div className="flex items-center space-x-2">
                                            <p className={`text-[8px] font-black uppercase tracking-widest ${u.status === 'authorized' ? 'text-green-500' : 'text-yellow-500'}`}>{u.status}</p>
                                            {u.created_at && <span className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">• {new Date(u.created_at).toLocaleDateString()}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {u.status === 'authorized' ? (
                                        <button 
                                            onClick={() => handleDeauthorize(u.email)}
                                            title="Revogar Acesso"
                                            className="p-3 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-xl transition-all border border-yellow-500/10 active:scale-95"
                                        >
                                            <Minus className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleAuthorize(u.email)}
                                            className="px-5 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center space-x-2"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>Aprovar</span>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(u.email)}
                                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/10 active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

// -------------------------------------------------------------------
// IMPORT MODAL COMPONENT (Internal View)
// -------------------------------------------------------------------
const ImportModal = ({ data, onImport, onClose }) => {
    if (!data) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in duration-300" />
            <div className="relative w-full max-w-2xl bg-[#16161D] border border-white/10 rounded-[50px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
                <div className="p-12">
                    <div className="flex items-center space-x-6 mb-10">
                        <div className="w-20 h-20 bg-orange-500/20 rounded-[30px] border border-orange-500/30 flex items-center justify-center">
                            <Download className="w-10 h-10 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-white italic uppercase tracking-tighter">Importar Lista</h3>
                            <p className="text-sm font-bold text-orange-500 uppercase tracking-[0.3em] mt-1">{data.name}</p>
                        </div>
                    </div>

                    <p className="text-slate-400 text-lg font-medium mb-8 leading-relaxed">
                        Você recebeu um repertório compartilhado contendo <span className="text-white font-black">{data.songs?.length} músicas</span>. Deseja carregar agora e salvar nos seus favoritos?
                    </p>

                    <div className="max-h-60 overflow-y-auto pr-4 mb-10 scrollbar-thin scrollbar-thumb-white/10">
                        {data.songs?.map((s, i) => (
                            <div key={i} className="flex items-center justify-between py-4 border-b border-white/5 last:border-0 hover:bg-white/5 px-4 rounded-2xl transition-all">
                                <div>
                                    <p className="text-white font-black uppercase italic tracking-tight">{s.song_name}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.artist_name}</p>
                                </div>
                                <span className="text-xs font-black text-[#B87333] bg-[#B87333]/10 px-3 py-1 rounded-full uppercase italic">{s.song_key || 'C'}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center space-x-4">
                        <button onClick={() => onImport(data)} className="flex-1 py-6 bg-[#B87333] hover:bg-[#8B4513] text-white rounded-[24px] font-black uppercase text-sm tracking-widest shadow-xl shadow-[#B87333]/20 transition-all flex items-center justify-center space-x-3">
                            <Check className="w-5 h-5" />
                            <span>Importar Agora</span>
                        </button>
                        <button onClick={onClose} className="px-10 py-6 bg-white/5 hover:bg-white/10 text-slate-400 rounded-[24px] border border-white/10 font-black uppercase text-sm transition-all">
                            Ignorar
                        </button>
                    </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#B87333] to-transparent opacity-50"></div>
            </div>
        </div>,
        document.body
    );
};

// Safe LocalStorage Helper
const getSafeJSON = (key, defaultValue) => {
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
        console.warn(`Error parsing localStorage key "${key}":`, e);
        return defaultValue;
    }
};

function App() {
    const [authenticatedUser, setAuthenticatedUser] = useState(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [savedPlaylists, setSavedPlaylists] = useState(() => getSafeJSON('iron_chords_playlists', []));
    const [activePlaylistName, setActivePlaylistName] = useState(null);
    const [activeTab, setActiveTab] = useState('manual');
    const [isPlayerUtilMenuOpen, setIsPlayerUtilMenuOpen] = useState(false);
    const [showGlobalMenu, setShowGlobalMenu] = useState(false);
    const [playerSidebarTab, setPlayerSidebarTab] = useState('fila'); 
    const [listasSubTab, setListasSubTab] = useState('salvas');
    const [songs, setSongs] = useState([]);
    const [selectedManualIndex, setSelectedManualIndex] = useState(null);
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isTransposing, setIsTransposing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [playerSongSearch, setPlayerSongSearch] = useState('');
    const [playerSongSearchLoading, setPlayerSongSearchLoading] = useState(false);
    const [playerSongSuggestions, setPlayerSongSuggestions] = useState([]);
    const [addingSongSlug, setAddingSongSlug] = useState(null);
    const [isImmersiveMode, setIsImmersiveMode] = useState(false);
    const [showImmersiveControls, setShowImmersiveControls] = useState(false);
    const [isStageModeActive, setIsStageModeActive] = useState(false);
    const [showStageControls, setShowStageControls] = useState(false);
    const [isBlowDetectEnabled, setIsBlowDetectEnabled] = useState(false);
    const [isDynamicSpeedActive, setIsDynamicSpeedActive] = useState(false);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [queueSearchTerm, setQueueSearchTerm] = useState('');
    const [scrollSpeed, setScrollSpeed] = useState(1);
    const [playerFontSize, setPlayerFontSize] = useState(19);
    const [manualFontSize, setManualFontSize] = useState(18);
    const [printFontSize, setPrintFontSize] = useState(15);
    const [micEnabled, setMicEnabled] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [presenterSongIndex, setPresenterSongIndex] = useState(0);
    
    // Manual view / Stage view related
    const [isManualAutoScrolling, setIsManualAutoScrolling] = useState(false);
    const [manualScrollSpeed, setManualScrollSpeed] = useState(1);
    const [manualCapo, setManualCapo] = useState(0);
    const [manualPreviewSong, setManualPreviewSong] = useState(null);
    const [stagedSongs, setStagedSongs] = useState([]);
    const [isManualFullscreen, setIsManualFullscreen] = useState(false);
    
    // Pinch / UI Feedback
    const [showPinchBar, setShowPinchBar] = useState(false);
    const [pinchLiveFontSize, setPinchLiveFontSize] = useState(19);
    const [showPlayerControls, setShowPlayerControls] = useState(true);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [isManualColumns, setIsManualColumns] = useState(false);
    const [showBottomToolsDrawer, setShowBottomToolsDrawer] = useState(false);

    // Derived State
    const currentSong = songs[selectedManualIndex] || null;

    // Refs
    const sharedAudioStreamRef = useRef(null);
    const audioTrackerRef = useRef(null);
    const syncLineByTextRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const manualScrollContainerRef = useRef(null);
    const currentLineIndexRef = useRef(0);
    const recognitionRef = useRef(null);
    const blowDetectRef = useRef(null);
    const wakeLockRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const playerSearchDebounceRef = useRef(null);
    const lastManualScrollTime = useRef(0);
    const wasInPlayerRef = useRef(false);
    const immersiveHideTimerRef = useRef(null);
    const stageControlsTimerRef = useRef(null);
    const playerControlsTimerRef = useRef(null);
    const pinchBarTimerRef = useRef(null);
    const driftHistoryRef = useRef([]);
    const lastBpmAdjustTimeRef = useRef(Date.now());
    const lastVoiceMatchedIndexRef = useRef(0);
    const silenceTimerRef = useRef(null);
    const lastVoiceTimeRef = useRef(Date.now());
    const lastJumpRef = useRef(0);
    const lastMatchTimeRef = useRef(Date.now());
    const micLevelRef = useRef(0);
    const advanceTimerRef = useRef(null);
    const isPausedBySilenceRef = useRef(false);

    // Version
    const APP_VERSION = '1.0.3';

    // Auto-Fit Font Size Logic
    const handleAutoFitFontSize = useCallback(() => {
        const isPlayerActive = isFullScreenPlayer || activeTab === 'player' || isManualFullscreen;
        // Don't auto-fit if we're not actually looking at a song view
        if (!isPlayerActive && activeTab !== 'manual') return;

        const container = isPlayerActive ? scrollContainerRef.current : manualScrollContainerRef.current;
        if (!container) return;
        
        const songToMeasure = isPlayerActive ? currentSong : manualPreviewSong;
        if (!songToMeasure || !songToMeasure.content) return;

        // Bypassing React DOM timing completely: Calculate by string length
        const lines = songToMeasure.content.split('\n');
        let maxChars = 0;
        // Sample up to 100 lines
        for (let i = 0; i < Math.min(lines.length, 100); i++) {
            const len = lines[i].replace(/\r/g, '').length;
            if (len > maxChars) maxChars = len;
        }

        if (maxChars === 0) return;

        const containerWidth = container.getBoundingClientRect().width;
        if (containerWidth === 0) return; // Hidden container

        const padding = 60; 
        const availableWidth = containerWidth - padding;

        if (availableWidth > 0) {
            // An average monospace character width is roughly 60% of its font-size.
            // newFs = availableWidth / (maxChars * 0.60)
            let newFs = availableWidth / (maxChars * 0.60);
            
            // Bounds
            const MIN_FONT_SIZE = 11;
            const MAX_FONT_SIZE = 22;
            newFs = Math.max(MIN_FONT_SIZE, Math.min(newFs, MAX_FONT_SIZE));

            const currentDocFs = isPlayerActive ? playerFontSize : manualFontSize;

            if (Math.abs(newFs - currentDocFs) > 0.5) {
                const roundedFs = Math.round(newFs * 10) / 10;
                if (isPlayerActive) {
                    setPlayerFontSize(roundedFs);
                } else {
                    setManualFontSize(roundedFs);
                }
                setPinchLiveFontSize(roundedFs);
                
                // Force CSS update
                container.style.setProperty('--dynamic-zoom-fs', `${roundedFs}px`);
                container.style.fontSize = `${roundedFs}px`;
            }
        }
    }, [playerFontSize, manualFontSize, activeTab, isFullScreenPlayer, isManualFullscreen, currentSong?.content, manualPreviewSong?.content]);

    // Trigger Auto-Fit
    useEffect(() => {
        // Wait a tiny bit for the layout to settle after state changes
        const timer = setTimeout(() => {
            handleAutoFitFontSize();
        }, 150);
        
        return () => clearTimeout(timer);
    }, [
        songs[selectedManualIndex]?.id,
        manualPreviewSong?.song_name, 
        activeTab,
        isFullScreenPlayer,
        isManualFullscreen
    ]);

    // Re-run on window resize
    useEffect(() => {
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(handleAutoFitFontSize, 300);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            clearTimeout(resizeTimer);
            window.removeEventListener('resize', handleResize);
        };
    }, [handleAutoFitFontSize]);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallPWA = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const savedEmail = localStorage.getItem('ironchords_user_email');
            if (savedEmail) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout
                
                try {
                    const res = await fetch(`${API_BASE_URL}/api/auth/status/${savedEmail}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    
                    if (!res.ok) throw new Error("Server error");
                    const data = await res.json();
                    if (data.status === 'authorized') {
                        setAuthenticatedUser(savedEmail);
                        syncCloudPlaylists(savedEmail);
                    } else {
                        localStorage.removeItem('ironchords_user_email');
                    }
                } catch (err) {
                    console.error("Auth check failed or timed out:", err);
                    // On error/timeout, we allow entrance if we have local data 
                    // or force login if needed. For now, keep state to allow offline.
                }
            }
            setIsAuthenticating(false);
        };
        checkAuth();
    }, []);

    const syncCloudPlaylists = async (email) => {
        if (!email) return;
        const normalized = normalize_google_email(email);
        try {
            const res = await fetch(`${API_BASE_URL}/api/playlists/${normalized}`);
            const data = await res.json();
            if (data.playlists) {
                const cloudPlaylists = data.playlists.map(p => ({
                    id: p.id,
                    name: p.name,
                    songs: JSON.parse(p.data)
                }));
                const local = getSafeJSON('iron_chords_playlists', []);
                
                // Merge strategy: cloud takes precedence for same name, but keep local-only ones
                const merged = [...cloudPlaylists];
                local.forEach(lp => {
                    if (!merged.some(cp => cp.name === lp.name)) {
                        merged.push(lp);
                        // Also upload this local-only list to cloud for backup
                        saveCloudPlaylist(normalized, lp.name, lp.songs);
                    }
                });
                
                localStorage.setItem('iron_chords_playlists', JSON.stringify(merged));
                setSavedPlaylists(merged);
            }
        } catch (err) {
            console.error("Cloud sync failed:", err);
        }
    };

    const saveCloudPlaylist = async (email, name, songsData) => {
        if (!email) return;
        const normalized = normalize_google_email(email);
        try {
            await fetch(`${API_BASE_URL}/api/playlists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: normalized, name, data: songsData })
            });
        } catch (err) {
            console.error("Save to cloud failed:", err);
        }
    };

    const deleteCloudPlaylist = async (email, name) => {
        if (!email) return;
        const normalized = normalize_google_email(email);
        try {
            await fetch(`${API_BASE_URL}/api/playlists/${normalized}/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
        } catch (err) {
            console.error("Delete from cloud failed:", err);
        }
    };




    // Stage Mode (Modo Palco) — distraction-free display

    // Wake Lock
    const [blowFlash, setBlowFlash] = useState(false);

    // Face Tracking
    const [isBlinkDetectEnabled, setIsBlinkDetectEnabled] = useState(false);
    const faceTrackerRef = useRef(null);
    const [faceTrackerStatus, setFaceTrackerStatus] = useState('inativo');

    const getSharedMicStream = async () => {
        if (sharedAudioStreamRef.current && sharedAudioStreamRef.current.active) return sharedAudioStreamRef.current;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
            });
            sharedAudioStreamRef.current = stream;
            return stream;
        } catch (e) {
            console.warn("[MediaStream] Mic denied:", e);
            throw e;
        }
    };

    const releaseSharedMicStream = (force = false) => {
        // Only release if BOTH features are disabled
        if (force || (!isDynamicSpeedActive && !isBlowDetectEnabled)) {
            if (sharedAudioStreamRef.current) {
                sharedAudioStreamRef.current.getTracks().forEach(t => t.stop());
                sharedAudioStreamRef.current = null;
            }
        }
    };

    useEffect(() => {
        const preventNativeZoom = (e) => {
            if (e.touches && e.touches.length > 1) {
                if (e.cancelable) e.preventDefault();
            }
        };
        // Add as non-passive to reliably block browser zoom
        document.addEventListener('touchstart', preventNativeZoom, { passive: false });
        document.addEventListener('touchmove', preventNativeZoom, { passive: false });
        return () => {
            document.removeEventListener('touchstart', preventNativeZoom);
            document.removeEventListener('touchmove', preventNativeZoom);
        };
    }, []);
    // Pinch Font Size Bar

    const handlePinchActive = useCallback((active) => {
        if (active) {
            setShowPinchBar(true);
            // Initialize live font size with current state
            setPinchLiveFontSize(playerFontSize); 
            if (pinchBarTimerRef.current) clearTimeout(pinchBarTimerRef.current);
        } else {
            if (pinchBarTimerRef.current) clearTimeout(pinchBarTimerRef.current);
            pinchBarTimerRef.current = setTimeout(() => setShowPinchBar(false), 3000);
        }
    }, [playerFontSize]);
    // Enhanced Save Modal (Feature 3)
    const [saveMode, setSaveMode] = useState('new'); // 'new' | 'append'
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const [forgeMessage, setForgeMessage] = useState("Forjando conteúdo...");
    const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [mainNav, setMainNav] = useState('player');
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportStep, setExportStep] = useState(1);
    const [currentExportList, setCurrentExportList] = useState(null);
    // Settings
    const [exportFormat, setExportFormat] = useState('docx');
    const [sortOrder, setSortOrder] = useState('queue');
    const [coverImage, setCoverImage] = useState(null);
    const [includeToc, setIncludeToc] = useState(true);
    const [includeDictionary, setIncludeDictionary] = useState(true);
    const coverInputRef = useRef(null);

    // Manual Form State
    const [songName, setSongName] = useState('');
    const [artistName, setArtistName] = useState('');
    const [songKey, setSongKey] = useState('C');
    const [songVersion, setSongVersion] = useState('Principal');
    const [includeTabs, setIncludeTabs] = useState(true);
    const [manualLoading, setManualLoading] = useState(false);
    const [manualError, setManualError] = useState('');

    // Pitch Gauge & Auto Transpose States
    const [detectedCents, setDetectedCents] = useState(0);
    const [detectedPitch, setDetectedPitch] = useState(0);
    const [isAutoPitchEnabled, setIsAutoPitchEnabled] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [availableVersions, setAvailableVersions] = useState([{ name: 'Principal', key: 'Principal' }]);




    const [chordDiagramOverlay, setChordDiagramOverlay] = useState(null);
    const [chordTooltip, setChordTooltip] = useState(null); // { chord, anchor }
    // Modern Mobile Bottom Bar Drawer


    // Batch Form State
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchError, setBatchError] = useState('');
    const fileInputRef = useRef(null);

    // Batch Mapping State
    const [batchRawData, setBatchRawData] = useState([]);
    const [batchHeaders, setBatchHeaders] = useState([]);
    const [batchMapping, setBatchMapping] = useState({ song_name: '', artist_name: '', key: '', capo: '' });
    const [showMappingUI, setShowMappingUI] = useState(false);
    const [batchResults, setBatchResults] = useState([]);
    const [showBatchReview, setShowBatchReview] = useState(false);
    const [batchFixData, setBatchFixData] = useState(null);
    const [editQueueSong, setEditQueueSong] = useState(null); // { idx, song_name, artist_name, song_key, capo, include_tabs, content }
    const [batchFixSuggestions, setBatchFixSuggestions] = useState([]);
    const [showBatchFixSuggestions, setShowBatchFixSuggestions] = useState(false);
    // Cache: pre-fetched suggestion data keyed by "song||artist" for instant access
    const batchSuggestionsCacheRef = useRef({});

    // Acervo State
    const [acervo, setAcervo] = useState([]);
    const [acervoLoading, setAcervoLoading] = useState(false);
    const [acervoSearchTerm, setAcervoSearchTerm] = useState('');
    const [conflictData, setConflictData] = useState(null); // { newSong, existingSong, onConfirm }
    const [conflictQueue, setConflictQueue] = useState([]);
    const [selectedAcervoItems, setSelectedAcervoItems] = useState([]);
    const [batchLinkLoading, setBatchLinkLoading] = useState(false);

    // Lists Management State
    const [listSearchTerm, setListSearchTerm] = useState('');
    const [selectedLists, setSelectedLists] = useState([]);
    const [editingList, setEditingList] = useState(null); // { id, name, songs }
    const [editListName, setEditListName] = useState('');
    const [expandedListSongIdx, setExpandedListSongIdx] = useState(null);
    const [selectedListSongs, setSelectedListSongs] = useState([]);

    // Filter Suggestions State
    const [editingChord, setEditingChord] = useState(null);
    const [editFormData, setEditFormData] = useState({ song_name: '', artist_name: '', song_key: '', content: '', capo: 0, include_tabs: true });

    // Batch Fix Suggestions Effect
    useEffect(() => {
        const query = batchFixData?.song_name;
        if (!query || query.length < 2) {
            setBatchFixSuggestions([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/search/suggestions?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                let results = data.suggestions || [];
                results = results.filter(s =>
                    s && s.song && s.artist &&
                    !s.song.toLowerCase().includes('agape') &&
                    !s.artist.toLowerCase().includes('agape')
                );
                setBatchFixSuggestions(results);
            } catch (err) { console.error(err); }
        }, 250);
        return () => clearTimeout(delayDebounceFn);
    }, [batchFixData?.song_name]);

    // Presentation Mode State
    // Save List State
    const [saveListModalOpen, setSaveListModalOpen] = useState(false);
    const [saveListName, setSaveListName] = useState('');
    const [saveListMode, setSaveListMode] = useState('new'); // 'new' | 'existing'
    const [selectedListsToAddTo, setSelectedListsToAddTo] = useState([]);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [showSaveConflict, setShowSaveConflict] = useState(false);

    // Batch Modal State
    const [batchModalOpen, setBatchModalOpen] = useState(false);


    // Share & Import State
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [shareLoading, setShareLoading] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [importData, setImportData] = useState(null); // { name, songs }

    // Deletion Modal State
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState({ type: '', id: null, name: '' });

    // Player Versions State
    const [currentPlayerVersions, setCurrentPlayerVersions] = useState([]);
    const [isPlayerVersionsOpen, setIsPlayerVersionsOpen] = useState(false);
    const [playerVersionLoading, setPlayerVersionLoading] = useState(false);

    const saveOneChordToAcervo = async (song, force = false) => {
        // Prepare song data
        const songToSave = {
            song_name: song.song_name,
            artist_name: song.artist_name,
            song_key: song.original_key || song.song_key || 'C',
            content: (song.original_key && song._orig_content && song.original_key !== (song.sounding_key || song.song_key)) ? song._orig_content : (song.content || ''),
            capo: song.capo || 0,
            include_tabs: song.include_tabs !== undefined ? song.include_tabs : true
        };

        if (!force) {
            // Check for conflict
            try {
                const res = await fetch(`${API_BASE_URL}/api/chords/check?name=${encodeURIComponent(songToSave.song_name)}`);
                const data = await res.json();
                if (data.exists) {
                    return { conflict: true, existing: data.chord, newSong: songToSave };
                }
            } catch (err) { console.error("Erro ao verificar conflito:", err); }
        }

        // No conflict or forced, save it
        try {
            await fetch(`${API_BASE_URL}/api/chords`, {
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
        const songsToSave = batchModalOpen && showBatchReview
            ? batchResults.filter(r => r.status === 'success' || r.status === 'saved' || r.status === 'pending')
            : songs;

        if (!saveListName.trim() || songsToSave.length === 0) return;

        // 1. Save to Local Storage
        const listToSave = {
            id: Date.now(),
            name: saveListName,
            songs: songsToSave.map(s => ({
                id: s.id || null,
                song_name: s.song_name,
                artist_name: s.artist_name,
                song_key: s.sounding_key || s.requested_key || s.song_key,
                sounding_key: s.sounding_key || s.requested_key || s.song_key,
                original_key: s.original_key || s.song_key || 'C',
                capo: s.capo || 0,
                include_tabs: s.include_tabs !== undefined ? s.include_tabs : true,
                content: s.content || ''
            }))
        };
        const playlists = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
        const updatedPlaylists = [...playlists, listToSave];
        localStorage.setItem('iron_chords_playlists', JSON.stringify(updatedPlaylists));

        // 1.5 Save to Cloud (Backup)
        if (authenticatedUser) {
            saveCloudPlaylist(authenticatedUser, listToSave.name, listToSave.songs);
        }

        // 2. Save to Acervo (DB) with conflict check
        const conflictsFound = [];
        for (const song of songsToSave) {
            const result = await saveOneChordToAcervo(song);
            if (result.conflict) {
                conflictsFound.push({ newSong: result.newSong, existing: result.existing });
            }
        }

        setSaveListModalOpen(false);
        setSaveListName('');
        setSavedPlaylists(updatedPlaylists);
        setShowSaveSuccess(true);
        if (batchModalOpen) {
            setBatchModalOpen(false);
            setShowBatchReview(false);
            setBatchResults([]);
        }
        setTimeout(() => setShowSaveSuccess(false), 2000);

        if (conflictsFound.length > 0) {
            setConflictQueue(conflictsFound);
            processConflictQueue(conflictsFound);
        }
    };

    const handleAddToExistingLists = () => {
        const songsToSave = batchModalOpen && showBatchReview
            ? batchResults.filter(r => r.status === 'success' || r.status === 'saved' || r.status === 'pending')
            : songs;
        if (selectedListsToAddTo.length === 0 || songsToSave.length === 0) return;

        const allPlaylists = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
        const newSongsData = songsToSave.map(s => ({
            id: s.id || null,
            song_name: s.song_name,
            artist_name: s.artist_name,
            song_key: s.sounding_key || s.requested_key || s.song_key,
            sounding_key: s.sounding_key || s.requested_key || s.song_key,
            original_key: s.original_key || s.song_key || 'C',
            capo: s.capo || 0,
            include_tabs: s.include_tabs !== undefined ? s.include_tabs : true,
            content: s.content || ''
        }));

        const updated = allPlaylists.map(pl => {
            if (selectedListsToAddTo.includes(pl.id)) {
                // Replace existing songs with same name, append brand-new ones
                const newByName = new Map(newSongsData.map(s => [s.song_name.toLowerCase(), s]));
                const merged = pl.songs.map(existing => {
                    const replacement = newByName.get(existing.song_name.toLowerCase());
                    if (replacement) { newByName.delete(existing.song_name.toLowerCase()); return replacement; }
                    return existing;
                });
                // Append songs not already in the list
                const brandNew = Array.from(newByName.values());
                const updatedPlaylist = { ...pl, songs: [...merged, ...brandNew] };

                // Cloud backup for updated playlist
                if (authenticatedUser) {
                    saveCloudPlaylist(authenticatedUser, updatedPlaylist.name, updatedPlaylist.songs);
                }
                return updatedPlaylist;
            }
            return pl;
        });
        localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
        setSavedPlaylists(updated);
        localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
        setSavedPlaylists(updated);
        setSaveListModalOpen(false);
        setSelectedListsToAddTo([]);
        setShowSaveSuccess(true);
        if (batchModalOpen) {
            setBatchModalOpen(false);
            setShowBatchReview(false);
            setBatchResults([]);
        }
        setTimeout(() => setShowSaveSuccess(false), 2000);
    };

    const [songForPrint, setSongForPrint] = useState(null);

    useEffect(() => {
        if (songForPrint) {
            // Ensure DOM has painted the portal before printing
            const t = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(t);
        }
    }, [songForPrint]);

    const handlePrint = (songOverride = null) => {
        const songToPrint = songOverride || manualPreviewSong || currentSong;
        if (!songToPrint) {
            window.print();
            return;
        }
        
        if (Array.isArray(songToPrint)) {
            // Batch print mode
            setSongForPrint({ isBatch: true, songs: songToPrint, _printTimestamp: Date.now() });
        } else {
            // Single song print mode
            setSongForPrint({ ...songToPrint, _printTimestamp: Date.now() });
        }
    };

    const [bpm, setBpm] = useState(80);
    const [isRhythmicMode, setIsRhythmicMode] = useState(true);
    const [isAnchored, setIsAnchored] = useState(false);
    const [isWaitingForVoice, setIsWaitingForVoice] = useState(false);
    const [isPausedBySilence, setIsPausedBySilence] = useState(false);
    const [micGain, setMicGain] = useState(2.0);
    const [fsmState, setFsmState] = useState({ state: 'AGUARDANDO', action: 'freeze' });
    const [connectionStatus, setConnectionStatus] = useState('offline');
    const [lastVoiceMatchedIndex, setLastVoiceMatchedIndex] = useState(0);

    const isBpmSyncing = micEnabled && isRhythmicMode && fsmState.state === 'SINCRONIZANDO';
    const [currentStep, setCurrentStep] = useState(1);

    // Playlists Persistence

    // Auto-Save Effect for Active Playlist
    useEffect(() => {
        // Only auto-save if an explicit list is active and has songs
        if (!activePlaylistName || activePlaylistName === "Nova Cifra/Lista" || !songs || songs.length === 0) return;
        
        const debounceSave = setTimeout(() => {
            persistSongsToPlaylist(songs, activePlaylistName);
        }, 1200); // Slightly longer debounce for extra safety during transitions

        return () => clearTimeout(debounceSave);
    }, [songs, activePlaylistName, authenticatedUser]);
    const [playlistNameInput, setPlaylistNameInput] = useState('');
    const [showPlaylistManager, setShowPlaylistManager] = useState(false);

    const [transcriptRaw, setTranscriptRaw] = useState('');
    const [detectedNote, setDetectedNote] = useState(null);
    const [singerKey, setSingerKey] = useState(null);
    const noteHistogramRef = useRef({});
    const noteTimestampsRef = useRef([]);// Rolling window of {note, time}

    // KEY ANALYZER: Accumulate notes over time to determine singer's key
    useEffect(() => {
        if (!detectedNote || !isDynamicSpeedActive) return;
        const now = Date.now();
        // Add to rolling window
        noteTimestampsRef.current.push({ note: detectedNote, time: now });
        // Prune entries older than 10 seconds
        noteTimestampsRef.current = noteTimestampsRef.current.filter(e => now - e.time < 10000);
        // Build histogram from recent notes
        const histogram = {};
        for (const entry of noteTimestampsRef.current) {
            histogram[entry.note] = (histogram[entry.note] || 0) + 1;
        }
        noteHistogramRef.current = histogram;
        // Find the most common note (the likely key)
        let maxCount = 0;
        let dominantNote = null;
        for (const [note, count] of Object.entries(histogram)) {
            if (count > maxCount) {
                maxCount = count;
                dominantNote = note;
            }
        }
        // Only update if we have enough samples (at least 10 detections)
        if (noteTimestampsRef.current.length >= 10 && dominantNote) {
            setSingerKey(dominantNote);
        }
    }, [detectedNote, isDynamicSpeedActive]);

    // Extract song's key from the first chord in the content
    const getSongKey = (song) => {
        if (!song || !song.content) return null;
        const lines = song.content.split('\n');
        for (const line of lines) {
            if (isChordOnlyLine(line)) {
                const match = line.match(/\b([A-G][#b]?)(m|M|maj|min|dim|aug|sus|7|9)?\b/);
                if (match) return match[1];
            }
        }
        // Fallback: look in the song's key field if available
        return song.key || null;
    };

    useEffect(() => { isPausedBySilenceRef.current = isPausedBySilence; }, [isPausedBySilence]);

    // URL-Based Import Check (Short Links & Legacy B64)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const importDataB64 = urlParams.get('import');
        const shareSlug = urlParams.get('s');

        if (shareSlug) {
            // Handle shortened slug link from backend
            const fetchSharedList = async () => {
                try {
                    const res = await fetch(`${API_BASE_URL}/api/share/${shareSlug}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data && data.songs) {
                            setImportData(data);
                        }
                    }
                } catch (err) {
                    console.error("Erro ao buscar lista compartilhada via slug:", err);
                }
            };
            fetchSharedList();
            // Clear URL param without refreshing
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (importDataB64) {
            try {
                // Handle Legacy Base64 with UTF-8 support properly
                const decodedStr = decodeURIComponent(escape(atob(importDataB64)));
                const decoded = JSON.parse(decodedStr);
                if (decoded && decoded.songs) {
                    setImportData(decoded);
                }
                // Clear URL param without refreshing
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (err) {
                console.error("Erro ao importar lista do link Base64:", err);
            }
        }
    }, []);

    // Apply Pinch-to-Zoom Hook — pass enabled flag so the effect re-runs when the player opens
    // (the scroll container element only exists once the player renders)
    // Expanded to include Acervo and Manual tabs for the manualScrollContainerRef
    const isPinchPlayerActive = isFullScreenPlayer || mainNav === 'player' || mainNav === 'acervo' || mainNav === 'manual' || !!manualPreviewSong;
    
    // isStageModeActive and currentSong?.song_name are keys that switch the element for scrollContainerRef
    usePinchZoom(scrollContainerRef, playerFontSize, setPlayerFontSize, 12, 60, handlePinchActive, setPinchLiveFontSize, isPinchPlayerActive, `${isStageModeActive}-${currentSong?.song_name}`);
    
    // isManualFullscreen and manualPreviewSong?.song_name are the triggers for manualScrollContainerRef
    usePinchZoom(manualScrollContainerRef, manualFontSize, setManualFontSize, 12, 60, handlePinchActive, setPinchLiveFontSize, isPinchPlayerActive, `${isManualFullscreen}-${manualPreviewSong?.song_name}`);



    // AutoScroll Effect with Mic interaction (Manual / Player / Presentation)
    useEffect(() => {
        let interval;

        const isPlayerViewActive = activeTab === 'presentation' || activeTab === 'player' || isFullScreenPlayer || mainNav === 'player';
        const isManualViewActive = activeTab === 'manual' && isManualAutoScrolling && manualScrollContainerRef.current;

        if (isPlayerViewActive && (isAutoScrolling || isDynamicSpeedActive) && scrollContainerRef.current) {
            interval = setInterval(() => {
                if (Date.now() - lastManualScrollTime.current < 2500) return; // IA/Auto Sync pauses for 2.5s on manual scroll

                if (isDynamicSpeedActive && micEnabled) {
                    // IA SYNC: Voice drives position, volume drives speed
                    // Scroll TOWARD the voice-matched currentLineIndex
                    const currentEl = scrollContainerRef.current.querySelector(
                        `[data-line-index="${currentLineIndexRef.current}"]`
                    );
                    if (currentEl) {
                        const containerRect = scrollContainerRef.current.getBoundingClientRect();
                        const elRect = currentEl.getBoundingClientRect();
                        // Target: keep current line at ~30% from top
                        const targetY = containerRect.top + containerRect.height * 0.30;
                        const diff = elRect.top - targetY;

                        if (Math.abs(diff) > 5) {
                            // Scroll toward the target, speed proportional to micLevel
                            const level = micLevelRef.current || 0;
                            const speed = Math.max(0.5, 0.5 + level * 0.04);
                            // Move toward target: positive diff = need to scroll down, negative = up
                            const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * scrollSpeed);
                            scrollContainerRef.current.scrollTop += step;
                        }
                    } else {
                        // Fallback: simple volume-driven scroll
                        const level = micLevelRef.current || 0;
                        const increment = Math.min(scrollSpeed * 3, (scrollSpeed * 0.5) + (level * 0.06));
                        scrollContainerRef.current.scrollTop += increment;
                    }
                } else {
                    const threshold = 5;
                    const shouldScroll = !micEnabled || micLevel > threshold;
                    if (shouldScroll) {
                        scrollContainerRef.current.scrollTop += scrollSpeed;
                    }
                }
            }, 50);
        } else if (isManualViewActive) {
            interval = setInterval(() => {
                if (Date.now() - lastManualScrollTime.current < 2500) return;
                manualScrollContainerRef.current.scrollTop += manualScrollSpeed;
            }, 50);
        }
        return () => clearInterval(interval);
    }, [activeTab, isFullScreenPlayer, mainNav, isAutoScrolling, scrollSpeed, micEnabled, micLevel, isManualAutoScrolling, manualScrollSpeed, isDynamicSpeedActive]);

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

    // === WAKE LOCK: Keep screen alive in player mode ===
    useEffect(() => {
        const isInPlayerView = isFullScreenPlayer || mainNav === 'player';
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator && isInPlayerView) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                }
            } catch (err) {
                console.warn('[WakeLock] Not supported or denied:', err.message);
            }
        };
        const releaseWakeLock = async () => {
            if (wakeLockRef.current) { await wakeLockRef.current.release(); wakeLockRef.current = null; }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isInPlayerView) requestWakeLock();
        };
        if (isInPlayerView) {
            requestWakeLock();
            document.addEventListener('visibilitychange', handleVisibilityChange);
        } else { releaseWakeLock(); }
        return () => { releaseWakeLock(); document.removeEventListener('visibilitychange', handleVisibilityChange); };
    }, [isFullScreenPlayer, mainNav]);

    // === KEYBOARD / BLUETOOTH PEDAL PAGE SCROLL ===
    useEffect(() => {
        const isInPlayerView = isFullScreenPlayer || mainNav === 'player';
        if (!isInPlayerView) return;
        const scrollPage = (dir) => {
            const container = scrollContainerRef.current;
            if (!container) return;
            lastManualScrollTime.current = 0;
            container.scrollBy({ top: dir * container.clientHeight * 0.85, behavior: 'smooth' });
        };
        const handleKeyDown = (e) => {
            if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
            if ([' ','ArrowDown','ArrowRight','PageDown'].includes(e.key)) { e.preventDefault(); scrollPage(1); }
            else if (['ArrowUp','ArrowLeft','PageUp'].includes(e.key)) { e.preventDefault(); scrollPage(-1); }
            else if (e.key === 'Home') { e.preventDefault(); scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullScreenPlayer, mainNav]);

    // === STAGE MODE: Auto-hide overlay buttons after 2.5s ===
    useEffect(() => {
        if (!isStageModeActive) { setShowStageControls(false); return; }
        const showBriefly = () => {
            setShowStageControls(true);
            if (stageControlsTimerRef.current) clearTimeout(stageControlsTimerRef.current);
            stageControlsTimerRef.current = setTimeout(() => setShowStageControls(false), 2500);
        };
        window.addEventListener('touchstart', showBriefly, { passive: true });
        window.addEventListener('mousedown', showBriefly);
        showBriefly();
        return () => {
            window.removeEventListener('touchstart', showBriefly);
            window.removeEventListener('mousedown', showBriefly);
            if (stageControlsTimerRef.current) clearTimeout(stageControlsTimerRef.current);
        };
    }, [isStageModeActive]);

    // === BLOW DETECTION: Sustained mic puff advances a page ===
    // === BLOW DETECTION: Unification Logic ===
    // (Actual logic moved to AudioTracker.js. Action handled via startAudioTracker callback)
    const handleBlowAction = useCallback((force = false) => {
        if (!isBlowDetectEnabledRef.current && !force) return;
        
        const cPlayer = scrollContainerRef.current;
        const cManual = manualScrollContainerRef.current;
        lastManualScrollTime.current = 0;
        
        // Scroll by 65% of the screen height. 
        const scrollAmount = window.innerHeight * 0.65;

        if (cPlayer) cPlayer.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        if (cManual) cManual.scrollBy({ top: scrollAmount, behavior: 'smooth' });
        
        try {
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            document.documentElement.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            document.body.scrollBy({ top: scrollAmount, behavior: 'smooth' });
            
            setBlowFlash(true);
            setTimeout(() => setBlowFlash(false), 300);
        } catch(e) {}
    }, []);

    const isBlowDetectEnabledRef = useRef(isBlowDetectEnabled);
    useEffect(() => {
        isBlowDetectEnabledRef.current = isBlowDetectEnabled;
        // If sopsro enabled but tracker not running, start it
        if (isBlowDetectEnabled && !micEnabled) {
            startAudioTracker();
        } else if (!isBlowDetectEnabled && !isDynamicSpeedActive && micEnabled) {
            // Only stop if both are off
            stopAudioTracker();
        }
    }, [isBlowDetectEnabled]);

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

    // Auto-track current line based on scroll position in the player (strictly sequential)
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handlePlayerScroll = () => {
            // When IA Sync is active, voice recognition drives the line — do NOT interfere
            if (isDynamicSpeedActive) return;

            const song = songs[selectedManualIndex];
            if (!song) return;
            const allLines = (song.content || '').split('\n');
            const currentIdx = currentLineIndexRef.current;

            // Find the DOM element for the current highlighted line
            const currentEl = container.querySelector(`[data-line-index="${currentIdx}"]`);
            if (!currentEl) return;

            const containerRect = container.getBoundingClientRect();
            const currentRect = currentEl.getBoundingClientRect();

            // Reading zone: only advance when the current line scrolls above the top 15%
            // This keeps the line highlighted much longer before switching
            const readingZoneBottom = containerRect.top + containerRect.height * 0.15;

            if (currentRect.bottom < readingZoneBottom) {
                // Current line has scrolled past the reading zone → find next vocal line
                let nextIdx = currentIdx + 1;
                while (nextIdx < allLines.length) {
                    const line = allLines[nextIdx] || '';
                    if (!line.trim() || isTablatureLine(line)) {
                        nextIdx++;
                        continue;
                    }
                    if (isChordOnlyLine(line)) {
                        // Check if this chord has a lyric pair below
                        let lyricIdx = nextIdx + 1;
                        while (lyricIdx < allLines.length && (!allLines[lyricIdx].trim() || isTablatureLine(allLines[lyricIdx]))) lyricIdx++;
                        const lyricLine = allLines[lyricIdx] || '';
                        if (lyricLine.trim() && !isChordOnlyLine(lyricLine)) {
                            // It's a chord+lyric pair → highlight the lyric
                            nextIdx = lyricIdx;
                            break;
                        } else {
                            // Instrumental chord, skip
                            nextIdx++;
                            continue;
                        }
                    }
                    // It's a lyric line → use it
                    break;
                }

                if (nextIdx < allLines.length && nextIdx !== currentIdx) {
                    setCurrentLineIndex(nextIdx);
                    currentLineIndexRef.current = nextIdx;
                }
            }

            // Allow backward navigation (user scrolls up manually)
            const lineEls = container.querySelectorAll('[data-line-index]');
            if (lineEls.length > 0 && currentRect.top > readingZoneBottom + 100) {
                // Current line is way below the reading zone — user scrolled up
                // Find which line is at the reading zone now
                let closestIdx = currentIdx;
                let closestDist = Infinity;
                lineEls.forEach(el => {
                    const rect = el.getBoundingClientRect();
                    const dist = Math.abs(rect.top + rect.height / 2 - readingZoneBottom);
                    const idx = parseInt(el.getAttribute('data-line-index'), 10);
                    if (dist < closestDist && idx < currentIdx) {
                        closestDist = dist;
                        closestIdx = idx;
                    }
                });
                if (closestIdx < currentIdx) {
                    setCurrentLineIndex(closestIdx);
                    currentLineIndexRef.current = closestIdx;
                }
            }
        };

        container.addEventListener('scroll', handlePlayerScroll, { passive: true });
        return () => container.removeEventListener('scroll', handlePlayerScroll);
    }, [songs, selectedManualIndex, mainNav, activeTab, isFullScreenPlayer, isDynamicSpeedActive]);

    // (IA Sync speed is now handled directly in the auto-scroll interval above — no separate useEffect needed)


    // Mic Level & Frequency Listener
    // Mic Level & Frequency Listener

    useEffect(() => {
        if (audioTrackerRef.current) {
            audioTrackerRef.current.setGain(micGain);
        }
    }, [micGain]);

    const startAudioTracker = async () => {
        try {
            const stream = await getSharedMicStream();
            if (!audioTrackerRef.current) {
                audioTrackerRef.current = new AudioTracker(
                    (detectedBpm) => {
                        setBpm(prev => {
                            const diff = detectedBpm - prev;
                            if (Math.abs(diff) > 10) return prev + Math.sign(diff) * 2;
                            return detectedBpm;
                        });
                    },
                    (level) => {
                        setMicLevel(level);
                        micLevelRef.current = level;
                    },
                    (noteStr, centsOff, pitch) => {
                        setDetectedNote(noteStr);
                        setDetectedCents(centsOff);
                        setDetectedPitch(pitch);
                    },
                    (text, isFinal) => {
                        const isSystemMsg = text && (text.startsWith('[SISTEMA:') || text.startsWith('[ERRO VOZ:'));
                        if (!isSystemMsg) setTranscriptRaw(text);
                        lastVoiceTimeRef.current = Date.now();
                        if (!isSystemMsg && syncLineByTextRef.current) syncLineByTextRef.current(text, isFinal);
                    },
                    (state) => setFsmState(state),
                    (status) => setConnectionStatus(status),
                    () => {
                        if (handleBlowAction) handleBlowAction();
                    }
                );
            }
            audioTrackerRef.current.start(stream).then(() => {
                if (audioTrackerRef.current) audioTrackerRef.current.setGain(micGain);
                setMicEnabled(true);
            }).catch((err) => {
                console.error("AudioTracker initialization failed:", err);
                setIsDynamicSpeedActive(false);
                setMicEnabled(false);
            });
        } catch (e) {
            console.error("Microphone access denied or error:", e);
            setIsDynamicSpeedActive(false);
            setMicEnabled(false);
        }
    };

    // === BLINK DETECTION MANAGER ===
    useEffect(() => {
        if (isBlinkDetectEnabled) {
            if (!faceTrackerRef.current) {
                faceTrackerRef.current = new FaceTracker();
                faceTrackerRef.current.onStatusChange = setFaceTrackerStatus;
                faceTrackerRef.current.onThreeBlinksDetected = () => {
                    handleBlowAction(true); // force scroll
                    setBlowFlash(true); // reuse the visual flash
                    setTimeout(() => setBlowFlash(false), 300);
                };
            }
            faceTrackerRef.current.start();
        } else {
            if (faceTrackerRef.current) {
                faceTrackerRef.current.stop();
            }
        }
    }, [isBlinkDetectEnabled, handleBlowAction]);

    const stopAudioTracker = () => {
        if (audioTrackerRef.current) {
            audioTrackerRef.current.stop();
            audioTrackerRef.current = null;
        }
        setMicEnabled(false);
        releaseSharedMicStream();
    };

    // Clear Live Transcript after 3 seconds of inactivity
    useEffect(() => {
        if (!transcriptRaw) return;
        const timer = setTimeout(() => {
            setTranscriptRaw('');
        }, 3000);
        return () => clearTimeout(timer);
    }, [transcriptRaw]);

    // Silence Detection Logic (Videoke-style)
    useEffect(() => {
        if (!micEnabled || !isRhythmicMode) {
            setIsPausedBySilence(false);
            return;
        }

        const SILENCE_THRESHOLD = 5;
        const SILENCE_DELAY = 1800;
        const RESUME_THRESHOLD = 8;

        const checkSilence = setInterval(() => {
            const level = micLevelRef.current;

            if (level < SILENCE_THRESHOLD) {
                if (!silenceTimerRef.current) {
                    silenceTimerRef.current = setTimeout(() => {
                        setIsPausedBySilence(true);
                    }, SILENCE_DELAY);
                }
            } else if (level > RESUME_THRESHOLD) {
                if (silenceTimerRef.current) {
                    clearTimeout(silenceTimerRef.current);
                    silenceTimerRef.current = null;
                }
                setIsPausedBySilence(false);
            }
        }, 200);

        return () => {
            clearInterval(checkSilence);
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
        };
    }, [micEnabled, isRhythmicMode]);

    // AUTO-TRANSPOSE LOGIC: Monitor pitch stability and auto-shift the song key
    const autoTransposeTimerRef = useRef(null);
    const lastStableNoteRef = useRef(null);
    const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

    useEffect(() => {
        if (!isAutoPitchEnabled || !micEnabled || !detectedNote) return;

        const currentSong = songs[selectedManualIndex];
        if (!currentSong) return;

        // Get the current song's root note (ignoring minor/maj suffixes)
        const currentKey = (currentSong.sounding_key || currentSong.song_key || 'C')
            .replace(/m|maj|min|7|sus|aug|dim|\d/g, '')
            .trim();

        // If the singer is already on the right note, no need to transpose
        if (detectedNote === currentKey) {
            if (autoTransposeTimerRef.current) {
                clearTimeout(autoTransposeTimerRef.current);
                autoTransposeTimerRef.current = null;
            }
            lastStableNoteRef.current = null;
            return;
        }

        // Same note as last detected? Start/continue the stability timer
        if (detectedNote !== lastStableNoteRef.current) {
            lastStableNoteRef.current = detectedNote;
            if (autoTransposeTimerRef.current) clearTimeout(autoTransposeTimerRef.current);

            // 2.5 seconds of consistent deviation triggers auto-transpose
            autoTransposeTimerRef.current = setTimeout(async () => {
                const targetNote = lastStableNoteRef.current;
                if (!targetNote) return;

                const fromIdx = NOTE_NAMES.indexOf(currentKey);
                const toIdx = NOTE_NAMES.indexOf(targetNote);
                if (fromIdx === -1 || toIdx === -1) return;

                let semitones = toIdx - fromIdx;
                // Use shortest path around chromatic circle
                if (semitones > 6) semitones -= 12;
                if (semitones < -6) semitones += 12;

                if (semitones === 0) return;

                try {
                    const res = await fetch(`${API_BASE_URL}/api/transpose`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: currentSong.content,
                            current_key: currentKey,
                            semitones
                        })
                    });
                    const data = await res.json();
                    if (data.transposed_content) {
                        const updatedSongs = [...songs];
                        updatedSongs[selectedManualIndex] = {
                            ...currentSong,
                            content: data.transposed_content,
                            sounding_key: data.new_key
                        };
                        setSongs(updatedSongs);
                        setManualPreviewSong(updatedSongs[selectedManualIndex]);
                    }
                } catch (e) {
                    console.error('[AutoTranspose] Error:', e);
                }
                lastStableNoteRef.current = null;
                autoTransposeTimerRef.current = null;
            }, 2500);
        }

        return () => {
            if (autoTransposeTimerRef.current) {
                clearTimeout(autoTransposeTimerRef.current);
                autoTransposeTimerRef.current = null;
            }
        };
    }, [detectedNote, isAutoPitchEnabled, micEnabled, selectedManualIndex]);

    // Vocabulary Extraction for Manual Player
    useEffect(() => {
        const songIdx = (activeTab === 'presentation') ? presenterSongIndex : ((activeTab === 'player' || isManualFullscreen) ? selectedManualIndex : null);
        if (songIdx !== null && songs[songIdx]) {
            const song = songs[songIdx];
            const lines = (song.content || "").split('\n');
            const STOP_WORDS = new Set(['o', 'a', 'e', 'de', 'do', 'da', 'no', 'na', 'que', 'se', 'te', 'me', 'um', 'uma', 'os', 'as', 'pra', 'pro', 'ao', 'aos', 'eu', 'voce', 'tu', 'ele', 'ela', 'nos', 'vos', 'eles', 'elas']);
            const vocab = new Set();

            lines.forEach(line => {
                if (line && line.trim() && !line.includes('---') && !line.trim().startsWith('[')) {
                    const norm = PhoneticMatcher.normalize(line);
                    norm.split(' ').forEach(w => {
                        if (w.length >= 2 && !STOP_WORDS.has(w)) vocab.add(w);
                    });
                }
            });

            const vocabArray = Array.from(vocab);
            if (audioTrackerRef.current) {
                audioTrackerRef.current.setVocabulary(vocabArray);
            }
        }
    }, [selectedManualIndex, songs, activeTab, isManualFullscreen]);

    const getManualStatusInfo = () => {
        if (!micEnabled) return { label: 'MIC OFF', color: '#64748b' };
        if (connectionStatus === 'connecting') return { label: 'CONECTANDO', color: '#60A5FA' };
        if (connectionStatus === 'error' || connectionStatus === 'disconnected') return { label: 'OFFLINE', color: '#ef4444' };
        if (isPausedBySilence) return { label: 'SILÊNCIO', color: '#f87171' };
        if (isWaitingForVoice) return { label: 'AGUARDANDO', color: '#B87333' };
        switch (fsmState.state) {
            case 'SEGUINDO_NORMAL': return { label: 'VOZ+VIOLA', color: '#22c55e' };
            case 'CONGELAR_LETRA_SEGUIR_VIOLA': return { label: 'VIOLA', color: '#FCD34D' };
            case 'ACAPELLA': return { label: 'A CAPELA', color: '#60A5FA' };
            default: return { label: 'CANTANDO', color: '#22c55e' };
        }
    };

    // Reset IA Sync state when song/view changes
    useEffect(() => {
        setTranscriptRaw('');
        setCurrentLineIndex(0);
        currentLineIndexRef.current = 0;
        setLastVoiceMatchedIndex(0);
        lastVoiceMatchedIndexRef.current = 0;
        driftHistoryRef.current = [];
        lastJumpRef.current = 0;
        lastMatchTimeRef.current = Date.now();
        // Option to reset FSM state here if needed
        setFsmState({ state: 'AGUARDANDO', action: 'freeze' });
    }, [selectedManualIndex, activeTab, mainNav, isFullScreenPlayer, presenterSongIndex]);

    // Keep the sync function ref strictly up-to-date with this render's closure
    useEffect(() => {
        syncLineByTextRef.current = syncLineByText;
    });

    const syncLineByText = (text, isFinal) => {
        const songIdx = (activeTab === 'presentation') ? presenterSongIndex : ((isFullScreenPlayer || activeTab === 'player' || mainNav === 'player') ? selectedManualIndex : null);
        if (songIdx === null || !songs[songIdx]) return;

        // Resume if we hear a voice match
        if (isPausedBySilence) setIsPausedBySilence(false);
        if (!text || text.trim().length === 0) return;

        const currentSongData = songs[songIdx];
        const lines = (currentSongData.content || "").split('\n');

        // Normalize and get tokens
        const normTranscript = PhoneticMatcher.normalize(PhoneticMatcher.applyAliases(text));
        const STOP_WORDS = new Set(['o', 'a', 'e', 'de', 'do', 'da', 'no', 'na', 'que', 'se', 'te', 'me', 'um', 'uma', 'os', 'as', 'pra', 'pro', 'ao', 'aos', 'eu', 'voce', 'tu', 'ele', 'ela', 'nos', 'vos', 'eles', 'elas']);

        const getMeaningfulWords = (phrase) => phrase.split(' ').filter(w => w.length >= 2 && !STOP_WORDS.has(w));
        const transWords = getMeaningfulWords(normTranscript).slice(-10);
        if (transWords.length < 1) return;

        const currentIdx = currentLineIndexRef.current;
        let targetIndex = -1;
        const now = Date.now();

        // 1. UNIQUE DIFF-BASED SCORING SETUP
        // We identify the words in the CURRENT line. To advance to a new line, we look for matches 
        // that are UNIQUE to the new line (meaning the singer has actually moved on to new lyrics).
        const currentLineStr = currentIdx < lines.length && lines[currentIdx] ? lines[currentIdx] : "";
        const currentLineWords = new Set(getMeaningfulWords(PhoneticMatcher.normalize(currentLineStr)));

        // Scoring helper returns total matches AND unique matches (words not in current line)
        const scoreLine = (idx) => {
            const line = lines[idx];
            if (!line || !line.trim() || isChordOnlyLine(line) || isTablatureLine(line)) return { score: 0, unique: 0 };
            const lw = getMeaningfulWords(PhoneticMatcher.normalize(line));
            if (lw.length === 0) return { score: 0, unique: 0 };

            const matchedWords = new Set();
            for (const tw of transWords) {
                for (const lWord of lw) {
                    if (lWord === tw || (tw.length >= 4 && (lWord.startsWith(tw) || tw.startsWith(lWord))) || (tw.length >= 5 && lWord.includes(tw))) {
                        matchedWords.add(tw);
                        break;
                    }
                }
            }

            let uniqueCount = 0;
            for (const word of matchedWords) {
                if (!currentLineWords.has(word)) uniqueCount++;
            }

            const result = { score: matchedWords.size, unique: uniqueCount };
            if (matchedWords.size > 0) {
                console.log(`[IASync] Scored Line ${idx}: "${lines[idx].trim().substring(0, 20)}..." | Score: ${result.score} | Unique: ${result.unique} | Words: ${Array.from(matchedWords).join(', ')}`);
            }
            return result;
        };

        // 2. TIER 1: STRICT LINEAR ADVANCE
        // Find the IMMEDIATE NEXT valid lyric line, ignoring chords/tabs/empty lines.
        let nextLyricIdx = -1;
        for (let i = currentIdx + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line && line.trim() && !isChordOnlyLine(line) && !isTablatureLine(line) && !line.trim().startsWith('[')) {
                nextLyricIdx = i;
                break;
            }
        }

        const timeSinceAnchor = now - lastMatchTimeRef.current;

        // --- SMART DISAMBIGUATION HUB (STRICT LINEAR & STANZA RESTARTS) ---
        // 1. Identify valid targets: Search up to 3 lyric lines ahead
        const targetLyricLines = [];
        let count = 0;
        for (let i = currentIdx + 1; i < lines.length && count < 3; i++) {
            const line = lines[i];
            if (line && line.trim() && !isChordOnlyLine(line) && !isTablatureLine(line) && !line.trim().startsWith('[')) {
                targetLyricLines.push(i);
                count++;
            }
        }

        // Evaluate Forward candidates
        for (const testIdx of targetLyricLines) {
            const { score, unique } = scoreLine(testIdx);
            const testLineText = PhoneticMatcher.normalize(lines[testIdx] || "");
            const currentLineText = PhoneticMatcher.normalize(lines[currentIdx] || "");

            // Scenario A: The target line is DIFFERENT from the current line
            if (testLineText !== currentLineText) {
                // RELAXED RULE: If score is high (>=2), or if it's the very next line and has at least 1 unique word
                if (score >= 2 || (score >= 1 && unique >= 1)) {
                    targetIndex = testIdx;
                    lastMatchTimeRef.current = now;
                    break;
                }
            }
            // Scenario B: IDENTICAL line (repetition)
            else if (testIdx === targetLyricLines[0]) {
                // Only handle identity for the IMMEDIATE next line to prevent runaway jumps
                if (timeSinceAnchor > 1800) {
                    const targetWordsOrdered = getMeaningfulWords(testLineText);
                    const wideRecentSpoken = transWords.slice(-8);
                    const firstWord = targetWordsOrdered[0];
                    const secondWord = targetWordsOrdered.length > 1 ? targetWordsOrdered[1] : null;
                    const thirdWord = targetWordsOrdered.length > 2 ? targetWordsOrdered[2] : null;

                    const hasStartedSecondLine =
                        (secondWord && wideRecentSpoken.includes(secondWord)) ||
                        (thirdWord && wideRecentSpoken.includes(thirdWord)) ||
                        (firstWord && wideRecentSpoken.includes(firstWord));

                    if ((score >= 2 && hasStartedSecondLine) || (score >= 1 && timeSinceAnchor > 3500)) {
                        targetIndex = testIdx;
                        lastMatchTimeRef.current = now;
                        break;
                    }
                }
            }
            if (targetIndex !== -1) break;
        }

        // Evaluate Backward (Only if Forward hasn't matched)
        // STRICT RULE: Only explicitly restart the CURRENT or PREVIOUS stanza.
        if (targetIndex === -1 && timeSinceAnchor > 1800) {
            // Find the start of the current stanza
            let stanzaStartIdx = currentIdx;
            for (let i = currentIdx - 1; i >= 0 && i >= currentIdx - 20; i--) {
                const line = lines[i];
                if (!line || line.trim() === "" || line.trim().startsWith('[')) {
                    stanzaStartIdx = i + 1;
                    while (stanzaStartIdx < currentIdx && (isChordOnlyLine(lines[stanzaStartIdx]) || isTablatureLine(lines[stanzaStartIdx]))) {
                        stanzaStartIdx++;
                    }
                    break;
                }
            }

            if (stanzaStartIdx < currentIdx) {
                const stanzaStartText = PhoneticMatcher.normalize(lines[stanzaStartIdx] || "");
                const currentLineText = PhoneticMatcher.normalize(lines[currentIdx] || "");

                // CRITICAL ANTI-OSCILLATION: NEVER jump backward to a line that is identical to the current line!
                if (stanzaStartText !== currentLineText) {
                    const { score, unique } = scoreLine(stanzaStartIdx);

                    const targetWordsOrdered = getMeaningfulWords(stanzaStartText);
                    if (targetWordsOrdered.length > 0) {
                        const firstWord = targetWordsOrdered[0];
                        const secondWord = targetWordsOrdered.length > 1 ? targetWordsOrdered[1] : null;
                        const thirdWord = targetWordsOrdered.length > 2 ? targetWordsOrdered[2] : null;

                        const wideRecentSpoken = transWords.slice(-8);

                        // To jump back UP to the start of the stanza, they MUST have recently spoken 
                        // the exact first words of that specific stanza start line.
                        const hasStartedStanza =
                            (firstWord && wideRecentSpoken.includes(firstWord)) ||
                            (secondWord && wideRecentSpoken.includes(secondWord)) ||
                            (thirdWord && wideRecentSpoken.includes(thirdWord));

                        // PROTECT AGAINST STALE MEMORY (The "Quero louvar-te" Substring Bug):
                        // If L4 is "Quero louvar-te" and L1 is "Quero louvar-te sempre mais":
                        // the 10-word audio array might still contain "mais" from when they sang L2.
                        // We must demand that the UNIQUE 'proof' word ("sempre" or "mais") was spoken 
                        // RECENTLY (last 4 words), not 10 words ago.
                        let hasRecentUnique = false;
                        const veryRecentSpoken = transWords.slice(-4);
                        for (const rw of veryRecentSpoken) {
                            if (targetWordsOrdered.includes(rw) && !currentLineWords.has(rw)) {
                                hasRecentUnique = true;
                                break;
                            }
                        }

                        // If the lines share a root (e.g. L4 is a substring of L1), we enforce the Recent Unique rule.
                        const isSimilarRoot = stanzaStartText.includes(currentLineText) || currentLineText.includes(stanzaStartText);

                        // --- STRICT FORWARD-ONLY GUARD ---
                        // Agreement: Always Descending, except at end of Refrao/Stanza or Start
                        const isRestartingSong = stanzaStartIdx < 5; // First 5 lines
                        const isSectionBreak = isEndOfSection(lines, currentIdx);
                        const isStructuralMarker = lines[stanzaStartIdx] && lines[stanzaStartIdx].trim().startsWith('[');

                        // Requires an extremely strong match AND proof of restarting.
                        if (hasStartedStanza && score >= 3 && unique >= 1 && timeSinceAnchor > 2500) {
                            if (isRestartingSong || isSectionBreak || isStructuralMarker) {
                                if (!isSimilarRoot || hasRecentUnique) {
                                    targetIndex = stanzaStartIdx;
                                    lastMatchTimeRef.current = now;
                                }
                            }
                        }
                    }
                }
            }
        }

        // If we didn't advance, check if we are still singing the CURRENT line
        if (targetIndex === -1 && scoreLine(currentIdx).score >= 1) {
            targetIndex = currentIdx;
            // Do NOT touch lastMatchTimeRef.current here!
        }

        if (targetIndex !== -1) {
            // 1. Did we actually move to a NEW line?
            if (targetIndex !== currentIdx) {
                const now = Date.now();
                const diff = targetIndex - currentIdx;
                driftHistoryRef.current.push(diff);
                if (driftHistoryRef.current.length > 5) driftHistoryRef.current.shift();

                // Rhythm smoothing
                const timeSinceLastAdjust = now - (lastBpmAdjustTimeRef.current || 0);
                if (timeSinceLastAdjust > 2500) {
                    const averageDrift = driftHistoryRef.current.reduce((a, b) => a + b, 0) / (driftHistoryRef.current.length || 1);
                    if (averageDrift < -0.3) {
                        setBpm(prev => Math.max(40, prev - 1));
                        lastBpmAdjustTimeRef.current = now;
                    } else if (averageDrift > 0.8) {
                        setBpm(prev => Math.min(220, prev + 1));
                        lastBpmAdjustTimeRef.current = now;
                    }
                }

                // Apply Jump
                if (now - (lastJumpRef.current || 0) > 1200) {
                    updateCurrentLine(targetIndex);
                    lastVoiceMatchedIndexRef.current = targetIndex;
                    lastJumpRef.current = now;
                }
            }

            // 2. Regardless of jumping or staying: Have we officially started tracking?
            if (isWaitingForVoice) {
                setIsWaitingForVoice(false);
                setIsAnchored(true);
                startRhythmicTimer();
                lastMatchTimeRef.current = Date.now();
            }
        }
    };

    const startRhythmicTimer = () => {
        if (advanceTimerRef.current) clearInterval(advanceTimerRef.current);
        const msPerLine = (60000 / bpm) * 4;
        advanceTimerRef.current = setInterval(() => {
            const songIdx = (isFullScreenPlayer || activeTab === 'player') ? selectedManualIndex : null;
            if (isRhythmicMode && songIdx !== null && !isWaitingForVoice && !isPausedBySilenceRef.current) {
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

    // Auto-manage Rhythmic Timer based on state
    useEffect(() => {
        if (isRhythmicMode) {
            // If no mic, or if mic is on and already anchored, we start timer
            if (!micEnabled || isAnchored) {
                setIsWaitingForVoice(false);
                startRhythmicTimer();
            } else {
                // Mic is ON, but not anchored yet. Wait for voice.
                setIsWaitingForVoice(true);
            }
        } else {
            // Manual Mode: stop the timer
            if (advanceTimerRef.current) {
                clearInterval(advanceTimerRef.current);
                advanceTimerRef.current = null;
            }
        }
        // Cleanup on unmount
        return () => {
            if (advanceTimerRef.current) {
                clearInterval(advanceTimerRef.current);
            }
        };
    }, [isRhythmicMode, micEnabled, isAnchored, bpm]);

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
            const res = await fetch(`${API_BASE_URL}/api/transpose`, {
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
            const res = await fetch(`${API_BASE_URL}/api/transpose`, {
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
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
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
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
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
        if (!note) return '';
        return note.replace(/b/g, 'b').replace(/#/g, '#');
    };

    const getSoundingKey = (song) => {
        if (!song) return '';
        if (song.sounding_key) return song.sounding_key;
        const baseKey = song.requested_key || song.song_key || 'C';
        if (!song.capo) return baseKey;

        const NOTES_ARR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        let baseMatch = baseKey.match(/([A-G][b#]?)/i);
        let base = baseMatch ? baseMatch[1] : null;

        if (base) {
            let idx = NOTES_ARR.indexOf(base);
            if (idx === -1) {
                // Handle flat variants
                const flatMap = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
                idx = NOTES_ARR.indexOf(flatMap[base] || base);
            }
            if (idx !== -1) {
                const final_idx = (idx + song.capo) % 12;
                return baseKey.replace(base, NOTES_ARR[final_idx]);
            }
        }
        return baseKey;
    };

    const getFilteredContent = (content) => {
        if (!content) return "";
        return content.split('\n').filter(line => {
            const trimmed = line.trim();
            const isTabLine = line.includes('|-') || line.includes('-|') || /^[eBGDAE]\|/.test(trimmed);
            const isGuitarNote = /guitarra|dedilhado|batida|solo|riff|ritmo|frase|passagem/i.test(line) && (line.includes('(') || line.includes('['));
            const isRhythmArrow = line.includes('↓') || line.includes('↑');
            return !(isTabLine || isGuitarNote || isRhythmArrow);
        }).join('\n');
    };

    useEffect(() => { fetchAcervo(); }, []);
    useEffect(() => { if (activeTab === 'acervo') fetchAcervo(); }, [activeTab]);
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (songName.length >= 2) fetchSuggestions(songName);
            else setSuggestions([]);
        }, 250);
        return () => clearTimeout(delayDebounceFn);
    }, [songName]);

    const resetSearchSession = useCallback(() => {
        setSongName('');
        setArtistName('');
        setSuggestions([]);
        setSongs([]);
        setPlayerSongSearch('');
        setPlayerSongSuggestions([]);
        setSongKey('C');
        setSongVersion('Principal');
        setAvailableVersions([{ name: 'Principal', key: 'Principal' }]);
        setManualCapo(0);
        setManualPreviewSong(null);
        setManualLoading(false);
        setManualError('');
        setIsAutoScrolling(false);
        setIsDynamicSpeedActive(false);
        setMicEnabled(false);
        setCurrentLineIndex(0);
        if (currentLineIndexRef) currentLineIndexRef.current = 0;
        if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    }, []);

    // Automated Session Reset on Player Exit
    useEffect(() => {
        const isInPlayer = isFullScreenPlayer || activeTab === 'player' || mainNav === 'player';
        if (wasInPlayerRef.current && !isInPlayer) {
            resetSearchSession();
        }
        wasInPlayerRef.current = isInPlayer;
    }, [isFullScreenPlayer, activeTab, mainNav, resetSearchSession]);

    const fetchSuggestions = async (name) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/search/suggestions?q=${encodeURIComponent(name)}`);
            const data = await res.json();
            let results = data.suggestions || [];
            results = results.filter(s =>
                s && s.song && s.artist &&
                !s.song.toLowerCase().includes('agape') &&
                !s.artist.toLowerCase().includes('agape')
            );
            setSuggestions(results);
        } catch (err) { console.error(err); }
    };

    const fetchSongMetadata = async (song, artist) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/music/metadata?song_name=${encodeURIComponent(song)}&artist_name=${encodeURIComponent(artist)}`);
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
            const res = await fetch(`${API_BASE_URL}/api/song/versions?artist_slug=${artistSlug}&song_slug=${songSlug}`);
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
            const res = await fetch(`${API_BASE_URL}/api/chords`);
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
                await fetch(`${API_BASE_URL}/api/chords/${deleteTarget.id}`, { method: 'DELETE' });
                fetchAcervo();
                setSelectedAcervoItems(prev => prev.filter(id => id !== deleteTarget.id));
            } catch (err) { alert(err); }
        } else if (deleteTarget.type === 'acervo_multi') {
            try {
                // Delete sequentially (or via possible bulk endpoint if added in backend)
                for (const id of deleteTarget.id) {
                    await fetch(`${API_BASE_URL}/api/chords/${id}`, { method: 'DELETE' });
                }
                fetchAcervo();
                setSelectedAcervoItems([]);
            } catch (err) { alert(err); }
        } else if (deleteTarget.type === 'lista') {
            const listToDelete = savedPlaylists.find(p => p.id === deleteTarget.id);
            const updated = savedPlaylists.filter(pl => pl.id !== deleteTarget.id);
            localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
            setSavedPlaylists(updated);
            if (authenticatedUser && listToDelete) {
                deleteCloudPlaylist(authenticatedUser, listToDelete.name);
            }
        } else if (deleteTarget.type === 'lista_multi') {
            const existing = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
            const idsToRemove = Array.isArray(deleteTarget.id) ? deleteTarget.id : [];
            const updated = existing.filter(pl => !idsToRemove.includes(pl.id));
            localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
            setSavedPlaylists(updated);
            setSelectedLists([]);
        }
        setDeleteModalOpen(false);
    };

    const persistSongsToPlaylist = (currentSongs, playlistName) => {
        if (!playlistName || currentSongs.length === 0) return;

        const allPlaylists = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
        const updated = allPlaylists.map(pl => {
            if (pl.name === playlistName) {
                return {
                    ...pl,
                    songs: currentSongs.map(s => ({
                        id: s.id || null,
                        song_name: s.song_name,
                        artist_name: s.artist_name,
                        song_key: s.song_key,
                        sounding_key: s.sounding_key || s.song_key,
                        original_key: s.original_key || s.song_key,
                        capo: s.capo || 0,
                        include_tabs: s.include_tabs !== undefined ? s.include_tabs : (s.include_tabs ?? true),
                        content: s.content || ''
                    }))
                };
            }
            return pl;
        });

        localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
        setSavedPlaylists(updated);
        
        // Cloud backup (Auto-save)
        if (authenticatedUser) {
            const listToSync = updated.find(pl => pl.name === playlistName);
            if (listToSync) {
                saveCloudPlaylist(authenticatedUser, listToSync.name, listToSync.songs);
            }
        }
    };

    // SYNC PLAYER STATES TO GLOBAL SONGS (For Auto-Save)
    useEffect(() => {
        const isPlayerActive = activeTab === 'manual' || activeTab === 'player';
        if (isPlayerActive && songs[selectedManualIndex] && manualPreviewSong) {
            const current = songs[selectedManualIndex];
            
            // SECURITY CHECK: Ensure we are updating the SAME song
            // This prevents "Song A" from overwriting "Song B" during selection changes
            const isSameSong = manualPreviewSong.song_name === current.song_name && manualPreviewSong.artist_name === current.artist_name;
            if (!isSameSong) return;

            // For manual player, we sync content and sounding_key from manualPreviewSong
            const contentToSync = activeTab === 'manual' ? manualPreviewSong.content : current.content;
            const keyToSync = activeTab === 'manual' ? manualPreviewSong.sounding_key : current.sounding_key;
            // Capo and includeTabs are synced for both
            const capoToSync = manualCapo;
            const tabsToSync = includeTabs;

            const changed =
                contentToSync !== current.content ||
                keyToSync !== current.sounding_key ||
                capoToSync !== current.capo ||
                tabsToSync !== current.include_tabs;

            if (changed) {
                const newSongs = [...songs];
                newSongs[selectedManualIndex] = {
                    ...current,
                    content: contentToSync,
                    sounding_key: keyToSync,
                    capo: capoToSync,
                    include_tabs: tabsToSync
                };
                setSongs(newSongs);
            }
        }
    }, [manualPreviewSong, manualCapo, includeTabs, activeTab, selectedManualIndex]);

    // Update global player states when a new song is selected
    useEffect(() => {
        const selected = songs[selectedManualIndex];
        if (selected) {
            setIncludeTabs(selected.include_tabs !== false);
            setManualCapo(selected.capo || 0);
            setManualPreviewSong(selected);
        }
    }, [selectedManualIndex]);

    // FETCH VERSIONS FOR PLAYER
    useEffect(() => {
        const fetchPlayerVersions = async () => {
            const isPlayerVisible = isFullScreenPlayer || activeTab === 'player' || mainNav === 'player' || isManualFullscreen;
            if (!isPlayerVisible || selectedManualIndex === null || !songs[selectedManualIndex]) {
                setCurrentPlayerVersions([]);
                return;
            }
            const s = songs[selectedManualIndex];
            const artistSlug = s.artist_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            const songSlug = s.song_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

            try {
                // Use the new robust name-based endpoint
                const res = await fetch(`${API_BASE_URL}/api/chords/versions?song_slug=${songSlug}&artist_slug=${artistSlug}`);
                const data = await res.json();
                setCurrentPlayerVersions(data || []);
            } catch (err) {
                console.error("Erro ao buscar versões no player:", err);
                setCurrentPlayerVersions([]);
            }
        };
        fetchPlayerVersions();
    }, [activeTab, mainNav, isFullScreenPlayer, isManualFullscreen, selectedManualIndex, songs[selectedManualIndex]?.song_name]);

    const handleSwitchVersion = async (versionKey) => {
        if (selectedManualIndex === null || !songs[selectedManualIndex]) return;
        setPlayerVersionLoading(true);
        setIsPlayerVersionsOpen(false);
        const s = songs[selectedManualIndex];

        try {
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: s.song_name,
                    artist_name: s.artist_name,
                    key: s.song_key || "",
                    version: versionKey,
                    force_refresh: true
                })
            });
            const data = await res.json();
            if (data.content) {
                const updatedSongs = [...songs];
                updatedSongs[selectedManualIndex] = {
                    ...updatedSongs[selectedManualIndex],
                    content: data.content,
                    song_key: data.key || s.song_key,
                    original_key: data.key || s.song_key,
                    sounding_key: data.key || s.song_key,
                    capo: 0 // Reset capo on version switch as it usually needs a fresh look
                };
                setSongs(updatedSongs);
            }
        } catch (err) {
            console.error("Erro ao trocar versão:", err);
        } finally {
            setPlayerVersionLoading(false);
        }
    };

    const getShareLink = async () => {
        if (songs.length === 0) return "";
        setShareLoading(true);
        try {
            const payload = {
                name: activePlaylistName || "Lista Compartilhada",
                songs: songs.map(s => ({
                    song_name: s.song_name,
                    artist_name: s.artist_name,
                    song_key: s.sounding_key || s.requested_key || s.song_key,
                    capo: s.capo || 0,
                    content: s.content,
                    include_tabs: s.include_tabs
                }))
            };
            
            // Ensure API_BASE_URL does not end with slash before appending
            const baseUrl = API_BASE_URL.replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/api/share/`, { // Adding trailing slash robustly for FastAPI
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            if (!data || !data.slug) {
                throw new Error("Slug not returned from API");
            }
            
            const url = `${baseUrl}/s/${data.slug}`;
            setShareLink(url);
            return url;
        } catch (err) {
            console.error("Erro ao gerar slug de compartilhamento, usando fallback local:", err);
            // Fallback to legacy Base64 if API fails
            const legacyData = JSON.stringify({
                name: activePlaylistName || "Lista Compartilhada",
                songs: songs.map(s => ({
                    song_name: s.song_name,
                    artist_name: s.artist_name,
                    song_key: s.sounding_key || s.requested_key || s.song_key,
                    capo: s.capo || 0
                }))
            });
            const b64 = btoa(unescape(encodeURIComponent(legacyData)));
            const url = `${window.location.origin}${window.location.pathname}?import=${b64}`;
            setShareLink(url);
            return url;
        } finally {
            setShareLoading(false);
        }
    };


    const handleShareList = async () => {
        if (songs.length === 0) return;
        
        // Open modal immediately so user sees loading state
        setShareModalOpen(true);
        
        try {
            const url = await getShareLink();
            if (!url) {
                setShareModalOpen(false);
                return;
            }
            
            if (navigator.share) {
                await navigator.share({
                    title: `IronChords: ${activePlaylistName || "Nova Cifra/Lista"}`,
                    text: `Acesse minha lista de cifras no IronChords:`,
                    url: url
                });
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Erro no compartilhamento nativo:", err);
            }
        }
    };

    const handleImportList = (data) => {
        if (!data || !data.songs) return;

        const newList = {
            id: Date.now().toString(),
            name: data.name || "Lista Importada",
            songs: data.songs.map(s => ({
                ...s,
                id: null,
                sounding_key: s.song_key,
                original_key: s.song_key
            }))
        };

        const existing = JSON.parse(localStorage.getItem('iron_chords_playlists') || '[]');
        const updated = [...existing, newList];
        localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
        setSavedPlaylists(updated);
        
        // Save to cloud if user is logged in
        if (authenticatedUser) {
            saveCloudPlaylist(authenticatedUser, newList.name, newList.songs);
        }

        setSongs(newList.songs);
        setActivePlaylistName(newList.name);
        setSelectedManualIndex(0);
        setImportData(null);
        setShowSaveSuccess(true);
        setTimeout(() => setShowSaveSuccess(false), 2000);

        // Send user to the 'Listas' tab in the Player so they can see their newly saved list
        setMainNav('player');
        setActiveTab('player');
        setPlayerSidebarTab('listas');
        setListasSubTab('salvas');
    };

    const handleEditOpen = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/chords/${id}`);
            const data = await res.json();
            setEditingChord(data.id);
            setEditFormData({
                song_name: data.song_name,
                artist_name: data.artist_name,
                song_key: data.song_key,
                content: data.content,
                capo: data.capo || 0,
                include_tabs: data.include_tabs !== undefined ? data.include_tabs : true
            });
        } catch (err) { alert(err); }
    };

    // Player Sidebar Song Search (Feature 1) — same logic as manual mode search
    const handlePlayerSongSearch = (query) => {
        setPlayerSongSearch(query);
        if (playerSearchDebounceRef.current) clearTimeout(playerSearchDebounceRef.current);
        if (query.length < 2) { setPlayerSongSuggestions([]); return; }
        playerSearchDebounceRef.current = setTimeout(async () => {
            setPlayerSongSearchLoading(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/search/suggestions?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                let results = data.suggestions || [];
                // same filter as manual mode
                results = results.filter(s => !s.song.toLowerCase().includes('agape') && !s.artist.toLowerCase().includes('agape'));
                setPlayerSongSuggestions(results);
            } catch (e) { console.error(e); }
            finally { setPlayerSongSearchLoading(false); }
        }, 250);
    };

    const handleAddSongFromSearch = async (suggestion) => {
        if (!suggestion) return;
        const suggestionKey = suggestion.slug || `${suggestion.song}-${suggestion.artist}`;
        setAddingSongSlug(suggestionKey);

        const tempId = `temp-${Date.now()}`;
        const tempSong = {
            id: tempId,
            song_name: suggestion.song,
            artist_name: suggestion.artist,
            content: "\n\n        ...Carregando cifra...\n\n",
            is_loading: true
        };
        // Optimistic UI update instantly
        setSongs(prev => {
            const updated = [...prev, tempSong];
            setSelectedManualIndex(updated.length - 1); // switch to it instantly to show loading
            return updated;
        });

        try {
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: suggestion.song,
                    artist_name: suggestion.artist,
                    key: suggestion.key || '',
                    slug: suggestion.slug || '',
                    include_tabs: true
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                const detail = errorData.detail;
                let message = "Não foi possível carregar esta música.";
                if (typeof detail === 'object' && detail.error === 'not_found') {
                    message = "Cifra não encontrada no Cifra Club para esta versão.";
                } else if (typeof detail === 'string') {
                    message = detail;
                }
                alert(message);
                setAddingSongSlug(null);
                setSongs(prev => prev.filter(s => s.id !== tempId));
                return;
            }

            const data = await res.json();
            const newSong = {
                id: Date.now() + Math.random(),
                song_name: data.song_name,
                artist_name: data.artist_name,
                song_key: data.requested_key || data.original_key,
                original_key: data.original_key,
                sounding_key: data.sounding_key,
                content: data.content,
                _orig_content: data.content,
                capo: data.capo || 0,
                source: data.source || 'cifraclub'
            };

            setSongs(prev => {
                const tempIndex = prev.findIndex(s => s.id === tempId);
                if (tempIndex !== -1) {
                    const updated = [...prev];
                    updated[tempIndex] = newSong;
                    setSelectedManualIndex(tempIndex);
                    return updated;
                }
                const updated = [...prev, newSong];
                setSelectedManualIndex(updated.length - 1);
                return updated;
            });

            setPlayerSongSearch('');
            setPlayerSongSuggestions([]);

            fetch(`${API_BASE_URL}/api/chords`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSong)
            }).catch(() => { });

        } catch (e) {
            console.error('[PlayerSearch] Error adding song:', e);
            alert("Erro de conexão ao tentar adicionar a música.");
        } finally {
            setAddingSongSlug(null);
        }
    };

    // Reset song to original key and zero capo
    const handleResetSongToOriginal = async () => {
        if (selectedManualIndex === null || !songs[selectedManualIndex]) return;
        const s = songs[selectedManualIndex];
        try {
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: s.song_name,
                    artist_name: s.artist_name || '',
                    key: '', // Empty string forces backend to look for original key
                    include_tabs: s.include_tabs !== undefined ? s.include_tabs : true,
                    capo: 0,
                    force_refresh: true // Bypass cache
                })
            });
            const data = await res.json();
            if (res.ok) {
                const updatedSong = {
                    ...s,
                    content: data.content || s.content,
                    sounding_key: data.sounding_key || data.original_key || '',
                    original_key: data.original_key || s.original_key,
                    requested_key: data.original_key || s.original_key,
                    song_key: data.original_key || s.original_key,
                    _orig_key: data.original_key || s.original_key,
                    _orig_content: data.content || s.content,
                    capo: 0
                };
                const next = [...songs];
                next[selectedManualIndex] = updatedSong;
                setSongs(next);
            }
        } catch (e) { console.error('[ResetOriginal] Error:', e); }
    };

    // Delete song from queue (Feature 2)
    const handleDeleteSongFromQueue = (idx) => {
        const next = songs.filter((_, i) => i !== idx);
        setSongs(next);
        if (selectedManualIndex >= next.length) setSelectedManualIndex(Math.max(0, next.length - 1));
        else if (selectedManualIndex > idx) setSelectedManualIndex(selectedManualIndex - 1);
    };

    const handleSort = () => {
        if (dragItem.current === null || dragOverItem.current === null) return;
        if (dragItem.current === dragOverItem.current) {
            setDragOverIdx(null);
            return;
        }

        const newSongs = [...songs];
        const draggedSongContent = newSongs.splice(dragItem.current, 1)[0];
        newSongs.splice(dragOverItem.current, 0, draggedSongContent);

        // Adjust selectedManualIndex to follow the currently selected song
        if (selectedManualIndex === dragItem.current) {
            setSelectedManualIndex(dragOverItem.current);
        } else if (
            selectedManualIndex !== null &&
            selectedManualIndex > dragItem.current &&
            selectedManualIndex <= dragOverItem.current
        ) {
            setSelectedManualIndex(selectedManualIndex - 1);
        } else if (
            selectedManualIndex !== null &&
            selectedManualIndex < dragItem.current &&
            selectedManualIndex >= dragOverItem.current
        ) {
            setSelectedManualIndex(selectedManualIndex + 1);
        }

        dragItem.current = null;
        dragOverItem.current = null;
        setDragOverIdx(null);
        setSongs(newSongs);
    };

    const handleEditSave = async (e) => {
        if (e) e.preventDefault();
        try {
            await fetch(`${API_BASE_URL}/api/chords/${editingChord}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editFormData)
            });
            setEditingChord(null);
            fetchAcervo();
        } catch (err) { alert(err); }
    };

    const handleEditTranspose = async (semitones) => {
        const currentKeyToUse = editFormData.song_key || 'C';
        setIsTransposing(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/transpose`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editFormData.content, current_key: currentKeyToUse, semitones: semitones })
            });
            const data = await res.json();
            if (data.transposed_content) {
                setEditFormData(prev => ({
                    ...prev,
                    content: data.transposed_content,
                    song_key: data.new_key
                }));
            }
        } catch (err) { console.error(err); }
        finally { setIsTransposing(false); }
    };

    // Auto-update Manual Preview when Key, Capo or Tabs change (DISABLED to decouple player from search form)
    /*
    useEffect(() => {
        if (manualPreviewSong && activeTab === 'manual') {
            handleManualSubmit();
        }
    }, [songKey, manualCapo, includeTabs]);
    */


    const handleManualSubmit = async (e, songNameOverride, artistNameOverride, keyOverride, versionOverride) => {
        if (e) e.preventDefault();
        const useSongName = songNameOverride || songName;
        const useArtistName = artistNameOverride || artistName;
        // Use empty string to signal "Original Key"
        const useKey = (keyOverride === "") ? "" : (keyOverride || songKey);
        const useVersion = versionOverride || songVersion;

        if (!useSongName || !useArtistName) return;
        setManualLoading(true);
        setManualError('');
        try {
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: useSongName,
                    artist_name: useArtistName,
                    key: useKey,
                    version: useVersion,
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
                sounding_key: data.sounding_key || data.requested_key || data.original_key || '',
                requested_key: data.requested_key || data.original_key || '',
                original_key: data.original_key || '',
                song_key: data.original_key || data.requested_key || '',
                _orig_key: data.original_key || data.requested_key || '',
                _orig_content: data.content || '',
                capo: data.capo || manualCapo
            };
            setManualPreviewSong(newSong);
            if (data.versions && data.versions.length > 0) {
                setAvailableVersions(data.versions);
            } else {
                setAvailableVersions([{ name: 'Principal', key: 'Principal' }]);
            }
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

    const autoMapHeaders = (headers) => {
        const mapping = { song_name: '', artist_name: '', key: '', capo: '' };
        headers.forEach(h => {
            const low = h.toLowerCase();
            if (low.includes('musica') || low.includes('nome') || low.includes('canção') || low.includes('song')) mapping.song_name = h;
            if (low.includes('artista') || low.includes('cantor') || low.includes('banda') || low.includes('artist')) mapping.artist_name = h;
            if (low.includes('tom') || low.includes('key') || low.includes('tonalidade')) mapping.key = h;
            if (low.includes('capo') || low.includes('braçadeira') || low.includes('capotraste')) mapping.capo = h;
        });
        return mapping;
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
                const res = await fetch(`${API_BASE_URL}/api/music/batch/pdf`, {
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
                    const cleanHeaders = data.headers.map(h => String(h).trim());
                    setBatchHeaders(cleanHeaders);
                    setBatchRawData(data.rows);
                    setBatchMapping(autoMapHeaders(cleanHeaders));
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
                        const cleanHeaders = data[0].map(h => String(h).trim());
                        setBatchHeaders(cleanHeaders);
                        setBatchRawData(XLSX.utils.sheet_to_json(ws));
                        setBatchMapping(autoMapHeaders(cleanHeaders));
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
            const rawCapo = row[batchMapping.capo];
            let capo = 0;
            if (rawCapo !== undefined && rawCapo !== null && rawCapo !== '') {
                const parsed = parseInt(String(rawCapo).replace(/\D/g, ''));
                if (!isNaN(parsed)) capo = parsed;
            }

            // Basic validation: if artist is just a dot, dash or empty, mark as invalid but keep it
            const invalidArtist = !artistName || artistName === '.' || artistName === '-' || artistName === '_';

            return {
                song_name: songName,
                artist_name: invalidArtist ? '' : artistName,
                key: String(row[batchMapping.key] || '').trim(),
                version: 'Principal',
                include_tabs: true,
                capo: capo,
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
                // Check if content is valid (not empty)
                const isContentEmpty = !localMatch.content || String(localMatch.content).trim().length < 100;

                // Use local data instead of fetching from API
                finalResults.push({
                    ...localMatch,
                    requested_key: song.key,
                    sounding_key: localMatch.song_key, // Default to its original key
                    status: isContentEmpty ? 'error' : 'success',
                    message: isContentEmpty ? 'Cifra Vazia no Acervo' : null,
                    include_tabs: localMatch.content ? (localMatch.content.includes('|-') || localMatch.content.includes('-|')) : false,
                    in_acervo: true,
                    capo: song.capo || localMatch.capo || 0
                });
                setBatchProgress({ current: i + 1, total: songsToProcess.length });
                continue;
            }

            // 2. If not in Acervo, fetch from API
            try {
                const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(song)
                });

                if (res.ok) {
                    const data = await res.json();
                    
                    // Filter empty chords (Requirement 3)
                    const isContentEmpty = !data.content || String(data.content).trim().length < 100;

                    finalResults.push({
                        ...data,
                        status: isContentEmpty ? 'error' : 'success',
                        message: isContentEmpty ? 'Cifra Vazia Encontrada' : null,
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
                        needs_artist: song.needs_artist,
                        capo: song.capo
                    });
                }
            } catch (err) {
                finalResults.push({
                    song_name: song.song_name,
                    artist_name: song.artist_name,
                    requested_key: song.key,
                    status: 'error',
                    capo: song.capo
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

        // 🔥 Background pre-fetch all suggestions so clicking is instant
        const allSuggestions = finalResults.flatMap(r => r.suggestions || []);
        const uniqueSuggestions = allSuggestions.filter((s, i, arr) =>
            arr.findIndex(x => x.song === s.song && x.artist === s.artist) === i
        );
        // Fire-and-forget: pre-fetch each unique suggestion in background
        (async () => {
            for (const sug of uniqueSuggestions) {
                const cacheKey = `${sug.song}||${sug.artist}`;
                if (batchSuggestionsCacheRef.current[cacheKey]) continue; // Already cached or already failed
                try {
                    const r = await fetch(`${API_BASE_URL}/api/music/manual`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ song_name: sug.song, artist_name: sug.artist, key: '', version: 'Principal', include_tabs: true, capo: 0 })
                    });
                    if (r.ok) {
                        const d = await r.json();
                        batchSuggestionsCacheRef.current[cacheKey] = d;
                    } else {
                        // Mark as failed so UI can show visual feedback and clicking opens empty manual modal
                        batchSuggestionsCacheRef.current[cacheKey] = { _failed: true };
                    }
                } catch (_) {
                    batchSuggestionsCacheRef.current[cacheKey] = { _failed: true };
                }
            }
        })();
    };

    const [suggestionsLoadingKeys, setSuggestionsLoadingKeys] = useState(new Set());

    const handleTryBatchSuggestion = async (idx, suggestion) => {
        const cacheKey = `${suggestion.song}||${suggestion.artist}`;
        const cached = batchSuggestionsCacheRef.current[cacheKey];

        // Opens the BatchFixModal for the user to confirm before saving
        const openModal = (data) => {
            setBatchFixData({
                idx,
                song_name: data.song_name || suggestion.song,
                artist_name: data.artist_name || suggestion.artist,
                song_key: data.song_key || data.original_key || 'C',
                content: data.content || '',
                capo: data.capo || 0,
                include_tabs: data.include_tabs !== undefined ? !!data.include_tabs : true,
                link: ''
            });
            // Remove from cache after opening
            delete batchSuggestionsCacheRef.current[cacheKey];
        };

        if (cached) {
            if (cached._failed) {
                // This suggestion is known to not be found - open empty manual modal
                setBatchFixData({ idx, song_name: suggestion.song, artist_name: suggestion.artist, song_key: 'C', content: '', capo: 0, include_tabs: true, link: '' });
                delete batchSuggestionsCacheRef.current[cacheKey];
            } else {
                // ⚡ Instant - data pre-fetched in background, open modal immediately
                openModal(cached);
            }
            return;
        }

        // Fallback: not yet cached — show per-item spinner, DON'T block other buttons
        setSuggestionsLoadingKeys(prev => new Set([...prev, cacheKey]));
        try {
            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: suggestion.song,
                    artist_name: suggestion.artist,
                    key: '',
                    version: 'Principal',
                    include_tabs: true,
                    capo: 0
                })
            });

            if (res.ok) {
                const data = await res.json();
                openModal(data);
            } else {
                // Song not found - open the manual modal so user can fix it themselves
                // (e.g. paste the URL, paste content, or adjust song name)
                setBatchFixData({
                    idx,
                    song_name: suggestion.song,
                    artist_name: suggestion.artist,
                    song_key: 'C',
                    content: '',
                    capo: 0,
                    include_tabs: true,
                    link: ''
                });
            }
        } catch (err) {
            console.error("Error trying suggestion:", err);
        } finally {
            setSuggestionsLoadingKeys(prev => {
                const next = new Set(prev);
                next.delete(cacheKey);
                return next;
            });
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) setCoverImage(file);
    };

    const handleGenerateDocument = async () => {
        if (songs.length === 0) return;
        const validSongs = songs.filter(s => s.content || s.status === 'success');

        setForgeMessage("Ajustando a Forja...");
        setBatchProgress({ current: 5, total: 100 });
        setIsGenerating(true);

        // Progress Simulation for visual feedback
        let simProgress = 5;
        const progressInterval = setInterval(() => {
            simProgress += Math.random() * 8;
            if (simProgress > 94) {
                clearInterval(progressInterval);
                simProgress = 94;
            }
            setBatchProgress({ current: Math.floor(simProgress), total: 100 });

            // Dynamic messages based on progress
            if (simProgress > 20 && simProgress < 40) setForgeMessage("Prensando o Metal...");
            if (simProgress > 40 && simProgress < 60) setForgeMessage("Polindo as Cifras...");
            if (simProgress > 60 && simProgress < 85) setForgeMessage("Temperando o Papel...");
            if (simProgress > 85) setForgeMessage("Finalizando a Peça...");
        }, 600);

        try {
            const formData = new FormData();
            formData.append('songs_data', JSON.stringify(validSongs));
            formData.append('export_format', exportFormat);
            formData.append('include_toc', includeToc ? 'true' : 'false');
            formData.append('include_dictionary', includeDictionary ? 'true' : 'false');
            formData.append('include_tabs', includeTabs ? 'true' : 'false');
            formData.append('sort_order', sortOrder);
            if (coverImage) formData.append('cover_image', coverImage);

            const res = await fetch(`${API_BASE_URL}/api/generate_book`, { method: 'POST', body: formData });

            if (!res.ok) {
                let errText = await res.text();
                try {
                    const errObj = JSON.parse(errText);
                    errText = errObj.detail || errText;
                } catch (e) { }
                throw new Error("Erro no servidor: " + errText);
            }

            setBatchProgress({ current: 100, total: 100 });
            const blob = await res.blob();
            setDownloadUrl(window.URL.createObjectURL(blob));
        } catch (err) {
            if (err.message.includes('fetch')) {
                alert("Falha de Conexão: O servidor pode estar acordando (estilo frio do Render). Aguarde 30 segundos e tente novamente.");
            } else {
                alert(err.message);
            }
        } finally {
            clearInterval(progressInterval);
            setIsGenerating(false);
        }
    };

    const removeSong = (index) => setSongs(songs.filter((_, i) => i !== index));
    const toggleChords = (index) => {
        const newSongs = [...songs];
        newSongs[index].show_chords = !newSongs[index].show_chords;
        setSongs(newSongs);
    };

    if (isAuthenticating) {
        return (
            <div className="min-h-screen bg-[#070709] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#ea580c]/20 border-t-[#ea580c] rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!authenticatedUser) {
        return <LoginScreen onAuthorized={(email) => {
            setAuthenticatedUser(email);
            syncCloudPlaylists(email);
        }} />;
    }

    return (
        <div className="min-h-screen bg-[#070709] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] text-slate-300 font-sans selection:bg-[#B87333]/30 selection:text-white overflow-x-hidden">
            {isGenerating && <MoltenLoading message={forgeMessage} current={batchProgress.current} total={batchProgress.total} />}
            <UserManagementModal isOpen={showUserManagement} onClose={() => setShowUserManagement(false)} API_BASE={`${API_BASE_URL}/api`} />

            {/* =========================================
                 GLOBAL HAMBURGER MENU 
                 ========================================= */}
            <div className={`fixed top-2 right-2 sm:top-4 sm:right-4 z-[600] no-print transition-all duration-300 ${isImmersiveMode && !showImmersiveControls && !showGlobalMenu ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>
                {/* Menu Toggle Button */}
                <button
                    onClick={() => setShowGlobalMenu(true)}
                    className="p-2 sm:p-3 bg-[#16161D]/80 backdrop-blur-xl border border-white/10 rounded-xl text-slate-400 hover:text-white hover:border-[#B87333]/40 transition-all shadow-2xl flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 hover:scale-105 active:scale-95"
                    title="Menu Global"
                >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>

                {/* Sliding Drawer */}
                {showGlobalMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[590]"
                            onClick={() => setShowGlobalMenu(false)}
                        />

                        {/* Dropdown/Drawer Content */}
                        <div className="absolute top-0 right-0 w-64 bg-[#12121A] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden z-[610] animate-in fade-in slide-in-from-top-2 duration-200">

                            
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/20">
                                <h3 className="text-sm font-black text-white uppercase italic tracking-widest">Opções</h3>
                                <button onClick={() => setShowGlobalMenu(false)} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Menu Items */}
                            <div className="flex flex-col py-2 max-h-[70vh] overflow-y-auto min-h-0 custom-scrollbar">
                                
                                {/* Always visible actions (Shared/Booklet/Batch) */}
                                <button onClick={() => { setBatchModalOpen(true); setShowGlobalMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all group">
                                    <UploadCloud className="w-4 h-4 text-slate-500 group-hover:text-[#B87333]" />
                                    Adicionar em Lote
                                </button>

                                <button onClick={() => { setCurrentExportList({ name: "Fila Atual", songs: songs || [] }); setExportStep(1); setDownloadUrl(null); setExportFormat('docx'); setCoverImage(null); setShowExportModal(true); setShowGlobalMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all group">
                                    <FileText className="w-4 h-4 text-slate-500 group-hover:text-[#B87333]" />
                                    Gerar Livreto
                                </button>

                                <button onClick={() => { handlePrint(); setShowGlobalMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all group">
                                    <Printer className="w-4 h-4 text-slate-500 group-hover:text-[#B87333]" />
                                    Impressão
                                </button>

                                <button onClick={() => { handleShareList(); setShowGlobalMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all group">
                                    <Share2 className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
                                    Compartilhar
                                </button>

                                <div className="my-2 h-px bg-white/5 mx-4" />

                                {/* Always visible */}
                                <button onClick={() => { setIsImmersiveMode(!isImmersiveMode); setShowImmersiveControls(false); setShowGlobalMenu(false); }} className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold transition-all group ${isImmersiveMode ? 'text-[#B87333] bg-[#B87333]/10' : 'text-slate-300 hover:text-white hover:bg-[#B87333]/15'}`}>
                                    {isImmersiveMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-slate-500 group-hover:text-white" />}
                                    {isImmersiveMode ? 'Sair Tela Cheia' : 'Tela Cheia'}
                                </button>

                                <button onClick={() => { setIsStageModeActive(s => !s); setShowGlobalMenu(false); }} className={`w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold transition-all group ${isStageModeActive ? 'text-red-400 bg-red-500/10' : 'text-slate-300 hover:text-white hover:bg-[#B87333]/15'}`}>
                                    <Music className={`w-4 h-4 ${isStageModeActive ? 'animate-pulse' : 'text-slate-500 group-hover:text-white'}`} />
                                    {isStageModeActive ? 'Sair do Modo Palco' : 'Modo Palco (Show)'}
                                </button>

                                <button onClick={() => { setShowSettingsModal(true); setShowGlobalMenu(false); }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all group">
                                    <Settings2 className="w-4 h-4 text-slate-500 group-hover:rotate-90 transition-transform duration-500" />
                                    Configurações
                                </button>

                                <div className="my-2 h-px bg-white/5 mx-4" />

                                <button onClick={() => {
                                    if (window.confirm("Deseja realmente sair?")) {
                                        localStorage.removeItem('ironchords_user_email');
                                        window.location.reload();
                                    }
                                }} className="w-full flex items-center gap-3 px-5 py-3.5 text-left text-[11px] font-bold text-red-500 hover:text-red-400 hover:bg-red-500/15 transition-all">
                                    <LogOut className="w-4 h-4" />
                                    Sair da Conta
                                </button>

                            </div>
                        </div>
                    </>
                )}
            </div>

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

                {(isFullScreenPlayer || mainNav === 'player') ? (
                    <div className="fixed inset-0 bg-[#070709] z-[100] flex flex-col animate-in fade-in zoom-in-95 duration-500">
                        {/* === STAGE MODE OVERLAY === */}
                        {isStageModeActive && (
                            <div className="fixed inset-0 z-[500] bg-black flex flex-col overflow-hidden">
                                {/* Blow flash feedback */}
                                {blowFlash && <div className="fixed inset-0 z-[600] bg-white/10 pointer-events-none animate-ping" />}
                                
                                {/* Song content — max size, no distractions */}
                                <div 
                                    ref={scrollContainerRef}
                                    className="flex-1 overflow-auto px-6 py-10 scrollbar-none"
                                    style={{ 
                                        fontSize: `var(--dynamic-zoom-fs, ${Math.max(playerFontSize, 22)}px)`
                                    }}
                                >
                                    <div className="max-w-4xl mx-auto space-y-1">
                                        {((currentSong?.include_tabs ?? includeTabs) === false
                                            ? removeTablatureBlocks(currentSong?.content || "")
                                            : currentSong?.content || "").split('\n').map((line, idx) => {
                                            const trimmed = line.trim();
                                            const isChord = !!(trimmed.length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, trimmed.length * 0.25));
                                            return (
                                                <div
                                                    key={idx}
                                                    data-line-index={idx}
                                                    className={`leading-snug transition-all duration-300 ${currentLineIndex === idx ? 'text-[#B87333]' : isChord ? 'text-[#e97c3a] opacity-70' : 'text-white'}`}
                                                    style={{ fontFamily: isChord ? 'monospace' : 'inherit', fontWeight: isChord ? 700 : 400 }}
                                                >
                                                    {trimmed || <br />}
                                                </div>
                                            );
                                        })}
                                        <div className="h-40" />
                                    </div>
                                </div>

                                {/* Stage controls — auto-hide, tap to reveal */}
                                <div className={`fixed bottom-0 inset-x-0 flex items-center justify-center gap-6 pb-8 pt-4 bg-gradient-to-t from-black/90 to-transparent transition-all duration-500 ${showStageControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
                                    <button onClick={() => { if (selectedManualIndex > 0) { setSelectedManualIndex(selectedManualIndex - 1); scrollContainerRef.current?.scrollTo({ top: 0 }); }}} className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                                        <SkipBack className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => { const s = !isAutoScrolling; setIsAutoScrolling(s); if (s) setIsDynamicSpeedActive(false); }} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isAutoScrolling ? 'bg-[#B87333] shadow-[0_0_30px_rgba(184,115,51,0.7)]' : 'bg-white text-[#070709]'}`}>
                                        {isAutoScrolling ? <Pause className="w-7 h-7 text-white" /> : <Play className="w-7 h-7 ml-1" />}
                                    </button>
                                    <button onClick={() => { if (selectedManualIndex < songs.length - 1) { setSelectedManualIndex(selectedManualIndex + 1); scrollContainerRef.current?.scrollTo({ top: 0 }); }}} className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                                        <SkipForward className="w-6 h-6" />
                                    </button>
                                    <button onClick={() => setIsStageModeActive(false)} className="absolute right-6 bottom-8 w-10 h-10 rounded-full bg-red-600/30 border border-red-500 text-red-400 flex items-center justify-center">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* PLAYER HEADER & CONSOLIDATED CONTROLS */}
                        <div className={`flex flex-col bg-black/95 border-b border-white/5 backdrop-blur-3xl shrink-0 no-print w-full z-[300] transition-all duration-300 ${isImmersiveMode && !showImmersiveControls ? '-translate-y-full opacity-0 absolute' : 'translate-y-0 opacity-100 relative'}`}>

                            {/* ── ROW A: Song Info Bar ── */}
                            <div className="flex items-center gap-3 px-4 pt-4 pb-3 w-full border-b border-white/5 bg-white/[0.02]">
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-base font-black text-white uppercase italic tracking-tighter leading-tight truncate">{currentSong?.song_name || '—'}</h2>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#B87333]/10 rounded-md border border-[#B87333]/20">
                                            <span className="text-[10px] font-black text-[#B87333] uppercase italic tracking-wider leading-none">
                                                {activePlaylistName || 'Avulsa'}
                                            </span>
                                        </div>
                                        <span className="text-white/10 text-[10px] select-none">•</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide truncate">{currentSong?.artist_name || 'Artista Desconhecido'}</span>
                                    </div>
                                </div>
                                {/* Utility menu — compact ⋯ button with dropdown for Compartilhar/Livreto/Em Lote */}
                                <div className="relative shrink-0">
                                    <button
                                        onClick={() => setIsPlayerUtilMenuOpen(s => !s)}
                                        className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                        title="Mais opções"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {isPlayerUtilMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-[290]" onClick={() => setIsPlayerUtilMenuOpen(false)} />
                                            <div className="absolute top-full right-0 mt-1 w-44 bg-[#16161D] border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.7)] overflow-hidden z-[400] animate-in fade-in zoom-in-95 duration-150">
                                                <button onClick={() => { handleShareList(); setIsPlayerUtilMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 border-b border-white/5 transition-all">
                                                    <Share2 className="w-4 h-4 text-blue-400" />
                                                    Compartilhar
                                                </button>
                                                <button onClick={() => { setCurrentExportList({ name: 'Fila Atual', songs: songs || [] }); setExportStep(1); setDownloadUrl(null); setExportFormat('docx'); setCoverImage(null); setShowExportModal(true); setIsPlayerUtilMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 border-b border-white/5 transition-all">
                                                    <FileText className="w-4 h-4 text-[#B87333]" />
                                                    Gerar Livreto
                                                </button>
                                                <button onClick={() => { setBatchModalOpen(true); setIsPlayerUtilMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/15 transition-all">
                                                    <UploadCloud className="w-4 h-4 text-slate-400" />
                                                    Adicionar em Lote
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button onClick={() => { setIsImmersiveMode(!isImmersiveMode); setShowImmersiveControls(false); }} className={`p-2 rounded-xl transition-all shrink-0 ${isImmersiveMode ? 'text-[#B87333] bg-[#B87333]/15' : 'text-slate-500 hover:text-white hover:bg-white/5'}`} title="Tela Cheia">
                                    {isImmersiveMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* ── ROW B: Playback Controls + Speed Slider ── */}
                            <div className="flex items-center gap-3 px-3 py-2 w-full">
                                {/* Speed slider — compact, left side */}
                                <div className="flex flex-col gap-1 flex-1 min-w-0 max-w-[90px] sm:max-w-[110px]">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide">Vel.</span>
                                        <span className="text-[9px] font-black text-[#B87333]">{scrollSpeed}x</span>
                                    </div>
                                    <input type="range" min="0.1" max="5" step="0.1" value={scrollSpeed} onChange={e => setScrollSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#B87333]" />
                                </div>

                                {/* Centered playback nav */}
                                <div className="flex items-center gap-2 sm:gap-3 shrink-0 mx-auto">
                                    <button onClick={() => { if (selectedManualIndex > 0) { setSelectedManualIndex(selectedManualIndex - 1); setCurrentLineIndex(0); currentLineIndexRef.current = 0; if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0; } }} disabled={selectedManualIndex === 0} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-slate-400 disabled:opacity-20 hover:bg-white/10 transition-all shrink-0">
                                        <SkipBack className="w-4 h-4 ml-0.5" />
                                    </button>
                                    <button onClick={() => { const s = !isAutoScrolling; setIsAutoScrolling(s); if (s) setIsDynamicSpeedActive(false); }} className={`rounded-full flex items-center justify-center transition-all shrink-0 shadow-lg ${isAutoScrolling ? 'bg-[#B87333] text-white shadow-[0_0_18px_rgba(184,115,51,0.55)] border-2 border-[#B87333]/60' : 'bg-white text-[#12121A] hover:bg-slate-100 border-2 border-white/80'}`} style={{ width: '3.25rem', height: '3.25rem' }}>
                                        {isAutoScrolling ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                                    </button>
                                    <button onClick={() => { if (selectedManualIndex < songs.length - 1) { setSelectedManualIndex(selectedManualIndex + 1); setCurrentLineIndex(0); currentLineIndexRef.current = 0; if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0; } }} disabled={selectedManualIndex === songs.length - 1} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5 text-slate-400 disabled:opacity-20 hover:bg-white/10 transition-all shrink-0">
                                        <SkipForward className="w-4 h-4 mr-0.5" />
                                    </button>
                                </div>

                                {/* Right: Reset only (Share is now in the sidebar) */}
                                <div className="flex items-center justify-end gap-1.5 flex-1">
                                    <button onClick={() => { setCurrentLineIndex(0); currentLineIndexRef.current = 0; if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0; }} className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 text-slate-500 hover:text-[#B87333] hover:bg-[#B87333]/10 transition-all shrink-0" title="Reiniciar do Topo">
                                        <RotateCcw className="w-3.5 h-3.5 -scale-x-100" />
                                    </button>
                                </div>
                            </div>

                            {/* ── ROW C: Tools Dashboard (2-row grid on mobile, row on desktop) ── */}
                            <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-2 px-3 pb-4 pt-3 w-full border-t border-white/[0.06] bg-black/40 backdrop-blur-3xl sticky bottom-0 z-[100] sm:relative">

                                {/* IA Sync — first chip, always visible */}
                                <button
                                    onClick={() => { const s = !isDynamicSpeedActive; setIsDynamicSpeedActive(s); if (s) { setIsAutoScrolling(false); startAudioTracker(); } else if (!isBlowDetectEnabled) { stopAudioTracker(); } }}
                                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all ${isDynamicSpeedActive ? 'bg-blue-500/20 border-blue-500 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.35)]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}
                                    title="IA Sync — sincroniza scroll com sua voz"
                                >
                                    <Zap className={`w-3.5 h-3.5 ${isDynamicSpeedActive ? 'animate-pulse' : ''}`} />
                                    <span>IA Sync</span>
                                </button>

                                {/* Blow Detection — second chip */}
                                <button
                                    onClick={() => setIsBlowDetectEnabled(s => !s)}
                                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all ${isBlowDetectEnabled ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}
                                    title="Soprar no microfone para avançar página"
                                >
                                    <Wind className={`w-3.5 h-3.5 ${isBlowDetectEnabled ? 'animate-pulse' : ''}`} />
                                    <span>Sopro</span>
                                </button>

                                {/* Blink Detection — third chip */}
                                <button
                                    onClick={() => setIsBlinkDetectEnabled(s => !s)}
                                    className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all ${isBlinkDetectEnabled ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.35)]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}
                                    title="Piscar 3x rápido para avançar a tela (Câmera)"
                                >
                                    {isBlinkDetectEnabled && faceTrackerStatus === 'rastreando' ? (
                                        <Eye className="w-3.5 h-3.5 animate-pulse text-purple-400" />
                                    ) : isBlinkDetectEnabled ? (
                                        <Activity className="w-3.5 h-3.5 animate-spin text-purple-400" />
                                    ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                        {!isBlinkDetectEnabled ? 'Piscar' : 
                                         faceTrackerStatus === 'carregando_ia' ? 'Baixando IA...' : 
                                         faceTrackerStatus === 'rastreando' ? 'Olhando' : 
                                         faceTrackerStatus === 'erro_camera' ? 'Câmera Negada' : 'Piscar'}
                                    </span>
                                </button>

                                {/* Bluetooth Pedal — third chip */}
                                <button
                                    className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border bg-white/5 border-white/10 text-slate-500 text-[10px] font-black uppercase tracking-wide cursor-default"
                                    title="Pedal BT — conecte um pedal/teclado Bluetooth: Space/↓ avança, ↑ volta"
                                >
                                    <Footprints className="w-3.5 h-3.5" />
                                    <span>Pedal BT</span>
                                </button>

                                {/* Capo */}
                                <div className="flex items-center shrink-0 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                                    <span className="px-2 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wide border-r border-white/10">Capo</span>
                                    <button onClick={() => { if (selectedManualIndex !== null && songs[selectedManualIndex]) { const n = [...songs]; n[selectedManualIndex].capo = Math.max(0, (n[selectedManualIndex].capo || 0) - 1); setSongs(n); } }} className="px-1.5 py-1.5 text-slate-400 hover:text-white transition-colors"><Minus className="w-3 h-3" /></button>
                                    <span className="text-sm font-black text-[#B87333] w-5 text-center leading-none">{currentSong?.capo || 0}</span>
                                    <button onClick={() => { if (selectedManualIndex !== null && songs[selectedManualIndex]) { const n = [...songs]; n[selectedManualIndex].capo = Math.min(11, (n[selectedManualIndex].capo || 0) + 1); setSongs(n); } }} className="px-1.5 py-1.5 text-slate-400 hover:text-white transition-colors"><Plus className="w-3 h-3" /></button>
                                </div>

                                {/* Transpose */}
                                <div className="flex items-center shrink-0 bg-white/5 rounded-full border border-[#B87333]/25 overflow-hidden">
                                    <span className="px-2 py-1.5 text-[10px] font-black text-[#B87333] uppercase tracking-wide border-r border-[#B87333]/15 flex items-center gap-1">
                                        {isTransposing ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Tom'}
                                    </span>
                                    <div className="relative flex items-center px-1.5">
                                        <select
                                            value={getSoundingKey(currentSong) || 'C'}
                                            disabled={isTransposing}
                                            onChange={(e) => {
                                                const targetKey = e.target.value;
                                                const currentKeyMatch = (getSoundingKey(currentSong) || 'C').match(/([A-G][b#]?)/i);
                                                const targetMatch = targetKey.match(/([A-G][b#]?)/i);
                                                if (currentKeyMatch && targetMatch) {
                                                    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                                                    const norm = k => { const flats = {'Db':'C#','Eb':'D#','Gb':'F#','Ab':'G#','Bb':'A#'}; let n=k.charAt(0).toUpperCase()+k.slice(1); return flats[n]||n; };
                                                    const cIdx = NOTES.indexOf(norm(currentKeyMatch[1]));
                                                    const tIdx = NOTES.indexOf(norm(targetMatch[1]));
                                                    if (cIdx !== -1 && tIdx !== -1) {
                                                        let diff = tIdx - cIdx;
                                                        if (diff > 6) diff -= 12;
                                                        if (diff < -6) diff += 12;
                                                        if (diff !== 0) transposeSong(selectedManualIndex, diff);
                                                    }
                                                }
                                            }}
                                            className="bg-transparent text-white font-black italic text-sm py-1.5 outline-none appearance-none cursor-pointer disabled:opacity-50 pr-4"
                                        >
                                            {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                        </select>
                                        <ChevronDown className="w-3 h-3 text-[#B87333] absolute right-0 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Undo Transpose */}
                                <button onClick={handleResetSongToOriginal} className="shrink-0 block p-1.5 rounded-full bg-white/5 border border-white/10 text-[#B87333] hover:bg-[#B87333] hover:text-white transition-all order-last md:order-none" title="Tom Original">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                {/* Tabs Toggle */}
                                <button onClick={() => {
                                    const next = !includeTabs;
                                    setIncludeTabs(next);
                                    if (selectedManualIndex !== null && songs[selectedManualIndex]) {
                                        const n = [...songs];
                                        n[selectedManualIndex] = { ...n[selectedManualIndex], include_tabs: next };
                                        setSongs(n);
                                    }
                                }}
                                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all ${includeTabs ? 'bg-[#B87333]/20 border-[#B87333]/60 text-[#B87333]' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}>
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Tabs</span>
                                </button>

                                {/* Versions */}
                                {currentPlayerVersions.length > 1 && (
                                    <div className="relative shrink-0 block">
                                        <button onClick={() => setIsPlayerVersionsOpen(!isPlayerVersionsOpen)} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-wide transition-all ${isPlayerVersionsOpen ? 'bg-[#B87333] border-[#B87333] text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25 hover:text-white'}`}>
                                            {playerVersionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layout className="w-3.5 h-3.5" />}
                                            <span>Versões</span>
                                        </button>
                                        {isPlayerVersionsOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[290] sm:hidden" onClick={() => setIsPlayerVersionsOpen(false)} />
                                                <div className="absolute top-full mt-2 left-0 w-48 bg-[#16161D] border border-[#B87333]/40 rounded-xl shadow-[0_0_20px_rgba(184,115,51,0.3)] overflow-hidden z-[400] max-h-48 overflow-y-auto">
                                                    {currentPlayerVersions.map((v, i) => (
                                                        <button key={v.key || i} onClick={() => { handleSwitchVersion(v.key); setIsPlayerVersionsOpen(false); }} className="w-full px-3 py-2.5 text-left text-[11px] font-bold text-slate-300 hover:text-white hover:bg-[#B87333]/20 border-b border-white/5 last:border-0">
                                                            {v.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                            </div>
                        </div>


                        <div className="flex-1 flex overflow-hidden relative">
                            {/* MOBILE BACKDROP FOR SIDEBAR */}
                            {!isSidebarCollapsed && (
                                <div 
                                    className="md:hidden absolute inset-0 z-[140] bg-black/60 backdrop-blur-sm transition-opacity"
                                    onClick={() => setIsSidebarCollapsed(true)}
                                />
                            )}

                            {/* PLAYER PLAYLIST SIDEBAR — hidden in immersive mode */}
                            <div className={`
                                ${isSidebarCollapsed ? '-translate-x-full md:translate-x-0 w-[85vw] md:w-20 px-4 md:px-3' : 'translate-x-0 w-[85vw] md:w-80 px-4 md:px-6'} 
                                ${isImmersiveMode ? 'hidden' : ''} 
                                bg-black/95 md:bg-black/40 backdrop-blur-3xl md:backdrop-blur-none border-r border-y-0 border-white/5 
                                flex flex-col py-6 space-y-6 shrink-0 absolute left-0 md:relative h-full z-[150] no-print 
                                transition-all duration-300 ease-in-out
                            `}>
                                {/* Toggle Button */}
                                <button
                                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                    className={`absolute ${isSidebarCollapsed ? '-right-14 md:-right-3' : '-right-5 md:-right-3'} top-6 w-12 h-12 md:w-6 md:h-6 bg-[#B87333] hover:bg-orange-500 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(184,115,51,0.6)] transition-all z-[200] border-[2px] border-white/10 opacity-50 hover:opacity-100 focus:opacity-100`}
                                    title={isSidebarCollapsed ? "Expandir Lista" : "Recolher Lista"}
                                >
                                    {isSidebarCollapsed ? <ChevronRight className="w-6 h-6 md:w-3.5 md:h-3.5 ml-1 md:ml-0" /> : <ChevronLeft className="w-6 h-6 md:w-3.5 md:h-3.5 mr-1 md:mr-0" />}
                                </button>

                                {/* --- SIDEBAR TABS --- */}
                                {!isSidebarCollapsed && (
                                    <div className="flex p-1 bg-black/40 rounded-xl border border-white/5 shadow-inner shrink-0">
                                        <button
                                            onClick={() => setPlayerSidebarTab('fila')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${playerSidebarTab === 'fila' ? 'bg-[#B87333] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            Fila
                                        </button>
                                        <button
                                            onClick={() => setPlayerSidebarTab('listas')}
                                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${playerSidebarTab === 'listas' ? 'bg-[#B87333] text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            Listas
                                        </button>
                                    </div>
                                )}


                                {playerSidebarTab === 'fila' && (
                                    <div className="flex flex-col flex-1 overflow-hidden space-y-6">
                                        {/* ——— SEARCH BAR (Feature 1) ——— */}
                                        {!isSidebarCollapsed && (
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar e adicionar música..."
                                                        value={playerSongSearch}
                                                        onChange={e => handlePlayerSongSearch(e.target.value)}
                                                        className="w-full bg-[#B87333] border border-[#B87333]/50 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg shadow-[#B87333]/20 transition-all"
                                                    />
                                                    {playerSongSearchLoading && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60 animate-spin" />}
                                                </div>
                                                {playerSongSuggestions.length > 0 && (
                                                    <div className="absolute z-[200] w-full mt-1 bg-[#16161D] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] overflow-hidden backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="max-h-[280px] overflow-y-auto">
                                                            {playerSongSuggestions.map((item, i) => {
                                                                const sKey = item.slug || `${item.song}-${item.artist}`;
                                                                const isAdding = addingSongSlug === sKey;

                                                                return (
                                                                    <button key={i} type="button"
                                                                        disabled={isAdding}
                                                                        onClick={() => handleAddSongFromSearch(item)}
                                                                        className={`w-full text-left px-4 py-3 hover:bg-[#B87333]/15 transition-all border-b border-white/5 last:border-none flex items-center justify-between group ${isAdding ? 'opacity-70 cursor-wait' : ''}`}
                                                                    >
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className="text-[11px] font-black text-white uppercase italic truncate group-hover:text-[#B87333]">{item.song}</span>
                                                                            <span className="text-[9px] text-slate-500 truncate">{item.artist}</span>
                                                                        </div>
                                                                        {isAdding ? (
                                                                            <RefreshCw className="w-3.5 h-3.5 text-[#B87333] animate-spin" />
                                                                        ) : (
                                                                            <Plus className="w-3.5 h-3.5 text-[#B87333] opacity-0 group-hover:opacity-100 shrink-0 ml-2" />
                                                                        )}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ——— HEADER: title + save button ——— */}
                                        <div className="flex flex-col space-y-3">
                                            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                                                <div className="flex items-center space-x-3" title="Fila de Execução">
                                                    <LayoutList className="w-5 h-5 text-[#B87333] shrink-0" />
                                                    {!isSidebarCollapsed && <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">Fila de Execução</h3>}
                                                </div>
                                                {!isSidebarCollapsed && (
                                                    <div className="flex items-center space-x-1">
                                                        <button onClick={() => {
                                                            if (window.confirm("Deseja realmente zerar toda a fila da forja?")) {
                                                                setSongs([]);
                                                                setManualPreviewSong(null);
                                                                setSelectedManualIndex(null);
                                                                setActivePlaylistName(null);
                                                            }
                                                        }} className="p-1.5 rounded-md text-slate-600 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Zerar Fila">
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => { setShowPlaylistManager(!showPlaylistManager); setSaveMode('new'); }} className={`p-1.5 rounded-md transition-all ${showPlaylistManager ? 'bg-[#B87333] text-white' : 'text-slate-600 hover:text-slate-400'}`} title="Salvar Setlist">
                                                            <Save className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Local Queue Search (Feature 2) */}
                                            {!isSidebarCollapsed && (
                                                <div className="relative group">
                                                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors ${queueSearchTerm ? 'text-[#B87333]' : 'text-slate-600'}`} />
                                                    <input
                                                        type="text"
                                                        placeholder="Localizar na fila..."
                                                        value={queueSearchTerm}
                                                        onChange={e => setQueueSearchTerm(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-8 py-2.5 text-[10px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/30 transition-all"
                                                    />
                                                    {queueSearchTerm && (
                                                        <button onClick={() => setQueueSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-white transition-all">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* ——— SAVE MODAL (Feature 3) ——— */}
                                        {!isSidebarCollapsed && showPlaylistManager && (
                                            <div className="bg-[#B87333]/10 border border-[#B87333]/30 p-4 rounded-2xl animate-in slide-in-from-top-4 duration-300 space-y-3">
                                                {/* Mode Tabs */}
                                                <div className="flex space-x-1 bg-black/40 p-1 rounded-xl">
                                                    <button onClick={() => setSaveMode('new')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${saveMode === 'new' ? 'bg-[#B87333] text-white' : 'text-slate-500 hover:text-white'}`}>✨ Nova</button>
                                                    <button onClick={() => setSaveMode('append')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all ${saveMode === 'append' ? 'bg-[#B87333] text-white' : 'text-slate-500 hover:text-white'}`}>➕ Adicionar em...</button>
                                                </div>

                                                {saveMode === 'new' ? (
                                                    <div className="flex space-x-2">
                                                        <input type="text" placeholder="Nome da Setlist..." value={playlistNameInput} onChange={e => setPlaylistNameInput(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Enter' && playlistNameInput.trim()) { const newList = { id: Date.now().toString(), name: playlistNameInput, songs: songs.map(s => ({ ...s })) }; const next = [...savedPlaylists, newList]; setSavedPlaylists(next); localStorage.setItem('iron_chords_playlists', JSON.stringify(next)); setActivePlaylistName(playlistNameInput); setPlaylistNameInput(''); setShowPlaylistManager(false); } }}
                                                            className="flex-1 bg-black/40 border border-[#B87333]/20 rounded-lg px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#B87333]/40" />
                                                        <button onClick={() => {
                                                            if (!playlistNameInput.trim()) return;
                                                            const newList = { id: Date.now().toString(), name: playlistNameInput, songs: songs.map(s => ({ ...s })) };
                                                            const next = [...savedPlaylists, newList];
                                                            setSavedPlaylists(next);
                                                            localStorage.setItem('iron_chords_playlists', JSON.stringify(next));
                                                            setActivePlaylistName(playlistNameInput);
                                                            setPlaylistNameInput('');
                                                            setShowPlaylistManager(false);
                                                        }} className="bg-[#B87333] text-white p-2 rounded-lg hover:bg-[#8B4513] transition-all shrink-0">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                                                        {savedPlaylists.length === 0 ? (
                                                            <p className="text-[9px] text-slate-600 italic text-center py-2">Nenhuma setlist salva</p>
                                                        ) : savedPlaylists.map(pl => (
                                                            <button key={pl.id} onClick={() => {
                                                                const merged = [...pl.songs, ...songs.filter(s => !pl.songs.some(ps => ps.song_name === s.song_name))];
                                                                const updated = savedPlaylists.map(p => p.id === pl.id ? { ...p, songs: merged } : p);
                                                                setSavedPlaylists(updated);
                                                                localStorage.setItem('iron_chords_playlists', JSON.stringify(updated));
                                                                setShowPlaylistManager(false);
                                                            }} className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-[#B87333]/20 border border-white/5 hover:border-[#B87333]/30 text-[10px] font-bold text-slate-400 hover:text-white uppercase italic transition-all flex items-center justify-between group">
                                                                <span className="truncate">{pl.name}</span>
                                                                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0 ml-1" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ——— SONG LIST (with trash + print) ——— */}
                                        <div className={`flex-1 overflow-y-auto pb-32 space-y-2 scrollbar-thin scrollbar-thumb-[#B87333]/20 ${isSidebarCollapsed ? 'pr-0' : 'pr-8 pl-1'}`}>
                                            {!isSidebarCollapsed && (
                                                <div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-black/20 to-transparent z-10" title="Zona de deslize" />
                                            )}
                                            {songs.map((s, idx) => {
                                                if (queueSearchTerm && !s.song_name.toLowerCase().includes(queueSearchTerm.toLowerCase())) return null;
                                                return (
                                                    <div key={idx} className="relative group/song flex items-center space-x-1">
                                                        {!isSidebarCollapsed && (
                                                            <div 
                                                                className="p-2 cursor-grab active:cursor-grabbing text-slate-700 hover:text-[#B87333] transition-colors shrink-0"
                                                                onTouchStart={(e) => { 
                                                                    dragItem.current = idx; 
                                                                    const parent = e.currentTarget.closest('[data-drag-index]');
                                                                    if (parent) parent.style.opacity = '0.5';
                                                                    e.currentTarget.style.touchAction = 'none';
                                                                }}
                                                                onMouseDown={() => (dragItem.current = idx)}
                                                                title="Arrastar para reordenar"
                                                            >
                                                                <GripVertical className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <button
                                                            draggable={!isSidebarCollapsed}
                                                            onDragStart={(e) => {
                                                                if (dragItem.current === null) dragItem.current = idx;
                                                            }}
                                                            onDragEnter={() => { dragOverItem.current = idx; setDragOverIdx(idx); }}
                                                            onDragEnd={handleSort}
                                                            onDragOver={(e) => e.preventDefault()}
                                                            onTouchMove={(e) => {
                                                                if (isSidebarCollapsed || dragItem.current === null) return;
                                                                const touchIndex = e.touches[0];
                                                                const hoverElement = document.elementFromPoint(touchIndex.clientX, touchIndex.clientY);
                                                                if (hoverElement) {
                                                                    const targetButton = hoverElement.closest('[data-drag-index]');
                                                                    if (targetButton) {
                                                                        const targetIdx = parseInt(targetButton.getAttribute('data-drag-index'), 10);
                                                                        if (!isNaN(targetIdx) && targetIdx !== dragOverItem.current) { 
                                                                            dragOverItem.current = targetIdx; 
                                                                            setDragOverIdx(targetIdx); 
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            onTouchEnd={(e) => {
                                                                if (isSidebarCollapsed) return;
                                                                const parents = document.querySelectorAll('[data-drag-index]');
                                                                parents.forEach(p => p.style.opacity = '1');
                                                                if (dragItem.current !== null && dragOverItem.current !== null) handleSort();
                                                                else { dragItem.current = null; dragOverItem.current = null; setDragOverIdx(null); }
                                                            }}
                                                            onClick={() => { setSelectedManualIndex(idx); setCurrentLineIndex(0); currentLineIndexRef.current = 0; }}
                                                            className={`flex-1 ${isSidebarCollapsed ? 'p-2 justify-center' : 'p-3'} rounded-2xl border transition-all text-left flex items-center ${isSidebarCollapsed ? 'space-x-0' : 'space-x-3'} relative overflow-hidden ${selectedManualIndex === idx ? 'bg-[#B87333] border-[#B87333] shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 hover:border-[#B87333]/30'} ${dragOverIdx === idx ? (dragItem.current !== null && dragOverItem.current !== null && dragItem.current < dragOverItem.current ? 'border-b-4 border-b-orange-500' : 'border-t-4 border-t-orange-500') : ''} ${!isSidebarCollapsed ? 'cursor-default' : ''}`}
                                                            title={isSidebarCollapsed ? `${idx + 1}. ${s.song_name}` : "Clique para tocar"}
                                                            data-drag-index={idx}
                                                        >
                                                            <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition-all ${selectedManualIndex === idx ? 'bg-white text-[#B87333]' : 'bg-black/60 text-slate-700 group-hover/song:text-white'}`}>{idx + 1}</div>
                                                            {!isSidebarCollapsed && (
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-[11px] font-black uppercase italic truncate tracking-tight ${selectedManualIndex === idx ? 'text-white' : 'text-slate-400 group-hover/song:text-slate-200'}`}>{s.song_name}</p>
                                                                    <p className={`text-[9px] font-bold uppercase truncate ${selectedManualIndex === idx ? 'text-white/60' : 'text-slate-600'}`}>{s.artist_name}</p>
                                                                </div>
                                                            )}
                                                        </button>
                                                        {!isSidebarCollapsed && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-0.5 opacity-0 group-hover/song:opacity-100 transition-all">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); const song = songs[idx]; setEditQueueSong({ idx, song_name: song.song_name, artist_name: song.artist_name, song_key: song.key || song.song_key || 'C', capo: song.capo || 0, include_tabs: song.include_tabs || false, content: song.content || '' }); }}
                                                                    className="p-1.5 rounded-lg bg-black/60 text-slate-500 hover:text-[#B87333] hover:bg-[#B87333]/10 transition-all"
                                                                    title="Editar música"
                                                                >
                                                                    <Edit3 className="w-3 h-3" />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSongFromQueue(idx); }}
                                                                    className="p-1.5 rounded-lg bg-black/60 text-red-900 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                                    title="Remover da fila"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="h-4" />
                                    </div>
                                )}

                                {/* ——— LISTAS TAB CONTENT ——— */}
                                {playerSidebarTab === 'listas' && (
                                    <div className="flex flex-col flex-1 overflow-hidden space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="relative shrink-0">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                                            <input type="text" placeholder="Buscar lista..." value={listSearchTerm} onChange={e => setListSearchTerm(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[11px] font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-[#B87333]/50 transition-all" />
                                        </div>
                                        <div className="flex-1 overflow-y-auto pb-32 pr-2 space-y-3 custom-scrollbar">
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
                                                            <button onClick={() => { setSongs(pl.songs.map(s => ({ ...s }))); setActivePlaylistName(pl.name); setPlayerSidebarTab('fila'); }} className="flex-1 py-2 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Carregar</button>
                                                            <button onClick={() => {
                                                                setEditingList(pl);
                                                                setEditListName(pl.name);
                                                            }} className="p-2 bg-white/5 hover:bg-[#B87333]/20 text-slate-500 hover:text-[#B87333] rounded-lg transition-all border border-white/5" title="Renomear Lista"><Edit3 className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => {
                                                                setSongs(pl.songs || []);
                                                                setCurrentExportList(pl);
                                                                setExportStep(1);
                                                                setDownloadUrl(null);
                                                                setExportFormat('docx');
                                                                setCoverImage(null);
                                                                setShowExportModal(true);
                                                            }} className="p-2 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg transition-all border border-[#B87333]/20" title="Gerar Livreto"><FileText className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => { setDeleteTarget({ type: 'lista', id: pl.id, name: pl.name }); setDeleteModalOpen(true); }} className="p-2 bg-white/5 hover:bg-red-600/20 text-slate-500 hover:text-red-400 rounded-lg transition-all border border-white/5"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                        <div className="h-4" />
                                    </div>
                                )}
                                {/* SIDEBAR FOOTER REMOVED (Moved to Global Menu) */}
                            </div>

                            {/* PLAYER LYRICS/CHORDS AREA */}
                            <div className="flex-1 relative flex flex-col bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]"
                                onMouseMove={() => {
                                    if (!isImmersiveMode) return;
                                    setShowImmersiveControls(true);
                                    if (immersiveHideTimerRef.current) clearTimeout(immersiveHideTimerRef.current);
                                    immersiveHideTimerRef.current = setTimeout(() => setShowImmersiveControls(false), 3000);
                                }}
                                onTouchStart={() => {
                                    if (!isImmersiveMode) return;
                                    setShowImmersiveControls(true);
                                    if (immersiveHideTimerRef.current) clearTimeout(immersiveHideTimerRef.current);
                                    immersiveHideTimerRef.current = setTimeout(() => setShowImmersiveControls(false), 3000);
                                }}
                            >
                                {/* Immersive mode exit button — always visible in immersive mode */}
                                {isImmersiveMode && (
                                    <button
                                        onClick={() => setIsImmersiveMode(false)}
                                        className="absolute top-4 right-4 z-[200] p-2.5 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl text-white hover:bg-white/10 transition-all shadow-2xl"
                                        title="Sair da Tela Cheia"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                                <div 
                                    ref={!isStageModeActive ? scrollContainerRef : null} 
                                    className="flex-1 overflow-auto overflow-x-auto p-4 md:p-16 scroll-smooth scrollbar-none pb-64 w-full"

                                    style={{ 
                                        fontSize: `var(--dynamic-zoom-fs, ${showPinchBar ? pinchLiveFontSize : playerFontSize}px)`
                                    }}
                                >

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
                                                <p className="text-2xl font-black uppercase italic tracking-widest">Tom: {getSoundingKey(currentSong)}</p>
                                            </div>
                                        </div>
                                        {((currentSong?.include_tabs ?? includeTabs) === false
                                            ? removeTablatureBlocks(currentSong?.content || "")
                                            : currentSong?.content || "").split('\n').map((line, lIdx, allLines) => {
                                                const trimmed = line.trim();
                                                const isChordLine = !!(line && trimmed.length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, trimmed.length * 0.25));

                                                // Smart highlight:
                                                // - A lyric line is active when currentLineIndex points to it
                                                // - The chord line directly above an active lyric is also active (paired)
                                                // - Purely instrumental chord-only sections are NEVER active
                                                const isLyricActive = !isChordLine && currentLineIndex === lIdx;
                                                const isPairedChordActive = isChordLine && (() => {
                                                    // Check if there's a lyric right below this chord that is the active line
                                                    let j = lIdx + 1;
                                                    while (j < allLines.length && (!allLines[j].trim() || isTablatureLine(allLines[j]))) j++;
                                                    const nextIsLyric = j < allLines.length && !isChordOnlyLine(allLines[j]);
                                                    return nextIsLyric && currentLineIndex === j;
                                                })();
                                                const isActive = isLyricActive || isPairedChordActive;

                                                // Past: only lyric lines count for the "past" fade
                                                const isPast = !isChordLine && lIdx < currentLineIndex;

                                                return (
                                                    <div
                                                        key={lIdx}
                                                        data-line-index={lIdx}
                                                        onClick={() => handleLineClick(lIdx)}
                                                        className={`py-1 px-4 rounded-xl cursor-pointer transition-all duration-500 flex items-center group relative
                                                        ${isActive ? 'bg-[#B87333]/30 scale-[1.08] z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/10' : 'hover:bg-white/5'}
                                                        ${isPast ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
                                                    `}
                                                    >
                                                        {isActive && <div className="absolute left-0 w-2 h-full bg-[#B87333] rounded-full shadow-[0_0_20px_rgba(184,115,51,0.8)] animate-pulse"></div>}
                                                        <pre className={`font-mono leading-relaxed whitespace-pre transition-colors duration-500
                                                        ${isActive ? 'text-white font-black' : isChordLine ? 'text-[#B87333] font-bold italic opacity-80' : 'text-slate-400 font-medium'}
                                                    `} style={{ fontSize: 'inherit' }}>
                                                            {isChordLine
                                                                ? renderChordLine(line, (chord, anchor, isPersistent) => setChordTooltip({ chord, anchor, isPersistent }), songs[selectedManualIndex]?.capo || 0)
                                                                : (line || ' ')}
                                                        </pre>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                            </div>

                            {/* === PINCH FONT SIZE VISUAL BAR === */}
                            <div className={`absolute bottom-[100px] left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-3xl border border-white/10 rounded-full px-5 py-2.5 shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex items-center justify-center gap-4 z-[350] transition-all duration-300 pointer-events-none ${showPinchBar ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
                                <span className="absolute -top-7 text-[10px] font-black tracking-widest text-[#B87333]">
                                    {Math.round(pinchLiveFontSize)}
                                </span>
                                <span className="text-white/40 text-[11px] font-black uppercase">A</span>
                                <div className="w-40 sm:w-56 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                                    <div 
                                        className="h-full bg-[#B87333] transition-all duration-75 relative"
                                        style={{ width: `${Math.max(0, Math.min(100, ((pinchLiveFontSize - 12) / (60 - 12)) * 100))}%` }}
                                    >
                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white rounded-full shadow-[0_0_10px_white]" />
                                    </div>
                                </div>
                                <span className="text-white text-[15px] font-black uppercase">A</span>
                            </div>

                            {/* KEY ANALYZER & IA SYNC STATUS */}
                            {micEnabled && isDynamicSpeedActive && (() => {
                                const songKey = getSongKey(currentSong);
                                const keyMatch = singerKey && songKey && singerKey.replace('#','').replace('b','').toUpperCase() === songKey.replace('#','').replace('b','').toUpperCase();
                                const isClose = singerKey && songKey && !keyMatch && (() => {
                                    const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
                                    const si = notes.indexOf(singerKey);
                                    const so = notes.indexOf(songKey);
                                    if (si === -1 || so === -1) return false;
                                    const diff = Math.min(Math.abs(si - so), 12 - Math.abs(si - so));
                                    return diff <= 2;
                                })();
                                return (
                                    <div className="absolute bottom-20 right-4 flex flex-col gap-2 z-[150] animate-in fade-in slide-in-from-right-4">
                                        {/* Key Analyzer Pill */}
                                        <div className="px-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-3 transition-all duration-500">
                                            {singerKey ? (
                                                <>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Você</span>
                                                        <span className={`text-lg font-black italic ${keyMatch ? 'text-green-400' : isClose ? 'text-amber-400' : 'text-red-400'}`}>{singerKey}</span>
                                                    </div>
                                                    <div className={`w-0.5 h-6 rounded-full ${keyMatch ? 'bg-green-500/50' : isClose ? 'bg-amber-500/50' : 'bg-red-500/50'}`} />
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Música</span>
                                                        <span className="text-lg font-black italic text-white/70">{songKey || '?'}</span>
                                                    </div>
                                                    <div className={`w-2 h-2 rounded-full ml-1 ${keyMatch ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : isClose ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}`} />
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <span className="text-[10px] font-bold text-slate-400 italic">Analisando tom...</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Live Transcript Preview */}
                                        {transcriptRaw && (
                                            <div className="px-3 py-1.5 bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-xl max-w-[200px]">
                                                <span className="text-[9px] font-bold text-blue-300/70 italic truncate block">🎤 {transcriptRaw.substring(0, 40)}{transcriptRaw.length > 40 ? '...' : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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
                        <button onClick={() => { resetSearchSession(); setIsFullScreenPlayer(false); setActiveTab('manual'); }} className="absolute top-10 right-10 p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-white opacity-0 hover:opacity-100 transition-all"><X className="w-8 h-8" /></button>
                    </div>
                ) : (
                    <main className="max-w-7xl mx-auto px-2 sm:px-6 pt-24 sm:pt-32 pb-20 relative">
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

                        <div className="selection-branch-root flex flex-col min-h-[600px] h-full">
                        <div className="no-print">

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
                                            <div className="flex items-center space-x-4">
                                                <div className="flex p-1.5 space-x-1.5 bg-black/60 rounded-2xl border border-white/5">
                                                    <button onClick={() => setActiveTab('manual')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'manual' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Plus className="w-3 h-3 mr-2 inline" /> Manual</button>
                                                    <button onClick={() => setActiveTab('acervo')} className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'acervo' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}><Database className="w-3 h-3 mr-2 inline" /> Acervo</button>
                                                </div>
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
                                                                    <select
                                                                        value={songVersion}
                                                                        onChange={e => {
                                                                            const v = e.target.value;
                                                                            setSongVersion(v);
                                                                            // Trigger search immediately with the new version as override
                                                                            handleManualSubmit(null, null, null, null, v);
                                                                        }}
                                                                        className="w-full bg-black/60 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold appearance-none"
                                                                    >
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
                                                            <div className="flex items-center space-x-3">
                                                                <button type="submit" disabled={manualLoading} className="flex-1 py-4 bg-[#B87333] hover:bg-[#8B4513] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95">Buscar</button>
                                                                <button type="button" onClick={resetSearchSession} className="p-4 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-2xl text-slate-500 hover:text-red-500 transition-all" title="Limpar Sessão"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
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
                                                                                onClick={() => {
                                                                                    const nextVal = !(manualPreviewSong.include_tabs ?? includeTabs);
                                                                                    setIncludeTabs(nextVal);
                                                                                    setManualPreviewSong(prev => ({ ...prev, include_tabs: nextVal }));
                                                                                }}
                                                                                className={`w-11 h-9 rounded-lg flex items-center justify-center transition-all border ${(manualPreviewSong.include_tabs ?? includeTabs) ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
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
                                                                                <button onClick={() => {
                                                                                    setManualCapo(prev => {
                                                                                        const next = Math.max(0, prev - 1);
                                                                                        setManualPreviewSong(s => ({ ...s, capo: next }));
                                                                                        return next;
                                                                                    });
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3 h-3" /></button>
                                                                                <span className="text-[10px] font-black text-white w-4 text-center">{manualPreviewSong.capo ?? manualCapo}</span>
                                                                                <button onClick={() => {
                                                                                    setManualCapo(prev => {
                                                                                        const next = Math.min(12, prev + 1);
                                                                                        setManualPreviewSong(s => ({ ...s, capo: next }));
                                                                                        return next;
                                                                                    });
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Tom */}
                                                                        <div className="flex flex-col items-center">
                                                                            <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Tom</span>
                                                                            <div className="flex items-center space-x-1.5 bg-black/40 p-1 rounded-lg border border-white/5">
                                                                                <button onClick={async () => {
                                                                                    const currentKey = manualPreviewSong.sounding_key || manualPreviewSong.song_key || 'C';
                                                                                    const origKeyStr = manualPreviewSong._orig_key || manualPreviewSong.song_key || currentKey;
                                                                                    const origContent = manualPreviewSong._orig_content || manualPreviewSong.content || '';

                                                                                    // Calculate new target key
                                                                                    const match = currentKey.match(/^[A-G][b#]?/);
                                                                                    const root = match ? match[0] : 'C';
                                                                                    const currentIdx = KEYS.indexOf(root);
                                                                                    let newTargetKey = currentKey;
                                                                                    if (currentIdx !== -1) {
                                                                                        const newIdx = (currentIdx - 1 + 12) % 12;
                                                                                        newTargetKey = currentKey.replace(root, NOTES[newIdx]);
                                                                                    }

                                                                                    const matchOrig = origKeyStr.match(/^[A-G][b#]?/);
                                                                                    const rootOrig = matchOrig ? matchOrig[0] : 'C';
                                                                                    const targetMatch = newTargetKey.match(/^[A-G][b#]?/);
                                                                                    const targetRoot = targetMatch ? targetMatch[0] : 'C';
                                                                                    const diff = ((KEY_SEMITONES[targetRoot] ?? 0) - (KEY_SEMITONES[rootOrig] ?? 0) + 12) % 12;

                                                                                    try {
                                                                                        const res = await fetch(`${API_BASE_URL}/api/transpose`, {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: origContent, current_key: origKeyStr, semitones: diff })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...manualPreviewSong, content: data.transposed_content, sounding_key: newTargetKey });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronDown className="w-3 h-3" /></button>
                                                                                <div className="flex flex-col items-center">
                                                                                    <span className="text-[10px] font-black text-white w-6 text-center italic">{manualPreviewSong.sounding_key || manualPreviewSong.song_key}</span>
                                                                                    <span className="text-[7px] font-black text-slate-700 uppercase tracking-widest mt-0.5">({manualPreviewSong.original_key || manualPreviewSong.song_key})</span>
                                                                                </div>
                                                                                <button onClick={async () => {
                                                                                    const currentKey = manualPreviewSong.sounding_key || manualPreviewSong.song_key || 'C';
                                                                                    const origKeyStr = manualPreviewSong._orig_key || manualPreviewSong.song_key || currentKey;
                                                                                    const origContent = manualPreviewSong._orig_content || manualPreviewSong.content || '';

                                                                                    // Calculate new target key
                                                                                    const match = currentKey.match(/^[A-G][b#]?/);
                                                                                    const root = match ? match[0] : 'C';
                                                                                    const currentIdx = KEYS.indexOf(root);
                                                                                    let newTargetKey = currentKey;
                                                                                    if (currentIdx !== -1) {
                                                                                        const newIdx = (currentIdx + 1) % 12;
                                                                                        newTargetKey = currentKey.replace(root, NOTES[newIdx]);
                                                                                    }

                                                                                    const matchOrig = origKeyStr.match(/^[A-G][b#]?/);
                                                                                    const rootOrig = matchOrig ? matchOrig[0] : 'C';
                                                                                    const targetMatch = newTargetKey.match(/^[A-G][b#]?/);
                                                                                    const targetRoot = targetMatch ? targetMatch[0] : 'C';
                                                                                    const diff = ((KEY_SEMITONES[targetRoot] ?? 0) - (KEY_SEMITONES[rootOrig] ?? 0) + 12) % 12;

                                                                                    try {
                                                                                        const res = await fetch(`${API_BASE_URL}/api/transpose`, {
                                                                                            method: 'POST',
                                                                                            headers: { 'Content-Type': 'application/json' },
                                                                                            body: JSON.stringify({ content: origContent, current_key: origKeyStr, semitones: diff })
                                                                                        });
                                                                                        const data = await res.json();
                                                                                        if (data.transposed_content) {
                                                                                            setManualPreviewSong({ ...manualPreviewSong, content: data.transposed_content, sounding_key: newTargetKey });
                                                                                        }
                                                                                    } catch (err) { console.error(err); }
                                                                                }} className="p-1 text-slate-500 hover:text-white transition-all"><ChevronUp className="w-3 h-3" /></button>
                                                                            </div>
                                                                        </div>

                                                                        {/* Zoom & Scroll */}
                                                                        <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
                                                                            <div className="flex items-center space-x-1 bg-white/5 border border-white/5 rounded-xl p-0.5">
                                                                                <button onClick={() => setManualFontSize(prev => Math.max(12, prev - 1))} className="p-1 px-2 text-slate-500 hover:text-white transition-all font-black text-[10px]" title="Diminuir Zoom (Letra)">A-</button>
                                                                                <button onClick={() => setManualFontSize(prev => Math.min(60, prev + 1))} className="p-1 px-2 text-slate-500 hover:text-white transition-all font-black text-[10px]" title="Aumentar Zoom (Letra)">A+</button>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setIsManualAutoScrolling(!isManualAutoScrolling)}
                                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isManualAutoScrolling ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/40' : 'bg-white/5 text-slate-500 hover:text-white'}`}
                                                                            >
                                                                                {isManualAutoScrolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                                                            </button>
                                                                            <div className="w-16 hidden sm:block">
                                                                                <input type="range" min="0.1" max="5" step="0.1" value={manualScrollSpeed} onChange={(e) => setManualScrollSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#B87333]" />
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Right: Actions */}
                                                                    <div className="flex items-center space-x-3 border-l border-white/10 pl-6">
                                                                        {/* Add to List Button */}
                                                                        <button
                                                                            onClick={() => {
                                                                                if (manualPreviewSong && !songs.some(s => s.song_name === manualPreviewSong.song_name && s.artist_name === manualPreviewSong.artist_name)) {
                                                                                    const toAdd = {
                                                                                        ...manualPreviewSong,
                                                                                        _orig_key: manualPreviewSong._orig_key || manualPreviewSong.song_key || manualPreviewSong.original_key || 'C',
                                                                                        _orig_content: manualPreviewSong._orig_content || manualPreviewSong.content || ''
                                                                                    };
                                                                                    setSongs(prev => [...prev, toAdd]);
                                                                                }
                                                                                setSongName('');
                                                                                setArtistName('');
                                                                            }}
                                                                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center space-x-2 shrink-0"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                            <span>Add à Forja</span>
                                                                        </button>

                                                                        {/* Fullscreen/Exit/Print */}
                                                                        <div className="flex items-center space-x-2">
                                                                            <button
                                                                                onClick={resetSearchSession}
                                                                                className="w-10 h-10 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-white/5 flex items-center justify-center"
                                                                                title="Limpar Sessão (Nova Busca)"
                                                                            >
                                                                                <Trash2 className="w-5 h-5" />
                                                                            </button>
                                                                            <div className="flex items-center space-x-1 bg-white/5 border border-white/5 rounded-xl p-0.5">
                                                                                <button onClick={() => setPrintFontSize(prev => Math.max(10, prev - 1))} className="p-2 text-slate-500 hover:text-white transition-all" title="Diminuir Fonte p/ Impressão"><Minus className="w-3.5 h-3.5" /></button>
                                                                                <button
                                                                                    onClick={handlePrint}
                                                                                    className="px-2 py-2 text-slate-400 hover:text-white transition-all flex items-center space-x-2"
                                                                                    title="Imprimir Cifra"
                                                                                >
                                                                                    <Printer className="w-5 h-5" />
                                                                                    <span className="text-[10px] font-black">{printFontSize}</span>
                                                                                </button>
                                                                                <button onClick={() => setPrintFontSize(prev => Math.min(30, prev + 1))} className="p-2 text-slate-500 hover:text-white transition-all" title="Aumentar Fonte p/ Impressão"><Plus className="w-3.5 h-3.5" /></button>
                                                                            </div>
                                                                            <button
                                                                                onClick={async () => {
                                                                                    if (manualPreviewSong) {
                                                                                        const alreadySaved = acervo.some(
                                                                                            a => a.song_name.toLowerCase() === manualPreviewSong.song_name.toLowerCase()
                                                                                        );
                                                                                        if (alreadySaved) {
                                                                                            setShowSaveConflict(true);
                                                                                            setTimeout(() => setShowSaveConflict(false), 2500);
                                                                                            return;
                                                                                        }
                                                                                        const res = await saveOneChordToAcervo(manualPreviewSong, true);
                                                                                        if (res.success) {
                                                                                            fetchAcervo();
                                                                                            setShowSaveSuccess(true);
                                                                                            setTimeout(() => setShowSaveSuccess(false), 2000);
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className="px-5 py-3 bg-[#B87333] hover:bg-[#A86323] text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg active:scale-95 flex items-center space-x-2 shrink-0"
                                                                                title="Salvar no Acervo"
                                                                            >
                                                                                <Archive className="w-4 h-4" />
                                                                                <span>Salvar no Acervo</span>
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
                                                                    flex-1 overflow-auto overflow-x-auto ${isManualFullscreen ? 'p-4 md:p-20 pt-16 md:pt-24' : 'p-4 md:p-10'}
                                                                    scrollbar-none pb-32 transition-all w-full
                                                                `}
                                                                style={{ 
                                                                    maxHeight: isManualFullscreen ? '100vh' : '500px',
                                                                    fontSize: `var(--dynamic-zoom-fs, ${showPinchBar ? pinchLiveFontSize : manualFontSize}px)`
                                                                }}
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
                                                                            <p className="text-2xl font-black uppercase italic tracking-widest">Tom: {getSoundingKey(manualPreviewSong)}</p>
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
                                                                        {((manualPreviewSong?.include_tabs ?? includeTabs) === false
                                                                            ? removeTablatureBlocks(manualPreviewSong?.content || "")
                                                                            : manualPreviewSong?.content || "").split('\n').map((line, lIdx, allLines) => {
                                                                                const isChordLine = !!(line && line.trim().length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, line.trim().length * 0.5));

                                                                                return (
                                                                                    <pre key={lIdx} className={`font-mono leading-relaxed whitespace-pre break-inside-avoid ${isChordLine ? 'text-[#B87333] print:text-[#B87333] font-black italic tracking-tight mb-0' : 'text-slate-300 print:text-gray-900 font-medium mb-1'}`} style={{ fontSize: 'inherit' }}>
                                                                                        {isChordLine
                                                                                            ? renderChordLine(line, (chord, anchor, isPersistent) => setChordTooltip({ chord, anchor, isPersistent }), manualPreviewSong.capo || 0)
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
                                                                    <button onClick={() => {
                                                                        if (window.confirm("Deseja realmente zerar toda a fila da forja?")) {
                                                                            setSongs([]);
                                                                            setManualPreviewSong(null);
                                                                            setSelectedManualIndex(null);
                                                                            setActivePlaylistName(null);
                                                                        }
                                                                    }} className="px-4 py-1.5 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-500 border border-white/10 hover:border-red-500/30 rounded-full font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2" title="Zerar Fila">
                                                                        <RotateCcw className="w-3 h-3" />
                                                                        <span>Zerar</span>
                                                                    </button>
                                                                    <button onClick={() => setSaveListModalOpen(true)} className="px-4 py-1.5 bg-white/5 hover:bg-[#B87333]/40 text-slate-300 hover:text-white border border-white/10 hover:border-[#B87333]/30 rounded-full font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2">
                                                                        <Save className="w-3 h-3" />
                                                                        <span>Salvar Lista</span>
                                                                    </button>
                                                                    <button onClick={() => {
                                                                        setCurrentExportList({ name: "Fila Atual", songs: songs || [] });
                                                                        setExportStep(1);
                                                                        setDownloadUrl(null);
                                                                        setExportFormat('docx');
                                                                        setCoverImage(null);
                                                                        setShowExportModal(true);
                                                                    }} className="px-4 py-1.5 bg-[#B87333]/20 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/30 rounded-full font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2">
                                                                        <FileText className="w-3 h-3" />
                                                                        <span>Gerar Livreto</span>
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
                                                                                            const res = await fetch(`${API_BASE_URL}/api/music/manual`, {
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
                                                            <div key={idx} className={`bg-black/40 border p-6 rounded-[32px] flex flex-col transition-all group relative overflow-hidden gap-5 ${selectedAcervoItems.includes(item.id) ? 'border-[#B87333]/50 bg-[#B87333]/5' : 'border-white/5 hover:border-[#B87333]/30'}`}>
                                                                <div className={`absolute top-0 left-0 w-1 h-full transition-all ${selectedAcervoItems.includes(item.id) ? 'bg-[#B87333]' : 'bg-[#B87333]/20 group-hover:bg-[#B87333]'}`}></div>

                                                                <div className="flex items-start justify-between w-full">
                                                                    {/* Checkbox */}
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

                                                                    <div className="flex-1 min-w-0 px-4">
                                                                        <p className="text-base font-black text-white uppercase italic truncate leading-tight">{item.song_name}</p>
                                                                        <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest transition-colors group-hover:text-[#B87333]/80 truncate">
                                                                            {item.artist_name} • {item.song_key}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {item.capo > 0 && (
                                                                    <div className="px-4">
                                                                        <span className="inline-flex px-3 py-1 bg-[#B87333]/15 text-[#B87333] rounded-lg font-black tracking-[0.2em] text-[8px] border border-[#B87333]/20 uppercase">
                                                                            Capo: {item.capo}ª Casa
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-2 px-2 pt-2 border-t border-white/5 w-full justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            onClick={() => handlePrint(item)}
                                                                            className="w-10 h-10 bg-white/5 hover:bg-[#ea580c] text-slate-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-95"
                                                                            title="Imprimir Cifra"
                                                                        >
                                                                            <Printer className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            const NOTES_ARR = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                                                                            let s_key = item.song_key;
                                                                            if (item.capo > 0) {
                                                                                let baseMatch = s_key.match(/([A-G][b#]?)/i);
                                                                                let base = baseMatch ? baseMatch[1] : null;
                                                                                if (base) {
                                                                                    let idx = NOTES_ARR.indexOf(base);
                                                                                    if (idx !== -1) {
                                                                                        let final_idx = (idx + item.capo) % 12;
                                                                                        s_key = s_key.replace(base, NOTES_ARR[final_idx]);
                                                                                    }
                                                                                }
                                                                            }
                                                                            setSongs([...songs, {
                                                                                ...item,
                                                                                requested_key: item.song_key,
                                                                                sounding_key: s_key,
                                                                                _orig_key: item.song_key,
                                                                                _orig_content: item.content || '',
                                                                                capo: item.capo || 0,
                                                                                show_chords: true,
                                                                                include_tabs: item.include_tabs ?? true
                                                                            }]);
                                                                        }} className="w-10 h-10 bg-white/5 hover:bg-[#B87333] text-slate-500 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-90" title="Adicionar à Forja">
                                                                            <Plus className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button onClick={() => handleEditOpen(item.id)} className="w-10 h-10 bg-white/5 hover:bg-blue-600 text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-90" title="Editar">
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteAcervo(item.id, item.song_name)} className="w-10 h-10 bg-white/5 hover:bg-red-600 text-slate-600 hover:text-white rounded-xl flex items-center justify-center transition-all border border-white/5 active:scale-90" title="Excluir">
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
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


                             {/* Modals end */}






























































                            {/* Save Success Animation */}
                            {
                                showSaveSuccess && (
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
                                )
                            }

                            {/* Save Conflict Notification */}
                            {
                                showSaveConflict && (
                                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-none">
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-10 rounded-[40px] shadow-[0_0_50px_rgba(234,179,8,0.3)] flex flex-col items-center animate-in zoom-in-50 duration-500 spring-gentle">
                                            <div className="w-24 h-24 bg-yellow-500/20 rounded-full flex items-center justify-center relative mb-6">
                                                <div className="absolute inset-0 bg-yellow-500/20 rounded-full animate-pulse"></div>
                                                <AlertCircle className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)]" />
                                            </div>
                                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md">Atenção</h2>
                                            <p className="text-yellow-400/80 font-bold uppercase tracking-[0.2em] text-xs mt-2">A música já está salva no acervo</p>
                                        </div>
                                    </div>
                                )}

                            {/* Edit Acervo Modal */}
                            {
                                editingChord && (
                                    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300 p-4">
                                        <div className="bg-[#16161D] border border-[#B87333]/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-6xl flex flex-col max-h-[90vh]">
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
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tom Original</label>
                                                        <div className="flex items-center space-x-2">
                                                            <select
                                                                value={editFormData.song_key}
                                                                onChange={e => {
                                                                    const oldKey = editFormData.song_key;
                                                                    const newKey = e.target.value;
                                                                    const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
                                                                    const oldIdx = NOTES.indexOf(oldKey);
                                                                    const newIdx = NOTES.indexOf(newKey);
                                                                    if (oldIdx !== -1 && newIdx !== -1) {
                                                                        const diff = newIdx - oldIdx;
                                                                        handleEditTranspose(diff);
                                                                    } else {
                                                                        setEditFormData({ ...editFormData, song_key: newKey });
                                                                    }
                                                                }}
                                                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all"
                                                            >
                                                                {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                                            </select>
                                                            <div className="flex flex-col space-y-1">
                                                                <button onClick={() => handleEditTranspose(1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all" title="Subir Semitom"><ChevronUp className="w-4 h-4" /></button>
                                                                <button onClick={() => handleEditTranspose(-1)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all" title="Baixar Semitom"><ChevronDown className="w-4 h-4" /></button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Capo</label>
                                                        <div className="flex items-center space-x-3">
                                                            <select value={editFormData.capo} onChange={e => setEditFormData({ ...editFormData, capo: parseInt(e.target.value) })} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all">
                                                                <option value={0} className="bg-[#1A1A1A]">Sem Capo</option>
                                                                {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1} className="bg-[#1A1A1A]">Casa {i + 1}</option>)}
                                                            </select>
                                                            {editFormData.capo > 0 && (
                                                                <div className="px-4 py-2 bg-[#B87333]/10 border border-[#B87333]/30 rounded-xl">
                                                                    <span className="text-[8px] font-black text-[#B87333] uppercase block leading-none mb-1">Tom Resultante</span>
                                                                    <span className="text-sm font-black text-white italic">{getSoundingKey({ song_key: editFormData.song_key, capo: editFormData.capo })}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tablaturas</label>
                                                        <button
                                                            onClick={() => setEditFormData(prev => ({ ...prev, include_tabs: !prev.include_tabs }))}
                                                            className={`w-full py-4 rounded-xl transition-all border flex items-center justify-center space-x-3 font-bold uppercase tracking-widest text-[10px] ${editFormData.include_tabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/40 border-white/5 text-slate-600 hover:text-slate-400'}`}
                                                        >
                                                            {editFormData.include_tabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                            <span>{editFormData.include_tabs ? "Ocultar Tabs" : "Mostrar Tabs"}</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Cifra</label>
                                                    <div className="relative group/editor">
                                                        <textarea
                                                            value={editFormData.include_tabs ? editFormData.content : removeTablatureBlocks(editFormData.content)}
                                                            onChange={e => {
                                                                if (editFormData.include_tabs) {
                                                                    setEditFormData({ ...editFormData, content: e.target.value });
                                                                }
                                                            }}
                                                            readOnly={!editFormData.include_tabs}
                                                            className={`w-full bg-black/60 border rounded-2xl px-6 py-6 text-white outline-none font-mono text-xs leading-relaxed sm:min-h-[600px] min-h-[40vh] transition-all scrollbar-thin shadow-inner ${!editFormData.include_tabs ? 'border-white/5 cursor-not-allowed opacity-80' : 'border-white/10 hover:border-white/20 focus:border-[#B87333]/50'}`}
                                                            spellCheck="false"
                                                        />
                                                        {!editFormData.include_tabs && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
                                                                <div className="bg-black/80 border border-[#B87333]/50 px-4 py-2 rounded-xl flex items-center space-x-2">
                                                                    <Eye className="w-4 h-4 text-[#B87333]" />
                                                                    <span className="text-[10px] font-bold text-white uppercase italic">Ative as Tabs para Editar</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
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
                                )
                            }
                        </div>
                    </div>
                </main>
            )}

            {/* SettingsModal - Always rendered, visibility controlled by isOpen */}
            <SettingsModal
                isOpen={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                includeToc={includeToc}
                setIncludeToc={setIncludeToc}
                includeDictionary={includeDictionary}
                setIncludeDictionary={setIncludeDictionary}
                authenticatedUser={authenticatedUser}
                setShowUserManagement={setShowUserManagement}
                deferredPrompt={deferredPrompt}
                handleInstallPWA={handleInstallPWA}
            />

            {/* Export Livreto Modal */}
            {
                showExportModal && (
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
                                {/* STEP 1: CONFIGURAÇÕES DA FORJA */}
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
                                                            {['docx'].map(fmt => (
                                                                <button
                                                                    key={fmt}
                                                                    onClick={() => setExportFormat(fmt)}
                                                                    className={`p-6 rounded-2xl border transition-all text-left flex items-center justify-between group ${exportFormat === fmt ? 'bg-[#B87333] border-[#B87333] shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 hover:border-[#B87333]/40'}`}
                                                                >
                                                                    <div>
                                                                        <p className={`text-sm font-black uppercase tracking-widest transition-colors ${exportFormat === fmt ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                                                                            Microsoft Word (.docx)
                                                                        </p>
                                                                        <p className={`text-[10px] font-bold mt-1 uppercase ${exportFormat === fmt ? 'text-white/60' : 'text-slate-600'}`}>
                                                                            Otimizado para edição e impressão (PDF só vis impressão local)
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
                                                            <Settings2 className="w-5 h-5 text-[#B87333]" />
                                                            <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Opções do Livreto</h3>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-[#B87333]/40 transition-all group">
                                                                <div>
                                                                    <p className="text-sm font-black text-white uppercase tracking-widest">Incluir Sumário</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Com páginas clicáveis (TOC)</p>
                                                                </div>
                                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${includeToc ? 'bg-[#B87333]' : 'bg-slate-700'}`}>
                                                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeToc ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                                </div>
                                                                <input type="checkbox" className="hidden" checked={includeToc} onChange={(e) => setIncludeToc(e.target.checked)} />
                                                            </label>

                                                            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-[#B87333]/40 transition-all group">
                                                                <div>
                                                                    <p className="text-sm font-black text-white uppercase tracking-widest">Dicionário de Acordes</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Desenhos no fim de cada música</p>
                                                                </div>
                                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${includeDictionary ? 'bg-[#B87333]' : 'bg-slate-700'}`}>
                                                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeDictionary ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                                </div>
                                                                <input type="checkbox" className="hidden" checked={includeDictionary} onChange={(e) => setIncludeDictionary(e.target.checked)} />
                                                            </label>

                                                            <label className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:border-[#B87333]/40 transition-all group">
                                                                <div>
                                                                    <p className="text-sm font-black text-white uppercase tracking-widest">Incluir Tablaturas</p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Manter solos e riffs no livreto</p>
                                                                </div>
                                                                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${includeTabs ? 'bg-[#B87333]' : 'bg-slate-700'}`}>
                                                                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${includeTabs ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                                                </div>
                                                                <input type="checkbox" className="hidden" checked={includeTabs} onChange={(e) => setIncludeTabs(e.target.checked)} />
                                                            </label>


                                                            <div className="pt-4 border-t border-white/5">
                                                                <p className="text-[10px] font-black text-[#B87333] uppercase tracking-[0.3em] mb-4">Ordem das Músicas</p>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    <button
                                                                        onClick={() => setSortOrder('alphabetical')}
                                                                        className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'alphabetical' ? 'bg-[#B87333] border-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                                                                    >
                                                                        Alfabética
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setSortOrder('queue')}
                                                                        className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${sortOrder === 'queue' ? 'bg-[#B87333] border-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                                                                    >
                                                                        Ordem da Fila
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

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

                                {/* STEP 2: FINALIZAÇÃO */}
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
                                                            Todas as suas {currentExportList?.songs?.length || songs.length} peças foram ajustadas e cronometradas. <br />
                                                            Clique abaixo para iniciar a geração do seu material exclusivo.
                                                        </p>
                                                    </div>

                                                    <button
                                                        disabled={(currentExportList?.songs?.length || songs.length) === 0 || isGenerating}
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

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                                        <a
                                                            href={downloadUrl}
                                                            onClick={(e) => {
                                                                // Programmatic fallback for stubborn mobile browsers
                                                                if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return;
                                                                
                                                                const link = document.createElement('a');
                                                                link.href = downloadUrl;
                                                                link.download = `IronChords_${(currentExportList?.name || 'Livreto').replace(/\s+/g, '_')}.${exportFormat === 'pdf' ? 'pdf' : exportFormat === 'both' ? 'zip' : 'docx'}`;
                                                                document.body.appendChild(link);
                                                                link.click();
                                                                document.body.removeChild(link);
                                                            }}
                                                            download={`IronChords_${(currentExportList?.name || 'Livreto').replace(/\s+/g, '_')}.${exportFormat === 'pdf' ? 'pdf' : exportFormat === 'both' ? 'zip' : 'docx'}`}
                                                            className="flex-1 py-6 bg-green-600 hover:bg-green-700 text-white text-center text-lg font-black uppercase tracking-[0.3em] rounded-[24px] transition-all shadow-xl shadow-green-900/20 italic flex items-center justify-center"
                                                        >
                                                            <Download className="w-7 h-7 mr-4" />
                                                            SALVAR
                                                        </a>
                                                        <button
                                                            onClick={() => {
                                                                handlePrint(currentExportList?.songs || songs);
                                                            }}
                                                            className="flex-1 py-6 bg-blue-600 hover:bg-blue-700 text-white text-center text-lg font-black uppercase tracking-[0.3em] rounded-[24px] transition-all shadow-xl shadow-blue-900/20 italic flex items-center justify-center cursor-pointer"
                                                        >
                                                            <Printer className="w-7 h-7 mr-4" />
                                                            IMPRIMIR EM PDF
                                                        </button>
                                                    </div>
                                                    <div className="w-full">
                                                        <button
                                                            onClick={() => { setDownloadUrl(null); setExportStep(1); setShowExportModal(false); }}
                                                            className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white font-black uppercase tracking-widest rounded-2xl text-[10px] italic transition-all border border-white/5"
                                                        >
                                                            Fechar
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
                )
            }

            {/* Conflict Resolution Modal */}
            {
                conflictData && (
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
                )
            }



            {/* Extracted Root Modals */}
            {/* Delete Confirmation Modal */}
            {
                deleteModalOpen && (
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
                )
            }

            {/* Save List Modal */}
            {
                saveListModalOpen && (() => {
                    const allPlaylists = getSafeJSON('iron_chords_playlists', []);
                    const hasExisting = allPlaylists.length > 0;
                    return (
                        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300">
                            <div className="bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-md flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-1.5 h-6 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Salvar Forja</h3>
                                    </div>
                                    <button onClick={() => { setSaveListModalOpen(false); setSaveListName(''); setSelectedListsToAddTo([]); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"><X className="w-5 h-5 text-slate-400" /></button>
                                </div>

                                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 mb-6">
                                    <button onClick={() => setSaveListMode('new')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saveListMode === 'new' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>+ Nova Lista</button>
                                    <button onClick={() => setSaveListMode('existing')} disabled={!hasExisting} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${saveListMode === 'existing' ? 'bg-[#B87333] text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Adicionar à Existente</button>
                                </div>

                                {saveListMode === 'new' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Nome da Nova Lista</label>
                                            <input type="text" autoFocus placeholder="Ex: Missa de Domingo..." value={saveListName} onChange={e => setSaveListName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all placeholder:text-slate-700" onKeyDown={e => e.key === 'Enter' && handleSaveList()} />
                                        </div>
                                        <button onClick={handleSaveList} disabled={!saveListName.trim()} className="w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                            <Save className="w-4 h-4" /><span>Criar e Salvar Lista</span>
                                        </button>
                                    </div>
                                )}

                                {saveListMode === 'existing' && (
                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest ml-1">Selecione uma ou mais listas</label>
                                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-white/10">
                                            {allPlaylists.map(pl => (
                                                <label key={pl.id} className={`flex items-center space-x-4 p-4 rounded-2xl border cursor-pointer transition-all ${selectedListsToAddTo.includes(pl.id) ? 'bg-[#B87333]/15 border-[#B87333]/40' : 'bg-black/30 border-white/5 hover:border-white/15'}`}>
                                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${selectedListsToAddTo.includes(pl.id) ? 'bg-[#B87333] border-[#B87333]' : 'border-white/20'}`}>
                                                        {selectedListsToAddTo.includes(pl.id) && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <input type="checkbox" className="hidden" checked={selectedListsToAddTo.includes(pl.id)} onChange={e => {
                                                        if (e.target.checked) setSelectedListsToAddTo(prev => [...prev, pl.id]);
                                                        else setSelectedListsToAddTo(prev => prev.filter(id => id !== pl.id));
                                                    }} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-white text-sm uppercase italic tracking-tight truncate">{pl.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{pl.songs?.length || 0} músicas</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                        <button onClick={handleAddToExistingLists} disabled={selectedListsToAddTo.length === 0} className="w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2">
                                            <FolderHeart className="w-4 h-4" /><span>{selectedListsToAddTo.length > 0 ? `Adicionar às ${selectedListsToAddTo.length} Lista(s)` : 'Selecione as Listas'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })()
            }

            {/* Rename List Modal */}
            {
                editingList && (
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
                                                const all = Array.isArray(savedPlaylists) ? savedPlaylists : getSafeJSON('iron_chords_playlists', []);
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
                                        const updated = all.map(pl => {
                                            if (pl.id === editingList.id) {
                                                const oldName = pl.name;
                                                // If name changed, delete old one on cloud and save new one
                                                if (oldName !== editListName) {
                                                    deleteCloudPlaylist(authenticatedUser, oldName);
                                                    saveCloudPlaylist(authenticatedUser, editListName, pl.songs);
                                                }
                                                return { ...pl, name: editListName };
                                            }
                                            return pl;
                                        });
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
                )
            }


            {/* Batch Upload Modal */}
            {
                batchModalOpen && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 p-4">
                        <div className="bg-[#16161D] border border-white/10 rounded-[40px] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-8 pb-6 border-b border-white/5 shrink-0">
                                <div className="flex items-center space-x-4">
                                    <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Forja em Lote</h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Importe múltiplos arquivos de cifras (PDF, XLSX, CSV)</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setBatchModalOpen(false); setBatchResults([]); setShowMappingUI(false); setShowBatchReview(false); setBatchError(''); batchSuggestionsCacheRef.current = {}; }}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                                >
                                    <X className="w-6 h-6 text-slate-400" />
                                </button>
                            </div>
                            {/* Body */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                                {batchError && (
                                    <div className="w-full bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-2xl animate-in slide-in-from-top-4 flex items-start space-x-3">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs font-bold text-red-400">{batchError}</p>
                                    </div>
                                )}

                                {!showMappingUI && !showBatchReview ? (
                                    <div
                                        onClick={() => !batchLoading && fileInputRef.current?.click()}
                                        className={`w-full border-2 border-dashed rounded-[40px] p-20 flex flex-col items-center justify-center transition-all group ${batchLoading ? 'border-[#B87333]/50 opacity-80 cursor-not-allowed' : 'border-white/10 hover:border-[#B87333]/50 cursor-pointer'}`}
                                    >
                                        <div className={`w-20 h-20 ${batchLoading ? 'bg-black/60 border-[#B87333]/50 relative overflow-hidden' : 'bg-[#B87333]/10 border-[#B87333]/20 group-hover:scale-110'} rounded-3xl flex items-center justify-center mb-6 border transition-all duration-500`}>
                                            {batchLoading ? (
                                                <>
                                                    <UploadCloud className="w-8 h-8 text-[#B87333]/30" />
                                                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.8)_50%)] bg-[length:100%_4px] opacity-20"></div>
                                                    <div className="absolute left-0 w-full h-[3px] bg-white shadow-[0_0_20px_2px_rgba(184,115,51,1)] animate-scan-metal"></div>
                                                </>
                                            ) : <UploadCloud className="w-10 h-10 text-[#B87333]" />}
                                        </div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest">{batchLoading ? 'Processando Arquivo...' : 'Clique ou arraste para importar'}</h3>
                                        <p className="text-xs text-slate-500 uppercase font-bold mt-3">PDF, XLSX ou CSV</p>
                                        <input type="file" ref={fileInputRef} onChange={handleBatchFileSelect} className="hidden" />
                                    </div>
                                ) : showMappingUI && !showBatchReview ? (
                                    <div className="w-full bg-black/40 p-8 rounded-[32px] border border-white/5 space-y-6 relative">
                                        <button onClick={() => setShowMappingUI(false)} className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/5"><X className="w-5 h-5" /></button>
                                        <h4 className="text-xs font-black text-[#B87333] uppercase tracking-widest text-center">Mapeamento de Colunas</h4>
                                        <p className="text-[10px] text-slate-500 text-center uppercase tracking-widest">Colunas disponíveis: {batchHeaders.join(', ')}</p>
                                        {[{ label: 'Nome da Música', key: 'song_name' }, { label: 'Artista', key: 'artist_name' }, { label: 'Tom (Key)', key: 'key' }, { label: 'Capo (Opcional)', key: 'capo' }].map(field => (
                                            <div key={field.key}>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">{field.label}</label>
                                                <select value={batchMapping[field.key]} onChange={e => setBatchMapping(prev => ({ ...prev, [field.key]: e.target.value }))} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none">
                                                    <option value="">— Selecionar —</option>
                                                    {batchHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleBatchProcess}
                                            disabled={batchLoading || !batchMapping.song_name}
                                            className="w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-40 flex justify-center items-center"
                                        >
                                            {batchLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Processar Lote'}
                                        </button>
                                    </div>
                                ) : showBatchReview ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                            <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">Revisão do Lote</h4>
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => {
                                                    setSongs([...songs, ...batchResults.filter(r => r.status === 'success').map(r => ({
                                                        ...r,
                                                        _orig_key: r.original_key || r.requested_key || 'C',
                                                        _orig_content: r.content || ''
                                                    }))]);
                                                    setShowBatchReview(false);
                                                    setBatchResults([]);
                                                    setBatchModalOpen(false);
                                                }} className="px-6 py-3 bg-[#B87333] text-white font-black uppercase text-[10px] italic rounded-xl shadow-lg shadow-[#B87333]/20 hover:bg-[#8B4513] transition-all flex items-center">
                                                    <Zap className="w-3 h-3 mr-2 inline" /> Integrar à Forja ({batchResults.filter(r => r.status === 'success').length})
                                                </button>
                                                <button onClick={() => setSaveListModalOpen(true)} className="px-6 py-3 bg-white/5 hover:bg-[#B87333] text-[#B87333] hover:text-white border border-[#B87333]/30 rounded-xl font-black uppercase text-[10px] italic transition-all shadow-lg flex items-center space-x-2">
                                                    <Save className="w-3 h-3" />
                                                    <span>Salvar Lista</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {batchResults.map((item, idx) => (
                                                <div key={idx} className={`p-5 rounded-[24px] border ${item.status === 'success' ? 'bg-black/40 border-[#B87333]/30' : 'bg-red-900/10 border-red-500/30'} flex flex-col justify-between transition-all relative overflow-hidden`}>
                                                    {item.status === 'success' && <div className="absolute top-0 right-0 w-16 h-16 bg-[#B87333]/5 rounded-bl-[40px] -mr-4 -mt-4 pointer-events-none"></div>}
                                                    <div className="flex items-start justify-between relative z-10 w-full flex-wrap gap-4">
                                                        <div className="flex items-center space-x-4 flex-1 min-w-[300px]">
                                                            <div className={`w-12 h-12 rounded-xl flex shrink-0 items-center justify-center border ${item.status === 'success' ? 'bg-[#B87333]/10 border-[#B87333]/20' : 'bg-red-500/10 border-red-500/20'}`}>
                                                                {item.status === 'success' ? <CheckCircle className="w-6 h-6 text-[#B87333]" /> : <AlertCircle className="w-6 h-6 text-red-500" />}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                {item.status === 'success' ? (
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <button
                                                                            onClick={() => setBatchFixData({ idx, song_name: item.song_name, artist_name: item.artist_name, song_key: item.sounding_key || item.requested_key, content: item.content, capo: item.capo || 0, include_tabs: item.include_tabs || false })}
                                                                            className={`text-left w-full hover:underline decoration-2 underline-offset-4 outline-none group ${(!item.content || String(item.content).trim().length < 50) ? 'decoration-red-500' : 'decoration-[#B87333]'}`}
                                                                            title="Clique para analisar a cifra"
                                                                        >
                                                                            <h5 className={`font-black uppercase italic tracking-tighter text-lg truncate transition-colors ${(!item.content || String(item.content).trim().length < 50) ? 'text-red-500 group-hover:text-red-400' : 'text-white group-hover:text-[#B87333]'}`}>{item.song_name}</h5>
                                                                        </button>
                                                                        
                                                                        {(!item.content || String(item.content).trim().length < 50) && (
                                                                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-900/30 border border-red-500/40 text-[9px] font-black text-red-400 uppercase tracking-widest mt-1">
                                                                                <AlertCircle className="w-3 h-3" /> Cifra Vazia - Clique p/ Editar
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    ) : (
                                                                        <div className="flex flex-col items-start gap-1">
                                                                            <h5 className="font-black text-slate-400 uppercase italic tracking-tighter text-lg truncate">{item.song_name}</h5>
                                                                            {item.message && (
                                                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-900/40 border border-red-500/50 text-[9px] font-black text-red-200 uppercase tracking-widest">
                                                                                    <AlertCircle className="w-3 h-3" /> {item.message}
                                                                                </span>
                                                                            )}
                                                                        </div>
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
                                                        <div className="flex items-center gap-4 shrink-0">
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
                                                                            next[idx].capo = Number(e.target.value);
                                                                            setBatchResults(next);
                                                                        }} className="bg-transparent text-white text-xs outline-none cursor-pointer">
                                                                            {[...Array(13)].map((_, c) => <option key={c} value={c} className="bg-[#1A1A1A]">{c === 0 ? '0' : c}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <button onClick={() => {
                                                                        const next = [...batchResults];
                                                                        next[idx].include_tabs = !next[idx].include_tabs;
                                                                        setBatchResults(next);
                                                                    }} className={`p-2 rounded-xl transition-all border ${item.include_tabs ? 'bg-[#B87333]/20 border-[#B87333]/50 text-[#B87333]' : 'bg-white/5 border-white/10 text-slate-500'}`} title="Tablaturas">
                                                                        <FileText className="w-4 h-4" />
                                                                    </button>
                                                                    {(item.original_key && item.sounding_key !== item.original_key) && (
                                                                        <button onClick={() => resetBatchSong(idx)} className="p-2 bg-white/5 hover:bg-orange-500/20 text-slate-500 hover:text-orange-500 rounded-xl transition-all border border-white/10" title="Restaurar Original">
                                                                            <RefreshCw className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => {
                                                                        const next = [...batchResults];
                                                                        next.splice(idx, 1);
                                                                        setBatchResults(next);
                                                                    }} className="p-2 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/10">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-end space-y-2">
                                                                    <div className="flex flex-wrap gap-2 justify-end max-w-sm">
                                                                        {(item.suggestions || []).map((sug, i2) => {
                                                                            const cacheKey = `${sug.song}||${sug.artist}`;
                                                                            const isLoading = suggestionsLoadingKeys.has(cacheKey);
                                                                            const cacheEntry = batchSuggestionsCacheRef.current[cacheKey];
                                                                            const isCached = !!cacheEntry && !cacheEntry._failed;
                                                                            const isFailed = cacheEntry?._failed === true;
                                                                            return (
                                                                                <button
                                                                                    key={i2}
                                                                                    onClick={() => handleTryBatchSuggestion(idx, sug)}
                                                                                    disabled={isLoading}
                                                                                    title={isFailed ? 'Não encontrada no CifraClub — clique para inserir manualmente' : isCached ? 'Pré-carregada — abre instantaneamente' : ''}
                                                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all border flex items-center shadow-lg relative ${isLoading ? 'bg-[#B87333]/20 border-[#B87333]/30 text-[#B87333] cursor-wait' :
                                                                                        isFailed ? 'bg-red-900/10 hover:bg-red-900/30 border-red-900/30 text-slate-500 hover:text-red-400 cursor-pointer' :
                                                                                            'bg-white/5 hover:bg-[#B87333]/20 hover:border-[#B87333]/30 text-slate-300 hover:text-white border-white/10 cursor-pointer'
                                                                                        }`}
                                                                                >
                                                                                    {isLoading
                                                                                        ? <RefreshCw className="w-3 h-3 mr-1.5 text-[#B87333] animate-spin" />
                                                                                        : <RefreshCw className={`w-3 h-3 mr-1.5 ${isFailed ? 'text-red-700' : 'text-[#B87333]'}`} />
                                                                                    }
                                                                                    {sug.song} - <span className="opacity-50 ml-1">{sug.artist}</span>
                                                                                    {isCached && <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1.5 shrink-0" title="Pré-carregado" />}
                                                                                    {isFailed && <span className="w-1.5 h-1.5 rounded-full bg-red-600 ml-1.5 shrink-0" title="Não encontrada" />}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <button onClick={() => setBatchFixData({ idx, song_name: item.song_name, artist_name: item.artist_name, song_key: item.requested_key || 'C', content: '', include_tabs: true, capo: 0 })} className="px-4 py-2 bg-[#B87333]/10 hover:bg-[#B87333] text-[#B87333] hover:text-white rounded-lg text-[10px] font-black uppercase transition-all border border-[#B87333]/30">
                                                                            Forjar Manualmente
                                                                        </button>
                                                                        <button onClick={() => {
                                                                            const next = [...batchResults];
                                                                            next.splice(idx, 1);
                                                                            setBatchResults(next);
                                                                        }} className="p-2 bg-white/5 hover:bg-red-900/40 text-slate-500 hover:text-red-500 rounded-xl transition-all border border-white/10 relative group">
                                                                            <Trash2 className="w-4 h-4" />
                                                                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Descartar</span>
                                                                        </button>
                                                                    </div>
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
                                    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-[#070709]/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
                                        <div className="bg-[#16161D] border border-white/10 p-8 rounded-[32px] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
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
                                                                    const res = await fetch(`${API_BASE_URL}/api/music/scrape-link`, {
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
                                                                            song_key: data.key || 'C',
                                                                            content: data.content,
                                                                            capo: data.capo || 0
                                                                        }));
                                                                    } else {
                                                                        alert(data.detail || "Erro ao extrair cifra do link");
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
                                                    <div className="relative">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Música</label>
                                                        <input
                                                            type="text"
                                                            value={batchFixData.song_name}
                                                            onChange={e => setBatchFixData({ ...batchFixData, song_name: e.target.value })}
                                                            onFocus={() => setShowBatchFixSuggestions(true)}
                                                            onBlur={() => setTimeout(() => setShowBatchFixSuggestions(false), 200)}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none"
                                                        />
                                                        {showBatchFixSuggestions && batchFixSuggestions.length > 0 && (
                                                            <div className="absolute z-[410] w-full mt-2 bg-[#12121A] border border-[#B87333]/40 rounded-2xl shadow-2xl max-h-64 overflow-y-auto scrollbar-thin">
                                                                {batchFixSuggestions.map((sug, i) => (
                                                                    <div
                                                                        key={i}
                                                                        onClick={() => {
                                                                            setBatchFixData({
                                                                                ...batchFixData,
                                                                                song_name: sug.song,
                                                                                artist_name: sug.artist
                                                                            });
                                                                            setShowBatchFixSuggestions(false);
                                                                        }}
                                                                        className="px-4 py-3 hover:bg-[#B87333]/20 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                                                                    >
                                                                        <p className="text-white font-black uppercase text-sm">{sug.song}</p>
                                                                        <p className="text-[10px] font-bold text-slate-500 uppercase">{sug.artist}</p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
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
                                                    <div className="relative group/editor">
                                                        <textarea
                                                            value={batchFixData.include_tabs ? batchFixData.content : removeTablatureBlocks(batchFixData.content)}
                                                            onChange={e => {
                                                                if (batchFixData.include_tabs) {
                                                                    setBatchFixData({ ...batchFixData, content: e.target.value });
                                                                }
                                                            }}
                                                            readOnly={!batchFixData.include_tabs}
                                                            className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none font-mono text-xs leading-relaxed sm:min-h-[600px] min-h-[40vh] resize-none scrollbar-thin transition-all ${!batchFixData.include_tabs ? 'cursor-not-allowed opacity-80' : 'focus:border-[#B87333]/50'}`}
                                                            placeholder="Cole a cifra estruturada aqui..."
                                                        ></textarea>
                                                        {!batchFixData.include_tabs && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
                                                                <div className="bg-black/80 border border-[#B87333]/50 px-4 py-2 rounded-xl flex items-center space-x-2">
                                                                    <Eye className="w-4 h-4 text-[#B87333]" />
                                                                    <span className="text-[10px] font-bold text-white uppercase italic">Ative as Tabs para Editar</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
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
                        </div>
                    </div>
                )
            }

            {/* ——— EDIT QUEUE SONG MODAL ——— */}
            {editQueueSong && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#070709]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 p-4">
                    <div className="bg-[#16161D] border border-white/10 rounded-[40px] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-8 pb-6 border-b border-white/5 shrink-0">
                            <div className="flex items-center space-x-4">
                                <div className="w-2 h-10 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Editar Música</h2>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Altere os dados da música na fila</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditQueueSong(null)}
                                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                            >
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Artista</label>
                                    <input type="text" value={editQueueSong.artist_name} onChange={e => setEditQueueSong({ ...editQueueSong, artist_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Música</label>
                                    <input type="text" value={editQueueSong.song_name} onChange={e => setEditQueueSong({ ...editQueueSong, song_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Tom Original</label>
                                    <select value={editQueueSong.song_key} onChange={e => setEditQueueSong({ ...editQueueSong, song_key: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-[#B87333]/50 transition-all">
                                        {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Capo</label>
                                    <select value={editQueueSong.capo} onChange={e => setEditQueueSong({ ...editQueueSong, capo: Number(e.target.value) })} className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white outline-none cursor-pointer font-bold appearance-none focus:border-[#B87333]/50 transition-all">
                                        {[...Array(13)].map((_, i) => <option key={i} value={i} className="bg-[#1A1A1A]">{i === 0 ? 'Sem Capo' : `${i}ª Casa`}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col justify-end">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tablaturas</label>
                                    <button
                                        type="button"
                                        onClick={() => setEditQueueSong(prev => ({ ...prev, include_tabs: !prev.include_tabs }))}
                                        className={`w-full py-3 rounded-xl border transition-all font-black uppercase text-[10px] tracking-widest ${editQueueSong.include_tabs ? 'bg-[#B87333]/20 border-[#B87333] text-[#B87333]' : 'bg-black/60 border-white/10 text-slate-600'}`}
                                    >
                                        {editQueueSong.include_tabs ? 'Ativadas' : 'Desativadas'}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-col flex-1">
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest ml-1">Cifra Bruta</label>
                                <div className="relative group/editor">
                                    <textarea
                                        value={editQueueSong.include_tabs ? editQueueSong.content : removeTablatureBlocks(editQueueSong.content)}
                                        onChange={e => {
                                            if (editQueueSong.include_tabs) {
                                                setEditQueueSong({ ...editQueueSong, content: e.target.value });
                                            }
                                        }}
                                        readOnly={!editQueueSong.include_tabs}
                                        className={`w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none font-mono text-xs leading-relaxed sm:min-h-[600px] min-h-[40vh] resize-none focus:border-[#B87333]/50 transition-all scrollbar-thin ${!editQueueSong.include_tabs ? 'cursor-not-allowed opacity-80' : ''}`}
                                        placeholder="Cole a cifra estruturada aqui..."
                                    ></textarea>
                                    {!editQueueSong.include_tabs && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] opacity-0 group-hover/editor:opacity-100 transition-opacity pointer-events-none">
                                            <div className="bg-black/80 border border-[#B87333]/50 px-4 py-2 rounded-xl flex items-center space-x-2">
                                                <Eye className="w-4 h-4 text-[#B87333]" />
                                                <span className="text-[10px] font-bold text-white uppercase italic">Ative as Tabs para Editar</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="p-8 pt-4 border-t border-white/5 shrink-0">
                            <button onClick={() => {
                                if (!editQueueSong.content.trim() && !editQueueSong.song_name.trim()) return;
                                const next = [...songs];
                                next[editQueueSong.idx] = {
                                    ...next[editQueueSong.idx],
                                    song_name: editQueueSong.song_name,
                                    artist_name: editQueueSong.artist_name,
                                    key: editQueueSong.song_key,
                                    song_key: editQueueSong.song_key,
                                    capo: editQueueSong.capo,
                                    include_tabs: editQueueSong.include_tabs,
                                    content: editQueueSong.content,
                                };
                                setSongs(next);
                                setEditQueueSong(null);
                            }} className="w-full py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share and Import Modals */}
            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                listName={activePlaylistName || "Repertório"}
                link={shareLink}
                loading={shareLoading}
            />
            <ImportModal
                data={importData}
                onClose={() => setImportData(null)}
                onImport={handleImportList}
            />

            {/* DEDICATED PRINT SHEET (Always in DOM portal, outside all conditional layout blocks) */}
            {
                createPortal(
                    <div id="dedicated-print-sheet" className="hidden print:block fixed inset-0 bg-white text-black z-[99999] overflow-y-auto">
                        {(() => {
                            const printData = songForPrint || manualPreviewSong || currentSong;
                            if (!printData) return null;

                            // Determine if we are printing a single song or an array (batch)
                            const songsToRender = printData.isBatch ? printData.songs : [printData];

                            return (
                                <>
                                    {/* Cover and TOC for Booklet */}
                                    {printData.isBatch && (
                                        <div className="w-full max-w-5xl mx-auto px-12 py-16 print:px-8 print:py-12 mb-20 print:break-after-page text-black font-sans bg-white min-h-screen flex flex-col justify-between">
                                            <div>
                                                <div className="flex flex-col items-center mb-20 mt-10">
                                                    <Flame className="w-16 h-16 text-[#ea580c] mb-6" />
                                                    <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-none">IRON<span className="text-[#ea580c]">CHORDS</span></h1>
                                                    <div className="h-1.5 w-32 bg-[#ea580c] mt-6"></div>
                                                    <p className="text-sm font-black uppercase tracking-[0.5em] mt-8 opacity-40">Livreto de Cifras</p>
                                                </div>

                                                <h2 className="text-4xl font-black uppercase italic tracking-tighter border-b-4 border-black pb-4 mb-10 mt-20">Sumário</h2>
                                                
                                                <div className="space-y-4">
                                                    {printData.songs.map((s, idx) => (
                                                        <div key={idx} className="flex items-baseline justify-between border-b border-dotted border-gray-300 pb-2">
                                                            <div className="flex items-baseline gap-4">
                                                                <span className="text-xl font-black text-[#ea580c] w-8">{idx + 1}.</span>
                                                                <span className="text-xl font-black uppercase italic tracking-tight">{s.song_name}</span>
                                                                <span className="text-sm font-bold text-gray-400 uppercase ml-2 tracking-tight">— {s.artist_name}</span>
                                                            </div>
                                                            <span className="text-lg font-black italic text-gray-400">Tom: {getSoundingKey(s)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-8">
                                                Geração Industrial • {printData.songs.length} músicas • {new Date().toLocaleDateString('pt-BR')}
                                            </div>
                                        </div>
                                    )}

                                    {songsToRender.map((songToPrint, idx) => (
                                        <div key={songToPrint.id || idx} className={`w-full max-w-5xl mx-auto px-12 py-8 print:px-4 print:py-4 ${ (printData.isBatch || idx > 0) ? 'print:break-before-page' : ''}`}>
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
                                                <div className="flex items-center space-x-6">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-lg print:text-base font-bold text-gray-800">Tom:</span>
                                                        <span className="text-lg print:text-base font-bold text-[#ea580c]">{getSoundingKey(songToPrint)}</span>
                                                    </div>
                                                    {songToPrint.capo > 0 && (
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-lg print:text-base font-bold text-gray-800">Capotraste:</span>
                                                            <span className="text-lg print:text-base font-bold text-[#ea580c]">{songToPrint.capo}ª Casa</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Chords Content */}
                                            {(() => {
                                                const cleanContent = (songToPrint.include_tabs ?? includeTabs) === false
                                                    ? removeTablatureBlocks(songToPrint.content || "")
                                                    : songToPrint.content || "";
                                                const rawLines = cleanContent.split('\n');
                                                const blocks = [];
                                                let currentBlock = [];

                                                for (let i = 0; i < rawLines.length; i++) {
                                                    const line = rawLines[i].replace(/\r/g, '');
                                                    const trimmed = line.trim();

                                                    const isTabLine = line.includes('|-') || line.includes('-|') || /^[eBGDAE]\|/.test(trimmed);
                                                    const isGuitarNote = /guitarra|dedilhado|batida|solo|riff|ritmo|frase|passagem/i.test(line) && (line.includes('(') || line.includes('['));
                                                    const isRhythmArrow = line.includes('↓') || line.includes('↑');

                                                    const effectivelyIncludeTabs = songToPrint.include_tabs ?? includeTabs;
                                                    if (!effectivelyIncludeTabs && (isTabLine || isGuitarNote || isRhythmArrow)) continue;

                                                    const isChordLine = !!(line && trimmed.length > 0 && (line.match(CHORD_TOKEN_RE) || []).length > 0 && line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, trimmed.length * 0.25));

                                                    if (trimmed.length === 0) {
                                                        if (currentBlock.length > 0) {
                                                            const hasLyrics = currentBlock.some(l => !l.isChordLine && !l.text.trim().startsWith('['));
                                                            let nextValidLineIsChord = false;
                                                            for (let j = i + 1; j < rawLines.length; j++) {
                                                                const nextL = rawLines[j].trim();
                                                                if (nextL.length > 0) {
                                                                    const nextLIsChord = !!(nextL && (nextL.match(CHORD_TOKEN_RE) || []).length > 0 && nextL.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '').length < Math.max(2, nextL.length * 0.25));
                                                                    nextValidLineIsChord = nextLIsChord;
                                                                    break;
                                                                }
                                                            }
                                                            if (!hasLyrics && nextValidLineIsChord) continue;
                                                            blocks.push(currentBlock);
                                                            currentBlock = [];
                                                        }
                                                    } else {
                                                        currentBlock.push({ text: line, isChordLine });
                                                    }
                                                }
                                                if (currentBlock.length > 0) blocks.push(currentBlock);

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

                                                const totalLines = collapsedBlocks.reduce((acc, b) => acc + b.length, 0);
                                                const useColumns = totalLines > 65;

                                                return (
                                                    <div className={`mt-8 print:mt-6 font-sans ${useColumns ? 'print:columns-2 print:gap-16' : ''}`}>
                                                        {collapsedBlocks.map((block, bIdx) => {
                                                            const textCount = block.filter(l => !l.isChordLine).length;
                                                            const isInstrumentalBlock = block.length >= 2 && (textCount === 0 || (textCount === 1 && block[0].text.includes('[') && block[0].text.length < 25));
                                                            return (
                                                                <div key={bIdx} className="break-inside-avoid print:break-inside-avoid mb-8 print:mb-6 flex flex-col space-y-0">
                                                                    {block.map((lineObj, lIdx) => {
                                                                        const isSectionTitle = lineObj.text.trim().startsWith('[') && lineObj.text.trim().endsWith(']');
                                                                        const displayText = (isInstrumentalBlock && lineObj.isChordLine && !isSectionTitle)
                                                                            ? lineObj.text.trim().replace(/\s+/g, '   ')
                                                                            : lineObj.text;
                                                                        return (
                                                                            <pre
                                                                                key={lIdx}
                                                                                className={`whitespace-pre-wrap ${lineObj.isChordLine ? 'font-mono text-[#ea580c] print:text-[#ea580c] font-bold print:leading-snug' : isSectionTitle ? 'font-sans font-bold text-gray-900 mt-2 mb-1' : 'font-sans text-gray-900 print:leading-normal'}`}
                                                                                style={{
                                                                                    fontSize: lineObj.isChordLine ? `${printFontSize - 1}px` : `${printFontSize}px`,
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
                                    ))}
                                </>
                            );
                        })()}
                    </div>,
                    document.body
                )
            }
        </div>
    );
}

export default App;
