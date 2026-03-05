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
    const chords = (line.match(CHORD_TOKEN_RE) || []).map(m => m.trim());
    const cleaned = line.replace(CHORD_TOKEN_RE, '').replace(/[\s|()\-xX0-9:]/g, '');
    return chords.length > 0 && cleaned.length < Math.max(2, line.trim().length * 0.25);
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
        if (isChordOnlyLine(line)) {
            const next = lines[i + 1];
            if (next !== undefined && !isChordOnlyLine(next)) {
                blocks.push({ chords: line, lyric: next, lineIndex: i });
                i += 2;
            } else {
                blocks.push({ chords: line, lyric: null, lineIndex: i });
                i++;
            }
        } else {
            blocks.push({ chords: null, lyric: line, lineIndex: i });
            i++;
        }
    }
    return blocks;
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

    // ── Rhythmic timer ───────────────────────────────────────
    // Advances one block per (4 beats at current BPM), but stops
    // when isPaused === true or isWaiting === true.
    const tickRef = useRef(null);

    const startRhythmicTimer = useCallback(() => {
        if (advTimerRef.current) clearTimeout(advTimerRef.current);

        const tick = () => {
            const msPerLine = (60000 / bpmRef.current) * 4;
            advTimerRef.current = setTimeout(() => {
                // Only advance if not paused and not waiting
                if (!pausedRef.current && !waitingRef.current) {
                    setCurrentBlockIndex(prev => {
                        const next = prev + 1;
                        if (next >= blocksRef.current.length) {
                            waitingRef.current = true;
                            setIsWaiting(true);
                            return prev;
                        }
                        currentRef.current = next;
                        return next;
                    });
                }
                tick(); // schedule next tick regardless of pause state
            }, msPerLine);
        };
        tick();
    }, []);

    // ── Silence detection: pauses when singer stops ──────────
    // Called every time micLevel updates (via onMicLevel callback).
    const handleMicLevel = useCallback((level) => {
        setMicLevel(level);
        micLevelRef.current = level;

        if (!anchoredRef.current) return; // don't detect silence before first match

        if (level < SILENCE_THRESHOLD) {
            // Start silence timer if not already running
            if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    silenceTimerRef.current = null;
                    // Only pause if mic is still silent
                    if (micLevelRef.current < SILENCE_THRESHOLD) {
                        pausedRef.current = true;
                        setIsPaused(true);
                    }
                }, SILENCE_DELAY);
            }
        } else {
            // Voice detected: cancel silence timer and resume if paused
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
            }
            if (level >= RESUME_THRESHOLD && pausedRef.current) {
                pausedRef.current = false;
                setIsPaused(false);
            }
        }
    }, []);

    // ── Voice matching ───────────────────────────────────────
    const handleVoice = useCallback((text, isFinal) => {
        if (!isFinal) { setListenStatus(text); return; }
        setListenStatus(text);
        if (!text?.trim()) return;

        const blks = blocksRef.current;
        const cur = currentRef.current;
        const anch = anchoredRef.current;
        const now = Date.now();

        if (now - lastJumpRef.current < 2000) return;

        const result = PhoneticMatcher.findBestBlock(text, blks, cur, {
            searchBackward: anch ? 2 : 0,
            searchForward: anch ? 6 : 22,
            minThreshold: anch ? 0.42 : 0.38,
            proximityBonus: anch ? 0.15 : 0.04,
            anchored: anch,
        });

        setLastConfidence(result ? +(result.confidence * 100).toFixed(0) : 0);
        if (!result) return;

        const targetIdx = result.index;
        lastJumpRef.current = now;

        if (!anch) {
            // First match: anchor + start timer
            anchoredRef.current = true;
            waitingRef.current = false;
            pausedRef.current = false;
            setIsAnchored(true);
            setIsWaiting(false);
            setIsPaused(false);
            setCurrentBlockIndex(targetIdx);
            currentRef.current = targetIdx;
            startRhythmicTimer();
            return;
        }

        // Prevent jumping back more than 4 blocks unless it's the chorus redirect
        if (targetIdx < cur - 4) return;

        setCurrentBlockIndex(targetIdx);
        currentRef.current = targetIdx;
    }, [song, startRhythmicTimer]);

    // ── Manual line click: jump + resume ────────────────────
    const handleLineClick = useCallback((idx) => {
        setCurrentBlockIndex(idx);
        currentRef.current = idx;
        lastJumpRef.current = Date.now();

        // If player was paused/waiting, resume it
        if (anchoredRef.current) {
            pausedRef.current = false;
            waitingRef.current = false;
            setIsPaused(false);
            setIsWaiting(false);
        } else {
            // Click before first voice match: anchor here and start
            anchoredRef.current = true;
            pausedRef.current = false;
            waitingRef.current = false;
            setIsAnchored(true);
            setIsPaused(false);
            setIsWaiting(false);
            startRhythmicTimer();
        }
    }, [startRhythmicTimer]);

    // ── AudioTracker startup ─────────────────────────────────
    const startMic = useCallback(() => {
        if (trackerRef.current) return;
        trackerRef.current = new AudioTracker(
            (detectedBpm) => {
                setBpm(prev => {
                    const diff = detectedBpm - prev;
                    return Math.abs(diff) > 10 ? prev + Math.sign(diff) * 2 : detectedBpm;
                });
            },
            handleMicLevel,
            () => { },
            (text, isFinal) => handleVoice(text, isFinal)
        );
        trackerRef.current.start().catch(() => setPermissionDenied(true));
    }, [handleMicLevel, handleVoice]);

    useEffect(() => {
        if (hasPermission) startMic();
        return () => {
            if (trackerRef.current) { trackerRef.current.stop(); trackerRef.current = null; }
            if (advTimerRef.current) clearTimeout(advTimerRef.current);
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        };
    }, [hasPermission, startMic]);

    // ── Manual pause/resume toggle ───────────────────────────
    const togglePause = () => {
        if (isPaused || isWaiting) {
            pausedRef.current = false;
            waitingRef.current = false;
            setIsPaused(false);
            setIsWaiting(false);
            if (!anchoredRef.current) {
                anchoredRef.current = true;
                setIsAnchored(true);
                startRhythmicTimer();
            }
        } else {
            pausedRef.current = true;
            setIsPaused(true);
        }
    };

    // ── Derived values ───────────────────────────────────────
    const currentBlock = blocks[currentBlockIndex];
    const nextBlock = blocks[currentBlockIndex + 1];
    const progress = blocks.length > 1 ? Math.round((currentBlockIndex / (blocks.length - 1)) * 100) : 0;
    const micBarWidth = Math.min(100, micLevel * 1.2);
    const isSilent = micLevel < SILENCE_THRESHOLD && isAnchored;

    // ── Permission Screen ────────────────────────────────────
    if (!hasPermission) {
        return (
            <div style={S.overlay}>
                <div style={S.permCard}>
                    <div style={S.permIcon}><Mic size={40} style={{ color: '#B87333' }} /></div>
                    <h2 style={S.permTitle}>Modo Videokê IA</h2>
                    <p style={S.permText}>
                        A IA escuta sua voz em tempo real e acompanha a cifra automaticamente enquanto você canta.
                        O app precisa acessar o <strong>microfone do seu dispositivo</strong>.
                    </p>
                    <p style={S.permSub}>
                        🔒 Nenhuma gravação é salva ou enviada para servidores. Processamento 100% local.
                    </p>
                    {permissionDenied && (
                        <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                            ⚠ Acesso negado. Verifique as permissões do navegador.
                        </p>
                    )}
                    <div style={S.permActions}>
                        <button style={S.cancelBtn} onClick={onClose}>Cancelar</button>
                        <button style={S.confirmBtn} onClick={() => setHasPermission(true)}>
                            <Mic size={16} /> Ativar e Iniciar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main UI ──────────────────────────────────────────────
    return (
        <div style={S.overlay}>
            {/* Header */}
            <div style={S.header}>
                <div>
                    <div style={S.songTitle}>{song.song_name}</div>
                    <div style={S.songArtist}>{song.artist_name}{song.sounding_key ? ` · Tom: ${song.sounding_key}` : ''}</div>
                </div>
                <div style={S.headerRight}>
                    {/* BPM */}
                    <div style={S.stat}>
                        <span style={S.statLabel}>BPM</span>
                        <span style={S.statValue}>{Math.round(bpm)}</span>
                    </div>
                    {/* Confidence */}
                    <div style={S.stat}>
                        <span style={S.statLabel}>CONF</span>
                        <span style={{ ...S.statValue, color: lastConfidence >= 50 ? '#22c55e' : lastConfidence >= 30 ? '#B87333' : '#475569' }}>
                            {lastConfidence}%
                        </span>
                    </div>
                    {/* Mic */}
                    <div style={S.stat}>
                        <span style={S.statLabel}>MIC</span>
                        <div style={S.micTrack}>
                            <div style={{ ...S.micFill, width: `${micBarWidth}%`, background: micBarWidth > 25 ? '#B87333' : 'rgba(184,115,51,0.2)' }} />
                        </div>
                    </div>
                    {/* Manual pause/play */}
                    <button
                        style={{ ...S.iconBtn, color: (isPaused || isWaiting) ? '#B87333' : '#64748b' }}
                        onClick={togglePause}
                        title={(isPaused || isWaiting) ? 'Retomar' : 'Pausar'}
                    >
                        {(isPaused || isWaiting) ? <Play size={17} /> : <Pause size={17} />}
                    </button>
                    {/* Skip forward */}
                    <button
                        style={S.iconBtn}
                        onClick={() => {
                            const next = Math.min(blocks.length - 1, currentRef.current + 1);
                            handleLineClick(next);
                        }}
                        title="Avançar linha"
                    >
                        <SkipForward size={16} />
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
                background: isPaused ? 'rgba(239,68,68,0.06)' : isSilent ? 'rgba(100,116,139,0.04)' : isWaiting ? 'rgba(184,115,51,0.06)' : 'rgba(34,197,94,0.04)',
                borderBottom: isPaused ? '1px solid rgba(239,68,68,0.12)' : '1px solid rgba(255,255,255,0.03)',
            }}>
                <span style={{
                    ...S.statusDot,
                    background: isPaused ? '#ef4444' : isSilent ? '#475569' : isWaiting ? '#B87333' : '#22c55e',
                    boxShadow: isPaused ? '0 0 6px #ef4444' : isWaiting ? '0 0 6px #B87333' : !isWaiting && !isPaused ? '0 0 6px #22c55e' : 'none',
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: isPaused ? '#ef4444' : isSilent ? '#475569' : isWaiting ? '#B87333' : '#22c55e' }}>
                    {isPaused
                        ? 'PAUSADO — clique em ▶ ou numa linha para retomar'
                        : isSilent
                            ? 'SILÊNCIO DETECTADO — aguardando som...'
                            : isWaiting
                                ? 'AGUARDANDO SUA VOZ PARA INICIAR...'
                                : 'SINCRONIZANDO IA'}
                </span>
            </div>

            {/* Stage */}
            <div style={S.stage}>
                {/* Current block */}
                <div style={{
                    ...S.currentBlock,
                    opacity: isPaused ? 0.65 : 1,
                    borderColor: isPaused ? 'rgba(239,68,68,0.2)' : 'rgba(184,115,51,0.18)',
                }}>
                    <span style={S.badge}>AGORA</span>
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
                    <div style={S.nextBlock}>
                        <span style={{ ...S.badge, background: 'rgba(255,255,255,0.04)', color: '#64748b' }}>A SEGUIR</span>
                        <div style={S.blockInner}>
                            {nextBlock.chords && (
                                <pre style={{ ...S.chordLine, fontSize: 15, opacity: 0.4 }}>
                                    <RenderChordLine line={nextBlock.chords} />
                                </pre>
                            )}
                            <div style={{ ...S.lyricLine, fontSize: 19, opacity: 0.35 }}>{nextBlock.lyric ?? '\u00a0'}</div>
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
