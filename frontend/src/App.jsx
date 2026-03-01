import React, { useState, useRef, useEffect } from 'react';
import { Music, UploadCloud, Plus, FileText, CheckCircle, AlertCircle, FileAudio, Info, X, Guitar, Settings2, Image as ImageIcon, Database, Edit3, Trash2, ArrowRight, Play, Maximize, Pause, ChevronUp, ChevronDown, Download, ArrowLeft, SkipBack, SkipForward, Save, FolderHeart, Flame, Hammer, Sparkles, RefreshCw } from 'lucide-react';
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

export default function App() {
    const [activeTab, setActiveTab] = useState('manual');
    const [songs, setSongs] = useState([]);
    const [selectedManualIndex, setSelectedManualIndex] = useState(null);
    const [isFullScreenPlayer, setIsFullScreenPlayer] = useState(false);
    const [isTransposing, setIsTransposing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState(null);

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
    const [suggestionType, setSuggestionType] = useState('song');

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
    const [transcript, setTranscript] = useState('');
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
            setTranscript(text);
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
        const currentSong = songs[songIdx];
        const transcriptRaw = text.toLowerCase();
        const lines = currentSong.content.split('\n');

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
            if (songName.length >= 3 && suggestionType === 'song') fetchSuggestions(songName);
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
                    include_tabs: includeTabs
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Erro ao buscar cifra.');
            setSongs([...songs, { ...data, status: 'success', show_chords: true }]);
            setSongName(''); setArtistName(''); setSongKey('C');
            setSongVersion('Principal');
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
            formData.append('songs_data', JSON.stringify(songs.filter(s => s.status === 'success')));
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

    return (
        <div className="min-h-screen bg-[#0F0F12] text-[#A5A9B4] font-sans selection:bg-[#B87333]/30 overflow-x-hidden relative flex flex-col items-center py-10 px-4 sm:px-6 lg:px-8">
            {/* Global Forge Animation */}
            {(batchLoading || isGenerating) && <ForgeLoading message={isGenerating ? "FORJANDO DOCUMENTOS..." : "FORJANDO LOTE..."} />}

            <div className="w-full max-w-6xl space-y-8">
                {activeTab !== 'presentation' && activeTab !== 'player' && (
                    <div className="text-center space-y-4">
                        <div className="flex justify-center mb-6">
                            <div className="w-64 h-64 flex items-center justify-center p-2 rounded-full bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] shadow-2xl shadow-[#B87333]/10 border border-[#B87333]/20 relative group">
                                <div className="absolute inset-0 bg-[#B87333]/5 rounded-full blur-xl group-hover:bg-[#B87333]/10 transition-all duration-700"></div>
                                <img src="/logo.png" alt="IronChords Logo" className="w-full h-full object-contain relative z-10" />
                            </div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white uppercase italic">
                            Iron<span className="text-[#B87333]">Chords</span>
                        </h1>
                    </div>
                )}

                <div className={`grid grid-cols-1 ${activeTab === 'presentation' || activeTab === 'player' ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-8`}>
                    {(activeTab !== 'presentation' && activeTab !== 'player') && (
                        <div className="lg:col-span-6 space-y-6">
                            <div className="bg-[#16161D]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
                                <div className="flex p-1.5 space-x-1.5 bg-black/40 rounded-2xl mb-8 overflow-x-auto border border-white/5">
                                    <button onClick={() => setActiveTab('manual')} className={`flex-1 min-w-[100px] flex items-center justify-center px-3 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'manual' ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><Plus className="w-4 h-4 mr-2" /> Manual</button>
                                    <button onClick={() => setActiveTab('batch')} className={`flex-1 min-w-[100px] flex items-center justify-center px-3 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'batch' ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><UploadCloud className="w-4 h-4 mr-2" /> Em Lote</button>
                                    <button onClick={() => setActiveTab('acervo')} className={`flex-1 min-w-[100px] flex items-center justify-center px-3 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'acervo' ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><Database className="w-4 h-4 mr-2" /> Acervo</button>
                                    <button onClick={() => setActiveTab('player')} className={`flex-1 min-w-[100px] flex items-center justify-center px-3 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-500 ${activeTab === 'player' ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}><Maximize className="w-4 h-4 mr-2" /> Player</button>
                                </div>

                                {activeTab === 'manual' && (
                                    <form onSubmit={handleManualSubmit} className="space-y-5">
                                        <div className="relative">
                                            <label className="block text-xs font-black uppercase tracking-widest text-[#A5A9B4] mb-2 ml-1">Música</label>
                                            <input
                                                type="text" required value={songName}
                                                onChange={e => { setSongName(e.target.value); setShowSuggestions(true); }}
                                                onFocus={() => setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#B87333]/50 outline-none placeholder:text-slate-700 transition-all font-medium" placeholder="Ex: Terra Seca"
                                            />
                                            {showSuggestions && suggestions.length > 0 && (
                                                <div className="absolute z-[100] w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-2xl">
                                                    {suggestions.map((item, idx) => (
                                                        <button key={idx} type="button" onClick={() => {
                                                            setSongName(item.song);
                                                            setArtistName(item.artist);
                                                            if (item.key) {
                                                                setSongKey(normalizeNote(item.key));
                                                            } else {
                                                                fetchSongMetadata(item.song, item.artist);
                                                            }
                                                            setShowSuggestions(false);
                                                        }} className="w-full text-left px-4 py-4 hover:bg-[#B87333]/10 transition-colors border-b border-white/5 last:border-0 group">
                                                            <div className="text-sm font-black text-white group-hover:text-[#B87333] transition-colors">{item.song}</div>
                                                            <div className="text-xs text-slate-500 uppercase font-bold mt-0.5">{item.artist}</div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest text-[#A5A9B4] mb-2 ml-1">Tom Desejado</label>
                                                <select value={songKey} onChange={e => setSongKey(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#B87333]/50 outline-none transition-all font-medium cursor-pointer">
                                                    {NOTES.map(n => <option key={n} value={n} className="bg-[#1A1A1A]">{n}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest text-[#A5A9B4] mb-2 ml-1">Versão</label>
                                                <select value={songVersion} onChange={e => setSongVersion(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-[#B87333]/50 outline-none transition-all font-medium cursor-pointer">
                                                    <option value="Principal" className="bg-[#1A1A1A]">Principal</option>
                                                    <option value="Simplificada" className="bg-[#1A1A1A]">Simplificada</option>
                                                    <option value="v2" className="bg-[#1A1A1A]">v2</option>
                                                    <option value="v3" className="bg-[#1A1A1A]">v3</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between p-4 bg-black/20 border border-white/5 rounded-2xl">
                                            <div className="flex items-center space-x-3">
                                                <Info className="w-4 h-4 text-[#B87333]" />
                                                <span className="text-[10px] font-black text-[#A5A9B4] uppercase tracking-widest">Incluir Tablaturas</span>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" checked={includeTabs} onChange={() => setIncludeTabs(!includeTabs)} />
                                                <div className="w-11 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B87333] peer-checked:after:bg-white text-xs"></div>
                                            </label>
                                        </div>
                                        <button disabled={manualLoading} type="submit" className="w-full py-5 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-[#B87333]/20 active:scale-[0.98]">Adicionar à seleção de músicas</button>
                                    </form>
                                )}

                                {activeTab === 'batch' && (
                                    <div className="space-y-6">
                                        {!showMappingUI ? (
                                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 hover:border-[#B87333]/50 bg-black/20 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all group">
                                                <UploadCloud className="w-12 h-12 text-slate-500 mb-4 group-hover:text-[#B87333] transition-colors" />
                                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Selecione PDF, XLSX ou CSV</h3>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mt-2">Arraste ou clique para forjar o lote</p>
                                                <input type="file" ref={fileInputRef} onChange={handleBatchFileSelect} accept=".csv, .xlsx, .pdf" className="hidden" />
                                            </div>
                                        ) : (
                                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
                                                    <p className="text-[10px] font-black text-[#A5A9B4] uppercase tracking-widest mb-3">Mapeamento de Colunas</p>
                                                    <div className="space-y-3">
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 ml-1">Música</label>
                                                            <select value={batchMapping.song_name} onChange={e => setBatchMapping({ ...batchMapping, song_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none cursor-pointer">
                                                                <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                                                                {batchHeaders.map(h => <option key={h} value={h} className="bg-[#1A1A1A]">{h}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 ml-1">Banda / Artista</label>
                                                            <select value={batchMapping.artist_name} onChange={e => setBatchMapping({ ...batchMapping, artist_name: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none cursor-pointer">
                                                                <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                                                                {batchHeaders.map(h => <option key={h} value={h} className="bg-[#1A1A1A]">{h}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <label className="text-[9px] font-bold text-slate-500 uppercase mb-1 ml-1">Tom</label>
                                                            <select value={batchMapping.key} onChange={e => setBatchMapping({ ...batchMapping, key: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white outline-none cursor-pointer">
                                                                <option value="" className="bg-[#1A1A1A]">Selecione...</option>
                                                                {batchHeaders.map(h => <option key={h} value={h} className="bg-[#1A1A1A]">{h}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex space-x-3">
                                                    <button onClick={() => setShowMappingUI(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all">Cancelar</button>
                                                    <button onClick={handleBatchProcess} className="flex-[2] py-4 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-widest text-[10px] rounded-xl active:scale-95 transition-all shadow-lg shadow-[#B87333]/20">Importar Lote</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="bg-[#16161D]/80 border border-white/5 rounded-3xl p-6 shadow-2xl space-y-6">
                                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-[#A5A9B4] flex items-center italic"><Settings2 className="w-4 h-4 mr-2 text-[#B87333]" /> Configurações de Forja</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Formato</label>
                                        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs font-bold text-white outline-none cursor-pointer">
                                            <option value="docx" className="bg-[#1A1A1A]">Apenas DOCX</option>
                                            <option value="pdf" className="bg-[#1A1A1A]">Apenas PDF</option>
                                            <option value="both" className="bg-[#1A1A1A]">Ambos (.ZIP)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Capa</label>
                                        <button onClick={() => coverInputRef.current?.click()} className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-[10px] font-black tracking-widest text-[#B87333] truncate hover:bg-white/5 transition-all text-center">
                                            {coverImage ? coverImage.name : 'VINCULAR IMAGEM'}
                                        </button>
                                        <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/*" className="hidden" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className={activeTab === 'presentation' || activeTab === 'player' ? 'lg:col-span-12' : 'lg:col-span-6'}>
                        {activeTab === 'player' ? (
                            <div className="flex flex-col h-[calc(100vh-180px)] space-y-6">
                                {/* Permanent Player Header */}
                                <div className="flex items-center justify-between bg-[#16161D] p-5 rounded-3xl border border-white/5 shadow-2xl">
                                    <div className="flex items-center space-x-6">
                                        <button
                                            onClick={() => { setSelectedManualIndex(null); setActiveTab('manual'); }}
                                            className="w-14 h-14 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-[#B87333] hover:border-[#B87333]/50 transition-all active:scale-[0.95]"
                                            title="Sair do Player"
                                        >
                                            <ArrowLeft className="w-7 h-7" />
                                        </button>
                                        <div className="flex flex-col">
                                            <h2 className="text-2xl font-black text-white leading-none uppercase italic tracking-tighter">
                                                {selectedManualIndex !== null ? songs[selectedManualIndex].song_name : 'Modo Performance'}
                                            </h2>
                                            <p className="text-[#B87333] font-black text-[10px] uppercase tracking-[0.3em] mt-2 opacity-80">
                                                {selectedManualIndex !== null ? songs[selectedManualIndex].artist_name : 'Sincronização Industrial'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center bg-black/40 p-2 rounded-2xl border border-white/10 space-x-1">
                                            <button
                                                disabled={songs.length === 0 || selectedManualIndex === 0 || selectedManualIndex === null}
                                                onClick={() => setSelectedManualIndex(prev => prev - 1)}
                                                className="p-2.5 text-slate-500 hover:text-[#B87333] disabled:opacity-10 transition-colors"
                                            >
                                                <SkipBack className="w-6 h-6 fill-current" />
                                            </button>
                                            <button
                                                disabled={songs.length === 0 || selectedManualIndex === songs.length - 1 || selectedManualIndex === null}
                                                onClick={() => setSelectedManualIndex(prev => prev + 1)}
                                                className="p-2.5 text-slate-500 hover:text-[#B87333] disabled:opacity-10 transition-colors"
                                            >
                                                <SkipForward className="w-6 h-6 fill-current" />
                                            </button>
                                        </div>

                                        {selectedManualIndex !== null && (
                                            <div className="flex items-center space-x-3 bg-black/40 p-2 rounded-2xl border border-white/10">
                                                <div className="flex items-center px-4 border-r border-white/10 space-x-3">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fonte</span>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => setPlayerFontSize(prev => Math.max(12, prev - 2))} className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ChevronDown className="w-4 h-4 text-[#B87333]" /></button>
                                                        <span className="font-mono font-black text-xs w-6 text-center text-white">{playerFontSize}</span>
                                                        <button onClick={() => setPlayerFontSize(prev => Math.min(60, prev + 2))} className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ChevronUp className="w-4 h-4 text-[#B87333]" /></button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center px-4 border-r border-white/10 space-x-3">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-[#A5A9B4]">Vel</span>
                                                    <div className="flex items-center space-x-2">
                                                        <button onClick={() => setScrollSpeed(prev => Math.max(0.5, prev - 0.5))} className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ChevronDown className="w-4 h-4 text-[#B87333]" /></button>
                                                        <span className="font-mono font-black text-xs w-10 text-center text-white">{scrollSpeed.toFixed(1)}</span>
                                                        <button onClick={() => setScrollSpeed(prev => Math.min(10, prev + 0.5))} className="p-1 hover:bg-white/10 rounded-lg transition-colors border border-white/5"><ChevronUp className="w-4 h-4 text-[#B87333]" /></button>
                                                    </div>
                                                </div>
                                                <button onClick={() => setIsAutoScrolling(!isAutoScrolling)} className={`px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] transition-all uppercase italic shadow-lg ${isAutoScrolling ? 'bg-[#B87333] text-white shadow-[#B87333]/30' : 'bg-white/5 text-slate-500 border border-white/10'}`}>
                                                    {isAutoScrolling ? 'EM MARCHA' : 'ESTÁTICO'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1 flex overflow-hidden space-x-8">
                                    {/* Main View Area */}
                                    <div className="flex-1 bg-[#16161D] rounded-[40px] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                                        {selectedManualIndex === null ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-8">
                                                <div className="w-32 h-32 bg-black/40 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                                                    <Music className="w-12 h-12 text-slate-700 opacity-50" />
                                                </div>
                                                <div className="text-center space-y-4">
                                                    <h3 className="text-3xl font-black text-white tracking-widest uppercase italic">Pronto para a Forja</h3>
                                                    <p className="text-xs font-bold text-[#A5A9B4] tracking-[0.3em] uppercase opacity-50">Selecione uma peça do Acervo</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto whitespace-pre-wrap leading-relaxed relative pb-64 px-12 scrollbar-none">
                                                <div className="max-w-4xl mx-auto py-24">
                                                    {songs[selectedManualIndex].content.split('\n').map((line, idx) => {
                                                        const isChordLine = line.match(/^[a-g][b#]?\s/i) || (line.trim().length > 0 && line.trim().length < 15 && line.includes('  '));
                                                        const isActive = currentLineIndex === idx;
                                                        return (
                                                            <div
                                                                key={idx}
                                                                data-line-index={idx}
                                                                onClick={() => handleLineClick(idx)}
                                                                style={{ fontSize: isActive ? `${playerFontSize + 10}px` : `${playerFontSize}px` }}
                                                                className={`py-5 px-10 cursor-pointer transition-all duration-700 rounded-3xl ${isActive
                                                                    ? 'bg-[#B87333] text-white border-l-[16px] border-white shadow-[0_0_50px_rgba(184,115,51,0.4)] scale-[1.05] font-black z-20 relative ring-4 ring-[#B87333]/20'
                                                                    : 'opacity-10 hover:opacity-50 hover:bg-white/5 font-bold text-slate-300'
                                                                    } ${isChordLine ? 'text-[#B87333] opacity-30 italic font-black' : ''}`}
                                                            >
                                                                {line || ' '}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Functional Sidebar Manager */}
                                    <div className="w-80 flex flex-col space-y-4">
                                        <div className="bg-[#111116] rounded-[40px] p-6 border border-white/5 shadow-2xl flex-1 flex flex-col overflow-hidden">
                                            <div className="flex items-center justify-between mb-8">
                                                <div className="bg-black/60 p-1.5 rounded-2xl flex border border-white/5">
                                                    <button
                                                        onClick={() => setShowPlaylistManager(false)}
                                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${!showPlaylistManager ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-600 hover:text-slate-400'}`}
                                                    >
                                                        Atuais
                                                    </button>
                                                    <button
                                                        onClick={() => setShowPlaylistManager(true)}
                                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all italic ${showPlaylistManager ? 'bg-[#B87333] text-white shadow-lg shadow-[#B87333]/20' : 'text-slate-600 hover:text-slate-400'}`}
                                                    >
                                                        Acervo
                                                    </button>
                                                </div>
                                                <Database className="w-4 h-4 text-blue-500" />
                                            </div>

                                            {!showPlaylistManager ? (
                                                <div className="flex-1 flex flex-col min-h-0">
                                                    <div className="flex-1 overflow-y-auto pr-3 space-y-2 scrollbar-thin">
                                                        {songs.length === 0 ? (
                                                            <p className="text-[10px] text-slate-700 italic text-center py-10 uppercase tracking-widest">Nenhuma música</p>
                                                        ) : (
                                                            songs.map((s, i) => (
                                                                <div key={i} onClick={() => setSelectedManualIndex(i)} className={`p-4 rounded-2xl border text-left cursor-pointer transition-all ${selectedManualIndex === i ? 'bg-blue-600 border-blue-400 text-white shadow-xl scale-[1.02]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700'}`}>
                                                                    <p className="text-xs font-bold truncate line-clamp-1">{s.song_name}</p>
                                                                    <p className={`text-[9px] uppercase font-black mt-1 ${selectedManualIndex === i ? 'text-blue-200' : 'text-slate-700'}`}>{s.requested_key} • {s.artist_name}</p>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                    <div className="mt-6 pt-6 border-t border-slate-900 space-y-3">
                                                        <div className="relative group">
                                                            <input
                                                                type="text"
                                                                placeholder="Nome do Setlist..."
                                                                value={playlistNameInput}
                                                                onChange={(e) => setPlaylistNameInput(e.target.value)}
                                                                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-blue-500 transition-colors"
                                                            />
                                                            <Save className="absolute right-3 top-3 w-4 h-4 text-slate-700 group-hover:text-blue-500" />
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (!playlistNameInput.trim() || songs.length === 0) return;
                                                                const newPlaylists = { ...savedPlaylists, [playlistNameInput]: [...songs] };
                                                                setSavedPlaylists(newPlaylists);
                                                                localStorage.setItem('caminho_das_cifras_playlists', JSON.stringify(newPlaylists));
                                                                setPlaylistNameInput('');
                                                                setShowPlaylistManager(true);
                                                            }}
                                                            disabled={songs.length === 0}
                                                            className="w-full py-4 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-900/40"
                                                        >
                                                            Salvar Setlist
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex-1 overflow-y-auto pr-3 space-y-3 scrollbar-thin min-h-0">
                                                    {Object.keys(savedPlaylists).length === 0 ? (
                                                        <div className="text-center py-20 space-y-4">
                                                            <FolderHeart className="w-10 h-10 text-slate-800 mx-auto" />
                                                            <p className="text-[10px] text-slate-700 italic uppercase">Vazio</p>
                                                        </div>
                                                    ) : (
                                                        Object.entries(savedPlaylists).map(([name, list]) => (
                                                            <div key={name} className="bg-slate-900 border border-slate-800 rounded-[24px] p-5 group hover:border-blue-900 transition-all">
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="max-w-[70%]">
                                                                        <p className="text-sm font-black text-white truncate">{name}</p>
                                                                        <p className="text-[10px] text-slate-600 uppercase font-black">{list.length} Faixas</p>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newPlaylists = { ...savedPlaylists };
                                                                            delete newPlaylists[name];
                                                                            setSavedPlaylists(newPlaylists);
                                                                            localStorage.setItem('caminho_das_cifras_playlists', JSON.stringify(newPlaylists));
                                                                        }}
                                                                        className="p-2 bg-slate-800 hover:bg-red-900/20 text-slate-600 hover:text-red-500 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                                <button
                                                                    onClick={() => {
                                                                        setSongs(list);
                                                                        setSelectedManualIndex(0);
                                                                        setShowPlaylistManager(false);
                                                                    }}
                                                                    className="w-full py-3 bg-blue-700/10 hover:bg-blue-700 text-blue-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-900 transition-all"
                                                                >
                                                                    Carregar Lista
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-lg">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Atalhos</h4>
                                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Use as setas no topo para navegar entre as músicas. Salve seu Setlist para abrir novamente mais tarde!</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'presentation' ? (
                            <div className="bg-white/95 p-8 rounded-3xl shadow-2xl min-h-[600px] flex flex-col animate-in fade-in zoom-in-95">
                                <button onClick={() => setActiveTab('manual')} className="absolute top-6 right-6 p-2 bg-slate-100 text-slate-500 rounded-full hover:scale-110 transition-transform"><X className="w-5 h-5" /></button>
                                {songs.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center text-center">Nenhuma música disponível.</div> : (
                                    <>
                                        <div className="flex items-center justify-between mb-8 border-b pb-4">
                                            <h2 className="text-3xl font-bold">{songs[presenterSongIndex]?.song_name}</h2>
                                            <div className="flex items-center space-x-2">
                                                <button disabled={presenterSongIndex === 0} onClick={() => setPresenterSongIndex(p => p - 1)} className="px-4 py-2 bg-slate-100 rounded-lg">Anterior</button>
                                                <button disabled={presenterSongIndex === songs.length - 1} onClick={() => setPresenterSongIndex(p => p + 1)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Próxima</button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto font-mono text-xl whitespace-pre-wrap leading-relaxed pb-32">{songs[presenterSongIndex]?.content}</div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#16161D]/80 border border-white/5 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-2 h-8 bg-[#B87333] rounded-full"></div>
                                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Músicas Selecionadas</h2>
                                    </div>
                                    <span className="text-[10px] font-black bg-white/5 text-[#B87333] py-2 px-4 rounded-full border border-white/5 uppercase tracking-widest">{songs.length} Itens</span>
                                </div>

                                <div className="flex flex-col space-y-4 mb-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex flex-col">
                                            <div className="flex items-center space-x-2">
                                                <Guitar className="w-4 h-4 text-[#B87333]" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Dicionário de Acordes</span>
                                            </div>
                                            <span className="text-[9px] text-slate-500 font-bold mt-1">Ative para exibir os diagramas em sua cifra</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={songs.every(s => s.show_chords)} onChange={() => {
                                                const allShow = songs.every(s => s.show_chords);
                                                setSongs(songs.map(s => ({ ...s, show_chords: !allShow })));
                                            }} />
                                            <div className="w-11 h-6 bg-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B87333] peer-checked:after:bg-white"></div>
                                        </label>
                                    </div>
                                    <div className="h-px bg-white/5"></div>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[500px] scrollbar-thin scrollbar-thumb-[#B87333]/30">
                                    {songs.length === 0 ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-[32px] bg-black/20">
                                            <FileAudio className="w-14 h-14 text-slate-800 mb-4" />
                                            <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">Forja Vazia</p>
                                        </div>
                                    ) : songs.map((song, i) => (
                                        <div key={i} onClick={() => { setSelectedManualIndex(i); setActiveTab('player'); }} className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer group ${selectedManualIndex === i ? 'border-[#B87333]/50 bg-[#B87333]/10 shadow-[0_0_20px_rgba(184,115,51,0.1)]' : 'bg-black/20 border-white/5 hover:border-[#B87333]/30'}`}>
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedManualIndex === i ? 'bg-[#B87333] text-white' : 'bg-white/5 text-slate-700'}`}>
                                                    <CheckCircle className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-white text-sm line-clamp-1 uppercase italic tracking-tight">{song.song_name}</h4>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{song.artist_name} • {song.requested_key}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleChords(i); }}
                                                    className={`p-2.5 rounded-xl border transition-all ${song.show_chords ? 'bg-[#B87333] text-white border-[#B87333]/50 shadow-lg shadow-[#B87333]/20' : 'bg-white/5 text-slate-700 border-white/5 hover:text-[#B87333]'}`}
                                                    title={song.show_chords ? "Dicionário Ativo" : "Dicionário Inativo"}
                                                >
                                                    <Guitar className="w-4 h-4" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeSong(i); }} className="p-2.5 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><X className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                    <button
                                        disabled={songs.length === 0 || isGenerating}
                                        onClick={handleGenerateDocument}
                                        className="w-full py-5 bg-[#B87333] hover:bg-[#8B4513] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-[#B87333]/20 transition-all flex items-center justify-center group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <RefreshCw className="w-6 h-6 mr-3 animate-spin text-white" />
                                                <span>FORJANDO...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform" />
                                                <span>FINALIZAR FORJA</span>
                                            </>
                                        )}
                                    </button>
                                    <button onClick={() => { setActiveTab('presentation'); setPresenterSongIndex(0); }} className="w-full py-4 bg-white/5 border border-white/10 hover:border-[#B87333]/50 text-slate-400 hover:text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px] italic">Modo Projeção</button>
                                </div>
                                {downloadUrl && (
                                    <div className="mt-6 p-5 rounded-3xl bg-[#B87333]/10 border border-[#B87333]/20 flex flex-col items-center animate-in fade-in slide-in-from-top-4">
                                        <CheckCircle className="w-7 h-7 text-[#B87333] mb-2" />
                                        <p className="text-white text-[10px] font-black uppercase tracking-[0.3em] mb-4">Peça Forjada!</p>
                                        <a
                                            href={downloadUrl}
                                            download={exportFormat === 'pdf' ? "IronChords_Book.pdf" : exportFormat === 'both' ? "IronChords_Forged.zip" : "IronChords_Book.docx"}
                                            className="w-full py-3 bg-[#B87333] hover:bg-[#8B4513] text-white text-center text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#B87333]/20"
                                        >
                                            RECOLHER DOCUMENTO
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {isFullScreenPlayer && selectedManualIndex !== null && songs[selectedManualIndex] && (
                    <div className="fixed inset-0 z-[999] bg-white flex flex-col animate-in fade-in zoom-in-105">
                        <div className="bg-white/90 backdrop-blur-xl border-b border-slate-100 p-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center space-x-5">
                                <div className="p-4 bg-blue-700 rounded-3xl shadow-2xl shadow-blue-700/30"><Music className="w-8 h-8 text-white" /></div>
                                <div><h2 className="text-3xl font-black text-slate-900 tracking-tighter">{songs[selectedManualIndex].song_name}</h2><p className="text-sm font-bold text-blue-600 uppercase tracking-widest">{songs[selectedManualIndex].artist_name} • {songs[selectedManualIndex].requested_key}</p></div>
                            </div>
                            <div className="flex items-center space-x-6">
                                <button onClick={() => transposeSong(selectedManualIndex, -1)} className="p-4 border rounded-2xl"><ChevronDown /></button>
                                <span className="text-3xl font-black font-mono text-blue-900">{songs[selectedManualIndex].requested_key}</span>
                                <button onClick={() => transposeSong(selectedManualIndex, 1)} className="p-4 border rounded-2xl"><ChevronUp /></button>
                                <button onClick={() => { setIsFullScreenPlayer(false); setSelectedManualIndex(null); }} className="p-4 bg-slate-950/5 hover:bg-red-600 hover:text-white rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto font-mono text-4xl whitespace-pre-wrap leading-[1.8] p-16 scrollbar-none"><div className="max-w-4xl mx-auto pb-[60vh]">{songs[selectedManualIndex].content.split('\n').map((line, idx) => (<div key={idx} data-line-index={idx} onClick={() => handleLineClick(idx)} className={`py-6 px-12 cursor-pointer transition-all ${currentLineIndex === idx ? 'bg-blue-50 border-l-8 border-blue-600 scale-105 shadow-sm' : 'opacity-20 hover:opacity-100 grayscale'}`}>{line || ' '}</div>))}</div></div>
                    </div>
                )}

                <div className="mt-12 mb-8 flex justify-center items-center">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic opacity-50">
                        desenvolvido <span className="text-[#B87333]">Fernando_M_Aragao</span>
                    </p>
                </div>
            </div>
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
