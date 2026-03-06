import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AudioTracker } from '../utils/AudioTracker';
import { PhoneticMatcher } from '../utils/PhoneticMatcher';
import { CifraParser } from '../utils/CifraParser';
import { X, Mic, Radio, SkipForward, Pause, Play } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Chord Token Regex
// ─────────────────────────────────────────────────────────────
const CHORD_TOKEN_RE = /(?:^|\s)([A-G][b#]?(?:maj7?|min7?|m7?|7|sus[24]?|dim7?|aug|add9|6|9|11|13)?(?:\/[A-G][b#]?)?)(?![a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ])/g;

function isChordOnlyLine(line) {
    if (!line || !line.trim()) return false;
    // If it's a tab line, it's definitely not a chord line (and shouldn't be read as lyrics)
    if (isTablatureLine(line)) return false;

    const chords = (line.match(CHORD_TOKEN_RE) || []).map(m => m.trim());
    const cleaned = line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '');
    return chords.length > 0 && cleaned.length < Math.max(2, line.trim().length * 0.25);
}

function isTablatureLine(line) {
    if (!line) return false;
    const trimmed = line.trim();
    // Common tab indicators: E|---, e|---, A|---, or just lots of dashes
    if (/^[eEaAdDgGbB]\|/.test(trimmed)) return true;
    if ((trimmed.match(/-/g) || []).length > 8) return true;
    return false;
}

function RenderChordLine({ line }) {
    const parts = [];
    let last = 0;
    let match;
    CHORD_TOKEN_RE.lastIndex = 0;
    while ((match = CHORD_TOKEN_RE.exec(line)) !== null) {
        const fullMatch = match[0];
        const chord = match[1];
        const leadingSpace = fullMatch.length - chord.length;
        const chordStart = match.index + leadingSpace;
        if (chordStart > last) parts.push(<span key={`t${last}`}>{line.slice(last, chordStart)}</span>);
        parts.push(<span key={`c${chordStart}`} style={{ color: '#D4873C', fontWeight: 900 }}>{chord}</span>);
        last = chordStart + chord.length;
    }
    if (last < line.length) parts.push(<span key="te">{line.slice(last)}</span>);
    return <>{parts}</>;
}

function buildBlocks(lines) {
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];

        // Skip explicitly empty lines, tab markers, or section headers
        if (!line.trim() || line.includes('---') || line.trim().startsWith('[') || isTablatureLine(line)) {
            i++;
            continue;
        }

        if (isChordOnlyLine(line)) {
            let next = lines[i + 1];
            // Look ahead for the actual lyric, skipping empty/tab lines that might be randomly placed after chords
            let j = i + 1;
            while (j < lines.length && (!next || !next.trim() || next.includes('---') || next.trim().startsWith('[') || isTablatureLine(next))) {
                j++;
                next = lines[j];
            }

            if (next !== undefined && !isChordOnlyLine(next)) {
                blocks.push({ chords: line, lyric: next, lineIndex: i });
                i = j + 1;
            } else {
                blocks.push({ chords: line, lyric: null, lineIndex: i });
                i++;
            }
        } else {
            blocks.push({ chords: null, lyric: line, lineIndex: i });
            i++;
        }
    }

    // Filter out blocks that have absolutely nothing to display (blank lines or just random characters)
    // Note: We keep blocks that only have chords (b.chords != null) so instrumental intros are still visible,
    // they just won't be required to be sung.
    return blocks.filter(b => b.chords || (b.lyric && b.lyric.trim().length > 0));
}

