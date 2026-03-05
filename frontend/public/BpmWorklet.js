// BpmWorklet.js
// Runs on a separate audio thread to prevent UI freezing (Black Screen)

class BpmWorkletProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.sampleRate = 44100;
        this.bufferSize = 256; // Smaller buffer for faster flux response
        this.lastEnergy = 0;
        this.fluxHistory = new Float32Array(128); // to find local max flux
        this.fluxPointer = 0;

        // Low-pass filter coefficients (Simple IIR for ~150Hz)
        this.lpLast = 0;
        this.lpAlpha = 0.1; // Adjust for cutoff frequency

        this.lastPeakTime = 0;
        this.intervals = [];
        this.frameCount = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];
        let currentEnergy = 0;

        for (let i = 0; i < channelData.length; i++) {
            // 1. Low-Pass Filter to isolate Bass/Kick
            const filtered = this.lpAlpha * channelData[i] + (1 - this.lpAlpha) * this.lpLast;
            this.lpLast = filtered;

            // 2. Rectify and accumulate energy
            currentEnergy += filtered * filtered;
        }

        // 3. Spectral Flux (Energy derivative)
        const flux = Math.max(0, currentEnergy - this.lastEnergy);
        this.lastEnergy = currentEnergy;

        // 4. Onset detection using flux threshold
        this.analyzeFlux(flux);

        this.frameCount += channelData.length;
        return true;
    }

    analyzeFlux(flux) {
        this.fluxHistory[this.fluxPointer] = flux;
        this.fluxPointer = (this.fluxPointer + 1) % this.fluxHistory.length;

        // Calculate average flux in history for dynamic threshold
        let avgFlux = 0;
        let maxFlux = 0;
        for (let i = 0; i < this.fluxHistory.length; i++) {
            avgFlux += this.fluxHistory[i];
            if (this.fluxHistory[i] > maxFlux) maxFlux = this.fluxHistory[i];
        }
        avgFlux /= this.fluxHistory.length;

        const currentTime = this.frameCount / 44100;
        const threshold = avgFlux * 2.5;

        // If current flux is a significant peak
        if (flux > threshold && flux > 0.001 && (currentTime - this.lastPeakTime) > 0.3) {
            if (this.lastPeakTime > 0) {
                const interval = currentTime - this.lastPeakTime;

                // Keep intervals that match 60-180 BPM
                if (interval > 0.33 && interval < 1.0) {
                    this.intervals.push(interval);
                    if (this.intervals.length > 8) this.intervals.shift();

                    if (this.intervals.length >= 4) {
                        const sorted = [...this.intervals].sort();
                        const medianInterval = sorted[Math.floor(sorted.length / 2)];
                        const bpm = Math.round(60 / medianInterval);
                        this.port.postMessage({ type: 'bpm', value: bpm });
                    }
                }
            }
            this.lastPeakTime = currentTime;
        }
    }
}

registerProcessor('bpm-worklet', BpmWorkletProcessor);
