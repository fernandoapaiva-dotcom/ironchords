// AudioTracker.js
// Encapsulates Microphone access, AudioWorklet, and Speech Recognition setup

export class AudioTracker {
    constructor(onBpmDetected, onMicLevel, onNoteDetected, onSpeechResult, onAlignmentState, onConnectionStatus, onBlowDetected) {
        this.onBpmDetected = onBpmDetected;
        this.onMicLevel = onMicLevel;
        this.onNoteDetected = onNoteDetected;
        this.onSpeechResult = onSpeechResult;
        this.onAlignmentState = onAlignmentState;
        this.onConnectionStatus = onConnectionStatus;
        this.onBlowDetected = onBlowDetected; // NEW: Blow detection callback

        this.audioContext = null;
        this.analyser = null;
        this.mediaStreamSource = null;
        this.workletNode = null;
        this.alignmentNode = null;
        this.gainNode = null;
        this.animationFrameId = null;

        this.isMicActive = false;
        this.ws = null;
        this.micGain = 2.0;

        // Blow detection state
        this.lastBlowTime = 0;
        this.burstStartTime = 0;
        this.inBurst = false;
    }

    setGain(value) {
        this.micGain = value;
        if (this.gainNode) {
            this.gainNode.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.1);
        }
    }

    async start(externalStream) {
        if (this.isMicActive) {
            // If already active, just ensure components that weren't started are running
            if (this.onSpeechResult && !this.activeRec) {
                console.log("[AudioTracker] Restarting SpeechRec on active context");
                this.startSpeechRecognition();
            }
            return;
        }

        try {
            const stream = externalStream || await navigator.mediaDevices.getUserMedia({
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
            
            // Focus on closest voice: Dynamics Compressor
            // This reduces background noise and peaks, making the closest voice more prominent
            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.setValueAtTime(-35, this.audioContext.currentTime);
            this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
            this.compressor.ratio.setValueAtTime(12, this.audioContext.currentTime);
            this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
            this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.micGain;
            
            // Chain: Source -> Compressor -> Gain
            this.mediaStreamSource.connect(this.compressor);
            this.compressor.connect(this.gainNode);

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

            // Voice Presence Boost: emphasizes consonants and vowels (1.5kHz - 4kHz)
            // This is primarily for the SpeechRecognition engine, but we apply it to the pre-analysis chain
            this.voiceBoost = this.audioContext.createBiquadFilter();
            this.voiceBoost.type = 'peaking';
            this.voiceBoost.frequency.value = 2500;
            this.voiceBoost.Q.value = 1.0;
            this.voiceBoost.gain.value = 6.0;

            // Chain: gain → highpass → lowpass → boost → pitchAnalyser
            this.gainNode.connect(this.voiceHighPass);
            this.voiceHighPass.connect(this.voiceLowPass);
            this.voiceLowPass.connect(this.voiceBoost);
            this.voiceBoost.connect(this.pitchAnalyser);

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
            
            // Only start Speech Recognition if a callback is provided
            // This prevents overhead when only using Sopro or Tuner
            if (this.onSpeechResult) {
                this.startSpeechRecognition();
            }

        } catch (err) {
            console.error("Failed to start audio tracker", err);
            this.isMicActive = false;
        }
    }

    setVocabulary(words) {
        // Disabled: Injecting JSGF grammar forces the engine to run restrictively
        // and breaks fast, real-time interimResults in many browsers (causing lag).
        // It's better to let the natural language model run fast and handle misspellings
        // dynamically via PhoneticMatcher in App.jsx.
        this.vocabulary = [];
    }

    stopSpeechRecognition() {
        console.log('[AudioTracker] Stopping SpeechRec');
        if (this.speechHeartbeat) clearInterval(this.speechHeartbeat);
        this.speechHeartbeat = null;
        try { if (this.recognition) this.recognition.abort(); } catch(e){}
        this.recognition = null;
        this.activeRec = null;
        this._speechResultCount = 0;
    }

    startSpeechRecognition() {
        if (!this.isMicActive) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[AudioTracker] SpeechRecognition API not available');
            return;
        }

        // Clean up any existing recognizer
        this.stopSpeechRecognition();

        this._speechResultCount = 0;
        this._lastSpeechResultTime = Date.now();
        this._speechRestartCount = 0;

        const createAndStart = () => {
            if (!this.isMicActive) return;

            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'pt-BR';
            // maxAlternatives = 1 reduces processing overhead on mobile
            rec.maxAlternatives = 1;

            rec.onstart = () => {
                console.log('[AudioTracker] SpeechRec STARTED (instance #' + this._speechRestartCount + ')');
            };

            rec.onresult = (event) => {
                this._speechResultCount++;
                this._lastSpeechResultTime = Date.now();
                let interimText = '';
                let finalText = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) finalText += event.results[i][0].transcript + ' ';
                    else interimText += event.results[i][0].transcript;
                }
                if (this.onSpeechResult) {
                    if (finalText.trim()) {
                        console.log('[AudioTracker] SpeechRec FINAL:', finalText.trim().substring(0, 40));
                        this.onSpeechResult(finalText.trim(), true);
                    }
                    else if (interimText.trim()) {
                        this.onSpeechResult(interimText.trim(), false);
                    }
                }
            };

            rec.onerror = (e) => {
                console.warn('[AudioTracker] SpeechRec Error:', e.error);
                // 'no-speech' is normal — just means silence. Don't restart for it.
                // 'aborted' means we stopped it intentionally.
                // 'network' means the cloud service failed — restart.
                // 'not-allowed' means mic was denied — don't restart.
                if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                    console.error('[AudioTracker] Mic permission denied for SpeechRec');
                    return;
                }
            };

            rec.onend = () => {
                console.log('[AudioTracker] SpeechRec ENDED (results so far:', this._speechResultCount + ')');
                // Auto-restart if we're still supposed to be active
                if (this.isMicActive && this.onSpeechResult) {
                    this._speechRestartCount++;
                    // Exponential backoff: 200ms, 400ms, 800ms, max 2000ms
                    const delay = Math.min(2000, 200 * Math.pow(1.5, Math.min(this._speechRestartCount, 6)));
                    console.log(`[AudioTracker] SpeechRec auto-restart in ${delay}ms (restart #${this._speechRestartCount})`);
                    setTimeout(() => {
                        if (this.isMicActive && this.onSpeechResult) {
                            try {
                                rec.start();
                                // Reset restart count on successful start
                                this._speechRestartCount = Math.max(0, this._speechRestartCount - 1);
                            } catch (e) {
                                console.warn('[AudioTracker] SpeechRec restart failed:', e.message);
                                // If restart failed, try creating a fresh instance
                                if (this._speechRestartCount < 10) {
                                    setTimeout(() => createAndStart(), 1000);
                                }
                            }
                        }
                    }, delay);
                }
            };

            this.recognition = rec;
            this.activeRec = 'active';

            try {
                rec.start();
            } catch (e) {
                console.error('[AudioTracker] SpeechRec initial start failed:', e);
                // Retry once after 500ms
                setTimeout(() => {
                    try { rec.start(); } catch(e2) {
                        console.error('[AudioTracker] SpeechRec retry also failed');
                    }
                }, 500);
            }
        };

        createAndStart();

        // HEARTBEAT: Every 15 seconds, check if we're getting results.
        // If not, force a full restart with a fresh recognizer instance.
        this.speechHeartbeat = setInterval(() => {
            if (!this.isMicActive || !this.onSpeechResult) {
                clearInterval(this.speechHeartbeat);
                return;
            }
            const silenceMs = Date.now() - this._lastSpeechResultTime;
            // If 20 seconds with no result, the engine is probably dead
            if (silenceMs > 20000 && this._speechResultCount > 0) {
                console.warn('[AudioTracker] HEARTBEAT: SpeechRec silent for 20s, forcing restart');
                this._speechRestartCount = 0;
                try { if (this.recognition) this.recognition.abort(); } catch(e){}
                this.recognition = null;
                setTimeout(() => createAndStart(), 300);
            }
        }, 15000);
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
            // Use Time Domain data for RMS
            this.analyser.getFloatTimeDomainData(dataArray);

            let sumSquares = 0;
            for (let i = 0; i < bufferLength; i++) {
                sumSquares += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sumSquares / bufferLength);

            // NOISE GATE: If it's extremely quiet, skip further processing to save CPU
            if (rms < 0.005) {
                if (this.onMicLevel) this.onMicLevel(0);
                this.animationFrameId = requestAnimationFrame(checkAudio);
                return;
            }

            // Normalize level (0 to 100) for UI display
            const level = Math.min(100, rms * 500);
            if (this.onMicLevel) this.onMicLevel(level);

            // --- BLOW DETECTION (SOPRO) ---
            if (this.onBlowDetected) {
                const freqBuf = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(freqBuf);

                // 1. Calculate Peak-to-Average Ratio (PAR)
                let sum = 0, max = 0;
                for (let i = 0; i < freqBuf.length; i++) {
                    sum += freqBuf[i];
                    if (freqBuf[i] > max) max = freqBuf[i];
                }
                const avg = sum / freqBuf.length;
                const par = avg > 0 ? max / avg : 0;

                // 2. Sub-Bass Dominance (Pressure Wave)
                const subBass = freqBuf[0];
                const subBassRatio = avg > 0 ? subBass / avg : 0;

                // COMPRESSOR-ADJUSTED SENSITIVITY
                // The DynamicsCompressor makes the signal much hotter and denser.
                // We must raise the level threshold and the sub-bass requirement
                // so that normal speech doesn't trigger a blow.
                const now = Date.now();
                const isValidPuff = level > 75 && par < 2.5 && subBassRatio > 3.5;

                if (isValidPuff) {
                    if (!this.inBurst) {
                        this.inBurst = true;
                        this.burstStartTime = now;
                    } else if (now - this.burstStartTime >= 50 && now - this.lastBlowTime > 1500) {
                        this.lastBlowTime = now;
                        this.inBurst = false;
                        console.log(`[BlowDetect] Unified 50ms Blow! level:${level.toFixed(0)} sub:${subBassRatio.toFixed(2)}`);
                        this.onBlowDetected();
                    }
                } else {
                    this.inBurst = false;
                }
            }
            // ------------------------------

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

        this.stopSpeechRecognition();

        if (this.ws) {
            this.ws.close();
            this.ws = null;
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
