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
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.value = this.micGain;
            this.mediaStreamSource.connect(this.gainNode);

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256; // Smaller for faster level updates
            this.gainNode.connect(this.analyser);

            await this.setupWebSocket();

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
            this.startSpeechRecognition();

        } catch (err) {
            console.error("Failed to start audio tracker", err);
            this.isMicActive = false;
        }
    }

    setVocabulary(words) {
        this.vocabulary = words;
        if (this.recognition && words && words.length > 0) {
            try {
                const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
                if (SpeechGrammarList) {
                    const grammarList = new SpeechGrammarList();
                    // Create a simple JSGF grammar string with all the words
                    const grammar = `#JSGF V1.0; grammar songLyrics; public <word> = ${words.join(' | ')};`;
                    grammarList.addFromString(grammar, 1);
                    this.recognition.grammars = grammarList;
                    console.log(`[AudioTracker] Injected ${words.length} song words into Speech Recognition Grammar.`);
                }
            } catch (e) {
                console.warn("[AudioTracker] SpeechGrammarList not supported or failed to set.", e);
            }
        }
    }

    startSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';

        // Apply vocabulary if already set
        if (this.vocabulary) {
            this.setVocabulary(this.vocabulary);
        }

        this.recognition.onresult = (event) => {
            let interimText = '';
            let finalText = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    finalText += event.results[i][0].transcript;
                } else {
                    interimText += event.results[i][0].transcript;
                }
            }
            if (this.onSpeechResult) {
                // If we have final text, send it. Else send interim for UI feedback.
                if (finalText.trim()) this.onSpeechResult(finalText.trim(), true);
                else if (interimText.trim()) this.onSpeechResult(interimText.trim(), false);
            }
        };

        this.recognition.onerror = (e) => {
            console.warn("SpeechRec error:", e.error);
        };

        try {
            this.recognition.start();
        } catch (e) {
            console.error("Could not start SpeechRecognition", e);
        }
    }

    async setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
        const wsUrl = `${protocol}//${host}/ws/videoke`;

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

    stop() {
        this.isMicActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

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

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }
}
