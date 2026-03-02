import React, { useState, useRef, useEffect } from 'react';
import { Music, UploadCloud, Plus, FileText, CheckCircle, AlertCircle, FileAudio, Info, X, Guitar, Settings2, Image as ImageIcon, Database, Edit3, Trash2, ArrowRight, Play, Maximize, Pause, ChevronUp, ChevronDown, Download, ArrowLeft, SkipBack, SkipForward, Save, FolderHeart, Flame, Hammer, Sparkles, RefreshCw, Zap, ShieldCheck, Monitor, Tv, Check, LayoutList, Mic } from 'lucide-react';
import * as XLSX from 'xlsx';
import { SVGuitarChord } from 'svguitar';

const ForgeLoading = ({ message = "Forjando conteúdo..." }) => (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070709]/95 backdrop-blur-3xl animate-in fade-in duration-700">
        <div className="relative w-80 h-80 flex items-center justify-center">
            {/* The Solid Anvil */}
            <div className="absolute bottom-12 w-64 h-32 flex flex-col items-center animate-anvil-vibrate">
                {/* Anvil Top */}
                <div className="w-56 h-12 bg-gradient-to-b from-slate-700 to-slate-900 rounded-lg shadow-[0_4px_0_0_rgba(0,0,0,0.5)] border-t border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite]"></div>
                    {/* Glowing Metal Spot */}
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 w-24 h-full bg-[#B87333]/20 blur-xl animate-pulse"></div>
                </div>
                {/* Anvil Neck */}
                <div className="w-32 h-8 bg-slate-800 shadow-inner translate-y-[-2px]"></div>
                {/* Anvil Base */}
                <div className="w-64 h-12 bg-slate-900 rounded-b-3xl shadow-2xl border-t border-black/40"></div>
            </div>

            {/* The Sharper Fire (Layered) */}
            <div className="absolute bottom-32 flex items-center justify-center pointer-events-none">
                {/* Outer Glow */}
                <Flame className="absolute w-40 h-40 text-[#B87333] opacity-20 blur-3xl scale-150 animate-forge-pulse" />
                {/* Deep Orange Layer */}
                <Flame className="absolute w-28 h-28 text-[#8B4513] fill-[#8B4513]/40 translate-y-2 opacity-60" />
                {/* Main Flame */}
                <Flame className="absolute w-24 h-24 text-[#B87333] fill-[#B87333]/30 animate-forge-pulse" />
                {/* White Hot Center */}
                <Flame className="absolute w-12 h-12 text-white/80 fill-white/10 scale-75 animate-pulse" />
            </div>

            {/* The Striking Hammer */}
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="animate-hammer-strike origin-bottom-left">
                    <Hammer className="w-24 h-24 text-slate-300 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)] -rotate-45" />
                </div>
            </div>

            {/* Impact Effects (Sparks & Notes Burst) */}
            <div className="absolute bottom-40 w-full h-40 pointer-events-none">
                {/* Sparks Burst on Strike */}
                {[...Array(16)].map((_, i) => (
                    <div
                        key={`spark-${i}`}
                        className="absolute left-1/2 top-1/2 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-spark-burst"
                        style={{
                            '--tw-translate-x': `${(Math.random() - 0.5) * 200}px`,
                            '--tw-translate-y': `${-Math.random() * 100}px`,
                            animationDelay: '0.15s'
                        }}
                    />
                ))}

                {/* Music Note Eruptions */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={`note-${i}`}
                        className="absolute left-1/2 top-1/2 animate-note-eruption"
                        style={{
                            '--tw-translate-x': `${(Math.random() - 0.5) * 150}px`,
                            '--tw-translate-y': `${-Math.random() * 50}px`,
                            animationDelay: `${0.15 + (i * 0.1)}s`
                        }}
                    >
                        <Music className={`w-${8 + (i % 4)} h-${8 + (i % 4)} ${i % 2 === 0 ? 'text-[#B87333]' : 'text-white/60'}`} />
                    </div>
                ))}
            </div>
        </div>

        {/* Message Container */}
        <div className="mt-8 text-center space-y-6 z-10">
            <div className="space-y-2">
                <h3 className="text-5xl font-black text-white italic tracking-[0.25em] animate-pulse uppercase drop-shadow-[0_0_15px_rgba(184,115,51,0.4)]">
                    {message}
                </h3>
                <div className="flex items-center justify-center space-x-4 opacity-100">
                    <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#B87333]"></div>
                    <p className="text-lg text-[#B87333] font-bold uppercase tracking-[0.6em]">Aço ao rubro • Acordes afinados</p>
                    <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#B87333]"></div>
                </div>
            </div>

            {/* Minimal Progress Bar */}
            <div className="w-64 h-1 bg-white/5 rounded-full mx-auto overflow-hidden border border-white/5">
                <div className="h-full bg-[#B87333] w-1/3 animate-[shimmer_2s_infinite] origin-left scale-x-150"></div>
            </div>
        </div>
    </div>
);

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

    // Batch Form State
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchError, setBatchError] = useState('');
    const fileInputRef = useRef(null);

    // Batch Mapping State
    const [batchRawData, setBatchRawData] = useState([]);
    const [batchHeaders, setBatchHeaders] = useState([]);
    const [batchMapping, setBatchMapping] = useState({ song_name: '', artist_name: '', key: '' });
    const [showMappingUI, setShowMappingUI] = useState(false);

    // Acervo State
    const [acervo, setAcervo] = useState([]);
    const [acervoLoading, setAcervoLoading] = useState(false);
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
                    const lines = currentSong.content.split('\n');
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
        if (!song || !song.requested_key || isTransposing) return;
        setIsTransposing(true);
        try {
            const res = await fetch('http://localhost:8000/api/transpose', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: song.content, current_key: song.requested_key, semitones: semitones })
            });
            const data = await res.json();
            if (data.transposed_content) {
                const newSongs = [...songs];
                newSongs[index].content = data.transposed_content;
                newSongs[index].requested_key = data.new_key;
                setSongs(newSongs);
            }
        } catch (err) { console.error(err); }
        finally { setIsTransposing(false); }
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

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setManualLoading(true);
        setManualError('');
        try {
            const res = await fetch('http://localhost:8000/api/music/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_name: songName,
                    artist_name: artistName,
                    key: songKey,
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
                sounding_key: data.sounding_key || data.requested_key || data.original_key,
                song_key: data.original_key || data.requested_key,
                capo: data.capo || manualCapo
            };
            setSongs([...songs, newSong]);
            setSongName(''); setArtistName(''); setSongKey('C');
            setSongVersion('Principal');
            setManualCapo(0);
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
                finally { setBatchLoading(false); }
            };
            reader.readAsBinaryString(file);
        }
    };

    const handleBatchProcess = async () => {
        setBatchLoading(true);
        const songsPayload = batchRawData.map(row => ({
            song_name: String(row[batchMapping.song_name] || ''),
            artist_name: String(row[batchMapping.artist_name] || ''),
            key: String(row[batchMapping.key] || ''),
            version: 'Principal',
            include_tabs: includeTabs
        })).filter(s => s.song_name && s.key);
        try {
            const res = await fetch('http://localhost:8000/api/music/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ songs: songsPayload })
            });
            const data = await res.json();
            setSongs([...songs, ...data.results.map(s => ({ ...s, show_chords: true }))]);
        } catch (err) { setBatchError(err.message); }
        finally { setBatchLoading(false); setShowMappingUI(false); }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files[0];
        if (file) setCoverImage(file);
    };

    const handleGenerateDocument = async () => {
        if (songs.length === 0) return;
        setIsGenerating(true);
        try {
            const formData = new FormData();
            // Include all songs that have been successfully loaded (manual or batch)
            const validSongs = songs.filter(s => s.content || s.status === 'success');
            formData.append('songs_data', JSON.stringify(validSongs));
            formData.append('export_format', exportFormat);
            if (coverImage) formData.append('cover_image', coverImage);
            const res = await fetch('http://localhost:8000/api/generate_book', { method: 'POST', body: formData });
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
            {isGenerating && <ForgeLoading message="Forjando conteúdo..." />}
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
                                        {currentSong?.content.split('\n').map((line, lIdx) => {
                                            const isChordLine = line.match(/^[A-G][b#]?(maj|min|m|7|sus|dim|aug)?/i);
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
                                                    <pre className={`font-mono leading-relaxed whitespace-pre-wrap ${isChordLine ? 'text-[#B87333] font-black italic tracking-tight' : 'text-slate-200 font-medium'}`}>{line || ' '}</pre>
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
                    <>
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
                                                <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
                                                    <div className="space-y-6">
                                                        <div className="relative">
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Nome da Música</label>
                                                            <input
                                                                type="text" required value={songName}
                                                                onChange={e => { setSongName(e.target.value); setShowSuggestions(true); }}
                                                                onFocus={() => setShowSuggestions(true)}
                                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white focus:ring-2 focus:ring-[#B87333]/40 outline-none transition-all font-bold" placeholder="Ex: Mil Acasos"
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
                                                                                    setSongName(item.song);
                                                                                    setArtistName(item.artist);
                                                                                    if (item.key) setSongKey(normalizeNote(item.key));
                                                                                    else fetchSongMetadata(item.song, item.artist);
                                                                                    setShowSuggestions(false);
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
                                                                    <div className="p-3 bg-black/40 text-center">
                                                                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Pressione ENTER para buscar no Acervo</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Artista / Banda</label>
                                                            <input
                                                                type="text" required value={artistName}
                                                                onChange={e => setArtistName(e.target.value)}
                                                                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white focus:ring-2 focus:ring-[#B87333]/40 outline-none transition-all font-bold" placeholder="Ex: Skank"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Tom Original</label>
                                                                <select value={songKey} onChange={e => setSongKey(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold">
                                                                    {["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"].map(k => <option key={k} value={k} className="bg-[#1A1A1A]">{k}</option>)}
                                                                </select>
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Capo</label>
                                                                <select value={manualCapo} onChange={e => setManualCapo(Number(e.target.value))} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold">
                                                                    {[...Array(13)].map((_, i) => <option key={i} value={i} className="bg-[#1A1A1A]">{i === 0 ? 'Sem Capo' : `${i}ª Casa`}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        {availableVersions && availableVersions.length > 1 && (
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 ml-1">Versões Disponíveis</label>
                                                                <select value={songVersion} onChange={e => setSongVersion(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-5 text-white outline-none cursor-pointer font-bold">
                                                                    {availableVersions.map(v => <option key={v.key} value={v.key} className="bg-[#1A1A1A]">{v.name}</option>)}
                                                                </select>
                                                            </div>
                                                        )}
                                                        <button type="submit" disabled={manualLoading} className="w-full py-5 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B87333]/20 active:scale-[0.98] mt-auto">
                                                            {manualLoading ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Adicionar à Forja"}
                                                        </button>
                                                    </div>
                                                </form>
                                            )}

                                            {activeTab === 'batch' && (
                                                <div className="flex flex-col items-center justify-center py-10 space-y-8 animate-in fade-in duration-500">
                                                    {!showMappingUI ? (
                                                        <div onClick={() => fileInputRef.current?.click()} className="w-full max-w-2xl border-2 border-dashed border-white/10 hover:border-[#B87333]/50 bg-black/20 rounded-[40px] p-16 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                                            <div className="w-20 h-20 bg-[#B87333]/10 rounded-3xl flex items-center justify-center mb-6 border border-[#B87333]/20 group-hover:scale-110 transition-transform">
                                                                <UploadCloud className="w-10 h-10 text-[#B87333]" />
                                                            </div>
                                                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Importação em Massa</h3>
                                                            <p className="text-xs text-slate-500 uppercase font-bold mt-3">PDF, XLSX ou CSV</p>
                                                            <input type="file" ref={fileInputRef} onChange={handleBatchFileSelect} className="hidden" />
                                                        </div>
                                                    ) : (
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
                                                                <button onClick={handleBatchProcess} className="flex-[2] py-4 bg-[#B87333] text-white font-black uppercase text-[10px] rounded-xl shadow-lg shadow-[#B87333]/20">Processar Lote</button>
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

                                        {/* LISTA DE MÚSICAS SELECIONADAS (INTEGRADA NO PASSO 1) */}
                                        {songs.length > 0 && (
                                            <div className="mt-12 pt-12 border-t border-white/5 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="w-1.5 h-8 bg-[#B87333] rounded-full shadow-[0_0_15px_rgba(184,115,51,0.4)]"></div>
                                                        <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Peças na Forja</h3>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</span>
                                                        <span className="text-xs font-black bg-[#B87333] text-white py-1.5 px-4 rounded-full shadow-lg shadow-[#B87333]/20 uppercase italic">{songs.length}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                                    {songs.map((song, i) => (
                                                        <div key={i} className="bg-black/60 border border-white/5 p-5 rounded-[28px] group hover:border-[#B87333]/40 transition-all relative overflow-hidden flex flex-col justify-between">
                                                            <div className="absolute top-0 right-0 w-20 h-20 bg-[#B87333]/5 rounded-bl-[40px] -mr-6 -mt-6 group-hover:bg-[#B87333]/10 transition-all"></div>
                                                            <div className="flex-1 min-w-0 mb-4 z-10">
                                                                <h4 className="font-black text-white text-md uppercase italic tracking-tighter truncate leading-tight group-hover:text-[#B87333] transition-colors">{song.song_name}</h4>
                                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-1 truncate">{song.artist_name}</p>
                                                            </div>
                                                            <div className="flex items-center justify-between pt-3 border-t border-white/5 z-10">
                                                                <div className="flex items-baseline space-x-2">
                                                                    <span className="text-[10px] font-black text-white italic">{song.sounding_key || song.song_key}</span>
                                                                    {song.capo > 0 && <span className="text-[8px] text-[#B87333] font-black uppercase tracking-tighter opacity-80">Capo {song.capo}</span>}
                                                                </div>
                                                                <div className="flex items-center space-x-1.5">
                                                                    <button onClick={() => toggleChords(i)} className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all ${song.show_chords ? 'bg-[#B87333] text-white border-[#B87333]/30' : 'bg-white/5 text-slate-700 border-white/5 hover:text-[#B87333]'}`}>
                                                                        <Guitar className="w-3 h-3" />
                                                                    </button>
                                                                    <button onClick={() => removeSong(i)} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-red-900/40 text-slate-700 hover:text-red-500 rounded-lg border border-white/5 transition-all">
                                                                        <Trash2 className="w-3 h-3" />
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
                                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 max-w-xs">Interface otimizada para palcos, com autoscroll e fontes industriais de alta visibilidade.</p>
                                                <button
                                                    onClick={() => { setActiveTab('player'); setCurrentStep(3); setSelectedManualIndex(songs.length > 0 ? 0 : null); }}
                                                    className="px-10 py-5 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-[#B87333]/20 active:scale-95"
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
                    </>
                )}
            </main>
        </div>
    );
}


const ChordDiagram = ({ chordName, chordsMap }) => {
    const containerRef = useRef(null);
    const chart = useRef(null);
    useEffect(() => {
        if (!containerRef.current) return;
        const pos = chordsMap[chordName] || [-1, -1, -1, -1, -1, -1];
        const fingers = pos.map((p, idx) => [6 - idx, p === -1 ? 'x' : p]);
        if (!chart.current) {
            chart.current = new SVGuitarChord(containerRef.current)
                .configure({ position: 1, strings: 6, frets: 5, color: '#1e293b' })
                .chord({ fingers }).draw();
        }
    }, [chordName, chordsMap]);
    return <div ref={containerRef} className="w-full h-40" />;
};