// ─────────────────────────────────────────────────────────────
// VideokePlayer
// ─────────────────────────────────────────────────────────────
const VideokePlayer = ({ song, onClose }) => {
    const [blocks, setBlocks] = useState([]);
    const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
    const [hasPermission, setHasPermission] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [micLevel, setMicLevel] = useState(0);
    const [bpm, setBpm] = useState(80);
    const [isAnchored, setIsAnchored] = useState(false);
    const [isPaused, setIsPaused] = useState(false); // paused due to silence
    const [isWaiting, setIsWaiting] = useState(true);  // before first voice match
    const [listenStatus, setListenStatus] = useState('');
    const [lastConfidence, setLastConfidence] = useState(0);

    // Refs — avoid stale closures in timers/callbacks
    const trackerRef = useRef(null);
    const scrollRef = useRef(null);
    const blocksRef = useRef([]);
    const currentRef = useRef(0);
    const anchoredRef = useRef(false);
    const pausedRef = useRef(false);
    const waitingRef = useRef(true);
    const bpmRef = useRef(80);
    const micLevelRef = useRef(0);
    const advTimerRef = useRef(null);
    const silenceTimerRef = useRef(null); // tracks how long silence has been
    const lastJumpRef = useRef(0);
    const lastVoiceTimeRef = useRef(0); // <--- Traces when WebSpeech last fired

    // Silence threshold: if mic average < this for SILENCE_DELAY ms → pause
    const SILENCE_THRESHOLD = 8;   // very low mic level = silence
    const SILENCE_DELAY = 1800; // ms before pausing
    const RESUME_THRESHOLD = 14;  // mic level to resume

    // Build blocks from song content
    useEffect(() => {
        if (song?.content) {
            const l = song.content.split('\n');
            const b = buildBlocks(l);
            setBlocks(b);
            blocksRef.current = b;
        }
    }, [song]);

    const [fsmState, setFsmState] = useState({ state: 'AGUARDANDO', action: 'freeze' });
    const [micGain, setMicGain] = useState(2.0); // Reset to 2.0 default
    const [connectionStatus, setConnectionStatus] = useState('offline'); // offline, connecting, connected, error
    const [lastAction, setLastAction] = useState(null);
    const [forceVoiceUi, setForceVoiceUi] = useState(false); // To force re-render when WebSpeech is active

    // Heartbeat to clear WebSpeech force UI
    useEffect(() => {
        const interval = setInterval(() => {
            if (Date.now() - lastVoiceTimeRef.current > 2000 && forceVoiceUi) {
                setForceVoiceUi(false);
            }
        }, 500);
        return () => clearInterval(interval);
    }, [forceVoiceUi]);

    // Build blocks from song content
    useEffect(() => {
        if (song?.content) {
            const l = song.content.split('\n');
            const b = buildBlocks(l);
            setBlocks(b);
            blocksRef.current = b;

            // Extract vocabulary for WebSpeech API grammar injection
            const STOP_WORDS = new Set(['o', 'a', 'e', 'de', 'do', 'da', 'no', 'na', 'que', 'se', 'te', 'me', 'um', 'uma', 'os', 'as', 'pra', 'pro', 'ao', 'aos']);
            const vocab = new Set();
            b.forEach(block => {
                if (block.lyric) {
                    const norm = PhoneticMatcher.normalize(block.lyric);
                    norm.split(' ').forEach(w => {
                        // Relax filter to 2 characters to catch "Sol", "Pé", "Fé" etc.
                        if (w.length >= 2 && !STOP_WORDS.has(w)) vocab.add(w);
                    });
                }
            });

            const vocabArray = Array.from(vocab);
            if (trackerRef.current) {
                trackerRef.current.setVocabulary(vocabArray);
            } else {
                window.__PENDING_VOCABULARY = vocabArray;
            }
        }
    }, [song]);

    // Sync refs
    useEffect(() => { currentRef.current = currentBlockIndex; }, [currentBlockIndex]);
    useEffect(() => { anchoredRef.current = isAnchored; }, [isAnchored]);
    useEffect(() => { pausedRef.current = isPaused; }, [isPaused]);
    useEffect(() => { waitingRef.current = isWaiting; }, [isWaiting]);
    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { micLevelRef.current = micLevel; }, [micLevel]);

    // Auto-scroll to active line
    useEffect(() => {
        if (!scrollRef.current) return;
        const el = scrollRef.current.querySelector('[data-active="true"]');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [currentBlockIndex]);

    // ── Update Tracker Gain ────────────────────────────────
    useEffect(() => {
        if (trackerRef.current) {
            trackerRef.current.setGain(micGain);
        }
    }, [micGain]);

    // ── Connection Status ──────────────────────────────────
    const handleConnectionStatus = useCallback((status) => {
        setConnectionStatus(status);
    }, []);

    // ── Alignment State Handler ──────────────────────────────
    const handleAlignmentState = useCallback((data) => {
        setFsmState(data);
        // We no longer advance blindly based on VAD action to prevent random noises
        // from skipping lyrics. Progression is now strictly phonetic via handleVoice.
    }, []);

    // ── Voice timeout and debug handling ──────────────────
    useEffect(() => {
        const timer = setInterval(() => {
            const now = Date.now();
            if (forceVoiceUi && now - lastVoiceTimeRef.current > 3000) {
                setForceVoiceUi(false);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [forceVoiceUi]);

    // ── Mic Level (Simplified) ───────────────────────────────
    const handleMicLevel = useCallback((level) => {
        setMicLevel(level);
        micLevelRef.current = level;
    }, []);

    // ── Voice matching ───────────────────────────────────────
    const handleVoice = useCallback((text, isFinal) => {
        setListenStatus(text);

        // Ignore system debug messages for matching logic
        if (text.startsWith('[') && text.endsWith(']')) return;

        lastVoiceTimeRef.current = Date.now();
        setForceVoiceUi(true);
        if (isPaused || !text || text.trim().length === 0) return;

        // Normalize and get tokens
        const normTranscript = PhoneticMatcher.normalize(PhoneticMatcher.applyAliases(text));
        const STOP_WORDS = new Set(['o', 'a', 'e', 'de', 'do', 'da', 'no', 'na', 'que', 'se', 'te', 'me', 'um', 'uma', 'os', 'as', 'pra', 'pro', 'ao', 'aos']);
        const getMeaningfulWords = (phrase) => phrase.split(' ').filter(w => w.length >= 2 && !STOP_WORDS.has(w));

        // ── ROBUST SEQUENTIAL FLOW ────────────────────────────────────
        // 1. Take a larger window (up to 10 words) to handle fast singing
        const transWordsLong = getMeaningfulWords(normTranscript).slice(-10);
        if (transWordsLong.length < 1) return;

        // Helper: Check if words from transcript appear in a line
        const scoreLine = (bIdx) => {
            const b = blocks[bIdx];
            if (!b || !b.lyric) return 0;
            const lw = getMeaningfulWords(PhoneticMatcher.normalize(b.lyric));
            if (lw.length === 0) return 0;

            let matches = 0;
            // Use the longer window for matching
            for (const tw of transWordsLong) {
                if (lw.includes(tw)) matches++;
            }
            return matches;
        };

        const currentIdx = currentRef.current;
        const blocks = blocksRef.current;
        let targetIndex = -1;

        // NEW: Clear waiting status as soon as we hear valid speech
        if (waitingRef.current) {
            setIsWaiting(false);
            waitingRef.current = false;
        }

        // 1. ORGANIC ADVANCE (Look-ahead bias)
        // We look up to 4 lines ahead. If we find at least 2 words matching, we jump.
        for (let offset = 1; offset <= 4; offset++) {
            const testIdx = currentIdx + offset;
            if (testIdx < blocks.length) {
                if (scoreLine(testIdx) >= 2) {
                    targetIndex = testIdx;
                    break;
                }
            }
        }

        // 2. GLOBAL RESCUE (If we are completely lost)
        if (targetIndex === -1 && transWordsLong.length >= 3) {
            // Only rescue if the current line has NO matches to avoid jumping out of a chorus
            if (scoreLine(currentIdx) === 0) {
                // Forward Search
                for (let i = currentIdx + 5; i < blocks.length; i++) {
                    if (scoreLine(i) >= 2) { targetIndex = i; break; }
                }
                // Backward Search
                if (targetIndex === -1) {
                    for (let i = 0; i < currentIdx; i++) {
                        if (scoreLine(i) >= 3) { targetIndex = i; break; } // Be stricter going backward
                    }
                }
            }
        }

        // Apply Jump
        if (targetIndex !== -1 && targetIndex !== currentIdx) {
            const now = Date.now();
            if (now - lastJumpRef.current > 1200) { // Cooldown against double jumping on echo
                setCurrentBlockIndex(targetIndex);
                currentRef.current = targetIndex;
                lastJumpRef.current = now;

                if (waitingRef.current) {
                    setIsWaiting(false);
                    waitingRef.current = false;
                    setIsAnchored(true);
                    anchoredRef.current = true;
                }
            }
        }
    }, [isPaused]);

    // ── Manual line click: jump + resume ────────────────────
    const handleLineClick = useCallback((idx) => {
        setCurrentBlockIndex(idx);
        currentRef.current = idx;
        lastJumpRef.current = Date.now();
        setIsPaused(false);
        setIsWaiting(false);
        setIsAnchored(true);
        pausedRef.current = false;
        waitingRef.current = false;
        anchoredRef.current = true;
    }, []);

    // ── AudioTracker startup ─────────────────────────────────
    const startMic = useCallback(() => {
        if (trackerRef.current) return;
        trackerRef.current = new AudioTracker(
            null,
            handleMicLevel,
            null,
            handleVoice, // <--- Now using phonetic matching
            handleAlignmentState,
            handleConnectionStatus // connection callback
        );

        if (window.__PENDING_VOCABULARY) {
            trackerRef.current.setVocabulary(window.__PENDING_VOCABULARY);
            delete window.__PENDING_VOCABULARY;
        }

        // It will pick up the current micGain via the other useEffect that calls setGain()
        trackerRef.current.start().catch(() => setPermissionDenied(true));
    }, [handleMicLevel, handleVoice, handleAlignmentState, handleConnectionStatus]);

    useEffect(() => {
        if (hasPermission) startMic();
        return () => {
            if (trackerRef.current) { trackerRef.current.stop(); trackerRef.current = null; }
        };
    }, [hasPermission, startMic]);

    // ── Manual pause/resume toggle ───────────────────────────
    const togglePause = () => {
        const newPause = !isPaused;
        setIsPaused(newPause);
        pausedRef.current = newPause;
        if (!newPause) {
            setIsWaiting(false);
            waitingRef.current = false;
            setIsAnchored(true);
            anchoredRef.current = true;
        }
    };

    // ── Derived values ───────────────────────────────────────
    const currentBlock = blocks[currentBlockIndex];
    const nextBlock = blocks[currentBlockIndex + 1];
    const progress = blocks.length > 1 ? Math.round((currentBlockIndex / (blocks.length - 1)) * 100) : 0;
    const micBarWidth = Math.min(100, micLevel * 1.2);

    // FSM State mapping for UI
    const getStatusInfo = () => {
        if (connectionStatus === 'connecting') return { label: 'CONECTANDO', color: '#60A5FA', desc: 'Iniciando link com servidor...' };
        if (connectionStatus === 'error' || connectionStatus === 'disconnected') return { label: 'OFFLINE', color: '#ef4444', desc: 'Erro de conexão com servidor' };

        if (isPaused) return { label: 'PAUSADO', color: '#ef4444', desc: 'Clique para retomar' };

        // PRIORITIZE VOICE UI (To give immediate feedback that we are listening)
        if (forceVoiceUi) {
            const baseStatus = fsmState.state;
            if (baseStatus === 'CONGELAR_LETRA_SEGUIR_VIOLA' || baseStatus === 'SEGUINDO_NORMAL') {
                return { label: 'VOZ+VIOLA', color: '#22c55e', desc: 'Sincronizando banda completa' };
            }
            return { label: 'A CAPELA', color: '#60A5FA', desc: 'Sincronizando pela sua voz' };
        }

        if (isWaiting) return { label: 'AGUARDANDO', color: '#B87333', desc: 'Aguardando voz ou instrumento...' };

        switch (fsmState.state) {
            case 'SEGUINDO_NORMAL':
                return { label: 'VOZ+VIOLA', color: '#22c55e', desc: 'Sincronizando banda completa' };
            case 'CONGELAR_LETRA_SEGUIR_VIOLA':
                return { label: 'VIOLA', color: '#FCD34D', desc: 'Sincronizando pelo instrumento' };
            case 'ACAPELLA':
                return { label: 'A CAPELA', color: '#60A5FA', desc: 'Sincronizando pela sua voz' };
            case 'MODO_BANDA_VAMPING':
                return { label: 'VAMPING', color: '#F87171', desc: 'Ritmo automático (Silêncio)' };
            default:
                return { label: 'SINCRONIZANDO', color: '#22c55e', desc: 'Processando áudio...' };
        }
    };

    const statusInfo = getStatusInfo();

    // ── Permission Screen ────────────────────────────────────
    if (!hasPermission) {
        return (
            <div style={S.overlay}>
                <div style={S.permCard}>
                    <div style={S.permIcon}><Mic size={40} style={{ color: '#B87333' }} /></div>
                    <h2 style={S.permTitle}>IRONCHORDS HYBRID PLAYER</h2>
                    <p style={S.permText}>
                        Arquitetura de Alinhamento Híbrido: Sincronia inteligente entre sua voz e o instrumento via WebSockets.
                    </p>
                    <p style={S.permSub}>
                        🔒 Áudio processado em tempo real. Desativa cancelamento de eco para captar a viola.
                    </p>
                    {permissionDenied && (
                        <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                            ⚠ Acesso negado ao microfone.
                        </p>
                    )}
                    <div style={S.permActions}>
                        <button style={S.cancelBtn} onClick={onClose}>Cancelar</button>
                        <button style={S.confirmBtn} onClick={() => setHasPermission(true)}>
                            <Mic size={16} /> Iniciar Sincronia
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main UI ──────────────────────────────────────────────
    return (
        <div style={S.overlay}>
            <style>
                {`
                    @keyframes pulse-data {
                        0% { left: 0; opacity: 0.8; }
                        100% { left: 100%; opacity: 0; }
                    }
                `}
            </style>
            {/* Header */}
            <div style={S.header}>
                <div>
                    <div style={S.songTitle}>{song.song_name}</div>
                    <div style={S.songArtist}>{song.artist_name}{song.sounding_key ? ` · Tom: ${song.sounding_key}` : ''}</div>
                </div>
                <div style={S.headerRight}>
                    <div style={S.stat}>
                        <span style={S.statLabel}>STATUS</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: connectionStatus === 'connected' ? '#22c55e' : '#ef4444',
                                boxShadow: connectionStatus === 'connected' ? '0 0 6px #22c55e' : 'none'
                            }} />
                            <span style={{ ...S.statValue, color: statusInfo.color, fontSize: 10 }}>{statusInfo.label}</span>
                        </div>
                    </div>
                    <div style={S.stat}>
                        <span style={S.statLabel}>SENSIBILIDADE</span>
                        <input
                            type="range"
                            min="0.5"
                            max="10.0"
                            step="0.5"
                            value={micGain}
                            onChange={(e) => setMicGain(parseFloat(e.target.value))}
                            style={{ width: 60, accentColor: '#B87333', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 10, color: '#B87333', fontWeight: 900, minWidth: 20 }}>{micGain}x</span>
                    </div>
                    <div style={S.stat}>
                        <span style={S.statLabel}>MIC</span>
                        <div style={{ ...S.micTrack, overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                                ...S.micFill,
                                width: `${micBarWidth}%`,
                                background: micBarWidth > 15 ? statusInfo.color : 'rgba(255,255,255,0.05)',
                                transition: 'width 0.05s ease-out'
                            }} />
                            {/* Connection Pulse */}
                            {connectionStatus === 'connected' && micBarWidth > 5 && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, bottom: 0, width: 2, background: '#fff',
                                    animation: 'pulse-data 1s infinite'
                                }} />
                            )}
                        </div>
                    </div>
                    <button
                        style={{ ...S.iconBtn, color: (isPaused || isWaiting) ? '#B87333' : '#64748b' }}
                        onClick={togglePause}
                    >
                        {(isPaused || isWaiting) ? <Play size={17} /> : <Pause size={17} />}
                    </button>
                    <button style={S.iconBtn} onClick={onClose} title="Fechar"><X size={18} /></button>
                </div>
            </div>

            {/* Progress bar */}
            <div style={S.progressTrack}>
                <div style={{ ...S.progressFill, width: `${progress}%` }} />
            </div>

            {/* Status bar */}
            <div style={{
                ...S.statusBar,
                background: `${statusInfo.color}10`,
                borderBottom: `1px solid ${statusInfo.color}30`,
            }}>
                <span style={{
                    ...S.statusDot,
                    background: statusInfo.color,
                    boxShadow: `0 0 8px ${statusInfo.color}`,
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: statusInfo.color }}>
                    {statusInfo.desc.toUpperCase()}
                </span>
            </div>

            {/* Stage */}
            <div style={S.stage}>
                {/* Current block */}
                <div style={{
                    ...S.currentBlock,
                    opacity: isPaused ? 0.65 : 1,
                    borderColor: statusInfo.color + '40',
                    transform: fsmState.action === 'advance' ? 'scale(1.01)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                    <span style={{ ...S.badge, background: statusInfo.color }}>{statusInfo.label}</span>
                    <div style={S.blockInner}>
                        {currentBlock?.chords && (
                            <pre style={S.chordLine}><RenderChordLine line={currentBlock.chords} /></pre>
                        )}
                        <div style={S.lyricLine}>
                            {currentBlock?.lyric ?? (currentBlock ? '\u00a0' : 'Fim da música')}
                        </div>
                    </div>
                </div>

                {/* Next block */}
                {nextBlock && (
                    <div style={{ ...S.nextBlock, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                        <span style={{ ...S.badge, background: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}>PRÓXIMA LINHA</span>
                        <div style={S.blockInner}>
                            {nextBlock.chords && (
                                <pre style={{ ...S.chordLine, fontSize: 18, opacity: 0.75 }}>
                                    <RenderChordLine line={nextBlock.chords} />
                                </pre>
                            )}
                            <div style={{ ...S.lyricLine, fontSize: 22, opacity: 0.85, color: '#e2e8f0' }}>{nextBlock.lyric ?? '\u00a0'}</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Live transcript */}
            {listenStatus && (
                <div style={S.transcriptBar}>
                    <Radio size={10} style={{ color: '#B87333', marginRight: 6, flexShrink: 0 }} />
                    <span style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {listenStatus}
                    </span>
                </div>
            )}

            {/* Scroller  — click to jump */}
            <div style={S.scroller} ref={scrollRef}>
                <div style={{ fontSize: 10, color: '#334155', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, padding: '0 16px 8px', userSelect: 'none' }}>
                    Toque numa linha para ir direto a ela ↓
                </div>
                {blocks.map((block, idx) => {
                    const active = idx === currentBlockIndex;
                    return (
                        <div
                            key={idx}
                            data-active={active ? 'true' : 'false'}
                            onClick={() => handleLineClick(idx)}
                            style={{
                                ...S.scrollLine,
                                opacity: active ? 1 : 0.26,
                                background: active ? 'rgba(184,115,51,0.07)' : 'transparent',
                                borderLeft: active ? '2px solid #B87333' : '2px solid transparent',
                                cursor: 'pointer',
                            }}
                        >
                            {block.chords && (
                                <pre style={{ ...S.scrollChords, color: active ? '#B87333' : '#78350f' }}>
                                    {block.chords}
                                </pre>
                            )}
                            {block.lyric !== null && (
                                <div style={{ fontSize: 13, color: active ? '#f1f5f9' : '#94a3b8', fontWeight: active ? 700 : 400 }}>
                                    {block.lyric || '\u00a0'}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const S = {
    overlay: {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(160deg, #090910 0%, #0C0B18 100%)',
        display: 'flex', flexDirection: 'column', color: '#f1f5f9',
        fontFamily: "'Inter', sans-serif", overflow: 'hidden',
    },
    header: {
        padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0,
    },
    songTitle: { fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, color: '#fff' },
    songArtist: { fontSize: 11, color: '#B87333', fontWeight: 700, marginTop: 2, letterSpacing: 1 },
    headerRight: { display: 'flex', alignItems: 'center', gap: 18 },
    stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
    statLabel: { fontSize: 7, fontWeight: 900, textTransform: 'uppercase', color: '#475569', letterSpacing: 2 },
    statValue: { fontSize: 15, fontWeight: 900, color: '#B87333' },
    micTrack: { width: 56, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
    micFill: { height: '100%', borderRadius: 3, transition: 'width 0.1s ease, background 0.3s ease' },
    iconBtn: {
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: '#64748b', borderRadius: 8, padding: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center',
    },
    progressTrack: { height: 2, background: 'rgba(255,255,255,0.04)', flexShrink: 0 },
    progressFill: { height: '100%', background: 'linear-gradient(90deg, #7C3501, #B87333)', transition: 'width 0.6s ease' },
    statusBar: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 24px', flexShrink: 0, transition: 'background 0.4s, border 0.4s',
    },
    statusDot: {
        display: 'inline-block', width: 6, height: 6, borderRadius: '50%', flexShrink: 0, transition: 'background 0.4s',
    },
    stage: { padding: '16px 24px 10px', display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 },
    currentBlock: {
        background: 'rgba(184,115,51,0.05)', border: '1px solid rgba(184,115,51,0.18)',
        borderRadius: 18, padding: '18px 24px 14px', position: 'relative',
        boxShadow: '0 8px 30px rgba(0,0,0,0.5)', transition: 'opacity 0.4s, border-color 0.4s',
    },
    nextBlock: {
        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 13, padding: '12px 22px 10px', position: 'relative',
    },
    badge: {
        position: 'absolute', top: -9, left: 16, fontSize: 8, fontWeight: 900,
        letterSpacing: 2, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5,
        background: '#B87333', color: '#000',
    },
    blockInner: { display: 'flex', flexDirection: 'column', gap: 4 },
    chordLine: {
        margin: 0, fontFamily: 'monospace', fontSize: 18, fontWeight: 900,
        letterSpacing: 2, whiteSpace: 'pre', textShadow: '0 0 16px rgba(212,135,60,0.35)',
    },
    lyricLine: { fontSize: 26, fontWeight: 800, color: '#f1f5f9', lineHeight: 1.3 },
    transcriptBar: {
        padding: '4px 24px', display: 'flex', alignItems: 'center', flexShrink: 0,
        borderTop: '1px solid rgba(255,255,255,0.03)',
    },
    scroller: {
        flex: 1, overflowY: 'auto', padding: '8px 16px 32px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
        scrollbarWidth: 'none',
    },
    scrollLine: { padding: '6px 14px', borderRadius: 8, transition: 'all 0.18s ease', marginBottom: 2 },
    scrollChords: { margin: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, whiteSpace: 'pre' },
    // Permission
    permCard: {
        margin: 'auto', background: '#13131C', border: '1px solid rgba(184,115,51,0.2)',
        borderRadius: 26, padding: '44px 36px', maxWidth: 460, width: '90%',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        boxShadow: '0 0 80px rgba(0,0,0,0.9)',
    },
    permIcon: {
        width: 76, height: 76, borderRadius: '50%',
        background: 'rgba(184,115,51,0.1)', border: '1px solid rgba(184,115,51,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22,
    },
    permTitle: { fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: 2 },
    permText: { fontSize: 14, color: '#cbd5e1', textAlign: 'center', lineHeight: 1.75, marginBottom: 10 },
    permSub: { fontSize: 11, color: '#475569', textAlign: 'center', lineHeight: 1.6, marginBottom: 26 },
    permActions: { display: 'flex', gap: 10, width: '100%' },
    cancelBtn: {
        flex: 1, padding: '13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        color: '#94a3b8', fontWeight: 700, fontSize: 12, borderRadius: 11, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: 1,
    },
    confirmBtn: {
        flex: 2, padding: '13px', background: 'linear-gradient(135deg, #8B4513, #B87333)', border: 'none',
        color: '#fff', fontWeight: 900, fontSize: 13, borderRadius: 11, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        boxShadow: '0 4px 20px rgba(184,115,51,0.35)',
    },
};

export default VideokePlayer;
