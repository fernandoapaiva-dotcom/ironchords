// AudioTracker.js
// Encapsulates Microphone access, AudioWorklet, and Speech Recognition setup

export class AudioTracker {
    constructor(onBpmDetected, onMicLevel, onNoteDetected, onSpeechResult, onAlignmentState, onConnectionStatus) {
        this.onBpmDetected = onBpmDetected;
        this.onMicLevel = onMicLevel;
        this.onNoteDetected = onNoteDetected;
        this.onSpeechResult = onSpeechResult;
        this.onAlignmentState = onAlignmentState;
        this.onConnectionStatus = onConnectionStatus; // NEW: Feedback for connection

        this.audioContext = null;
        this.analyser = null;
        this.mediaStreamSource = null;
        this.workletNode = null;
        this.alignmentNode = null;
        this.gainNode = null;
        this.animationFrameId = null;

        this.isMicActive = false;
        this.ws = null;
        this.micGain = 2.0; // Reduced default gain to prevent noise saturation
    }

    setGain(value) {
        this.micGain = value;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.1);
        }
    }

    async start() {
        if (this.isMicActive) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            this.stream = stream;

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.micGain;
            this.mediaStreamSource.connect(this.gainNode);

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.gainNode.connect(this.analyser);

            this.pitchAnalyser = this.audioContext.createAnalyser();
            this.pitchAnalyser.fftSize = 2048;

            // Voice-focused bandpass filter: keep only vocal range (80Hz - 1100Hz)
            // High-pass: cuts sub-bass and deep guitar rumble
            this.voiceHighPass = this.audioContext.createBiquadFilter();
            this.voiceHighPass.type = 'highpass';
            this.voiceHighPass.frequency.value = 80;  // cut below 80Hz
            this.voiceHighPass.Q.value = 1.0;

            // Low-pass: cuts high-frequency guitar string harmonics & cymbals
            this.voiceLowPass = this.audioContext.createBiquadFilter();
            this.voiceLowPass.type = 'lowpass';
            this.voiceLowPass.frequency.value = 1100; // cut above 1100Hz
            this.voiceLowPass.Q.value = 1.0;

            // Chain: gain → highpass → lowpass → pitchAnalyser
            this.gainNode.connect(this.voiceHighPass);
            this.voiceHighPass.connect(this.voiceLowPass);
            this.voiceLowPass.connect(this.pitchAnalyser);

            // WebSocket is OPTIONAL — if it fails, mic + speech still work
            try {
                await this.setupWebSocket();
            } catch (wsErr) {
                console.warn("[AudioTracker] WebSocket unavailable (non-fatal):", wsErr.message || wsErr);
            }

            try {
                await this.audioContext.audioWorklet.addModule('/AlignmentWorklet.js');
                this.alignmentNode = new AudioWorkletNode(this.audioContext, 'alignment-worklet');

                this.alignmentNode.port.onmessage = (event) => {
                    if (event.data.type === 'audio_chunk' && this.ws?.readyState === WebSocket.OPEN) {
                        this.ws.send(event.data.payload);
                    }
                };

                this.gainNode.connect(this.alignmentNode);
                this.alignmentNode.connect(this.audioContext.destination);
            } catch (err) {
                console.error("Could not load AlignmentWorklet", err);
            }

            this.isMicActive = true;
            this.startLevelAnalysis();
            this.startPitchAnalysis();
            this.startSpeechRecognition();

        } catch (err) {
            console.error("Failed to start audio tracker", err);
            this.isMicActive = false;
        }
    }

    setVocabulary(words) {
        // Sanitize and limit to 200 most relevant words to avoid engine crash
        const sanitized = (words || [])
            .map(w => w.replace(/[^a-zA-Z0-9áéíóúâêîôûàèìòùãõçÁÉÍÓÚÂÊÎÔÛÀÈÌÒÙÃÕÇ]/g, ''))
            .filter(w => w.length >= 2)
            .slice(0, 200);

        this.vocabulary = sanitized;

        if (this.recognition && sanitized.length > 0) {
            try {
                const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
                if (SpeechGrammarList) {
                    const grammarList = new SpeechGrammarList();
                    const grammar = `#JSGF V1.0; grammar songLyrics; public <word> = ${sanitized.join(' | ')};`;
                    console.log("[AudioTracker] JSGF Grammar Generated:", grammar.substring(0, 100) + "...");
                    grammarList.addFromString(grammar, 1);
                    this.recognition.grammars = grammarList;
                    console.log(`[AudioTracker] Injected ${sanitized.length} words into Grammar.`);

                    if (this.isMicActive) {
                        console.log("[AudioTracker] Restarting recognition to apply new song vocabulary...");
                        this.stopSpeechRecognition();
                        setTimeout(() => this.startSpeechRecognition(), 150);
                    }
                }
            } catch (e) {
                console.warn("[AudioTracker] Failed to set Grammar:", e);
            }
        }
    }

    stopSpeechRecognition() {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) { }
            this.recognition = null;
        }
    }

    startSpeechRecognition() {
        if (this.recognition) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';

        if (this.vocabulary && this.vocabulary.length > 0) {
            const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
            if (SpeechGrammarList) {
                const grammarList = new SpeechGrammarList();
                const grammar = `#JSGF V1.0; grammar songLyrics; public <word> = ${this.vocabulary.join(' | ')};`;
                grammarList.addFromString(grammar, 1);
                this.recognition.grammars = grammarList;
            }
        }

        this.recognition.onstart = () => {
            console.log("[AudioTracker] Speech Recognition officially STARTED");
            if (this.onSpeechResult) this.onSpeechResult("[SISTEMA: Motor de voz iniciado]", false);
        };

        this.recognition.onresult = (event) => {
            let interimText = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
                else interimText += event.results[i][0].transcript;
            }
            if (this.onSpeechResult) {
                if (finalText.trim()) this.onSpeechResult(finalText.trim(), true);
                else if (interimText.trim()) this.onSpeechResult(interimText.trim(), false);
            }
        };

        this.recognition.onerror = (e) => {
            console.warn("[AudioTracker] SpeechRec Error:", e.error);
            if (this.onSpeechResult) this.onSpeechResult(`[ERRO VOZ: ${e.error}]`, false);
            if (e.error === 'network') {
                this.stopSpeechRecognition();
                setTimeout(() => this.startSpeechRecognition(), 2000);
            }
        };

        this.recognition.onend = () => {
            // The browser's Speech Recognition engine automatically stops after a while.
            // If the user still has IA Sync ON (isMicActive), we MUST restart it instantly.
            if (this.isMicActive) {
                this.recognition = null; // Clear old instance
                setTimeout(() => this.startSpeechRecognition(), 200);
            }
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error("[AudioTracker] Failed to start SpeechRecognition:", e);
        }
    }

    async setupWebSocket() {
        // Use the centralized API_BASE_URL and convert http/https to ws/wss
        const apiBase = API_BASE_URL;
        const baseUrl = apiBase.replace(/^http/, 'ws');
        const wsUrl = `${baseUrl}/ws/videoke`;

        if (this.onConnectionStatus) this.onConnectionStatus('connecting');

        return new Promise((resolve) => {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                if (this.onConnectionStatus) this.onConnectionStatus('connected');
                resolve();
            };
            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (this.onAlignmentState) {
                    this.onAlignmentState(data);
                }
            };
            this.ws.onclose = () => {
                if (this.onConnectionStatus) this.onConnectionStatus('disconnected');
            };
            this.ws.onerror = (err) => {
                if (this.onConnectionStatus) this.onConnectionStatus('error');
            };
        });
    }

    startLevelAnalysis() {
        if (!this.analyser) return;
        const bufferLength = this.analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        const checkAudio = () => {
            if (!this.isMicActive) return;
            // Use Time Domain data for RMS (more accurate for "vibrating" levels)
            this.analyser.getFloatTimeDomainData(dataArray);

            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
                sumSquares += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sumSquares / bufferLength);

            // Normalize level (0 to 100)
            const level = Math.min(100, rms * 500);

            if (this.onMicLevel) this.onMicLevel(level);
            this.animationFrameId = requestAnimationFrame(checkAudio);
        };
        checkAudio();
    }

    startPitchAnalysis() {
        if (!this.pitchAnalyser) return;
        const bufferLength = this.pitchAnalyser.fftSize;
        const buf = new Float32Array(bufferLength);
        const sampleRate = this.audioContext.sampleRate;

        // Auto-correlation algorithm for fundamental frequency
        const detectPitch = (buffer) => {
            let SIZE = buffer.length;
            let rms = 0;
            for (let i = 0; i < SIZE; i++) {
                rms += buffer[i] * buffer[i];
            }
            rms = Math.sqrt(rms / SIZE);
            if (rms < 0.01) return -1; // Ignore silence or low noise

            let r1 = 0, r2 = SIZE - 1, thres = 0.2;
            for (let i = 0; i < SIZE / 2; i++)
                if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
            for (let i = 1; i < SIZE / 2; i++)
                if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }

            let slicedBuf = buffer.slice(r1, r2);
            let nSize = slicedBuf.length;

            let c = new Array(nSize).fill(0);
            for (let i = 0; i < nSize; i++) {
                for (let j = 0; j < nSize - i; j++) {
                    c[i] = c[i] + slicedBuf[j] * slicedBuf[j + i];
                }
            }

            let d = 0; while (c[d] > c[d + 1]) d++;
            let maxval = -1, maxpos = -1;
            for (let i = d; i < nSize; i++) {
                if (c[i] > maxval) {
                    maxval = c[i];
                    maxpos = i;
                }
            }
            let T0 = maxpos;

            let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
            let a = (x1 + x3 - 2 * x2) / 2;
            let b = (x3 - x1) / 2;
            if (a) T0 = T0 - b / (2 * a);

            return sampleRate / T0;
        };

        const noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const noteFromPitch = (frequency) => {
            let noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
            return Math.round(noteNum) + 69;
        };
        const frequencyFromNoteNumber = (note) => {
            return 440 * Math.pow(2, (note - 69) / 12);
        };
        const centsOffFromPitch = (frequency, note) => {
            return Math.floor(1200 * Math.log(frequency / frequencyFromNoteNumber(note)) / Math.log(2));
        };

        // We run a secondary tight loop to avoid clogging the main one
        let lastPitchTick = 0;
        // Smoothing: rolling average with exponential weight
        let smoothCents = 0;
        let lastNoteStr = null;
        const SMOOTH_ALPHA = 0.2; // lower = smoother/slower, 0.2 = gentle
        const DEAD_ZONE = 8; // cents, small fluctuations in this range are ignored

        const checkPitch = (timestamp) => {
            if (!this.isMicActive) return;

            // Slow down the update rate: 120ms ≈ ~8fps is enough for stable visual
            if (timestamp - lastPitchTick > 120) {
                lastPitchTick = timestamp;
                this.pitchAnalyser.getFloatTimeDomainData(buf);
                const pitch = detectPitch(buf);

                if (pitch > -1 && pitch > 50 && pitch < 2000) {
                    const noteNum = noteFromPitch(pitch);
                    const noteStr = noteStrings[noteNum % 12];
                    const rawCents = centsOffFromPitch(pitch, noteNum);

                    // Reset smooth value when note changes
                    if (noteStr !== lastNoteStr) {
                        smoothCents = rawCents;
                        lastNoteStr = noteStr;
                    } else {
                        // Exponential moving average
                        smoothCents = smoothCents + SMOOTH_ALPHA * (rawCents - smoothCents);
                    }

                    // Dead-zone: snap to centre if very close
                    const displayCents = Math.abs(smoothCents) < DEAD_ZONE ? 0 : Math.round(smoothCents);

                    if (this.onNoteDetected) {
                        this.onNoteDetected(noteStr, displayCents, pitch);
                    }
                } else {
                    lastNoteStr = null;
                    smoothCents = 0;
                    if (this.onNoteDetected) {
                        this.onNoteDetected(null, 0, 0); // Reset or no pitch
                    }
                }
            }

            this.pitchAnimationFrameId = requestAnimationFrame(checkPitch);
        };
        this.pitchAnimationFrameId = requestAnimationFrame(checkPitch);
    }

    stop() {
        this.isMicActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        if (this.pitchAnimationFrameId) cancelAnimationFrame(this.pitchAnimationFrameId);

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        if (this.recognition) {
            try { this.recognition.abort(); } catch (e) { }
            this.recognition = null;
        }

        if (this.alignmentNode) {
            this.alignmentNode.disconnect();
            this.alignmentNode = null;
        }

        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }

        if (this.mediaStreamSource) {
            this.mediaStreamSource.disconnect();
            this.mediaStreamSource = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}
