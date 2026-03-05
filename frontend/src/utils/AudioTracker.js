// AudioTracker.js
// Encapsulates Microphone access, AudioWorklet, and Speech Recognition setup

export class AudioTracker {
    constructor(onBpmDetected, onMicLevel, onNoteDetected, onSpeechResult) {
        this.onBpmDetected = onBpmDetected;
        this.onMicLevel = onMicLevel;
        this.onNoteDetected = onNoteDetected;
        this.onSpeechResult = onSpeechResult;

        this.audioContext = null;
        this.analyser = null;
        this.mediaStreamSource = null;
        this.workletNode = null;
        this.biquadFilter = null; // Vocal frequency filter
        this.animationFrameId = null;

        this.recognition = null;
        this.isMicActive = false;
    }

    async start() {
        if (this.isMicActive) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // 1. Setup Vocal Isolation Filter (Bandpass 300Hz - 3000Hz approx)
            this.biquadFilter = this.audioContext.createBiquadFilter();
            this.biquadFilter.type = 'bandpass';
            this.biquadFilter.frequency.value = 1000;
            this.biquadFilter.Q.value = 1.0;

            this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);

            // Connect to filter for Speech Recognition? No, SpeechRec natively uses the raw stream.
            // We use the filter for our internal processing (BPM / Mic Level) if needed,
            // but actually BPM wants raw audio (especially bass) so we split the signal.

            // Setup Analyser for Mic Level
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            this.mediaStreamSource.connect(this.analyser);

            // Setup AudioWorklet for BPM
            try {
                // Ensure the path is correct relative to the public folder
                await this.audioContext.audioWorklet.addModule('/BpmWorklet.js');
                this.workletNode = new AudioWorkletNode(this.audioContext, 'bpm-worklet');

                this.workletNode.port.onmessage = (event) => {
                    if (event.data.type === 'bpm' && this.onBpmDetected) {
                        this.onBpmDetected(event.data.value);
                    }
                };

                this.mediaStreamSource.connect(this.workletNode);
                this.workletNode.connect(this.audioContext.destination); // Required for Safari, though usually volume is 0
            } catch (err) {
                console.warn("Could not load BpmWorklet, falling back to basic analysis", err);
            }

            this.isMicActive = true;
            this.startLevelAnalysis();
            this.startSpeechRecognition();

        } catch (err) {
            console.error("Failed to start audio tracker", err);
            this.isMicActive = false;
        }
    }

    startLevelAnalysis() {
        if (!this.analyser) return;
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const freqData = new Float32Array(bufferLength);

        const checkAudio = () => {
            if (!this.isMicActive) return;

            this.analyser.getByteFrequencyData(dataArray);
            this.analyser.getFloatFrequencyData(freqData);

            let sum = 0;
            for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength;

            if (this.onMicLevel) this.onMicLevel(avg);

            let maxVal = -Infinity;
            let maxIdx = -1;
            for (let i = 0; i < bufferLength; i++) {
                if (freqData[i] > maxVal) { maxVal = freqData[i]; maxIdx = i; }
            }
            if (maxVal > -50 && this.onNoteDetected) {
                const freq = maxIdx * this.audioContext.sampleRate / this.analyser.fftSize;
                const note = this.getNoteFromFreq(freq);
                if (note) this.onNoteDetected(note);
            }

            this.animationFrameId = requestAnimationFrame(checkAudio);
        };
        checkAudio();
    }

    getNoteFromFreq(freq) {
        if (freq < 70 || freq > 1000) return null;
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const h = Math.round(12 * Math.log2(freq / 440)) + 69;
        return notes[h % 12];
    }

    startSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) return;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'pt-BR';

        this.recognition.onresult = (event) => {
            const results = event.results;
            const latest = results[results.length - 1];
            const text = latest[0].transcript.toLowerCase();
            if (this.onSpeechResult) this.onSpeechResult(text, latest.isFinal);
        };

        this.recognition.onend = () => {
            if (this.isMicActive && this.recognition) {
                try { this.recognition.start(); } catch (e) { }
            }
        };

        try {
            this.recognition.start();
        } catch (e) { }
    }

    stop() {
        this.isMicActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        if (this.recognition) {
            this.recognition.stop();
            this.recognition = null;
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
